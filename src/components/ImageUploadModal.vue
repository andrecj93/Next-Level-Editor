<template>
  <div
    v-if="isOpen"
    class="modal-overlay"
    @click="handleOverlayClick"
  >
    <div
      class="modal-content"
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
      @click.stop
    >
      <div class="modal-header">
        <h3 id="modal-title">
          Insert Image
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
        <!-- Image URL Input -->
        <div class="input-group">
          <label for="image-url">Image URL</label>
          <input
            id="image-url"
            v-model="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            @input="handleUrlChange"
          >
        </div>

        <!-- File Upload -->
        <div class="upload-section">
          <div class="divider">
            <span>OR</span>
          </div>
          
          <label class="file-upload-label">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleFileUpload"
            >
            <button
              type="button"
              class="upload-button"
              @click="fileInput?.click()"
            >
              📁 Choose Image File
            </button>
          </label>
        </div>

        <!-- Alt Text -->
        <div class="input-group">
          <label for="alt-text">Alt Text (for accessibility)</label>
          <input
            id="alt-text"
            v-model="altText"
            type="text"
            placeholder="Description of the image"
          >
        </div>

        <!-- Image Preview -->
        <div
          v-if="previewUrl"
          class="preview-section"
        >
          <h4>Preview:</h4>
          <div class="preview-container">
            <img
              :src="previewUrl"
              :alt="altText || 'Image preview'"
              @error="handleImageError"
            >
          </div>
          <p
            v-if="imageError"
            class="error-message"
          >
            ⚠️ Failed to load image. Please check the URL.
          </p>
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
          :disabled="!previewUrl || imageError"
          @click="insertImage"
        >
          Insert Image
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insert', url: string, alt: string): void
}>()

const imageUrl = ref('')
const altText = ref('')
const previewUrl = ref('')
const imageError = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

/**
 * Handle URL input change
 */
const handleUrlChange = () => {
  imageError.value = false
  previewUrl.value = imageUrl.value
}

/**
 * Handle file upload
 */
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = (e) => {
      imageUrl.value = e.target?.result as string
      previewUrl.value = e.target?.result as string
      imageError.value = false
    }
    reader.readAsDataURL(file)
  }
}

/**
 * Handle image load error
 */
const handleImageError = () => {
  imageError.value = true
}

/**
 * Insert the image
 */
const insertImage = () => {
  if (previewUrl.value && !imageError.value) {
    emit('insert', previewUrl.value, altText.value)
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
  imageUrl.value = ''
  altText.value = ''
  previewUrl.value = ''
  imageError.value = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

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
  max-width: 600px;
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
  padding: 10px 12px;
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

.upload-section {
  margin: 24px 0;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 20px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--border-color);
}

.divider span {
  padding: 0 12px;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}

.file-upload-label {
  display: block;
  text-align: center;
}

.upload-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--secondary-bg);
  color: var(--text-color);
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-button:hover {
  border-color: var(--primary-color);
  background: var(--hover-bg);
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
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  max-height: 300px;
  overflow: hidden;
}

.preview-container img {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
  border-radius: 4px;
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
