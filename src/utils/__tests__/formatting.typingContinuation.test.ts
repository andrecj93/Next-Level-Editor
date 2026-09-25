import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyInlineStyle, isInlineStyleActive } from '../formatting';

describe('continue typing after toggling emphasis off', () => {
  let root: HTMLDivElement;
  const at = (selector: string, offset: number) => {
    const text = root.querySelector(selector)!.firstChild!;
    const range = document.createRange();
    range.setStart(text, offset); range.collapse(true);
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
  };
  beforeEach(() => {
    root = document.createElement('div'); root.contentEditable = 'true';
    document.body.appendChild(root);
  });
  afterEach(() => { root.remove(); window.getSelection()!.removeAllRanges(); });

  for (const tag of ['strong', 'em', 'u']) {
    it.each([0, 2, 4])(`leaves ${tag} at offset %s without changing adjacent prose`, offset => {
      root.innerHTML = `<p>Before <${tag}>word</${tag}> after.</p>`;
      at(tag, offset); applyInlineStyle(root, tag);
      expect(isInlineStyleActive(root, tag)).toBe(false);
      const point = window.getSelection()!.anchorNode!;
      // A concrete text point prevents browsers choosing an adjacent mark.
      expect(point.nodeType).toBe(Node.TEXT_NODE);
      expect(point.parentElement!.closest(tag)).toBeNull();
      expect(root.textContent!.replace(/\u200b/g, '')).toBe('Before word after.');
      expect([...root.querySelectorAll(tag)].some(el => !el.textContent)).toBe(false);
    });
  }

  it('keeps other nested styles and links active for continued typing', () => {
    root.innerHTML = '<p><strong><a href="https://example.com"><em>word</em></a></strong></p>';
    at('em', 2); applyInlineStyle(root, 'strong');
    const parent = window.getSelection()!.anchorNode!.parentElement!;
    expect(parent.closest('strong')).toBeNull();
    expect(parent.closest('em')).toBeTruthy();
    expect(parent.closest('a')!.getAttribute('href')).toBe('https://example.com');
    expect(isInlineStyleActive(root, 'em')).toBe(true);
  });

  it('retains the original attributes on both styled halves without duplicate anchors', () => {
    root.innerHTML = '<p><strong id="chapter-note" class="authored" style="color: red">word</strong></p>';
    at('strong', 2); applyInlineStyle(root, 'strong');
    expect(root.querySelectorAll('strong.authored[style="color: red"]')).toHaveLength(2);
    expect(root.querySelectorAll('#chapter-note')).toHaveLength(1);
  });

  it('leaves nested copies of the same emphasis while retaining a different mark', () => {
    root.innerHTML = '<p><strong><em><strong>word</strong></em></strong></p>';
    at('em strong', 2); applyInlineStyle(root, 'strong');
    expect(isInlineStyleActive(root, 'strong')).toBe(false);
    expect(isInlineStyleActive(root, 'em')).toBe(true);
    expect(root.textContent!.replace(/\u200b/g, '')).toBe('word');
  });
});
