import { computed, ref, shallowRef, watch } from "vue";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import { getTemplateById } from "../examples/exampleTemplates";
import { MAX_COMMENT_DATA_LENGTH, parseCommentThreads, serializeCommentThreads } from "../../composables/useComments";

import { defaultDocumentMetadata, type DocumentMetadata } from '../../types/document';
import { operationId } from '../../utils/documentDiagnostics';
import { validateDocumentSnapshot } from '../../utils/documentValidation';
export const PLAYGROUND_DRAFT_KEY = "next-level-editor:playground-draft:v1";
const MAX_DRAFT_LENGTH = 2_000_000;
const MAX_STORED_LENGTH = MAX_DRAFT_LENGTH * 2 + MAX_COMMENT_DATA_LENGTH * 2 + 2000;

/** One local draft, bounded in size. No document content is sent to a server. */
export function usePlaygroundDocument(startEmpty: boolean) {
  const { sanitizeHtml } = useHtmlSanitizer();
  const initial = "";
  const content = ref(initial);
  const documentId=ref(operationId()),metadata=shallowRef<DocumentMetadata>(defaultDocumentMetadata());
  // The document workspace and the standalone discussion model share one value.
  // A checkpoint restore must not leave a second, stale discussion in the draft.
  const commentThreads = computed({
    get: () => metadata.value.comments,
    set: (comments: string) => { metadata.value = { ...metadata.value, comments }; },
  });
  const selectedTemplate = ref("empty");
  const baseline = ref(initial);
  const notice = ref("");
  const restoreFailed = ref(false);

  if (!startEmpty) {
    try {
      const stored = localStorage.getItem(PLAYGROUND_DRAFT_KEY);
      if (stored) {
        if (stored.length > MAX_STORED_LENGTH) throw new Error("Draft is too large");
        const draft: unknown = JSON.parse(stored);
        if (draft && typeof draft === "object" && "content" in draft &&
            typeof draft.content === "string" && draft.content.length <= MAX_DRAFT_LENGTH &&
            "version" in draft && (draft.version === 1 || draft.version === 2)) {
          content.value = sanitizeHtml(draft.content);
          if('documentId' in draft && typeof draft.documentId==='string' && /^nle-[\w-]+$/.test(draft.documentId))documentId.value=draft.documentId;
          if('metadata' in draft)metadata.value=validateDocumentSnapshot({html:content.value,metadata:draft.metadata},sanitizeHtml).metadata;
          if ("template" in draft && typeof draft.template === "string" && getTemplateById(draft.template)) {
            selectedTemplate.value = draft.template;
            baseline.value = draft.template === "empty" ? "" : sanitizeHtml(getTemplateById(draft.template)!.content);
          }
          if (content.value !== initial) notice.value = "Draft restored.";
          if ("commentThreads" in draft) {
            try {
              if (typeof draft.commentThreads !== "string") throw new Error("Invalid comments");
              commentThreads.value = serializeCommentThreads(parseCommentThreads(draft.commentThreads));
            } catch {
              restoreFailed.value = true;
              notice.value = "Your writing was restored, but its comments could not be recovered.";
              console.warn("[NextLevelEditor playground] Comment recovery unavailable");
            }
          }
          console.debug("[NextLevelEditor playground] Draft restored", { characters: content.value.length });
        } else throw new Error("Invalid draft");
      }
    } catch {
      restoreFailed.value = true;
      notice.value = "Your previous draft could not be restored. You can still write and export.";
      console.warn("[NextLevelEditor playground] Draft restore unavailable");
    }
  }

  const hasEdits = computed(() => content.value !== baseline.value || commentThreads.value !== "[]");
  watch([content, commentThreads], () => {
    if (hasEdits.value && !restoreFailed.value) notice.value = "";
  });
  const applyTemplate = (id: string) => {
    const template = getTemplateById(id);
    if (!template) return;
    documentId.value=operationId();metadata.value=defaultDocumentMetadata();
    selectedTemplate.value = id;
    content.value = id === "empty" ? "" : sanitizeHtml(template.content);
    commentThreads.value = "[]";
    baseline.value = content.value;
    notice.value = "";
    restoreFailed.value = false;
    console.debug("[NextLevelEditor playground] Template loaded", { template: id });
  };

  const saveDraft = async (html: string) => {
    console.debug("[NextLevelEditor playground] Saving local draft", { characters: html.length });
    try {
      if (html.length > MAX_DRAFT_LENGTH) throw new Error("Draft is too large for local storage");
      const discussion = serializeCommentThreads(parseCommentThreads(commentThreads.value));
      localStorage.setItem(PLAYGROUND_DRAFT_KEY, JSON.stringify({
        version: 2, documentId:documentId.value,
        metadata: { ...metadata.value, comments: discussion },
        content: html,
        commentThreads: discussion,
        template: selectedTemplate.value,
        savedAt: new Date().toISOString(),
      }));
      console.debug("[NextLevelEditor playground] Local draft saved");
      return true;
    } catch {
      console.warn("[NextLevelEditor playground] Local draft save unavailable");
      throw new Error("Local draft could not be saved. Export your document to keep a copy.");
    }
  };

  // Discussion-only edits use the editor's debounced save/retry lifecycle.
  // Saving here too could replace its supplied HTML with an older model value.
  watch(() => JSON.stringify({ ...metadata.value, comments: undefined }), () => {
    void saveDraft(content.value).catch(() => {
      notice.value = 'Local document details could not be saved. Export a copy.';
    });
  });
  return { documentId, metadata, content, commentThreads, selectedTemplate, hasEdits, notice, restoreFailed, applyTemplate, saveDraft };
}
