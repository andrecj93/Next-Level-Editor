import { describe, it, expect } from "vitest";
import { normalizeColorToHex } from "../commands";

describe("normalizeColorToHex", () => {
  it("converts rgb() to #rrggbb", () => {
    expect(normalizeColorToHex("rgb(209, 213, 219)")).toBe("#d1d5db");
  });

  it("converts rgba() to #rrggbb (ignoring alpha)", () => {
    expect(normalizeColorToHex("rgba(255, 0, 128, 0.5)")).toBe("#ff0080");
  });

  it("passes through existing 6-digit hex (lowercased)", () => {
    expect(normalizeColorToHex("#AABBCC")).toBe("#aabbcc");
  });

  it("expands shorthand hex", () => {
    expect(normalizeColorToHex("#abc")).toBe("#aabbcc");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeColorToHex("")).toBe("");
  });

  it("clamps out-of-range channels", () => {
    expect(normalizeColorToHex("rgb(300, 0, 0)")).toBe("#ff0000");
  });
});
