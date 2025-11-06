<template>
  <transition name="modal-fade">
    <div
      v-if="show"
      class="command-palette-overlay"
      @click.self="close"
    >
      <div class="command-palette">
        <div class="command-palette-header">
          <span class="command-palette-icon">⚡</span>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="command-palette-input"
            placeholder="Type a command or search..."
            @keydown.down.prevent="navigateDown"
            @keydown.up.prevent="navigateUp"
            @keydown.enter.prevent="executeSelected"
            @keydown.esc="close"
          >
          <span class="command-palette-hint">ESC to close</span>
        </div>

        <div
          v-if="filteredCommands.length > 0"
          class="command-palette-results"
        >
          <div
            v-for="(command, index) in filteredCommands"
            :key="command.id"
            :class="[
              'command-item',
              { selected: index === selectedIndex }
            ]"
            @click="executeCommand(command)"
            @mouseenter="selectedIndex = index"
          >
            <div class="command-icon">
              {{ command.icon }}
            </div>
            <div class="command-info">
              <div class="command-name">
                {{ command.name }}
              </div>
              <div class="command-description">
                {{ command.description }}
              </div>
            </div>
            <div
              v-if="command.shortcut"
              class="command-shortcut"
            >
              {{ command.shortcut }}
            </div>
          </div>
        </div>

        <div
          v-else
          class="command-palette-empty"
        >
          <div class="empty-icon">
            🔍
          </div>
          <div class="empty-text">
            No commands found
          </div>
          <div class="empty-hint">
            Try a different search term
          </div>
        </div>

        <div class="command-palette-footer">
          <div class="command-palette-categories">
            <span
              v-for="category in categories"
              :key="category"
              class="category-badge"
            >
              {{ category }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Command {
  id: string
  name: string
  description: string
  icon: string
  category: string
  shortcut?: string
  action: () => void
}

interface Props {
  show: boolean
  commands: Command[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  execute: [command: Command]
}>()

const searchInput = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const selectedIndex = ref(0)

const filteredCommands = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.commands.slice(0, 10) // Show first 10 commands when no search
  }

  const query = searchQuery.value.toLowerCase()
  return props.commands
    .filter((cmd) => {
      return (
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.category.toLowerCase().includes(query)
      )
    })
    .slice(0, 10) // Limit to 10 results
})

const categories = computed(() => {
  const cats = new Set(filteredCommands.value.map((cmd) => cmd.category))
  return Array.from(cats)
})

watch(() => props.show, (newShow) => {
  if (newShow) {
    searchQuery.value = ''
    selectedIndex.value = 0
    nextTick(() => {
      searchInput.value?.focus()
    })
  }
})

watch(filteredCommands, () => {
  // Reset selected index when filtered results change
  if (selectedIndex.value >= filteredCommands.value.length) {
    selectedIndex.value = Math.max(0, filteredCommands.value.length - 1)
  }
})

function navigateDown() {
  if (selectedIndex.value < filteredCommands.value.length - 1) {
    selectedIndex.value++
  }
}

function navigateUp() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function executeSelected() {
  if (filteredCommands.value.length > 0) {
    executeCommand(filteredCommands.value[selectedIndex.value])
  }
}

function executeCommand(command: Command) {
  emit('execute', command)
  close()
}

function close() {
  emit('close')
}
</script>

<style scoped>
.command-palette-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 2000;
  padding-top: 15vh;
  backdrop-filter: blur(4px);
}

.command-palette {
  background: var(--editor-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 640px;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--editor-border, #d8dde6);
}

.command-palette-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--editor-border, #d8dde6);
  gap: 12px;
}

.command-palette-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.command-palette-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 1.125rem;
  color: var(--content-color, #1f2937);
  font-family: inherit;
}

.command-palette-input::placeholder {
  color: var(--placeholder-color, #9ca3af);
}

.command-palette-hint {
  font-size: 0.75rem;
  color: var(--placeholder-color, #9ca3af);
  background: var(--toolbar-bg, #f8f9fb);
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.command-palette-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  gap: 12px;
  transition: all 0.15s;
}

.command-item:hover,
.command-item.selected {
  background: var(--toolbar-hover, rgba(59, 130, 246, 0.12));
}

.command-item.selected {
  outline: 2px solid var(--toolbar-accent, #3b82f6);
  outline-offset: -2px;
}

.command-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.command-info {
  flex: 1;
  min-width: 0;
}

.command-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--content-color, #1f2937);
  margin-bottom: 2px;
}

.command-description {
  font-size: 0.8125rem;
  color: var(--placeholder-color, #9ca3af);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-shortcut {
  font-size: 0.75rem;
  color: var(--placeholder-color, #9ca3af);
  background: var(--toolbar-bg, #f8f9fb);
  padding: 4px 8px;
  border-radius: 4px;
  flex-shrink: 0;
  font-family: monospace;
}

.command-palette-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--content-color, #1f2937);
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.875rem;
  color: var(--placeholder-color, #9ca3af);
}

.command-palette-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--editor-border, #d8dde6);
  background: var(--toolbar-bg, #f8f9fb);
}

.command-palette-categories {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  background: var(--editor-bg, #ffffff);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 12px;
  color: var(--toolbar-text, #6b7280);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .command-palette,
.modal-fade-leave-active .command-palette {
  transition: transform 0.2s, opacity 0.2s;
}

.modal-fade-enter-from .command-palette,
.modal-fade-leave-to .command-palette {
  transform: scale(0.95);
  opacity: 0;
}

/* Dark mode */
.theme-dark .command-palette {
  background: var(--editor-bg, #0f172a);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.theme-dark .command-palette-hint {
  background: rgba(30, 41, 59, 0.8);
}

.theme-dark .command-shortcut {
  background: rgba(30, 41, 59, 0.8);
}

.theme-dark .category-badge {
  background: rgba(15, 23, 42, 0.8);
  border-color: var(--editor-border, #1e293b);
}

/* Scrollbar styling */
.command-palette-results::-webkit-scrollbar {
  width: 8px;
}

.command-palette-results::-webkit-scrollbar-track {
  background: transparent;
}

.command-palette-results::-webkit-scrollbar-thumb {
  background: var(--editor-border, #d8dde6);
  border-radius: 4px;
}

.command-palette-results::-webkit-scrollbar-thumb:hover {
  background: var(--toolbar-text, #9ca3af);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .command-palette-overlay {
    padding-top: 5vh;
  }

  .command-palette {
    width: 95%;
    max-height: 70vh;
  }

  .command-palette-header {
    padding: 12px 16px;
  }

  .command-item {
    padding: 10px 12px;
  }

  .command-shortcut {
    display: none;
  }
}
</style>
