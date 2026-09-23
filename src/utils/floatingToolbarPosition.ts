/**
 * Pure positioning math for the SELECTION TOOLBAR (the floating bubble over
 * selected text — FloatingToolbar.vue). Lives in utils/ so it is unit-testable
 * and so the SFC keeps a single <script setup> block (a second plain <script>
 * block exporting types tripped TS4082 during declaration generation, the
 * same failure mode that ruled out vite-plugin-dts).
 *
 * The bubble root uses `transform: translateX(-50%)`, so `left` is the
 * bubble's CENTER in document coordinates. The center is clamped so the
 * bubble's real edges (center ± width/2) stay inside the viewport with an
 * EDGE_MARGIN gutter; a bubble wider than the viewport is simply centered.
 *
 * Vertically the bubble prefers the space above the selection and flips
 * below when the visible editing area has insufficient room. Measured
 * dimensions replace the estimates after the first render. Bounds exclude
 * surrounding toolbars and side panels; omitted bounds use the viewport.
 */
export const EDGE_MARGIN = 10;
export const ABOVE_OFFSET = 50;
export const BELOW_OFFSET = 8;
export const FLIP_THRESHOLD = 60;
/** Used before the bubble has rendered and can be measured. */
export const ESTIMATED_WIDTH = 240;

export interface ToolbarPositionInput {
  /** Viewport-relative selection rect (as from getBoundingClientRect). */
  rect: { top: number; bottom: number; left: number; width: number };
  /** Measured bubble width in px (fall back to ESTIMATED_WIDTH if unknown). */
  toolbarWidth: number;
  /** Actual height when rendered; the estimate preserves the first paint. */
  toolbarHeight?: number;
  viewportWidth: number;
  /** Visible editing area in viewport coordinates, excluding surrounding UI. */
  bounds?: { top: number; bottom: number; left: number; right: number };
  scrollX: number;
  scrollY: number;
}

export interface ToolbarPosition {
  top: number;
  left: number;
  below: boolean;
}

export function computeToolbarPosition(
  input: ToolbarPositionInput
): ToolbarPosition {
  const { rect, toolbarWidth, viewportWidth, scrollX, scrollY } = input;
  const bounds = input.bounds ?? { top: 0, bottom: Infinity, left: 0, right: viewportWidth };
  const height = input.toolbarHeight ?? ABOVE_OFFSET - BELOW_OFFSET;
  const halfWidth = toolbarWidth / 2;

  // Horizontal: clamp the CENTER in viewport coords, then convert to
  // document coords, so both edges stay visible.
  const selectionCenter = rect.left + rect.width / 2;
  let center: number;
  if (toolbarWidth + EDGE_MARGIN * 2 >= bounds.right - bounds.left) {
    // Bubble wider than the viewport: best we can do is center it.
    center = (bounds.left + bounds.right) / 2;
  } else {
    center = Math.min(
      Math.max(selectionCenter, bounds.left + halfWidth + EDGE_MARGIN),
      bounds.right - halfWidth - EDGE_MARGIN
    );
  }
  const left = center + scrollX;

  // Vertical: flip below when the visible paper has insufficient room above.
  const below = rect.top - height - BELOW_OFFSET < bounds.top + EDGE_MARGIN;
  const desiredTop = below ? rect.bottom + BELOW_OFFSET : rect.top - height - BELOW_OFFSET;
  const top = Math.max(bounds.top + EDGE_MARGIN,
    Math.min(desiredTop, bounds.bottom - height - EDGE_MARGIN)) + scrollY;

  return { top, left, below };
}
