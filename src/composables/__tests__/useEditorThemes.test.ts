import { describe, it, expect } from "vitest";
import {
  editorThemeClass,
  AVAILABLE_THEMES,
  useEditorThemes,
} from "../useEditorThemes";

describe("useEditorThemes", () => {
  describe("editorThemeClass", () => {
    it("maps a preset id to its root class", () => {
      expect(editorThemeClass("classic")).toBe("nle-theme-classic");
      expect(editorThemeClass("midnight")).toBe("nle-theme-midnight");
      expect(editorThemeClass("warm")).toBe("nle-theme-warm");
    });

    it("returns no class for default / empty / undefined (base tokens apply)", () => {
      expect(editorThemeClass("default")).toBe("");
      expect(editorThemeClass("")).toBe("");
      expect(editorThemeClass(undefined)).toBe("");
    });
  });

  it("exposes the built-in themes, including default", () => {
    const ids = AVAILABLE_THEMES.map((t) => t.id);
    expect(ids).toContain("default");
    expect(ids).toEqual(
      expect.arrayContaining(["classic", "minimal", "midnight", "warm"])
    );
    // every theme has a label + description for pickers
    for (const t of AVAILABLE_THEMES) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it("useEditorThemes returns the registry + helper", () => {
    const { themes, editorThemeClass: fn } = useEditorThemes();
    expect(themes.length).toBeGreaterThanOrEqual(5);
    expect(fn("minimal")).toBe("nle-theme-minimal");
  });
});
