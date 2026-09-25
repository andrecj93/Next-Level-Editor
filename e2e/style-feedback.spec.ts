import { test } from '@playwright/test';
import { exerciseStyleFeedback } from './helpers/styleFeedback';

test('style feedback shows passages without judging recurring names', async ({ page }) => {
  await exerciseStyleFeedback(page);
});
