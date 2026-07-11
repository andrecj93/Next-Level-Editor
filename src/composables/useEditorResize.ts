import { ref, computed, type ComputedRef, type CSSProperties } from "vue";

export interface UseEditorResizeOptions {
  /** Smallest width the editor may be dragged to (px). */
  minWidth?: number;
  /** Smallest height the editor may be dragged to (px). */
  minHeight?: number;
  /** Keyboard resize step (px per arrow press). */
  step?: number;
}

/**
 * Drives the corner resize grip: lets the user drag (or arrow-key) the editor
 * to a larger/smaller size. The chosen size is exposed as an inline style that
 * overrides the width/height props once the user has interacted; before that it
 * stays empty so the editor keeps its authored/CSS size.
 */
export function useEditorResize(options: UseEditorResizeOptions = {}) {
  const minWidth = options.minWidth ?? 320;
  const minHeight = options.minHeight ?? 240;
  const step = options.step ?? 32;

  // null = not yet resized → don't emit an inline override.
  const resizedWidth = ref<number | null>(null);
  const resizedHeight = ref<number | null>(null);
  const isResizing = ref(false);

  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const maxWidth = (): number =>
    typeof window !== "undefined" ? window.innerWidth - 24 : Number.MAX_SAFE_INTEGER;
  const maxHeight = (): number =>
    typeof window !== "undefined" ? window.innerHeight - 24 : Number.MAX_SAFE_INTEGER;

  const clampWidth = (value: number): number =>
    Math.max(minWidth, Math.min(value, maxWidth()));
  const clampHeight = (value: number): number =>
    Math.max(minHeight, Math.min(value, maxHeight()));

  const onPointerMove = (event: PointerEvent) => {
    if (!isResizing.value) return;
    resizedWidth.value = clampWidth(startWidth + (event.clientX - startX));
    resizedHeight.value = clampHeight(startHeight + (event.clientY - startY));
  };

  const endResize = () => {
    if (!isResizing.value) return;
    isResizing.value = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endResize);
    window.removeEventListener("pointercancel", endResize);
  };

  /**
   * Begin a drag-resize. `element` is the editor root, measured to seed the
   * starting size (so the first drag delta is relative to the real on-screen
   * box even when width/height come from CSS rather than a prop).
   */
  const beginResize = (event: PointerEvent, element: HTMLElement | null) => {
    if (!element || event.button !== 0) return;
    const rect = element.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    resizedWidth.value = clampWidth(rect.width);
    resizedHeight.value = clampHeight(rect.height);
    isResizing.value = true;

    (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endResize);
    window.addEventListener("pointercancel", endResize);
    event.preventDefault();
  };

  const nudge = (dx: number, dy: number, element: HTMLElement | null) => {
    const rect = element?.getBoundingClientRect();
    const baseWidth = resizedWidth.value ?? rect?.width ?? minWidth;
    const baseHeight = resizedHeight.value ?? rect?.height ?? minHeight;
    resizedWidth.value = clampWidth(baseWidth + dx);
    resizedHeight.value = clampHeight(baseHeight + dy);
  };

  /** Keyboard resize on the focused grip (arrow keys), for non-mouse users. */
  const onHandleKeydown = (event: KeyboardEvent, element: HTMLElement | null) => {
    switch (event.key) {
      case "ArrowRight":
        nudge(step, 0, element);
        break;
      case "ArrowLeft":
        nudge(-step, 0, element);
        break;
      case "ArrowDown":
        nudge(0, step, element);
        break;
      case "ArrowUp":
        nudge(0, -step, element);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  /** Forget the manual size and fall back to the authored/CSS size. */
  const resetSize = () => {
    resizedWidth.value = null;
    resizedHeight.value = null;
  };

  const resizeStyles: ComputedRef<CSSProperties> = computed(() => {
    const styles: CSSProperties = {};
    if (resizedWidth.value != null) styles.width = `${Math.round(resizedWidth.value)}px`;
    if (resizedHeight.value != null) styles.height = `${Math.round(resizedHeight.value)}px`;
    return styles;
  });

  return {
    resizedWidth,
    resizedHeight,
    isResizing,
    resizeStyles,
    beginResize,
    endResize,
    onHandleKeydown,
    resetSize,
  };
}
