import { ref, onScopeDispose, type Ref } from "vue";

export interface DraggableOptions {
  containerRef: Ref<HTMLElement | null>;
  onMove?: (position: { x: number; y: number }) => void;
}

export interface DraggableReturn {
  isDragging: Ref<boolean>;
  startDrag: (event: MouseEvent | TouchEvent) => void;
}

/**
 * Composable for making an element draggable
 * Supports mouse and touch events
 */
export function useDraggable(options: DraggableOptions): DraggableReturn {
  const { containerRef, onMove } = options;

  const isDragging = ref(false);

  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const startDrag = (event: MouseEvent | TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!containerRef.value) return;

    isDragging.value = true;

    const touch = "touches" in event ? event.touches[0] : event;
    startX = touch.clientX;
    startY = touch.clientY;

    // Get initial position
    const rect = containerRef.value.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Make element position absolute for dragging
    const parent = containerRef.value.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      containerRef.value.style.position = "absolute";
      containerRef.value.style.left = `${rect.left - parentRect.left}px`;
      containerRef.value.style.top = `${rect.top - parentRect.top}px`;
    }

    // Add event listeners
    if ("touches" in event) {
      document.addEventListener("touchmove", handleDrag);
      document.addEventListener("touchend", stopDrag);
    } else {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", stopDrag);
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !containerRef.value) return;

    const touch = "touches" in event ? event.touches[0] : event;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    const parent = containerRef.value.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const newLeft = initialLeft - parentRect.left + deltaX;
      const newTop = initialTop - parentRect.top + deltaY;

      containerRef.value.style.left = `${newLeft}px`;
      containerRef.value.style.top = `${newTop}px`;

      if (onMove) {
        onMove({ x: newLeft, y: newTop });
      }
    }
  };

  const stopDrag = () => {
    isDragging.value = false;

    document.removeEventListener("mousemove", handleDrag);
    document.removeEventListener("mouseup", stopDrag);
    document.removeEventListener("touchmove", handleDrag);
    document.removeEventListener("touchend", stopDrag);
  };

  // Clean up if the owner unmounts MID-gesture — otherwise the document
  // mousemove/mouseup listeners (and their closures over the removed element)
  // leak and isDragging stays stuck true.
  onScopeDispose(stopDrag);

  return {
    isDragging,
    startDrag,
  };
}
