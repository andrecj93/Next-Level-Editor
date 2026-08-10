import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ColorPicker wraps @cyhnkckali/vue3-color-picker, whose stylesheet used to be
 * imported ONLY in src/demo/main.ts — which is excluded from the library build.
 * So a consumer who imports 'next-level-editor/style.css' opened the Text /
 * Background colour menu and got an unstyled, broken widget (no swatches or
 * sliders) with no hint why. The picker's CSS must be imported from the
 * component so cssCodeSplit:false folds it into the single shipped stylesheet.
 */
describe("ColorPicker bundles its vendor stylesheet", () => {
  it("imports the vue3-color-picker CSS from the component (not just the demo)", () => {
    const sfc = readFileSync(
      resolve(process.cwd(), "src/components/ColorPicker.vue"),
      "utf-8"
    );
    expect(sfc).toContain("@cyhnkckali/vue3-color-picker/dist/style.css");
  });
});
