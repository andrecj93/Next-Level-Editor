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
 * The pill centers over it, 12px below its top edge, in ambient/home states.
 * The host must refresh it on resize/scroll — the pill is position: fixed.
 */
export interface PlayheadAnchorRect {
  top: number;
  left: number;
  width: number;
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
 * Inline formatting buttons (B/I/U/S + link). Exactly the ToolbarAction shape
 * EditorToolbar/FloatingToolbar consume, so the host passes the SAME objects.
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
}
