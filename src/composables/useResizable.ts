import { ref, type Ref } from "vue";

export interface ResizableOptions {
  containerRef: Ref<HTMLElement | null>;
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  maintainAspectRatio: boolean;
  onResize?: (dimensions: { width: number; height: number }) => void;
}

export interface ResizableReturn {
  currentWidth: Ref<number>;
  currentHeight: Ref<number>;
  isResizing: Ref<boolean>;
  startResize: (event: MouseEvent | TouchEvent, handle: string) => void;
  resetSize: () => void;
}

/**
 * Composable for making an element resizable
 * Supports mouse and touch events with aspect ratio preservation
 */
export function useResizable(options: ResizableOptions): ResizableReturn {
  const {
    initialWidth,
    initialHeight,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    maintainAspectRatio,
    onResize,
  } = options;

  const currentWidth = ref(initialWidth);
  const currentHeight = ref(initialHeight);
  const isResizing = ref(false);

  const aspectRatio = initialWidth / initialHeight;

  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let currentHandle = "";

  const startResize = (event: MouseEvent | TouchEvent, handle: string) => {
    event.preventDefault();
    event.stopPropagation();

    isResizing.value = true;
    currentHandle = handle;

    const touch = "touches" in event ? event.touches[0] : event;
    startX = touch.clientX;
    startY = touch.clientY;
    startWidth = currentWidth.value;
    startHeight = currentHeight.value;

    // Add event listeners
    if ("touches" in event) {
      document.addEventListener("touchmove", handleResize);
      document.addEventListener("touchend", stopResize);
    } else {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }
  };

  const handleResize = (event: MouseEvent | TouchEvent) => {
    if (!isResizing.value) return;

    const touch = "touches" in event ? event.touches[0] : event;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Calculate new dimensions based on handle
    switch (currentHandle) {
      case "e":
        newWidth = startWidth + deltaX;
        break;
      case "w":
        newWidth = startWidth - deltaX;
        break;
      case "s":
        newHeight = startHeight + deltaY;
        break;
      case "n":
        newHeight = startHeight - deltaY;
        break;
      case "se":
        newWidth = startWidth + deltaX;
        newHeight = startHeight + deltaY;
        break;
      case "sw":
        newWidth = startWidth - deltaX;
        newHeight = startHeight + deltaY;
        break;
      case "ne":
        newWidth = startWidth + deltaX;
        newHeight = startHeight - deltaY;
        break;
      case "nw":
        newWidth = startWidth - deltaX;
        newHeight = startHeight - deltaY;
        break;
    }

    // Apply aspect ratio constraint
    if (maintainAspectRatio) {
      if (currentHandle.includes("e") || currentHandle.includes("w")) {
        newHeight = newWidth / aspectRatio;
      } else if (currentHandle.includes("n") || currentHandle.includes("s")) {
        newWidth = newHeight * aspectRatio;
      } else {
        // Corner handles - use width to calculate height
        newHeight = newWidth / aspectRatio;
      }
    }

    // Apply min/max constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Re-apply aspect ratio after constraints
    if (maintainAspectRatio) {
      if (newWidth === minWidth || newWidth === maxWidth) {
        newHeight = newWidth / aspectRatio;
      }
      if (newHeight === minHeight || newHeight === maxHeight) {
        newWidth = newHeight * aspectRatio;
      }
    }

    currentWidth.value = newWidth;
    currentHeight.value = newHeight;

    if (onResize) {
      onResize({ width: newWidth, height: newHeight });
    }
  };

  const stopResize = () => {
    isResizing.value = false;
    currentHandle = "";

    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", stopResize);
    document.removeEventListener("touchmove", handleResize);
    document.removeEventListener("touchend", stopResize);
  };

  const resetSize = () => {
    currentWidth.value = initialWidth;
    currentHeight.value = initialHeight;

    if (onResize) {
      onResize({ width: initialWidth, height: initialHeight });
    }
  };

  return {
    currentWidth,
    currentHeight,
    isResizing,
    startResize,
    resetSize,
  };
}
