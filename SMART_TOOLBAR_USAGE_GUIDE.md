# Smart Toolbar - Usage Guide for Developers

## Quick Start

The improved smart toolbar is automatically integrated. All existing code continues to work without changes.

## Using the Smart Toolbar

### Basic Usage (Already Working)

```typescript
import { useSmartToolbar } from "@/composables/useSmartToolbar";

export default {
  setup() {
    const toolbar = useSmartToolbar();

    return {
      context: toolbar.context,
      config: toolbar.config,
      isFloating: toolbar.isFloating,
      isSticky: toolbar.isSticky,
    };
  },
};
```

### Updated Context Behavior

The context automatically updates when selection changes:

```typescript
// In your editor component
const handleEditorChange = () => {
  toolbar.updateContext(editorElement);
  // Now toolbar.context reflects current selection
  // Including new 'mixed' context type for multiple selections
};
```

### New: Detecting Mixed Contexts

```typescript
import { useSmartToolbar } from "@/composables/useSmartToolbar";

export default {
  setup() {
    const toolbar = useSmartToolbar();

    // Watch for mixed selections
    const isMixedSelection = computed(() => toolbar.isMixedSelection.value);

    return {
      isMixedSelection,
      onShowMixedContextMenu() {
        if (isMixedSelection.value) {
          // Show options for all detected element types
          console.log("Multiple elements selected!");
        }
      },
    };
  },
};
```

### New: Getting Detailed Context Info

```typescript
// Debug or analyze what's selected
const detail = toolbar.getDetailedContext();

console.log({
  primaryContext: detail.primaryContext, // 'heading', 'image', etc.
  isMixed: detail.isMixed, // true if multiple types
  elementCount: detail.elementCount, // Number of elements found
  elementTypes: detail.elementTypes, // ['heading', 'text']
  cursorContext: detail.cursorContext, // Context at cursor
  detectedElements: detail.detectedElements, // Full element data
});
```

### New: Cursor-Specific Context

```typescript
// Get context at cursor position (separate from selection)
const cursorContext = toolbar.getCursorContext(editorElement);

if (cursorContext === "image") {
  showImageToolsPopover();
} else if (cursorContext === "table") {
  showTableToolsPopover();
}
```

## Context Types Explained

### Single Contexts

| Context     | When Triggered                | Toolbar Behavior          | Use Case              |
| ----------- | ----------------------------- | ------------------------- | --------------------- |
| `'empty'`   | No content or whitespace only | Basic tools only          | Clean slate           |
| `'text'`    | Regular paragraph text        | Full formatting           | General editing       |
| `'heading'` | Inside H1-H6                  | Full but heading-specific | Section titles        |
| `'list'`    | Inside UL, OL, or LI          | List-specific formatting  | Bullet/numbered lists |
| `'link'`    | Inside A element              | Link formatting tools     | URLs and references   |
| `'image'`   | Inside IMG or near image      | Alignment, sizing tools   | Image placement       |
| `'code'`    | Inside CODE or PRE            | Code-specific formatting  | Code snippets         |
| `'table'`   | Inside TABLE element          | Table tools enabled       | Table editing         |

### Mixed Context

| Context   | When Triggered                    | Toolbar Behavior  | Use Case           |
| --------- | --------------------------------- | ----------------- | ------------------ |
| `'mixed'` | Multiple different types selected | ALL tools enabled | Complex selections |

## Priority System

When multiple contexts are detected, the toolbar uses this priority:

```
1. image (highest priority) - 10 points
2. code - 9 points
3. table - 8 points
4. link - 7 points
5. list - 6 points
6. heading - 5 points
7. text (lowest priority) - 1 point
```

**Example:** User selects text from heading into a code block.

- Detected elements: [heading, code]
- Primary context: `'code'` (priority 9 > 5)
- isMixed: `true`
- Toolbar shows: Code-specific formatting with all tools available

## Configuration Per Context

### Toolbar Config Structure

```typescript
interface ToolbarConfig {
  format: boolean; // Bold, italic, underline
  textFormatting: boolean; // Font, size, color
  alignment: boolean; // Left, center, right align
  lists: boolean; // Bullet, numbered lists
  insert: boolean; // Insert elements menu
  colors: boolean; // Background, text colors
  link: boolean; // Link tools
  tools: boolean; // Code, quote, etc.
  view: boolean; // Preview, zoom, etc.
  export: boolean; // Export options
}
```

### Example: Image Context Config

```typescript
image: {
  format: false,              // Can't bold an image ✗
  textFormatting: false,      // Can't change font ✗
  alignment: true,            // Can align images ✓
  lists: false,               // Can't make image a list ✗
  insert: true,               // Can insert more content ✓
  colors: false,              // Images handle their own colors ✗
  link: true,                 // Images can have links ✓
  tools: true,               // Image tools available ✓
  view: true,                // Preview options ✓
  export: true               // Export with images ✓
}
```

### Example: Mixed Context Config

```typescript
mixed: {
  format: true,              // Enable all ✓
  textFormatting: true,
  alignment: true,
  lists: true,
  insert: true,
  colors: true,
  link: true,
  tools: true,
  view: true,
  export: true
}
```

## Real-World Scenarios

### Scenario 1: User Types in Paragraph

```
Editor Content:
┌─────────────────────┐
│ Some text here      │  ← Cursor at end
└─────────────────────┘

Context Detection:
primaryContext: 'text'
isMixed: false
cursorContext: 'text'

Toolbar Shows: ✓ All formatting options
```

### Scenario 2: User Selects Image

```
Editor Content:
┌─────────────────────┐
│ [IMAGE SELECTED]    │  ← Image selected
│ Caption below       │
└─────────────────────┘

Context Detection:
primaryContext: 'image'
isMixed: false
cursorContext: 'image'

Toolbar Shows: ✓ Alignment ✓ Sizing, ✗ Text formatting
```

### Scenario 3: User Selects Multiple Types

```
Editor Content:
┌─────────────────────┐
│ # Title             │
│ Start selection     │
│ [Selected region]   │
│ Code block          │
│ End selection       │
└─────────────────────┘

Context Detection:
primaryContext: 'heading'
isMixed: true
cursorContext: (depends on cursor position)
detectedElements: [heading, text, code]

Toolbar Shows: ✓ All tools enabled (mixed config)
Hint Shows: "📦 Multiple element types selected"
```

## Advanced: Custom Context Detection

### Extending with New Element Types

To add support for new HTML elements:

1. Add to `ContentContext` type:

```typescript
export type ContentContext =
  | "text"
  | "heading"
  | "list"
  | "link"
  | "image"
  | "table"
  | "code"
  | "empty"
  | "mixed"
  | "video"; // NEW!
```

2. Update `getElementContextType()`:

```typescript
function getElementContextType(element: HTMLElement | null): ContentContext {
  const tagName = element?.nodeName.toUpperCase();

  switch (tagName) {
    case "VIDEO":
      return "video"; // NEW!
    // ... existing cases
  }

  return "text";
}
```

3. Add priority:

```typescript
const PRIORITY: Record<ContentContext, number> = {
  video: 9.5, // NEW! Between code and table
  // ... existing priorities
};
```

4. Create config:

```typescript
const contextConfigs: Record<ContentContext, ToolbarConfig> = {
  video: {
    format: false,
    textFormatting: false,
    alignment: true,
    lists: false,
    insert: true,
    colors: false,
    link: false,
    tools: true,
    view: true,
    export: true,
  },
  // ... existing configs
};
```

### Modifying Priority System

If you want code to have higher priority than images:

```typescript
const PRIORITY: Record<ContentContext, number> = {
  code: 10, // Changed from 9 (highest now)
  image: 9, // Changed from 10
  // ... rest unchanged
};
```

Now code blocks will be primary in mixed selections over images.

## Troubleshooting

### Problem: Toolbar not updating on selection change

**Solution:** Make sure to call `updateContext()` after selection changes:

```typescript
editor.addEventListener("selection", () => {
  toolbar.updateContext(editor);
});
```

### Problem: isMixed always false

**Solution:** Check that you're using the new `detectMultipleContexts()`:

```typescript
// Wrong way (old function):
const context = toolbar.detectContext(editor);

// Right way (new function):
toolbar.updateContext(editor); // Uses new detectMultipleContexts internally
const isMixed = toolbar.isMixedSelection.value;
```

### Problem: Cursor context not updating

**Solution:** Ensure cursor is within the editor element:

```typescript
// Make sure selection is set
const selection = window.getSelection();
const range = selection.getRangeAt(0);
console.log("Cursor container:", range.endContainer);
console.log("Is in editor:", editor.contains(range.endContainer));
```

## Performance Tips

### Avoid Excessive Updates

```typescript
// ❌ BAD: Updates too frequently
editor.addEventListener("keydown", () => {
  toolbar.updateContext(editor);
});

// ✅ GOOD: Update on meaningful changes
editor.addEventListener("selection", () => {
  toolbar.updateContext(editor);
});

editor.addEventListener("paste", () => {
  toolbar.updateContext(editor);
});
```

### Cache Detailed Context

```typescript
// ❌ BAD: Calls getDetailedContext every render
computed(() => {
  return toolbar.getDetailedContext();
});

// ✅ GOOD: Cache or update on context change
const detailCache = ref(null);

watch(
  () => toolbar.context.value,
  () => {
    detailCache.value = toolbar.getDetailedContext();
  }
);
```

## Testing Mixed Contexts

### Unit Test Example

```typescript
import { describe, it, expect } from "vitest";
import { useSmartToolbar } from "@/composables/useSmartToolbar";

describe("Smart Toolbar - Mixed Contexts", () => {
  it("should detect mixed heading and text", () => {
    const toolbar = useSmartToolbar();
    const editor = createEditorWithContent(`
      <h1>Title</h1>
      <p>Paragraph</p>
    `);

    // Select from heading into paragraph
    selectRange(editor, fromHeading, toParagraph);
    toolbar.updateContext(editor);

    expect(toolbar.context.value).toBe("mixed");
    expect(toolbar.isMixedSelection.value).toBe(true);
    expect(toolbar.config.value.format).toBe(true);
  });
});
```

## Examples from Codebase

### FileManagerModal.vue - File Upload Context

```typescript
// When file upload is active, context is implicitly 'empty'
// because focus is on the modal, not the editor
toolbar.updateContext(editor); // Still works, just different context
```

### EmojiPicker.vue - Emoji Insert Context

```typescript
// Before inserting emoji, context might be 'text'
// Emoji gets inserted at current cursor context
toolbar.getCursorContext(editor); // Returns 'text' or other context
// Then inserts emoji in that context
```

### EditorToolbar.vue - Toolbar Visibility

```typescript
// Use mixed context to show all toolbar sections
if (toolbar.isMixedSelection.value) {
  return true  // Show all toolbar sections
}

// Otherwise use normal visibility logic
const config = toolbar.config.value
return config.format || config.textFormatting || ...
```

## Summary

The improved smart toolbar provides:

✅ **Automatic context detection** - Detects what's under cursor/selected
✅ **Multi-context support** - Handles mixed selections intelligently
✅ **Backward compatible** - All existing code continues to work
✅ **Well-typed** - Full TypeScript support with interfaces
✅ **Debuggable** - Detailed context info available
✅ **Extensible** - Easy to add new context types and priorities
✅ **Performant** - Optimized DOM traversal with deduplication

Use it to build smarter, more responsive editor toolbars!
