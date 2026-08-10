import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Round-14 print/page cluster. Browser print of the editor was badly broken:
 *  #3  a dark-theme document printed near-invisible light-gray text (the print
 *      override reset only :root modal vars, never the content surface);
 *  #5  the flex + overflow-y:auto layout clipped the document to one viewport,
 *      so everything below the fold never printed and page breaks never fired;
 *  #13 no @media print hid the toolbar/footer/panels/FABs — the chrome printed;
 *  #12 the checklist checkmark is a background-image browsers strip in print.
 * These guard the @media print rules that fix them (rendering can't be tested
 * in happy-dom, so this asserts the stylesheet carries the right decisions).
 */
const css = readFileSync(
  resolve(process.cwd(), "src/styles/NextLevelEditor.css"),
  "utf-8"
);

// The last @media print block (the comprehensive one) — capture to a heuristic
// end so assertions are scoped to print context.
const printBlock = css.slice(css.indexOf("@media print"));

/** The brace-matched body of every `@media <query>` block in `sheet`. */
const mediaBlocksIn = (sheet: string, query: string): string[] => {
  const blocks: string[] = [];
  const marker = `@media ${query}`;
  let from = 0;
  for (;;) {
    const at = sheet.indexOf(marker, from);
    if (at === -1) break;
    const open = sheet.indexOf("{", at);
    let depth = 1;
    let i = open + 1;
    while (i < sheet.length && depth > 0) {
      if (sheet[i] === "{") depth++;
      else if (sheet[i] === "}") depth--;
      i++;
    }
    blocks.push(sheet.slice(open + 1, i - 1));
    from = i;
  }
  return blocks;
};

const mediaBlocks = (query: string): string[] => mediaBlocksIn(css, query);

describe("@media print stylesheet", () => {
  it("forces the content surface to black-on-white, incl. dark theme (#3)", () => {
    expect(printBlock).toMatch(/\.theme-dark[\s\S]*?--content-color:\s*#000/);
    expect(printBlock).toMatch(
      /\.editor-content\s*\{[\s\S]*?color:\s*#000\s*!important/
    );
  });

  it("un-clips the document so it flows across pages (#5)", () => {
    expect(printBlock).toMatch(/overflow:\s*visible\s*!important/);
    expect(printBlock).toMatch(/height:\s*auto\s*!important/);
  });

  it("hides the editor chrome (#13)", () => {
    expect(printBlock).toContain(".nle-toolbar-shell");
    expect(printBlock).toContain(".editor-footer");
    expect(printBlock).toMatch(/toggle-fab[\s\S]*?display:\s*none\s*!important/);
  });

  it("keeps the checklist checkmark visible without backgrounds (#12)", () => {
    expect(printBlock).toMatch(
      /checklist li\[data-checked="true"\]::before\s*\{[\s\S]*?content:\s*"\\2713"/
    );
  });

  it("still forces the page break split (#18)", () => {
    expect(printBlock).toMatch(
      /\.page-break\s*\{[\s\S]*?page-break-after:\s*always/
    );
  });

  // Round-15 regression hunt over the print block itself:
  it("prints element-level theme colors black (links, highlights) (#r15-1)", () => {
    expect(printBlock).toMatch(
      /\.editor-content a[\s\S]{0,200}?color:\s*#000\s*!important/
    );
    expect(printBlock).toMatch(
      /span\[style\*="background-color"\]\s*\{[\s\S]*?color:\s*#000\s*!important/
    );
    expect(printBlock).toMatch(/--color-text-secondary:[^;]*!important/);
    expect(printBlock).toMatch(/--toolbar-accent:\s*#000\s*!important/);
  });

  it("un-pins fullscreen/focus mode so all pages print (#r15-2)", () => {
    expect(printBlock).toMatch(
      /\.next-level-editor\.fullscreen,\s*\.next-level-editor\.is-focus\s*\{[\s\S]*?position:\s*static\s*!important/
    );
  });

  it("hides teleported chrome via the editor-owned marker class (#r15-12/13, #r16-9)", () => {
    // Teleported pieces render under <body>, never inside .next-level-editor —
    // but hiding them by their GENERIC class names (.modal-overlay,
    // .context-menu…) also blanked the HOST page's own elements when a page
    // embedding the editor was printed. They now carry the editor-owned
    // .nle-chrome marker, and print hides that.
    expect(printBlock).toMatch(/\.nle-chrome\s*[,{]/);
    // Dead selectors are gone (these classes do not exist in the DOM).
    expect(printBlock).not.toContain(".editor-panels");
    expect(printBlock).not.toMatch(/\.editor-toolbar[,\s{]/);
    // Real in-editor panels are hidden.
    expect(printBlock).toContain(".comments-sidebar");
    expect(printBlock).toContain(".variables-panel");
    expect(printBlock).toContain(".writing-stats-panel");
    expect(printBlock).toContain(".history-timeline");
    expect(printBlock).toContain(".nle-resize-grip");
    // In-tree overlays that only the bare selectors used to catch stay hidden,
    // scoped under the editor root.
    expect(printBlock).toMatch(/\.next-level-editor\s+\.modal-overlay/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.command-palette-overlay/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.emoji-picker/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.comment-modal-overlay/);
  });

  it("every print selector in EVERY stylesheet is scoped to an editor-owned marker (#r16-9, #r17 tokens)", () => {
    // Not just NextLevelEditor.css: tokens.css once carried an UNSCOPED
    // `@media print { :root { --color-background/--color-text/--shadow-* } }`
    // that rewrote generically-named variables on the HOST page's root when a
    // page embedding the editor was printed.
    const stylesDir = resolve(process.cwd(), "src/styles");
    const cssFiles = readdirSync(stylesDir).filter((f) => f.endsWith(".css"));
    expect(cssFiles.length).toBeGreaterThan(3);

    let checked = 0;
    for (const file of cssFiles) {
      const sheet = readFileSync(resolve(stylesDir, file), "utf-8");
      // Strip comments FIRST — a comment containing "{"/"}" would corrupt the
      // brace-based selector split below.
      const print = mediaBlocksIn(sheet, "print")
        .join("\n")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      if (!print.trim()) continue;

      const selectors = print
        .split("}")
        .map((rule) => rule.split("{")[0] ?? "")
        .flatMap((head) => head.split(","))
        .map((s) => s.trim())
        .filter(Boolean);

      for (const selector of selectors) {
        checked++;
        expect(
          /^\.(next-level-editor|editor-content|editor-variable|nle-)/.test(
            selector
          ),
          `${file}: unscoped print selector leaks onto the host page: "${selector}"`
        ).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("hides the in-tree fixed overlays too (#r17-print-1)", () => {
    // ShortcutHelpModal, ConfirmDialog, VariableAutocomplete and the smart
    // AutocompleteDropdown render in-tree with position:fixed — left out of
    // the hide-list they print superimposed over page 1.
    expect(printBlock).toMatch(/\.next-level-editor\s+\.shortcut-help-overlay/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.nle-confirm-overlay/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.variable-autocomplete/);
    expect(printBlock).toMatch(/\.next-level-editor\s+\.autocomplete-dropdown/);
  });

  it("prints the table of contents on a white surface (#r17-print-2)", () => {
    // .theme-dark .editor-content .table-of-contents carries a dark rgba
    // background at the top level; with background graphics enabled it printed
    // as a gray slab behind black-forced text. The print block must force the
    // TOC surface white.
    expect(printBlock).toMatch(
      /\.table-of-contents\s*\{[\s\S]*?background:\s*#ffffff\s*!important/
    );
  });

  it("dark-theme highlight remaps live in @media screen only (#r16-10)", () => {
    // The remap palette (#854d0e…) exists to keep highlights legible on a dark
    // SCREEN. In print (with background graphics enabled) those values put
    // dark slabs behind the black-forced text. Scoping them to @media screen
    // lets the author's inline pastel print instead.
    const screen = mediaBlocks("screen").join("\n");
    const outside = mediaBlocks("screen").reduce(
      (rest, block) => rest.replace(block, ""),
      css
    );
    for (const dark of [
      "#854d0e",
      "#075985",
      "#166534",
      "#9f1239",
      "#713f12",
      "#9a3412",
    ]) {
      expect(screen).toContain(dark);
      expect(
        outside.includes(dark),
        `dark highlight remap ${dark} escapes @media screen (prints as a dark slab)`
      ).toBe(false);
    }
  });
});
