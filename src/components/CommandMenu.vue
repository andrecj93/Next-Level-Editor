<template>
  <transition name="command-menu">
    <div
      v-if="show"
      class="command-menu"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    >
      <div class="command-menu-header">
        Quick Actions
      </div>
      <ul>
        <li
          v-for="option in options"
          :key="option.id"
          @mousedown.prevent
          @click="$emit('select', option)"
        >
          <div class="command-title">
            {{ option.label }}
          </div>
          <div class="command-description">
            {{ option.description }}
          </div>
        </li>
      </ul>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { SlashCommandOption } from '../composables/useSlashCommands'

// Re-export for backward compatibility
export interface CommandOption {
  id: string
  label: string
  description: string
  action?: () => void
}

export interface CommandMenuPosition {
  top: number
  left: number
}

interface Props {
  show: boolean
  position: CommandMenuPosition
  options: SlashCommandOption[]
}

withDefaults(defineProps<Props>(), {
  show: false,
  position: () => ({ top: 0, left: 0 }),
  options: () => [],
})

defineEmits<{
  select: [option: SlashCommandOption]
}>()
</script>
