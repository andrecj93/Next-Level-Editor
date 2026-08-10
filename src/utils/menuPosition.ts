/**
 * Shared viewport clamping for caret-anchored popup menus (slash-command
 * menu, variable autocomplete). Keeps a fixed/absolute menu inside the
 * usable viewport: clear of the editor toolbar wherever it is docked
 * (top bar, bottom dock, or left rail), above the fixed mobile toolbar
 * (when present), and inside the horizontal bounds. Without this, on small
 * screens the fixed bars sat on top of the menus and intercepted every
 * click on their items — or the menu simply rendered off-screen.
 *
 * The clamp is position-aware by OBSERVATION, not configuration: each
 * obstacle bar's rect decides which side it claims. A bar whose vertical
 * center sits in the top half of the viewport is a top obstacle; in the
 * bottom half, a bottom obstacle; a tall narrow rail (the left-docked
 * toolbar) claims a left limit and no vertical space at all. This keeps
 * the util caller-agnostic while fixing the inverted clamp that pinned
 * menus below the viewport in toolbarPosition="bottom"/"left".
 */

export interface MenuClampOptions {
  /** Estimated rendered width of the menu (used for the right-edge clamp). */
  estimatedWidth: number;
  /** Estimated rendered height (used for the bottom clamp / flip point). */
  estimatedHeight: number;
  /** Breathing room kept between the menu and any obstacle. */
  margin?: number;
  /**
   * The editor root the menu belongs to. Docked toolbars are looked up inside
   * it, so a SECOND editor's toolbar never clamps this editor's menu. Omit it
   * and the scan is document-wide (previous behaviour). #R23-7
   */
  root?: HTMLElement | null;
}

export interface ClampedMenuPosition {
  top: number;
  left: number;
  /**
   * Height budget between the clamped top and the bottom obstacle. Apply it
   * as max-height so the menu scrolls internally instead of extending under
   * a fixed bar (which would swallow taps on its lower items).
   */
  maxHeight: number;
}

/**
 * A toolbar narrower than this (and taller than it is wide) is treated as
 * the vertical left rail (`toolbarPosition="left"`, ~52px wide) rather than
 * a horizontal bar. Horizontal bars are viewport/editor-width (hundreds of
 * px), so the bands cannot collide.
 */
const RAIL_MAX_WIDTH = 80;

/**
 * Clamp viewport-space menu coordinates into the usable viewport.
 * Coordinates in and out are viewport-relative (position: fixed semantics);
 * callers using position: absolute must convert afterwards.
 *
 * Obstacle rules (per visible bar):
 * - zero-height rect → ignored (hidden/display:none). Note that a RECEDED
 *   toolbar (opacity 0 but still laid out) keeps a real box and is still
 *   counted — its reserved space genuinely occludes the menu.
 * - tall + narrow (left rail) → left obstacle: menu stays right of it.
 * - center in the top half of the viewport → top obstacle: menu below it.
 * - center in the bottom half → bottom obstacle: menu ends above it.
 */
export function clampMenuToViewport(
  viewportTop: number,
  viewportLeft: number,
  options: MenuClampOptions
): ClampedMenuPosition {
  const { estimatedWidth, estimatedHeight, margin = 8, root = null } = options;

  // Docked toolbars are scoped to the caller's own editor: a second editor's
  // toolbar further down the page used to be read as a bottom obstacle, and
  // this editor's menu was flipped up against a bar that is not even near its
  // caret. The mobile toolbar stays a document-wide lookup — it is TELEPORTED
  // to <body>, so it is never inside the root, and only one bottom bar is ever
  // the active one. #R23-7
  const dockedScope: ParentNode = root ?? document;
  const bars = [
    ...dockedScope.querySelectorAll(".editor-toolbar-modern"),
    ...document.querySelectorAll(".mobile-toolbar"),
  ].map((el) => el.getBoundingClientRect());

  let minTop = 0;
  let minLeft = 0;
  let bottomLimit = window.innerHeight;

  for (const rect of bars) {
    if (rect.height <= 0) continue; // hidden bar — occupies nothing
    if (rect.width > 0 && rect.width < RAIL_MAX_WIDTH && rect.height > rect.width) {
      // Vertical rail: claims horizontal space only, never a vertical band.
      minLeft = Math.max(minLeft, rect.right);
      continue;
    }
    const centerY = rect.top + rect.height / 2;
    if (centerY < window.innerHeight / 2) {
      // Top bar (sticky main toolbar, host header): menu opens below it.
      minTop = Math.max(minTop, rect.bottom);
    } else {
      // Bottom dock / mobile toolbar: menu must end above it.
      bottomLimit = Math.min(bottomLimit, rect.top);
    }
  }

  const topEdge = Math.max(0, minTop) + margin;
  const leftEdge = Math.max(margin, minLeft + margin);
  const maxTop = Math.max(topEdge, bottomLimit - estimatedHeight - margin);
  const maxLeft = Math.max(
    leftEdge,
    window.innerWidth - estimatedWidth - margin
  );

  const top = Math.min(Math.max(viewportTop, topEdge), maxTop);
  // The menu may not fit at all between the bars (small screens with the
  // mobile toolbar open) — cap its height so it scrolls internally instead
  // of extending underneath the fixed bar, which would intercept clicks.
  const maxHeight = Math.max(160, bottomLimit - top - margin);

  return {
    top,
    left: Math.min(Math.max(viewportLeft, leftEdge), maxLeft),
    maxHeight,
  };
}
