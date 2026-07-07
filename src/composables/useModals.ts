import { ref } from "vue";

export interface UseModalsOptions {
  rememberSelection?: () => void;
}

export function useModals(options: UseModalsOptions = {}) {
  const { rememberSelection } = options;

  // Modal states
  const showLinkModal = ref(false);
  const showImageUploadModal = ref(false);
  const showEmbedModal = ref(false);
  const showFileManagerModal = ref(false);
  const showEmojiPicker = ref(false);
  const showTemplateModal = ref(false);
  const showHtmlCodeModal = ref(false);
  const showFindReplaceModal = ref(false);
  const showCodeBlockModal = ref(false);
  const showTableModal = ref(false);
  const showTableDesigner = ref(false);
  const showTablePropertiesModal = ref(false);
  const showShortcutHelpModal = ref(false);

  /**
   * Helper to remember selection before opening modal
   */
  const beforeOpenModal = () => {
    if (rememberSelection) {
      rememberSelection();
    }
  };

  // Link Modal
  const openLinkModal = () => {
    beforeOpenModal();
    showLinkModal.value = true;
  };

  const closeLinkModal = () => {
    showLinkModal.value = false;
  };

  // Image Upload Modal
  const openImageUploadModal = () => {
    beforeOpenModal();
    showImageUploadModal.value = true;
  };

  const closeImageUploadModal = () => {
    showImageUploadModal.value = false;
  };

  // Embed Modal
  const openEmbedModal = () => {
    beforeOpenModal();
    showEmbedModal.value = true;
  };

  const closeEmbedModal = () => {
    showEmbedModal.value = false;
  };

  // File Manager Modal
  const openFileManagerModal = () => {
    beforeOpenModal();
    showFileManagerModal.value = true;
  };

  const closeFileManagerModal = () => {
    showFileManagerModal.value = false;
  };

  // Template Modal
  const openTemplateModal = () => {
    beforeOpenModal();
    showTemplateModal.value = true;
  };

  const closeTemplateModal = () => {
    showTemplateModal.value = false;
  };

  // HTML Code Modal
  const openHtmlCodeModal = () => {
    beforeOpenModal();
    showHtmlCodeModal.value = true;
  };

  const closeHtmlCodeModal = () => {
    showHtmlCodeModal.value = false;
  };

  // Table Modal
  const openTableModal = () => {
    beforeOpenModal();
    showTableModal.value = true;
  };

  const closeTableModal = () => {
    showTableModal.value = false;
  };

  // Table Properties Modal
  const openTablePropertiesModal = () => {
    beforeOpenModal();
    showTablePropertiesModal.value = true;
  };

  const closeTablePropertiesModal = () => {
    showTablePropertiesModal.value = false;
  };

  // Find Replace Modal
  const openFindReplaceModal = () => {
    beforeOpenModal();
    showFindReplaceModal.value = true;
  };

  const closeFindReplaceModal = () => {
    showFindReplaceModal.value = false;
  };

  // Code Block Modal
  const openCodeBlockModal = () => {
    beforeOpenModal();
    showCodeBlockModal.value = true;
  };

  const closeCodeBlockModal = () => {
    showCodeBlockModal.value = false;
  };

  // Emoji Picker
  const toggleEmojiPicker = () => {
    beforeOpenModal();
    showEmojiPicker.value = !showEmojiPicker.value;
  };

  const closeEmojiPicker = () => {
    showEmojiPicker.value = false;
  };

  // Keyboard Shortcut Help Modal
  const openShortcutHelpModal = () => {
    // Reference-only modal: it never touches the document, so the current
    // selection doesn't need to be saved before opening it.
    showShortcutHelpModal.value = true;
  };

  const closeShortcutHelpModal = () => {
    showShortcutHelpModal.value = false;
  };

  // Table Designer
  const openTableDesigner = () => {
    // Note: Table designer doesn't need selection save as it's contextual
    showTableDesigner.value = true;
  };

  const closeTableDesigner = () => {
    showTableDesigner.value = false;
  };

  return {
    // States
    showLinkModal,
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
    showShortcutHelpModal,

    // Functions
    openLinkModal,
    closeLinkModal,
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
    openShortcutHelpModal,
    closeShortcutHelpModal,
  };
}
