import { ref, shallowRef, onScopeDispose } from "vue";
import type {
  AiAdapter,
  AiRequest,
  AiResponse,
  DiagnosticSink,
} from "../types/document";
import type { BlockAnchor } from "../utils/documentOperations";
import { diagnostic } from "../utils/documentDiagnostics";
export function useDocumentAi(options: {
  provider: () => AiAdapter | undefined;
  documentId: () => string;
  sink: () => DiagnosticSink | undefined;
}) {
  const status = ref<"idle" | "generating" | "ready" | "error">("idle");
  const preview = ref(""),
    error = ref("");
  const proposal = shallowRef<{
    result: AiResponse;
    anchor: BlockAnchor;
    documentId: string;
  } | null>(null);
  let controller: AbortController | undefined,
    generation = 0;
  function cancel() {
    generation++;
    controller?.abort();
    controller = undefined;
    status.value = "idle";
    preview.value = "";
    proposal.value = null;
  }
  async function generate(
    anchor: BlockAnchor,
    action: AiRequest["action"],
    language: string,
    instruction = "",
    context?: string,
  ) {
    if (status.value === "generating") return;
    const provider = options.provider();
    if (!provider)
      throw new Error("Configure a host AI provider to use this feature.");
    if (!anchor.text.trim()) throw new Error("Select a passage first.");
    if (anchor.text.length > 20000 || (context?.length ?? 0) > 100000)
      throw new Error("The selected scope is too large.");
    cancel();
    const g = generation;
    controller = new AbortController();
    const signal = controller.signal;
    const id = options.documentId();
    status.value = "generating";
    error.value = "";
    diagnostic(options.sink(), "ai.request_started", id, { action });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        provider.generate(
          {
            documentId: id,
            selection: anchor.text,
            action,
            language,
            instruction,
            context,
            signal,
          },
          (text) => {
            if (g === generation && text.length <= 100000) preview.value = text;
          },
        ),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller?.abort();
            reject(new Error("The request timed out."));
          }, 60000);
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        }),
      ]);
      if (g !== generation || signal.aborted || id !== options.documentId())
        return;
      if (typeof response.html !== "string" || response.html.length > 100000)
        throw new Error(
          "The provider returned an invalid or oversized proposal.",
        );
      proposal.value = { result: response, anchor, documentId: id };
      status.value = "ready";
      diagnostic(options.sink(), "ai.completed", id, {
        action,
        outputTokens: response.usage?.outputTokens ?? 0,
      });
    } catch (e) {
      if (g !== generation) return;
      status.value = "error";
      error.value =
        e instanceof Error ? e.message : "The provider request failed.";
      diagnostic(options.sink(), "ai.failed", id, {
        action,
        cancelled: signal.aborted,
      });
    } finally {
      clearTimeout(timer);
    }
  }
  onScopeDispose(cancel);
  return { status, preview, error, proposal, generate, cancel };
}
