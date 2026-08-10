import {
  type Ref,
  type ComputedRef,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from "vue";
import { formatHtml } from "../utils/export";

export interface UseEditorSetupOptions {
  editorContent:
    | Ref<HTMLDivElement | null>
    | ComputedRef<HTMLDivElement | null>;
  codeContent: Ref<string>;
  floatingToolbarTimer: Ref<ReturnType<typeof setTimeout> | null>;
  modelValue: string;
  applySanitizedContent: (content: string) => void;
  captureSnapshot: (emitChange?: boolean) => void;
  handleKeydown: (event: KeyboardEvent) => void;
  enableSpellCheck: () => void;
  handleDocumentClick: (event: MouseEvent) => void;
  handleEscape: (event: KeyboardEvent) => void;
  onSelectionChange: () => void;
}

/**
 * Composable for managing editor setup and cleanup lifecycle
 * Handles mounting, unmounting, and event listener setup
 */
export function useEditorSetup(options: UseEditorSetupOptions) {
  const {
    editorContent,
    codeContent,
    floatingToolbarTimer,
    modelValue,
    applySanitizedContent,
    captureSnapshot,
    handleKeydown,
    enableSpellCheck,
    handleDocumentClick,
    handleEscape,
    onSelectionChange,
  } = options;

  // The editable surface is destroyed and recreated by the host on view-mode
  // switches (EditorPanels renders it with v-if) and swapped entirely in split
  // view. A one-time onMounted binding would leave the recreated element with
  // no app-level keydown handling — shortcuts, Tab list indent, the slash menu
  // and Enter handling would silently die after switching to Code view and
  // back — so track the element itself and re-bind whenever it changes.
  // Whether the mount-time init below ever ran. With defaultViewMode="preview"
  // no surface exists at mount, so the pristine-document HISTORY BASELINE was
  // never captured — after switching to Editor, the first edit was not
  // undoable back to the loaded document — and spell check never initialized.
  // The late-bind watch runs the skipped pieces once the surface appears. #R26-4
  let ranSurfaceInit = false;
  // The post-flush watch fires DURING a normal mount too (the template ref
  // binds in the same flush, BEFORE onMounted) — the late path must only run
  // after a mount that completed surface-less, or the baseline is captured
  // twice.
  let mountCompleted = false;

  watch(
    editorContent,
    (el, prevEl) => {
      if (prevEl) {
        prevEl.removeEventListener("keydown", handleKeydown);
      }
      if (el) {
        el.addEventListener("keydown", handleKeydown);
        if (mountCompleted && !ranSurfaceInit) {
          ranSurfaceInit = true;
          // After the view-switch restore fills the surface (its callback was
          // queued before this post-flush watch's nextTick), so the baseline
          // is the loaded document, not an empty div.
          nextTick(() => {
            captureSnapshot(false);
            enableSpellCheck();
          });
        }
      }
    },
    { flush: "post" }
  );

  onMounted(() => {
    if (editorContent.value) {
      ranSurfaceInit = true;
      applySanitizedContent(modelValue);
      captureSnapshot(false);
      editorContent.value.addEventListener("keydown", handleKeydown);
      // Enable spell check by default
      enableSpellCheck();

      // Initialize code editor content
      codeContent.value = formatHtml(modelValue || "");
    }
    mountCompleted = true;
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("selectionchange", onSelectionChange);
  });

  onBeforeUnmount(() => {
    if (editorContent.value) {
      editorContent.value.removeEventListener("keydown", handleKeydown);
    }
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleEscape);
    document.removeEventListener("selectionchange", onSelectionChange);
    if (floatingToolbarTimer.value) {
      clearTimeout(floatingToolbarTimer.value);
    }
  });
}
