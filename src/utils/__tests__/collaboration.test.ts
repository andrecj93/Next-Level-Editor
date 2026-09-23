import { afterEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { createMemoryCollaborationProvider } from "../memoryCollaboration";
import {
  bindCollaborativeEditor,
  type CollaborationBinding,
} from "../collaborationBinding";
import { useHtmlSanitizer } from "../../composables/useHtmlSanitizer";
import { defaultDocumentMetadata } from "../../types/document";
import type { CollaborationProvider } from "../../types/collaboration";
import {
  updateSharedMetadata,
  readSharedMetadata,
} from "../collaborationMetadata";
const { sanitizeHtml } = useHtmlSanitizer();
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
  document.body.innerHTML = "";
});
describe("structured collaborative editing", () => {
  it("converges same-paragraph edits with reordered duplicate updates and retains rich anchors", async () => {
    const base = createMemoryCollaborationProvider();
    const deliveries: (() => void)[] = [];
    let paused = false;
    const provider: CollaborationProvider = {
      async connect(options) {
        const transport = await base.connect(options);
        return {
          ...transport,
          subscribe(receive) {
            return transport.subscribe((update) => {
              if (paused) deliveries.push(() => receive(update));
              else receive(update);
            });
          },
        };
      },
    };
    const html =
      '<p data-nle-id="nle-a">Alpha Beta Gamma</p><ul data-nle-id="nle-list"><li><p>One</p><ul><li><p>Nested</p></li></ul></li></ul><table data-nle-id="nle-table"><tr><td colspan="2"><p>Merged cell</p></td></tr><tr><td><p>Left</p></td><td><p>Right</p></td></tr></table><p data-nle-id="nle-rich"><img src="https://example.com/image.png" alt="Diagram"> <span class="editor-variable" data-variable="name" data-value="Ana">{{ name }}</span> <span class="comment-highlight" data-thread-id="thread-one">Commented</span> <a href="#source" data-nle-cite="nle-source" data-nle-locator="42">[1]</a></p>';
    async function connect(name: string) {
      const root = document.createElement("div");
      document.body.append(root);
      const binding = await bindCollaborativeEditor({
        root,
        documentId: "corpus",
        html,
        configuration: { provider, user: { id: name, name, color: "#2563eb" } },
        readonly: () => false,
        sanitize: sanitizeHtml,
        signal: new AbortController().signal,
        onUpdate: () => {},
        onState: () => {},
        onPresence: () => {},
      });
      cleanups.push(() => binding.destroy());
      return binding;
    }
    const a = await connect("A"),
      b = await connect("B");
    paused = true;
    a.applyHtml(a.readHtml().replace("Beta ", ""));
    b.applyHtml(b.readHtml().replace("Gamma", "Gamma Added"));
    b.applyHtml(b.readHtml().replace("Alpha", "<em>Alpha</em>"));
    paused = false;
    for (const deliver of [...deliveries].reverse()) {
      deliver();
      deliver();
    }
    expect(a.readHtml()).toBe(b.readHtml());
    const result = document.createElement("div");
    result.innerHTML = a.readHtml();
    expect(result.firstElementChild?.textContent).toBe("Alpha Gamma Added");
    expect(result.querySelector("em")?.textContent).toBe("Alpha");
    expect(result.querySelector("td[colspan='2']")?.textContent).toBe(
      "Merged cell",
    );
    expect(result.querySelector("ul ul li")?.textContent).toBe("Nested");
    expect(result.querySelector("img")?.alt).toBe("Diagram");
    expect(
      result.querySelector("[data-variable]")?.getAttribute("data-variable"),
    ).toBe("name");
    expect(result.querySelector("[data-thread-id]")?.textContent).toBe(
      "Commented",
    );
    expect(
      result.querySelector("[data-nle-cite]")?.getAttribute("data-nle-locator"),
    ).toBe("42");
    a.undo();
    expect(b.readHtml()).toContain("Added");
    expect(b.readHtml()).toContain("Beta");
  });
  it("synchronizes two peers and local undo preserves the other author edits", async () => {
    const provider = createMemoryCollaborationProvider();
    async function connect(name: string) {
      const root = document.createElement("div");
      document.body.append(root);
      const binding = await bindCollaborativeEditor({
        root,
        documentId: "shared",
        html: '<p data-nle-id="nle-a">Hello</p><p data-nle-id="nle-b">World</p>',
        configuration: { provider, user: { id: name, name, color: "#2563eb" } },
        readonly: () => false,
        sanitize: sanitizeHtml,
        signal: new AbortController().signal,
        onUpdate: () => {},
        onState: () => {},
        onPresence: () => {},
      });
      cleanups.push(() => binding.destroy());
      return binding;
    }
    const ana = await connect("Ana"),
      bruno = await connect("Bruno");
    ana.applyHtml(ana.readHtml().replace("Hello", "Hello Ana"));
    bruno.applyHtml(bruno.readHtml().replace("World", "World Bruno"));
    expect(ana.readHtml()).toContain("World Bruno");
    expect(bruno.readHtml()).toContain("Hello Ana");
    ana.undo();
    expect(ana.readHtml()).not.toContain("Hello Ana");
    expect(ana.readHtml()).toContain("World Bruno");
    expect(bruno.readHtml()).toBe(ana.readHtml());
    ana.redo();
    expect(ana.readHtml()).toContain("Hello Ana");
  });
  it("merges offline edits and independent metadata additions", () => {
    const first = new Y.Doc(),
      second = new Y.Doc();
    const baseline = defaultDocumentMetadata();
    first.getText("prose").insert(0, "Text");
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first));
    first.getText("prose").insert(4, " A");
    second.getText("prose").insert(0, "B ");
    updateSharedMetadata(first.getMap("metadata"), baseline, {
      ...baseline,
      notes: [{ id: "nle-a", text: "Ana note" }],
    });
    updateSharedMetadata(second.getMap("metadata"), baseline, {
      ...baseline,
      notes: [{ id: "nle-b", text: "Bruno note" }],
    });
    const a = Y.encodeStateAsUpdate(first),
      b = Y.encodeStateAsUpdate(second);
    Y.applyUpdate(first, b);
    Y.applyUpdate(second, a);
    expect(first.getText("prose").toString()).toBe("B Text A");
    expect(second.getText("prose").toString()).toBe("B Text A");
    expect(
      readSharedMetadata(first.getMap("metadata"), sanitizeHtml).notes,
    ).toHaveLength(2);
    first.destroy();
    second.destroy();
  });
  it("viewers receive edits but cannot write through the adapter", async () => {
    const provider = createMemoryCollaborationProvider();
    const roots = [
      document.createElement("div"),
      document.createElement("div"),
    ];
    roots.forEach((r) => document.body.append(r));
    const bindings: CollaborationBinding[] = [];
    for (let i = 0; i < 2; i++) {
      bindings.push(
        await bindCollaborativeEditor({
          root: roots[i],
          documentId: "viewer",
          html: "<p>Initial</p>",
          configuration: {
            provider,
            user: { id: String(i), name: String(i), color: "#2563eb" },
          },
          readonly: () => i === 1,
          sanitize: sanitizeHtml,
          signal: new AbortController().signal,
          onUpdate: () => {},
          onState: () => {},
          onPresence: () => {},
        }),
      );
      cleanups.push(() => bindings[i].destroy());
    }
    bindings[1].applyHtml("<p>Forbidden</p>");
    expect(bindings[0].readHtml()).toContain("Initial");
    bindings[0].applyHtml("<p>Allowed</p>");
    expect(bindings[1].readHtml()).toContain("Allowed");
  });
});
