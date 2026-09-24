import { test } from '@playwright/test';
import { exerciseInlineTyping } from './helpers/inlineTyping';

for (const [label, shortcut, tag] of [['Bold', 'b', 'strong'], ['Italic', 'i', 'em'], ['Underline', 'u', 'u']]) {
  test(`turning ${label} off keeps the next words unstyled`, async ({ page }) => {
    await exerciseInlineTyping(page, label, shortcut, tag);
  });
}
