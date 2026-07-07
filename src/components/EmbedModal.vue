<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click="handleOverlayClick"
  >
    <div
      ref="modalContent"
      class="modal-content"
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
      @click.stop
    >
      <div class="modal-header">
        <h3 id="modal-title">
          Embed Media
        </h3>
        <button
          class="close-button"
          aria-label="Close modal"
          @click="close"
        >
          ×
        </button>
      </div>

      <div class="modal-body">
        <p class="description">
          Paste a YouTube or Vimeo URL to embed a video
        </p>

        <!-- Video URL Input -->
        <div class="input-group">
          <label for="video-url">Video URL</label>
          <input
            id="video-url"
            ref="urlInput"
            v-model="videoUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            @input="handleUrlChange"
            @keyup.enter="insertEmbed"
          >
        </div>

        <!-- Supported Services -->
        <div class="supported-services">
          <span class="service-badge">YouTube</span>
          <span class="service-badge">Vimeo</span>
        </div>

        <!-- Preview -->
        <div
          v-if="previewHtml"
          class="preview-section"
        >
          <h4>Preview:</h4>
          <div
            class="preview-container"
            v-html="previewHtml"
          />
        </div>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="error-message"
        >
          ⚠️ {{ errorMessage }}
        </div>

        <!-- Examples -->
        <div
          v-if="!videoUrl"
          class="examples"
        >
          <h4>Examples:</h4>
          <ul>
            <li>https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
            <li>https://youtu.be/dQw4w9WgXcQ</li>
            <li>https://vimeo.com/123456789</li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="cancel-button"
          @click="close"
        >
          Cancel
        </button>
        <button 
          class="insert-button" 
          :disabled="!previewHtml"
          @click="insertEmbed"
        >
          Insert Video
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getVideoEmbedHtml, isEmbeddableVideo } from '../utils/embed'
import { useModalDialog } from '../composables/useModalDialog'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert', html: string): void
}>()

const videoUrl = ref('')
const previewHtml = ref('')
const errorMessage = ref('')
const modalContent = ref<HTMLElement | null>(null)
const urlInput = ref<HTMLInputElement | null>(null)

/**
 * Handle URL change
 */
const handleUrlChange = () => {
  errorMessage.value = ''
  
  if (!videoUrl.value.trim()) {
    previewHtml.value = ''
    return
  }

  if (!isEmbeddableVideo(videoUrl.value)) {
    errorMessage.value = 'Please enter a valid YouTube or Vimeo URL'
    previewHtml.value = ''
    return
  }

  const embedHtml = getVideoEmbedHtml(videoUrl.value)
  if (embedHtml) {
    previewHtml.value = embedHtml
  } else {
    errorMessage.value = 'Failed to generate embed code'
    previewHtml.value = ''
  }
}

/**
 * Insert the embed
 */
const insertEmbed = () => {
  if (previewHtml.value) {
    emit('insert', previewHtml.value)
    resetForm()
  }
}

/**
 * Close modal
 */
const close = () => {
  emit('close')
  resetForm()
}

/**
 * Handle overlay click
 */
const handleOverlayClick = () => {
  close()
}

/**
 * Reset form
 */
const resetForm = () => {
  videoUrl.value = ''
  previewHtml.value = ''
  errorMessage.value = ''
}

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.isOpen,
  container: modalContent,
  onClose: close,
  initialFocus: () => urlInput.value,
})

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetForm()
  }
})
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
  background: var(--editor-bg);
  border-radius: 12px;
  width: 90%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
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

.modal-body {
  padding: 24px;
}

.description {
  margin: 0 0 20px 0;
  color: var(--text-muted);
  font-size: 14px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.input-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 14px;
  background: var(--editor-bg);
  color: var(--text-color);
  transition: border-color 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.supported-services {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.service-badge {
  padding: 6px 12px;
  background: var(--secondary-bg);
  color: var(--text-color);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color);
}

.preview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.preview-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}

.preview-container {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--secondary-bg);
}

.preview-container :deep(.video-embed) {
  margin: 0;
}

.error-message {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fee;
  color: #c33;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.examples {
  margin-top: 24px;
  padding: 16px;
  background: var(--secondary-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.examples h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}

.examples ul {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.examples li {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'Courier New', monospace;
  margin-bottom: 6px;
  padding-left: 0;
}

.examples li::before {
  content: '▸ ';
  color: var(--primary-color);
  margin-right: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.cancel-button,
.insert-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-button {
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.cancel-button:hover {
  background: var(--hover-bg);
}

.insert-button {
  background: var(--primary-color);
  color: white;
  border: none;
}

.insert-button:hover:not(:disabled) {
  background: var(--primary-hover);
}

.insert-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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
