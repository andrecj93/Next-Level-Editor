/**
 * Checklist block helpers.
 *
 * A checklist is `<ul class="checklist"><li data-checked="true|false">…</li></ul>`.
 * The checkbox is a pure CSS `::before` in the item's left gutter (no live
 * `<input>`, so the sanitizer preserves the block — see useHtmlSanitizer's
 * checklist special-case). Clicking the gutter toggles `data-checked`; clicking
 * the label text is a normal caret placement for editing.
 */

/** Class marking a checklist `<ul>`. */
export const CHECKLIST_CLASS = "checklist";

/**
 * Width (px, from the item's left edge) of the clickable checkbox gutter. Must
 * stay in step with the checklist `::before` box + padding in the CSS.
 */
export const CHECKLIST_CHECKBOX_HIT_PX = 30;

/**
 * Stamp the accessibility contract onto a checklist item so screen readers
 * announce it as a checkbox with its state. Kept in one place because the
 * sanitizer strips every `<li>` attribute on each round-trip and must re-apply
 * exactly this, in sync with `data-checked`.
 */
export function applyChecklistItemA11y(li: HTMLElement, checked: boolean): void {
  li.setAttribute("role", "checkbox");
  li.setAttribute("aria-checked", checked ? "true" : "false");
}

/**
 * Flip a checklist item's checked state (anything other than "true" counts as
 * unchecked). Returns the new checked state and keeps the ARIA state in sync.
 */
export function toggleChecklistItem(li: HTMLElement): boolean {
  const nowChecked = li.getAttribute("data-checked") !== "true";
  li.setAttribute("data-checked", nowChecked ? "true" : "false");
  applyChecklistItemA11y(li, nowChecked);
  return nowChecked;
}

/**
 * Resolve the checklist `<li>` that contains a caret/selection node, or null
 * when the node isn't inside a checklist item. Unlike
 * `checklistItemForCheckboxClick` this is pointer-independent, so a keyboard
 * user can toggle the item the caret sits in.
 */
export function checklistItemForNode(node: Node | null): HTMLElement | null {
  const el =
    node instanceof Element ? node : (node?.parentElement ?? null);
  const li = el?.closest("li");
  if (!li) return null;

  const list = li.parentElement;
  if (
    !list ||
    list.tagName !== "UL" ||
    !list.classList.contains(CHECKLIST_CLASS)
  ) {
    return null;
  }
  return li as HTMLElement;
}

/**
 * Resolve the checklist `<li>` whose checkbox gutter was clicked, or null when
 * the click is not on a checklist checkbox (wrong list, or on the label text).
 * `clientX` is the pointer x in viewport coordinates.
 */
export function checklistItemForCheckboxClick(
  target: EventTarget | null,
  clientX: number
): HTMLElement | null {
  const el = target instanceof Element ? target : null;
  const li = el?.closest("li");
  if (!li) return null;

  const list = li.parentElement;
  if (
    !list ||
    list.tagName !== "UL" ||
    !list.classList.contains(CHECKLIST_CLASS)
  ) {
    return null;
  }

  const rect = li.getBoundingClientRect();
  return clientX - rect.left <= CHECKLIST_CHECKBOX_HIT_PX
    ? (li as HTMLElement)
    : null;
}
