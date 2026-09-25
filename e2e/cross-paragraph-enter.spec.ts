import { test } from '@playwright/test';
import { exerciseCrossParagraphEnter } from './helpers/crossParagraphEnter';

for (const nativeInput of [false, true]) test(`Enter across paragraphs updates counts, undo and the saved draft${nativeInput ? ' through native input' : ''}`, async ({ page }) => {
  await exerciseCrossParagraphEnter(page, nativeInput);
});
