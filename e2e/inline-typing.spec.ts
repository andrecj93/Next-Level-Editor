import { expect, test } from '@playwright/test';
import { exerciseInlineTyping, exerciseInlineDeletion, exerciseParagraphTyping } from './helpers/inlineTyping';

for (const [label, shortcut, tag] of [['Bold', 'b', 'strong'], ['Italic', 'i', 'em'], ['Underline', 'u', 'u']]) {
  test(`turning ${label} off keeps the next words unstyled`, async ({ page }) => {
    await exerciseInlineTyping(page, label, shortcut, tag);
  });
}

test('Backspace edits a visible character immediately after turning Bold off', async ({ page }) => {
  await exerciseInlineDeletion(page);
});

test('Backspace works through native beforeinput without a hardware key handler', async ({ page }) => {
  await exerciseInlineDeletion(page, true);
});

test('Delete and arrow navigation skip transient typing anchors', async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('She chose to ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  await page.keyboard.type('walk');
  await editor.press('ArrowLeft');
  await editor.press('ArrowLeft');
  await editor.press('ControlOrMeta+b');
  await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  await editor.press('Delete');
  await expect(editor).toHaveText('She chose to wak');
  await editor.press('ControlOrMeta+z');
  await expect(editor).toHaveText('She chose to walk');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  await editor.press('ArrowLeft');
  await page.keyboard.type('X');
  await expect(editor).toHaveText('She chose to walXk');
  expect(await editor.textContent()).not.toContain('\u200b');
});

test('combined marks keep authored Unicode when typing starts', async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  // A character is one grapheme, including joined emoji, on every engine.
  await editor.fill('Her note: ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+i');
  await page.keyboard.insertText('ไทย\u200bไทย 👩\u200d💻');
  await editor.press('Backspace');
  await expect(editor).toHaveText('Her note: ไทย\u200bไทย');
  await editor.fill('Her note: ');
  await editor.press('ControlOrMeta+End');
  await editor.press('ControlOrMeta+b');
  await editor.press('ControlOrMeta+i');
  await editor.press('ControlOrMeta+b');
  await page.keyboard.insertText('ไทย\u200bไทย 👩\u200d💻');
  await expect(editor.locator('em')).toHaveText('ไทย\u200bไทย 👩\u200d💻');
  await expect(editor.locator('strong')).toHaveCount(0);
  expect((await editor.textContent())!.split('\u200b')).toHaveLength(2);
  await editor.press('ControlOrMeta+i');
  await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  await editor.press('Backspace');
  await expect(editor).toHaveText('Her note: ไทย\u200bไทย');
});

for (const nativeInput of [false, true]) test(`pending emphasis keeps the intended style across a paragraph break${nativeInput ? ' through native input' : ''}`, async ({ page }) => {
  await exerciseParagraphTyping(page, nativeInput);
});

for (const [label, character] of [['accented letter', 'e\u0301'], ['flag', '🇵🇹'], ['skin tone emoji', '👍🏽']]) {
  test(`Backspace removes a whole ${label} and undo restores it`, async ({ page }) => {
    await page.goto('/#playground');
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.fill('Keep ' + character);
    await editor.press('ControlOrMeta+End');
    await editor.press('Backspace');
    await expect(editor).toHaveText('Keep');
    await editor.press('ControlOrMeta+z');
    await expect(editor).toHaveText('Keep ' + character);
  });
}

for (const key of ['Backspace', 'Delete']) test(`${key} still joins paragraphs after changing the pending style`, async ({ page }) => {
  await page.goto('/#playground');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.fill('First.');
  await editor.press('ControlOrMeta+End');
  await editor.press('Enter');
  await page.keyboard.type('Second.');
  if (key === 'Backspace') {
    await editor.press('Home');
  } else {
    await editor.press('ControlOrMeta+Home');
    await editor.press('End');
  }
  await editor.press('ControlOrMeta+b');
  await editor.evaluate(el => el.addEventListener('keydown', event => event.stopImmediatePropagation(), { capture: true, once: true }));
  await editor.press(key);
  await expect(editor.locator('p')).toHaveCount(1);
  await expect(editor).toHaveText('First.Second.');
  await editor.press('ControlOrMeta+z');
  await expect(editor.locator('p')).toHaveText(['First.', 'Second.']);
});
