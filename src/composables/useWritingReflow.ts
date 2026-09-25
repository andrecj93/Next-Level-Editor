import { onScopeDispose, watch, type Ref } from 'vue';
import { preserveVisibleSelection } from '../utils/caretVisibility';

/** Keep the writer's visible line through width/height changes, without
 * pulling them back to a caret they deliberately scrolled away from. */
export function useWritingReflow(root: Ref<HTMLElement | null>, enabled: Ref<boolean>, options: {
  snapshot?: (element: HTMLElement) => () => void;
  hasFocus?: (element: HTMLElement) => boolean;
} = {}) {
  let release = () => {};
  let rememberCurrentPosition = () => {};
  watch([root, enabled], ([element, active]) => {
    release();
    release = () => {};
    rememberCurrentPosition = () => {};
    if (!element || !active || typeof ResizeObserver === 'undefined') return;
    const document = element.ownerDocument;
    const view = document.defaultView;
    if (!view) return;
    const size = () => `${element.clientWidth}:${element.clientHeight}`;
    let previousSize = size();
    const capture = () => options.snapshot?.(element) ?? preserveVisibleSelection(element, true);
    let restore = capture();
    // A deliberate navigation can reveal a new range before its resulting
    // scroll event arrives. Let that action replace the old snapshot now.
    rememberCurrentPosition = () => { restore = capture(); };
    let frame = 0;
    const remember = () => {
      // A resize can dispatch scroll/selection events before ResizeObserver.
      // Keep the snapshot from before reflow until the new layout settles.
      if (!frame && size() === previousSize) restore = capture();
    };
    const cancel = () => { restore = () => {}; };
    const observer = new ResizeObserver(() => {
      if (size() === previousSize) return;
      view.cancelAnimationFrame(frame);
      frame = view.requestAnimationFrame(() => {
        frame = 0;
        if (options.hasFocus?.(element) ?? document.activeElement === element) restore();
        previousSize = size();
        restore = capture();
      });
    });
    observer.observe(element);
    document.addEventListener('selectionchange', remember);
    document.addEventListener('scroll', remember, true);
    element.addEventListener('focus', remember);
    element.addEventListener('pointerdown', cancel);
    element.addEventListener('wheel', cancel, { passive: true });
    release = () => {
      observer.disconnect();
      view.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', remember);
      document.removeEventListener('scroll', remember, true);
      element.removeEventListener('focus', remember);
      element.removeEventListener('pointerdown', cancel);
      element.removeEventListener('wheel', cancel);
    };
  }, { immediate: true, flush: 'post' });
  onScopeDispose(() => release());
  return () => rememberCurrentPosition();
}
