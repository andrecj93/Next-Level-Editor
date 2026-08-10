<!-- eslint-disable vue/html-self-closing -->
<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleOverlayClick">
    <div
      ref="modalContent"
      class="modal-content"
      role="dialog"
      aria-labelledby="modal-title"
      aria-modal="true"
      @click.stop
    >
      <div class="modal-header">
        <h3 id="modal-title">Insert Image</h3>
        <button class="close-button" aria-label="Close modal" @click="close">
          ×
        </button>
      </div>

      <div class="modal-body">
        <!-- Image URL Input -->
        <div class="input-group">
          <label for="image-url">Image URL</label>
          <input
            id="image-url"
            ref="urlInput"
            v-model="imageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            @input="handleUrlChange"
            @keyup.enter="previewUrl && insertImage()"
          />
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
            />
            <button
              type="button"
              class="upload-button"
              @click="fileInput?.click()"
            >
              📁 Choose Image File
            </button>
          </label>
          <p v-if="uploadError" class="error-message">⚠️ {{ uploadError }}</p>
        </div>

        <!-- Alt Text -->
        <div class="input-group">
          <label for="alt-text">Alt Text (for accessibility)</label>
          <input
            id="alt-text"
            v-model="altText"
            type="text"
            placeholder="Description of the image"
          />
        </div>

        <!-- Image Preview -->
        <div v-if="previewUrl" class="preview-section">
          <h4>Preview:</h4>
          <div class="preview-container">
            <img
              :src="previewUrl"
              :alt="altText || 'Image preview'"
              @error="handleImageError"
            />
          </div>
          <p v-if="imageError" class="error-message">
            ⚠️ Failed to load image. Please check the URL.
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <p v-if="!previewUrl" class="footer-hint">
          💡 Enter a URL or upload a file to enable the Insert button
        </p>
        <div class="footer-buttons">
          <button class="cancel-button" @click="close">Cancel</button>
          <button
            class="insert-button"
            :disabled="!previewUrl"
            :title="
              !previewUrl
                ? 'Please provide an image URL or upload a file first'
                : 'Insert this image into the editor'
            "
            @click="insertImage"
          >
            ✓ Insert Image
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useModalDialog } from "../composables/useModalDialog";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "insert", url: string, alt: string): void;
}>();

const imageUrl = ref("");
const altText = ref("");
const previewUrl = ref("");
const imageError = ref(false);
const uploadError = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const modalContent = ref<HTMLElement | null>(null);
const urlInput = ref<HTMLInputElement | null>(null);

/**
 * Handle URL input change
 */
const handleUrlChange = () => {
  imageError.value = false;
  previewUrl.value = imageUrl.value;
};

/**
 * Handle file upload
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB, matching the file manager

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  // Surface validation failures instead of silently dropping the file (the
  // previous code just no-op'd on a non-image and had no size cap at all).
  if (!file.type.startsWith("image/")) {
    uploadError.value = "Please choose an image file.";
    target.value = "";
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    uploadError.value = "That image is too large (max 10 MB).";
    target.value = "";
    return;
  }

  uploadError.value = "";
  const reader = new FileReader();
  reader.onload = (e) => {
    imageUrl.value = e.target?.result as string;
    previewUrl.value = e.target?.result as string;
    imageError.value = false;
  };
  reader.onerror = () => {
    uploadError.value = "Could not read that file. Please try another.";
  };
  reader.readAsDataURL(file);
};

/**
 * Handle image load error
 */
const handleImageError = () => {
  imageError.value = true;
};

/**
 * Insert the image
 */
const insertImage = () => {
  if (previewUrl.value) {
    emit("insert", previewUrl.value, altText.value);
    resetForm();
  }
};

/**
 * Close modal
 */
const close = () => {
  emit("close");
  resetForm();
};

/**
 * Handle overlay click
 */
const handleOverlayClick = () => {
  close();
};

/**
 * Reset form
 */
const resetForm = () => {
  imageUrl.value = "";
  altText.value = "";
  previewUrl.value = "";
  imageError.value = false;
  uploadError.value = "";
  if (fileInput.value) {
    fileInput.value.value = "";
  }
};

// Escape-to-close, Tab trap, initial focus, focus restore (WAI-ARIA dialog)
useModalDialog({
  isOpen: () => props.isOpen,
  container: modalContent,
  onClose: close,
  initialFocus: () => urlInput.value,
});

// Reset form when modal opens
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      resetForm();
    }
  }
);
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
  z-index: 10050; /* above floating panels/FABs (9998-9999) */
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
  content: "";
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

/* Dark theme (keyed to the editor's .theme-dark root class, like the rest of
   the editor's dark styles): the hardcoded light-pink #fee/#c33 pair is
   illegible on dark surfaces. */
.theme-dark .error-message {
  background: rgba(239, 68, 68, 0.15);
  color: var(--color-error-light, #f87171);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

.footer-hint {
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: var(--secondary-bg);
  border-left: 3px solid var(--primary-color);
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-color);
}

.footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-button,
.insert-button {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.cancel-button::before,
.insert-button::before {
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

.cancel-button:hover::before,
.insert-button:hover:not(:disabled)::before {
  width: 300px;
  height: 300px;
}

.cancel-button {
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.cancel-button:hover {
  background: var(--hover-bg);
  border-color: var(--text-muted);
}

.insert-button {
  background: var(--toolbar-accent, #3b82f6);
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.insert-button:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
  transform: translateY(-1px);
}

.insert-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
  background: #9ca3af;
}

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
