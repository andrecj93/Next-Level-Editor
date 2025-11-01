<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="show"
        class="modal-overlay"
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
}

interface Emits {
  (e: 'close'): void
  (e: 'insert', data: { rows: number; cols: number; includeHeader: boolean }): void
}

defineProps<Props>()
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
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: var(--radius-xl, 12px);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
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
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast, 150ms) ease;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
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
  color: #374151;
}

.number-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.number-input:focus {
  outline: none;
  border-color: #3b82f6;
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
  color: #374151;
}

.table-preview {
  margin-top: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: var(--radius-md, 8px);
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
  margin-bottom: 12px;
}

.preview-grid {
  display: grid;
  gap: 2px;
  background: #d1d5db;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
}

.preview-cell {
  aspect-ratio: 2;
  background: white;
}

.preview-cell.header {
  background: #e5e7eb;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
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
  background: #f3f4f6;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
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
