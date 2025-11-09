import { ref } from 'vue'

export function useModals() {
  // Modal states
  const showImageUploadModal = ref(false)
  const showEmbedModal = ref(false)
  const showFileManagerModal = ref(false)
  const showEmojiPicker = ref(false)
  const showTemplateModal = ref(false)
  const showHtmlCodeModal = ref(false)
  const showFindReplaceModal = ref(false)
  const showCodeBlockModal = ref(false)
  const showTableModal = ref(false)
  const showTableDesigner = ref(false)
  const showTablePropertiesModal = ref(false)

  // Image Upload Modal
  const openImageUploadModal = () => {
    showImageUploadModal.value = true
  }

  const closeImageUploadModal = () => {
    showImageUploadModal.value = false
  }

  // Embed Modal
  const openEmbedModal = () => {
    showEmbedModal.value = true
  }

  const closeEmbedModal = () => {
    showEmbedModal.value = false
  }

  // File Manager Modal
  const openFileManagerModal = () => {
    showFileManagerModal.value = true
  }

  const closeFileManagerModal = () => {
    showFileManagerModal.value = false
  }

  // Template Modal
  const openTemplateModal = () => {
    showTemplateModal.value = true
  }

  const closeTemplateModal = () => {
    showTemplateModal.value = false
  }

  // HTML Code Modal
  const openHtmlCodeModal = () => {
    showHtmlCodeModal.value = true
  }

  const closeHtmlCodeModal = () => {
    showHtmlCodeModal.value = false
  }

  // Table Modal
  const openTableModal = () => {
    showTableModal.value = true
  }

  const closeTableModal = () => {
    showTableModal.value = false
  }

  // Table Properties Modal
  const openTablePropertiesModal = () => {
    showTablePropertiesModal.value = true
  }

  const closeTablePropertiesModal = () => {
    showTablePropertiesModal.value = false
  }

  // Find Replace Modal
  const openFindReplaceModal = () => {
    showFindReplaceModal.value = true
  }

  const closeFindReplaceModal = () => {
    showFindReplaceModal.value = false
  }

  // Code Block Modal
  const openCodeBlockModal = () => {
    showCodeBlockModal.value = true
  }

  const closeCodeBlockModal = () => {
    showCodeBlockModal.value = false
  }

  // Emoji Picker
  const toggleEmojiPicker = () => {
    showEmojiPicker.value = !showEmojiPicker.value
  }

  const closeEmojiPicker = () => {
    showEmojiPicker.value = false
  }

  // Table Designer
  const openTableDesigner = () => {
    showTableDesigner.value = true
  }

  const closeTableDesigner = () => {
    showTableDesigner.value = false
  }

  return {
    // States
    showImageUploadModal,
    showEmbedModal,
    showFileManagerModal,
    showEmojiPicker,
    showTemplateModal,
    showHtmlCodeModal,
    showFindReplaceModal,
    showCodeBlockModal,
    showTableModal,
    showTableDesigner,
    showTablePropertiesModal,

    // Functions
    openImageUploadModal,
    closeImageUploadModal,
    openEmbedModal,
    closeEmbedModal,
    openFileManagerModal,
    closeFileManagerModal,
    openTemplateModal,
    closeTemplateModal,
    openHtmlCodeModal,
    closeHtmlCodeModal,
    openTableModal,
    closeTableModal,
    openTablePropertiesModal,
    closeTablePropertiesModal,
    openFindReplaceModal,
    closeFindReplaceModal,
    openCodeBlockModal,
    closeCodeBlockModal,
    toggleEmojiPicker,
    closeEmojiPicker,
    openTableDesigner,
    closeTableDesigner,
  }
}
