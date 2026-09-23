import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, ref, shallowRef } from "vue";
import { flushPromises } from "@vue/test-utils";
import { useDocumentClipboard } from "../useDocumentClipboard";
import { useDocumentWorkspace } from "../useDocumentWorkspace";
import { useHtmlSanitizer } from "../useHtmlSanitizer";
import { createReferenceFragment } from "../../utils/referenceClipboard";
import {
  defaultDocumentMetadata,
  type DocumentOptions,
} from "../../types/document";
const { sanitizeHtml } = useHtmlSanitizer();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
function fixture() {
  const scope = effectScope(),
    element = document.createElement("div");
  element.innerHTML = "<p>Destination text</p>";
  document.body.append(element);
  const html = ref(element.innerHTML),
    root = ref<HTMLElement | null>(element),
    notify = vi.fn(),
    sink = vi.fn();
  const metadata = defaultDocumentMetadata();
  metadata.citationStyle = "numbered";
  const options = shallowRef<DocumentOptions>({
    id: "destination",
    metadata,
    onDiagnostic: sink,
  });
  const workspace = scope.run(() =>
    useDocumentWorkspace({
      options,
      root,
      html,
      sanitize: sanitizeHtml,
      locale: () => "en",
      apply: (value) => {
        html.value = value;
        element.innerHTML = value;
      },
    }),
  )!;
  let finish!: () => void;
  vi.spyOn(workspace, "prepareReferences").mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const clipboard = scope.run(() =>
    useDocumentClipboard({
      root,
      options,
      workspace,
      readonly: () => options.value.role === "viewer",
      collaboration: () => undefined,
      sanitize: sanitizeHtml,
      notify,
    }),
  )!;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  document.getSelection()!.removeAllRanges();
  document.getSelection()!.addRange(range);
  const source = defaultDocumentMetadata();
  source.sources = [
    {
      id: "nle-source",
      title: "Private source title",
      author: "Ana",
      year: "2026",
    },
  ];
  const copied = createReferenceFragment(
    '<span data-nle-cite="nle-source">[1]</span>',
    source,
    "origin",
  )!;
  cleanups.push(() => scope.stop());
  return {
    scope,
    clipboard,
    workspace,
    options,
    html,
    root,
    element,
    notify,
    sink,
    copied,
    finish: () => finish(),
  };
}
describe("document clipboard lifecycle", () => {
  it.each(["selection", "content", "document", "role"])(
    "rejects a pending paste after the %s changes",
    async (kind) => {
      const f = fixture();
      expect(f.clipboard.onPaste(f.copied.html, f.copied.data)).toBe(true);
      if (kind === "selection") {
        const range = document.getSelection()!.getRangeAt(0);
        range.selectNodeContents(f.element);
      }
      if (kind === "content") {
        f.html.value = "<p>Newer local edit</p>";
        f.element.innerHTML = f.html.value;
      }
      if (kind === "document")
        f.options.value = { ...f.options.value, id: "new-document" };
      if (kind === "role")
        f.options.value = { ...f.options.value, role: "viewer" };
      const baseline = f.html.value;
      f.finish();
      await flushPromises();
      expect(f.html.value).toBe(baseline);
      expect(f.workspace.session.metadata.value.sources).toEqual([]);
      expect(f.notify).toHaveBeenCalledWith(
        "The document or selection changed. Paste the passage again.",
        "error",
      );
      expect(f.sink).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "reference.paste_failed",
          documentId: "destination",
        }),
      );
      expect(JSON.stringify(f.sink.mock.calls)).not.toContain(
        "Private source title",
      );
    },
  );
  it("cancels work after disposal and records a sanitized cancellation", async () => {
    const f = fixture();
    f.clipboard.onPaste(f.copied.html, f.copied.data);
    f.scope.stop();
    f.finish();
    await flushPromises();
    expect(f.notify).not.toHaveBeenCalled();
    expect(f.workspace.session.metadata.value.sources).toEqual([]);
    expect(f.sink).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "reference.paste_cancelled",
        detail: { disposed: true },
      }),
    );
  });
  it("rejects context-menu mutations for a viewer without requesting clipboard access", async () => {
    const f = fixture();
    f.options.value = { ...f.options.value, role: "viewer" };
    expect(await f.clipboard.contextAction("cut")).toBe(true);
    expect(await f.clipboard.contextAction("paste")).toBe(true);
    expect(f.clipboard.onPaste("<p>Ordinary paste</p>", "")).toBe(false);
    f.clipboard.onPaste(f.copied.html, f.copied.data);
    expect(f.workspace.prepareReferences).not.toHaveBeenCalled();
    expect(f.html.value).toBe("<p>Destination text</p>");
  });
});
