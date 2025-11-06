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
            <h3>{{ mode === 'cell' ? 'Cell Properties' : 'Table Properties' }}</h3>
            <button
              class="close-btn"
              aria-label="Close modal"
              @click="close"
            >
              ✕
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Tabs for Cell vs Table mode -->
            <div
              v-if="mode === 'both'"
              class="tabs"
            >
              <button
                class="tab"
                :class="{ active: activeTab === 'cell' }"
                @click="activeTab = 'cell'"
              >
                Cell Properties
              </button>
              <button
                class="tab"
                :class="{ active: activeTab === 'table' }"
                @click="activeTab = 'table'"
              >
                Table Properties
              </button>
            </div>

            <!-- Cell Properties -->
            <div
              v-if="activeTab === 'cell'"
              class="properties-section"
            >
              <div class="property-group">
                <label>Background Color</label>
                <div class="color-input-group">
                  <input
                    v-model="cellProps.backgroundColor"
                    type="color"
                    class="color-input"
                  >
                  <input
                    v-model="cellProps.backgroundColor"
                    type="text"
                    class="text-input"
                    placeholder="#ffffff"
                  >
                  <button
                    class="btn-clear"
                    @click="cellProps.backgroundColor = ''"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div class="property-group">
                <label>Horizontal Alignment</label>
                <div class="button-group">
                  <button
                    v-for="align in ['left', 'center', 'right', 'justify']"
                    :key="align"
                    class="btn-option"
                    :class="{ active: cellProps.textAlign === align }"
                    @click="cellProps.textAlign = align"
                  >
                    {{ align }}
                  </button>
                </div>
              </div>

              <div class="property-group">
                <label>Vertical Alignment</label>
                <div class="button-group">
                  <button
                    v-for="align in ['top', 'middle', 'bottom']"
                    :key="align"
                    class="btn-option"
                    :class="{ active: cellProps.verticalAlign === align }"
                    @click="cellProps.verticalAlign = align"
                  >
                    {{ align }}
                  </button>
                </div>
              </div>

              <div class="property-group">
                <label>Padding (px)</label>
                <input
                  v-model.number="cellProps.padding"
                  type="number"
                  min="0"
                  max="100"
                  class="number-input"
                >
              </div>

              <div class="property-group">
                <label>Width</label>
                <div class="dimension-input-group">
                  <input
                    v-model="cellProps.width"
                    type="text"
                    class="text-input"
                    placeholder="auto or 100px or 50%"
                  >
                </div>
              </div>

              <div class="property-group">
                <label>Height</label>
                <div class="dimension-input-group">
                  <input
                    v-model="cellProps.height"
                    type="text"
                    class="text-input"
                    placeholder="auto or 100px"
                  >
                </div>
              </div>
            </div>

            <!-- Table Properties -->
            <div
              v-if="activeTab === 'table'"
              class="properties-section"
            >
              <div class="property-group">
                <label>Border Style</label>
                <select
                  v-model="tableProps.borderStyle"
                  class="select-input"
                >
                  <option value="solid">
                    Solid
                  </option>
                  <option value="dashed">
                    Dashed
                  </option>
                  <option value="dotted">
                    Dotted
                  </option>
                  <option value="double">
                    Double
                  </option>
                  <option value="none">
                    None
                  </option>
                </select>
              </div>

              <div class="property-group">
                <label>Border Width (px)</label>
                <input
                  v-model.number="tableProps.borderWidth"
                  type="number"
                  min="0"
                  max="20"
                  class="number-input"
                >
              </div>

              <div class="property-group">
                <label>Border Color</label>
                <div class="color-input-group">
                  <input
                    v-model="tableProps.borderColor"
                    type="color"
                    class="color-input"
                  >
                  <input
                    v-model="tableProps.borderColor"
                    type="text"
                    class="text-input"
                    placeholder="#d1d5db"
                  >
                </div>
              </div>

              <div class="property-group">
                <label>Table Width</label>
                <div class="dimension-input-group">
                  <input
                    v-model="tableProps.width"
                    type="text"
                    class="text-input"
                    placeholder="100% or 500px"
                  >
                </div>
              </div>

              <div class="property-group">
                <label>Background Color</label>
                <div class="color-input-group">
                  <input
                    v-model="tableProps.backgroundColor"
                    type="color"
                    class="color-input"
                  >
                  <input
                    v-model="tableProps.backgroundColor"
                    type="text"
                    class="text-input"
                    placeholder="#ffffff"
                  >
                  <button
                    class="btn-clear"
                    @click="tableProps.backgroundColor = ''"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div class="property-group">
                <label>
                  <input
                    v-model="tableProps.borderCollapse"
                    type="checkbox"
                    class="checkbox-input"
                  >
                  <span>Collapse Borders</span>
                </label>
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
              @click="applyProperties"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface CellProperties {
  backgroundColor: string
  textAlign: string
  verticalAlign: string
  padding: number
  width: string
  height: string
}

interface TableProperties {
  borderStyle: string
  borderWidth: number
  borderColor: string
  width: string
  backgroundColor: string
  borderCollapse: boolean
}

interface Props {
  show: boolean
  mode: 'cell' | 'table' | 'both'
  initialCellProps?: Partial<CellProperties>
  initialTableProps?: Partial<TableProperties>
}

interface Emits {
  (e: 'close'): void
  (e: 'apply', data: { cellProps?: CellProperties; tableProps?: TableProperties }): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'both',
  initialCellProps: () => ({}),
  initialTableProps: () => ({})
})

const emit = defineEmits<Emits>()

const activeTab = ref<'cell' | 'table'>(props.mode === 'table' ? 'table' : 'cell')

const cellProps = ref<CellProperties>({
  backgroundColor: '',
  textAlign: 'left',
  verticalAlign: 'middle',
  padding: 8,
  width: '',
  height: ''
})

const tableProps = ref<TableProperties>({
  borderStyle: 'solid',
  borderWidth: 1,
  borderColor: '#d1d5db',
  width: '100%',
  backgroundColor: '',
  borderCollapse: true
})

// Watch for prop changes
watch(() => props.show, (newShow) => {
  if (newShow) {
    // Reset to initial values
    cellProps.value = {
      backgroundColor: props.initialCellProps?.backgroundColor || '',
      textAlign: props.initialCellProps?.textAlign || 'left',
      verticalAlign: props.initialCellProps?.verticalAlign || 'middle',
      padding: props.initialCellProps?.padding || 8,
      width: props.initialCellProps?.width || '',
      height: props.initialCellProps?.height || ''
    }
    
    tableProps.value = {
      borderStyle: props.initialTableProps?.borderStyle || 'solid',
      borderWidth: props.initialTableProps?.borderWidth || 1,
      borderColor: props.initialTableProps?.borderColor || '#d1d5db',
      width: props.initialTableProps?.width || '100%',
      backgroundColor: props.initialTableProps?.backgroundColor || '',
      borderCollapse: props.initialTableProps?.borderCollapse ?? true
    }
  }
})

const close = () => {
  emit('close')
}

const handleOverlayClick = () => {
  close()
}

const applyProperties = () => {
  const result: { cellProps?: CellProperties; tableProps?: TableProperties } = {}
  
  if (props.mode === 'cell' || props.mode === 'both') {
    result.cellProps = cellProps.value
  }
  
  if (props.mode === 'table' || props.mode === 'both') {
    result.tableProps = tableProps.value
  }
  
  emit('apply', result)
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
  max-width: 600px;
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all var(--transition-fast, 150ms) ease;
}

.tab:hover {
  color: #3b82f6;
}

.tab.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.properties-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-group > label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.property-group label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-group,
.dimension-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-input {
  width: 50px;
  height: 38px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  padding: 2px;
}

.text-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.text-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.select-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-md, 8px);
  font-size: 14px;
  background: white;
  cursor: pointer;
  transition: border-color var(--transition-fast, 150ms) ease;
}

.select-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.button-group {
  display: flex;
  gap: 8px;
}

.btn-option {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  transition: all var(--transition-fast, 150ms) ease;
  text-transform: capitalize;
}

.btn-option:hover {
  background: #f9fafb;
  border-color: #3b82f6;
}

.btn-option.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.btn-clear {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  background: white;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-md, 8px);
  transition: all var(--transition-fast, 150ms) ease;
}

.btn-clear:hover {
  background: #f3f4f6;
  color: #374151;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
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

/* Dark mode support */
.theme-dark .modal-content {
  background: var(--toolbar-bg, #111827);
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .modal-header {
  border-bottom-color: var(--editor-border, #1e293b);
}

.theme-dark .modal-header h3 {
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .tabs {
  border-bottom-color: var(--editor-border, #1e293b);
}

.theme-dark .tab {
  color: #9ca3af;
}

.theme-dark .tab:hover,
.theme-dark .tab.active {
  color: #60a5fa;
}

.theme-dark .tab.active {
  border-bottom-color: #60a5fa;
}

.theme-dark .property-group > label {
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .text-input,
.theme-dark .number-input,
.theme-dark .select-input,
.theme-dark .color-input {
  background: var(--editor-bg, #0f172a);
  border-color: var(--editor-border, #1e293b);
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .btn-option {
  background: var(--editor-bg, #0f172a);
  border-color: var(--editor-border, #1e293b);
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .btn-option:hover {
  background: #1e293b;
  border-color: #60a5fa;
}

.theme-dark .btn-option.active {
  background: #60a5fa;
  color: white;
  border-color: #60a5fa;
}

.theme-dark .btn-clear {
  background: var(--editor-bg, #0f172a);
  border-color: var(--editor-border, #1e293b);
  color: #9ca3af;
}

.theme-dark .btn-clear:hover {
  background: #1e293b;
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .modal-footer {
  border-top-color: var(--editor-border, #1e293b);
}

.theme-dark .btn-cancel {
  background: #1e293b;
  color: var(--toolbar-text, #e2e8f0);
}

.theme-dark .btn-cancel:hover {
  background: #334155;
}
</style>
