import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { exerciseCommentsReturn } from './helpers/commentsReturn';

for (const method of ['close', 'toggle'] as const) {
  test(`closing comments with ${method} resumes the sentence`, async ({ page }) => {
    await exerciseCommentsReturn(page, method);
  });
}
test('closing comments restores a backward replacement selection', async ({ page }) => {
  await exerciseCommentsReturn(page, 'close', true);
});

test('comment tabs expose named panels without accessibility violations', async ({ page }) => {
  await page.goto('/#playground');
  await page.getByRole('button', { name: 'Comments', exact: true }).click();
  const sidebar = page.getByRole('complementary', { name: 'Comments', exact: true });
  for (const name of ['Open 0', 'Resolved 0']) {
    await sidebar.getByRole('tab', { name, exact: true }).click();
    await expect(sidebar.getByRole('tabpanel', { name, exact: true })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).include('.comments-sidebar-content')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(violations).toEqual([]);
  }
});
