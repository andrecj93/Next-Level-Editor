<template>
  <div class="font-size-selector">
    <button
      class="font-size-button"
      :aria-label="`Font size: ${currentSizeLabel}`"
      @click="toggleDropdown"
    >
      <span class="size-icon">{{ currentSizeLabel }}</span>
      <span class="dropdown-arrow">▼</span>
    </button>
    
    <transition name="dropdown-fade">
      <div
        v-if="showDropdown"
        class="size-dropdown"
        @click.stop
      >
        <div class="dropdown-header">
          Font Size
        </div>
        <button
          v-for="size in fontSizes"
          :key="size.value"
          class="size-option"
          :class="{ active: modelValue === size.value }"
          @click="selectSize(size.value)"
        >
          <span class="size-label">{{ size.label }}</span>
          <span
            class="size-preview"
            :style="{ fontSize: size.preview }"
          >Aa</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

type FontSizeValue = 'small' | 'normal' | 'large' | 'huge'

interface FontSize {
  label: string
  value: FontSizeValue
  preview: string
}

interface Props {
  modelValue?: FontSizeValue
}

interface Emits {
  (e: 'update:modelValue', value: FontSizeValue): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'normal'
})

const emit = defineEmits<Emits>()

const showDropdown = ref(false)

const fontSizes: FontSize[] = [
  { label: 'Small', value: 'small', preview: '12px' },
  { label: 'Normal', value: 'normal', preview: '16px' },
  { label: 'Large', value: 'large', preview: '20px' },
  { label: 'Huge', value: 'huge', preview: '28px' },
]

const currentSizeLabel = computed(() => {
  const size = fontSizes.find(s => s.value === props.modelValue)
  return size ? size.label.charAt(0) : 'N'
})

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectSize = (value: FontSizeValue) => {
  emit('update:modelValue', value)
  showDropdown.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.font-size-selector')) {
    showDropdown.value = false
  }
}

// Standard menu keyboard behavior: Escape dismisses the open dropdown and is
// consumed so global Escape handlers don't also fire (see ToolbarDropdown).
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !showDropdown.value) return
  event.preventDefault()
  event.stopPropagation()
  showDropdown.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown, true)
})
</script>

<style scoped>
.font-size-selector {
  position: relative;
  display: inline-block;
}

.font-size-button {
  min-width: 48px;
  height: 38px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 8px);
  background: transparent;
  color: var(--toolbar-text);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-fast, 150ms) ease;
}

.font-size-button:hover {
  border-color: var(--toolbar-accent);
  background: var(--toolbar-hover);
}

.size-icon {
  font-size: 16px;
  font-weight: 700;
}

.dropdown-arrow {
  font-size: 10px;
  opacity: 0.6;
}

.size-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  min-width: 180px;
  background: white;
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: var(--radius-lg, 10px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  overflow: hidden;
}

.dropdown-header {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--toolbar-text);
  background: rgba(59, 130, 246, 0.06);
  border-bottom: 1px solid var(--editor-border, #e5e7eb);
}

.size-option {
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  color: var(--toolbar-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background var(--transition-fast, 150ms) ease;
  text-align: left;
}

.size-option:hover {
  background: var(--toolbar-hover, rgba(59, 130, 246, 0.08));
}

.size-option.active {
  background: rgba(59, 130, 246, 0.12);
  font-weight: 600;
}

.size-label {
  font-size: 14px;
}

.size-preview {
  font-weight: 600;
  opacity: 0.7;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--transition-fast, 150ms) ease,
              transform var(--transition-fast, 150ms) ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
