import { test } from '@playwright/test';
import { exerciseCompanionViewMemory } from './helpers/companionViewMemory';

test('the companion remembers the chosen view when returning to a chapter', async ({ page }) => {
  await exerciseCompanionViewMemory(page);
});
