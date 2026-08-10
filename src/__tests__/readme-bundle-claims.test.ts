import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

/**
 * R31-6 — the README published bundle sizes that were wrong by up to 3.4x
 * (CSS advertised at 70.63 KB against a real 243.51 KB; UMD at 1,151 KB
 * against 1,609.81 KB). Nobody re-measured after two years of features, and
 * the numbers are the first thing a sceptical reader checks — they are
 * trivially verifiable by anyone who runs the build.
 *
 * Two levels of guard:
 *  - the arithmetic inside the README always has to add up;
 *  - when dist/ is present (i.e. after `npm run build`, which is how the
 *    numbers get stale in the first place), the headline claims are checked
 *    against the real artifacts.
 */
const root = process.cwd();
const readme = readFileSync(resolve(root, "README.md"), "utf-8");
const distDir = resolve(root, "dist");
const built = existsSync(distDir);

/** "| **Core (ES)** | 843.7 KB | **201.7 KB** | ... |" -> 201.7 */
const claim = (label: string, column: "raw" | "gzip"): number => {
  const row = readme
    .split("\n")
    .find((line) => line.includes("|") && line.includes(label));
  expect(row, `no README row for "${label}"`).toBeTruthy();
  const cells = row!.split("|").map((cell) => cell.trim());
  const sizes = cells
    .map((cell) => cell.match(/([\d,]+(?:\.\d+)?)\s*KB/i)?.[1])
    .filter(Boolean)
    .map((value) => Number.parseFloat(value!.replace(/,/g, "")));
  expect(sizes.length, `row "${label}" has no KB figures`).toBeGreaterThan(1);
  return column === "raw" ? sizes[0] : sizes[1];
};

const kb = (bytes: number) => bytes / 1024;

/** Gzipped size of a dist file, in KB — the number the README quotes. */
const gzipKb = (file: string) => kb(gzipSync(readFileSync(file)).length);

describe("README bundle claims (R31-6)", () => {
  it("adds the headline total up correctly", () => {
    const core = claim("Core (ES)", "gzip");
    const css = claim("**CSS**", "gzip");
    const stated = Number.parseFloat(
      readme.match(/pays \*\*([\d.]+) KB gzipped\*\*/)![1]
    );
    expect(stated).toBeCloseTo(core + css, 1);
  });

  it("does not still carry the old, wrong figures", () => {
    // The exact strings that were published before this was measured.
    expect(readme).not.toContain("70.63 KB");
    expect(readme).not.toContain("1,151 KB");
    expect(readme).not.toContain("~224 KB total");
  });

  it("says which build is split and which is not", () => {
    expect(readme).toMatch(/UMD build cannot code-split/i);
  });

  describe.skipIf(!built)("against the real dist/ artifacts", () => {
    // Computed lazily INSIDE the tests. A describe body executes even when the
    // suite is skipped, so reading dist/ here at collection time crashed the
    // whole file on any checkout without a build — which is exactly what CI is
    // (the test job runs before the build job).
    const listFiles = () =>
      readdirSync(distDir).filter((name) =>
        statSync(resolve(distDir, name)).isFile()
      );
    const find = (pattern: RegExp) => {
      const files = listFiles();
      const hit = files.find((name) => pattern.test(name));
      expect(hit, `no dist file matching ${pattern}`).toBeTruthy();
      return resolve(distDir, hit!);
    };

    // 3% tolerance: minifier and dependency patch bumps move these slightly,
    // and a test that fails on noise gets deleted rather than fixed.
    const within = (actual: number, claimed: number) =>
      Math.abs(actual - claimed) / claimed < 0.03;

    it("CSS matches the claim", () => {
      const actual = gzipKb(find(/^next-level-editor\.css$/));
      const claimed = claim("**CSS**", "gzip");
      expect(
        within(actual, claimed),
        `README says ${claimed} KB gzipped, build produces ${actual.toFixed(2)} KB`
      ).toBe(true);
    });

    it("UMD matches the claim", () => {
      const actual = gzipKb(find(/^next-level-editor\.umd\.js$/));
      const claimed = claim("**UMD**", "gzip");
      expect(
        within(actual, claimed),
        `README says ${claimed} KB gzipped, build produces ${actual.toFixed(2)} KB`
      ).toBe(true);
    });

    it("the ES core (entry + its eager chunk) matches the claim", () => {
      const entry = gzipKb(find(/^next-level-editor\.mjs$/));
      // The eager chunk is the largest index-*.mjs; the lazy ones are the
      // named vendor chunks and the smaller index.es-* export helpers.
      const eagerCandidates = listFiles()
        .filter((name) => /^index-.*\.mjs$/.test(name))
        .map((name) => resolve(distDir, name));
      expect(eagerCandidates.length).toBeGreaterThan(0);
      const eager = Math.max(...eagerCandidates.map(gzipKb));

      const actual = entry + eager;
      const claimed = claim("Core (ES)", "gzip");
      expect(
        within(actual, claimed),
        `README says ${claimed} KB gzipped, build produces ${actual.toFixed(2)} KB`
      ).toBe(true);
    });

    it("the lazily-loaded features are really separate files (control)", () => {
      const files = listFiles();
      expect(files.some((f) => /prismHighlighter/.test(f))).toBe(true);
      expect(files.some((f) => /vue3-color-picker/.test(f))).toBe(true);
      expect(files.some((f) => /jspdf/.test(f))).toBe(true);
      expect(files.some((f) => /html2canvas/.test(f))).toBe(true);
    });
  });
});
