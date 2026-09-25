import { test } from '@playwright/test';
import { exerciseFormatCopy } from './helpers/formatPainter';

test('copy formatting follows the selected text across an inline boundary', async ({ page, hasTouch }) => {
  await exerciseFormatCopy(page, { touch: hasTouch });
});

test('keyboard format copying restores selection and focus for continued writing', async ({ page }) => {
  await exerciseFormatCopy(page, { keyboard: true });
});
