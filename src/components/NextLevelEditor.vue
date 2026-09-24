<template>
  <div
    ref="rootEl"
    :class="[
      'next-level-editor',
      themeClass,
      themePresetClass,
      {
        fullscreen: isFullScreen,
        'is-focus': isFocusMode,
        'is-full-width': isFullWidth,
        'is-resizing': isResizing,
        'is-writing-workspace': writingMode,
        'has-writing-search': writingMode && showFindReplaceModal,
      },
    ]"
    :style="
      isFullScreen || isFocusMode
        ? {}
        : [editorStyles, resizeStyles]
    "
    :data-toolbar-position="
      effectiveToolbarPosition !== 'top' && !isPillMode
        ? effectiveToolbarPosition
        : undefined
    "
  >
    <!-- Accessibility: Skip Links -->
    <SkipLinks
      :label="skipLinksLabel"
      :main-target-id="mainLandmarkId"
      :toolbar-target-id="toolbarLandmarkId"
      :footer-target-id="footerLandmarkId"
      :has-toolbar="showToolbar && !readonly && !isPillMode"
      :has-footer="effectiveToolbarPosition !== 'bottom'"
    />

    <!-- Accessibility: ARIA Live Regions -->
    <AriaLiveRegion />

    <!-- Editor Toolbar. The shell div is the @container query context: a
         container query can never style the query container itself, so
         container-type lives here (not on the toolbar) for the auto-compact
         rules to actually match .editor-toolbar-modern. The shell also owns
         the sticky positioning the toolbar previously had — sticky inside a
         tight wrapper would otherwise pin to the wrapper's own bounds. -->
    <div
      v-if="showToolbar && !readonly && !isPillMode"
      ref="toolbarShellEl"
      class="nle-toolbar-shell"
      :data-adaptive="effectiveAdaptiveChrome"
      :data-receded="chromeReceded || undefined"
      :data-position="
        effectiveToolbarPosition !== 'top' && effectiveToolbarPosition !== 'zen'
          ? effectiveToolbarPosition
          : undefined
      "
    >
    <EditorToolbar
      :id="toolbarLandmarkId"
      ref="editorToolbarRef"
      :is-toolbar-section-visible="isToolbarSectionVisible"
      :format-dropdown-items="formatDropdownItems"
      :inline-format-actions="inlineFormatActions"
      :alignment-dropdown-items="alignmentDropdownItems"
      :list-actions="listActions"
      :insert-dropdown-items="insertDropdownItems"
      :show-colors-dropdown="showColorsDropdown"
      :text-color="textColor"
      :background-color="backgroundColor"
      :font-size-dropdown-items="fontSizeDropdownItems"
      :history-index="historyIndex"
      :history-length="history.length"
      :productivity-dropdown-items="productivityDropdownItems"
      :tool-actions="toolActions"
      :export-dropdown-items="exportDropdownItems"
      :view-mode="viewMode"
      :theme="theme"
      :is-full-screen="isFullScreen"
      :is-focus-mode="isFocusMode"
      :toolbar-layout="effectiveToolbarLayout"
      :writing-mode="writingMode"
      :writing-tool-actions="writingToolActions"
      @remember-selection="rememberSelectionFromToolbar"
      @toggle-colors-dropdown="showColorsDropdown = !showColorsDropdown"
      @close-colors-dropdown="showColorsDropdown = false"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
      @undo="undo"
      @redo="redo"
      @view-mode-change="(mode) => (viewMode = mode)"
      @format-html="formatHtmlCode"
      @toggle-theme="toggleTheme"
      @toggle-fullscreen="toggleFullScreen"
      @toggle-focus="toggleFocusMode"
      @return-editor="performWithSelection(() => {})"
    />
    <!-- Letterbox band — the toolbar's while-you-write form: three quiet
         signals in place of the buttons. Click (or any pointer intent /
         Escape / toolbar focus) restores the full toolbar. -->
    <div
      v-if="effectiveAdaptiveChrome === 'letterbox'"
      class="nle-letterbox"
      :title="'Click to show the toolbar'"
      @click="restoreChrome"
    >
      <span class="nle-letterbox-format">{{ letterboxFormatLabel }}</span>
      <span class="nle-letterbox-filament" aria-hidden="true">
        <span
          class="nle-letterbox-filament-fill"
          :style="{ width: `${Math.round(letterboxProgress * 100)}%` }"
        />
      </span>
      <span
        class="nle-letterbox-save"
        :class="{ 'is-pulsing': letterboxSavePulse }"
        aria-hidden="true"
      />
      <span class="nle-letterbox-count">{{ wordCount }} words</span>
    </div>
    </div>

    <Teleport to="body">
    <CommandMenu
      class="nle-chrome"
      :class="teleportThemeClass"
      :show="showCommandMenu"
      :position="commandMenuPosition"
      :options="commandOptions"
      :selected-index="commandSelectedIndex"
      :listbox-id="commandListboxId"
      :option-id="commandOptionId"
      @select="handleCommandOption"
      @dismiss="showCommandMenu = false"
    />
    </Teleport>

    <WritingSearch
      v-if="writingMode"
      ref="writingSearchRef"
      :show="showFindReplaceModal"
      :content="htmlContent"
      :editor="editorContent"
      :readonly="readonly"
      :initially-replace="writingSearchInitiallyReplace"
      :find="handleFind"
      :replace="handleReplace"
      :replace-all="handleReplaceAll"
      :clear="clearFindHighlight"
      @close="closeWritingSearch"
    />
    <!-- Editor and Preview Panels -->
    <div class="nle-document-workspace" :class="{ 'has-writing-search': writingMode && showFindReplaceModal }">
    <EditorPanels
      :id="mainLandmarkId"
      ref="editorPanelsRef"
      :view-mode="viewMode"
      :editable="!readonly"
      :command-menu-open="surfacePopup.open"
      :command-listbox-id="surfacePopup.listboxId"
      :command-active-option-id="surfacePopup.activeOptionId"
      :placeholder="placeholder"
      :code-content="codeContent"
      :html-content="htmlContent"
      :split-right-mode="splitRightMode"
      @input="onInput"
      @paste="onPaste"
      @drop="onDrop"
      @dragstart="onDragStart"
      @dragend="onDragEnd"
      @blur="onBlur"
      @focus="onFocus"
      @mousedown="onEditorMousedown"
      @mouseup="onMouseUp"
      @contextmenu="handleContextMenu"
      @code-input="onCodeInput"
      @code-blur="onCodeBlur"
      @split-right-mode-change="handleSplitRightModeChange"
      @split-editor-input="onSplitEditorInput"
    />
    <WritingCompanion
      v-if="writingMode && companionOpen && viewMode === 'editor'"
      v-show="!showFindReplaceModal"
      :review="writingReview"
      :dismissed-notes="dismissedWritingNotes"
      :start-note-id="writingReviewStart"
      :readonly="readonly"
      @review-kept="reviewKeptWritingNotes"
      @close="closeCompanion"
      @leave="companionOpen = false"
      @locate="locateWritingNote"
      @apply="applyWritingNote"
      @dismiss="dismissWritingNote"
      @navigate="navigateWritingBlock"
    />
    </div>

    <!-- Word Count Footer. Hidden while the toolbar docks at the bottom —
         two stacked bottom bands duplicated the word count (the dock's
         letterbox band carries it while writing). -->
    <EditorFooter
      v-if="effectiveToolbarPosition !== 'bottom'"
      :id="footerLandmarkId"
      :word-count="wordCount"
      :character-count="characterCount"
      :full-width="isFullWidth"
      :writing-mode="writingMode"
      :companion-open="companionOpen && viewMode === 'editor'"
      :writing-note-count="writingReview.notes.filter(note => !dismissedWritingNotes.has(note.id)).length"
      :enable-comments="enableComments"
      :enable-variables="enableVariables && !readonly"
      :comments-open="showCommentsSidebar"
      :variables-open="showVariablesPanel"
      @toggle-companion="toggleCompanion"
      @open-comments="showCommentsSidebar = !showCommentsSidebar"
      @open-variables="showVariablesPanel = !showVariablesPanel"
      @toggle-full-width="toggleFullWidth"
    >
      <PdfExportStatus v-if="pdfProgress" v-bind="pdfProgress" @cancel="cancelPdfExport(); performWithSelection(() => {})" />
      <SaveStatus v-if="writingMode && (!pdfProgress || saveStatus === 'error' || saveStatus === 'conflict')" :save-status="saveStatus" :is-saving="isSaving" :last-saved="lastSaved" :has-pending-changes="isDirty" :persistent-save="Boolean(props.saveHandler)" @retry-save="forceSave(sanitizeHtml(htmlContent))" />
    </EditorFooter>
    <PdfExportStatus v-if="pdfProgress && effectiveToolbarPosition === 'bottom'" v-bind="pdfProgress" @cancel="cancelPdfExport(); performWithSelection(() => {})" />

    <!-- Corner resize grip: drag (or focus + arrow keys) to size the editor so
         more text is visible. Hidden in fullscreen (fixed inset) and pill mode
         (no docked chrome). Double-click resets to the authored size. -->
    <button
      v-if="!isFullScreen && !isFocusMode && !isPillMode"
      class="nle-resize-grip"
      type="button"
      aria-label="Resize editor (drag, or use arrow keys)"
      title="Drag to resize · double-click to reset"
      @pointerdown="onResizeGripPointerdown"
      @keydown="onResizeGripKeydown"
      @dblclick="resetEditorSize"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path
          d="M11 5 5 11M11 9l-2 2"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          fill="none"
        />
      </svg>
    </button>

    <!-- Floating Toolbar -->
    <!-- Selection toolbar (bubble over selected text) — never in readonly,
         and suppressed while the mobile bottom toolbar owns the screen:
         two stacked formatting surfaces on a phone is duplicated, cramped
         UI (the bottom bar already carries the same actions). -->
    <FloatingToolbar
      :show="
        showFloatingToolbar && !readonly && !mobileBarOnScreen && !isPillMode
      "
      :actions="floatingActions"
      :boundary="editorContent"
    />

    <!-- Playhead pill (toolbarMode="pill"): the ONE floating capsule that is
         the editor's entire chrome — it morphs between ambient / home /
         selection states and travels to the selection. Replaces both the
         docked toolbar and the selection bubble while active. -->
    <PlayheadPill
      v-if="isPillMode"
      :state="pillState"
      :anchor-rect="pillAnchorRect"
      :selection-position="pillSelectionPosition"
      :format-label="letterboxFormatLabel"
      :word-count="wordCount"
      :is-saving="isSaving || letterboxSavePulse"
      :save-status="saveStatus"
      :has-pending-changes="isDirty"
      :persistent-save="Boolean(props.saveHandler)"
      :inline-actions="floatingActions"
      :format-items="formatDropdownItems"
      :insert-items="insertDropdownItems"
      :overflow-items="pillOverflowItems"
      :alignment-items="alignmentDropdownItems"
      :size-items="fontSizeDropdownItems"
      :list-actions="listActions"
      :text-color-presets="pillTextColorPresets"
      :highlight-color-presets="pillHighlightColorPresets"
      :text-color="textColor"
      :background-color="backgroundColor"
      :theme="teleportThemeClass"
      @remember-selection="rememberSelectionBase"
      @expand="restoreChrome"
      @text-color-change="handleTextColor"
      @background-color-change="handleBackgroundColor"
      @menu-open-change="playheadMenuOpen = $event"
    />

    <!-- Mobile bottom toolbar (self-hides on non-touch/desktop; off in
         readonly). Because it teleports to <body>, `visible` is driven by
         focus/last-interaction ownership: only the instance the user is
         working in shows a toolbar, so multi-editor pages never stack N
         identical fixed bars. -->
    <MobileToolbar
      :writing-mode="writingMode"
      :visible="mobileToolbarVisible && !readonly"
      :is-active="mobileIsActive"
      :editor-root="rootEl"
      @action="handleMobileAction"
      @close="mobileToolbarClosed = true"
    />

    <!-- History Timeline panel (toggled from the Tools dropdown). A labelled
         REGION, not a dialog: the panel is non-modal (the page stays
         interactive and it traps nothing), and `role="dialog"` would also
         collide with the e2e specs that locate modals by [role="dialog"].
         tabindex="-1" so opening can move focus here — the Tools item that
         launched it is destroyed by the dropdown close. #R23-26 -->
    <div
      v-if="showHistoryTimeline"
      ref="historyPanelRef"
      class="history-timeline-panel"
      role="region"
      aria-label="History timeline"
      tabindex="-1"
    >
      <HistoryTimeline
        :history="timelineEntries"
        :current-index="historyIndex"
        :can-go-back="historyIndex > 0"
        :can-go-forward="historyIndex < history.length - 1"
        :has-history="history.length > 0"
        :history-size="history.length"
        :timeline-progress="timelineProgress"
        @go-to-entry="jumpToHistory"
        @go-back="undo"
        @go-forward="redo"
        @go-to-first="jumpToHistory(0)"
        @go-to-latest="jumpToHistory(history.length - 1)"
        @clear="handleClearHistory"
        @export="handleExportHistory"
      />
    </div>

    <!-- Context Menu -->
    <ContextMenu
      :show="showContextMenu"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      :theme="teleportThemeClass"
      @close="closeContextMenu"
    />

    <!-- Modals Container -->
    <ModalsContainer
      :inline-save="writingMode"
      :theme="teleportThemeClass"
      :owns-fixed-chrome="ownsFixedChrome"
      :show-table-modal="showTableModal"
      :show-find-replace-modal="showFindReplaceModal && !writingMode"
      :show-code-block-modal="showCodeBlockModal"
      :show-table-designer="showTableDesigner"
      :show-table-properties-modal="showTablePropertiesModal"
      :show-emoji-picker="showEmojiPicker"
      :show-link-modal="showLinkModal"
      :link-context="linkContext"
      :show-image-upload-modal="showImageUploadModal"
      :show-embed-modal="showEmbedModal"
      :show-file-manager-modal="showFileManagerModal"
      :show-template-modal="showTemplateModal"
      :show-html-code-modal="showHtmlCodeModal"
      :show-command-palette="showCommandPalette"
      :show-toast="showToast"
      :is-saving="isSaving"
      :editor-content="editorContent?.innerHTML || ''"
      :table-designer-position="tableDesignerPosition"
      :table-properties-mode="tablePropertiesMode"
      :initial-cell-props="initialCellProps"
      :initial-table-props="initialTableProps"
      :formatted-html-content="
        showHtmlCodeModal ? formatHtml(htmlContent || editorContent?.innerHTML || '') : ''
      "
      :command-palette-commands="commandPaletteCommands"
      :recent-command-ids="recentCommands"
      :last-saved="lastSaved"
      :save-status="saveStatus"
      :toast-message="toastMessage"
      :has-pending-changes="isDirty"
      :persistent-save="Boolean(props.saveHandler)"
      :toast-type="toastType"
      @retry-save="forceSave(sanitizeHtml(htmlContent))"
      @close-table-modal="closeTableModal"
      @insert-table="handleInsertTable"
      @close-find-replace-modal="closeFindReplaceModal"
      @find="handleFind"
      @replace="handleReplace"
      @replace-all="handleReplaceAll"
      @close-code-block-modal="closeCodeBlockModal"
      @insert-code-block="handleInsertCodeBlock"
      @add-row-above="handleAddRowAbove"
      @add-row-below="handleAddRowBelow"
      @add-column-left="handleAddColumnLeft"
      @add-column-right="handleAddColumnRight"
      @remove-row="handleRemoveRow"
      @remove-column="handleRemoveColumn"
      @cell-properties="handleCellProperties"
      @table-properties="handleTableProperties"
      @delete-table="handleDeleteTable"
      @close-table-properties-modal="closeTablePropertiesModal"
      @apply-table-properties="handleApplyTableProperties"
      @close-emoji-picker="showEmojiPicker = false"
      @insert-emoji="handleInsertEmoji"
      @close-link-modal="closeLinkModal"
      @insert-link="handleInsertLink"
      @close-image-upload-modal="closeImageUploadModal"
      @insert-image="handleInsertImage"
      @close-embed-modal="closeEmbedModal"
      @insert-embed="handleInsertEmbed"
      @close-file-manager-modal="closeFileManagerModal"
      @insert-file="handleInsertFile"
      @close-template-modal="closeTemplateModal"
      @select-template="handleSelectTemplate"
      @close-html-code-modal="closeHtmlCodeModal"
      @close-command-palette="closeCommandPalette"
      @execute-command="handleCommandExecute"
    />

    <!-- Keyboard shortcuts help (registry-backed). Shows only the shortcuts
         actually wired to editor actions (the registry auto-disables the rest). -->
    <ShortcutHelpModal
      :is-open="showShortcutHelpModal"
      :registry="advancedKeyboard.registry"
      @close="closeShortcutHelpModal"
    />

    <!-- Writing Stats Panel (opt-in feature) -->
    <!-- Fixed to the same corner as the FAB column, so it follows the same
         ownership: a panel left open must not float over the OTHER editor's
         FABs after a handover (#R24-7). Ownership uses v-show, not v-if — a
         handover must HIDE the panel, not destroy it: the user's collapse
         state has to survive the bounce. #R25-6 -->
    <WritingStatsPanel
      v-if="showWritingStats && writingAssistant && showWritingStatsPanel"
      v-show="ownsFixedChrome"
      :stats="writingAssistant.stats.value"
      :readability="writingAssistant.readability.value"
      :sentence-analysis="writingAssistant.sentenceAnalysis.value"
      :word-analysis="writingAssistant.wordAnalysis.value"
      :issues="writingAssistant.issues.value"
      :seo="writingAssistant.seo.value"
      @close="showWritingStatsPanel = false"
    />

    <!-- Comments Sidebar (opt-in feature) -->
    <CommentsSidebar
      v-if="enableComments && comments"
      ref="commentsSidebarRef"
      :threads="comments.threads.value"
      :active-thread-id="comments.activeThread.value?.id ?? null"
      :is-open="showCommentsSidebar"
      :mention-search="mentionSearch"
      @close="closeCommentsSidebar"
      @select-thread="handleSelectThread"
      @resolve-thread="handleResolveThread"
      @reopen-thread="handleReopenThread"
      @delete-thread="handleDeleteThread"
      @add-reply="handleAddReply"
      @create-comment="handleCreateComment"
    />

    <!-- Shared confirmation for destructive actions -->
    <ConfirmDialog
      :is-open="confirmDialogOpen"
      :title="confirmDialogOptions.title"
      :message="confirmDialogOptions.message"
      :confirm-label="confirmDialogOptions.confirmLabel"
      :cancel-label="confirmDialogOptions.cancelLabel"
      :danger="confirmDialogOptions.danger"
      @confirm="confirmDialogAccept"
      @cancel="confirmDialogCancel"
    />

    <!-- Comment Modal (opt-in feature) -->
    <CommentModal
      v-if="enableComments && comments"
      :is-open="showCommentModal"
      :selected-text="selectedTextForComment"
      :mention-search="mentionSearch"
      @submit="handleCommentSubmit"
      @cancel="handleCommentCancel"
    />

    <!-- Variable Autocomplete (opt-in feature) -->
    <VariableAutocomplete
      v-if="enableVariables && variablesComposable"
      ref="variableAutocompleteRef"
      :variables="variablesComposable.variables.value"
      :categories="variablesComposable.categories.value"
      :query="variableAutocompleteQuery"
      :is-open="showVariableAutocomplete"
      :position="variableAutocompletePosition"
      @select="handleVariableSelect"
      @close="closeVariableAutocomplete"
    />

    <!-- Comments Toggle FAB (opt-in feature). `ownsFixedChrome` gates the whole
         fixed column: see useFloatingChromeOwner. #R23-30 -->
    <Transition name="fab-fade">
      <button
        v-if="!writingMode && enableComments && !showCommentsSidebar && comments && ownsFixedChrome"
        class="comments-toggle-fab"
        aria-label="Open comments"
        title="Open comments"
        @click="showCommentsSidebar = true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span
          v-if="comments.threads.value.some((t) => t.status === 'open')"
          class="comments-toggle-badge"
        >
          {{ comments.threads.value.filter((t) => t.status === "open").length }}
        </span>
      </button>
    </Transition>

    <!-- Writing Stats Toggle FAB (opt-in feature) -->
    <Transition name="fab-fade">
      <button
        v-if="!writingMode && showWritingStats && writingAssistant && ownsFixedChrome"
        class="writing-stats-toggle-fab"
        :aria-label="
          showWritingStatsPanel
            ? 'Hide writing statistics'
            : 'Show writing statistics'
        "
        :aria-expanded="showWritingStatsPanel"
        :title="
          showWritingStatsPanel
            ? 'Hide writing statistics'
            : 'Show writing statistics'
        "
        @click="showWritingStatsPanel = !showWritingStatsPanel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3v18h18M7 16l4-6 4 4 4-7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>

    <!-- Variables Toggle FAB (opt-in feature) -->
    <Transition name="fab-fade">
      <button
        v-if="!writingMode && enableVariables && variablesComposable && !readonly && ownsFixedChrome"
        class="variables-toggle-fab"
        :style="{
          bottom: `calc(${variablesFabBottom}px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px))`,
        }"
        aria-label="Toggle variables panel"
        :aria-expanded="showVariablesPanel"
        :title="showVariablesPanel ? 'Hide variables' : 'Show variables'"
        @click="showVariablesPanel = !showVariablesPanel"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M9 4C7.5 4 7 5 7 6.5V9c0 1.5-1 2.3-2.2 2.6v.8C6 12.7 7 13.5 7 15v2.5C7 19 7.5 20 9 20M15 4c1.5 0 2 1 2 2.5V9c0 1.5 1 2.3 2.2 2.6v.8C18 12.7 17 13.5 17 15v2.5c0 1.5-.5 2.5-2 2.5"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </Transition>

    <!-- Variables Panel (opt-in feature): browse all template variables with
         their current values and insert one at the caret with a click. -->
    <Transition name="fab-fade">
      <div
        v-if="
          enableVariables &&
          variablesComposable &&
          showVariablesPanel &&
          !readonly &&
          ownsFixedChrome
        "
        class="variables-panel"
        :style="{
          bottom: `calc(${variablesFabBottom + 64}px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px))`,
        }"
        role="region"
        aria-label="Template variables"
      >
        <div class="variables-panel-header">
          <span class="variables-panel-title">Variables</span>
          <button
            class="variables-panel-close"
            aria-label="Close variables panel"
            @click="showVariablesPanel = false"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
        <div class="variables-panel-list">
          <template
            v-for="category in variablesComposable.categories.value"
            :key="category.id"
          >
            <div
              v-if="
                variablesComposable.getVariablesByCategory(category.id).length
              "
              class="variables-panel-category"
            >
              {{ category.name }}
            </div>
            <button
              v-for="variable in variablesComposable.getVariablesByCategory(
                category.id
              )"
              :key="variable.id"
              class="variables-panel-item"
              :title="variable.description"
              @mousedown.prevent
              @click="handlePanelInsert(variable)"
            >
              <span class="variables-panel-item-name">{{
                variable.name
              }}</span>
              <!-- Resolved, not stored: date/time variables compute live, so
                   the preview must match what insertion produces. #R23-65 -->
              <span class="variables-panel-item-value">{{
                variablesComposable.resolveVariableValue(variable)
              }}</span>
            </button>
          </template>
          <template v-if="uncategorizedVariables.length">
            <div class="variables-panel-category">Other</div>
            <button
              v-for="variable in uncategorizedVariables"
              :key="variable.id"
              class="variables-panel-item"
              :title="variable.description"
              @mousedown.prevent
              @click="handlePanelInsert(variable)"
            >
              <span class="variables-panel-item-name">{{
                variable.name
              }}</span>
              <!-- Resolved, not stored: date/time variables compute live, so
                   the preview must match what insertion produces. #R23-65 -->
              <span class="variables-panel-item-value">{{
                variablesComposable.resolveVariableValue(variable)
              }}</span>
            </button>
          </template>
        </div>
        <div class="variables-panel-footer">
          Click a variable to insert it at the cursor
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  toRef,
  unref,
  nextTick,
  onMounted,
  onUnmounted,
  toRaw,
  watch,
  watchEffect,
} from "vue";
import { useStableId } from "../utils/useStableId";
import WritingCompanion from './WritingCompanion.vue';
import WritingSearch from './WritingSearch.vue';
import SaveStatus from './SaveStatus.vue';
import PdfExportStatus from './PdfExportStatus.vue';
import { useWritingWorkspace } from '../composables/useWritingWorkspace';
import { useClipboardPaste, type ClipboardPasteInput } from '../composables/useClipboardPaste';
import { writingBlocks, writingNoteRange, writingNoteNearSelection, type WritingNote } from '../utils/writingReview';
import { keepSelectionVisible, preserveVisibleSelection } from '../utils/caretVisibility';
import { useWritingReflow } from '../composables/useWritingReflow';

import {
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
} from "../utils/commands";
import { smoothScrollIntoView } from "../utils/scroll";
import {
  checklistItemForCheckboxClick,
  checklistItemForNode,
  toggleChecklistItem,
} from "../utils/checklist";
import { clampMenuToViewport } from "../utils/menuPosition";
import { getCaretDocumentProgress } from "../utils/caretProgress";
import {
  pickImageFile,
  hasFileTransfer,
  htmlHasVisibleContent,
  htmlHasStructure,
  isInsertableImage,
  readFileAsDataUrl,
} from "../utils/clipboardImage";
import { reconstructWordLists } from "../utils/wordPaste";
import { initializeEmbeddedElements } from "../utils/embeddedResizable";
import { nextInstanceToken } from "../utils/instanceToken";
import {
  computeToolbarPosition,
  ESTIMATED_WIDTH as PILL_ESTIMATED_WIDTH,
} from "../utils/floatingToolbarPosition";
import PlayheadPill from "./PlayheadPill.vue";
import type {
  PlayheadState,
  PlayheadAnchorRect,
  PlayheadSelectionPosition,
} from "./PlayheadPill.types";
import { useChromeRecede } from "../composables/useChromeRecede";
import { useFloatingChromeOwner } from "../composables/useFloatingChromeOwner";
import { useWidthHysteresis } from "../composables/useWidthHysteresis";
import { selectionTick } from "../composables/useActiveStates";
import { useDeviceDetection } from "../composables/useDeviceDetection";
import { useTheme } from "../composables/useTheme";
import { useAutoSave } from "../composables/useAutoSave";
import { usePendingSaveGuard } from "../composables/usePendingSaveGuard";
import { useSmartToolbar } from "../composables/useSmartToolbar";
import { useEditorContent } from "../composables/useEditorContent";
import { useKeyboardShortcuts } from "../composables/useKeyboardShortcuts";
import { useAdvancedKeyboardShortcuts } from "../composables/useAdvancedKeyboardShortcuts";
import { useAccessibility } from "../composables/useAccessibility";
import { useEditorSetup } from "../composables/useEditorSetup";
import { useToolbarItems } from "../composables/useToolbarItems";
import { editorThemeClass } from "../composables/useEditorThemes";
import { useActiveStates } from "../composables/useActiveStates";
import { useSelection } from "../composables/useSelection";
import { useModals } from "../composables/useModals";
import { useFormattingActions } from "../composables/useFormattingActions";
import { useInsertActions } from "../composables/useInsertActions";
import { useContextMenu } from "../composables/useContextMenu";
import { useViewMode } from "../composables/useViewMode";
import { useFloatingToolbar } from "../composables/useFloatingToolbar";
import { useEditorUIState } from "../composables/useEditorUIState";
import { useTableActions } from "../composables/useTableActions";
import { useExportActions } from "../composables/useExportActions";
import { useCommandPaletteCommands } from "../composables/useCommandPaletteCommands";
import { useFindReplace } from "../composables/useFindReplace";
import { useEditorComputed } from "../composables/useEditorComputed";
import { useEditorResize } from "../composables/useEditorResize";
import { useSpellCheck } from "../composables/useSpellCheck";
import { useTemplateManager } from "../composables/useTemplateManager";
import { useConfirmDialog } from "../composables/useConfirmDialog";
import {
  useEditorEvents,
  coalesceKeyForInputEvent,
} from "../composables/useEditorEvents";
import { useFormattingHandlers } from "../composables/useFormattingHandlers";
import { hasFormatCopied, clearCopiedFormat } from "../utils/formatPainter";
import { clearFormatting } from "../utils/formatting";
import { formatHtml } from "../utils/export";
import { useCommandPalette } from "../composables/useCommandPalette";
import { useSlashCommands } from "../composables/useSlashCommands";
import FloatingToolbar from "./FloatingToolbar.vue";
import MobileToolbar from "./MobileToolbar.vue";
import HistoryTimeline from "./HistoryTimeline.vue";
import ContextMenu from "./ContextMenu.vue";
import ModalsContainer from "./ModalsContainer.vue";
import ShortcutHelpModal from "./ShortcutHelpModal.vue";
import EditorToolbar from "./EditorToolbar.vue";
import EditorPanels from "./EditorPanels.vue";
import EditorFooter from "./EditorFooter.vue";
import CommandMenu from "./CommandMenu.vue";
import SkipLinks from "./SkipLinks.vue";
import AriaLiveRegion from "./AriaLiveRegion.vue";
import WritingStatsPanel from "./WritingStatsPanel.vue";
import CommentsSidebar from "./CommentsSidebar.vue";
import CommentModal from "./CommentModal.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import VariableAutocomplete from "./VariableAutocomplete.vue";
import { useWritingAssistant } from "../composables/useWritingAssistant";
import { useComments } from "../composables/useComments";
import { getCaretOffsets, setCaretOffsets, type CaretOffsets } from "../utils/caretOffset";
import { captureSelectionBookmark } from "../utils/selectionBookmark";
import { useVariables, type Variable } from "../composables/useVariables";
import { usePlugin } from "../composables/usePlugin";
import { useSmartAutocomplete } from "../composables/useSmartAutocomplete";
import type {
  NextLevelEditorProps,
  NextLevelEditorEmits,
} from "./NextLevelEditor.types";

const props = withDefaults(defineProps<NextLevelEditorProps>(), {
  modelValue: "",
  placeholder: "Start typing...",
  width: undefined,
  height: undefined,
  showWritingStats: false,
  enableComments: false,
  mentionSearch: undefined,
  themePreset: "default",
  toolbarLayout: "comfortable",
  writingMode: false,
  // Default to a rock-solid static bar: the toolbar never dissolves into the
  // ambient letterbox band while you write, and never reshuffles because of
  // scrolling. letterbox/recede remain fully available as an opt-in prop for
  // hosts that want the cinematic chrome.
  adaptiveChrome: "off",
  toolbarPosition: "top",
  toolbarMode: "bar",
  readonly: false,
  showToolbar: true,
  defaultViewMode: "editor",
  autofocus: false,
});

const emit = defineEmits<NextLevelEditorEmits>();

// Whole-editor theme preset → root class (composes with the light/dark class).
const themePresetClass = computed(() => editorThemeClass(props.themePreset));

// Teleported chrome (modals, context menu) renders outside the editor root,
// so it must carry BOTH the light/dark class AND the theme-preset class —
// the preset token files key off the preset class, and without it a Warm or
// Midnight editor opened slate/white dialogs. (themeClass is defined by
// useEditorComputed below; computeds are lazy so the forward reference is
// safe by first render.)
const teleportThemeClass = computed(() =>
  [themeClass.value, themePresetClass.value].filter(Boolean).join(" ")
);

// Per-instance landmark ids for the accessibility skip links. Derived from a
// unique base (Vue 3.5 useId when available, else a feature-detected fallback —
// a static useId import would break the vue ^3.3 peer range) so the skip-link
// targets never collide with the host page or a second editor on the page.
const landmarkBaseId = useStableId();
const toolbarLandmarkId = `${landmarkBaseId}-toolbar`;
const mainLandmarkId = `${landmarkBaseId}-main`;
const footerLandmarkId = `${landmarkBaseId}-footer`;

const editorPanelsRef = ref<InstanceType<typeof EditorPanels> | null>(null);
const editorToolbarRef = ref<InstanceType<typeof EditorToolbar> | null>(null);

// This instance's root element — the ownership scope for document-level
// listeners (e.g. the selection toolbar's selectionchange handling).
const rootEl = ref<HTMLElement | null>(null);

// Auto-compact: the CSS @container fallback can only restyle the bar — it
// cannot flip EditorToolbar's mini/expand JS state, so on a default
// 'comfortable' phone the intended mini → expand → ⋯More flow never
// activated. Observe the toolbar shell's width and derive the layout;
// the @container block stays as the no-JS fallback with matching styles.
const toolbarShellEl = ref<HTMLElement | null>(null);
const toolbarShellWidth = ref(Number.POSITIVE_INFINITY);
const toolbarShellHeight = ref(0);
let toolbarShellObserver: ResizeObserver | null = null;
watch(toolbarShellEl, (el) => {
  toolbarShellObserver?.disconnect();
  toolbarShellObserver = null;
  if (el && typeof ResizeObserver !== "undefined") {
    toolbarShellObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      // Defer the reactive write out of the observer's delivery cycle: the
      // layout flip it triggers (mini <-> full) resizes the shell in the same
      // frame, which otherwise raises the window-level "ResizeObserver loop
      // completed with undelivered notifications" error in WebKit/Blink.
      if (rect && rect.width !== toolbarShellWidth.value) {
        requestAnimationFrame(() => {
          toolbarShellWidth.value = rect.width;
        });
      }
      if (rect && rect.height !== toolbarShellHeight.value) {
        requestAnimationFrame(() => {
          toolbarShellHeight.value = rect.height;
        });
      }
    });
    toolbarShellObserver.observe(el);
  }
});
onUnmounted(() => {
  toolbarShellObserver?.disconnect();
  toolbarShellObserver = null;
});

// Root width drives the toolbarPosition fallback. The SHELL width cannot:
// in left-rail mode the shell is a ~48px column, which would read as
// "phone" forever. Same deferred-write pattern as the shell observer.
const rootWidth = ref(Number.POSITIVE_INFINITY);
let rootObserver: ResizeObserver | null = null;
watch(rootEl, (el) => {
  rootObserver?.disconnect();
  rootObserver = null;
  if (el && typeof ResizeObserver !== "undefined") {
    rootObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width != null && width !== rootWidth.value) {
        requestAnimationFrame(() => {
          rootWidth.value = width;
        });
      }
    });
    rootObserver.observe(el);
  }
});
onUnmounted(() => {
  rootObserver?.disconnect();
  rootObserver = null;
});

// Every non-top position is a desktop arrangement. Fall back to the classic
// top bar below the breakpoint AND whenever the device says the mobile
// bottom toolbar owns the screen — the two breakpoints differ (root 640px vs
// device 768px), and between them a bottom dock and the mobile bar would
// both claim the bottom edge. (deviceShowsMobileToolbar is declared later
// in setup; computeds are lazy, so the forward reference is safe.)
const effectiveToolbarPosition = computed(() =>
  props.writingMode || rootWidth.value <= 640 || deviceShowsMobileToolbar.value
    ? "top"
    : props.toolbarPosition
);

// Playhead: one floating capsule replaces both the docked toolbar and the
// selection bubble. Desktop-only (bar below the breakpoint / when the mobile
// bar owns the screen); while active, toolbarPosition/adaptiveChrome are
// inert — the pill has its own grammar. The pill needs an editable WYSIWYG
// surface: in code/preview views the docked bar returns (it carries the
// view-mode switch, which the pill deliberately doesn't).
const effectiveToolbarMode = computed(() =>
  props.writingMode || rootWidth.value <= 640 || deviceShowsMobileToolbar.value
    ? "bar"
    : props.toolbarMode
);
const isPillMode = computed(
  () =>
    effectiveToolbarMode.value === "pill" &&
    props.showToolbar &&
    !props.readonly &&
    (viewMode.value === "editor" || viewMode.value === "split")
);
const isZen = computed(() => effectiveToolbarPosition.value === "zen");

// Bottom-dock clearance: like the MobileToolbar, the desktop dock publishes
// its measured on-screen height so the FAB column and bottom-anchored
// panels rise above it instead of being buried under a full-width z-9999
// bar (the audit's "dock swallows the FABs").
watchEffect(() => {
  const el = rootEl.value;
  if (!el) return;
  const clearance =
    effectiveToolbarPosition.value === "bottom" && !isPillMode.value
      ? `${Math.round(toolbarShellHeight.value)}px`
      : "0px";
  el.style.setProperty("--nle-bottom-dock-clearance", clearance);
});
// Zen IS the letterbox, permanently — it overrides adaptiveChrome="off".
const effectiveAdaptiveChrome = computed(() =>
  props.writingMode ? 'off' : isZen.value ? "letterbox" : props.adaptiveChrome
);

// Auto-compact with hysteresis. A single threshold at 640px made the toolbar
// oscillate comfortable<->compact whenever the shell width hovered near the
// breakpoint (a panel opening, a resize drag) — the exact "toolbar keeps
// switching" churn we're killing. Two thresholds with a dead band fix it:
// shrink INTO compact at <=640, but only grow BACK to comfortable once past a
// small margin (>=672). The band is kept tight (32px): ResizeObserver jitter is
// sub-pixel and the compact flip doesn't itself change the shell width, so a
// narrow band is enough to stop oscillation — while a WIDE band (e.g. 720)
// would strand an editor whose natural resting width is 641-719px in compact
// after any transient dip below 640. Same 640px enter-point as the @container
// fallback in NextLevelEditor.css.
const COMPACT_ENTER_PX = 640;
const COMPACT_EXIT_PX = 672;
const autoCompact = useWidthHysteresis(
  toolbarShellWidth,
  COMPACT_ENTER_PX,
  COMPACT_EXIT_PX
);

// The left rail always runs the compact/mini mechanics — collapsed rail =
// mini essentials, expand = the floating panel of everything else.
const effectiveToolbarLayout = computed(() =>
  props.toolbarLayout === "compact" ||
  effectiveToolbarPosition.value === "left" ||
  autoCompact.value
    ? "compact"
    : props.toolbarLayout
);

// View-mode state is declared early so the active-editable computed below can
// close over it (the refs are passed into useViewMode further down). Starts in
// the caller's preferred view.
const viewMode = ref<"editor" | "code" | "split" | "preview">(
  props.defaultViewMode
);
const splitRightMode = ref<"preview" | "editor">("preview");

// The ACTIVE editable surface. In split view with the right pane in editor
// mode, the visible surface is splitEditorRef — the classic editorRef is a
// display:none div there, and a hidden element cannot host a selection, so
// every toolbar/formatting action silently no-opped in that mode. [#23]
const editorContent = computed(() => {
  const panels = editorPanelsRef.value;
  if (!panels) return null;
  if (viewMode.value === "split" && splitRightMode.value === "editor") {
    return panels.splitEditorRef || panels.editorRef || null;
  }
  return panels.editorRef || null;
});

// Smart autocomplete engine (markdown shortcuts, URL/email auto-link, curly
// quotes, smart punctuation). Invoked from the wrapped onInput below. [#1]
const { handleInput: handleSmartAutocomplete } =
  useSmartAutocomplete(editorContent);

// Selection management using composable
const { rememberSelection: rememberSelectionBase, performWithSelection } =
  useSelection(editorContent);

// Extend rememberSelection to hide floating toolbar
const rememberSelection = () => {
  rememberSelectionBase();
  // Hide floating toolbar when interacting with main toolbar to prevent pointer event interference
  showFloatingToolbar.value = false;
};

// Main-toolbar mousedown handler: SUPPRESS the bubble (not just hide it), so a
// later selectionchange can't re-show it on top of an open dropdown menu where
// it would intercept clicks on the menu items. Suppression lifts on the next
// editor interaction (mouseup/focus). Kept separate from rememberSelection,
// which is also invoked internally on editor focus/blur.
const rememberSelectionFromToolbar = () => {
  rememberSelectionBase();
  suppressFloatingToolbar();
};

// Theme and UI state using composable
const { theme, toggleTheme: toggleThemeComposable } = useTheme();

// Accessibility (WCAG AAA). Capture announce() — it writes to the shared
// aria-live queue that the rendered <AriaLiveRegion> reads, so calling it here
// speaks feedback to screen readers. Previously the return was discarded and
// no editor action produced any spoken feedback. [a11y]
const { announce } = useAccessibility();

// Writing Assistant (opt-in feature) - local state for toggle
const showWritingStatsPanel = ref(false);
const writingToolActions = computed(() => props.showWritingStats ? [{
  id: 'writing-statistics', label: 'Writing statistics', tooltip: 'Readability, word analysis, and SEO',
  onClick: () => { showWritingStatsPanel.value = !showWritingStatsPanel.value; },
}] : []);

// History Timeline panel visibility (toggled from the Tools dropdown). [#14]
const showHistoryTimeline = ref(false);

// Focus follows the panel: the Tools menu item that opened it is destroyed when
// the dropdown closes, so without this focus fell to <body> and the panel's own
// controls were only reachable by Tab-ing from the top of the page. On close,
// hand focus back to whatever had it before. #R23-26
const historyPanelRef = ref<HTMLElement | null>(null);
let historyPanelReturnFocus: HTMLElement | null = null;

watch(showHistoryTimeline, (open) => {
  if (open) {
    const active = document.activeElement;
    historyPanelReturnFocus =
      active instanceof HTMLElement && active !== document.body ? active : null;
    nextTick(() => historyPanelRef.value?.focus());
    return;
  }
  const target = historyPanelReturnFocus;
  historyPanelReturnFocus = null;
  // Only reclaim focus if the panel still holds it — if something else took
  // focus meanwhile (a click elsewhere), leave it there.
  const active = document.activeElement;
  const insidePanel = historyPanelRef.value?.contains(active as Node) ?? false;
  if (!insidePanel && active && active !== document.body) return;
  nextTick(() => {
    if (target?.isConnected) target.focus();
    else editorContent.value?.focus();
  });
});
const writingAssistant = props.showWritingStats ? useWritingAssistant() : null;

// SkipLinks takes a `label` for exactly this reason — its own doc comment says
// two editors would otherwise expose two navigation landmarks both named
// "Skip links", indistinguishable in a screen reader's landmark list — and
// nothing ever passed one. The ordinal is globally unique, so it also survives
// two editors mounted as separate Vue apps. #R23-57
const skipLinksLabel = `Skip links ${nextInstanceToken("nle-skip").split("-").pop()}`;

// The stats panel used to refresh from `onInput` ONLY, so any path that
// REPLACES innerHTML without typing (undo/redo, loading a model, Replace All)
// left it showing pre-replacement counts — while the footer counter beside it
// showed the new ones. Two visible counters disagreeing, forever. #R22-STATS-2
const refreshWritingStats = () => {
  if (!writingAssistant || !editorContent.value) return;
  writingAssistant.scheduleContentUpdate(editorContent.value.innerHTML);
};

// Comments System (opt-in feature)
const comments = props.enableComments
  ? useComments({
      editorElement: editorContent as any,
      currentUser: {
        id: "current-user",
        name: "Current User",
        color: "#3b82f6",
      },
      // Route @mention lookups through the host-supplied provider. [#4]
      onMentionTriggered: props.mentionSearch
        ? async (query: string) => props.mentionSearch!(query)
        : undefined,
      onThreadActivated: handleThreadActivation,
    })
  : (null as ReturnType<typeof useComments> | null);

// Comments UI state
const showCommentsSidebar = ref(false);
const commentsSidebarRef = ref<InstanceType<typeof CommentsSidebar> | null>(null);
const showCommentModal = ref(false);
const selectedTextForComment = ref("");
let commentsReturnSelection: {
  offsets: CaretOffsets;
  text: string;
  backwards: boolean;
  bookmark: ReturnType<typeof captureSelectionBookmark>;
} | null = null;
function rememberCommentsPosition() {
  const root = editorContent.value;
  const offsets = root && getCaretOffsets(root);
  const selection = root?.ownerDocument.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  commentsReturnSelection = root && offsets && range ? {
    offsets,
    bookmark: captureSelectionBookmark(root),
    text: root.textContent || '',
    backwards: !range.collapsed && selection?.anchorNode === range.endContainer
      && selection.anchorOffset === range.endOffset,
  } : null;
}
watch(showCommentsSidebar, open => {
  // A newly submitted comment already saved its position before opening the
  // modal. Its highlight/sanitization can invalidate the original DOM Range.
  if (open && !showCommentModal.value) rememberCommentsPosition();
}, { flush: 'sync' });
function closeCommentsSidebar() {
  const position = commentsReturnSelection;
  commentsReturnSelection = null;
  showCommentsSidebar.value = false;
  nextTick(() => {
    performWithSelection(root => {
      // Comment metadata changes preserve text. A different document, or prose
      // edited while the panel was open, must not receive an old text offset.
      if (!position || root.textContent !== position.text) return;
      // Text offsets cannot distinguish an empty paragraph or a boundary
      // outside emphasis. Prefer surviving DOM points, but reject clamped
      // points when comment markup has split their original text nodes.
      if (position.bookmark?.restore()) {
        const restored = getCaretOffsets(root);
        if (restored?.start === position.offsets.start && restored.end === position.offsets.end) return;
      }
      if (setCaretOffsets(root, position.offsets) && position.backwards) {
        const selection = root.ownerDocument.getSelection();
        const range = selection?.getRangeAt(0);
        if (range && selection?.setBaseAndExtent) selection.setBaseAndExtent(
          range.endContainer, range.endOffset, range.startContainer, range.startOffset,
        );
      }
    });
    keepSelectionVisible(editorContent.value, 24);
  });
}

// Variables System (opt-in feature)
/**
 * Plugin system. The machinery existed and was well-formed but had never been
 * connected: usePlugin() was never called, setPluginContext() never ran, and
 * the toolbar/slash computeds had no consumers — so a plugin could not be
 * registered at all, despite the README and the website docs advertising it.
 * #R23-45
 */
const {
  registerPlugin,
  unregisterPlugin,
  setPluginContext,
  pluginToolbarButtons,
  pluginSlashCommands: rawPluginSlashCommands,
  pluginCommands,
  // (executeCommand deliberately not used: the palette closes over each
  // command OBJECT — lookup-by-id misfires when two plugins share an id. #R24-13)
  getRegisteredPlugin,
  plugins: registeredPlugins,
} = usePlugin();

/** Simple event bus backing PluginContext.emit / .on. */
const pluginEventHandlers = new Map<string, Array<(...a: unknown[]) => void>>();

/** Bridge the plugin SlashCommand shape onto the live menu's option shape. */
const pluginSlashCommands = computed(() =>
  rawPluginSlashCommands.value.map((command) => ({
    // Namespaced like the palette rows (#R24-13): a plugin picking a
    // guessable id ("slash-table") otherwise collides with a built-in
    // option and produces duplicate v-for :keys. #R25-10
    id: `plugin:${command.id}`,
    label: command.label,
    description: command.description ?? "",
    // The documented summon text — the filter matches it too. #R24-19
    trigger: command.trigger,
    action: command.execute,
  }))
);

// The host's variable set, when given, replaces the built-in demo fixtures.
// Passed as a toRef so a host that mutates its array (or a value inside it)
// updates the panel and the {{ autocomplete live. #R23-46
const variablesComposable = props.enableVariables
  ? useVariables({ variables: toRef(props, "variables") })
  : null;

// Variable autocomplete state
const variableAutocompleteRef = ref<InstanceType<
  typeof VariableAutocomplete
> | null>(null);
const showVariableAutocomplete = ref(false);
const variableAutocompleteQuery = ref("");
const variableAutocompletePosition = ref({ top: 0, left: 0 });

// Variables panel (FAB-toggled browse & insert surface)
const showVariablesPanel = ref(false);

// Stack the variables FAB above whichever of the comments/stats FABs are
// enabled so the FAB column has no gaps regardless of feature flags.
const variablesFabBottom = computed(() => {
  let bottom = 28;
  if (props.enableComments) bottom += 68;
  if (props.showWritingStats) bottom += 68;
  return bottom;
});

// Variables without a category (or with an unknown one) still need a home in
// the panel — they render under a trailing "Other" group.
const uncategorizedVariables = computed(() => {
  if (!variablesComposable) return [];
  const knownCategories = new Set(
    variablesComposable.categories.value.map((c) => c.id)
  );
  return variablesComposable.variables.value.filter(
    (v) => !v.category || !knownCategories.has(v.category)
  );
});

// Auto-save
const { isSaving, isDirty, lastSaved, saveStatus, triggerAutoSave, forceSave, clearHistory: resetSaveState } = useAutoSave(
  async (content: string, version: number) => {
    // With a host-provided saveHandler the "Saved" signal is TRUTHFUL: it
    // asserts real persistence and reports real failures. Without one, the
    // v-model emission IS the handoff — the host owns the content the moment
    // it is emitted — and the signal describes an update, not persistence.
    if (props.saveHandler) {
      // Let a thrown error propagate to useAutoSave.performSave's catch so the
      // real error surfaces (status 'error', lastError = the thrown error). A
      // resolved `false` is reported as a plain failure the same way.
      const ok = await props.saveHandler(content);
      return { success: ok !== false, serverVersion: version + 1 };
    }
    emit("update:modelValue", content);
    return { success: true, serverVersion: version + 1 };
  },
  { delay: 2000 } // 2 second delay
);

// Editor Content Management (replaces inline sanitization, history, and content sync)
const {
  htmlContent,
  codeContent,
  history,
  historyIndex,
  isApplyingHistory,
  applySanitizedContent,
  captureAndEmit: captureSnapshot,
  undo: undoBase,
  redo: redoBase,
  jumpToHistory,
  clearHistory,
  sanitizeHtml,
} = useEditorContent({
  onExternalUpdate: resetSaveState,
  editorContent,
  modelValue: toRef(props, "modelValue"),
  onUpdate: (value) => emit("update:modelValue", value),
  triggerAutoSave,
  // Replacing innerHTML (undo/redo, loading a saved model) drops the click
  // listeners bound to each comment highlight and leaves thread.highlightElement
  // pointing at a detached node — the highlight survived but went dead, and the
  // sidebar scrolled to nothing. restoreThreads re-binds and re-links both.
  onContentReplaced: () => {
    comments?.restoreThreads();
    refreshWritingStats();
  },
});

usePendingSaveGuard(
  () => Boolean(props.saveHandler) && isDirty.value,
  () => forceSave(sanitizeHtml(htmlContent.value))
);

const {
  review: writingReview, refresh: refreshWritingReview,
  dismissedNotes: dismissedWritingNotes, dismissNote,
  serializedDecisions: keptWritingDecisions, importDecisions: importWritingDecisions,
  revisitKeptNotes,
} = useWritingWorkspace(htmlContent, toRef(props, 'writingMode'));
useWritingReflow(editorContent, toRef(props, 'writingMode'));
const dismissWritingNote = (note: WritingNote) => {
  if (!dismissNote(note)) return;
  announce('Note dismissed. Your words are unchanged.');
  console.debug('[NextLevelEditor] Writing note dismissed', { kind: note.title });
};
const reviewKeptWritingNotes = () => {
  const count = revisitKeptNotes();
  if (!count) return;
  announce('Kept notes are ready to review again. Your words are unchanged.');
  console.debug('[NextLevelEditor] Kept writing notes reopened', { count });
};
const companionOpen = ref(false);
const writingSearchRef = ref<InstanceType<typeof WritingSearch> | null>(null);
const writingSearchInitiallyReplace = ref(false);
const closeWritingSearch = (range?: Range) => {
  closeFindReplaceModal();
  nextTick(() => {
    const root = editorContent.value;
    root?.focus({ preventScroll: true });
    if (range && root?.contains(range.startContainer) && root.contains(range.endContainer)) {
      const selection = root.ownerDocument.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    keepSelectionVisible(editorContent.value, 24);
    rememberSelectionBase();
  });
  console.debug('[NextLevelEditor] Writing search closed');
};
const writingReviewStart = ref<string>();
const startReviewNearWriting = () => {
  const root = editorContent.value;
  if (!root) return;
  writingReviewStart.value = writingNoteNearSelection(root, writingReview.value.notes.filter(note => !dismissedWritingNotes.value.has(note.id)));
};
watch(writingReview, () => {
  const root = editorContent.value;
  // New feedback follows a writing pause. Reading or navigating existing
  // notes must never move the panel out from under the writer's controls.
  if (root && root.ownerDocument.activeElement === root) startReviewNearWriting();
});
onMounted(() => {
  refreshWritingReview();
});
watch(rootWidth, (width, previousWidth) => {
  // A small resize must not dismiss notes the writer deliberately opened.
  // Only collapse the desktop sidebar when crossing into the compact layout.
  if (width >= 900 || previousWidth < 900 || !companionOpen.value) return;
  const panel = rootEl.value?.querySelector('.writing-companion');
  const hadFocus = panel?.contains(panel.ownerDocument.activeElement);
  companionOpen.value = false;
  console.debug('[NextLevelEditor] Writing companion collapsed', { reason: 'compact-layout', focusRestored: Boolean(hadFocus) });
  if (hadFocus) nextTick(() => rootEl.value?.querySelector<HTMLButtonElement>('.writing-footer-actions button')?.focus({ preventScroll: true }));
});
const toggleCompanion = () => {
  if (companionOpen.value && viewMode.value === 'editor') {
    closeCompanion();
    return;
  }
  const keepPlace = preserveVisibleSelection(editorContent.value);
  refreshWritingReview();
  startReviewNearWriting();
  viewMode.value = 'editor';
  companionOpen.value = true;
  nextTick(() => {
    keepPlace();
    rootEl.value?.querySelector<HTMLButtonElement>('.companion-tabs button')?.focus({ preventScroll: true });
  });
};
const closeCompanion = () => {
  companionOpen.value = false;
  nextTick(() => rootEl.value?.querySelector<HTMLButtonElement>('.writing-footer-actions button')?.focus());
};
const revealWritingPassage = (root: HTMLElement) => {
  const panel = rootEl.value?.querySelector('.writing-companion');
  if (panel && getComputedStyle(panel).position === 'fixed') {
    companionOpen.value = false;
    console.debug('[NextLevelEditor] Writing companion collapsed', { reason: 'passage-revealed' });
    nextTick(() => keepSelectionVisible(root, 24));
  }
  // A paragraph can be taller than the editing surface. Reveal the exact
  // selected words rather than an unrelated line in the middle of the block.
  keepSelectionVisible(root, 24);
};
const locateWritingNote = (note: WritingNote) => {
  const root = editorContent.value;
  if (!root) return false;
  const range = writingNoteRange(root, note);
  if (!range) {
    refreshWritingReview();
    announce('That passage has changed. The writing notes have been refreshed.');
    console.debug('[NextLevelEditor] Writing suggestion refreshed', { reason: 'passage-changed' });
    return false;
  }
  root.focus({ preventScroll: true });
  const selection = root.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const block = writingBlocks(root)[note.block];
  block?.element.scrollIntoView({ block: 'center', behavior: 'auto' });
  revealWritingPassage(root);
  rememberSelectionBase();
  return true;
};
const applyWritingNote = (note: WritingNote) => {
  if (props.readonly || note.replacement === undefined || !locateWritingNote(note)) return;
  captureSnapshot();
  if (document.execCommand('insertText', false, note.replacement)) {
    onInput();
    captureSnapshot();
    refreshWritingReview();
    announce('Suggestion applied. You can undo this change.');
    console.debug('[NextLevelEditor] Writing suggestion applied', { kind: note.title });
  } else {
    announce('The suggestion could not be applied. You can edit the selected passage directly.');
    console.warn('[NextLevelEditor] Writing suggestion could not be applied', { kind: note.title });
  }
};
const navigateWritingBlock = (index: number) => {
  const root = editorContent.value;
  const block = root && writingBlocks(root)[index]?.element;
  if (!root || !block) return;
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(true);
  root.focus({ preventScroll: true });
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  block.scrollIntoView({ block: 'center', behavior: 'auto' });
  revealWritingPassage(root);
  rememberSelectionBase();
};

// Announce undo/redo to screen readers, whatever the trigger (toolbar button,
// Ctrl+Z/Y, command palette, or an advanced shortcut) — they all call these.
const undo = () => {
  undoBase();
  announce("Undone");
};
const redo = () => {
  redoBase();
  announce("Redone");
};

// History Timeline adapters: map the live undo/redo history (the single source
// of truth) onto the HistoryTimeline component's entry shape. [#14]
const timelineEntries = computed(() =>
  history.value.map((entry) => ({
    id: entry.id,
    content: entry.preview,
    timestamp: entry.timestamp,
  }))
);
const timelineProgress = computed(() =>
  history.value.length > 1
    ? (historyIndex.value / (history.value.length - 1)) * 100
    : 100
);

// Download the full history as JSON (History Timeline "Export").
function handleExportHistory() {
  const payload = JSON.stringify(history.value, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "editor-history.json";
  // Firefox only honours a synthetic click on a download anchor that is IN the
  // document — detached, the click is a silent no-op. Same sequence utils/export
  // already uses for the HTML/Markdown downloads.
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Editor computed properties and watchers using composable
const { themeClass, editorStyles, wordCount, characterCount } =
  useEditorComputed({
    theme,
    width: toRef(props, "width"),
    height: toRef(props, "height"),
    modelValue: toRef(props, "modelValue"),
    editorContent,
    htmlContent,
    isApplyingHistory,
    applySanitizedContent,
    captureSnapshot,
    triggerAutoSave,
  });

// Corner resize grip: lets the user drag/arrow the editor larger to see more
// text. Its size overrides the width/height props once the user interacts.
const {
  resizeStyles,
  isResizing,
  beginResize,
  onHandleKeydown: onResizeHandleKeydown,
  resetSize: resetEditorSize,
} = useEditorResize();
const onResizeGripPointerdown = (event: PointerEvent) =>
  beginResize(event, rootEl.value);
const onResizeGripKeydown = (event: KeyboardEvent) =>
  onResizeHandleKeydown(event, rootEl.value);

// Content width: default is the readable centered column (~820px measure, as in
// Google Docs / Notion / Medium). "Full width" expands it to fill the editor —
// the Notion-style escape hatch for users who want to use all the space.
const isFullWidth = ref(false);
const toggleFullWidth = () => {
  isFullWidth.value = !isFullWidth.value;
};

// Command Palette
/**
 * Built-in palette commands plus anything plugins contribute. A plugin's
 * `commands` are declared in EditorPlugin, so leaving them unsurfaced would be
 * the same "the type promises more than the package delivers" gap this batch
 * closes. They land in the palette under a "Plugin" category. #R23-45
 */
const commandPaletteCommands = computed(() => [
  ...builtInPaletteCommands.value,
  ...pluginCommands.value.map((command) => ({
    // Namespaced row id: a plugin declaring a guessable id ("insert-table")
    // otherwise collides with the built-in row — duplicate :keys, and the
    // palette's last-wins recents map re-ran the PLUGIN when the user had
    // just run the built-in. #R24-13
    id: `plugin:${command.id}`,
    name: command.name,
    description: command.description ?? "",
    icon: "",
    category: "Plugin",
    shortcut: command.shortcut,
    // Close over the command OBJECT: executing by id looked the command up
    // with find(), so two plugins sharing an id both ran the first one's
    // execute. The canExecute guard is preserved; returning false tells
    // handleCommandExecute to keep the refused run out of recents. #R25-11
    action: () => {
      if (command.canExecute && !command.canExecute()) return false;
      command.execute();
    },
  })),
]);

const { showCommandPalette, closeCommandPalette, addToRecent, recentCommands } =
  useCommandPalette({ editorRoot: rootEl });

// Smart Toolbar
const {
  updateContext: updateToolbarContext,
  isVisible: isToolbarSectionVisible,
} = useSmartToolbar();

// View mode management using composable. The viewMode ref itself is declared
// near the top (before the active-editable computed); this wires the mode-
// switch content synchronization around it.
useViewMode({
  editorContent,
  htmlContent,
  codeContent,
  viewModeRef: viewMode,
});

// Modal management using composable - pass rememberSelection to save cursor position
const {
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
  openShortcutHelpModal,
  closeShortcutHelpModal,
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
  openFindReplaceModal: openLegacyFindReplaceModal,
  closeFindReplaceModal,
  openCodeBlockModal,
  closeCodeBlockModal,
  toggleEmojiPicker,
} = useModals({ rememberSelection });
const openFindReplaceModal = (replace = false) => {
  const alreadyOpen = showFindReplaceModal.value;
  writingSearchInitiallyReplace.value = replace;
  openLegacyFindReplaceModal();
  if (props.writingMode && alreadyOpen) void writingSearchRef.value?.focusSearch(replace);
};
watch(showFindReplaceModal, open => {
  if (open && props.writingMode) viewMode.value = 'editor';
}, { flush: 'sync' });
watch(viewMode, mode => {
  if (props.writingMode && mode !== 'editor' && showFindReplaceModal.value) closeFindReplaceModal();
}, { flush: 'sync' });

// Editor UI State using composable
const {
  isFullScreen,
  isFocusMode,
  fontSize,
  spellCheckEnabled,
  formatPainterActive,
  textColor,
  backgroundColor,
  showColorsDropdown,
  showToast,
  toastMessage,
  toastType,
  showToastNotification,
  dismissToastNotification,
  toggleFullScreen,
  toggleFocusMode,
} = useEditorUIState({ duration: 3000 });

// A visible toast is also user-facing feedback that screen-reader users must
// hear. `notify` fires both so every "Table inserted", "Copied", etc. is
// spoken. Passed to the composables below in place of the bare toast fn.
const notify = (message: string, type?: "success" | "error" | "info") => {
  showToastNotification(message, type);
  announce(message, { priority: type === "error" ? "assertive" : "polite" });
};

// Table state
const currentTable = ref<HTMLTableElement | null>(null);
const currentCell = ref<HTMLTableCellElement | null>(null);
const tableDesignerPosition = ref({ x: 0, y: 0 });
const tablePropertiesMode = ref<"cell" | "table" | "both">("both");
const initialCellProps = ref({});
const initialTableProps = ref({});

// Formatting actions using composable
const {
  handleTextAlignment,
  handleTextColor: handleTextColorBase,
  handleBackgroundColor: handleBackgroundColorBase,
  handleFontSize,
  handleCopyFormat,
  handlePasteFormat: handlePasteFormatBase,
} = useFormattingActions(
  editorContent,
  fontSize,
  captureSnapshot,
  applyTextAlignment,
  applyTextColor,
  applyBackgroundColor,
  applyFontSize,
  performWithSelection,
  notify
);

// Active state detection using composable (declared before the formatting
// handlers so the inline-format announce wrapper below can read the post-toggle
// state; useActiveStates only depends on editorContent).
const { isInlineActionActive, isBlockActionActive, isListActionActive } =
  useActiveStates(editorContent);

// Formatting Handlers - Using useFormattingHandlers composable
const {
  handleInlineAction: handleInlineActionBase,
  handleBlockAction,
  handleListAction,
  handleTextColor,
  handleBackgroundColor,
  handlePasteFormat,
} = useFormattingHandlers({
  performWithSelection,
  captureSnapshot,
  handleTextColorBase,
  handleBackgroundColorBase,
  handlePasteFormatBase,
  showColorsDropdown,
  formatPainterActive,
  textColor,
  backgroundColor,
});

// Human-readable labels for the inline formats that carry a toggle state worth
// announcing to screen readers.
const INLINE_FORMAT_LABELS: Record<string, string> = {
  strong: "Bold",
  em: "Italic",
  u: "Underline",
  s: "Strikethrough",
  code: "Code",
  sup: "Superscript",
  sub: "Subscript",
};

// Announce inline-format toggles to screen readers, whatever the trigger
// (toolbar, Ctrl+B, mobile bar, advanced shortcut) — all route through this.
// Reads the post-toggle active state so the message reflects the new state.
const handleInlineAction = (tag: string) => {
  handleInlineActionBase(tag);
  const label = INLINE_FORMAT_LABELS[tag];
  if (label) {
    announce(`${label} ${isInlineActionActive(tag) ? "on" : "off"}`);
  }
};

// Context menu composable - needs to be after handleInlineAction, insertLink, insertImage are available
// Will be initialized after those dependencies are defined

// Insert actions - Defined after composable initialization

const canClearFormatting = () => !props.readonly &&
  (viewMode.value === 'editor' || (viewMode.value === 'split' && splitRightMode.value === 'editor'));
const handleClearFormatting = () => {
  if (!canClearFormatting()) return;
  performWithSelection(root => {
    if (clearFormatting(root)) {
      captureSnapshot();
      console.debug('[NextLevelEditor] Selected character formatting cleared');
      notify('Formatting cleared.');
    } else {
      notify('Select formatted text to clear its styling.', 'info');
    }
  });
};

const toggleTheme = () => {
  toggleThemeComposable();
};

// Spell check using composable
const { enableSpellCheck, handleToggleSpellCheck } = useSpellCheck({
  editorContent,
  spellCheckEnabled,
});

/**
 * Everything a wholesale document REPLACEMENT owes, in one place: re-bind the
 * comment highlights and embeds whose listeners the innerHTML write destroyed,
 * re-analyse for the writing-stats panel, and re-sync the code pane (whose
 * textarea is the source of truth for the next keystroke in code/split view).
 * Paths that rebuilt this list by hand kept forgetting an item. #R23-43
 */
const handleContentReplaced = () => {
  comments?.restoreThreads();
  if (editorContent.value) {
    initializeEmbeddedElements(editorContent.value);
    codeContent.value = formatHtml(editorContent.value.innerHTML);
  }
  refreshWritingStats();
};

// Template manager using composable
const { handleSelectTemplate: applyTemplateDirect } = useTemplateManager({
  editorContent,
  captureSnapshot,
  // Templates are host/plugin-supplied HTML — clean them before they touch the
  // DOM, like every other ingestion path.
  sanitize: sanitizeHtml,
  onContentReplaced: handleContentReplaced,
});

// Shared confirmation dialog for destructive actions (template overwrite,
// history clear). Promise-based: callers await the user's decision instead of
// acting immediately, replacing both silent overwrites and native confirm().
const {
  isOpen: confirmDialogOpen,
  options: confirmDialogOptions,
  requestConfirm,
  handleConfirm: confirmDialogAccept,
  handleCancel: confirmDialogCancel,
} = useConfirmDialog();

/**
 * Selecting a template used to replace the ENTIRE document on a single click —
 * a user browsing templates lost their work with no warning and no feedback.
 * Now: a non-empty document asks first, and applying always toasts the undo
 * escape hatch. An empty document still applies immediately.
 */
const handleSelectTemplate = async (template: {
  content: string;
  name?: string;
}) => {
  const editor = editorContent.value;
  const hasContent =
    !!editor &&
    ((editor.textContent ?? "").trim().length > 0 ||
      editor.querySelector("img, table, .embedded-resizable-container") !==
        null);

  if (hasContent) {
    const confirmed = await requestConfirm({
      title: "Replace document?",
      message: `Applying "${
        template.name ?? "this template"
      }" will replace your current content. You can undo with Ctrl+Z.`,
      confirmLabel: "Replace",
      danger: true,
    });
    if (!confirmed) return;
  }

  applyTemplateDirect(template);
  // Only offer the undo hint when there was content to restore — on an empty
  // document undo is a no-op, so "press Ctrl+Z to restore your previous
  // content" was misleading. #r14b-5
  showToastNotification(
    hasContent
      ? "Template applied — press Ctrl+Z to restore your previous content"
      : "Template applied",
    "success"
  );
};

/**
 * History Timeline "Clear" erased the whole undo stack in one click —
 * unconfirmed and unrecoverable. Ask first.
 */
const handleClearHistory = async () => {
  const confirmed = await requestConfirm({
    title: "Clear history?",
    message:
      "This permanently erases the undo history for this session. Your current content is kept.",
    confirmLabel: "Clear history",
    danger: true,
  });
  if (!confirmed) return;
  clearHistory();
  showToastNotification("History cleared", "success");
};

// Table actions using composable
const {
  handleAddRowAbove,
  handleAddRowBelow,
  handleAddColumnLeft,
  handleAddColumnRight,
  handleRemoveRow,
  handleRemoveColumn,
  handleDeleteTable,
  handleCellProperties,
  handleTableProperties,
  handleApplyTableProperties,
} = useTableActions({
  currentTable,
  currentCell,
  showTableDesigner,
  showTablePropertiesModal,
  openTablePropertiesModal,
  initialCellProps,
  initialTableProps,
  tablePropertiesMode,
  // Table-designer edits (add/remove row/column, delete table, cell & table
  // properties) mutate the DOM from outside Vue, so they must go through the
  // snapshot path like every other mutation. A bare emit skipped history and
  // auto-save entirely: the row never reached the host, and Ctrl+Z ate an
  // unrelated earlier edit because the row was never snapshotted. It also emits
  // sanitized HTML now, instead of raw innerHTML.
  onUpdate: captureSnapshot,
});

// Find & Replace using composable
const { handleFind, handleReplace, handleReplaceAll, clearPendingHighlight: clearFindHighlight } = useFindReplace({
  editorContent,
  captureSnapshot,
  // Replace All rewrites innerHTML, dropping the listeners on comment highlights
  // and embedded media. Re-bind both, mirroring the undo/redo content-replace
  // path (which restoreThreads + re-inits embeds). r14b-1
  onContentReplaced: () => {
    comments?.restoreThreads();
    if (editorContent.value) initializeEmbeddedElements(editorContent.value);
    refreshWritingStats();
  },
});

// Code block actions - Now using composable

// Insert actions using composable
const {
  linkContext,
  insertLink,
  handleInsertLink,
  insertImage,
  handleInsertImage,
  handleInsertEmbed,
  handleInsertFile,
  handleInsertEmoji,
  handleInsertPageBreak,
  handleInsertTOC,
  handleInsertHR,
  handleInsertChecklist,
  handleInsertTable,
  handleInsertCodeBlock,
} = useInsertActions({
  editorContent,
  performWithSelection,
  captureSnapshot,
  showToast: notify,
  openLinkModal,
  openImageUploadModal,
  closeImageUploadModal,
  closeEmbedModal,
  closeFileManagerModal: () => {
    showFileManagerModal.value = false;
  },
  closeEmojiPicker: toggleEmojiPicker,
});

const pasteFromContextMenu = useClipboardPaste({
  editorContent,
  readonly: toRef(props, 'readonly'),
  onPaste: event => onPaste(event),
  captureSnapshot,
  notify: message => notify(message, 'info'),
  clearNotification: dismissToastNotification,
});

// Context menu using composable
const {
  showContextMenu,
  contextMenuPosition,
  contextMenuItems,
  handleContextMenu,
  closeContextMenu,
} = useContextMenu({
  editorContent,
  handleInlineAction,
  insertLink,
  insertImage,
  rememberSelection,
  showTableDesigner,
  currentTable,
  currentCell,
  tableDesignerPosition,
  captureSnapshot,
  emitUpdate: (value: string) => emit("update:modelValue", value),
  pasteClipboard: pasteFromContextMenu,
});

// Export actions using composable. The toolbar's "Format HTML" button is only
// shown in code/split views, where the code textarea is the editing surface —
// so it's wired to formatHtmlCode (which pretty-prints codeContent), not to
// handleFormatHtml (which only touches the hidden WYSIWYG div and left the
// visible textarea unchanged).
const {
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  formatHtmlCode,
  pdfProgress,
  isExportingPdf,
  cancelPdfExport,
} = useExportActions({
  editorContent,
  htmlContent,
  codeContent,
  // Exports must ship CURRENT variable values, exactly like printing does:
  // the same refresh the beforeprint hook runs, string-based for the HTML/
  // Markdown/Word formats (works in Preview mode too) and DOM-based for the
  // PDF, which rasterizes the live element. #R24-3
  prepareHtml: (html: string) =>
    variablesComposable ? variablesComposable.refreshVariableValuesInHtml(html) : html,
  prepareRoot: (root: HTMLElement) =>
    variablesComposable?.refreshVariablePills(root),
  showToast: notify,
  updateCodeContent: (content: string) => {
    // The textarea keeps the RAW formatted text (that is what the user asked
    // to see), but everything that re-enters the DOM or the model is
    // sanitized — exactly as onCodeInput does. Writing `content` straight
    // through let a pretty-print carry `<img onerror>` / `<iframe>` from a
    // pasted snippet into the live contenteditable, the v-html preview pane
    // and, via the debounced autosave re-emitting htmlContent, the host's
    // v-model. #R23-9
    codeContent.value = content;
    const clean = sanitizeHtml(content);
    // Run the same sync flow as typing in the code editor (onCodeInput):
    // mirror into the WYSIWYG surface + reactive model and capture an undo
    // snapshot, so the reformat is visible, consistent, and undoable.
    if (editorContent.value) {
      editorContent.value.innerHTML = clean;
      htmlContent.value = clean;
      // The write replaces every node, so embeds need re-binding (onCodeInput
      // does this too; the reformat path used to skip it).
      initializeEmbeddedElements(editorContent.value);
    }
    // In split view with the right pane in editor mode, editorContent
    // resolves to the split editor — keep the hidden main editor mirrored
    // too (same as onSplitEditorInput) so mode switches preserve content.
    const hidden = editorPanelsRef.value?.editorRef;
    if (hidden && hidden !== editorContent.value) {
      hidden.innerHTML = clean;
    }
    captureSnapshot();
  },
  captureSnapshot,
});

// Emoji picker actions - Now using composable

// Full screen actions - Now using composable

// Floating toolbar management - Now using composable

// Floating toolbar management using composable
const {
  showFloatingToolbar,
  floatingToolbarTimer,
  updateFloatingToolbar,
  suppressFloatingToolbar,
  unsuppressFloatingToolbar,
  floatingActions,
} = useFloatingToolbar({
  handleInlineAction,
  isInlineActionActive,
  insertLink,
  isAddingComment: comments?.isAddingComment,
  enableComments: props.enableComments,
  onAddComment: handleCreateComment,
  // Ownership scope for the selection toolbar: only selections inside this
  // instance's root may show its bubble (selectionchange is document-global).
  editorRoot: rootEl,
});

// Toolbar Items - Using useToolbarItems composable
const {
  formatDropdownItems,
  inlineFormatActions,
  alignmentDropdownItems,
  fontSizeDropdownItems,
  listActions,
  insertDropdownItems: baseInsertDropdownItems,
  toolActions,
  exportDropdownItems,
  productivityDropdownItems,
} = useToolbarItems({
  pluginToolbarButtons,
  editorContent,
  fontSize,
  handleBlockAction,
  handleInlineAction,
  handleListAction,
  handleTextAlignment,
  handleFontSize,
  handleInsertHR,
  handleInsertPageBreak,
  handleInsertTOC,
  isBlockActionActive,
  isInlineActionActive,
  isListActionActive,
  insertLink,
  insertImage,
  openFileManagerModal,
  openEmbedModal,
  openTableModal,
  openCodeBlockModal,
  openHtmlCodeModal,
  openFindReplaceModal: () => openFindReplaceModal(),
  openTemplateModal,
  toggleEmojiPicker: () => {
    showEmojiPicker.value = !showEmojiPicker.value;
  },
  handleToggleSpellCheck,
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  isExportingPdf,
  handleExportWord,
  handleCopyFormat,
  handlePasteFormat,
  hasFormatCopied,
  handleClearFormatting,
  canClearFormatting,
  spellCheckEnabled,
  captureSnapshot,
  toggleHistoryTimeline: () => {
    showHistoryTimeline.value = !showHistoryTimeline.value;
  },
  // Adds the Tools > Keyboard Shortcuts item (the item only renders when this
  // handler is provided). Opens the registry-backed help modal.
  openShortcutHelpModal,
});

// The phone dock replaces the selection bubble, so commenting also needs a
// permanent toolbar entry. Restore the selected passage before opening its form.
const insertDropdownItems = computed(() => {
  const items = baseInsertDropdownItems.value;
  const comment = floatingActions.value.find(action => action.id === 'comment');
  if (!comment) return items;
  return [items[0], {
    ...comment,
    onClick: () => performWithSelection(() => handleCreateComment()),
  }, ...items.slice(1)];
});

// Command Palette Commands using composable
const { commands: builtInPaletteCommands } = useCommandPaletteCommands({
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  insertLink,
  insertImage,
  openTableModal,
  openCodeBlockModal,
  toggleEmojiPicker,
  handleInsertHR,
  handleInsertPageBreak,
  handleInsertTOC,
  openFindReplaceModal,
  handleCopyFormat,
  openTemplateModal,
  handleClearFormatting,
  handleToggleSpellCheck,
  toggleTheme,
  toggleFullScreen,
  toggleFocusMode,
  handleExportHtml,
  handleExportMarkdown,
  handleExportPdf,
  handleExportWord,
  undo,
  redo,
});

// Handle command execution
function handleCommandExecute(command: any) {
  // Action first: a guarded plugin command signals a refused run by
  // returning false, and a silent no-op must not be promoted to the
  // palette's recents row. #R25-11
  if (command.action() === false) return;
  addToRecent(command.id);
}

// ---------------------------------------------------------------------------
// Mobile toolbar ownership.
// MobileToolbar teleports to <body> and (via useDeviceDetection) renders on
// every narrow viewport — so a page with several editors used to stack one
// identical fixed bottom bar PER instance. Same multi-instance family as the
// selection bubble, fixed with the same idea as useFloatingToolbar's
// `editorRoot` check: document-level events are scoped to THIS instance's
// root, and only the instance owning the last focus/interaction shows its
// toolbar. Before any interaction (e.g. while browsing the demo home page)
// no instance owns it and no toolbar shows.
// ---------------------------------------------------------------------------
const ownsMobileToolbar = ref(false);
// The toolbar's Close (X) hides it until this editor is focused/tapped again.
const mobileToolbarClosed = ref(false);
const mobileToolbarVisible = computed(
  () => ownsMobileToolbar.value && !mobileToolbarClosed.value && ownsFixedChrome.value
);

// Whether the mobile bottom bar is actually ON SCREEN: ownership alone isn't
// enough — MobileToolbar also self-gates on device detection, so on desktop
// `mobileToolbarVisible` can be true while nothing renders. The selection
// bubble must only be suppressed when the bar is really showing.
const { showMobileToolbar: deviceShowsMobileToolbar } = useDeviceDetection();
const mobileBarOnScreen = computed(
  () => mobileToolbarVisible.value && deviceShowsMobileToolbar.value
);

const updateMobileToolbarOwnership = (event: Event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (rootEl.value?.contains(target)) {
    // Only entering the writing surface opens the dock. A first touch on a
    // footer/panel control must not insert a fixed toolbar under that finger
    // between pointerdown and click (Comments could become Underline).
    if (target === rootEl.value || editorContent.value?.contains(target)) {
      ownsMobileToolbar.value = true;
      mobileToolbarClosed.value = false;
    }
    return;
  }
  const el = target instanceof Element ? target : target.parentElement;
  // The mobile toolbar itself is teleported to <body>: using it must not
  // release ownership (only the owning instance's toolbar is rendered).
  if (el?.closest(".mobile-toolbar")) return;
  // Anything else — another editor instance (which claims for itself) or
  // plain page content — releases ownership, hiding this toolbar.
  ownsMobileToolbar.value = false;
};

// The FAB column, the variables panel hanging off it and the auto-save chip are
// all painted at fixed VIEWPORT coordinates, so only one instance per page may
// render them — otherwise N editors stack N identical unlabelled circles on the
// same pixels. Mount order decides by default (a lone editor always shows its
// affordances); interacting with an instance hands them over. #R23-30 #R23-58
const { owns: ownsFixedChrome, refresh: refreshChromeOwnership } =
  useFloatingChromeOwner(rootEl);

// Before the browser prints, re-resolve every variable pill's data-value (the
// print CSS shows attr(data-value), stamped once at insertion) so time-based /
// since-changed variables print their CURRENT value instead of a stale one. #17
const onBeforePrint = () => {
  if (!variablesComposable) return;
  // Any rendered preview PANE is re-stamped synchronously in EVERY view mode:
  // in SPLIT view the editable surface exists alongside a v-html pane, and
  // refreshing only the surface left the pane printing insertion-time values;
  // and a host calling window.print() from its own script snapshots BEFORE
  // Vue's async flush re-renders the v-html. #R26-3 #R27-4
  rootEl.value
    ?.querySelectorAll<HTMLElement>(".preview-content-wrapper")
    .forEach((pane) => variablesComposable.refreshVariablePills(pane));
  if (editorContent.value) {
    variablesComposable.refreshVariablePills(editorContent.value);
  } else {
    // Preview view mounts no editable surface — the document lives as a
    // string, and what prints is the v-html pane rendered FROM it. Refresh
    // the string the same way exports do, or the printout carries
    // insertion-time values. #R25-3 (the historical R23-47)
    // Shielded like every other programmatic write: printing is not an edit,
    // and the autosave watcher must not save (or re-emit the model) over a
    // value refresh. Mirrors the modelValue-apply pattern. #R26-2
    isApplyingHistory.value = true;
    htmlContent.value = variablesComposable.refreshVariableValuesInHtml(
      htmlContent.value
    );
    void nextTick(() => {
      isApplyingHistory.value = false;
    });
  }
};

onMounted(() => {
  // Capture phase so stopPropagation inside widgets can't desync ownership.
  document.addEventListener("pointerdown", updateMobileToolbarOwnership, true);
  document.addEventListener("focusin", updateMobileToolbarOwnership, true);
  window.addEventListener("beforeprint", onBeforePrint);

  // autofocus: place the caret in the editing surface on mount so the user can
  // type immediately. Meaningless (and skipped) when readonly.
  if (props.autofocus && !props.readonly) {
    nextTick(() => {
      const surface = editorContent.value;
      if (surface) {
        surface.focus();
        // Collapse the caret to the end of existing content.
        const selection = globalThis.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(surface);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    });
  }
});

onUnmounted(() => {
  document.removeEventListener(
    "pointerdown",
    updateMobileToolbarOwnership,
    true
  );
  document.removeEventListener("focusin", updateMobileToolbarOwnership, true);
  window.removeEventListener("beforeprint", onBeforePrint);
});

// Dispatch MobileToolbar button actions to the real editor handlers. Previously
// the mobile toolbar was never rendered and its buttons emitted a bare action id
// that nothing listened for, so every button was a no-op. [#6/#45]
function handleMobileAction(actionId: string) {
  switch (actionId) {
    case "bold":
      handleInlineAction("strong");
      break;
    case "italic":
      handleInlineAction("em");
      break;
    case "underline":
      handleInlineAction("u");
      break;
    case "strikethrough":
      handleInlineAction("s");
      break;
    case "code":
      handleInlineAction("code");
      break;
    case "blockquote":
      handleBlockAction("blockquote");
      break;
    case "checklist":
      handleInsertChecklist();
      break;
    case "paragraph":
      handleBlockAction("p");
      break;
    case "h1":
    case "h2":
    case "h3":
      handleBlockAction(actionId);
      break;
    case "bullet-list":
      handleListAction("ul");
      break;
    case "numbered-list":
      handleListAction("ol");
      break;
    case "link":
      insertLink();
      break;
    case "image":
      insertImage();
      break;
    case "table":
      openTableModal();
      break;
    case "code-block":
      openCodeBlockModal();
      break;
    case "file-manager":
      openFileManagerModal();
      break;
    case "video":
      openEmbedModal();
      break;
    case "hr":
      handleInsertHR();
      break;
    case "page-break":
      handleInsertPageBreak();
      break;
    case "toc":
      handleInsertTOC();
      break;
    case "emoji":
      toggleEmojiPicker();
      break;
    case "find":
      openFindReplaceModal();
      break;
    case "undo":
      undo();
      break;
    case "redo":
      redo();
      break;
    default:
      // Every button MobileToolbar ships is wired above. checklist / export /
      // settings / shortcuts were removed from the toolbar until they get
      // real handlers — add their cases here when reinstating the buttons.
      break;
  }
}

// Resolve the active state for MobileToolbar format buttons so they highlight
// like the desktop toolbar (reactive via useActiveStates' selectionTick). [#16]
function mobileIsActive(actionId: string): boolean {
  switch (actionId) {
    case "bold":
      return isInlineActionActive("strong");
    case "italic":
      return isInlineActionActive("em");
    case "underline":
      return isInlineActionActive("u");
    case "strikethrough":
      return isInlineActionActive("s");
    case "code":
      return isInlineActionActive("code");
    default:
      return false;
  }
}

// Command menu (Slash commands) - Using useSlashCommands composable
const {
  showCommandMenu,
  commandMenuPosition,
  commandOptions,
  selectedIndex: commandSelectedIndex,
  menuListboxId: commandListboxId,
  menuOptionId: commandOptionId,
  activeOptionId: commandActiveOptionId,
  openCommandMenu,
  handleCommandOption,
  handleMenuKeydown: handleSlashMenuKeydown,
  handleDocumentClick,
  handleEscape,
} = useSlashCommands({
  handleInlineAction,
  handleBlockAction,
  handleListAction,
  insertLink,
  insertImage,
  openTableModal,
  openCodeBlockModal,
  handleInsertHR,
  performWithSelection,
  showToast: notify,
  editorRoot: rootEl,
  pluginSlashCommands,
});

// The editing surface can host TWO exclusive popups — the slash menu and the
// variables autocomplete — and its combobox trio (aria-expanded / controls /
// activedescendant, bound in EditorPanels) must describe whichever is
// actually open. The variables popup wins when visible: it also intercepts
// the keydown pipeline first. #R23-54 (the model is #R23-5's slash wiring)
const surfacePopup = computed(() => {
  const variableAc = variableAutocompleteRef.value;
  if (showVariableAutocomplete.value && variableAc?.activeOptionId) {
    return {
      open: true,
      listboxId: variableAc.listboxId,
      activeOptionId: variableAc.activeOptionId,
    };
  }
  if (showCommandMenu.value) {
    return {
      open: true,
      listboxId: commandListboxId,
      activeOptionId: commandActiveOptionId.value,
    };
  }
  return { open: false, listboxId: undefined, activeOptionId: undefined };
});

// The surface can no longer carry `aria-expanded` — ARIA 1.2 does not allow it
// on `role="textbox"`, and it was the ONLY signal that a suggestion popup had
// opened. The live region takes over, and says more than the attribute could:
// how many results there are, and how to use them. #R32-1
watch(
  () => surfacePopup.value.open,
  (open, wasOpen) => {
    if (open === wasOpen) return;
    if (!open) {
      announce("Suggestions closed");
      return;
    }
    const count = showVariableAutocomplete.value
      ? variableAutocompleteRef.value?.optionCount
      : commandOptions.length;
    announce(
      typeof count === "number"
        ? `${count} suggestion${count === 1 ? "" : "s"} available. Use arrow keys to review, Enter to insert.`
        : "Suggestions available. Use arrow keys to review, Enter to insert."
    );
  }
);

// Context menu - Now using composable

// Editor Events - Using useEditorEvents composable
const {
  onInput: onInputBase,
  onFocus: onFocusBase,
  onBlur,
  onMouseUp: onMouseUpBase,
  onSelectionChange,
  onCodeInput: onCodeInputBase,
  onCodeBlur,
} = useEditorEvents({
  editorContent,
  codeContent,
  htmlContent,
  sanitizeHtml,
  captureSnapshot,
  updateFloatingToolbar,
  updateToolbarContext,
  rememberSelection,
  showFloatingToolbar,
  showTableDesigner,
  currentTable,
  currentCell,
  tableDesignerPosition,
  emit,
});

// Editor interaction lifts the floating-toolbar suppression set by toolbar
// mousedown (see rememberSelectionFromToolbar).
const onFocus = () => {
  unsuppressFloatingToolbar();
  onFocusBase();
};
const onMouseUp = () => {
  unsuppressFloatingToolbar();
  onMouseUpBase();
};

// Clicking a checklist item's checkbox gutter toggles its checked state. Handled
// on mousedown so preventDefault stops the caret from jumping into the gutter;
// the toggle mutates data-checked in place and captures a history snapshot so it
// persists (undoable) and round-trips through the sanitizer.
const onEditorMousedown = (event: MouseEvent) => {
  if (props.readonly) return;
  const li = checklistItemForCheckboxClick(event.target, event.clientX);
  if (!li) return;
  event.preventDefault();
  toggleChecklistItem(li);
  captureSnapshot();
};

// Wrap onInput to include variable detection and wrapping
// Paste: the browser drops the clipboard's raw HTML straight into the
// contenteditable, and sanitizeHtml would otherwise only clean the string we
// EMIT — never the live editing surface. Intercept rich-HTML pastes, run them
// through the same allowlist sanitizer, and insert the cleaned markup so no
// untrusted element (event handlers, exotic tags, mso cruft) ever lands in the
// editor. Plain-text pastes carry no markup, so the browser default is fine.
// Read an image File and insert it as a size-checked data-URL through the same
// sanitized embed path the image dialog uses (so it round-trips and reloads).
const insertImageFromFile = async (file: File) => {
  // Rejections must be TOLD, not swallowed: preventDefault already ran, so a
  // silent bail here means the paste visibly did nothing. #r15-28
  if (!isInsertableImage(file)) {
    showToastNotification(
      "Image couldn't be pasted (unsupported type or over 10 MB)",
      "error"
    );
    return;
  }
  try {
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl.startsWith("data:image/")) {
      handleInsertImage(dataUrl, file.name || "Pasted image");
    } else {
      showToastNotification("Image couldn't be read", "error");
    }
  } catch {
    showToastNotification("Image couldn't be read", "error");
  }
};

const onPaste = (event: ClipboardPasteInput) => {
  if (props.readonly) return;
  const clipboard = event.clipboardData;
  if (!clipboard) return;

  const html = clipboard.getData("text/html");

  // Image-ONLY clipboard (screenshot, bitmap-only "Copy image") carries no
  // text/html — the html handler below would bail WITHOUT preventDefault and
  // let the browser insert an unsanitized blob:/<img> lost on reload. But when
  // BOTH flavors are present (Excel/Word ranges ship a bitmap rendering
  // alongside the real table), the RICH flavor must win: intercepting the
  // bitmap turned editable content into a flat picture. #r15-3
  if (!html) {
    const pastedImage = pickImageFile({
      items: clipboard.items,
      files: clipboard.files,
    });
    if (pastedImage) {
      event.preventDefault();
      void insertImageFromFile(pastedImage);
    }
    return; // plain-text paste: browser default is fine
  }

  event.preventDefault();

  // Pasting into a code block: code is literal text — inserting the
  // clipboard's rich markup would embed <b>/<span>/<p> soup INSIDE
  // <pre><code>, corrupting the sample. Insert the plain-text flavor instead
  // (same code-guard as smart-autocomplete and variables).
  const selection = window.getSelection();
  const anchor =
    selection && selection.rangeCount > 0
      ? selection.getRangeAt(0).startContainer
      : null;
  const anchorEl =
    anchor && anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as HTMLElement)
      : (anchor?.parentElement ?? null);
  const codeAncestor = anchorEl?.closest("pre, code");
  if (codeAncestor && editorContent.value?.contains(codeAncestor)) {
    document.execCommand(
      "insertText",
      false,
      clipboard.getData("text/plain")
    );
    return;
  }

  // Rebuild Word/Docs list paragraphs into real <ul>/<ol> BEFORE sanitizing
  // (which strips the mso-list markup they're detected by), else they paste as
  // flat paragraphs with literal bullet glyphs.
  const clean = sanitizeHtml(reconstructWordLists(html), { fragment: true });

  // Real visible content (text or media) → insert it directly.
  if (htmlHasVisibleContent(clean)) {
    document.execCommand("insertHTML", false, clean);
    // execCommand fires `input`, running the capture/emit + re-sanitize pass.
    return;
  }

  // Text-less html: either a stripped-image husk (Office "Copy image", or an
  // image-only list item whose <img src=file://> the sanitizer removed) or
  // genuinely-empty structure (an empty checklist). A clipboard bitmap wins —
  // otherwise paste the structure, otherwise the plain-text flavor. Ordering
  // the bitmap BEFORE the structure check keeps a bulleted image from pasting
  // as an empty bullet. #r16-1 #r17-b78-1 #r18
  const fallbackImage = pickImageFile({
    items: clipboard.items,
    files: clipboard.files,
  });
  if (fallbackImage) {
    void insertImageFromFile(fallbackImage);
    return;
  }
  if (htmlHasStructure(clean)) {
    document.execCommand("insertHTML", false, clean);
    return;
  }
  const plain = clipboard.getData("text/plain");
  if (plain) {
    document.execCommand("insertText", false, plain);
  }
};

// Resolve a caret Range at a viewport point, across the two browser APIs.
const caretRangeFromPoint = (x: number, y: number): Range | null => {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };
  if (typeof doc.caretRangeFromPoint === "function") {
    return doc.caretRangeFromPoint(x, y);
  }
  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      const range = document.createRange();
      range.setStart(pos.offsetNode, pos.offset);
      range.collapse(true);
      return range;
    }
  }
  return null;
};

// Drag-and-drop must run through the SAME allowlist sanitizer as paste. Native
// contenteditable drop drops the dragged text/html straight into the live DOM,
// bypassing the sanitizer (which otherwise only cleans the string we EMIT, never
// the editing surface) — so dropped markup could carry on* handlers, tracking
// pixels, or exotic elements. Intercept rich-HTML drops, place the caret at the
// drop point, and insert the cleaned markup. Plain-text drops carry no markup,
// so the browser default is fine.
// Source range of an in-editor drag. A native contenteditable drag is a MOVE —
// the browser's default drop action inserts at the drop point AND removes the
// dragged source — but onDrop preventDefault()s that default action to
// sanitize the payload, which also cancelled the source removal: every
// intra-editor drag-move silently became a drag-COPY. Track the dragged
// selection on dragstart so the drop can complete the move manually.
let dragSourceRange: Range | null = null;

const onDragStart = () => {
  const selection = window.getSelection();
  dragSourceRange =
    selection && selection.rangeCount > 0 && !selection.getRangeAt(0).collapsed
      ? selection.getRangeAt(0).cloneRange()
      : null;
};

const onDragEnd = () => {
  // Covers cancelled drags (Escape, dropped outside) — a later external drop
  // must never delete a stale source.
  dragSourceRange = null;
};

const onDrop = (event: DragEvent) => {
  if (props.readonly) return;
  const data = event.dataTransfer;
  if (!data) return;

  const html = data.getData("text/html");

  // Dropping an image FILE (from the OS) carries no text/html — insert it as a
  // data-URL, same as paste. When html IS present (dragging an <img> from a
  // page, or intra-editor drags), the rich path below must win. #r15-3
  if (!html) {
    const droppedImage = pickImageFile({
      items: data.items,
      files: data.files,
    });
    if (droppedImage) {
      event.preventDefault();
      const dropCaret = caretRangeFromPoint(event.clientX, event.clientY);
      if (dropCaret) {
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(dropCaret);
      }
      dragSourceRange = null;
      void insertImageFromFile(droppedImage);
      return;
    }
    // A non-image FILE drop (PDF, zip…) must never fall through: the browser's
    // default action NAVIGATES the tab to the file, destroying the editing
    // session. Cancel it and say why nothing was inserted. #r16-5
    if (hasFileTransfer({ items: data.items, files: data.files })) {
      event.preventDefault();
      dragSourceRange = null;
      showToastNotification(
        "Only image files can be dropped into the editor",
        "error"
      );
    }
    return; // plain-text drop: browser default is fine
  }

  event.preventDefault();
  const caret = caretRangeFromPoint(event.clientX, event.clientY);

  // Internal MOVE: remove the dragged source before inserting. The drop caret
  // was computed from coordinates first, and DOM Ranges auto-adjust to the
  // deletion, so it stays valid. A Ctrl-drag (Windows/Linux) or Option-drag
  // (macOS, exposed as altKey) is an explicit COPY — keep the source. #r16-8
  // Dropping inside the dragged selection itself is a no-op, matching the
  // native behavior.
  const source = dragSourceRange;
  dragSourceRange = null;
  if (source && !event.ctrlKey && !event.altKey) {
    if (caret && source.isPointInRange(caret.startContainer, caret.startOffset)) {
      return;
    }
    source.deleteContents();
  }

  if (caret) {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(caret);
  }

  // Dropping rich markup INTO a code block would embed <b>/<span>/<p> soup in
  // the sample — mirror onPaste's code-block guard and drop the plain-text
  // flavor instead. Resolve the anchor AFTER the drop caret is set.
  const dropSelection = window.getSelection();
  const dropAnchor =
    dropSelection && dropSelection.rangeCount > 0
      ? dropSelection.getRangeAt(0).startContainer
      : null;
  const dropAnchorEl =
    dropAnchor && dropAnchor.nodeType === Node.ELEMENT_NODE
      ? (dropAnchor as HTMLElement)
      : (dropAnchor?.parentElement ?? null);
  const dropCodeAncestor = dropAnchorEl?.closest("pre, code");
  if (dropCodeAncestor && editorContent.value?.contains(dropCodeAncestor)) {
    document.execCommand("insertText", false, data.getData("text/plain"));
    return;
  }

  const clean = sanitizeHtml(reconstructWordLists(html), { fragment: true });
  document.execCommand("insertHTML", false, clean);
};

const onInput = (event?: Event) => {
  // IME guard: while a composition is live the browser fires input events
  // (inputType "insertCompositionText"); running the mutating passes below
  // (autocomplete's deleteContents/addRange, variable wrapping, model sync)
  // would tear down the IME buffer and displace the caret. Skip entirely —
  // EditorPanels re-emits `input` on compositionend (that event carries no
  // isComposing flag), so the deferred pass runs once when the IME commits.
  if ((event as InputEvent | undefined)?.isComposing) {
    return;
  }

  // (Placeholder recovery for <br>/<p><br></p> residues is handled purely in
  // CSS via :has() — see NextLevelEditor.css. A JS innerHTML-wipe here would
  // also destroy the paragraph that Enter legitimately seeds in an empty
  // document, yanking the caret.)

  // Smart autocomplete (markdown shortcuts, URL/email auto-link, curly quotes,
  // "--"/"..." punctuation) — only on WYSIWYG surfaces, never in code view.
  // Runs BEFORE onInputBase so the converted DOM is what gets synced to
  // v-model. Re-entrancy is handled inside the composable (isApplying guard).
  if (viewMode.value === "editor" || viewMode.value === "split") {
    handleSmartAutocomplete(event);
  }

  // Wrap completed variable tokens BEFORE the capture+sanitize+emit pass so
  // the emitted model already contains the pill. Wrapping after the emit made
  // the v-model round-trip see a DOM (with pill) that differed from the model
  // (without pill), rewriting innerHTML — and destroying the caret — one tick
  // later. The wrap itself is caret-preserving and idempotent.
  if (variablesComposable && editorContent.value) {
    variablesComposable.wrapVariablesInContent(editorContent.value);
  }

  // Pass the raw event through: its inputType drives keystroke-burst
  // coalescing in history (typing/deleting runs merge into one undo step).
  onInputBase(event);

  // Detect variable syntax for autocomplete
  if (props.enableVariables) {
    detectVariableSyntax();
  }

  // Update writing statistics. Use the debounced, lightweight content updater —
  // the stats panel is driven by lazy computeds, so a full analyze() pass on
  // every keystroke was wasted work (and ran even with the panel closed).
  if (writingAssistant && editorContent.value) {
    writingAssistant.scheduleContentUpdate(editorContent.value.innerHTML);
  }
};

// Wrap onCodeInput to sync with split editor in editor mode
const onCodeInput = (event: Event) => {
  onCodeInputBase(event);

  // If split view is active with editor mode on right, sync the split editor.
  // With the active-editable computed, editorContent already IS the split
  // editor in that mode (onCodeInputBase wrote into it) — only copy when they
  // are distinct elements.
  if (viewMode.value === "split" && splitRightMode.value === "editor") {
    nextTick(() => {
      const splitEl = editorPanelsRef.value?.splitEditorRef;
      if (splitEl && editorContent.value && splitEl !== editorContent.value) {
        splitEl.innerHTML = editorContent.value.innerHTML;
      }
    });
  }
};

// Handle split view right panel mode change
function handleSplitRightModeChange(mode: "preview" | "editor") {
  splitRightMode.value = mode;
  // Populate the split editor when switching to editor mode. Read from the
  // reactive htmlContent (single source of truth) with the hidden editor as a
  // fallback — after the mode flips, editorContent already resolves to the
  // split editor itself, so copying from editorContent would be a no-op self
  // copy that left the pane empty.
  if (mode === "editor") {
    nextTick(() => {
      const panels = editorPanelsRef.value;
      const splitEl = panels?.splitEditorRef;
      if (!splitEl) return;
      const source = htmlContent.value || panels?.editorRef?.innerHTML || "";
      if (splitEl.innerHTML !== source) {
        splitEl.innerHTML = source;
      }
    });
  }
}

// Handle split editor input - run the shared capture+sanitize+emit pipeline
// (editorContent resolves to the split editor here) and keep the hidden main
// editor mirrored so switching modes preserves content.
function onSplitEditorInput(event: Event) {
  // Keep IME candidates out of history and autosave, as on the main surface.
  // compositionend runs this pipeline once with the committed text.
  if ((event as InputEvent).isComposing) return;
  const target = event.target as HTMLElement;
  const hidden = editorPanelsRef.value?.editorRef;
  if (hidden && hidden !== target) {
    hidden.innerHTML = target.innerHTML;
  }
  codeContent.value = formatHtml(target.innerHTML);
  // Same burst coalescing as the main surface — a bare capture pushed one
  // keyless entry PER KEYSTROKE in the split pane. #r15-24
  captureSnapshot(true, coalesceKeyForInputEvent(event));
}

// Keep the visible split editor in sync with content changes that do not
// originate from typing in it (undo/redo, template insertion, external v-model
// updates). Guarded so it never clobbers the caret while the user is editing
// the split pane. [#24]
watch(htmlContent, (newHtml) => {
  if (viewMode.value !== "split" || splitRightMode.value !== "editor") return;
  const splitEl = editorPanelsRef.value?.splitEditorRef;
  if (
    splitEl &&
    document.activeElement !== splitEl &&
    splitEl.innerHTML !== newHtml
  ) {
    splitEl.innerHTML = newHtml;
  }
});

// Keyboard Shortcuts - Using useKeyboardShortcuts composable
const { handleKeydown } = useKeyboardShortcuts({
  editorContent,
  onInput,
  onCaptureSnapshot: captureSnapshot,
  undo,
  redo,
  openCommandMenu,
  insertLink,
  openFindReplaceModal: () => openFindReplaceModal(),
  handleInlineAction,
  handleBlockAction,
  handleSlashMenuKeydown,
});

// Advanced keyboard shortcuts (registry-driven, customizable, discoverable via
// the Tools > Keyboard Shortcuts help). Only shortcuts wired to a real editor
// action below are enabled; every other entry in the ~80-shortcut registry is
// auto-disabled, so it neither fires nor appears in the help modal, and native
// keys (Ctrl+C/X/V, browser shortcuts) are never intercepted. The overlapping
// essentials (bold/italic/underline, H1–H3, undo/redo, link, find) are wired
// here too so the help lists them, but at runtime useKeyboardShortcuts handles
// them first and the defaultPrevented guard below skips the registry — no
// double-fire.
const advancedKeyboard = useAdvancedKeyboardShortcuts(editorContent, {
  bold: () => handleInlineAction("strong"),
  italic: () => handleInlineAction("em"),
  underline: () => handleInlineAction("u"),
  strikethrough: () => handleInlineAction("s"),
  code: () => handleInlineAction("code"),
  superscript: () => handleInlineAction("sup"),
  subscript: () => handleInlineAction("sub"),
  clearFormatting: handleClearFormatting,
  paragraph: () => handleBlockAction("p"),
  heading1: () => handleBlockAction("h1"),
  heading2: () => handleBlockAction("h2"),
  heading3: () => handleBlockAction("h3"),
  heading4: () => handleBlockAction("h4"),
  heading5: () => handleBlockAction("h5"),
  heading6: () => handleBlockAction("h6"),
  blockquote: () => handleBlockAction("blockquote"),
  codeBlock: () => openCodeBlockModal(),
  bulletList: () => handleListAction("ul"),
  numberedList: () => handleListAction("ol"),
  checkList: () => handleInsertChecklist(),
  alignLeft: () => handleTextAlignment("left"),
  alignCenter: () => handleTextAlignment("center"),
  alignRight: () => handleTextAlignment("right"),
  alignJustify: () => handleTextAlignment("justify"),
  insertLink: () => insertLink(),
  insertImage: () => insertImage(),
  insertTable: () => openTableModal(),
  insertHorizontalRule: () => handleInsertHR(),
  insertEmoji: () => toggleEmojiPicker(),
  insertCodeBlock: () => openCodeBlockModal(),
  undo: () => undo(),
  redo: () => redo(),
  find: () => openFindReplaceModal(),
  replace: () => openFindReplaceModal(true),
  toggleFullscreen: () => toggleFullScreen(),
  togglePreview: () => {
    viewMode.value = viewMode.value === "preview" ? "editor" : "preview";
  },
  openShortcutHelp: () => openShortcutHelpModal(),
});

// Editor keydown: the variable autocomplete (when open) claims
// Arrow/Enter/Tab/Escape first — the same priority carve-out the slash menu
// has inside useKeyboardShortcuts — so Enter inserts the highlighted variable
// instead of a new paragraph. useKeyboardShortcuts runs next; only if it did
// NOT consume the event do we offer it to the advanced registry, so the two
// systems never double-handle a key.
function onEditorKeydown(event: KeyboardEvent) {
  if (event.altKey && event.key === 'F10' && props.showToolbar && !props.readonly) {
    if (editorToolbarRef.value?.focusToolbar()) {
      event.preventDefault();
      return;
    }
  }
  if (variableAutocompleteRef.value?.handleEditorKeydown(event)) return;

  // Backspace after a pill unwraps it to editable token text. Model synced
  // WITHOUT an input dispatch: the input pipeline runs the wrap pass, which
  // would re-freeze the complete token under the caret instantly. The wrap
  // pass separately skips tokens the caret is INSIDE, so the user can then
  // edit freely and the token re-wraps when the caret leaves. #R23-63
  if (
    !props.readonly &&
    variablesComposable?.unwrapPillBeforeCaret(editorContent.value, event)
  ) {
    captureSnapshot();
    return;
  }

  // Ctrl/Cmd+Enter toggles the checklist item the caret sits in — the only
  // keyboard path to a checkbox whose hit target is otherwise a mouse-only
  // gutter. The plain-Enter handler explicitly ignores ctrl/meta, so there's no
  // collision with paragraph splitting.
  if (
    !props.readonly &&
    event.key === "Enter" &&
    (event.ctrlKey || event.metaKey) &&
    !event.shiftKey &&
    !event.altKey
  ) {
    const li = checklistItemForNode(
      window.getSelection()?.anchorNode ?? null
    );
    if (li) {
      event.preventDefault();
      toggleChecklistItem(li);
      captureSnapshot();
      return;
    }
  }

  handleKeydown(event);
  if (event.defaultPrevented) return;
  advancedKeyboard.handleKeydown(event);

  // The variable autocomplete only re-detects on `input`. If its menu is open
  // and a caret-MOVEMENT key (not consumed by the menu itself) fires no input,
  // the caret can leave the `{{ }}` while the menu keeps floating with a stale
  // query. Re-detect after the browser applies the caret move so it closes.
  if (
    props.enableVariables &&
    showVariableAutocomplete.value &&
    CARET_MOVE_KEYS.has(event.key) &&
    !event.defaultPrevented
  ) {
    nextTick(() => detectVariableSyntax());
  }
}

// Caret-moving keys that produce no `input` event, so the variable autocomplete
// must re-evaluate after them (ArrowUp/Down are consumed by an open menu and
// never reach here, so they are intentionally absent).
const CARET_MOVE_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
]);

// Comments handlers
function handleThreadActivation(threadId: string) {
  rememberCommentsPosition();
  showCommentsSidebar.value = true;
  nextTick(() => commentsSidebarRef.value?.revealThread(threadId));
  console.debug('[NextLevelEditor comments] Discussion opened');
}

function handleSelectThread(threadId: string) {
  if (!comments) return;
  comments.setActiveThread(threadId);

  const thread = comments.threads.value.find((t) => t.id === threadId);
  if (thread?.highlightElement) {
    // Add temporary pulse highlight
    thread.highlightElement.classList.add("comment-highlight-pulse");

    smoothScrollIntoView(thread.highlightElement, {
      behavior: "smooth",
      block: "center",
    });

    // Remove pulse after animation
    setTimeout(() => {
      thread.highlightElement?.classList.remove("comment-highlight-pulse");
    }, 2000);
  }
}

// Resolve/reopen/delete restyle or unwrap the highlight span in the document.
// That markup is part of the content (the sanitizer special-cases it so it
// round-trips), and it's mutated outside Vue — so, like every other such
// mutation, it has to go through the snapshot path or the host never sees it.
function handleResolveThread(threadId: string) {
  if (!comments) return;
  comments.resolveThread(threadId);
  captureSnapshot();
}

function handleReopenThread(threadId: string) {
  if (!comments) return;
  comments.reopenThread(threadId);
  captureSnapshot();
}

function handleDeleteThread(threadId: string) {
  if (!comments) return;
  comments.deleteThread(threadId);
  captureSnapshot();
}

function handleAddReply(threadId: string, content: string, mentions: string[]) {
  if (!comments) return;
  const reply = comments.addReply(threadId, content, mentions);
  if (reply) {
    showToastNotification("Reply added successfully", "success");
  }
}

function handleCreateComment() {
  if (!comments) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    showToastNotification("Please select text to comment on", "error");
    return;
  }

  // Capture the selection using the comments composable
  const captured = comments.startAddComment();
  if (!captured) {
    showToastNotification("Failed to capture selection", "error");
    return;
  }

  rememberCommentsPosition();

  // Store the selected text for display in modal
  selectedTextForComment.value = selection.toString();

  // Show the comment modal
  showCommentModal.value = true;
}

function handleCommentSubmit(content: string, mentions: string[]) {
  if (!comments) return;

  // Add the thread with the captured selection
  const thread = comments.addThread(content, mentions);

  if (thread) {
    // The highlight span is now in the document — persist it, or the anchor is
    // lost on reload and the thread falls back to serialized offsets that drift
    // as the document is edited.
    captureSnapshot();
    showToastNotification("Comment added successfully", "success");
    // Ensure sidebar is visible to show the new comment
    showCommentsSidebar.value = true;
  } else {
    showToastNotification("Failed to add comment", "error");
  }

  // Close the modal
  showCommentModal.value = false;
  selectedTextForComment.value = "";
}

function handleCommentCancel() {
  if (!comments) return;

  // Clear the selection capture
  comments.clearSelection();

  // Close the modal
  showCommentModal.value = false;
  selectedTextForComment.value = "";
}

// Variable handlers
function detectVariableSyntax() {
  if (!variablesComposable || !editorContent.value) return;

  const detection = variablesComposable.detectVariableAtCursor(
    editorContent.value
  );

  if (detection?.isInVariable) {
    // Show autocomplete
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // The dropdown is position: fixed, so viewport coordinates are used
      // as-is — adding scrollY here pushed it below the viewport whenever
      // the host page was scrolled. Clamp into the usable viewport (below
      // the main toolbar, above the mobile toolbar, inside the horizontal
      // bounds) exactly like the slash menu — an unclamped caret rect put
      // the 320px box off-screen right on phones and its lower rows under
      // the fixed mobile toolbar, where taps never landed.
      variableAutocompletePosition.value = clampMenuToViewport(
        rect.bottom + 5,
        rect.left,
        { estimatedWidth: 320, estimatedHeight: 400, root: rootEl.value }
      );

      variableAutocompleteQuery.value = detection.query;
      showVariableAutocomplete.value = true;
    }
  } else {
    showVariableAutocomplete.value = false;
  }
}

function handleVariableSelect(variable: any) {
  if (!variablesComposable || !editorContent.value) return;

  // Remove the {{ and partial text
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const node = range.startContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    const cursorPos = range.startOffset;
    const textBefore = text.substring(0, cursorPos);
    const lastOpenBrace = textBefore.lastIndexOf("{{");

    if (lastOpenBrace !== -1) {
      // Delete from {{ to cursor
      const deleteRange = document.createRange();
      deleteRange.setStart(node, lastOpenBrace);
      deleteRange.setEnd(node, cursorPos);
      deleteRange.deleteContents();

      // Insert variable
      variablesComposable.insertVariable(editorContent.value, variable.name, variable);
    }
  }

  showVariableAutocomplete.value = false;

  // Trigger input event
  if (editorContent.value) {
    onInput();
  }
}

function closeVariableAutocomplete() {
  showVariableAutocomplete.value = false;
}

// Insert a variable from the variables panel. The panel items use
// @mousedown.prevent so the editor selection survives the click; if the caret
// was never placed in the editor, the pill is appended at the end instead.
function handlePanelInsert(variable: Variable) {
  // A read-only document must not be editable through ANY affordance. The FAB
  // and panel are hidden in readonly, but guard the mutation itself too — this
  // path inserted a pill into the locked content and emitted it to the host.
  // #r21-2
  if (props.readonly) return;
  if (!variablesComposable || !editorContent.value) return;
  const editor = editorContent.value;
  const selection = window.getSelection();

  // Code is literal: a contenteditable=false pill (plus the NBSP that follows
  // it) wedged into a sample corrupts it and cannot be edited out. The other
  // variable paths already refuse to touch <pre>/<code>; the panel did not.
  // #r21-4
  const caretNode =
    selection && selection.rangeCount > 0
      ? selection.getRangeAt(0).startContainer
      : null;
  const caretEl =
    caretNode && caretNode.nodeType === Node.ELEMENT_NODE
      ? (caretNode as HTMLElement)
      : (caretNode?.parentElement ?? null);
  const codeAncestor = caretEl?.closest("pre, code");
  if (codeAncestor && editor.contains(codeAncestor)) return;
  const range =
    selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  if (!range || !editor.contains(range.startContainer)) {
    const endRange = document.createRange();
    endRange.selectNodeContents(editor);
    endRange.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(endRange);
  }

  // insertVariable dispatches a bubbling "input" event, so the normal
  // capture/sanitize/emit pipeline runs without extra plumbing here.
  variablesComposable.insertVariable(editor, variable.name, variable);
}

// Dismiss the top-most open overlay (modal / context menu / designer /
// dropdown). Returns true if something was closed so callers can stop.
function closeTopMostOverlay(): boolean {
  if (showContextMenu.value) {
    closeContextMenu();
    return true;
  }
  if (showTableDesigner.value) {
    showTableDesigner.value = false;
    return true;
  }
  if (showColorsDropdown.value) {
    showColorsDropdown.value = false;
    return true;
  }
  if (showHistoryTimeline.value) {
    showHistoryTimeline.value = false;
    return true;
  }
  if (showVariablesPanel.value) {
    showVariablesPanel.value = false;
    return true;
  }
  // The writing-stats panel becomes a bottom sheet on mobile that can cover its
  // own toggle FAB, so Escape must be able to dismiss it (it also has an
  // explicit close button). The comments sidebar is intentionally NOT here:
  // it hosts reply inputs, and closing it on Escape mid-reply would be hostile.
  if (showWritingStatsPanel.value) {
    showWritingStatsPanel.value = false;
    return true;
  }
  if (showEmojiPicker.value) {
    showEmojiPicker.value = false;
    return true;
  }
  if (showTableModal.value) {
    closeTableModal();
    return true;
  }
  if (showTablePropertiesModal.value) {
    closeTablePropertiesModal();
    return true;
  }
  if (showCodeBlockModal.value) {
    closeCodeBlockModal();
    return true;
  }
  if (showImageUploadModal.value) {
    closeImageUploadModal();
    return true;
  }
  if (showEmbedModal.value) {
    closeEmbedModal();
    return true;
  }
  if (showFileManagerModal.value) {
    closeFileManagerModal();
    return true;
  }
  if (showTemplateModal.value) {
    closeTemplateModal();
    return true;
  }
  if (showHtmlCodeModal.value) {
    closeHtmlCodeModal();
    return true;
  }
  if (showFindReplaceModal.value) {
    closeFindReplaceModal();
    return true;
  }
  return false;
}

// Application-level Escape handler: dismiss the top-most open overlay first,
// then fall through to the slash-command menu handler.
function handleGlobalEscape(event: KeyboardEvent) {
  if (event.key === "Escape" && closeTopMostOverlay()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  // Escape disarms an armed Format Painter — it otherwise stayed armed with no
  // way to cancel, and the next paste applied the stale copied format. #19
  if (event.key === "Escape" && hasFormatCopied()) {
    clearCopiedFormat();
    if (editorContent.value) editorContent.value.style.cursor = "";
    event.preventDefault();
    return;
  }
  handleEscape(event);
}

// Application-level document click: close the (hand-rolled) Colors dropdown on
// any outside click, then run the slash-command document handler. Clicks inside
// the trigger/menu are stopped via @click.stop and never reach here.
function handleGlobalDocumentClick(event: MouseEvent) {
  if (showColorsDropdown.value) {
    showColorsDropdown.value = false;
  }
  // Variable autocomplete only re-evaluates on input, so a click elsewhere
  // (which fires no input event) left it open with stale suggestions. Mirror
  // the slash menu's outside-click dismissal.
  if (
    showVariableAutocomplete.value &&
    !(event.target as HTMLElement | null)?.closest(".variable-autocomplete")
  ) {
    showVariableAutocomplete.value = false;
  }
  handleDocumentClick(event);
}

// Writing Assistant: analyze the initial content on mount and whenever the
// content is replaced externally (v-model). Previously the stats were only
// computed inside onInput, so they stayed empty for pre-existing content until
// the user typed a character.
if (writingAssistant) {
  const analyzeCurrentContent = () => {
    writingAssistant?.analyze(
      editorContent.value?.innerHTML ?? props.modelValue ?? ""
    );
  };
  onMounted(() => nextTick(analyzeCurrentContent));
  watch(
    () => props.modelValue,
    (value) => {
      // Only react to external updates (the editor's own edits already run
      // analyze via onInput and don't change props.modelValue synchronously).
      if (editorContent.value && value !== editorContent.value.innerHTML) {
        nextTick(analyzeCurrentContent);
      }
    }
  );
}

// Editor Setup and Cleanup - Using useEditorSetup composable
useEditorSetup({
  editorContent,
  codeContent,
  floatingToolbarTimer,
  modelValue: props.modelValue,
  applySanitizedContent,
  captureSnapshot,
  handleKeydown: onEditorKeydown,
  enableSpellCheck,
  handleDocumentClick: handleGlobalDocumentClick,
  handleEscape: handleGlobalEscape,
  onSelectionChange,
});

// A kept note changes the writer's decisions, not the manuscript or its undo
// history. Save it with the document; hydration and host echoes stay passive.
let writingDecisionsReady = false;
let synchronizedWritingDecisions: string | undefined;
const restoreWritingDecisions = (value: string | undefined) => {
  if (value === undefined || value === synchronizedWritingDecisions) return;
  if (importWritingDecisions(value)) synchronizedWritingDecisions = keptWritingDecisions.value;
};
onMounted(() => {
  restoreWritingDecisions(props.keptWritingNotes);
  writingDecisionsReady = true;
  // Restore editorial choices before deciding whether to introduce the panel.
  // New notes never move the page while typing, and kept notes stay quiet.
  companionOpen.value = window.innerWidth >= 1000 && writingReview.value.notes.some(note => !dismissedWritingNotes.value.has(note.id));
});
watch(() => props.keptWritingNotes, restoreWritingDecisions, { flush: 'post' });
watch(keptWritingDecisions, value => {
  if (!writingDecisionsReady || value === synchronizedWritingDecisions) return;
  synchronizedWritingDecisions = value;
  emit('update:keptWritingNotes', value);
  triggerAutoSave(sanitizeHtml(htmlContent.value));
}, { flush: 'post' });

// Keep discussion metadata in the same save lifecycle as the manuscript. The
// serialized watch tracks data only, never live ranges/elements. Host echoes must
// not re-import highlights: replacing their nodes would disturb a writing caret.
if (comments) {
  let ready = false;
  let synchronizedThreads: string | undefined;
  const restoreCommentModel = (value: string | undefined) => {
    if (value === undefined || value === synchronizedThreads) return;
    if (comments.importThreads(value)) {
      synchronizedThreads = comments.exportThreads();
      captureSnapshot(false);
    }
  };
  onMounted(() => {
    restoreCommentModel(props.commentThreads);
    ready = true;
  });
  watch(() => props.commentThreads, restoreCommentModel, { flush: "post" });
  watch(() => comments.exportThreads(), (value) => {
    if (!ready || value === synchronizedThreads) return;
    synchronizedThreads = value;
    emit("update:commentThreads", value);
    triggerAutoSave(sanitizeHtml(htmlContent.value));
  }, { flush: "post" });
}

// ---------------------------------------------------------------------------
// Cinematic adaptive chrome ("Letterbox") — typing dissolves the toolbar into
// a quiet ambient band; intent (pointer, selection, Escape, toolbar focus)
// brings it back instantly. Declared LAST in setup: useChromeRecede watches
// `suppressed` with flush:"sync", so every flag it reads must already exist.
// ---------------------------------------------------------------------------

// Never recede while any overlay owns the screen — receding under an open
// menu/dialog would yank its anchor away.
const chromeSuppressed = computed(
  () =>
    showColorsDropdown.value ||
    showCommandMenu.value ||
    showVariableAutocomplete.value ||
    showHistoryTimeline.value ||
    showFloatingToolbar.value ||
    showVariablesPanel.value ||
    showLinkModal.value ||
    showImageUploadModal.value ||
    showEmbedModal.value ||
    showFileManagerModal.value ||
    showEmojiPicker.value ||
    showTemplateModal.value ||
    showHtmlCodeModal.value ||
    showFindReplaceModal.value ||
    showCodeBlockModal.value ||
    showTableModal.value ||
    showTableDesigner.value ||
    showTablePropertiesModal.value ||
    showShortcutHelpModal.value ||
    // The audit's suppression gaps: typing in the command palette's search,
    // a comment (modal or sidebar reply), or with the context menu / stats
    // panel open must never dissolve the chrome underneath the overlay.
    showCommandPalette.value ||
    showCommentModal.value ||
    showCommentsSidebar.value ||
    showWritingStatsPanel.value ||
    showContextMenu.value
);

// Desktop-only, and only when the main toolbar is actually rendered. Reuses
// the auto-compact breakpoint: below it the MobileToolbar owns the phone.
// The left rail has no letterbox either — its chrome is already marginal.
// In PILL mode the recede state machine stays on regardless of
// adaptiveChrome: it is what drives the pill's ambient contraction.
const adaptiveChromeEnabled = computed(
  () =>
    props.showToolbar &&
    !props.readonly &&
    viewMode.value !== "code" &&
    (isPillMode.value ||
      (effectiveAdaptiveChrome.value !== "off" &&
        effectiveToolbarPosition.value !== "left" &&
        toolbarShellWidth.value > 640))
);

/** Reported by PlayheadPill — see `blockWhen` below. */
const playheadMenuOpen = ref(false);

// The pill can unmount with a menu still open (a window snap across the 640px
// gate, a keyboard view-mode switch, a host prop flip) — no click, no state
// change, and Vue watchers never fire on teardown, so the pill cannot reliably
// say "closed" on every path. A menu that no longer exists must not block the
// chrome recede forever. #R24-6
watch(isPillMode, (pill) => {
  if (!pill) playheadMenuOpen.value = false;
});

const { receded: chromeReceded, restore: restoreChrome } = useChromeRecede({
  root: rootEl,
  enabled: adaptiveChromeEnabled,
  suppressed: chromeSuppressed,
  // Point-in-time check at the moment the recede timer fires: toolbar
  // dropdowns manage their open state internally, with no reactive flag to
  // include in chromeSuppressed — the chrome must never dissolve under a menu
  // the user is reading. The query is scoped to THIS editor's root, because a
  // document-wide one would let a neighbouring editor's open menu freeze this
  // instance (the very invariant useChromeRecede documents). The pill's menus
  // teleport out of the root, so the pill reports its own state instead. #R23-59
  blockWhen: () =>
    !!rootEl.value?.querySelector(".dropdown-menu") || playheadMenuOpen.value,
});

// Zen ("Estúdio"): the letterbox IS the toolbar. Receded from the very first
// paint (set synchronously in setup, so there is no mount transition), and
// any restore is only a PEEK — a few seconds after intent brought the full
// toolbar out, it tucks itself away again unless the pointer is parked on it
// or an overlay is open.
if (props.toolbarPosition === "zen") {
  chromeReceded.value = true;
}
let zenTuckTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleZenTuck = () => {
  if (zenTuckTimer) clearTimeout(zenTuckTimer);
  zenTuckTimer = setTimeout(() => {
    if (!isZen.value || chromeReceded.value) return;
    // Never tuck when the adaptive chrome is disabled (code view, sub-640px,
    // readonly) — zen must not smuggle the letterbox past those gates. And
    // never tuck under a keyboard user: :hover only sees the pointer, so
    // also hold while focus lives inside the shell.
    if (!adaptiveChromeEnabled.value) return;
    const shell = toolbarShellEl.value;
    const focusInside =
      shell != null &&
      document.activeElement instanceof Node &&
      shell.contains(document.activeElement);
    if (chromeSuppressed.value || shell?.matches(":hover") || focusInside) {
      scheduleZenTuck();
      return;
    }
    chromeReceded.value = true;
  }, 2500);
};
watch([chromeReceded, isZen], ([receded, zen], [, wasZen]) => {
  // Entering zen at runtime (e.g. the playground select) recedes NOW —
  // the mode switch should read as an immediate scene change, not wait
  // out a tuck cycle.
  if (zen && !wasZen) {
    chromeReceded.value = true;
    return;
  }
  if (zen && !receded) {
    scheduleZenTuck();
  } else if (zenTuckTimer) {
    clearTimeout(zenTuckTimer);
    zenTuckTimer = null;
  }
});
onUnmounted(() => {
  if (zenTuckTimer) clearTimeout(zenTuckTimer);
});

// ---------------------------------------------------------------------------
// Playhead pill wiring. The pill is presentational — the HOST owns the state
// machine and geometry: selection wins (the pill IS the bubble), ambient
// while the chrome-recede state machine says "you're writing", home at rest.
// ---------------------------------------------------------------------------
const pillState = computed<PlayheadState>(() => {
  if (showFloatingToolbar.value) return "selection";
  if (chromeReceded.value) return "ambient";
  return "home";
});

// Anchor: the editor root's viewport rect (the pill is position: fixed, so
// it must refresh on window resize AND any scroll).
const pillAnchorRect = ref<PlayheadAnchorRect | null>(null);
const updatePillAnchor = () => {
  if (!isPillMode.value || !rootEl.value) {
    pillAnchorRect.value = null;
    return;
  }
  const r = rootEl.value.getBoundingClientRect();
  // `bottom` lets the pill hide once the editor is FULLY scrolled offscreen
  // (it parks at the viewport top edge until then — never chrome for a
  // document you can't see).
  pillAnchorRect.value = {
    top: r.top,
    left: r.left,
    width: r.width,
    bottom: r.bottom,
  };
};

// Selection travel target — the bubble's clamp/flip math, in VIEWPORT
// coordinates (scrollX/Y zero: fixed positioning, unlike the absolute
// FloatingToolbar).
const pillSelectionPosition = ref<PlayheadSelectionPosition | null>(null);
const updatePillSelection = () => {
  if (!isPillMode.value || pillState.value !== "selection") {
    pillSelectionPosition.value = null;
    return;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    pillSelectionPosition.value = null;
    return;
  }
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    pillSelectionPosition.value = null;
    return;
  }
  // Width from the REAL selection layer (n 36px buttons + 2px gaps + 10px
  // padding) instead of the bubble's generic 240px estimate — the
  // over-estimate parked near-edge selections short of their true clamp.
  const actionCount = unref(floatingActions)?.length ?? 5;
  const selectionLayerWidth = Math.max(
    actionCount * 36 + Math.max(actionCount - 1, 0) * 2 + 10,
    PILL_ESTIMATED_WIDTH / 2
  );
  const pos = computeToolbarPosition({
    rect: {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
    },
    toolbarWidth: selectionLayerWidth,
    viewportWidth: window.innerWidth,
    scrollX: 0,
    scrollY: 0,
  });
  pillSelectionPosition.value = {
    top: pos.top,
    left: pos.left,
    below: pos.below,
  };
};

const refreshPillGeometry = () => {
  updatePillAnchor();
  updatePillSelection();
};
// Install the plugin context once the editing surface exists, then register
// whatever the `plugins` prop holds. Registration is watched so a host that
// swaps its plugin list at runtime gets the new ones installed and the removed
// ones uninstalled. #R23-45
onMounted(() => {
  setPluginContext({
    get editorElement() {
      return editorContent.value ?? null;
    },
    getContent: () => editorContent.value?.innerHTML ?? "",
    setContent: (html: string) => {
      if (!editorContent.value) return;
      // Host/plugin HTML is an ingestion path like any other — sanitize it.
      editorContent.value.innerHTML = sanitizeHtml(html);
      handleContentReplaced();
      captureSnapshot();
    },
    execCommand: (command: string, value?: string) => {
      document.execCommand(command, false, value);
      onInput();
    },
    getSelection: () => globalThis.getSelection(),
    emit: (event: string, ...args: unknown[]) => {
      // Iterate a COPY: off() splices the live array, and a handler removing
      // itself mid-dispatch (the once-pattern) would silently skip the next
      // handler. #R25-8
      pluginEventHandlers
        .get(event)
        ?.slice()
        .forEach((handler) => handler(...args));
    },
    on: (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = pluginEventHandlers.get(event) ?? [];
      handlers.push(handler);
      pluginEventHandlers.set(event, handlers);
    },
    // Without this, a well-behaved uninstall hook had no way to detach its
    // bus handlers — they kept firing after the plugin was swapped out. #R24-18
    off: (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = pluginEventHandlers.get(event);
      if (!handlers) return;
      const index = handlers.indexOf(handler);
      if (index >= 0) handlers.splice(index, 1);
    },
  });

  watch(
    () => props.plugins,
    (next, previous) => {
      const nextList = next ?? [];
      (previous ?? [])
        .filter((plugin) => !nextList.some((p) => p.name === plugin.name))
        .forEach((plugin) => unregisterPlugin(plugin.name));
      nextList.forEach((plugin) => {
        // Identity via the RAW registered object — the summary computed maps
        // to fresh literals per read, so comparing against IT never matched
        // and every parent re-render (each keystroke, with an inline
        // :plugins array) bounced every plugin through uninstall+install,
        // accumulating install-time listeners. #R25-7
        const registered = getRegisteredPlugin(plugin.name);
        // Same OBJECT: nothing changed. Same NAME but a different object: the
        // host swapped the plugin — the old registration must not stay live
        // (that was the advertised-but-broken runtime swap). #R24-16
        // toRaw on OUR side too: a test harness (or a host keeping plugins in
        // reactive state) delivers the prop item as a proxy of the same raw
        // object getRegisteredPlugin returns. #R26-1
        if (registered === toRaw(plugin)) return;
        if (registered) unregisterPlugin(plugin.name);
        registerPlugin(plugin);
      });
    },
    { immediate: true }
  );
});

// Plugins whose editor disappears must get their teardown hook: install-time
// document listeners would otherwise outlive the editor. #R24-17
onUnmounted(() => {
  registeredPlugins.value
    .slice()
    .forEach((plugin) => unregisterPlugin(plugin.name));
});

onMounted(() => {
  window.addEventListener("resize", refreshPillGeometry);
  window.addEventListener("scroll", refreshPillGeometry, true);
  document.addEventListener("selectionchange", updatePillSelection);
  // A consumer that mounts with toolbar-mode="pill" STATICALLY never flips
  // isPillMode and never scrolls before writing — without this seed the
  // anchor stays null and the entire chrome is absent until first
  // interaction (the audit's "no pill on initial mount").
  nextTick(refreshPillGeometry);
});
onUnmounted(() => {
  window.removeEventListener("resize", refreshPillGeometry);
  window.removeEventListener("scroll", refreshPillGeometry, true);
  document.removeEventListener("selectionchange", updatePillSelection);
});
watch([isPillMode, pillState], () => nextTick(refreshPillGeometry));
// The editor can move/resize without any window resize or scroll (panels
// opening, content growing, host layout changes) — the root ResizeObserver
// already tracks that; ride its reactive width to re-anchor the pill.
watch(rootWidth, () => {
  if (isPillMode.value) nextTick(refreshPillGeometry);
  // A size change moves everything below this editor without any scroll
  // event — re-measure who owns the viewport-fixed chrome. #R24-6
  refreshChromeOwnership();
});

// The pill's "⋯" carries the long tail: productivity tools + export.
// The pill's "⋯" carries every capability that has no inline home in the
// capsule — the audit's reachability sweep: undo/redo, the tool actions
// (Find & Replace, View HTML, Clear Formatting), the view-mode switch,
// fullscreen + theme, then productivity and export. Sections are hairline
// dividers.
const PILL_VIEW_MODES = [
  { mode: "editor", label: "Editor view" },
  { mode: "code", label: "Code view" },
  { mode: "split", label: "Split view" },
  { mode: "preview", label: "Preview view" },
] as const;
const pillOverflowItems = computed(() => [
  {
    id: "pill-undo",
    label: "Undo",
    isDisabled: () => historyIndex.value <= 0,
    onClick: undo,
  },
  {
    id: "pill-redo",
    label: "Redo",
    isDisabled: () => historyIndex.value >= history.value.length - 1,
    onClick: redo,
  },
  { divider: true },
  ...unref(toolActions),
  { divider: true },
  ...PILL_VIEW_MODES.map((v) => ({
    id: `pill-view-${v.mode}`,
    label: v.label,
    isActive: () => viewMode.value === v.mode,
    onClick: () => {
      viewMode.value = v.mode;
    },
  })),
  { divider: true },
  {
    id: "pill-theme",
    label: "Toggle theme",
    onClick: toggleTheme,
  },
  {
    id: "pill-fullscreen",
    label: "Fullscreen",
    isActive: () => isFullScreen.value,
    onClick: toggleFullScreen,
  },
  { divider: true },
  ...unref(productivityDropdownItems),
  ...unref(exportDropdownItems),
]);

// Same curated quick-pick palettes the masthead's Colors menu uses.
const pillTextColorPresets = [
  "#000000",
  "#374151",
  "#6b7280",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ffffff",
];
const pillHighlightColorPresets = [
  "#fde047",
  "#fca5a5",
  "#fdba74",
  "#86efac",
  "#5eead4",
  "#93c5fd",
  "#c4b5fd",
  "#f9a8d4",
];

// The letterbox band's three signals (hard cap — it must never become a
// dashboard): current block format, document-position filament, save + count.
const BLOCK_FORMAT_LABELS: Record<string, string> = {
  P: "Paragraph",
  H1: "Heading 1",
  H2: "Heading 2",
  H3: "Heading 3",
  H4: "Heading 4",
  H5: "Heading 5",
  H6: "Heading 6",
  BLOCKQUOTE: "Quote",
  PRE: "Code",
  LI: "List",
  // Structural stops — the walk-up must not skip past a table cell or a
  // figure and mislabel the position as a bare "Paragraph".
  TD: "Table",
  TH: "Table",
  FIGURE: "Figure",
  FIGCAPTION: "Figure",
};
// The last in-editor label survives clicks outside the editor (band clicks,
// FABs, the host page) — snapping back to "Paragraph" on every outside
// click made the band flicker lies.
let lastFormatLabel = "Paragraph";
const letterboxFormatLabel = computed(() => {
  void selectionTick.value;
  const root = editorContent.value;
  const selection =
    typeof window !== "undefined" ? window.getSelection() : null;
  const anchor = selection?.anchorNode ?? null;
  if (!root || !anchor || !root.contains(anchor)) return lastFormatLabel;
  let el: HTMLElement | null =
    anchor.nodeType === Node.ELEMENT_NODE
      ? (anchor as HTMLElement)
      : anchor.parentElement;
  while (el && el !== root) {
    const label = BLOCK_FORMAT_LABELS[el.tagName];
    if (label) {
      lastFormatLabel = label;
      return label;
    }
    el = el.parentElement;
  }
  lastFormatLabel = "Paragraph";
  return "Paragraph";
});

// Playhead filament: the caret's position through the document, throttled —
// selectionchange fires on every keystroke and the value only needs to feel
// alive, not be frame-perfect.
const letterboxProgress = ref(0);
let progressLastUpdate = 0;
let progressTrailing: ReturnType<typeof setTimeout> | null = null;
const readLetterboxProgress = () => {
  const root = editorContent.value;
  if (!root) return;
  const progress = getCaretDocumentProgress(root);
  if (progress != null) letterboxProgress.value = progress;
};
const updateLetterboxProgress = () => {
  if (
    !adaptiveChromeEnabled.value ||
    effectiveAdaptiveChrome.value !== "letterbox"
  ) {
    return;
  }
  const now = Date.now();
  if (now - progressLastUpdate < 150) {
    // Leading-edge-only throttling permanently dropped the LAST caret
    // position of a burst — schedule one trailing read so the filament
    // always settles on the truth.
    if (!progressTrailing) {
      progressTrailing = setTimeout(() => {
        progressTrailing = null;
        progressLastUpdate = Date.now();
        readLetterboxProgress();
      }, 160);
    }
    return;
  }
  progressLastUpdate = now;
  readLetterboxProgress();
};
onUnmounted(() => {
  if (progressTrailing) clearTimeout(progressTrailing);
});
// Content replacement (undo/redo/history jump) moves the caret without a
// reliable selectionchange — refresh the filament off the history index.
watch(historyIndex, () => nextTick(readLetterboxProgress));
onMounted(() =>
  document.addEventListener("selectionchange", updateLetterboxProgress)
);
onUnmounted(() =>
  document.removeEventListener("selectionchange", updateLetterboxProgress)
);

// Auto-save pulse: one soft beat on the band's dot per completed save — the
// band's single use of accent (accent-as-signal).
const letterboxSavePulse = ref(false);
let savePulseTimer: ReturnType<typeof setTimeout> | null = null;
watch(lastSaved, () => {
  letterboxSavePulse.value = true;
  if (savePulseTimer) clearTimeout(savePulseTimer);
  savePulseTimer = setTimeout(() => {
    letterboxSavePulse.value = false;
  }, 1200);
});
onUnmounted(() => {
  if (savePulseTimer) clearTimeout(savePulseTimer);
});
</script>

<style src="../styles/NextLevelEditor.css"></style>
<style src="../styles/editor-variables.css"></style>
<style src="../styles/gap-fallback.css"></style>
<style src="../styles/writing-workspace.css"></style>

<style scoped>
/* History Timeline floating panel (toggled from the Tools dropdown) */
.history-timeline-panel {
  position: fixed;
  top: 140px;
  right: 32px;
  width: 360px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  /* Open panels sit ABOVE the toolbar shell (9999): a bottom-anchored
     panel can reach into the sticky toolbar's zone, and its items must not
     lose clicks to the bar. FABs stay at 9998 (below the shell); dialog
     overlays (10050) still top everything. */
  z-index: 10000;
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  background: var(--editor-bg, #ffffff);
}

/* FAB Transition */
.fab-fade-enter-active,
.fab-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-fade-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

/* Comments / Stats / Variables FABs — refined surface controls, one shared
   material (no gradient blobs). Sized as a matched set; icon is currentColor. */
.comments-toggle-fab,
.writing-stats-toggle-fab,
.variables-toggle-fab {
  position: fixed;
  right: 28px;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface-raised);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px -4px rgba(15, 23, 42, 0.16),
    0 1px 3px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.25s ease, background 0.2s ease, color 0.2s ease,
    border-color 0.2s ease, bottom 0.25s ease;
  z-index: 9998;
}

.theme-dark .comments-toggle-fab,
.theme-dark .writing-stats-toggle-fab,
.theme-dark .variables-toggle-fab {
  box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.5),
    0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* The whole fixed FAB column lifts above the mobile bottom toolbar while it
   is open: MobileToolbar publishes its measured on-screen height as
   --nle-mobile-toolbar-clearance on <html> (0 when hidden), so the offset is
   keyed on actual toolbar state — not a viewport guess — and the FABs never
   cover (or get covered by) the bar despite their higher z-index. */

/* Comments = the primary action: accent icon + a quiet accent ring. */
.comments-toggle-fab {
  bottom: calc(28px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
  width: 56px;
  height: 56px;
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
}

/* Stats = secondary: a calm neutral icon until hovered. */
.writing-stats-toggle-fab {
  bottom: calc(96px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
  width: 52px;
  height: 52px;
  color: var(--color-text-secondary);
}

/* Variables = secondary too; its `bottom` is computed inline so the FAB
   column stays gapless whichever feature flags are on. */
.variables-toggle-fab {
  width: 52px;
  height: 52px;
  color: var(--color-text-secondary);
}

.comments-toggle-fab:hover,
.writing-stats-toggle-fab:hover,
.variables-toggle-fab:hover {
  transform: translateY(-3px);
  background: var(--color-surface-overlay);
  color: var(--toolbar-accent);
  border-color: var(--toolbar-accent);
  box-shadow: 0 14px 34px -10px rgba(15, 23, 42, 0.26),
    0 2px 6px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.theme-dark .comments-toggle-fab:hover,
.theme-dark .writing-stats-toggle-fab:hover,
.theme-dark .variables-toggle-fab:hover {
  box-shadow: 0 14px 34px -10px rgba(0, 0, 0, 0.6),
    0 2px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.comments-toggle-fab:active,
.writing-stats-toggle-fab:active,
.variables-toggle-fab:active {
  transform: translateY(-1px) scale(0.96);
}

.comments-toggle-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  background: var(--toolbar-accent);
  color: #fff;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 2px var(--color-surface-raised);
}

@media (prefers-reduced-motion: reduce) {
  .comments-toggle-fab,
  .writing-stats-toggle-fab,
  .variables-toggle-fab {
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
  }
  .comments-toggle-fab:hover,
  .writing-stats-toggle-fab:hover,
  .variables-toggle-fab:hover,
  .comments-toggle-fab:active,
  .writing-stats-toggle-fab:active,
  .variables-toggle-fab:active {
    transform: none;
  }
}

/* Variables panel — floating browse & insert surface anchored to its FAB.
   Same material as the other floating panels: raised surface, neutral
   shadow, accent used only as a signal. */
.variables-panel {
  position: fixed;
  right: 28px;
  width: 320px;
  max-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 20px 48px -12px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  /* Open panels sit ABOVE the toolbar shell (9999): a bottom-anchored
     panel can reach into the sticky toolbar's zone, and its items must not
     lose clicks to the bar. FABs stay at 9998 (below the shell); dialog
     overlays (10050) still top everything. */
  z-index: 10000;
}

.variables-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.variables-panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.variables-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.variables-panel-close:hover {
  background: var(--color-surface-overlay);
  color: var(--color-text);
}

.variables-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.variables-panel-category {
  padding: 10px 10px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.variables-panel-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 7px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.variables-panel-item:hover,
.variables-panel-item:focus-visible {
  background: var(--color-surface-overlay);
}

.variables-panel-item-name {
  font-family: "Courier New", Consolas, Monaco, monospace;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--toolbar-accent);
  white-space: nowrap;
}

.variables-panel-item-value {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variables-panel-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--color-border);
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* Comment Highlight Pulse */
:deep(.comment-highlight-pulse) {
  animation: commentPulse 2s ease-in-out;
  position: relative;
}

@keyframes commentPulse {
  0%,
  100% {
    background-color: transparent;
    box-shadow: none;
  }
  50% {
    background-color: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
    border-radius: 4px;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .comments-toggle-fab {
    bottom: calc(20px + var(--nle-mobile-toolbar-clearance, 0px) + var(--nle-bottom-dock-clearance, 0px));
    right: 20px;
    width: 56px;
    height: 56px;
  }
}

/* On narrow screens the fixed 320px panel could grow taller than the viewport
   and clip its own top off-screen, stranding the first category (its items
   can't be scrolled into the visible area). Reflow it into a bottom sheet that
   spans the width with margins and is capped to a safe fraction of the
   viewport, so every variable stays reachable via the list's internal scroll.
   The `bottom` is set inline, so the mobile override needs !important. */
@media (max-width: 640px) {
  /* Same clip class as the variables panel: fixed 360px at right:32px puts
     the history panel's left edge at -17px on a 375px phone, cutting off
     entry markers and nav buttons with no way to scroll them into view. */
  .history-timeline-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: calc(100vh - 160px - var(--nle-mobile-toolbar-clearance, 0px));
  }

  .variables-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-height: 70vh;
    bottom: calc(16px + var(--nle-mobile-toolbar-clearance, 0px)) !important;
  }
}

/* ---------------------------------------------------------------------------
   Toolbar position layouts. The root carries data-toolbar-position (mirroring
   effectiveToolbarPosition — absent for "top"); the shell carries
   data-position for the toolbar's own form (styled in NextLevelEditor.css).
   This block only PLACES the shell; below 640px the attribute disappears and
   the classic top layout returns untouched.
--------------------------------------------------------------------------- */

/* Margem: a slim rail absolutely placed in the left padding — the content
   simply flows in the reserved gutter, so no child needs individual offsets. */
.next-level-editor[data-toolbar-position="left"] {
  padding-left: 48px;
}

.next-level-editor[data-toolbar-position="left"] .nle-toolbar-shell {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 48px;
  z-index: 20;
}

/* Baseline: the shell docks under the page. Flex column keeps source order
   for everything else; sticky bottom pins the dock while the editor is in
   view. Menus/tooltips open upward via the shell's data-position styles. */
.next-level-editor[data-toolbar-position="bottom"] {
  display: flex;
  flex-direction: column;
}

.next-level-editor[data-toolbar-position="bottom"] .nle-toolbar-shell {
  order: 99;
  position: sticky;
  bottom: 0;
  top: auto;
}

/* ---------------------------------------------------------------------------
   Cinematic adaptive chrome. Two stacked layers in the toolbar shell (which is
   position: sticky, i.e. a containing block): the toolbar itself and the
   letterbox band. All choreography is opacity-only inside RESERVED space —
   the shell's height never changes, so the text below never reflows. Recede
   is slow and beneath notice (gentle ease); return is near-instant (ease-out).
   Durations come from the --nle-motion tokens, which prefers-reduced-motion
   already collapses to plain quick crossfades.
--------------------------------------------------------------------------- */
.nle-toolbar-shell[data-adaptive] :deep(.editor-toolbar-modern) {
  transition: opacity var(--nle-motion-return, 160ms)
    var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.nle-toolbar-shell[data-adaptive][data-receded] :deep(.editor-toolbar-modern) {
  transition: opacity var(--nle-motion-recede, 450ms)
    var(--nle-ease-gentle, cubic-bezier(0.4, 0, 0.6, 1));
  pointer-events: none;
}

/* Letterbox: the buttons dissolve fully — the band takes their place. */
.nle-toolbar-shell[data-adaptive="letterbox"][data-receded]
  :deep(.editor-toolbar-modern) {
  opacity: 0;
}

/* Recede: the conservative variant — a whisper of the toolbar remains. */
.nle-toolbar-shell[data-adaptive="recede"][data-receded]
  :deep(.editor-toolbar-modern) {
  opacity: 0.16;
}

/* The ambient band: absolute over the toolbar's reserved space, inert until
   the chrome recedes. One shade deeper than the toolbar surface (the house
   lights going down); progressive enhancement via color-mix. */
.nle-letterbox {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 18px;
  background: var(--toolbar-bg, var(--color-surface));
  background: color-mix(
    in srgb,
    var(--toolbar-bg, var(--color-surface)) 88%,
    #000 12%
  );
  border-bottom: 1px solid var(--color-divider, var(--color-border));
  opacity: 0;
  pointer-events: none;
  cursor: pointer;
  transition: opacity var(--nle-motion-return, 160ms)
    var(--nle-ease-out, cubic-bezier(0.05, 0.7, 0.1, 1));
}

.nle-toolbar-shell[data-adaptive="letterbox"][data-receded] .nle-letterbox {
  opacity: 1;
  pointer-events: auto;
  transition: opacity var(--nle-motion-recede, 450ms)
    var(--nle-ease-gentle, cubic-bezier(0.4, 0, 0.6, 1));
}

/* Band ink: the band's surface is the toolbar bg deepened by 12%, so raw
   text-secondary lands at 3.2-4.5:1 in the light presets — below AA for
   12px text. Compensate by mixing the ink toward full text color; the
   plain-var fallback keeps non-color-mix engines readable. */
.nle-letterbox-format {
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--toolbar-text, var(--color-text));
  color: color-mix(
    in srgb,
    var(--toolbar-text-secondary, var(--color-text-secondary)) 45%,
    var(--toolbar-text, var(--color-text)) 55%
  );
  white-space: nowrap;
}

/* Bottom dock: the band's hairline must sit on the edge FACING the content
   (the top), mirroring the docked toolbar's own border flip. */
.nle-toolbar-shell[data-position="bottom"] .nle-letterbox {
  border-bottom: none;
  border-top: 1px solid var(--color-divider, var(--color-border));
}

/* The playhead: a 2px filament that fills as the caret moves through the
   document — the one detail that makes scrolling-while-writing meaningful. */
.nle-letterbox-filament {
  flex: 1;
  height: 2px;
  border-radius: 1px;
  background: var(--color-border);
  overflow: hidden;
}

.nle-letterbox-filament-fill {
  display: block;
  height: 100%;
  border-radius: 1px;
  background: var(--toolbar-text-secondary, var(--color-text-secondary));
  /* Motion token so prefers-reduced-motion collapses the slide; the fill is
     2px tall inside its own overflow:hidden track, so the width transition
     repaints a sliver — acceptable, and scaleX would blur the rounded tip. */
  transition: width var(--nle-motion-morph, 260ms)
    var(--nle-ease-standard, cubic-bezier(0.2, 0, 0, 1));
}

/* Auto-save dot — the band's ONLY use of accent (accent-as-signal). */
.nle-letterbox-save {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--toolbar-text-secondary, var(--color-text-secondary));
  opacity: 0.35;
  transition: opacity var(--nle-motion-quick, 120ms) ease,
    background var(--nle-motion-quick, 120ms) ease;
}

.nle-letterbox-save.is-pulsing {
  background: var(--toolbar-accent, var(--color-primary));
  opacity: 1;
}

.nle-letterbox-count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: var(--toolbar-text, var(--color-text));
  color: color-mix(
    in srgb,
    var(--toolbar-text-secondary, var(--color-text-secondary)) 45%,
    var(--toolbar-text, var(--color-text)) 55%
  );
  white-space: nowrap;
}
</style>
