<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay"
        :class="theme"
        @click="handleOverlayClick"
      >
        <div
          class="modal-content"
          @click.stop
        >
          <div class="modal-header">
            <h3>Insert Table</h3>
            <button
              class="close-btn"
              aria-label="Close modal"
              @click="close"
            >
              ✕
            </button>
          </div>
          
          <div class="modal-body">
            <div class="input-group">
              <label for="table-rows">Rows</label>
              <input
                id="table-rows"
                v-model.number="rows"
                type="number"
                min="1"
                max="20"
                class="number-input"
              >
            </div>
            
            <div class="input-group">
              <label for="table-cols">Columns</label>
              <input
                id="table-cols"
                v-model.number="cols"
                type="number"
                min="1"
                max="10"
                class="number-input"
              >
            </div>
            
            <div class="checkbox-group">
              <label>
                <input
                  v-model="includeHeader"
                  type="checkbox"
                >
                <span>Include header row</span>
              </label>
            </div>
            
            <div class="table-preview">
              <div class="preview-label">
                Preview:
              </div>
              <div
                class="preview-grid"
                :style="gridStyle"
              >
                <div
                  v-for="i in totalCells"
                  :key="i"
                  class="preview-cell"
                  :class="{ header: includeHeader && i <= cols }"
                />
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button
              class="btn btn-cancel"
              @click="close"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              @click="insertTable"
            >
              Insert Table
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  show: boolean
  theme?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'insert', data: { rows: number; cols: number; includeHeader: boolean }): void
}

withDefaults(defineProps<Props>(), {
  theme: 'theme-light'
})
const emit = defineEmits<Emits>()

const rows = ref(3)
const cols = ref(3)
const includeHeader = ref(true)

const totalCells = computed(() => rows.value * cols.value)

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`
}))

const close = () => {
  emit('close')
}

const handleOverlayClick = () => {
  close()
}

const insertTable = () => {
  emit('insert', {
    rows: rows.value,
    cols: cols.value,
    includeHeader: includeHeader.value
  })
  close()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-overlay-backdrop);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-2xl);
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast, 150ms) ease;
}

.close-btn:hover {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text);
}

.number-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  background: var(--color-background);
  color: var(--color-text);
  transition: border-color var(--transition-fast, 150ms) ease;
}

.number-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-group {
  margin-bottom: 20px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-group span {
  font-size: 14px;
  color: var(--color-text);
}

.table-preview {
  margin-top: 24px;
  padding: 16px;
  background: var(--color-surface-raised);
  border-radius: var(--radius-md, 8px);
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.preview-grid {
  display: grid;
  gap: 2px;
  background: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.preview-cell {
  aspect-ratio: 2;
  background: var(--color-surface);
}

.preview-cell.header {
  background: var(--color-surface-raised);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast, 150ms) ease;
}

.btn-cancel {
  background: var(--color-surface-raised);
  color: var(--color-text);
}

.btn-cancel:hover {
  background: var(--color-border);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-dark);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-content,
.modal-fade-leave-active .modal-content {
  transition: transform var(--transition-normal, 200ms) ease;
}

.modal-fade-enter-from .modal-content,
.modal-fade-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
