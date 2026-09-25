import { test } from '@playwright/test';
import { exerciseLinkEditingPosition } from './helpers/linkEditingPosition';

test('editing a link returns to the caret or selected phrase', async ({ page }) => {
  await exerciseLinkEditingPosition(page);
});
