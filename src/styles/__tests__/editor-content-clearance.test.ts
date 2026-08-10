import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The mobile toolbar is `position: fixed; bottom: 0` with `max-height: 60vh`,
 * so when expanded it overlays the bottom half of the editing surface. The bar
 * already publishes its live height as `--nle-mobile-toolbar-clearance` on
 * <html> (0 when hidden / on desktop), and the FABs/panels consume it — but the
 * editor content's own bottom padding did not, so the last lines and the
 * end-of-document caret were left stranded behind the bar with no way to scroll
 * them into view. The scroll container must reserve that clearance.
 */
describe(".editor-content reserves clearance for the fixed mobile toolbar", () => {
  const css = readFileSync(
    resolve(process.cwd(), "src/styles/NextLevelEditor.css"),
    "utf-8"
  );

  it("adds --nle-mobile-toolbar-clearance to the editor-content bottom padding", () => {
    // Isolate the base `.editor-content { ... }` rule.
    const rule = css.match(/\.editor-content\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    const body = rule![1];
    // The bottom padding must factor in the toolbar clearance var so the
    // document can scroll fully clear of the overlaying bar.
    expect(body).toMatch(/--nle-mobile-toolbar-clearance/);
  });
});
