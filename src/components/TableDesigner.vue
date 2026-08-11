<template>
  <!-- A labelled GROUP, deliberately not `menu`/`toolbar`: those carry a
       WAI-ARIA keyboard contract (menuitem children, arrow navigation, roving
       tabindex) that this panel does not implement — declaring one without it
       is the very defect R23-23/24 report elsewhere. tabindex="-1" so opening
       can move focus here. #R23-29 -->
  <div
    v-if="show"
    ref="panelRef"
    class="table-designer"
    role="group"
    aria-label="Table actions"
    tabindex="-1"
    :style="position"
  >
    <div class="designer-controls">
      <button
        class="control-btn"
        title="Add row above"
        aria-label="Add row above"
        @click="$emit('add-row-above')"
      >
        <span class="icon" aria-hidden="true">⬆</span>
        <span class="label">Row Above</span>
      </button>
      <button
        class="control-btn"
        title="Add row below"
        aria-label="Add row below"
        @click="$emit('add-row-below')"
      >
        <span class="icon" aria-hidden="true">⬇</span>
        <span class="label">Row Below</span>
      </button>
      <button
        class="control-btn"
        title="Add column left"
        aria-label="Add column left"
        @click="$emit('add-column-left')"
      >
        <span class="icon" aria-hidden="true">⬅</span>
        <span class="label">Column Left</span>
      </button>
      <button
        class="control-btn"
        title="Add column right"
        aria-label="Add column right"
        @click="$emit('add-column-right')"
      >
        <span class="icon" aria-hidden="true">➡</span>
        <span class="label">Column Right</span>
      </button>
      <div class="divider" />
      <button
        class="control-btn"
        title="Remove current row"
        aria-label="Remove current row"
        @click="$emit('remove-row')"
      >
        <span class="icon" aria-hidden="true">🗑</span>
        <span class="label">Delete Row</span>
      </button>
      <button
        class="control-btn"
        title="Remove current column"
        aria-label="Remove current column"
        @click="$emit('remove-column')"
      >
        <span class="icon" aria-hidden="true">🗑</span>
        <span class="label">Delete Column</span>
      </button>
      <div class="divider" />
      <button
        class="control-btn"
        title="Cell properties"
        aria-label="Cell properties"
        @click="$emit('cell-properties')"
      >
        <span class="icon" aria-hidden="true">🎨</span>
        <span class="label">Cell Properties</span>
      </button>
      <button
        class="control-btn"
        title="Table properties"
        aria-label="Table properties"
        @click="$emit('table-properties')"
      >
        <span class="icon" aria-hidden="true">⚙️</span>
        <span class="label">Table Properties</span>
      </button>
      <div class="divider" />
      <button
        class="control-btn danger"
        title="Delete table"
        aria-label="Delete table"
        @click="$emit('delete-table')"
      >
        <span class="icon" aria-hidden="true">✕</span>
        <span class="label">Delete Table</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'

interface Props {
  show: boolean
  x?: number
  y?: number
}

interface Emits {
  (e: 'add-row-above'): void
  (e: 'add-row-below'): void
  (e: 'add-column-left'): void
  (e: 'add-column-right'): void
  (e: 'remove-row'): void
  (e: 'remove-column'): void
  (e: 'cell-properties'): void
  (e: 'table-properties'): void
  (e: 'delete-table'): void
}

const props = withDefaults(defineProps<Props>(), {
  x: 0,
  y: 0
})

defineEmits<Emits>()

/**
 * Focus follows the panel. Without this it announced as nothing and its buttons
 * were reachable only by Tab-ing forward from wherever focus happened to be;
 * dismissing it while a button held focus dropped focus to <body>, since `v-if`
 * destroys the focused node. On close, hand focus back to whatever had it —
 * unless something else has taken focus meanwhile (a click elsewhere), which
 * must not be stolen. #R23-29
 */
const panelRef = ref<HTMLElement | null>(null)
let returnFocusTo: HTMLElement | null = null

watch(
  () => props.show,
  (show) => {
    if (show) {
      const active = document.activeElement
      returnFocusTo =
        active instanceof HTMLElement && active !== document.body ? active : null
      nextTick(() => panelRef.value?.focus())
      return
    }
    const target = returnFocusTo
    returnFocusTo = null
    const active = document.activeElement
    const insidePanel = panelRef.value?.contains(active as Node) ?? false
    if (!insidePanel && active && active !== document.body) return
    nextTick(() => {
      if (target?.isConnected) target.focus()
    })
  }
)

const position = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))
</script>

<style scoped>
.table-designer {
  position: absolute;
  z-index: 900;
  background: var(--toolbar-bg, #f8f9fb);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: var(--radius-lg, 10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  padding: 8px;
  min-width: 200px;
  /* The ~420px control stack can exceed a short editor's overflow:hidden box
     (the clamp in useContextMenu collapses to the top edge then) — scroll
     internally instead of losing the bottom buttons. */
  max-height: min(420px, calc(100vh - 96px));
  overflow-y: auto;
}

.designer-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--toolbar-text, #1f2937);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  text-align: left;
  transition: background var(--transition-fast, 150ms) ease;
}

.control-btn:hover {
  background: rgba(59, 130, 246, 0.1);
}

.control-btn:active {
  background: rgba(59, 130, 246, 0.15);
}

.control-btn.danger {
  color: #ef4444;
}

.control-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.control-btn .icon {
  font-size: 16px;
  min-width: 20px;
  text-align: center;
}

.control-btn .label {
  flex: 1;
}

.divider {
  height: 1px;
  background: var(--editor-border, #d8dde6);
  margin: 4px 0;
}

/* Dark mode support */
.theme-dark .table-designer {
  background: var(--toolbar-bg, #111827);
  border-color: var(--editor-border, #1e293b);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.theme-dark .control-btn {
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .control-btn:hover {
  background: rgba(96, 165, 250, 0.15);
}

.theme-dark .divider {
  background: var(--editor-border, #1e293b);
}
</style>
