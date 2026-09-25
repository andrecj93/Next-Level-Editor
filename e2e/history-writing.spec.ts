import { test } from '@playwright/test';
import { exerciseHistoryWriting } from './helpers/historyWriting';
test('history supports comparing revisions and continuing the manuscript', async ({ page }) => {
  await exerciseHistoryWriting(page);
});
