import { afterEach, describe, expect, it } from 'vitest';
import { clearFormatting, isInlineStyleActive } from '../formatting';

const roots: HTMLElement[] = [];
const editor = (html: string) => {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = html;
  document.body.append(root);
  roots.push(root);
  return root;
};
const select = (start: Node, startOffset: number, end: Node, endOffset: number, backwards = false) => {
  const selection = window.getSelection()!;
  selection.setBaseAndExtent(backwards ? end : start, backwards ? endOffset : startOffset,
    backwards ? start : end, backwards ? startOffset : endOffset);
  return selection;
};
afterEach(() => {
  roots.splice(0).forEach(root => root.remove());
  window.getSelection()?.removeAllRanges();
});

describe('clear selected character formatting', () => {
  it('does not split a non-editable variable when its text is only partially selected', () => {
    const root = editor('<p><em>Before <span contenteditable="false" data-variable="name">Name</span> after</em></p>');
    const text = root.querySelector('[data-variable]')!.firstChild!;
    const before = root.innerHTML;
    const selection = select(text, 1, text, 3);
    expect(clearFormatting(root)).toBe(false);
    expect(root.innerHTML).toBe(before);
    expect(selection.toString()).toBe('am');
  });

  it('keeps a variable intact when a selection ends at the start of its label', () => {
    const root = editor('<p><em>Before <span contenteditable="false" data-variable="name">Name</span> after</em></p>');
    const mark = root.querySelector('em')!;
    const variable = root.querySelector('[data-variable]')!;
    select(mark.firstChild!, 0, variable.firstChild!, 0);
    clearFormatting(root);
    expect(root.querySelectorAll('[data-variable]')).toHaveLength(1);
    expect(root.querySelector('[data-variable]')!.outerHTML).toBe('<span contenteditable="false" data-variable="name">Name</span>');
    expect(root.querySelector('em')!.textContent).toBe('Name after');
    expect(window.getSelection()!.toString()).toBe('Before ');
  });

  it('reports the selected emphasis when the range starts at the preceding text boundary', () => {
    const root = editor('<p>She wrote <em>back</em>.</p>');
    const paragraph = root.querySelector('p')!;
    select(paragraph.firstChild!, 10, paragraph.querySelector('em')!.firstChild!, 4);
    expect(isInlineStyleActive(root, 'em')).toBe(true);
    clearFormatting(root);
    expect(isInlineStyleActive(root, 'em')).toBe(false);
  });

  it('reports emphasis for a parent-offset selection without including neighboring plain text', () => {
    const root = editor('<p>She wrote <em>back</em>.</p>');
    const paragraph = root.querySelector('p')!;
    select(paragraph, 1, paragraph, 2);
    expect(isInlineStyleActive(root, 'em')).toBe(true);
  });

  it('does not report a mixed selection as entirely emphasized', () => {
    const root = editor('<p><em>back</em> again</p>');
    const paragraph = root.querySelector('p')!;
    select(paragraph.querySelector('em')!.firstChild!, 0, paragraph.lastChild!, 6);
    expect(isInlineStyleActive(root, 'em')).toBe(false);
  });

  it('keeps emphasis outside a selected prefix and preserves the selection', () => {
    const root = editor('<p>She wrote <em>back</em>.</p>');
    const text = root.querySelector('em')!.firstChild!;
    const selection = select(text, 0, text, 2);
    expect(clearFormatting(root)).toBe(true);
    expect(root.innerHTML).toBe('<p>She wrote ba<em>ck</em>.</p>');
    expect(selection.toString()).toBe('ba');
  });

  it('keeps both sides of a nested formatted selection and a backwards selection', () => {
    const root = editor('<p><strong><em>before target after</em></strong></p>');
    const text = root.querySelector('em')!.firstChild!;
    const selection = select(text, 7, text, 13, true);
    clearFormatting(root);
    expect(root.innerHTML).toBe('<p><strong><em>before </em></strong>target<strong><em> after</em></strong></p>');
    expect(selection.toString()).toBe('target');
    expect(selection.anchorNode).toBe(selection.getRangeAt(0).endContainer);
    expect(selection.anchorOffset).toBe(selection.getRangeAt(0).endOffset);
  });

  it('preserves links while clearing only the selected linked characters', () => {
    const root = editor('<p><strong><a href="https://example.com">before target after</a></strong></p>');
    const text = root.querySelector('a')!.firstChild!;
    select(text, 7, text, 13);
    clearFormatting(root);
    expect(root.innerHTML).toBe('<p><strong><a href="https://example.com">before </a></strong><a href="https://example.com">target</a><strong><a href="https://example.com"> after</a></strong></p>');
  });

  it('preserves untouched inline color and size at both boundaries', () => {
    const root = editor('<p><span style="color:red;font-size:24px">before target after</span></p>');
    const text = root.querySelector('span')!.firstChild!;
    select(text, 7, text, 13);
    clearFormatting(root);
    expect(root.querySelectorAll('span')).toHaveLength(2);
    expect(root.querySelector('p')!.childNodes[1].textContent).toBe('target');
    for (const span of root.querySelectorAll('span')) {
      expect(span.style.color).toBe('red');
      expect(span.style.fontSize).toBe('24px');
    }
  });

  it('preserves paragraphs, table cells and unselected text across blocks', () => {
    const root = editor('<p><em>before start</em></p><table><tbody><tr><td><strong>end after</strong></td><td>Untouched</td></tr></tbody></table>');
    const start = root.querySelector('em')!.firstChild!;
    const end = root.querySelector('strong')!.firstChild!;
    const selection = select(start, 7, end, 3);
    const selected = selection.toString();
    clearFormatting(root);
    expect(root.innerHTML).toBe('<p><em>before </em>start</p><table><tbody><tr><td>end<strong> after</strong></td><td>Untouched</td></tr></tbody></table>');
    expect(selection.toString()).toBe(selected);
  });

  it('preserves semantic spans, non-editable variables, code and images', () => {
    const root = editor('<p><strong><span data-comment-id="note">Discuss</span> <span contenteditable="false" data-variable="name">Name</span> <code>x</code><img src="safe.png" alt="Map"></strong></p>');
    const paragraph = root.querySelector('p')!;
    select(paragraph, 0, paragraph, paragraph.childNodes.length);
    clearFormatting(root);
    expect(root.querySelector('strong')).toBeNull();
    expect(root.querySelector('[data-comment-id="note"]')?.textContent).toBe('Discuss');
    expect(root.querySelector('[data-variable="name"]')?.getAttribute('contenteditable')).toBe('false');
    expect(root.querySelector('code')?.textContent).toBe('x');
    expect(root.querySelector('img')?.getAttribute('alt')).toBe('Map');
    expect(root.innerHTML).not.toContain('format-start');
  });
});
