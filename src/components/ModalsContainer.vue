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
  <div
    v-if="saveStatus === 'error' || (ownsFixedChrome && (isSaving || lastSaved))"
    class="auto-save-indicator"
    :class="{
      'is-saving': isSaving,
      'is-error': saveStatus === 'error',
      'is-saved': saveStatus !== 'error' && !isSaving && lastSaved,
    }"
    role="status"
    aria-live="polite"
  >
    <!-- Error wins even when a PRIOR save left lastSaved set, so a silent
         failure never reads as 'Saved'. #r20-2 -->
    <span v-if="saveStatus === 'error'" class="save-error">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a1.9 1.9 0 0 0 1.7 2.9h15.8a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      Couldn't save changes
    </span>
    <span v-else-if="isSaving" class="saving">
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
import LinkModal from "./LinkModal.vue";
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
  showLinkModal: boolean;
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
  recentCommandIds: undefined,
  saveStatus: undefined,
});

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
