import { test } from '@playwright/test';
import { exerciseWritingStatistics } from './helpers/writingStatistics';
test('writing statistics agrees with the manuscript and returns its selection', async ({ page }) => {
  await exerciseWritingStatistics(page);
});
