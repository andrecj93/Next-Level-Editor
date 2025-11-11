import { ref, type Ref, watch } from "vue";
import {
  saveSelection as saveSelectionUtil,
  restoreSelection,
} from "../utils/formatting";

export function useSelection(editorContent: Ref<HTMLElement | null>) {
  const savedRange = ref<Range | null>(null);
  const lastValidRange = ref<Range | null>(null); // Track last known good position
  let keyupDebounceTimer: number | null = null;
  let isTrackingEnabled = true; // Flag to temporarily disable tracking during operations

  const saveSelection = () => {
    return saveSelectionUtil();
  };

  const rememberSelection = () => {
    const range = saveSelection();
    savedRange.value = range;
    // Also update last valid range if we got a good selection
    if (range) {
      lastValidRange.value = range;
    }
  };

  /**
   * Temporarily disable selection tracking
   * Used during complex operations to avoid race conditions
   */
  const pauseTracking = () => {
    isTrackingEnabled = false;
  };

  /**
   * Re-enable selection tracking
   */
  const resumeTracking = () => {
    isTrackingEnabled = true;
    // Immediately track current selection when resuming
    trackEditorSelection();
  };

  /**
   * Track selection changes in the editor to always have a fallback
   * Called immediately on mouseup/focus, debounced on keyup for performance
   * Respects isTrackingEnabled flag to avoid interference during operations
   */
  const trackEditorSelection = () => {
    if (!isTrackingEnabled) return; // Skip if tracking is paused

    const root = editorContent.value;
    if (!root) return;

    const selection = globalThis.getSelection();
    if (
      selection &&
      selection.rangeCount > 0 &&
      root.contains(selection.anchorNode)
    ) {
      const range = selection.getRangeAt(0);
      lastValidRange.value = range.cloneRange();
    }
  };

  /**
   * Debounced version of trackEditorSelection for keyup events
   * Prevents excessive cloneRange() calls during rapid typing
   */
  const trackEditorSelectionDebounced = () => {
    if (keyupDebounceTimer !== null) {
      clearTimeout(keyupDebounceTimer);
    }
    keyupDebounceTimer = window.setTimeout(() => {
      trackEditorSelection();
      keyupDebounceTimer = null;
    }, 150); // 150ms debounce - good balance between responsiveness and performance
  };

  /**
   * Handle selectionchange event for real-time cursor tracking
   * Word/CKEditor behavior: track every selection change instantly
   * This captures arrow key navigation, shift+arrow selections, etc.
   */
  const handleSelectionChange = () => {
    if (!isTrackingEnabled) return;

    const selection = globalThis.getSelection();
    const root = editorContent.value;

    // Only track if selection is within our editor
    if (
      selection &&
      selection.rangeCount > 0 &&
      root &&
      selection.anchorNode &&
      root.contains(selection.anchorNode)
    ) {
      trackEditorSelection();
    }
  };

  // Watch for editor content changes and track selection
  watch(
    editorContent,
    (newEditor, oldEditor) => {
      // Cleanup old listeners to prevent memory leaks
      if (oldEditor) {
        oldEditor.removeEventListener("mouseup", trackEditorSelection);
        oldEditor.removeEventListener("keyup", trackEditorSelectionDebounced);
        oldEditor.removeEventListener("focus", trackEditorSelection);
        document.removeEventListener("selectionchange", handleSelectionChange);
      }

      // Clear any pending debounce timer
      if (keyupDebounceTimer !== null) {
        clearTimeout(keyupDebounceTimer);
        keyupDebounceTimer = null;
      }

      // Add new listeners
      if (newEditor) {
        // Listen to selection changes
        // mouseup/focus: immediate tracking (user clicked/focused)
        newEditor.addEventListener("mouseup", trackEditorSelection);
        newEditor.addEventListener("focus", trackEditorSelection);
        // keyup: debounced tracking (prevent lag during rapid typing)
        newEditor.addEventListener("keyup", trackEditorSelectionDebounced);
        // selectionchange: real-time tracking (arrow keys, etc.) - Word/CKEditor behavior
        document.addEventListener("selectionchange", handleSelectionChange);
      }
    },
    { immediate: true }
  );

  /**
   * Find the best insertion point in the editor
   * Inspired by Word/CKEditor behavior - finds closest writable location
   */
  const findBestInsertionPoint = (root: HTMLElement): HTMLElement => {
    // Priority 1: Find an empty paragraph
    const emptyParagraphs = Array.from(root.querySelectorAll("p")).filter(
      (p) => !p.textContent?.trim() || p.innerHTML === "<br>"
    );
    if (emptyParagraphs.length > 0) {
      return emptyParagraphs[0];
    }

    // Priority 2: Find any paragraph
    const anyParagraph = root.querySelector("p");
    if (anyParagraph) {
      return anyParagraph;
    }

    // Priority 3: Find any block element
    const blockElements = "div,h1,h2,h3,h4,h5,h6,li,blockquote,pre";
    const anyBlock = root.querySelector(blockElements);
    if (anyBlock instanceof HTMLElement) {
      return anyBlock;
    }

    // Priority 4: Create a fresh paragraph
    const newParagraph = document.createElement("p");
    newParagraph.innerHTML = "<br>";
    if (root.firstChild) {
      root.insertBefore(newParagraph, root.firstChild);
    } else {
      root.appendChild(newParagraph);
    }
    return newParagraph;
  };

  /**
   * Check if element is empty or has only <br>
   */
  const isElementEmpty = (element: HTMLElement): boolean => {
    return (
      !element.textContent?.trim() ||
      (element.childNodes.length === 1 && element.firstChild?.nodeName === "BR")
    );
  };

  /**
   * Set cursor at start of element
   */
  const setCursorAtStart = (element: HTMLElement, range: Range) => {
    const firstNode = element.firstChild;
    if (firstNode?.nodeType === Node.TEXT_NODE) {
      range.setStart(firstNode, 0);
    } else if (firstNode) {
      range.setStartBefore(firstNode);
    } else {
      range.setStart(element, 0);
    }
  };

  /**
   * Set cursor at end of element
   */
  const setCursorAtEnd = (element: HTMLElement, range: Range) => {
    const lastNode = element.lastChild;
    if (lastNode?.nodeType === Node.TEXT_NODE) {
      range.setStart(lastNode, lastNode.textContent?.length || 0);
    } else if (lastNode?.nodeName === "BR") {
      range.setStartBefore(lastNode);
    } else if (lastNode) {
      range.setStartAfter(lastNode);
    } else {
      range.setStart(element, 0);
    }
  };

  /**
   * Set cursor position inside an element
   * Smart positioning: empty elements get cursor at start, others at end
   */
  const setCursorInElement = (
    element: HTMLElement,
    selection: Selection,
    atStart = false
  ) => {
    const range = document.createRange();

    if (isElementEmpty(element)) {
      range.setStart(element, 0);
    } else if (atStart) {
      setCursorAtStart(element, range);
    } else {
      setCursorAtEnd(element, range);
    }

    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    return range;
  };

  /**
   * Creates a smart fallback selection using Word/CKEditor-inspired logic:
   * 1. Last valid cursor position if available and valid
   * 2. Find best insertion point (empty paragraph → any paragraph → any block → create new)
   * 3. Smart cursor positioning (empty=start, content=end)
   * 4. Always ensures editor is writable and ready
   */
  const createFallbackSelection = (root: HTMLElement) => {
    const selection = globalThis.getSelection();
    if (!selection) return;

    pauseTracking(); // Prevent interference during setup

    try {
      // Priority 1: Try to use last valid range first
      if (
        lastValidRange.value &&
        root.contains(lastValidRange.value.startContainer)
      ) {
        try {
          selection.removeAllRanges();
          selection.addRange(lastValidRange.value.cloneRange());
          return;
        } catch (error) {
          console.warn("Could not restore last valid range", error);
        }
      }

      // Priority 2: Find best insertion point
      const targetElement = findBestInsertionPoint(root);

      // Priority 3: Set cursor with smart positioning
      const range = setCursorInElement(targetElement, selection);

      // Update last valid range
      lastValidRange.value = range.cloneRange();
    } finally {
      // Always resume tracking
      resumeTracking();
    }
  };

  /**
   * Check if saved range is still valid
   */
  const isRangeValid = (range: Range, root: HTMLElement): boolean => {
    return Boolean(range.startContainer && root.contains(range.startContainer));
  };

  /**
   * Execute action with current or restored selection
   */
  const executeAction = (
    root: HTMLElement,
    action: (root: HTMLElement) => void
  ) => {
    try {
      action(root);
    } catch (error) {
      console.warn("Action execution failed", error);
    }
  };

  /**
   * Ensure cursor is visible in viewport
   * Word/CKEditor behavior: auto-scroll to keep cursor visible
   */
  const ensureCursorVisible = () => {
    const selection = globalThis.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Check if cursor is outside viewport
      const isOutside =
        rect.top < 0 ||
        rect.bottom > window.innerHeight ||
        rect.left < 0 ||
        rect.right > window.innerWidth;

      if (isOutside) {
        // Create a temporary element at cursor position for scrolling
        const tempElement = document.createElement("span");
        tempElement.style.position = "absolute";
        range.insertNode(tempElement);

        // Scroll to element with smooth behavior
        tempElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });

        // Remove temporary element
        tempElement.remove();
      }
    } catch (error) {
      // Silently fail if something goes wrong
      console.debug("Could not ensure cursor visibility", error);
    }
  };

  /**
   * Ensure editor has focus before operations
   * Returns true if focus was changed
   */
  const ensureEditorFocus = (root: HTMLElement): boolean => {
    if (document.activeElement !== root) {
      root.focus();
      return true;
    }
    return false;
  };

  /**
   * Check if current selection is active and valid in editor
   */
  const hasValidActiveSelection = (
    root: HTMLElement,
    selection: Selection | null
  ): boolean => {
    return Boolean(
      selection &&
        selection.rangeCount > 0 &&
        selection.anchorNode &&
        root.contains(selection.anchorNode)
    );
  };

  /**
   * Performs an action with proper selection handling
   * Word/CKEditor-inspired behavior:
   * 1. Active selection in editor (user is actively selecting text)
   * 2. Saved range from remembered selection (clicked toolbar button)
   * 3. Last valid range (last known cursor position)
   * 4. Smart fallback (find best insertion point or create one)
   *
   * Ensures editor is always ready to insert/modify content naturally
   */
  const performWithSelection = (
    action: (root: HTMLElement) => void,
    afterAction?: () => void
  ) => {
    const root = editorContent.value;
    if (!root) return;

    // Pause tracking during operation to avoid race conditions
    pauseTracking();

    try {
      // Ensure editor has focus first (synchronous in contenteditable)
      ensureEditorFocus(root);

      // Check if there's currently an active selection in the editor
      const currentSelection = globalThis.getSelection();
      const hasActiveSelection = hasValidActiveSelection(
        root,
        currentSelection
      );

      // Priority 1: Use active selection
      if (hasActiveSelection) {
        executeAction(root, action);
      }
      // Priority 2: Restore saved range
      else if (savedRange.value && isRangeValid(savedRange.value, root)) {
        restoreSelection(savedRange.value);
        executeAction(root, action);
      }
      // Priority 3 & 4: Smart fallback
      else {
        createFallbackSelection(root);
        executeAction(root, action);
      }

      // Update both saved and last valid ranges after action
      const newRange = saveSelection();
      savedRange.value = newRange;
      if (newRange) {
        lastValidRange.value = newRange;
      }

      // Ensure cursor is visible after action (Word/CKEditor behavior)
      ensureCursorVisible();

      // Execute after action callback if provided
      if (afterAction) {
        afterAction();
      }
    } finally {
      // Always resume tracking after operation
      resumeTracking();
    }
  };

  return {
    saveSelection,
    rememberSelection,
    performWithSelection,
  };
}
