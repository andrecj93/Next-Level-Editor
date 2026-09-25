import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Adversarial-audit regression net (chrome-audit findings): the masthead's
// contrast contract, computed from the ACTUAL shipped token values.
//
//  - Export hero pill: --toolbar-accent-contrast ink on --toolbar-accent-strong
//    fill must be >=4.5:1 (13-14px/600 text) on every preset x mode — including
//    under the hover `filter: brightness(1.08)` lift.
//  - Accent-as-text (--toolbar-accent-ink): active view-mode/dropdown labels
//    are 13-14px/600 text on --toolbar-bg, so >=4.5:1.
//  - Theme secondary ink (--color-text-secondary) renders as resting toolbar
//    label text on --toolbar-bg: >=4.5:1 (warm light sat at 4.23:1).
//  - Raw --toolbar-accent is used for non-text marks (underline, focus ring):
//    >=3:1 on --toolbar-bg.
//
// If a retint drops any pair below its bar, this fails with the exact numbers.

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf-8");

const editorCss = read("src/styles/NextLevelEditor.css");
const tokensCss = read("src/styles/tokens.css");
const themeCss: Record<string, string> = {
  classic: read("src/styles/themes/classic.css"),
  minimal: read("src/styles/themes/minimal.css"),
  midnight: read("src/styles/themes/midnight.css"),
  warm: read("src/styles/themes/warm.css"),
};

/** Extract the declarations of the first block whose selector list matches. */
function block(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  expect(start, `selector "${selector}" present`).toBeGreaterThanOrEqual(0);
  const body = css.slice(
    css.indexOf("{", start) + 1,
    css.indexOf("}", start)
  );
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

// ---- WCAG math ------------------------------------------------------------

const hex2rgb = (h: string): [number, number, number] => {
  let s = h.replace("#", "");
  if (s.length === 3) s = s.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
};

const luminance = (rgb: [number, number, number]): number => {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const l1 = luminance(hex2rgb(a));
  const l2 = luminance(hex2rgb(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

/** CSS `filter: brightness(f)` — per-channel multiply, clamped. */
const brightness = (h: string, f: number): string =>
  "#" +
  hex2rgb(h)
    .map((c) => Math.min(255, Math.round(c * f)).toString(16).padStart(2, "0"))
    .join("");

// ---- The ten preset x mode token sets --------------------------------------

interface PresetTokens {
  name: string;
  tokens: Record<string, string>;
}

const presets: PresetTokens[] = [
  { name: "default light", tokens: block(editorCss, ".next-level-editor") },
  {
    name: "default dark",
    tokens: block(editorCss, ".next-level-editor.theme-dark"),
  },
  ...Object.entries(themeCss).flatMap(([name, css]) => [
    {
      name: `${name} light`,
      tokens: block(css, `.next-level-editor.nle-theme-${name}`),
    },
    {
      name: `${name} dark`,
      tokens: block(css, `.next-level-editor.nle-theme-${name}.theme-dark`),
    },
  ]),
];

const token = (p: PresetTokens, name: string, fallback?: string): string => {
  const v = p.tokens[name] ?? fallback;
  expect(v, `${p.name}: ${name} defined`).toBeTruthy();
  expect(v, `${p.name}: ${name} is a plain hex color`).toMatch(
    /^#[0-9a-fA-F]{3,6}$/
  );
  return v!;
};

describe("toolbar contrast contract (per preset x mode)", () => {
  it("warm dark accent text clears hovered companion and selected menu surfaces", () => {
    const warm = presets.find(p => p.name === "warm dark")!;
    const ink = token(warm, "--toolbar-accent-ink");
    expect(contrast(ink, token(warm, "--color-surface-overlay"))).toBeGreaterThanOrEqual(4.5);
    const [r, g, b, alpha] = warm.tokens["--toolbar-hover"].match(/[\d.]+/g)!.map(Number);
    const background = hex2rgb(token(warm, "--color-surface"));
    const hovered = '#' + [r, g, b].map((channel, i) => Math.round(channel * alpha + background[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
    expect(contrast(ink, hovered)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(presets)(
    "$name: Export hero ink on fill is >=4.5:1, hover lift included",
    (p) => {
      const fill = token(p, "--toolbar-accent-strong");
      const ink = token(p, "--toolbar-accent-contrast");
      expect(contrast(fill, ink)).toBeGreaterThanOrEqual(4.5);
      // .dropdown-trigger:hover runs filter: brightness(1.08) on the fill.
      expect(contrast(brightness(fill, 1.08), ink)).toBeGreaterThanOrEqual(
        4.5
      );
    }
  );

  it.each(presets)(
    "$name: accent-as-text ink (--toolbar-accent-ink) is >=4.5:1 on the toolbar",
    (p) => {
      const ink = token(p, "--toolbar-accent-ink");
      const bg = token(p, "--toolbar-bg");
      expect(contrast(ink, bg)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it.each(presets)(
    "$name: raw accent still clears the 3:1 non-text bar (underline, focus ring)",
    (p) => {
      const accent = token(p, "--toolbar-accent");
      const bg = token(p, "--toolbar-bg");
      expect(contrast(accent, bg)).toBeGreaterThanOrEqual(3);
    }
  );

  // --color-text-secondary is only retinted by the four named themes (the
  // default preset takes it from tokens.css on a different surface system).
  it.each(presets.filter((p) => p.tokens["--color-text-secondary"]))(
    "$name: secondary ink renders as 13-14px toolbar labels — >=4.5:1",
    (p) => {
      const ink = token(p, "--color-text-secondary");
      expect(contrast(ink, token(p, "--toolbar-bg"))).toBeGreaterThanOrEqual(
        4.5
      );
      // Also used as text on panel surfaces.
      expect(
        contrast(ink, token(p, "--color-surface"))
      ).toBeGreaterThanOrEqual(4.5);
    }
  );
});

describe("high-contrast media blocks", () => {
  it("tokens.css uses the standard prefers-contrast: more (not the dead draft 'high')", () => {
    expect(tokensCss).toMatch(/@media \(prefers-contrast: more\)/);
    expect(tokensCss).not.toMatch(/@media \(prefers-contrast: high\)/);
  });

  it("forced-colors mode keeps a visible active-state indicator on the masthead", () => {
    // Forced colors strips the accent ink + gradient underline, so the active
    // formatting/view-mode states must fall back to system selection colors.
    const fc = editorCss.match(
      /@media \(forced-colors: active\) \{[\s\S]*?\n\}/
    );
    expect(fc).not.toBeNull();
    const blockText = fc![0];
    expect(blockText).toContain(".toolbar-btn-modern.active");
    expect(blockText).toContain(".view-mode-btn.active");
    expect(blockText).toMatch(/background-color:\s*SelectedItem/);
    expect(blockText).toMatch(/color:\s*SelectedItemText/);
    expect(blockText).toMatch(/background-color:\s*Highlight/);
  });
});
