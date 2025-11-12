/**
 * Utilities for creating and managing embedded resizable content in the editor
 * Supports images, videos, and other embeddable content with resize and drag capabilities
 */

export interface EmbeddedContentOptions {
  type: "image" | "video" | "embed" | "file";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
  alignment?: "left" | "center" | "right";
}

/**
 * Create an embedded resizable container with content
 */
export function createEmbeddedResizable(
  options: EmbeddedContentOptions
): string {
  const {
    type,
    src,
    alt = "",
    width = 400,
    height = 300,
    maintainAspectRatio = true,
    alignment = "center",
  } = options;

  let contentHtml = "";

  // Generate content based on type
  switch (type) {
    case "image":
      contentHtml = `<img src="${src}" alt="${alt}" style="width: 100%; height: 100%; object-fit: contain;" />`;
      break;
    case "video":
      contentHtml = `<video src="${src}" controls style="width: 100%; height: 100%; object-fit: contain;"></video>`;
      break;
    case "embed":
      // Assume src is already HTML for embeds (like YouTube iframes)
      contentHtml = src;
      break;
    case "file":
      contentHtml = `<a href="${src}" download="${alt}" target="_blank" style="display: flex; align-items: center; justify-content: center; height: 100%; text-decoration: none; color: inherit;">
        <div style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 8px;">📎</div>
          <div style="font-weight: 600;">${alt || "Download File"}</div>
        </div>
      </a>`;
      break;
  }

  // Determine margin based on alignment
  let marginStyle = "margin: 16px auto;";
  if (alignment === "left") {
    marginStyle = "margin: 16px 0 16px 0;";
  } else if (alignment === "right") {
    marginStyle = "margin: 16px 0 16px auto;";
  }

  // Create the embedded resizable container
  return `<div 
    class="embedded-resizable-container" 
    data-type="${type}"
    data-src="${src}"
    data-width="${width}"
    data-height="${height}"
    data-maintain-aspect="${maintainAspectRatio}"
    data-alignment="${alignment}"
    style="
      position: relative;
      display: block;
      width: ${width}px;
      height: ${height}px;
      ${marginStyle}
      border: 2px solid transparent;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s ease;
      cursor: pointer;
    "
    contenteditable="false"
    tabindex="0"
  >
    ${contentHtml}
  </div>`;
}

/**
 * Insert embedded resizable content into the editor at the current selection
 */
export function insertEmbeddedResizable(options: EmbeddedContentOptions): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Create temporary container to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = createEmbeddedResizable(options);

  const embeddedElement = temp.firstElementChild;
  if (!embeddedElement) return;

  // Insert the embedded element
  range.insertNode(embeddedElement);

  // Add event listeners for interaction
  addEmbeddedInteractivity(embeddedElement as HTMLElement);

  // Move cursor after the embedded element
  range.setStartAfter(embeddedElement);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Add interactivity to an embedded element (selection, resize handles, etc.)
 */
function addEmbeddedInteractivity(element: HTMLElement): void {
  let isSelected = false;

  // Click to select
  element.addEventListener("click", (e) => {
    e.stopPropagation();
    isSelected = true;
    element.style.borderColor = "#667eea";
    element.style.boxShadow = "0 0 0 3px rgba(102, 126, 234, 0.2)";
    element.style.zIndex = "100";
  });

  // Deselect when clicking outside
  const handleDeselect = (e: MouseEvent) => {
    if (!element.contains(e.target as Node)) {
      isSelected = false;
      element.style.borderColor = "transparent";
      element.style.boxShadow = "none";
      element.style.zIndex = "auto";
    }
  };

  document.addEventListener("click", handleDeselect);

  // Keyboard support
  element.addEventListener("keydown", (e) => {
    if (!isSelected) return;

    const currentWidth = Number.parseInt(element.style.width || "400");
    const currentHeight = Number.parseInt(element.style.height || "300");

    switch (e.key) {
      case "Delete":
      case "Backspace":
        e.preventDefault();
        if (confirm("Delete this embedded content?")) {
          element.remove();
          document.removeEventListener("click", handleDeselect);
        }
        break;
      case "Escape":
        isSelected = false;
        element.style.borderColor = "transparent";
        element.style.boxShadow = "none";
        break;
      case "ArrowLeft":
        if (e.shiftKey) {
          e.preventDefault();
          element.style.width = `${Math.max(100, currentWidth - 10)}px`;
        }
        break;
      case "ArrowRight":
        if (e.shiftKey) {
          e.preventDefault();
          element.style.width = `${Math.min(1200, currentWidth + 10)}px`;
        }
        break;
      case "ArrowUp":
        if (e.shiftKey) {
          e.preventDefault();
          element.style.height = `${Math.max(100, currentHeight - 10)}px`;
        }
        break;
      case "ArrowDown":
        if (e.shiftKey) {
          e.preventDefault();
          element.style.height = `${Math.min(1200, currentHeight + 10)}px`;
        }
        break;
    }
  });

  // Hover effect
  element.addEventListener("mouseenter", () => {
    if (!isSelected) {
      element.style.borderColor = "rgba(102, 126, 234, 0.3)";
    }
  });

  element.addEventListener("mouseleave", () => {
    if (!isSelected) {
      element.style.borderColor = "transparent";
    }
  });
}

/**
 * Initialize all existing embedded elements in the editor
 */
export function initializeEmbeddedElements(root: HTMLElement): void {
  const embeddedElements = root.querySelectorAll(
    ".embedded-resizable-container"
  );
  embeddedElements.forEach((element) => {
    addEmbeddedInteractivity(element as HTMLElement);
  });
}

/**
 * Get embedded content dimensions from an element
 */
export function getEmbeddedDimensions(element: HTMLElement): {
  width: number;
  height: number;
} {
  return {
    width: Number.parseInt(element.dataset.width || "400"),
    height: Number.parseInt(element.dataset.height || "300"),
  };
}

/**
 * Update embedded content dimensions
 */
export function updateEmbeddedDimensions(
  element: HTMLElement,
  width: number,
  height: number
): void {
  element.dataset.width = width.toString();
  element.dataset.height = height.toString();
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
}
