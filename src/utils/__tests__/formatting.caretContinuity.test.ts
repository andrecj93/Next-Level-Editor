// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toggleBlock, toggleList } from '../formatting';

describe('selection continuity when changing block styles', () => {
  let root: HTMLDivElement;
  const selection = () => window.getSelection()!;
  const select = (node: Node, from: number, to = from) => selection().setBaseAndExtent(node, from, node, to);
  beforeEach(() => {
    root = document.createElement('div');
    root.contentEditable = 'true';
    document.body.append(root);
  });
  afterEach(() => { selection().removeAllRanges(); root.remove(); });

  it.each([0, 2, 15])('keeps a collapsed title caret at offset %i', (offset) => {
    root.innerHTML = '<h2>A Place to Wait</h2><p>Next paragraph.</p>';
    const text = root.firstChild!.firstChild!;
    select(text, offset);
    toggleBlock(root, 'h1');
    expect(root.innerHTML).toBe('<h1>A Place to Wait</h1><p>Next paragraph.</p>');
    expect(selection().isCollapsed).toBe(true);
    expect(selection().anchorNode).toBe(text);
    expect(selection().anchorOffset).toBe(offset);
  });

  it('keeps a backwards word selection inside an inline mark', () => {
    root.innerHTML = '<p>A <em>quiet</em> morning</p>';
    const text = root.querySelector('em')!.firstChild!;
    select(text, 4, 1);
    toggleBlock(root, 'h2');
    expect(root.innerHTML).toBe('<h2>A <em>quiet</em> morning</h2>');
    expect(selection().toString()).toBe('uie');
    expect(selection().anchorNode).toBe(text);
    expect(selection().anchorOffset).toBe(4);
    expect(selection().focusOffset).toBe(1);
  });

  it('keeps the caret outside an inline mark at an element boundary', () => {
    root.innerHTML = '<p><em>First</em> second</p>';
    select(root.firstChild!, 1);
    toggleBlock(root, 'h2');
    expect(selection().anchorNode).toBe(root.querySelector('h2'));
    expect(selection().anchorOffset).toBe(1);
    expect(selection().isCollapsed).toBe(true);
  });

  it.each(['<p></p>', '<p><br></p>'])('retains the insertion point in an empty block: %s', (html) => {
    root.innerHTML = `<p>Before</p>${html}<p>After</p>`;
    select(root.children[1], 0);
    toggleBlock(root, 'h2');
    expect(selection().anchorNode).toBe(root.querySelector('h2'));
    expect(selection().anchorOffset).toBe(0);
  });

  it('keeps the caret when a freshly typed loose line is wrapped', () => {
    root.textContent = 'A Place to Wait';
    const text = root.firstChild!;
    select(text, 2);
    toggleBlock(root, 'h1');
    expect(root.innerHTML).toBe('<h1>A Place to Wait</h1>');
    expect(selection().anchorNode).toBe(text);
    expect(selection().anchorOffset).toBe(2);
  });

  it('preserves a partial backwards selection across several paragraphs', () => {
    root.innerHTML = '<p>First</p><p>Second</p><p>Untouched</p>';
    const first = root.children[0].firstChild!;
    const second = root.children[1].firstChild!;
    selection().setBaseAndExtent(second, 3, first, 2);
    toggleBlock(root, 'h2');
    expect(root.innerHTML).toBe('<h2>First</h2><h2>Second</h2><p>Untouched</p>');
    expect(selection().toString()).toBe('rstSec');
    expect(selection().anchorNode).toBe(second);
    expect(selection().focusNode).toBe(first);
    expect(selection().anchorOffset).toBe(3);
    expect(selection().focusOffset).toBe(2);
  });

  it('keeps a list caret through adding, switching and removing a list', () => {
    root.innerHTML = '<p>A quiet arrival</p><p>Stay.</p>';
    const text = root.firstChild!.firstChild!;
    select(text, 2);
    for (const tag of ['ul', 'ol', 'ol'] as const) {
      toggleList(root, tag);
      expect(selection().isCollapsed).toBe(true);
      expect(selection().anchorNode).toBe(text);
      expect(selection().anchorOffset).toBe(2);
    }
    expect(root.innerHTML).toBe('<p>A quiet arrival</p><p>Stay.</p>');
  });

  it('preserves a partial selection through listing and unlisting paragraphs', () => {
    root.innerHTML = '<p>First</p><p>Second</p><p>Untouched</p>';
    const first = root.children[0].firstChild!;
    const second = root.children[1].firstChild!;
    selection().setBaseAndExtent(first, 2, second, 3);
    toggleList(root, 'ul');
    expect(selection().toString()).toBe('rstSec');
    expect(root.innerHTML).toBe('<ul><li>First</li><li>Second</li></ul><p>Untouched</p>');
    toggleList(root, 'ul');
    expect(selection().toString()).toBe('rstSec');
    expect(root.innerHTML).toBe('<p>First</p><p>Second</p><p>Untouched</p>');
  });

  it('keeps an empty list item insertion point when it becomes a paragraph', () => {
    root.innerHTML = '<ul><li>Before</li><li></li><li>After</li></ul>';
    select(root.querySelectorAll('li')[1], 0);
    toggleList(root, 'ul');
    expect(root.innerHTML).toBe('<ul><li>Before</li></ul><p></p><ul><li>After</li></ul>');
    expect(selection().anchorNode).toBe(root.querySelector('p'));
    expect(selection().anchorOffset).toBe(0);
  });

  it('switches every selected list level without losing a backwards selection', () => {
    root.innerHTML = '<ul><li>Parent<ul><li>Child</li></ul></li><li>Other</li></ul>';
    const parent = root.querySelector('li')!.firstChild!;
    const child = root.querySelector('ul ul li')!.firstChild!;
    selection().setBaseAndExtent(child, 3, parent, 2);
    toggleList(root, 'ol');
    expect(root.querySelectorAll('ul')).toHaveLength(0);
    expect(root.querySelectorAll('ol')).toHaveLength(2);
    expect(selection().toString()).toBe('rentChi');
    expect(selection().anchorNode).toBe(child);
    expect(selection().anchorOffset).toBe(3);
    expect(selection().focusNode).toBe(parent);
    expect(selection().focusOffset).toBe(2);
  });

  it('keeps the caret before a lifted sub-list inside the converted heading', () => {
    root.innerHTML = '<ul><li>Parent<ul><li>Child</li></ul></li></ul>';
    select(root.querySelector('li')!, 1);
    toggleBlock(root, 'h2');
    expect(root.innerHTML).toBe('<h2>Parent</h2><ul><li>Child</li></ul>');
    expect(selection().anchorNode).toBe(root.querySelector('h2'));
    expect(selection().anchorOffset).toBe(1);
  });

  it('formats a whole table-cell paragraph and preserves its interior caret', () => {
    root.innerHTML = '<table><tbody><tr><td>A quiet arrival</td><td>Other</td></tr></tbody></table>';
    const text = root.querySelector('td')!.firstChild!;
    select(text, 2);
    toggleBlock(root, 'h2');
    expect(root.querySelector('td')!.innerHTML).toBe('<h2>A quiet arrival</h2>');
    expect(root.querySelectorAll('td')).toHaveLength(2);
    expect(selection().anchorNode).toBe(text);
    expect(selection().anchorOffset).toBe(2);
    toggleList(root, 'ul');
    expect(root.querySelector('td')!.innerHTML).toBe('<ul><li>A quiet arrival</li></ul>');
    expect(selection().anchorNode).toBe(text);
    expect(selection().anchorOffset).toBe(2);
  });

  it.each(['heading', 'list'])('places the caret inside a newly formatted empty table cell (%s)', (format) => {
    root.innerHTML = '<table><tbody><tr><td></td><td>Other</td></tr></tbody></table>';
    select(root.querySelector('td')!, 0);
    if (format === 'heading') toggleBlock(root, 'h2');
    else toggleList(root, 'ul');
    expect(selection().anchorNode).toBe(root.querySelector(format === 'heading' ? 'h2' : 'li'));
    expect(selection().anchorOffset).toBe(0);
    expect(selection().isCollapsed).toBe(true);
  });
});
