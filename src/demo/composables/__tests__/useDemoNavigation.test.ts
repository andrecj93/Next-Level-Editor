import { describe, expect, it } from "vitest";
import { resolveView } from "../useDemoNavigation";

describe("demo deep links", () => {
  it.each([
    ["/#playground", "playground"],
    ["/#docs", "docs"],
    ["/?view=docs", "docs"],
    ["/?empty=true", "playground"],
    ["/?view=docs#playground", "playground"],
    ["/?view=docs#installation", "docs"],
    ["/?view=constructor", "home"],
    ["/#toString", "home"],
  ])("resolves %s to %s", (path, view) => {
    expect(resolveView(new URL(path, "https://editor.example"))).toBe(view);
  });
});
