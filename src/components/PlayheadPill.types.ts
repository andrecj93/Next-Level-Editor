import type { ToolbarAction } from "../types/toolbar";
import type { ToolbarPosition } from "../utils/floatingToolbarPosition";

/**
 * Public contract for {@link PlayheadPill} — the morphing-pill toolbar mode.
 *
 * Kept in its own module (rather than inline in `<script setup>`, which cannot
 * `export`) so the generated `.d.ts` can reference the types by name and the
 * host can import them — the same pattern as NextLevelEditor.types.ts, and the
 * same reason floatingToolbarPosition.ts lives outside FloatingToolbar.vue
 * (a second plain `<script>` block exporting types trips TS4082 in vue-tsc's
 * declaration generation).
 */

/**
 * The pill's three chrome states. The HOST owns the state machine — the pill
 * is purely presentational:
 *  - "ambient":   writing / chrome receded. Slim lozenge: save dot + word count.
 *  - "home":      pointer intent, no selection. Top-center writing essentials.
 *  - "selection": non-collapsed selection in the editor. The pill travels to
 *                 the selection and becomes the formatting bubble.
 */
export type PlayheadState = "ambient" | "home" | "selection";

/**
 * Viewport-relative rect of the editor root (from getBoundingClientRect).
 * The pill centers over it, 12px below its top edge, in ambient/home states —
 * clamped so the pill's measured width stays inside the viewport (EDGE_MARGIN
 * gutter) and its y never goes above the viewport top edge (the pill PARKS at
 * the edge while the editor top is scrolled offscreen).
 * The host must refresh it on resize/scroll — the pill is position: fixed.
 */
export interface PlayheadAnchorRect {
  top: number;
  left: number;
  width: number;
  /**
   * Optional editor bottom edge (viewport-relative). When provided, the pill
   * hides entirely (renders nothing) once the editor rect is fully above the
   * viewport past a 24px grace — i.e. `bottom <= -24`. Omitting it preserves
   * the old always-anchored behavior.
   */
  bottom?: number;
}

/**
 * Where the pill travels in "selection" state. Compute with
 * `computeToolbarPosition` from utils/floatingToolbarPosition — but pass
 * `scrollX: 0, scrollY: 0`: the pill is position: fixed, so it needs VIEWPORT
 * coordinates, not the document coordinates FloatingToolbar (absolute) uses.
 * `left` is the pill's horizontal CENTER; `below` means it flipped under the
 * selection (near the viewport top).
 */
export type PlayheadSelectionPosition = ToolbarPosition;

/**
 * Inline formatting buttons (the host's floating/inline action set — e.g.
 * B/I/U + link + comment). Exactly the ToolbarAction shape
 * EditorToolbar/FloatingToolbar consume, so the host passes the SAME objects.
 * Also the shape of the optional `listActions` prop (list/indent toggles).
 */
export type PlayheadAction = ToolbarAction;

/**
 * Dropdown menu entries for the Format / insert "+" / "⋯" overflow menus.
 * Structurally identical to ToolbarDropdown's DropdownItem, so the host can
 * pass the same item arrays it already builds for the docked toolbar
 * (formatDropdownItems, insertDropdownItems, ...).
 */
export interface PlayheadMenuItem {
  id?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  onClick?: () => void;
  isActive?: () => boolean;
  divider?: boolean;
  /** Disabled state — a static/getter boolean or a lazy predicate. A disabled
   * item is dimmed and its onClick never fires (e.g. Undo/Redo at bounds). */
  disabled?: boolean;
  isDisabled?: () => boolean;
}
