import { test } from '@playwright/test';
import { exerciseRemoveWritingHighlight } from './helpers/removeWritingHighlight';

test('remove a selected highlight without losing emphasis, adjacent color or writing position', async ({ page }) => {
  await exerciseRemoveWritingHighlight(page);
});
