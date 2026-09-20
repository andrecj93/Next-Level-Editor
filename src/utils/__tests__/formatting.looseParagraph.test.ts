import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toggleBlock } from '../formatting';

describe('formatting freshly typed paragraphs', () => {
  let root: HTMLElement;
  beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(root);
  });
  afterEach(() => { window.getSelection()?.removeAllRanges(); root.remove(); });

  const select = (node: Node, start: number, end = start) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  };

  it('turns a typed line into a heading and leaves a caret ready to continue', () => {
    root.textContent = 'A map of the ordinary';
    select(root.firstChild!, 21);
    toggleBlock(root, 'h1');
    expect(root.innerHTML).toBe('<h1>A map of the ordinary</h1>');
    expect(window.getSelection()!.isCollapsed).toBe(true);
    expect(root.querySelector('h1')!.contains(window.getSelection()!.anchorNode)).toBe(true);
  });

  it('preserves inline marks and formats the whole line when only a word is selected', () => {
    root.innerHTML = 'A <em>quiet</em> morning';
    select(root.querySelector('em')!.firstChild!, 1, 4);
    toggleBlock(root, 'h2');
    expect(root.innerHTML).toBe('<h2>A <em>quiet</em> morning</h2>');
  });

  it('keeps neighbouring blocks and line breaks outside the converted line', () => {
    root.innerHTML = '<p>Before</p>One<br>Two <strong>words</strong><p>After</p>';
    select(root.querySelector('strong')!.firstChild!, 3);
    toggleBlock(root, 'h2');
    expect(root.innerHTML).toBe('<p>Before</p>One<br><h2>Two <strong>words</strong></h2><p>After</p>');
  });

  it('handles a browser caret at the root boundary after the last text node', () => {
    root.textContent = 'An opening';
    select(root, 1);
    toggleBlock(root, 'h1');
    expect(root.innerHTML).toBe('<h1>An opening</h1>');
  });
});
