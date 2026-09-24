import { test } from '@playwright/test';
import { exerciseCompanionReturn } from './helpers/companionReturn';

for (const method of ['close', 'escape', 'toggle'] as const) {
  test(`closing writing notes with ${method} resumes the sentence`, async ({ page }) => {
    await exerciseCompanionReturn(page, method);
  });
}
test('closing writing notes restores a backward replacement selection', async ({ page }) => {
  await exerciseCompanionReturn(page, 'close', true);
});
