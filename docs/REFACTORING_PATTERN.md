# NextLevelEditor Refactoring Pattern

## Overview

The NextLevelEditor.vue component was originally 4164 lines - far too large for a single file. This document describes the refactoring pattern being used to break it down into smaller, focused modules following separation of concerns principles.

## Problem

A 4164-line component violates several best practices:
- **Hard to maintain**: Too much code in one place
- **Poor testability**: Difficult to test individual features in isolation
- **Low reusability**: Features can't be easily reused in other components
- **Merge conflicts**: Multiple developers working on the same huge file
- **Cognitive load**: Too much context to keep in mind when making changes

## Solution: Composables Pattern

We're extracting logical sections into Vue 3 composables that:
1. Encapsulate related functionality
2. Can be independently tested
3. Can be reused across components
4. Have clear interfaces and dependencies

## Refactoring Pattern

### Step 1: Identify Logical Boundaries

Analyze the component and identify self-contained features:
- ✅ Slash commands (command menu)
- ⏳ Editor actions (formatting, insertion, etc.)
- ⏳ Toolbar configuration (dropdown items, button groups)
- ⏳ Context menu
- ⏳ History management

### Step 2: Create the Composable

Extract the feature into a composable function:

```typescript
// src/composables/useFeatureName.ts
export interface UseFeatureOptions {
  // Dependencies the composable needs
  dependency1: () => void
  dependency2: Ref<SomeType>
}

export function useFeature(options: UseFeatureOptions) {
  const { dependency1, dependency2 } = options
  
  // Internal state
  const internalState = ref(...)
  
  // Methods
  const method1 = () => { ... }
  const method2 = () => { ... }
  
  // Return public API
  return {
    internalState,
    method1,
    method2,
  }
}
```

### Step 3: Replace in Component

Replace the inline implementation with the composable:

**Before:**
```typescript
// 174 lines of slash command implementation
const showCommandMenu = ref(false)
const commandMenuPosition = ref({ top: 0, left: 0 })
const commandOptions = [ /* ... */ ]
const handleCommandOption = (option) => { /* ... */ }
// ... many more lines ...
```

**After:**
```typescript
// 20 lines using the composable
const {
  showCommandMenu,
  commandMenuPosition,
  commandOptions,
  handleCommandOption,
  // ... other exports
} = useSlashCommands({
  handleInlineAction,
  handleBlockAction,
  // ... dependencies
})
```

### Step 4: Test & Verify

1. Run unit tests: `npm test`
2. Run build: `npm run build`
3. Run linter: `npm run lint`
4. Manual testing if UI changes

## Success Metrics

### Slash Commands Refactoring Results

- **Before**: 174 lines inline in NextLevelEditor.vue
- **After**: 20 lines composable usage + 210 lines in dedicated file
- **Net Change**: 154 lines removed from main component
- **Overall**: 4164 → 3926 lines (5.7% reduction)
- **Tests**: All 609 tests still passing ✅

## Benefits Achieved

1. **Separation of Concerns**: Slash command logic is now isolated
2. **Better Testability**: Can test slash commands independently
3. **Reusability**: useSlashCommands can be used in other editors
4. **Maintainability**: Changes to slash commands only affect one file
5. **Type Safety**: Clear interfaces with TypeScript

## Next Steps

Apply the same pattern to:

1. **useEditorActions** (~540 lines)
   - All editor operation handlers
   - Modal state management
   - Format painter, exports, etc.

2. **useToolbarActions** (~360 lines)
   - Toolbar dropdown configurations
   - Button group definitions
   - Active state checking

3. **useContextMenu**
   - Context menu logic
   - Cut/copy/paste operations

4. **useHistoryManagement**
   - Undo/redo logic
   - History timeline

## Estimated Impact

If all planned extractions are completed:

- **Current**: 3926 lines
- **Estimated After**: ~2800 lines main component
- **Total Reduction**: ~29% smaller
- **Supporting Files**: ~1600 lines in focused composables

## Guidelines for Future Refactoring

1. **Make incremental changes**: One composable at a time
2. **Test after each change**: Ensure nothing breaks
3. **Document dependencies**: Clear interface contracts
4. **Keep it simple**: Don't over-engineer
5. **Preserve behavior**: Refactoring should not change functionality

## Example: Slash Commands

See the complete example in:
- Composable: `src/composables/useSlashCommands.ts`
- Usage: `src/components/NextLevelEditor.vue` (line ~2109)
- PR: This refactoring PR

## Conclusion

This pattern demonstrates how senior developers approach large-scale refactoring:
- **Incremental**: Small, focused changes
- **Tested**: Verified at each step
- **Clear**: Well-defined boundaries and interfaces
- **Pragmatic**: Balance between perfection and progress

The same pattern can be applied to any oversized component in any Vue 3 application.
