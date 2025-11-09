<template>
  <template v-if="visible">
    <div class="toolbar-divider" />
    
    <!-- Dropdown Section -->
    <div
      v-if="type === 'dropdown'"
      @mousedown.prevent="$emit('remember-selection')"
    >
      <ToolbarDropdown
        :label="label"
        :icon="icon"
        :tooltip="tooltip"
        :items="items"
      />
    </div>

    <!-- Button Group Section -->
    <div
      v-else-if="type === 'buttons'"
      class="toolbar-group"
    >
      <button
        v-for="action in items"
        :key="action.id"
        :class="['toolbar-btn-modern', { active: action.isActive?.() }]"
        :data-tooltip="action.tooltip"
        :aria-label="action.label"
        :aria-pressed="action.isActive?.() || false"
        @mousedown.prevent="$emit('remember-selection')"
        @click="action.onClick"
      >
        <span v-html="action.icon" />
      </button>
    </div>

    <!-- Custom Section -->
    <div
      v-else-if="type === 'custom'"
      @mousedown.prevent="$emit('remember-selection')"
    >
      <slot />
    </div>
  </template>
</template>

<script setup lang="ts">
import ToolbarDropdown from './ToolbarDropdown.vue'
import type { ToolbarAction } from '../types/toolbar'

interface Props {
  type: 'dropdown' | 'buttons' | 'custom'
  visible?: boolean
  label?: string
  icon?: string
  tooltip?: string
  items?: ToolbarAction[] | any[]
}

withDefaults(defineProps<Props>(), {
  visible: true,
  label: '',
  icon: '',
  tooltip: '',
  items: () => [],
})

defineEmits<{
  'remember-selection': []
}>()
</script>
