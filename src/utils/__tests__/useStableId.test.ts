import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useStableId } from "../useStableId";

/**
 * The library declares `vue: ^3.3.0` as its peer. `useId` only exists in Vue
 * 3.5+, and a STATIC `import { useId } from "vue"` fails to even link on an
 * older Vue — a consumer on 3.3/3.4 (which satisfies the peer range) got
 * `SyntaxError: The requested module 'vue' does not provide an export named
 * 'useId'` and a blank screen on the first import. useStableId feature-detects
 * it instead, so the library keeps its promised compatibility.
 */
describe("useStableId", () => {
  it("returns a non-empty id", () => {
    expect(useStableId()).toBeTruthy();
    expect(typeof useStableId()).toBe("string");
  });

  it("returns unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => useStableId()));
    expect(ids.size).toBe(50);
  });

  it("produces an id usable as an HTML id / CSS selector fragment", () => {
    // No spaces or characters that would break `#id` selectors.
    expect(useStableId()).toMatch(/^[A-Za-z][\w-]*$/);
  });
});

describe("no static useId import breaks the declared peer range", () => {
  const src = (rel: string) =>
    readFileSync(resolve(process.cwd(), rel), "utf-8");

  it("NextLevelEditor.vue does not statically import useId from vue", () => {
    const s = src("src/components/NextLevelEditor.vue");
    // A named `useId` in the `from "vue"` import list would fail to link on
    // Vue < 3.5. The feature-detected helper must be used instead.
    expect(s).not.toMatch(/^\s*useId,/m);
    expect(s).toContain("useStableId");
  });
});
