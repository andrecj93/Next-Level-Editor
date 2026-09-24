import { test } from '@playwright/test';
import { exerciseBlockShortcutContinuation } from './helpers/blockShortcutContinuation';

for (const writingMode of [true, false]) {
  test(`block shortcuts retain the full first line with writing mode ${writingMode}`, async ({ page }) => {
    await exerciseBlockShortcutContinuation(page, writingMode);
  });
}
