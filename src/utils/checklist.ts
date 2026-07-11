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
 * Flip a checklist item's checked state (anything other than "true" counts as
 * unchecked). Returns the new checked state.
 */
export function toggleChecklistItem(li: HTMLElement): boolean {
  const nowChecked = li.getAttribute("data-checked") !== "true";
  li.setAttribute("data-checked", nowChecked ? "true" : "false");
  return nowChecked;
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
