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
  <div
    v-if="showEmojiPicker"
    class="emoji-picker-overlay"
    @click.self="$emit('close-emoji-picker')"
  >
    <EmojiPicker
      :show="showEmojiPicker"
      @select="$emit('insert-emoji', $event)"
      @close="$emit('close-emoji-picker')"
    />
  </div>

  <!-- Link Modal -->
  <LinkModal
    :is-open="showLinkModal"
    :context="linkContext"
    @close="$emit('close-link-modal')"
    @insert="(url: string, text: string) => $emit('insert-link', url, text)"
  />

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
    :recent-command-ids="recentCommandIds"
    @close="$emit('close-command-palette')"
    @execute="$emit('execute-command', $event)"
  />

  <!-- Auto-save Indicator. Only the owning instance paints the chip (it is
       fixed to the viewport corner) — EXCEPT for a failure, which must always
       be visible: a silent save error is the bug #r20-2 closed. #R23-58 -->
  <SaveStatus
    v-if="!inlineSave"
    :save-status="saveStatus" :owns-fixed-chrome="ownsFixedChrome"
    :is-saving="isSaving" :last-saved="lastSaved"
    :has-pending-changes="hasPendingChanges" :persistent-save="persistentSave"
    @retry-save="$emit('retry-save')"
  />

  <!-- Toast Notification -->
  <transition name="toast-fade">
    <div v-if="showToast" :class="['toast-notification', toastType]">
      {{ t(toastMessage) }}
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t } = useEditorLocale();
import SaveStatus from "./SaveStatus.vue";
import TableModal from "./TableModal.vue";
import FindReplaceModal from "./FindReplaceModal.vue";
import CodeBlockModal from "./CodeBlockModal.vue";
import TableDesigner from "./TableDesigner.vue";
import TablePropertiesModal from "./TablePropertiesModal.vue";
import EmojiPicker from "./EmojiPicker.vue";
import LinkModal from "./LinkModal.vue";
import ImageUploadModal from "./ImageUploadModal.vue";
import EmbedModal from "./EmbedModal.vue";
import FileManagerModal from "./FileManagerModal.vue";
import TemplateModal from "./TemplateModal.vue";
import HtmlCodeModal from "./HtmlCodeModal.vue";
import CommandPalette from "./CommandPalette.vue";

interface Props {
  inlineSave?: boolean;
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
  showLinkModal: boolean;
  linkContext?: { url: string; text: string; selectionText: string; editing: boolean };
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
  /** Recently executed command ids (most recent first) — surfaced first when
   *  the palette opens with an empty query. */
  recentCommandIds?: string[];
  lastSaved: Date | null;
  /** Auto-save lifecycle state; 'error' drives the failure indicator so a
   *  failed save never reads as "Saved". #r20-2 */
  saveStatus?: "saving" | "conflict" | "error" | "saved" | "unsaved";
  hasPendingChanges?: boolean;
  /** A v-model update is not evidence of durable storage. */
  persistentSave?: boolean;
  toastMessage: string;
  toastType: "success" | "error";
  /**
   * Whether THIS editor instance owns the page's viewport-fixed chrome (see
   * useFloatingChromeOwner). The auto-save chip is `position: fixed`, so on a
   * multi-editor page only the owner may paint it — otherwise two chips land on
   * the same pixels and one hides the other. Defaults to true: a lone editor
   * always owns it. #R23-58
   */
  ownsFixedChrome?: boolean;
}

// Boolean props are cast to `false` when absent, so this default has to be
// declared rather than inferred from "prop omitted".
withDefaults(defineProps<Props>(), {
  ownsFixedChrome: true,
  theme: undefined,
  linkContext: undefined,
  recentCommandIds: undefined,
  saveStatus: undefined,
  hasPendingChanges: false,
  persistentSave: true,
});

defineEmits<{
  "retry-save": [];
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
  "close-link-modal": [];
  "insert-link": [url: string, text: string];
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
/*
 * Full-viewport click-catcher so clicking outside the picker dismisses it,
 * like every other modal overlay. Kept transparent (no scrim) to preserve
 * the picker's lightweight floating-panel look.
 */
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Match every other dialog overlay (10050) so the picker clears the
     fullscreen mobile toolbar (10001) instead of rendering beneath it. */
  z-index: 10050;
}
</style>
