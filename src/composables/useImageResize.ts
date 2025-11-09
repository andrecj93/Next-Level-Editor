import { ref, type Ref } from "vue";

interface ResizeData {
  wrapper: HTMLElement;
  img: HTMLImageElement;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  position: string;
}

/**
 * Composable for handling image resizing in the editor
 * Provides interactive image resize handles and functionality
 */
export function useImageResize(
  editorContent: Ref<HTMLDivElement | null>,
  onResizeComplete: () => void
) {
  const resizeData = ref<ResizeData | null>(null);

  /**
   * Setup image resizing functionality
   */
  const setupImageResizing = () => {
    if (!editorContent.value) return;

    editorContent.value.addEventListener("click", handleImageClick);
  };

  /**
   * Handle clicks on images to enable/disable resize mode
   */
  const clearAllImageSelections = () => {
    const selectedWrappers = editorContent.value?.querySelectorAll(
      ".editor-image-wrapper.selected"
    );
    if (selectedWrappers) {
      for (const el of selectedWrappers) {
        el.classList.remove("selected");
      }
    }
  };

  const addResizeHandles = (wrapper: Element) => {
    if (wrapper.querySelector(".image-resize-handle")) return;

    const handles = ["top-left", "top-right", "bottom-left", "bottom-right"];
    for (const position of handles) {
      const handle = document.createElement("div");
      handle.className = `image-resize-handle ${position}`;
      handle.addEventListener("mousedown", (e) =>
        startImageResize(e, wrapper as HTMLElement, position)
      );
      wrapper.appendChild(handle);
    }
  };

  const selectImageWrapper = (wrapper: Element) => {
    clearAllImageSelections();
    wrapper.classList.add("selected");
    addResizeHandles(wrapper);
  };

  const handleImageClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const isImageElement =
      target.classList.contains("editor-image-resizable") ||
      target.classList.contains("editor-image-wrapper");

    if (isImageElement) {
      const wrapper = target.classList.contains("editor-image-wrapper")
        ? target
        : target.closest(".editor-image-wrapper");

      if (wrapper) {
        selectImageWrapper(wrapper);
      }
    } else {
      clearAllImageSelections();
    }
  };

  /**
   * Start image resize operation
   */
  const startImageResize = (
    event: MouseEvent,
    wrapper: HTMLElement,
    position: string
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const img = wrapper.querySelector("img") as HTMLImageElement;
    if (!img) return;

    resizeData.value = {
      wrapper,
      img,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: img.offsetWidth,
      startHeight: img.offsetHeight,
      position,
    };

    document.addEventListener("mousemove", doImageResize);
    document.addEventListener("mouseup", stopImageResize);

    // Prevent text selection during resize
    document.body.style.userSelect = "none";
  };

  /**
   * Perform image resize
   */
  const doImageResize = (event: MouseEvent) => {
    if (!resizeData.value) return;

    const { img, startX, startY, startWidth, startHeight, position } =
      resizeData.value;

    let newWidth = startWidth;
    let newHeight = startHeight;

    if (position.includes("right")) {
      newWidth = startWidth + (event.clientX - startX);
    } else if (position.includes("left")) {
      newWidth = startWidth - (event.clientX - startX);
    }

    if (position.includes("bottom")) {
      newHeight = startHeight + (event.clientY - startY);
    } else if (position.includes("top")) {
      newHeight = startHeight - (event.clientY - startY);
    }

    // Maintain aspect ratio
    const aspectRatio = startWidth / startHeight;
    if (Math.abs(newWidth / newHeight - aspectRatio) > 0.1) {
      newHeight = newWidth / aspectRatio;
    }

    // Set minimum size
    if (newWidth > 50 && newHeight > 50) {
      img.style.width = `${newWidth}px`;
      img.style.height = `${newHeight}px`;
      img.style.maxWidth = "100%";
    }
  };

  /**
   * Stop image resize operation
   */
  const stopImageResize = () => {
    if (resizeData.value) {
      document.removeEventListener("mousemove", doImageResize);
      document.removeEventListener("mouseup", stopImageResize);
      document.body.style.userSelect = "";

      // Notify that resize is complete (for history capture)
      onResizeComplete();

      resizeData.value = null;
    }
  };

  /**
   * Cleanup event listeners
   */
  const cleanup = () => {
    if (editorContent.value) {
      editorContent.value.removeEventListener("click", handleImageClick);
    }
    document.removeEventListener("mousemove", doImageResize);
    document.removeEventListener("mouseup", stopImageResize);
  };

  return {
    setupImageResizing,
    cleanup,
  };
}
