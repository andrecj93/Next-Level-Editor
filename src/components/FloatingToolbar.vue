<template>
  <teleport to="body">
    <transition name="floating">
      <div
        v-if="show && position"
        ref="toolbarEl"
        class="floating-toolbar nle-chrome"
        :class="{ 'is-below': position.below }"
        :style="{
          top: `${position.top}px`,
          left: `${position.left}px`
        }"
        @mousedown.prevent
      >
        <button
          v-for="action in actions"
          :key="action.id"
          class="floating-btn"
          :class="{ active: action.isActive?.() }"
          :aria-label="t(action.label)"
          :title="t(action.tooltip)"
          @click="action.onClick"
        >
          <span
            v-if="action.icon"
            v-html="action.icon"
          />
          <span v-else>{{ t(action.label) }}</span>
        </button>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t } = useEditorLocale();
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
// Positioning math lives in utils/ (pure + unit-testable; a second plain
// <script> block exporting it from this SFC tripped TS4082 in vue-tsc's
// declaration generation).
import {
  computeToolbarPosition,
  ESTIMATED_WIDTH,
  type ToolbarPosition
} from '../utils/floatingToolbarPosition'

/**
 * The SELECTION TOOLBAR — the floating bubble that appears over selected text
 * (a.k.a. "bubble menu"). Not to be confused with the MAIN TOOLBAR
 * (EditorToolbar.vue), the persistent bar at the top of the editor.
 * Visibility is owned per-instance by useFloatingToolbar, which only reacts
 * to selections inside its own editor root.
 */
interface ToolbarAction {
  id: string
  label: string
  tooltip: string
  icon?: string
  onClick: () => void
  isActive?: () => boolean
}

interface Props {
  show: boolean
  actions: ToolbarAction[]
}

const props = defineProps<Props>()

const position = ref<ToolbarPosition | null>(null)
const toolbarEl = ref<HTMLElement | null>(null)

const updatePosition = () => {
  if (!props.show) {
    position.value = null
    return
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    position.value = null
    return
  }

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  if (rect.width === 0 && rect.height === 0) {
    position.value = null
    return
  }

  // Measure the real bubble width; before first render (v-if) fall back to
  // an estimate and re-run once the element exists.
  const measuredWidth = toolbarEl.value?.offsetWidth || 0
  const hadElement = measuredWidth > 0

  position.value = computeToolbarPosition({
    rect: { top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width },
    toolbarWidth: hadElement ? measuredWidth : ESTIMATED_WIDTH,
    viewportWidth: window.innerWidth,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  })

  if (!hadElement) {
    // First paint used the estimate; re-clamp once with the real width.
    nextTick(() => {
      if (props.show && toolbarEl.value && toolbarEl.value.offsetWidth > 0) {
        updatePosition()
      }
    })
  }
}

watch(() => props.show, (newShow) => {
  if (newShow) {
    // Delay to ensure selection is stable
    setTimeout(updatePosition, 10)
  } else {
    position.value = null
  }
})

const handleResize = () => {
  if (props.show) {
    updatePosition()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleResize, true)
  // Reposition to follow the selection while the bubble is already visible
  // (e.g. extending the selection or selecting a different span). Previously
  // the position was only computed on the show false->true transition, so the
  // bubble stayed anchored over the original selection.
  document.addEventListener('selectionchange', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
  document.removeEventListener('selectionchange', handleResize)
})
</script>

<style scoped>
.floating-toolbar {
  position: absolute;
  z-index: 1000;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg, 10px);
  padding: 4px;
  display: flex;
  gap: 4px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
              0 10px 10px -5px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
}

.floating-toolbar::before {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px;
  border-style: solid;
  border-color: rgba(17, 24, 39, 0.95) transparent transparent transparent;
}

/* Flipped placement: bubble sits BELOW the selection, arrow points UP.
   The bubble surface is the same dark chip in light and dark themes, so a
   single mirrored arrow color covers both. */
.floating-toolbar.is-below::before {
  bottom: auto;
  top: -6px;
  border-color: transparent transparent rgba(17, 24, 39, 0.95) transparent;
}

.floating-btn {
  min-width: 36px;
  min-height: 36px;
  padding: 6px 12px;
  border: none;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: #f9fafb;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Quick-step feedback (note: the old `var(--transition-fast)` here resolved
     to a full transition shorthand used as a duration — invalid CSS). */
  transition: background-color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1)),
    color var(--nle-motion-quick, 120ms)
      var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

.floating-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.floating-btn.active {
  background: var(--toolbar-accent, #3b82f6);
  color: var(--toolbar-accent-contrast, #ffffff);
}

/* Bubble entry decelerates into place; dismissal accelerates away and is
   faster than the entry (motion tokens; see tokens.css). */
.floating-enter-active {
  transition: opacity var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1)),
    transform var(--nle-motion-enter, 180ms)
      var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.floating-leave-active {
  transition: opacity var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15)),
    transform var(--nle-motion-exit, 140ms)
      var(--nle-ease-in, cubic-bezier(0.3, 0, 0.8, 0.15));
}

.floating-enter-from,
.floating-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.floating-enter-from.is-below,
.floating-leave-to.is-below {
  transform: translateX(-50%) translateY(10px);
}
</style>
