import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTypingPlaceholder, removeTypingPlaceholders, prepareTypingPlaceholdersForInput, prepareTypingPlaceholdersForKey, captureTypingStyles, continueTypingIn } from '../typingPlaceholder';
import { useHtmlSanitizer } from '../../composables/useHtmlSanitizer';

describe('transient typing anchors', () => {
  let root: HTMLDivElement;
  let placeholder: HTMLSpanElement;
  beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    root.innerHTML = '<p>Before <strong>word</strong></p>';
    placeholder = createTypingPlaceholder(document);
    root.firstChild!.appendChild(placeholder);
    document.body.appendChild(root);
    window.getSelection()!.setBaseAndExtent(placeholder.firstChild!, 1, placeholder.firstChild!, 1);
  });
  afterEach(() => { root.remove(); window.getSelection()!.removeAllRanges(); });

  it('removes the marker after typing and preserves the text caret', () => {
    const text = placeholder.firstChild as Text;
    text.appendData(' more');
    window.getSelection()!.setBaseAndExtent(text, 6, text, 6);
    removeTypingPlaceholders(root);
    expect(root.innerHTML).toBe('<p>Before <strong>word</strong> more</p>');
    expect(window.getSelection()!.anchorNode).toBe(text);
    expect(window.getSelection()!.anchorOffset).toBe(5);
  });

  it('preserves backward selection while retiring the wrapper', () => {
    const text = placeholder.firstChild as Text;
    text.appendData('more');
    window.getSelection()!.setBaseAndExtent(text, 5, text, 1);
    removeTypingPlaceholders(root);
    expect(window.getSelection()!.anchorNode).toBe(text);
    expect(window.getSelection()!.anchorOffset).toBe(4);
    expect(window.getSelection()!.focusOffset).toBe(0);
    expect(window.getSelection()!.toString()).toBe('more');
  });

  it('removes abandoned empty marks without removing their paragraph', () => {
    root.innerHTML = '<p></p>';
    const strong = document.createElement('strong');
    strong.appendChild(placeholder);
    root.firstChild!.appendChild(strong);
    removeTypingPlaceholders(root);
    expect(root.innerHTML).toBe('<p></p>');
  });

  it('leaves authored zero-width spaces and joining characters intact', () => {
    const authored = 'ไทย\u200bไทย می\u200cروم 👩\u200d💻';
    root.firstChild!.insertBefore(document.createTextNode(authored), placeholder);
    (placeholder.firstChild as Text).appendData(authored);
    removeTypingPlaceholders(root);
    expect(root.textContent).toBe('Before word' + authored + authored);
  });

  it('sanitizes anchors before persistence and does not widen the HTML allowlist', () => {
    (placeholder.firstChild as Text).appendData(' more');
    placeholder.setAttribute('onclick', 'alert(1)');
    placeholder.insertAdjacentHTML('beforeend', '<script>alert(1)</script><img src="x" onerror="alert(1)">');
    const { sanitizeHtml } = useHtmlSanitizer();
    const result = sanitizeHtml(root.innerHTML);
    expect(result).not.toMatch(/data-nle|\u200b|onclick|onerror|script/);
    expect(result).toContain(' more');
    expect(sanitizeHtml(result)).toBe(result);
  });

  it('does not consume a nested anchor or a newly authored word separator twice', () => {
    const nested = createTypingPlaceholder(document);
    (nested.firstChild as Text).appendData('\u200bไทย');
    placeholder.replaceChildren(nested);
    removeTypingPlaceholders(root);
    expect(root.textContent).toBe('Before word\u200bไทย');
  });

  it('does not persist an empty formatting intent as authored prose', () => {
    expect(useHtmlSanitizer().sanitizeHtml(root.innerHTML)).toBe('<p>Before <strong>word</strong></p>');
  });

  it.each(['deleteContentBackward', 'deleteContentForward', 'deleteWordBackward'])('retires a marker before %s', inputType => {
    prepareTypingPlaceholdersForInput(root, new InputEvent('beforeinput', { inputType }));
    expect(root.textContent).toBe('Before word');
    expect(root.querySelector('[data-nle-typing-placeholder]')).toBeNull();
  });

  it('keeps the typing style anchor during insertion and IME composition', () => {
    prepareTypingPlaceholdersForInput(root, new InputEvent('beforeinput', { inputType: 'insertText' }));
    prepareTypingPlaceholdersForInput(root, new InputEvent('beforeinput', { inputType: 'insertParagraph' }));
    prepareTypingPlaceholdersForInput(root, new InputEvent('beforeinput', { inputType: 'deleteCompositionText', isComposing: true }));
    prepareTypingPlaceholdersForKey(root, new KeyboardEvent('keydown', { key: 'Backspace', isComposing: true }));
    expect(root.contains(placeholder)).toBe(true);
  });

  it('does not disturb a canceled editor action', () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true });
    event.preventDefault();
    prepareTypingPlaceholdersForKey(root, event);
    expect(root.contains(placeholder)).toBe(true);
  });

  it('keeps an active empty typing intent until text arrives but never saves it', () => {
    removeTypingPlaceholders(root, true);
    expect(root.contains(placeholder)).toBe(true);
    expect(useHtmlSanitizer().sanitizeHtml(root.innerHTML)).not.toContain('data-nle-typing-placeholder');
    (placeholder.firstChild as Text).appendData('next');
    removeTypingPlaceholders(root, true);
    expect(root.contains(placeholder)).toBe(false);
    expect(root.textContent).toBe('Before wordnext');
  });

  it('carries character styles into the next paragraph without cloning comments or links', () => {
    root.innerHTML = '<p><a href="https://example.com"><span class="comment-highlight" data-thread-id="thread"><strong id="old"><em>word</em></strong></span></a></p><p><br></p>';
    const text = root.querySelector('em')!.firstChild!;
    window.getSelection()!.setBaseAndExtent(text, 4, text, 4);
    const styles = captureTypingStyles(root);
    const paragraph = root.lastElementChild as HTMLElement;
    continueTypingIn(paragraph, styles, window.getSelection()!);
    expect(paragraph.querySelector('strong em [data-nle-typing-placeholder]')).toBeTruthy();
    expect(paragraph.querySelector('a, [id], [data-thread-id], .comment-highlight')).toBeNull();
  });

  it('gives plain typing an unstyled owner before a styled paragraph tail', () => {
    const paragraph = root.firstElementChild as HTMLElement;
    continueTypingIn(paragraph, [], window.getSelection()!);
    expect(window.getSelection()!.anchorNode!.parentElement!.closest('strong')).toBeNull();
    expect(window.getSelection()!.anchorNode!.textContent).toBe('\u200b');
  });

  it('retires restored history markers without relying on stale node identities', () => {
    const snapshot = root.innerHTML;
    root.innerHTML = snapshot;
    prepareTypingPlaceholdersForKey(root, new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(root.textContent).toBe('Before word');
    expect(root.querySelector('[data-nle-typing-placeholder]')).toBeNull();
  });
});
