import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Toolbar "WOW" redesign — unify the accent language so the bar reads as ONE
 * system, not three competing highlights (a solid Export hero, fake-tab
 * dropdown underlines, and four loose view-mode links). Guards the decisions:
 *  1. the view switcher is a SEGMENTED CONTROL (inset track + raised active
 *     chip), NOT four underlined links;
 *  2. dropdown TRIGGERS are neutral pickers — they never wear the format-active
 *     underline (that idiom is exclusive to real on/off buttons like Bold);
 *  3. Export is a TONAL primary, not a saturated solid fill.
 */
const css = readFileSync(
  resolve(process.cwd(), "src/styles/NextLevelEditor.css"),
  "utf-8"
);
const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(esc + "\\s*\\{([^}]*)\\}"));
  return m ? m[1] : "";
};

describe("toolbar view switcher is a segmented control", () => {
  it("gives the group an inset track (background + padding + radius)", () => {
    // The base rule is the one carrying the track background (the compact
    // variant shares the selector suffix, so match by content).
    const group = (css.match(
      /(?:^|\n)\.view-mode-group\s*\{([^}]*)\}/
    ) ?? [])[1] ?? "";
    expect(group).toContain("var(--toolbar-track)");
    expect(group).toMatch(/padding:\s*2px/);
    expect(group).toMatch(/border-radius/);
  });

  it("makes the active mode a RAISED CHIP, not an underline bar", () => {
    const active = rule(".view-mode-btn.active");
    expect(active).toContain("var(--toolbar-track-chip");
    expect(active).toContain("box-shadow");
    // The old masthead underline (a 2px background-image bar) must be gone.
    expect(active).not.toMatch(/background-size:\s*60%\s*2px/);
    expect(active).not.toContain("linear-gradient");
  });

  it("defines the segmented-control tokens for light and dark", () => {
    expect((css.match(/--toolbar-track:/g) ?? []).length).toBeGreaterThanOrEqual(
      2
    );
    expect(
      (css.match(/--toolbar-track-chip:/g) ?? []).length
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("dropdown triggers are neutral pickers (no fake-tab)", () => {
  const dd = readFileSync(
    resolve(process.cwd(), "src/components/ToolbarDropdown.vue"),
    "utf-8"
  );
  const activeRule = (dd.match(/\.dropdown-trigger\.active\s*\{([^}]*)\}/) ??
    [])[1] ?? "";

  it("does not paint the accent underline bar on an active trigger", () => {
    expect(activeRule).not.toMatch(/background-size:\s*60%\s*2px/);
    expect(activeRule).not.toContain("linear-gradient");
  });
});

describe("Export is a tonal primary, not a solid accent fill", () => {
  const exportRule = rule(
    ".editor-toolbar-modern .export-section .dropdown-trigger"
  );
  it("uses a translucent wash + accent ink, not a saturated -strong fill", () => {
    expect(exportRule).not.toContain("var(--toolbar-accent-strong");
    expect(exportRule).toContain("var(--toolbar-accent-ink");
  });
});
