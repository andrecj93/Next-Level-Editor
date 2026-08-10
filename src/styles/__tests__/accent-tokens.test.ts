import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The floating-UI redesign replaced blue-purple "AI-slop" gradients with a flat
// accent-token system (var(--toolbar-accent) / --toolbar-accent-contrast) so
// every surface follows the active theme preset (Warm rust, Midnight azure, …).
// Several comment/modal components were missed and kept a hardcoded, theme-blind
// #3b82f6→#8b5cf6 gradient (and ShortcutHelp an entirely separate indigo). Under
// any non-default preset they render as a visibly different product.

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf-8");

// The signature blue→purple accent gradient (any angle / extra stop). Scoped to
// a linear-gradient() call so template author-colour fallbacks (bare '#3b82f6' /
// '#8b5cf6' avatar defaults) are not mistaken for it.
const AI_SLOP_GRADIENT =
  /linear-gradient\([^)]*#3b82f6[^)]*#8b5cf6[^)]*\)|linear-gradient\([^)]*#8b5cf6[^)]*#3b82f6[^)]*\)/;
// ShortcutHelp's outlier indigo palette, found nowhere else.
const OUTLIER_INDIGO = /#4c51bf|#5b21b6|#667eea/i;

const ACCENT_GRADIENT_FILES = [
  "src/components/CommentModal.vue",
  "src/components/CommentReplyForm.vue",
  "src/components/CommentThreadCard.vue",
  "src/components/EditorPanels.vue",
  "src/components/FileManagerModal.vue",
  "src/components/ImageUploadModal.vue",
];

describe("accent surfaces follow the theme token, not hardcoded gradients", () => {
  it.each(ACCENT_GRADIENT_FILES)(
    "%s has no theme-blind blue-purple accent gradient",
    (file) => {
      expect(read(file)).not.toMatch(AI_SLOP_GRADIENT);
    }
  );

  it("ShortcutHelpModal drops its outlier indigo palette for the shared tokens", () => {
    expect(read("src/components/ShortcutHelpModal.vue")).not.toMatch(
      OUTLIER_INDIGO
    );
  });

  it("the accent token itself is theme-aware (defined per preset)", () => {
    const css = read("src/styles/NextLevelEditor.css");
    // Default light, dark, and at least the preset overrides all set it.
    const occurrences = css.match(/--toolbar-accent:/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });
});

// The gradient sweep above removed the blue→purple *fills*, but the SOLID
// accent colors on focus rings, hover/active borders and mention text were left
// hardcoded — so under Warm/Midnight the caret-focus ring and hovered cards
// still flashed generic blue instead of the preset accent.
const ruleBody = (css: string, selector: string): string | null => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(esc + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : null;
};

const ACCENT_ROLE_RULES: Array<[string, string]> = [
  ["src/components/CommentModal.vue", ".comment-modal-textarea:focus"],
  ["src/components/CommentModal.vue", ".mention-check"],
  ["src/components/CommentModal.vue", ".helper-tip svg"],
  [
    "src/components/CommentReplyForm.vue",
    ".comment-reply-textarea:hover:not(:focus)",
  ],
  ["src/components/CommentThreadCard.vue", ".comment-thread-card:hover"],
  ["src/components/CommentThreadCard.vue", ".comment-thread-card-expanded"],
  [
    "src/components/CommentThreadCard.vue",
    ".comment-text :deep(.comment-mention)",
  ],
  ["src/components/CommentThreadCard.vue", ".comment-replies-toggle:hover"],
  ["src/components/CommentThreadCard.vue", ".comment-add-reply-btn:hover"],
  ["src/components/EmojiPicker.vue", ".emoji-search:focus"],
  ["src/components/EditorPanels.vue", ".split-toggle-btn:hover"],
];

describe("solid accent focus/hover states follow the theme token", () => {
  it.each(ACCENT_ROLE_RULES)(
    "%s › %s uses var(--toolbar-accent), not a hardcoded hex",
    (file, selector) => {
      const body = ruleBody(read(file), selector);
      expect(body, `rule ${selector} not found in ${file}`).not.toBeNull();
      // No bare solid #3b82f6 as a border-color/color value…
      expect(body!).not.toMatch(/(?:border-color|color):\s*#3b82f6/);
      // …it resolves through the theme accent token instead.
      expect(body!).toContain("var(--toolbar-accent");
    }
  );

  it("the split-view toggle hover has no light-only background", () => {
    // `background: white` on :hover made the button flash a white chip in dark
    // mode; the raised surface must be a theme token.
    const body = ruleBody(
      read("src/components/EditorPanels.vue"),
      ".split-toggle-btn:hover"
    );
    expect(body).not.toBeNull();
    expect(body!).not.toMatch(/background:\s*white/);
  });
});
