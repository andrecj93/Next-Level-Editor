import { test } from '@playwright/test';
import { exerciseWritingColorState } from './helpers/writingColorState';

test('writing color controls follow the passage, applied color and theme', async ({ page }) => {
  await exerciseWritingColorState(page);
});
