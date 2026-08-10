import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The README once claimed the suite ran on "8 configurations" (Chrome, Firefox,
 * WebKit, iPhone 13 portrait & landscape, Pixel 5, iPad Pro portrait &
 * landscape) while playwright.config.ts actually enabled only two projects —
 * chromium and mobile-safari. A contributor reading that would assume Firefox /
 * WebKit / Pixel / iPad regressions were caught in CI when they are not. Keep
 * the README's testing section honest by pinning it to the config's *active*
 * (non-commented) projects.
 */
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf-8");

// Active projects = `name: "..."` lines that are NOT inside a `//`-commented
// block. Strip line comments first, then collect the names.
function activeProjectNames(configSrc: string): string[] {
  return configSrc
    .split(/\r?\n/)
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n")
    .match(/name:\s*["'`]([^"'`]+)["'`]/g)
    ?.map((m) => m.replace(/name:\s*["'`]([^"'`]+)["'`]/, "$1")) ?? [];
}

describe("README testing section matches the real Playwright config", () => {
  const readme = read("README.md");
  const config = read("playwright.config.ts");
  const active = activeProjectNames(config);

  it("only advertises the two projects CI actually runs", () => {
    // Guards the exact regression: the inflated count and the browsers that are
    // configured-but-commented-out must not be presented as tested.
    expect(active).toEqual(["chromium", "mobile-safari"]);
    expect(readme).not.toMatch(/\b8 configurations\b/);
  });

  it("does not claim Firefox/WebKit/Pixel are part of the default run", () => {
    // The Testing subsection: from '### Testing' to the next top-level ('## ')
    // heading after it.
    const start = readme.indexOf("### Testing");
    const rest = readme.slice(start + "### Testing".length);
    const nextHeading = rest.search(/\n## /);
    const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    expect(section).toMatch(/Desktop Chrome/i);
    expect(section).toMatch(/Mobile Safari|iPhone 13/i);
    // Firefox/WebKit/Pixel may be MENTIONED as opt-in, but never asserted as
    // part of what runs — so they must be framed as commented-out/optional.
    expect(section).toMatch(/comment|optional|opt[- ]?in/i);
  });

  it("does not claim the editor avoids execCommand (it uses it)", () => {
    // The editor is built on contenteditable + document.execCommand (paste
    // insertion, plugin execCommand); the old 'No execCommand()' bullet was
    // false.
    expect(readme).not.toMatch(/No\s*`?execCommand\(\)`?/i);
  });
});
