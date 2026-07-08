/**
 * Shared viewport clamping for caret-anchored popup menus (slash-command
 * menu, variable autocomplete). Keeps a fixed/absolute menu inside the
 * usable viewport: below the sticky main toolbar, above the fixed mobile
 * toolbar (when present), and inside the horizontal bounds. Without this,
 * on small screens the fixed bars sat on top of the menus and intercepted
 * every click on their items — or the menu simply rendered off-screen.
 */

export interface MenuClampOptions {
  /** Estimated rendered width of the menu (used for the right-edge clamp). */
  estimatedWidth: number;
  /** Estimated rendered height (used for the bottom clamp / flip point). */
  estimatedHeight: number;
  /** Breathing room kept between the menu and any obstacle. */
  margin?: number;
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
 * Clamp viewport-space menu coordinates into the usable viewport.
 * Coordinates in and out are viewport-relative (position: fixed semantics);
 * callers using position: absolute must convert afterwards.
 */
export function clampMenuToViewport(
  viewportTop: number,
  viewportLeft: number,
  options: MenuClampOptions
): ClampedMenuPosition {
  const { estimatedWidth, estimatedHeight, margin = 8 } = options;

  const topBar = document
    .querySelector(".editor-toolbar-modern")
    ?.getBoundingClientRect();
  const mobileBar = document
    .querySelector(".mobile-toolbar")
    ?.getBoundingClientRect();

  const minTop = (topBar ? Math.max(0, topBar.bottom) : 0) + margin;
  const bottomLimit =
    mobileBar && mobileBar.height > 0 ? mobileBar.top : window.innerHeight;
  const maxTop = Math.max(minTop, bottomLimit - estimatedHeight - margin);
  const maxLeft = Math.max(margin, window.innerWidth - estimatedWidth - margin);

  const top = Math.min(Math.max(viewportTop, minTop), maxTop);
  // The menu may not fit at all between the bars (small screens with the
  // mobile toolbar open) — cap its height so it scrolls internally instead
  // of extending underneath the fixed bar, which would intercept clicks.
  const maxHeight = Math.max(160, bottomLimit - top - margin);

  return {
    top,
    left: Math.min(Math.max(viewportLeft, margin), maxLeft),
    maxHeight,
  };
}
