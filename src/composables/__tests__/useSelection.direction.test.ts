// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { useSelection } from '../useSelection';
import { toggleBlock } from '../../utils/formatting';

describe('selection direction after leaving the manuscript', () => {
  let root: HTMLDivElement;
  let button: HTMLButtonElement;
  let scope: EffectScope;
  let editor: ReturnType<typeof useSelection>;
  const selection = () => window.getSelection()!;

  beforeEach(() => {
    root = document.createElement('div');
    root.setAttribute('contenteditable', 'true');
    root.innerHTML = '<p>First paragraph</p><p>Second paragraph</p>';
    button = document.createElement('button');
    document.body.append(root, button);
    scope = effectScope();
    editor = scope.run(() => useSelection(ref(root)))!;
    root.focus();
  });

  afterEach(() => {
    scope.stop();
    selection().removeAllRanges();
    root.remove();
    button.remove();
  });

  it.each([false, true])('restores a remembered word with backwards=%s', backwards => {
    const text = root.firstChild!.firstChild!;
    const anchor = backwards ? 5 : 1;
    const focus = backwards ? 1 : 5;
    selection().setBaseAndExtent(text, anchor, text, focus);
    editor.rememberSelection();
    button.focus();
    selection().removeAllRanges();

    const observed: unknown[] = [];
    editor.performWithSelection(() => observed.push([
      selection().toString(), selection().anchorNode, selection().anchorOffset,
      selection().focusNode, selection().focusOffset,
    ]));
    expect(observed).toEqual([['irst', text, anchor, text, focus]]);
    expect(document.activeElement).toBe(root);
  });

  it('preserves a backwards selection across paragraphs when formatting', () => {
    const first = root.firstChild!.firstChild!;
    const second = root.lastChild!.firstChild!;
    selection().setBaseAndExtent(second, 3, first, 2);
    editor.rememberSelection();
    button.focus();
    selection().removeAllRanges();

    editor.performWithSelection(el => toggleBlock(el, 'h2'));

    expect(root.querySelectorAll('h2')).toHaveLength(2);
    expect(selection().anchorNode).toBe(second);
    expect(selection().anchorOffset).toBe(3);
    expect(selection().focusNode).toBe(first);
    expect(selection().focusOffset).toBe(2);
  });

  it('retains the direction of the last tracked selection when focus loses it', () => {
    const text = root.firstChild!.firstChild!;
    selection().setBaseAndExtent(text, 5, text, 1);
    root.dispatchEvent(new MouseEvent('mouseup'));
    button.focus();
    selection().removeAllRanges();
    editor.rememberSelection();

    const observed: unknown[] = [];
    editor.performWithSelection(() => observed.push([
      selection().toString(), selection().anchorOffset, selection().focusOffset,
    ]));
    expect(observed).toEqual([['irst', 5, 1]]);
  });
});
