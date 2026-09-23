import { test, expect, type Locator } from '@playwright/test';
import { ensureToolbarExpanded } from './helpers/toolbar';

async function selectBackwards(editor: Locator, text: string) {
  await editor.evaluate((element, needle) => {
    element.focus();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const start = (node.textContent || '').indexOf(needle);
      if (start < 0) continue;
      window.getSelection()!.setBaseAndExtent(node, start + needle.length, node, start);
      document.dispatchEvent(new Event('selectionchange'));
      return;
    }
    throw new Error('Comment passage was not found');
  }, text);
}

test('localized comments preserve writing focus and survive a document checkpoint', async ({ page }, info) => {
  await page.goto('/?lab=documents');
  const root = page.getByTestId('primary');
  const editor = root.locator('.editor-content');
  await expect(editor).toContainText('A better document');
  const originalText = await editor.textContent();
  await root.getByRole('button', { name: 'Document tools', exact: true }).click();
  await ensureToolbarExpanded(page);
  await selectBackwards(editor, 'clear story');
  await root.getByRole('button', { name: 'Insert', exact: true }).click();
  await root.getByRole('menuitem', { name: 'Comment', exact: true }).click();
  const modal = page.locator('.comment-modal');
  await expect(modal.locator('.selected-text-content')).toHaveText('clear story');
  await modal.locator('textarea').fill('Keep this passage in the final draft.');
  await modal.locator('.comment-modal-submit').click();

  const sidebar = root.locator('.comments-sidebar-content');
  const card = sidebar.locator('.comment-thread-card');
  await expect(card).toHaveCount(1);
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await expect(sidebar).toHaveAccessibleName('Comentários');
  await expect(sidebar.getByRole('button', { name: 'Adicionar comentário', exact: true })).toHaveCount(1);
  const replyButton = card.getByRole('button', { name: 'Escrever resposta', exact: true });
  await replyButton.click();
  const reply = card.getByRole('textbox', { name: 'Escrever resposta', exact: true });
  await expect(reply).toBeFocused();
  await reply.fill('Agreed. Keep the original wording.');
  await page.getByLabel('Interface', { exact: true }).selectOption('en');
  await expect(card.getByRole('textbox', { name: 'Write a reply', exact: true })).toHaveValue('Agreed. Keep the original wording.');
  await card.getByRole('button', { name: 'Reply', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Write a reply', exact: true })).toBeFocused();
  await expect(card.locator('.comment-reply')).toContainText('Agreed. Keep the original wording.');
  await page.getByLabel('Interface', { exact: true }).selectOption('pt-PT');
  await card.getByRole('button', { name: 'Resolver conversa', exact: true }).press('Enter');
  await expect(sidebar.getByRole('tab', { name: /^Abrir/ })).toBeFocused();
  await sidebar.getByRole('tab', { name: /^Resolvido/ }).click();
  await card.getByRole('button', { name: 'Reabrir conversa', exact: true }).press('Enter');
  await expect(sidebar.getByRole('tab', { name: /^Resolvido/ })).toBeFocused();
  await sidebar.getByRole('tab', { name: /^Abrir/ }).click();
  await expect(card.locator('.comment-text').first()).toHaveText('Keep this passage in the final draft.');
  await info.attach('localized-comment-inspector', { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
  await sidebar.getByRole('button', { name: 'Fechar painel de comentários', exact: true }).click();
  await expect(editor).toBeFocused();
  const restored = await page.evaluate(() => {
    const selection = window.getSelection()!;
    const range = selection.getRangeAt(0);
    return { text: range.toString(), backwards: selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset, collapsed: range.collapsed };
  });
  expect(restored).toEqual({ text: 'clear story', backwards: true, collapsed: false });
  expect(await editor.textContent()).toBe(originalText);

  await root.getByLabel('Nome da versão', { exact: true }).fill('Discussed draft');
  await root.getByRole('button', { name: 'Guardar versão', exact: true }).click();
  await expect(root.getByText('Discussed draft', { exact: true })).toBeVisible();
  await page.reload();
  await root.getByRole('button', { name: 'Document tools', exact: true }).click();
  const version = root.locator('.document-card').filter({ has: page.getByText('Discussed draft', { exact: true }) });
  await version.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(editor.locator('.comment-highlight')).toHaveText('clear story');
  await root.locator('.comments-toggle-fab').click();
  await expect(card.locator('.comment-text').first()).toHaveText('Keep this passage in the final draft.');
  await card.locator('.comment-quote').click();
  await expect(card.locator('.comment-reply')).toContainText('Agreed. Keep the original wording.');
  expect(await editor.textContent()).toBe(originalText);
});
