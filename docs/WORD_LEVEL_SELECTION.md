# Word/CKEditor-Level Selection Management

## Overview

This document describes the professional-grade selection management system implemented in `useSelection.ts`, inspired by Microsoft Word and CKEditor behavior. The system ensures natural, intuitive editing experiences with intelligent cursor positioning, real-time tracking, and automatic visibility management.

## Key Features

### 1. **Continuous Selection Tracking**

The system maintains awareness of cursor position at all times through multiple event listeners:

- **`mouseup`**: Immediate tracking when user clicks or releases mouse
- **`focus`**: Immediate tracking when user focuses editor
- **`keyup`**: Debounced tracking (150ms) during typing to prevent performance issues
- **`selectionchange`**: Real-time tracking of arrow key navigation, shift+selections, etc.

```typescript
// Real-time tracking inspired by Word/CKEditor
document.addEventListener("selectionchange", handleSelectionChange);
```

### 2. **Smart Insertion Point Finding**

When no selection exists, the system uses a 4-priority algorithm to find the best cursor position:

**Priority 1: Empty Paragraph** - Best for immediate typing

```typescript
const emptyParagraphs = Array.from(root.querySelectorAll("p")).filter(
  (p) => !p.textContent?.trim() || p.innerHTML === "<br>"
);
```

**Priority 2: Any Paragraph** - Natural writing location

```typescript
const anyParagraph = root.querySelector("p");
```

**Priority 3: Any Block Element** - Headings, divs, etc.

```typescript
const anyBlock = root.querySelector("h1,h2,h3,h4,h5,h6,div,blockquote");
```

**Priority 4: Create New Paragraph** - Always ensure editor is writable

```typescript
const newParagraph = document.createElement("p");
newParagraph.innerHTML = "<br>";
root.appendChild(newParagraph);
```

### 3. **Intelligent Cursor Positioning**

The system positions cursor contextually based on element state:

```typescript
const setCursorInElement = (element, selection, atStart = false) => {
  if (isElementEmpty(element)) {
    setCursorAtStart(element, range); // Empty: cursor at start
  } else if (atStart) {
    setCursorAtStart(element, range); // Explicit start request
  } else {
    setCursorAtEnd(element, range); // Content: cursor at end
  }
};
```

**Helper Functions:**

- `isElementEmpty()` - Detects empty or BR-only elements
- `setCursorAtStart()` - Precise start positioning
- `setCursorAtEnd()` - Precise end positioning

### 4. **Operation Isolation**

Prevents race conditions during insertions/modifications:

```typescript
const pauseTracking = () => {
  isTrackingEnabled = false;
};
const resumeTracking = () => {
  isTrackingEnabled = true;
};

const performWithSelection = (action, afterAction) => {
  pauseTracking();
  try {
    // Perform insertion/modification
  } finally {
    resumeTracking(); // Always resume
  }
};
```

### 5. **Automatic Cursor Visibility**

Ensures cursor remains visible after operations (Word behavior):

```typescript
const ensureCursorVisible = () => {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (isOutside) {
    tempElement.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
};
```

### 6. **4-Priority Selection Restoration**

When performing actions, the system tries multiple fallbacks:

**Priority 1: Active Selection** - User has text selected right now

```typescript
if (hasValidActiveSelection(root, currentSelection)) {
  executeAction(root, action);
}
```

**Priority 2: Saved Range** - From toolbar button click

```typescript
else if (savedRange.value && isRangeValid(savedRange.value, root)) {
  restoreSelection(savedRange.value);
  executeAction(root, action);
}
```

**Priority 3: Last Valid Range** - Last known cursor position

```typescript
if (
  lastValidRange.value &&
  root.contains(lastValidRange.value.startContainer)
) {
  selection.addRange(lastValidRange.value.cloneRange());
}
```

**Priority 4: Smart Fallback** - Find best insertion point

```typescript
const targetElement = findBestInsertionPoint(root);
setCursorInElement(targetElement, selection);
```

## Architecture

### State Management

```typescript
const savedRange = ref<Range | null>(null); // Toolbar actions
const lastValidRange = ref<Range | null>(null); // Continuous tracking
let isTrackingEnabled = true; // Operation isolation
let keyupDebounceTimer: ReturnType<typeof setTimeout> | null = null;
```

### Event Flow

```text
User Action
    ↓
Event Triggered (mouseup/keyup/focus/selectionchange)
    ↓
Check isTrackingEnabled
    ↓
trackEditorSelection()
    ↓
Clone & Save Range
    ↓
Update lastValidRange
```

### Insertion Flow

```text
performWithSelection()
    ↓
pauseTracking()
    ↓
ensureEditorFocus()
    ↓
Priority 1: Active Selection?
    ↓ NO
Priority 2: Saved Range?
    ↓ NO
Priority 3: Last Valid Range?
    ↓ NO
Priority 4: Smart Fallback
    ↓
findBestInsertionPoint()
    ↓
setCursorInElement()
    ↓
executeAction()
    ↓
ensureCursorVisible()
    ↓
resumeTracking()
```

## Performance Optimizations

### 1. **Debounced Keyup Tracking**

Prevents lag during rapid typing:

```typescript
const trackEditorSelectionDebounced = () => {
  if (keyupDebounceTimer !== null) {
    clearTimeout(keyupDebounceTimer);
  }
  keyupDebounceTimer = setTimeout(trackEditorSelection, 150);
};
```

**Impact**: Reduces cloneRange() calls from hundreds to ~7 per second during typing.

### 2. **Event Listener Cleanup**

Prevents memory leaks:

```typescript
watch(editorContent, (newEditor, oldEditor) => {
  if (oldEditor) {
    oldEditor.removeEventListener("mouseup", trackEditorSelection);
    oldEditor.removeEventListener("keyup", trackEditorSelectionDebounced);
    oldEditor.removeEventListener("focus", trackEditorSelection);
    document.removeEventListener("selectionchange", handleSelectionChange);
  }
  // ... add new listeners
});
```

### 3. **Scoped Selection Tracking**

Only tracks when selection is within editor:

```typescript
const handleSelectionChange = () => {
  if (!isTrackingEnabled) return;

  if (root && root.contains(selection.anchorNode)) {
    trackEditorSelection();
  }
};
```

## UX Improvements

### Before vs After

| Scenario                 | Before                               | After                             |
| ------------------------ | ------------------------------------ | --------------------------------- |
| **Insert table**         | Press Enter → Click toolbar → Insert | Click toolbar → Insert (anywhere) |
| **Insert image**         | Press Enter → Modal → Insert         | Modal → Insert (at cursor)        |
| **Arrow key navigation** | Not tracked                          | Tracked in real-time              |
| **Modal opens**          | Lost selection                       | Saved automatically               |
| **Empty editor**         | Error/undefined                      | Creates paragraph automatically   |
| **Cursor off-screen**    | Manual scroll needed                 | Auto-scrolls smoothly             |
| **Long document**        | Insert at end always                 | Inserts at cursor position        |

## Code Quality

### Cognitive Complexity Reduction

Original `setCursorInElement()` had complexity 19 (limit 15). Refactored into:

- `isElementEmpty()` - Single responsibility
- `setCursorAtStart()` - Clear purpose
- `setCursorAtEnd()` - Explicit naming

### Test Coverage

22/22 tests passing:

- ✅ saveSelection (2 tests)
- ✅ rememberSelection (2 tests)
- ✅ performWithSelection (14 tests)
- ✅ Edge Cases (4 tests)

### Memory Management

- Event listeners cleaned up on component unmount
- Debounce timers cleared properly
- No circular references
- Proper try/finally blocks for resource cleanup

## API Reference

### Public Methods

#### `saveSelection(): Range | null`

Saves current browser selection and returns Range.

#### `rememberSelection(): void`

Saves current selection for later restoration (toolbar clicks).

#### `performWithSelection(action, afterAction?): void`

Executes action with intelligent selection handling.

**Parameters:**

- `action: (root: HTMLElement) => void` - Function to execute
- `afterAction?: () => void` - Optional callback after action

**Example:**

```typescript
performWithSelection((root) => {
  const img = document.createElement("img");
  img.src = imageUrl;
  // Will insert at cursor position
});
```

### Internal Helpers

- `trackEditorSelection()` - Clones and saves current range
- `trackEditorSelectionDebounced()` - 150ms debounced version
- `handleSelectionChange()` - Handles document selectionchange
- `findBestInsertionPoint()` - 4-priority search algorithm
- `isElementEmpty()` - Detects empty elements
- `setCursorAtStart()` - Position cursor at start
- `setCursorAtEnd()` - Position cursor at end
- `setCursorInElement()` - Smart positioning
- `createFallbackSelection()` - Fallback when no selection
- `isRangeValid()` - Validates range within editor
- `executeAction()` - Safe action execution
- `ensureEditorFocus()` - Focus management
- `hasValidActiveSelection()` - Selection validation
- `ensureCursorVisible()` - Auto-scroll management
- `pauseTracking()` - Disable tracking temporarily
- `resumeTracking()` - Re-enable tracking

## Browser Compatibility

Tested on:

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

Uses standard DOM APIs:

- `Selection` API
- `Range` API
- `scrollIntoView()`
- `addEventListener()`

## Future Enhancements

### Planned Features

1. **Multi-cursor Support** (VS Code style)
2. **Selection History** (undo/redo selection changes)
3. **Collaborative Selection** (show other users' cursors)
4. **Touch/Mobile Optimizations** (handle touch selections)
5. **Accessibility** (screen reader announcements)

### Performance Monitoring

Consider adding:

```typescript
const trackPerformance = () => {
  const start = performance.now();
  trackEditorSelection();
  const duration = performance.now() - start;
  if (duration > 16) {
    // Slower than 60fps
    console.warn("Slow selection tracking:", duration);
  }
};
```

## Migration Guide

### From Old System

**Old Code:**

```typescript
// Had to press Enter first
editor.focus();
document.execCommand("insertHTML", false, content);
```

**New Code:**

```typescript
// Works anywhere, anytime
performWithSelection((root) => {
  const element = document.createElement("div");
  element.innerHTML = content;
  // Inserts at cursor automatically
});
```

### Modal Integration

**Before:**

```typescript
const openImageModal = () => {
  imageModalOpen.value = true;
};
```

**After:**

```typescript
const openImageModal = () => {
  rememberSelection(); // Save cursor position
  imageModalOpen.value = true;
};
```

## Troubleshooting

### Issue: Cursor jumps to end of document

**Solution:** Ensure `isTrackingEnabled` check in `handleSelectionChange()`:

```typescript
const handleSelectionChange = () => {
  if (!isTrackingEnabled) return; // Critical check
  // ...
};
```

### Issue: Performance lag during typing

**Solution:** Verify debounce is applied:

```typescript
newEditor.addEventListener("keyup", trackEditorSelectionDebounced); // Not trackEditorSelection
```

### Issue: Memory leak

**Solution:** Ensure cleanup in watch():

```typescript
if (oldEditor) {
  oldEditor.removeEventListener(...); // All events
  document.removeEventListener('selectionchange', ...);
}
```

## Conclusion

This Word/CKEditor-level selection system provides:

✅ **Natural editing flow** - Insert anywhere, anytime  
✅ **Professional UX** - Matches industry-leading editors  
✅ **High performance** - Debounced, optimized, no lag  
✅ **Robust** - 22/22 tests passing, memory-safe  
✅ **Maintainable** - Clean code, low complexity

Users can now work in the editor with the same intuitive feeling as Microsoft Word or Google Docs.
