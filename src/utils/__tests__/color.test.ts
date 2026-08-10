import { describe, it, expect } from "vitest";
import { parseColor, sameColor, isTransparentColor } from "../color";

/**
 * Selection swatches compare a hex preset against the live computed color,
 * which the browser reports as rgb()/rgba() — so the compare must be tolerant
 * of both notations, not a naive string equality.
 */
describe("color utils", () => {
  describe("parseColor", () => {
    it("normalises a 6-digit hex to an r,g,b key", () => {
      expect(parseColor("#2563eb")).toBe("37,99,235");
    });

    it("expands a 3-digit hex", () => {
      expect(parseColor("#fff")).toBe("255,255,255");
    });

    it("normalises rgb()/rgba() to the same key", () => {
      expect(parseColor("rgb(37, 99, 235)")).toBe("37,99,235");
      expect(parseColor("rgba(37,99,235,1)")).toBe("37,99,235");
    });

    it("treats fully transparent as 'transparent'", () => {
      expect(parseColor("transparent")).toBe("transparent");
      expect(parseColor("rgba(0,0,0,0)")).toBe("transparent");
    });

    it("returns empty for missing input", () => {
      expect(parseColor("")).toBe("");
      expect(parseColor(null)).toBe("");
    });
  });

  describe("sameColor", () => {
    it("matches a hex preset against the equivalent rgb() computed value", () => {
      expect(sameColor("rgb(37, 99, 235)", "#2563eb")).toBe(true);
    });

    it("does not match different colors", () => {
      expect(sameColor("rgb(0,0,0)", "#2563eb")).toBe(false);
    });

    it("never treats transparent as a match", () => {
      expect(sameColor("rgba(0,0,0,0)", "transparent")).toBe(false);
      expect(sameColor("", "#000000")).toBe(false);
    });
  });

  describe("isTransparentColor", () => {
    it("is true for transparent / zero-alpha / empty", () => {
      expect(isTransparentColor("transparent")).toBe(true);
      expect(isTransparentColor("rgba(0,0,0,0)")).toBe(true);
      expect(isTransparentColor("")).toBe(true);
    });

    it("is false for an opaque color", () => {
      expect(isTransparentColor("rgb(255,0,0)")).toBe(false);
    });
  });
});
