<!-- eslint-disable vue/html-self-closing -->
<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <dialog
      ref="modalContent"
      open
      class="modal-content file-manager-modal"
      aria-labelledby="modal-title"
      aria-modal="true"
      @click.stop
    >
      <div class="modal-header">
        <h3 id="modal-title">📁 File Manager</h3>
        <button
          class="close-button"
          aria-label="Close modal"
          title="Close File Manager"
          @click="close"
        >
          ✕
        </button>
      </div>

      <div class="modal-body file-manager-body">
        <!-- Toolbar -->
        <div class="file-manager-toolbar">
          <div class="toolbar-left">
            <label class="upload-button">
              <input
                ref="fileInput"
                type="file"
                multiple
                style="display: none"
                @change="handleFileSelect"
              />
              <button
                type="button"
                class="btn btn-primary"
                @click="fileInput?.click()"
              >
                ⬆️ Upload Files
              </button>
            </label>
            <button
              v-if="selectedFiles.length > 0"
              type="button"
              class="btn btn-danger"
              @click="deleteSelected"
            >
              🗑️ Delete ({{ selectedFiles.length }})
            </button>
          </div>
          <div class="toolbar-right">
            <button
              type="button"
              :class="['view-toggle', { active: viewMode === 'grid' }]"
              aria-label="Grid view"
              @click="viewMode = 'grid'"
            >
              ▦
            </button>
            <button
              type="button"
              :class="['view-toggle', { active: viewMode === 'list' }]"
              aria-label="List view"
              @click="viewMode = 'list'"
            >
              ☰
            </button>
          </div>
        </div>

        <!-- Drag and Drop Area -->
        <div
          v-if="files.length === 0"
          class="drop-zone"
          :class="{ 'drag-over': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div class="drop-zone-content">
            <div class="drop-icon">📁</div>
            <p class="drop-text">Drag and drop files here</p>
            <p class="drop-subtext">or click "Upload Files" to browse</p>
            <p class="drop-info">Max file size: {{ maxFileSizeFormatted }}</p>
          </div>
        </div>

        <!-- File Grid/List -->
        <div
          v-else
          class="file-container"
          :class="{ 'drag-over': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <!-- Grid View -->
          <div v-if="viewMode === 'grid'" class="file-grid">
            <div
              v-for="file in files"
              :key="file.id"
              :class="[
                'file-card',
                { selected: selectedFiles.includes(file.id) },
              ]"
              @click="toggleFileSelection(file.id, $event)"
              @dblclick="insertFile(file)"
            >
              <div class="file-checkbox">
                <input
                  type="checkbox"
                  :checked="selectedFiles.includes(file.id)"
                  @click.stop="toggleSingleSelection(file.id)"
                />
              </div>
              <div class="file-preview">
                <img
                  v-if="file.thumbnail"
                  :src="file.thumbnail"
                  :alt="file.name"
                />
                <div v-else class="file-icon">
                  {{ getFileIcon(file.type) }}
                </div>
              </div>
              <div class="file-info">
                <div class="file-name" :title="file.name">
                  {{ file.name }}
                </div>
                <div class="file-meta">
                  {{ formatFileSize(file.size) }}
                </div>
              </div>
              <div class="file-actions">
                <button
                  class="btn-icon"
                  title="Insert into editor"
                  @click.stop="insertFile(file)"
                >
                  ✓
                </button>
                <button
                  class="btn-icon btn-danger"
                  title="Delete"
                  @click.stop="deleteFile(file.id)"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>

          <!-- List View -->
          <div v-else class="file-list">
            <table>
              <thead>
                <tr>
                  <th style="width: 40px">
                    <input
                      type="checkbox"
                      :checked="allFilesSelected"
                      @change="toggleSelectAll"
                    />
                  </th>
                  <th>Name</th>
                  <th style="width: 100px">Size</th>
                  <th style="width: 150px">Uploaded</th>
                  <th style="width: 120px">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="file in files"
                  :key="file.id"
                  :class="{ selected: selectedFiles.includes(file.id) }"
                  @click="toggleFileSelection(file.id, $event)"
                  @dblclick="insertFile(file)"
                >
                  <td>
                    <input
                      type="checkbox"
                      :checked="selectedFiles.includes(file.id)"
                      @click.stop="toggleSingleSelection(file.id)"
                    />
                  </td>
                  <td class="file-name-cell">
                    <span class="file-icon-inline">{{
                      getFileIcon(file.type)
                    }}</span>
                    <span :title="file.name">{{ file.name }}</span>
                  </td>
                  <td>{{ formatFileSize(file.size) }}</td>
                  <td>{{ formatDate(file.uploadedAt) }}</td>
                  <td class="actions-cell">
                    <button
                      class="btn-icon"
                      title="Insert into editor"
                      @click.stop="insertFile(file)"
                    >
                      ✓
                    </button>
                    <button
                      class="btn-icon btn-danger"
                      title="Delete"
                      @click.stop="deleteFile(file.id)"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Storage Info -->
        <div v-if="files.length > 0" class="storage-info">
          <span
            >{{ files.length }} file(s) •
            {{ formatFileSize(totalSize) }} used</span
          >
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-message">
          ⚠️ {{ errorMessage }}
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-button" @click="close">Close</button>
      </div>
    </dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { fileManager, type ManagedFile } from "../utils/fileManager";
import { useModalDialog } from "../composables/useModalDialog";

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: "close"): void;
  (e: "insert", file: ManagedFile): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileInput = ref<HTMLInputElement | null>(null);
const modalContent = ref<HTMLElement | null>(null);
const files = ref<ManagedFile[]>([]);
const selectedFiles = ref<string[]>([]);
const viewMode = ref<"grid" | "list">("grid");
const isDragging = ref(false);
const errorMessage = ref("");

const maxFileSizeFormatted = computed(() =>
  fileManager.formatFileSize(10 * 1024 * 1024)
);

const totalSize = computed(() =>
  files.value.reduce((total, file) => total + file.size, 0)
);

const allFilesSelected = computed(
  () =>
    files.value.length > 0 && selectedFiles.value.length === files.value.length
);

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.isOpen,
  container: modalContent,
  onClose: () => emit("close"),
});

// Load files when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      loadFiles();
      errorMessage.value = "";
      selectedFiles.value = [];
    }
  }
);

function loadFiles() {
  files.value = fileManager.getFiles();
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    await uploadFiles(Array.from(target.files));
    target.value = ""; // Reset input
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files) {
    await uploadFiles(Array.from(event.dataTransfer.files));
  }
}

async function uploadFiles(fileList: File[]) {
  errorMessage.value = "";
  let successCount = 0;
  let errorCount = 0;

  for (const file of fileList) {
    try {
      await fileManager.uploadFile(file);
      successCount++;
    } catch (error) {
      errorCount++;
      errorMessage.value =
        error instanceof Error ? error.message : "Upload failed";
    }
  }

  loadFiles();

  if (successCount > 0 && errorCount === 0) {
    errorMessage.value = "";
  } else if (errorCount > 0) {
    errorMessage.value = `${successCount} file(s) uploaded, ${errorCount} failed`;
  }
}

function toggleFileSelection(fileId: string, event?: MouseEvent) {
  if (event && (event.ctrlKey || event.metaKey)) {
    // Multi-select with Ctrl/Cmd
    const index = selectedFiles.value.indexOf(fileId);
    if (index > -1) {
      selectedFiles.value.splice(index, 1);
    } else {
      selectedFiles.value.push(fileId);
    }
  } else {
    // Single select
    const index = selectedFiles.value.indexOf(fileId);
    if (index > -1) {
      selectedFiles.value = [];
    } else {
      selectedFiles.value = [fileId];
    }
  }
}

function toggleSingleSelection(fileId: string) {
  // Checkbox toggles only its own item without affecting other selections.
  const index = selectedFiles.value.indexOf(fileId);
  if (index > -1) {
    selectedFiles.value.splice(index, 1);
  } else {
    selectedFiles.value.push(fileId);
  }
}

function toggleSelectAll() {
  if (allFilesSelected.value) {
    selectedFiles.value = [];
  } else {
    selectedFiles.value = files.value.map((f) => f.id);
  }
}

function deleteFile(fileId: string) {
  if (confirm("Delete this file?")) {
    fileManager.deleteFile(fileId);
    selectedFiles.value = selectedFiles.value.filter((id) => id !== fileId);
    loadFiles();
  }
}

function deleteSelected() {
  if (confirm(`Delete ${selectedFiles.value.length} file(s)?`)) {
    fileManager.deleteFiles(selectedFiles.value);
    selectedFiles.value = [];
    loadFiles();
  }
}

function insertFile(file: ManagedFile) {
  emit("insert", file);
  close();
}

function getFileIcon(type: string): string {
  return fileManager.getFileIcon(type);
}

function formatFileSize(bytes: number): string {
  return fileManager.formatFileSize(bytes);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

function handleOverlayClick() {
  close();
}

function close() {
  emit("close");
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  border: none;
  padding: 0;
  margin: auto;
  position: relative;
}

.file-manager-modal {
  background: var(--editor-bg);
  border-radius: 12px;
  max-width: 900px;
  width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
  border: none;
  padding: 0;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px 20px;
  border-bottom: 3px solid transparent;
  border-image: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  border-image-slice: 1;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.05) 0%,
    rgba(139, 92, 246, 0.05) 50%,
    rgba(236, 72, 153, 0.05) 100%
  );
}

.modal-header h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-button:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.file-manager-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

/* Toolbar */
.file-manager-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--secondary-bg);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.btn:hover::before {
  width: 300px;
  height: 300px;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

.view-toggle {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: var(--text-color);
  transition: all 0.2s;
}

.view-toggle:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.view-toggle.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* Drop Zone */
.drop-zone {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  margin: 20px;
  transition: all 0.3s;
  background: var(--secondary-bg);
}

.drop-zone.drag-over {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.drop-zone-content {
  text-align: center;
  padding: 40px;
}

.drop-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.drop-text {
  font-size: 18px;
  font-weight: 500;
  margin: 8px 0;
  color: var(--text-color);
}

.drop-subtext {
  color: var(--text-muted);
  margin: 4px 0;
  font-size: 14px;
}

.drop-info {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
  opacity: 0.8;
}

/* File Container */
.file-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  position: relative;
}

.file-container.drag-over::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(59, 130, 246, 0.05);
  border: 2px dashed var(--primary-color);
  border-radius: 8px;
  pointer-events: none;
  z-index: 10;
}

/* Grid View */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.file-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: var(--editor-bg);
}

.file-card:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.file-card.selected {
  border-color: var(--primary-color);
  background: rgba(59, 130, 246, 0.05);
}

.file-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
}

.file-checkbox input {
  cursor: pointer;
}

.file-preview {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--secondary-bg);
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.file-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.file-icon {
  font-size: 48px;
  opacity: 0.6;
}

.file-info {
  margin-bottom: 8px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
  color: var(--text-color);
}

.file-meta {
  font-size: 11px;
  color: var(--text-muted);
}

.file-actions {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-icon {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  color: var(--text-color);
}

.btn-icon.btn-primary:hover {
  background: var(--primary-color);
  color: #ffffff;
  border-color: var(--primary-color);
}

.btn-icon.btn-danger:hover {
  background: #dc2626; /* Darker red for better contrast */
  border-color: #dc2626;
  color: #ffffff;
}

/* List View */
.file-list {
  width: 100%;
}

.file-list table {
  width: 100%;
  border-collapse: collapse;
}

.file-list thead {
  background: var(--secondary-bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.file-list th {
  padding: 12px;
  text-align: left;
  font-weight: 500;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-color);
  font-size: 13px;
}

.file-list tbody tr {
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}

.file-list tbody tr:hover {
  background: var(--hover-bg);
}

.file-list tbody tr.selected {
  background: rgba(59, 130, 246, 0.05);
}

.file-list td {
  padding: 12px;
  color: var(--text-color);
  font-size: 13px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon-inline {
  font-size: 20px;
  opacity: 0.6;
}

.actions-cell {
  display: flex;
  gap: 6px;
}

/* Storage Info */
.storage-info {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--secondary-bg);
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

/* Error Message */
.error-message {
  margin: 12px 16px;
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
  font-size: 13px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.cancel-button:hover {
  background: var(--hover-bg);
}

/* Scrollbar styling */
.file-container::-webkit-scrollbar {
  width: 8px;
}

.file-container::-webkit-scrollbar-track {
  background: var(--secondary-bg);
}

.file-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.file-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
