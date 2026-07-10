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
 * Vertically the bubble sits ABOVE_OFFSET px above the selection, except
 * when the selection is within FLIP_THRESHOLD px of the viewport top
 * (viewport-relative, so it works on scrolled pages) — then it flips BELOW
 * the selection (`below: true` drives the `is-below` arrow class).
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
  viewportWidth: number;
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
  const halfWidth = toolbarWidth / 2;

  // Horizontal: clamp the CENTER in viewport coords, then convert to
  // document coords, so both edges stay visible.
  const selectionCenter = rect.left + rect.width / 2;
  let center: number;
  if (toolbarWidth + EDGE_MARGIN * 2 >= viewportWidth) {
    // Bubble wider than the viewport: best we can do is center it.
    center = viewportWidth / 2;
  } else {
    center = Math.min(
      Math.max(selectionCenter, halfWidth + EDGE_MARGIN),
      viewportWidth - halfWidth - EDGE_MARGIN
    );
  }
  const left = center + scrollX;

  // Vertical: flip below the selection when there is not enough room above
  // it in the VIEWPORT (rect.top is viewport-relative).
  const below = rect.top < FLIP_THRESHOLD;
  const top = below
    ? rect.bottom + scrollY + BELOW_OFFSET
    : Math.max(EDGE_MARGIN, rect.top + scrollY - ABOVE_OFFSET);

  return { top, left, below };
}
