import { computed, ref, watch } from "vue";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import { getTemplateById } from "../examples/exampleTemplates";

export const PLAYGROUND_DRAFT_KEY = "next-level-editor:playground-draft:v1";
const MAX_DRAFT_LENGTH = 2_000_000;

/** One local draft, bounded in size. No document content is sent to a server. */
export function usePlaygroundDocument(startEmpty: boolean) {
  const { sanitizeHtml } = useHtmlSanitizer();
  const initial = "";
  const content = ref(initial);
  const selectedTemplate = ref("empty");
  const baseline = ref(initial);
  const notice = ref("");
  const restoreFailed = ref(false);

  if (!startEmpty) {
    try {
      const stored = localStorage.getItem(PLAYGROUND_DRAFT_KEY);
      if (stored && stored.length <= MAX_DRAFT_LENGTH + 1000) {
        const draft: unknown = JSON.parse(stored);
        if (draft && typeof draft === "object" && "content" in draft &&
            typeof draft.content === "string" && draft.content.length <= MAX_DRAFT_LENGTH &&
            "version" in draft && draft.version === 1) {
          content.value = sanitizeHtml(draft.content);
          if ("template" in draft && typeof draft.template === "string" && getTemplateById(draft.template)) {
            selectedTemplate.value = draft.template;
            baseline.value = draft.template === "empty" ? "" : sanitizeHtml(getTemplateById(draft.template)!.content);
          }
          if (content.value !== initial) notice.value = "Draft restored.";
          console.debug("[NextLevelEditor playground] Draft restored", { characters: content.value.length });
        }
      }
    } catch {
      restoreFailed.value = true;
      notice.value = "Your previous draft could not be restored. You can still write and export.";
      console.warn("[NextLevelEditor playground] Draft restore unavailable");
    }
  }

  const hasEdits = computed(() => content.value !== baseline.value);
  watch(content, () => {
    if (hasEdits.value && !restoreFailed.value) notice.value = "";
  });
  const applyTemplate = (id: string) => {
    const template = getTemplateById(id);
    if (!template) return;
    selectedTemplate.value = id;
    content.value = id === "empty" ? "" : sanitizeHtml(template.content);
    baseline.value = content.value;
    notice.value = "";
    restoreFailed.value = false;
    console.debug("[NextLevelEditor playground] Template loaded", { template: id });
  };

  const saveDraft = async (html: string) => {
    console.debug("[NextLevelEditor playground] Saving local draft", { characters: html.length });
    try {
      if (html.length > MAX_DRAFT_LENGTH) throw new Error("Draft is too large for local storage");
      localStorage.setItem(PLAYGROUND_DRAFT_KEY, JSON.stringify({
        version: 1,
        content: html,
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

  return { content, selectedTemplate, hasEdits, notice, restoreFailed, applyTemplate, saveDraft };
}
