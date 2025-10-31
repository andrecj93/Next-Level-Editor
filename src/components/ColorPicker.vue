<template>
  <div class="color-picker">
    <button
      class="color-button"
      :style="{ backgroundColor: modelValue || '#000000' }"
      @click="togglePicker"
      :aria-label="label"
    >
      <span class="color-icon">{{ icon }}</span>
    </button>
    
    <transition name="picker-fade">
      <div
        v-if="showPicker"
        class="color-palette"
        @click.stop
      >
        <div class="palette-header">{{ label }}</div>
        <div class="palette-colors">
          <button
            v-for="color in colors"
            :key="color"
            class="palette-color"
            :class="{ active: modelValue === color }"
            :style="{ backgroundColor: color }"
            :aria-label="`Select color ${color}`"
            @click="selectColor(color)"
          />
        </div>
        <div class="palette-custom">
          <input
            type="color"
            :value="modelValue || '#000000'"
            @input="onCustomColor"
            aria-label="Custom color picker"
          />
          <span class="custom-label">Custom</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  modelValue?: string
  label?: string
  icon?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '#000000',
  label: 'Color',
  icon: '🎨'
})

const emit = defineEmits<Emits>()

const showPicker = ref(false)

const colors = [
  '#000000', '#3f3f3f', '#7f7f7f', '#bfbfbf', '#ffffff',
  '#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff',
  '#4b0082', '#9400d3', '#ff1493', '#00ced1', '#ff6347',
  '#dc143c', '#ff8c00', '#ffd700', '#32cd32', '#1e90ff',
  '#9370db', '#ff69b4', '#ff4500', '#ffa500', '#ffff66',
]

const togglePicker = () => {
  showPicker.value = !showPicker.value
}

const selectColor = (color: string) => {
  emit('update:modelValue', color)
  showPicker.value = false
}

const onCustomColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.color-picker')) {
    showPicker.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.color-picker {
  position: relative;
  display: inline-block;
}

.color-button {
  width: 38px;
  height: 38px;
  border: 2px solid currentColor;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: transform var(--transition-fast, 150ms) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.color-button:hover {
  transform: scale(1.05);
}

.color-icon {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.color-palette {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  background: white;
  border: 1px solid #d8dde6;
  border-radius: var(--radius-lg, 10px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  padding: 12px;
  min-width: 220px;
}

.palette-header {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  color: #1f2937;
}

.palette-colors {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.palette-color {
  width: 32px;
  height: 32px;
  border: 2px solid transparent;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  transition: all var(--transition-fast, 150ms) ease;
  padding: 0;
}

.palette-color:hover {
  transform: scale(1.1);
  border-color: #3b82f6;
}

.palette-color.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.palette-custom {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.palette-custom input[type="color"] {
  width: 40px;
  height: 32px;
  border: none;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
}

.custom-label {
  font-size: 13px;
  color: #6b7280;
}

.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity var(--transition-fast, 150ms) ease,
              transform var(--transition-fast, 150ms) ease;
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
