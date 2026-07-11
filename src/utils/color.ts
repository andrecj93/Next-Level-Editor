/**
 * Color comparison helpers shared by the swatch pickers (toolbar + pill).
 *
 * Presets are hex while the browser reports computed colors as rgb()/rgba(),
 * so a swatch's "active" state can't use a plain string compare — both sides
 * are normalised to an "r,g,b" key first.
 */

/**
 * Normalise a CSS color to a comparable "r,g,b" key. Hex (#rgb / #rrggbb) and
 * rgb()/rgba() both collapse to the same key; fully transparent values return
 * "transparent"; anything unrecognised is returned lowercased as-is; empty
 * input returns "".
 */
export function parseColor(value: string | undefined | null): string {
  if (!value) return "";
  const v = value.trim().toLowerCase();
  if (v === "transparent") return "transparent";

  const hexMatch = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex.replace(/./g, (ch) => ch + ch);
    const num = parseInt(hex, 16);
    return `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;
  }

  const rgbMatch = v.match(
    /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/
  );
  if (rgbMatch) {
    const alpha = rgbMatch[4];
    if (alpha !== undefined && parseFloat(alpha) === 0) return "transparent";
    return `${rgbMatch[1]},${rgbMatch[2]},${rgbMatch[3]}`;
  }

  // Named colors and anything else: compare the normalised string as-is.
  return v;
}

/** Whether a computed color is fully transparent (i.e. "no highlight"). */
export function isTransparentColor(value: string | undefined | null): boolean {
  const parsed = parseColor(value);
  return !parsed || parsed === "transparent";
}

/** Whether two colors are the same, tolerant of hex vs rgb() notation. */
export function sameColor(
  a: string | undefined | null,
  b: string | undefined | null
): boolean {
  const parsed = parseColor(a);
  return !!parsed && parsed !== "transparent" && parsed === parseColor(b);
}
