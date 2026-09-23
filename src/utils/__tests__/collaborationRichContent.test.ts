import { afterEach, describe, expect, it } from "vitest";
import { bindCollaborativeEditor, type CollaborationBinding } from "../collaborationBinding";
import { createMemoryCollaborationProvider } from "../memoryCollaboration";
import { documentRoot } from "../documentOperations";
import { defaultDocumentMetadata, type DocumentMetadata } from "../../types/document";
import type { CollaborationProvider } from "../../types/collaboration";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";

const { sanitizeHtml } = useHtmlSanitizer();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach(close => close());
  document.body.innerHTML = "";
});

async function room(html: string, metadata = defaultDocumentMetadata()) {
  const base = createMemoryCollaborationProvider();
  const deliveries: (() => void)[] = [];
  let paused = false;
  const provider: CollaborationProvider = {
    async connect(options) {
      const transport = await base.connect(options);
      return {
        ...transport,
        subscribe(receive) {
          return transport.subscribe(update => {
            if (paused) deliveries.push(() => receive(update));
            else receive(update);
          });
        },
      };
    },
  };
  const current = new Map<string, DocumentMetadata>();
  const connect = async (id: string) => {
    const root = document.createElement("div");
    document.body.append(root);
    const binding = await bindCollaborativeEditor({
      root, html, metadata, documentId: "rich-corpus",
      configuration: { provider, user: { id, name: id, color: "#2563eb" } },
      readonly: () => false, sanitize: sanitizeHtml,
      signal: new AbortController().signal,
      onUpdate: () => {}, onState: () => {}, onPresence: () => {},
      onMetadata: value => current.set(id, value),
    });
    cleanups.push(() => binding.destroy());
    return binding;
  };
  const a = await connect("A"), b = await connect("B");
  return {
    a, b, current, connect,
    partition() { paused = true; },
    reconnect() {
      paused = false;
      for (const deliver of deliveries.splice(0).reverse()) {
        deliver();
        deliver();
      }
      expect(a.readHtml()).toBe(b.readHtml());
    },
  };
}

function change(binding: CollaborationBinding, mutate: (root: HTMLElement) => void) {
  const root = documentRoot(binding.readHtml());
  mutate(root);
  binding.applyHtml(root.innerHTML);
}

describe("rich-content concurrent editing corpus", () => {
  it("retains resolved comment anchors while discarding transient decoration", async () => {
    const r = await room('<p data-nle-id="nle-comment"><span class="comment-highlight comment-highlight-resolved comment-highlight-pulse" data-thread-id="thread-one">Resolved passage</span></p>');
    const span = documentRoot(r.b.readHtml()).querySelector("[data-thread-id='thread-one']");
    expect(span?.className).toBe("comment-highlight comment-highlight-resolved");
    r.b.applyHtml(r.b.readHtml().replace("Resolved passage", "Resolved passage revised"));
    expect(documentRoot(r.a.readHtml()).querySelector(".comment-highlight-resolved")?.textContent).toBe("Resolved passage revised");
    expect((await r.connect("Reload")).readHtml()).toBe(r.a.readHtml());
  });

  it("keeps existing character identities when one HTML update formats and extends text", async () => {
    const r = await room('<p data-nle-id="nle-text">Alpha Beta</p>');
    r.partition();
    r.a.applyHtml(r.a.readHtml().replace("Alpha", "<strong>AlphaX</strong>"));
    r.b.applyHtml(r.b.readHtml().replace("Alpha", "<em>Alpha</em>"));
    r.reconnect();
    const result = documentRoot(r.a.readHtml());
    expect(result.textContent).toBe("AlphaX Beta");
    // Yjs formatting at an insertion boundary may include the concurrent X;
    // every original letter must retain B's formatting in either merge order.
    expect(result.querySelector("em")?.textContent).toMatch(/^AlphaX?$/);
    expect(result.querySelector("strong")?.textContent).toContain("Alpha");
    r.a.undo();
    expect(documentRoot(r.b.readHtml()).textContent).toBe("Alpha Beta");
    expect(documentRoot(r.b.readHtml()).querySelector("em")?.textContent).toBe("Alpha");
  });

  it("preserves complete Unicode characters through concurrent replacement and undo", async () => {
    const r = await room('<p data-nle-id="nle-unicode">Olá 🙂 日本語</p><p data-nle-id="nle-other">Remote</p>');
    r.partition();
    r.a.applyHtml(r.a.readHtml().replace("🙂", "😁"));
    r.b.applyHtml(r.b.readHtml().replace("Remote", "Remote العربية"));
    r.reconnect();
    expect(documentRoot(r.a.readHtml()).textContent).toBe("Olá 😁 日本語Remote العربية");
    r.a.undo();
    expect(documentRoot(r.b.readHtml()).textContent).toBe("Olá 🙂 日本語Remote العربية");
  });

  it("preserves a nested-list edit while another author inserts a sibling item", async () => {
    const r = await room('<ul data-nle-id="nle-list"><li><p>Parent</p><ul><li><p>Nested</p></li></ul></li><li><p>Last</p></li></ul>');
    r.partition();
    change(r.a, root => root.querySelector("ul")!.insertAdjacentHTML("afterbegin", "<li><p>New sibling</p></li>"));
    change(r.b, root => { root.querySelector("ul ul p")!.textContent = "Nested by B"; });
    r.reconnect();
    expect(documentRoot(r.a.readHtml()).querySelector("ul ul p")?.textContent).toBe("Nested by B");
    expect(r.a.readHtml()).toContain("New sibling");
    r.a.undo();
    expect(r.b.readHtml()).not.toContain("New sibling");
    expect(r.b.readHtml()).toContain("Nested by B");
    r.a.redo();
    expect((await r.connect("Reload")).readHtml()).toBe(r.a.readHtml());
  });

  it("retains edits in a merged table while another author adds a row", async () => {
    const r = await room('<table data-nle-id="nle-table"><tbody><tr><td colspan="2"><p>Merged</p></td></tr><tr><td><p>Left</p></td><td><p>Right</p></td></tr></tbody></table>');
    r.partition();
    change(r.a, root => root.querySelector("tbody")!.insertAdjacentHTML("afterbegin", "<tr><td><p>New left</p></td><td><p>New right</p></td></tr>"));
    change(r.b, root => { root.querySelector("td[colspan='2'] p")!.textContent = "Merged by B"; });
    r.reconnect();
    expect(documentRoot(r.a.readHtml()).querySelector("td[colspan='2']")?.textContent).toBe("Merged by B");
    expect(documentRoot(r.b.readHtml()).querySelectorAll("tr")).toHaveLength(3);
    r.a.undo();
    expect(documentRoot(r.b.readHtml()).querySelectorAll("tr")).toHaveLength(2);
    expect(r.a.readHtml()).toContain("Merged by B");
    expect((await r.connect("Reload")).readHtml()).toBe(r.a.readHtml());
  });

  it("merges independent image attributes, variable values and nearby text", async () => {
    const r = await room('<p data-nle-id="nle-rich"><img src="https://example.com/chart.png" alt="Chart" width="120"> Intro <span class="editor-variable" data-variable="customer" data-value="Ana">{{ customer }}</span> Tail</p>');
    r.partition();
    change(r.a, root => { root.querySelector("img")!.setAttribute("alt", "Accessible chart"); root.querySelector("[data-variable]")!.setAttribute("data-value", "Bruno"); });
    change(r.b, root => { root.querySelector("img")!.setAttribute("width", "240"); root.querySelector("p")!.lastChild!.textContent = " Tail from B"; });
    r.reconnect();
    const result = documentRoot(r.a.readHtml());
    expect(result.querySelector("img")?.getAttribute("alt")).toBe("Accessible chart");
    expect(result.querySelector("img")?.getAttribute("width")).toBe("240");
    expect(result.querySelector("[data-variable]")?.getAttribute("data-value")).toBe("Bruno");
    expect(result.textContent).toContain("Tail from B");
    r.a.undo();
    const undone = documentRoot(r.b.readHtml());
    expect(undone.querySelector("img")?.getAttribute("alt")).toBe("Chart");
    expect(undone.querySelector("img")?.getAttribute("width")).toBe("240");
    expect(undone.textContent).toContain("Tail from B");
  });

  it("keeps comment anchors through a split while another author edits the passage", async () => {
    const r = await room('<p data-nle-id="nle-commented">Before <span class="comment-highlight" data-thread-id="thread-one">Commented passage</span> After</p><p data-nle-id="nle-next">Next</p>');
    r.partition();
    change(r.a, root => {
      const paragraph = root.querySelector("p")!;
      const second = document.createElement("p");
      second.setAttribute("data-nle-id", "nle-split");
      second.append(paragraph.lastChild!);
      paragraph.after(second);
    });
    change(r.b, root => { root.querySelector("[data-thread-id]")!.textContent = "Commented passage by B"; });
    r.reconnect();
    const result = documentRoot(r.a.readHtml());
    expect(result.querySelector("[data-thread-id='thread-one']")?.textContent).toBe("Commented passage by B");
    expect(result.querySelectorAll("p")).toHaveLength(3);
    expect(result.querySelector("[data-nle-id='nle-commented']")).toBeTruthy();
    r.a.undo();
    expect(r.b.readHtml()).toContain("Commented passage by B");
    expect(documentRoot(r.b.readHtml()).querySelectorAll("p")).toHaveLength(2);
  });
});
