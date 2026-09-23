import { test, expect, type Locator, type Page } from '@playwright/test';
import { ensureToolbarExpanded } from './helpers/toolbar';

async function selectText(editor: Locator, needle: string) {
  await editor.evaluate((root, text) => {
    root.focus();
    const nodes = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = nodes.nextNode())) {
      const at = (node.textContent || '').indexOf(text);
      if (at < 0) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + text.length);
      window.getSelection()!.removeAllRanges();
      window.getSelection()!.addRange(range);
      return;
    }
    throw new Error('Fixture text not found');
  }, needle);
}
async function load(page: Page, query = '') {
  await page.goto('/?lab=documents' + query);
  const root = page.getByTestId('primary');
  const editor = root.locator('.editor-content');
  await expect(editor).toContainText('A better document');
  return { root, editor };
}

test('file names, localized sizes, errors and dialog actions survive a live language switch', async ({ page }, info) => {
  const { root, editor } = await load(page);
  const before = await editor.innerHTML();
  await ensureToolbarExpanded(page);
  await root.getByRole('button', { name: 'Insert', exact: true }).click();
  await root.getByRole('menuitem', { name: 'File Manager', exact: true }).click();
  const dialog = page.locator('dialog.file-manager-modal');
  await expect(dialog).toBeVisible();
  await dialog.locator('input[type=file]').setInputFiles([
    { name: 'Save', mimeType: 'text/plain', buffer: Buffer.alloc(1536, 'a') },
    { name: 'invalid.html', mimeType: 'text/html', buffer: Buffer.from('<p>rejected file</p>') },
  ]);
  await expect(dialog.getByRole('alert')).toContainText('1 file uploaded, 1 failed');
  await expect(dialog.locator('.file-meta')).toHaveText('1.5 KB');
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await expect(dialog).toHaveAccessibleName('📁 Gestor de ficheiros');
  await expect(dialog.getByRole('alert')).toContainText('1 ficheiro carregado; falhas: 1');
  await expect(dialog.getByRole('alert')).toContainText('O tipo de ficheiro text/html não é permitido');
  await expect(dialog.locator('.file-name')).toHaveText('Save');
  await expect(dialog.locator('.file-meta')).toHaveText('1,5 KB');
  await expect(dialog.getByRole('checkbox', { name: 'Selecionar Save', exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Inserir Save no editor', exact: true })).toBeVisible();
  await info.attach('Localized file manager', { body: await dialog.screenshot(), contentType: 'image/png' });
  await page.getByLabel('Interface', { exact: true }).selectOption('en');
  await expect(dialog.getByRole('alert')).toContainText('File type text/html is not allowed');
  await dialog.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Insert Save into editor', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await editor.innerHTML()).toBe(before);
});

test('translated color controls return keyboard focus to their trigger on Escape', async ({ page }) => {
  const { root, editor } = await load(page);
  await ensureToolbarExpanded(page);
  await selectText(editor, 'Write, review');
  const before = await editor.innerHTML();
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  const trigger = root.getByRole('button', { name: 'Cores', exact: true });
  const expand = root.getByRole('button', { name: 'Expandir barra de ferramentas', exact: true });
  if (await expand.isVisible()) await expand.click();
  await trigger.click();
  const menu = root.locator('.colors-menu');
  await expect(menu).toBeVisible();
  const swatch = menu.getByRole('button', { name: /^Cor do texto #/ }).first();
  await expect(swatch).toBeVisible();
  await swatch.focus();
  await swatch.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await editor.innerHTML()).toBe(before);
});

test('a table insertion and its visible feedback follow locale changes and remain undoable', async ({ page }) => {
  const { root, editor } = await load(page);
  await selectText(editor, 'Write, review');
  await ensureToolbarExpanded(page);
  const before = await editor.innerHTML();
  await root.getByRole('button', { name: 'Insert', exact: true }).click();
  await root.getByRole('menuitem', { name: 'Table', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Insert Table', exact: true });
  await dialog.getByLabel('Rows', { exact: true }).fill('2');
  await dialog.getByLabel('Columns', { exact: true }).fill('3');
  await dialog.getByRole('button', { name: 'Insert Table', exact: true }).click();
  const toast = root.locator('.toast-notification');
  await expect(toast).toHaveText('✓ Table (2×3) inserted successfully!');
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await expect(toast).toHaveText('✓ Tabela (2×3) inserida com sucesso!');
  await expect(editor.locator('table')).toHaveCount(2);
  await editor.focus();
  await editor.press('ControlOrMeta+z');
  expect(await editor.innerHTML()).toBe(before);
});

test('UI locale changes preserve the draft, selected passage, document language and undo', async ({ page }) => {
  const { root, editor } = await load(page);
  await editor.fill('Words stay with their writer.');
  await selectText(editor, 'writer');
  // WebKit's Selection.toString() can be empty for this table-containing
  // editable even with a valid, visible Range. Check the selected range and
  // both endpoints so a lost or collapsed selection still fails this test.
  const selectedRange = () => page.evaluate(() => {
    const range = window.getSelection()!.getRangeAt(0);
    return { text: range.toString(), start: range.startOffset, end: range.endOffset, collapsed: range.collapsed };
  });
  const selectionBefore = await selectedRange();
  expect(selectionBefore.text).toBe('writer');
  expect(selectionBefore.collapsed).toBe(false);
  const before = await editor.innerHTML();
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await expect(root.locator('.next-level-editor')).toHaveAttribute('lang', 'pt-PT');
  await expect(root.locator('.word-count')).toHaveText('5 palavras');
  await expect(root.getByRole('button', { name: 'Ferramentas do documento', exact: false })).toBeVisible();
  expect(await editor.evaluate(element => element.closest('[lang]')?.getAttribute('lang'))).toBe('en');
  expect(await editor.innerHTML()).toBe(before);
  expect(await selectedRange()).toEqual(selectionBefore);
  await editor.focus();
  await editor.press('ControlOrMeta+z');
  await expect(editor).toContainText('A better document');
  await expect(root.locator('.next-level-editor')).toHaveAttribute('lang', 'pt-PT');
});

test('a host RTL dictionary supports mixed Arabic/Hebrew text, keyboard navigation and teleported dialogs', async ({ page }, info) => {
  const { root, editor } = await load(page);
  await page.getByLabel('Interface', { exact: true }).selectOption('ar-EG-u-nu-arab');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Document language', { exact: true }).fill('he');
  await page.getByLabel('Direction', { exact: true }).selectOption('rtl');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  const text = 'שלום עולם — مرحبا بالعالم — English 2026';
  await editor.fill(text);
  await expect(root.locator('.next-level-editor')).toHaveAttribute('dir', 'rtl');
  expect(await editor.evaluate(element => element.closest('[lang]')?.getAttribute('lang'))).toBe('he');
  await expect(editor).toHaveCSS('direction', 'rtl');
  await selectText(editor, 'English');
  await editor.press('ControlOrMeta+b');
  await expect(editor.locator('b, strong')).toHaveText('English');
  await root.getByRole('button', { name: 'أدوات المستند', exact: false }).click();
  const firstTab = root.getByRole('tab', { name: 'الإصدارات', exact: true });
  await firstTab.focus();
  await firstTab.press('ArrowLeft');
  await expect(root.getByRole('tab', { name: 'استيراد Word', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(firstTab).toBeFocused();
  await root.getByRole('button', { name: 'إغلاق', exact: true }).click();
  if (info.project.name === 'chromium') {
    const toolbar = root.locator('.editor-toolbar-modern');
    const start = await toolbar.evaluate(element => {
      const first = [...element.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].find(button => button.offsetWidth > 0 && !button.closest('.dropdown-menu'))!;
      first.focus();
      return first.getBoundingClientRect().x;
    });
    await page.keyboard.press('ArrowLeft');
    const next = await page.evaluate(() => document.activeElement!.getBoundingClientRect().x);
    expect(next).toBeLessThan(start);
  }
  await editor.focus();
  await editor.press('ControlOrMeta+f');
  const dialog = page.getByRole('dialog', { name: 'بحث واستبدال' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('..')).toHaveAttribute('dir', 'rtl');
  await dialog.getByLabel('بحث', { exact: true }).fill('English');
  await expect(dialog.locator('.search-info')).toContainText('١ من ١');
  await page.keyboard.press('Escape');
  await expect(editor).toContainText(text);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const screenshot = info.outputPath('rtl-mixed-text.png');
  await root.screenshot({ path: screenshot });
  await info.attach('Mixed-script RTL editor', { path: screenshot, contentType: 'image/png' });
});

test('malformed UI locale falls back without crashing the editor or its search', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { root, editor } = await load(page, '&locale=not_a_locale');
  await expect(root.locator('.next-level-editor')).toHaveAttribute('lang', 'en');
  await editor.press('ControlOrMeta+f');
  const dialog = page.getByRole('dialog', { name: 'Find & Replace' });
  await dialog.getByLabel('Find', { exact: true }).fill('document');
  await expect(dialog.locator('.search-info')).toContainText('1 of 1');
  expect(errors).toEqual([]);
});

test('an import failure and active formatting captions follow locale changes without changing the draft', async ({ page, isMobile }) => {
  const { root, editor } = await load(page);
  const before = await editor.innerHTML();
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await root.getByRole('button', { name: 'Ferramentas do documento', exact: false }).click();
  await root.getByRole('tab', { name: 'Importar Word', exact: true }).click();
  await root.locator('input[type=file]').setInputFiles({ name: 'invalid.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('invalid archive') });
  await expect(root.locator('.document-error[role=alert]')).toContainText('Escolha um ficheiro DOCX válido e não encriptado.');
  await page.getByLabel('Interface', { exact: true }).selectOption('en');
  await expect(root.locator('.document-error[role=alert]')).toContainText('Choose a valid, unencrypted DOCX file.');
  expect(await editor.innerHTML()).toBe(before);
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await root.getByRole('button', { name: 'Fechar', exact: true }).click();
  await editor.focus();
  await editor.press('ControlOrMeta+End');
  if (!isMobile) {
    await selectText(editor, 'Write, review');
    await expect(root.locator('.format-dropdown .dropdown-label')).toHaveText('Parágrafo');
  }
});
