import { expect, type Page } from '@playwright/test';

export async function exerciseCompanionPrompt(page: Page) {
  await page.goto('/?empty=true');
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  const opener = page.getByRole('button', { name: 'Writing companion', exact: true });
  const panel = page.getByRole('complementary', { name: 'Writing companion' });
  await opener.click();
  await expect(panel.locator('.writing-prompt')).toBeVisible();
  const another = panel.getByRole('button', { name: 'Another prompt', exact: true });
  const resume = panel.getByRole('button', { name: 'Back to writing', exact: true });
  await expect(another).toBeInViewport();
  await expect(resume).toBeInViewport();
  for (const control of [another, resume]) {
    expect(await control.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await another.click();
  const chosen = await panel.locator('.writing-prompt p').innerText();
  expect(chosen).toContain('concrete detail');
  await expect.poll(() => panel.locator('.writing-prompt p').evaluate(element => {
    const prompt = element.getBoundingClientRect();
    const body = element.closest('.companion-body')!.getBoundingClientRect();
    return prompt.top >= body.top - 1 && prompt.bottom <= body.bottom + 1;
  })).toBe(true);
  await resume.click();
  await expect(editor).toBeFocused();
  await expect(panel).toHaveCount(0);
  await page.keyboard.type('I watched the rain.');
  const original = await editor.innerHTML();
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowLeft');
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('rain');
  await opener.click();
  await expect(panel.locator('.writing-prompt p')).toHaveText(chosen);
  await resume.click();
  await expect(editor).toBeFocused();
  await expect.poll(() => page.evaluate(() => getSelection()?.toString())).toBe('rain');
  await page.keyboard.type('harbor');
  await expect(editor).toHaveText('I watched the harbor.');
  const finished = await editor.innerHTML();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(editor).toHaveJSProperty('innerHTML', original);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveJSProperty('innerHTML', finished);
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved');
  await page.goto('/#playground');
  // A browser's bare first line is normalized to a paragraph on recovery.
  await expect(editor).toHaveText('I watched the harbor.');
  await expect(editor.locator('p')).toHaveText('I watched the harbor.');
}
