import { captureSelectionBookmark } from './selectionBookmark';

// This attribute is transient. The sanitizer removes the wrapper and its one
// cursor character before HTML leaves the editor; authored Unicode survives.
const PLACEHOLDER_ATTRIBUTE = 'data-nle-typing-placeholder';
const PLACEHOLDER_SELECTOR = `span[${PLACEHOLDER_ATTRIBUTE}="true"]`;
const EMPTY_INLINE = new Set(['SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUB', 'SUP']);

export function createTypingPlaceholder(ownerDocument: Document): HTMLSpanElement {
  const placeholder = ownerDocument.createElement('span');
  placeholder.setAttribute(PLACEHOLDER_ATTRIBUTE, 'true');
  placeholder.appendChild(ownerDocument.createTextNode('\u200b'));
  return placeholder;
}

/** Retire typing anchors without stripping Unicode from the author's prose.
 * Run after committed input, or before native deletion/navigation. Never run
 * during composition: the browser owns that text until the IME commits it.
 */
export function removeTypingPlaceholders(root: HTMLElement, preserveActiveEmpty = false): void {
  for (const placeholder of root.querySelectorAll<HTMLElement>(PLACEHOLDER_SELECTOR)) {
    const activeSelection = root.ownerDocument.defaultView?.getSelection();
    if (preserveActiveEmpty && placeholder.textContent === '\u200b' && activeSelection?.isCollapsed
      && activeSelection.anchorNode && placeholder.contains(activeSelection.anchorNode)) continue;
    const walker = root.ownerDocument.createTreeWalker(placeholder, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.nodeType === Node.TEXT_NODE ? NodeFilter.FILTER_ACCEPT
        : (node as Element).matches(PLACEHOLDER_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP,
    });
    let text = walker.nextNode() as Text | null;
    while (text && !text.data.startsWith('\u200b')) text = walker.nextNode() as Text | null;
    // Only the first character in the marked text run belongs to us. In
    // particular, don't replace every ZWSP, ZWNJ or ZWJ in the document.
    if (text) {
      const selection = root.ownerDocument.defaultView?.getSelection();
      const anchor = selection?.anchorNode;
      const focus = selection?.focusNode;
      const anchorOffset = selection?.anchorOffset ?? 0;
      const focusOffset = selection?.focusOffset ?? 0;
      text.deleteData(0, 1);
      if (selection && anchor && focus && root.contains(anchor) && root.contains(focus)) {
        selection.setBaseAndExtent(anchor, anchor === text ? Math.max(0, anchorOffset - 1) : anchorOffset,
          focus, focus === text ? Math.max(0, focusOffset - 1) : focusOffset);
      }
    }

    if (!placeholder.textContent && !placeholder.querySelector('br, img, input, video, iframe')) {
      let empty: HTMLElement | null = placeholder;
      while (empty && empty !== root && EMPTY_INLINE.has(empty.tagName)
        && !empty.textContent && !empty.querySelector('br, img, input, video, iframe')
        && !empty.hasAttribute('id') && !empty.hasAttribute('contenteditable')) {
        const parent: HTMLElement | null = empty.parentElement;
        empty.remove();
        empty = parent;
      }
      continue;
    }

    // deleteData adjusts the live caret; capture it afterwards. Reparenting
    // its text would otherwise move that caret to the wrapper's old parent.
    const bookmark = captureSelectionBookmark(root);
    const children = Array.from(placeholder.childNodes);
    bookmark?.remember(placeholder, children);
    placeholder.replaceWith(...children);
    bookmark?.restore();
  }
}

export function prepareTypingPlaceholdersForKey(root: HTMLElement, event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229 || event.defaultPrevented) return;
  if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
    removeTypingPlaceholders(root);
  }
}

export function prepareTypingPlaceholdersForInput(root: HTMLElement, event: InputEvent): void {
  if (event.isComposing || event.defaultPrevented) return;
  if (event.inputType.startsWith('delete')) {
    const hadPlaceholder = !!root.querySelector(PLACEHOLDER_SELECTOR);
    const characterDeletion = ['deleteContentBackward', 'deleteContentForward'].includes(event.inputType);
    // Some engines Backspace only the last component of a joined emoji or
    // accented character. Character navigation exposes their full grapheme.
    const complexCharacter = characterDeletion && event.cancelable
      && typeof event.getTargetRanges === 'function'
      && event.getTargetRanges().some(target => {
        if (!root.contains(target.startContainer) || !root.contains(target.endContainer)) return false;
        const range = root.ownerDocument.createRange();
        range.setStart(target.startContainer, target.startOffset);
        range.setEnd(target.endContainer, target.endOffset);
        return /[\p{Mark}\p{Regional_Indicator}\p{Emoji_Modifier}\u200d]/u.test(range.toString());
      });
    removeTypingPlaceholders(root);
    if ((hadPlaceholder || complexCharacter) && event.cancelable && characterDeletion) {
      const selection = root.ownerDocument.defaultView?.getSelection();
      if (!selection?.anchorNode || !selection.focusNode
        || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return;
      // Respect explicit text selections. A nested beforeinput from the edit
      // below has one too, so it cannot recursively extend the deletion.
      if (!selection.isCollapsed && !hadPlaceholder) return;
      if (selection.isCollapsed) {
        if (typeof selection.modify !== 'function') return;
        const anchor = selection.anchorNode, offset = selection.anchorOffset;
        const direction = event.inputType === 'deleteContentForward' ? 'forward' : 'backward';
        selection.modify('extend', direction, 'character');
        // Firefox can stop at the same visual position inside the adjacent
        // mark. That empty inline range is not a character. Start from its
        // concrete text position and extend once more; keep real block joins
        // and atomic content intact.
        const focus = selection.focusNode;
        const focusOffset = selection.focusOffset;
        if (focus?.nodeType === Node.TEXT_NODE && !selection.toString()
          && (direction === 'backward' ? focusOffset > 0 : focusOffset < (focus as Text).length)
          && Array.from(selection.getRangeAt(0).cloneContents().querySelectorAll('*'))
            .every(element => [...EMPTY_INLINE, 'A', 'CODE'].includes(element.tagName)
              && element.getAttribute('contenteditable') !== 'false')) {
          selection.collapse(focus, focusOffset);
          selection.modify('extend', direction, 'character');
        }
        if (!selection.focusNode || !root.contains(selection.focusNode)) {
          selection.collapse(anchor, offset);
          event.preventDefault();
          return;
        }
      }
      // WebKit freezes the old marker in a StaticRange. Select the visible
      // character from the cleaned caret, then let the native editing command
      // delete that range (including paragraph joins) through normal input.
      event.preventDefault();
      if (!selection.isCollapsed) root.ownerDocument.execCommand('delete');
    }
  }
}

/** Capture character formatting before a paragraph split removes its empty
 * typing anchor. Links and comment identities belong to their existing text.
 */
export function captureTypingStyles(root: HTMLElement): HTMLElement[] {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (!selection?.rangeCount) return [];
  const point = selection.getRangeAt(0).startContainer;
  if (!root.contains(point)) return [];
  const styles: HTMLElement[] = [];
  let element = point.nodeType === Node.ELEMENT_NODE ? point as HTMLElement : point.parentElement;
  while (element && element !== root && ['SPAN', 'A', 'CODE', ...EMPTY_INLINE].includes(element.tagName)) {
    if (element.tagName !== 'A' && !element.matches(PLACEHOLDER_SELECTOR)
      && (element.tagName !== 'SPAN' || element.hasAttribute('style'))
      && element.getAttribute('contenteditable') !== 'false') {
      const style = element.cloneNode(false) as HTMLElement;
      style.removeAttribute('id');
      style.removeAttribute('class');
      style.removeAttribute('data-thread-id');
      styles.push(style);
    }
    element = element.parentElement;
  }
  return styles;
}

/** Give the start of a new paragraph a concrete typing position. An empty
 * style list deliberately means plain text, even beside a styled tail.
 */
export function continueTypingIn(target: HTMLElement, styles: HTMLElement[], selection: Selection): void {
  if (!styles.length && !target.querySelector('strong, b, em, i, u, s, sub, sup, span[style], code')) {
    selection.setBaseAndExtent(target, 0, target, 0);
    return;
  }
  const placeholder = createTypingPlaceholder(target.ownerDocument);
  let content: HTMLElement = placeholder;
  for (const style of styles) {
    style.appendChild(content);
    content = style;
  }
  target.insertBefore(content, target.firstChild);
  selection.setBaseAndExtent(placeholder.firstChild!, 1, placeholder.firstChild!, 1);
}
