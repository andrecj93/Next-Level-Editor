<template>
  <div class="color-picker-wrapper">
    <button
      class="color-button"
      :style="{ backgroundColor: modelValue || '#000000' }"
      :aria-label="label"
      @click="togglePicker"
    >
      <span class="color-icon">{{ icon }}</span>
    </button>
    
    <transition name="picker-fade">
      <div
        v-if="showPicker"
        class="color-picker-container"
        @click.stop
      >
        <div class="color-picker-label">
          {{ label }}
        </div>
        <Vue3ColorPicker
          v-model="internalColor"
          mode="solid"
          type="HEX"
          :theme="theme"
          :show-color-list="false"
          :show-eye-drop="false"
          :show-alpha="true"
          :show-input-menu="true"
          :show-input-set="true"
          :show-picker-mode="false"
          :show-buttons="false"
          @update:model-value="handleColorChange"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Vue3ColorPicker } from '@cyhnkckali/vue3-color-picker'

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
const internalColor = ref(props.modelValue || '#000000')

// Detect theme from the editor
const theme = computed(() => {
  const editorElement = document.querySelector('.next-level-editor')
  return editorElement?.classList.contains('theme-dark') ? 'dark' : 'light'
})

const togglePicker = () => {
  showPicker.value = !showPicker.value
  if (showPicker.value) {
    internalColor.value = props.modelValue || '#000000'
  }
}

const handleColorChange = (color: string) => {
  emit('update:modelValue', color)
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.color-picker-wrapper')) {
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
.color-picker-wrapper {
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

.color-picker-container {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 100;
  background: var(--editor-bg, white);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: var(--radius-lg, 10px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  padding: 12px;
  min-width: 280px;
}

.color-picker-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  color: var(--toolbar-text, #1f2937);
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
