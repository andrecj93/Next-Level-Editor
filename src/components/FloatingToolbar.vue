<template>
  <teleport to="body">
    <transition name="floating">
      <div
        v-if="show && position"
        class="floating-toolbar"
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
          :aria-label="action.label"
          :title="action.tooltip"
          @click="action.onClick"
        >
          <span
            v-if="action.icon"
            v-html="action.icon"
          />
          <span v-else>{{ action.label }}</span>
        </button>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

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

interface Position {
  top: number
  left: number
}

const props = defineProps<Props>()

const position = ref<Position | null>(null)

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

  // Position toolbar above selection
  const top = rect.top + window.scrollY - 50
  const left = rect.left + window.scrollX + (rect.width / 2)

  position.value = {
    top: Math.max(10, top),
    left: Math.max(10, Math.min(left, window.innerWidth - 300))
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
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
})
</script>

<style scoped>
.floating-toolbar {
  position: absolute;
  z-index: 999;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg, 10px);
  padding: 4px;
  display: flex;
  gap: 4px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3),
              0 10px 10px -5px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
  pointer-events: none;
}

.floating-btn {
  pointer-events: auto;
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
  transition: all var(--transition-fast, 150ms) ease;
}

.floating-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.floating-btn.active {
  background: #3b82f6;
  color: #ffffff;
}

.floating-enter-active,
.floating-leave-active {
  transition: opacity var(--transition-normal, 200ms) ease,
              transform var(--transition-normal, 200ms) ease;
}

.floating-enter-from,
.floating-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
