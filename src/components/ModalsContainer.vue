<!-- eslint-disable vue/max-attributes-per-line -->
<template>
  <!-- Table Modal -->
  <TableModal
    :show="showTableModal"
    :theme="theme"
    @close="$emit('close-table-modal')"
    @insert="$emit('insert-table', $event)"
  />

  <!-- Find & Replace Modal -->
  <FindReplaceModal
    :show="showFindReplaceModal"
    :theme="theme"
    :content="editorContent"
    @close="$emit('close-find-replace-modal')"
    @find="$emit('find', $event)"
    @replace="$emit('replace', $event)"
    @replace-all="$emit('replace-all', $event)"
  />

  <!-- Code Block Modal -->
  <CodeBlockModal
    :show="showCodeBlockModal"
    :theme="theme"
    @close="$emit('close-code-block-modal')"
    @insert="$emit('insert-code-block', $event)"
  />

  <!-- Table Designer -->
  <TableDesigner
    :show="showTableDesigner"
    :x="tableDesignerPosition.x"
    :y="tableDesignerPosition.y"
    @add-row-above="$emit('add-row-above')"
    @add-row-below="$emit('add-row-below')"
    @add-column-left="$emit('add-column-left')"
    @add-column-right="$emit('add-column-right')"
    @remove-row="$emit('remove-row')"
    @remove-column="$emit('remove-column')"
    @cell-properties="$emit('cell-properties')"
    @table-properties="$emit('table-properties')"
    @delete-table="$emit('delete-table')"
  />

  <!-- Table Properties Modal -->
  <TablePropertiesModal
    :show="showTablePropertiesModal"
    :theme="theme"
    :mode="tablePropertiesMode"
    :initial-cell-props="initialCellProps"
    :initial-table-props="initialTableProps"
    @close="$emit('close-table-properties-modal')"
    @apply="$emit('apply-table-properties', $event)"
  />

  <!-- Emoji Picker -->
  <div v-if="showEmojiPicker" class="emoji-picker-overlay">
    <EmojiPicker
      :show="showEmojiPicker"
      @select="$emit('insert-emoji', $event)"
      @close="$emit('close-emoji-picker')"
    />
  </div>

  <!-- Image Upload Modal -->
  <ImageUploadModal
    :is-open="showImageUploadModal"
    @close="$emit('close-image-upload-modal')"
    @insert="(url: string, alt: string) => $emit('insert-image', url, alt)"
  />

  <!-- Embed Modal -->
  <EmbedModal
    :is-open="showEmbedModal"
    @close="$emit('close-embed-modal')"
    @insert="(html: string) => $emit('insert-embed', html)"
  />

  <!-- File Manager Modal -->
  <FileManagerModal
    :is-open="showFileManagerModal"
    @close="$emit('close-file-manager-modal')"
    @insert="$emit('insert-file', $event)"
  />

  <!-- Template Modal -->
  <TemplateModal
    :show="showTemplateModal"
    @close="$emit('close-template-modal')"
    @select="$emit('select-template', $event)"
  />

  <!-- HTML Code Modal -->
  <HtmlCodeModal
    :show="showHtmlCodeModal"
    :theme="theme"
    :html-content="formattedHtmlContent"
    @close="$emit('close-html-code-modal')"
  />

  <!-- Command Palette -->
  <CommandPalette
    :show="showCommandPalette"
    :commands="commandPaletteCommands"
    @close="$emit('close-command-palette')"
    @execute="$emit('execute-command', $event)"
  />

  <!-- Auto-save Indicator -->
  <div
    v-if="isSaving || lastSaved"
    class="auto-save-indicator"
    :class="{ 'is-saving': isSaving, 'is-saved': !isSaving && lastSaved }"
    role="status"
    aria-live="polite"
  >
    <span v-if="isSaving" class="saving">
      <svg
        class="asi-spinner"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M21 12a9 9 0 1 1-6.219-8.56"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
      Saving...
    </span>
    <span v-else-if="lastSaved" :key="lastSaved.getTime()" class="saved">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Saved at {{ lastSaved.toLocaleTimeString() }}
    </span>
  </div>

  <!-- Toast Notification -->
  <transition name="toast-fade">
    <div v-if="showToast" :class="['toast-notification', toastType]">
      {{ toastMessage }}
    </div>
  </transition>
</template>

<script setup lang="ts">
import TableModal from "./TableModal.vue";
import FindReplaceModal from "./FindReplaceModal.vue";
import CodeBlockModal from "./CodeBlockModal.vue";
import TableDesigner from "./TableDesigner.vue";
import TablePropertiesModal from "./TablePropertiesModal.vue";
import EmojiPicker from "./EmojiPicker.vue";
import ImageUploadModal from "./ImageUploadModal.vue";
import EmbedModal from "./EmbedModal.vue";
import FileManagerModal from "./FileManagerModal.vue";
import TemplateModal from "./TemplateModal.vue";
import HtmlCodeModal from "./HtmlCodeModal.vue";
import CommandPalette from "./CommandPalette.vue";

interface Props {
  /** Editor theme class ('theme-dark' | 'theme-light'), forwarded to the
      teleported modals so they can carry it on their own root (teleporting to
      <body> escapes the editor's theme scope). Optional so existing callers /
      tests that omit it still type-check; modals default to light. */
  theme?: string;
  showTableModal: boolean;
  showFindReplaceModal: boolean;
  showCodeBlockModal: boolean;
  showTableDesigner: boolean;
  showTablePropertiesModal: boolean;
  showEmojiPicker: boolean;
  showImageUploadModal: boolean;
  showEmbedModal: boolean;
  showFileManagerModal: boolean;
  showTemplateModal: boolean;
  showHtmlCodeModal: boolean;
  showCommandPalette: boolean;
  showToast: boolean;
  isSaving: boolean;
  editorContent: string;
  tableDesignerPosition: { x: number; y: number };
  tablePropertiesMode: "cell" | "table" | "both";
  initialCellProps: Record<string, any>;
  initialTableProps: Record<string, any>;
  formattedHtmlContent: string;
  commandPaletteCommands: any[];
  lastSaved: Date | null;
  toastMessage: string;
  toastType: "success" | "error";
}

defineProps<Props>();

defineEmits<{
  "close-table-modal": [];
  "insert-table": [data: any];
  "close-find-replace-modal": [];
  find: [data: any];
  replace: [data: any];
  "replace-all": [data: any];
  "close-code-block-modal": [];
  "insert-code-block": [data: any];
  "add-row-above": [];
  "add-row-below": [];
  "add-column-left": [];
  "add-column-right": [];
  "remove-row": [];
  "remove-column": [];
  "cell-properties": [];
  "table-properties": [];
  "delete-table": [];
  "close-table-properties-modal": [];
  "apply-table-properties": [data: any];
  "close-emoji-picker": [];
  "insert-emoji": [emoji: string];
  "close-image-upload-modal": [];
  "insert-image": [url: string, alt: string];
  "close-embed-modal": [];
  "insert-embed": [url: string];
  "close-file-manager-modal": [];
  "insert-file": [data: any];
  "close-template-modal": [];
  "select-template": [template: any];
  "close-html-code-modal": [];
  "close-command-palette": [];
  "execute-command": [command: any];
}>();
</script>

<style scoped>
.emoji-picker-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10000;
}
</style>
