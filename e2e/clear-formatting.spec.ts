import { test } from '@playwright/test';
import { exerciseClearFormatting } from './helpers/clearFormatting';

for (const entry of ['style', 'tools', 'shortcut', 'palette'] as const) {
  test(`clear selected character formatting through ${entry} preserves the draft`, async ({ page, hasTouch }) => {
    await exerciseClearFormatting(page, { touch: hasTouch, entry });
  });
}
