import { test } from '@playwright/test';
import { exerciseCompanionPrompt } from './helpers/companionPrompt';

test('a chosen companion prompt stays available while returning to writing', async ({ page }) => {
  await exerciseCompanionPrompt(page);
});
