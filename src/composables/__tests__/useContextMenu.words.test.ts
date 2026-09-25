import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { useContextMenu } from '../useContextMenu';

let root: HTMLDivElement;
const originalHitTest = Object.getOwnPropertyDescriptor(document, 'caretRangeFromPoint');
const originalSegmenter = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
const hitTestDocument = document as Document & { caretRangeFromPoint(x: number, y: number): Range | null };
beforeEach(() => {
  Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, writable: true, value: () => null });
  root = document.createElement('div');
  root.contentEditable = 'true';
  document.body.appendChild(root);
});
afterEach(() => {
  window.getSelection()?.removeAllRanges();
  root.remove();
  vi.restoreAllMocks();
  if (originalHitTest) Object.defineProperty(document, 'caretRangeFromPoint', originalHitTest);
  else Reflect.deleteProperty(document, 'caretRangeFromPoint');
  if (originalSegmenter) Object.defineProperty(Intl, 'Segmenter', originalSegmenter);
  else Reflect.deleteProperty(Intl, 'Segmenter');
});
const menu = () => useContextMenu({
  editorContent: ref(root), handleInlineAction: vi.fn(), insertLink: vi.fn(),
  insertImage: vi.fn(), rememberSelection: vi.fn(), showTableDesigner: ref(false),
  currentTable: ref(null), currentCell: ref(null), tableDesignerPosition: ref({ x: 0, y: 0 }),
});
const pointerAt = (text: string, offset: number) => {
  root.textContent = text;
  const range = document.createRange();
  range.setStart(root.firstChild!, offset);
  range.collapse(true);
  vi.spyOn(hitTestDocument, 'caretRangeFromPoint').mockReturnValue(range);
};

describe('right-click word selection', () => {
  it.each([
    ['Café, please.', 4, 'Café'],
    ['A ação importa.', 5, 'ação'],
    ['A cafe\u0301 opens.', 7, 'cafe\u0301'],
    ['Привет, мир.', 3, 'Привет'],
    ['مرحبا بالعالم', 3, 'مرحبا'],
    ['𐐀𐐁 test', 2, '𐐀𐐁'],
    ["I can't wait.", 5, "can't"],
    ['你好世界', 1, '你好'],
  ])('selects the whole word in %s', (text, offset, expected) => {
    pointerAt(text, offset);
    const context = menu();
    context.handleContextMenu(new MouseEvent('contextmenu', { cancelable: true }));
    expect(window.getSelection()?.toString()).toBe(expected);
    expect(context.contextMenuItems.value.find(item => item.id === 'copy')?.disabled).toBe(false);
  });

  it.each(['Café', 'cafe\u0301', 'Привет', '𐐀𐐁'])('keeps Unicode words without Segmenter: %s', word => {
    Object.defineProperty(Intl, 'Segmenter', { configurable: true, writable: true, value: undefined });
    pointerAt(`${word}.`, word.length);
    menu().handleContextMenu(new MouseEvent('contextmenu', { cancelable: true }));
    expect(window.getSelection()?.toString()).toBe(word);
  });

  it('recognizes letter segments when an engine misclassifies isWordLike', () => {
    // Reproduced in native Firefox: the Chinese word is segmented correctly
    // but isWordLike is false. Preserve the engine boundary, not that flag.
    Object.defineProperty(Intl, 'Segmenter', {
      configurable: true, value: class {
        segment() { return { containing: () => ({ index: 0, segment: '你好', isWordLike: false }) }; }
      },
    });
    pointerAt('你好.', 1);
    menu().handleContextMenu(new MouseEvent('contextmenu', { cancelable: true }));
    expect(window.getSelection()?.toString()).toBe('你好');
  });

  it.each(['shift', 'touch'])('leaves the native %s context menu available', input => {
    pointerAt('Café', 3);
    const context = menu();
    const event = new MouseEvent('contextmenu', { cancelable: true, shiftKey: input === 'shift' });
    if (input === 'touch') Object.defineProperty(event, 'pointerType', { value: 'touch' });
    context.handleContextMenu(event);
    expect(event.defaultPrevented).toBe(false);
    expect(context.showContextMenu.value).toBe(false);
    expect(window.getSelection()?.toString()).toBe('');
  });

  it('does not move selection into another editor returned by hit testing', () => {
    const outside = document.createTextNode('Other document');
    const range = document.createRange();
    range.setStart(outside, 3);
    range.collapse(true);
    vi.spyOn(hitTestDocument, 'caretRangeFromPoint').mockReturnValue(range);
    menu().handleContextMenu(new MouseEvent('contextmenu', { cancelable: true }));
    expect(window.getSelection()?.rangeCount).toBe(0);
  });
});
