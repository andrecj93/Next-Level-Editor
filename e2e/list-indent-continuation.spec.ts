import { test } from '@playwright/test';
import { exerciseListIndentContinuation } from './helpers/listIndentContinuation';

for (const [name, prefix] of [['bullet', '- '], ['numbered', '1. '], ['checklist', '[] ']]) {
  test(`${name} indentation keeps the writing position and selection`, async ({ page }) => {
    await exerciseListIndentContinuation(page, prefix);
  });
}
