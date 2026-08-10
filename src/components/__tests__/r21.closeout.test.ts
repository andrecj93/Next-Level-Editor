import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ContextMenu from "../ContextMenu.vue";
import { FileManagerService } from "../../utils/fileManager";

/**
 * Round-21 closeout:
 *  - r21-a11y-2 (context-menu half): ContextMenu does not use useModalDialog, so
 *    dismissing it left focus on <body> — the keyboard user lost their place.
 *  - r21-4: the Variables PANEL inserted a contenteditable=false pill inside
 *    <pre><code>, corrupting the sample — the other variable paths already
 *    refuse to touch code.
 *  - r21-3: the File Manager accepted text/html uploads that the sanitizer
 *    deliberately strips (a data:text/html payload is a script-execution
 *    vector), so the attachment's link and bytes were silently discarded on
 *    save. Accepting then discarding is worse than refusing up front.
 */
describe("context menu returns focus when dismissed (#r21-a11y-2)", () => {
  let wrapper: VueWrapper | null = null;
  let opener: HTMLButtonElement | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    opener?.remove();
    opener = null;
    document.body.innerHTML = "";
  });

  it("restores focus to whatever was focused before it opened", async () => {
    opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    wrapper = mount(ContextMenu, {
      props: {
        show: false,
        position: { top: 10, left: 10 },
        items: [{ id: "a", label: "Action", icon: "", onClick: vi.fn() }],
      },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.setProps({ show: true });
    await nextTick();
    await nextTick();
    expect(document.activeElement).not.toBe(opener);

    await wrapper.setProps({ show: false });
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(opener);
  });

  it("does NOT yank focus back when the user dismissed it by clicking elsewhere (#r22-2)", async () => {
    opener = document.createElement("button");
    document.body.appendChild(opener);
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    opener.focus();

    wrapper = mount(ContextMenu, {
      props: {
        show: false,
        position: { top: 10, left: 10 },
        items: [{ id: "a", label: "Action", icon: "", onClick: vi.fn() }],
      },
      attachTo: document.body,
    });
    await nextTick();
    await wrapper.setProps({ show: true });
    await nextTick();
    await nextTick();

    // The dismissal IS the click on another control: it takes focus first,
    // then the document-click listener closes the menu.
    outside.focus();
    expect(document.activeElement).toBe(outside);
    await wrapper.setProps({ show: false });
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(outside);
    expect(document.activeElement).not.toBe(opener);
    outside.remove();
  });
});

describe("variables panel refuses to inject into code (#r21-4)", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
    window.getSelection()?.removeAllRanges();
  });

  it("does not insert a pill when the caret is inside <pre><code>", async () => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: "<pre><code>const a = 1;</code></pre>",
        enableVariables: true,
      },
      attachTo: document.body,
    });
    await nextTick();

    const editor = wrapper.find(".editor-content").element as HTMLElement;
    const codeText = editor.querySelector("code")!.firstChild!;
    const range = document.createRange();
    range.setStart(codeText, 6);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    const before = editor.innerHTML;
    (
      wrapper.vm as unknown as { handlePanelInsert: (v: unknown) => void }
    ).handlePanelInsert?.({ name: "user.name", value: "John Doe" });
    await nextTick();

    expect(editor.querySelector(".editor-variable")).toBeNull();
    expect(editor.innerHTML).toBe(before);
    expect(editor.textContent).toBe("const a = 1;");
  });
});

describe("file manager refuses what the sanitizer would discard (#r21-3)", () => {
  it("rejects a text/html upload instead of silently dropping it later", async () => {
    const service = new FileManagerService();
    await expect(
      service.uploadFile(
        new File(["<h1>x</h1>"], "notes.html", { type: "text/html" })
      )
    ).rejects.toThrow(/not allowed/i);
  });

  it("still accepts the plain-text and image/pdf types it supports", async () => {
    const service = new FileManagerService();
    await expect(
      service.uploadFile(new File(["hi"], "notes.txt", { type: "text/plain" }))
    ).resolves.toBeTruthy();
  });

  it("refuses ONLY what the sanitizer drops — PDF stays allowed", async () => {
    const service = new FileManagerService();
    await expect(
      service.uploadFile(
        new File(["%PDF-"], "doc.pdf", { type: "application/pdf" })
      )
    ).resolves.toBeTruthy();
  });

  it("does not refuse image/svg+xml at the type gate", async () => {
    // SAFE_DATA_FILE_PATTERN excludes ONLY text/html; every image/* (SVG
    // included — it is inert in an <img> context) stays allowed, so refusing
    // more here would silently delete working upload support.
    // The type gate is synchronous and runs BEFORE thumbnail generation, which
    // never settles under happy-dom (Image.onload is never fired — see
    // fileManager.test.ts). So a type rejection would settle immediately;
    // anything still pending has passed the gate.
    const service = new FileManagerService();
    const outcome = await Promise.race([
      service.uploadFile(
        new File(["<svg/>"], "icon.svg", { type: "image/svg+xml" })
      ).then(
        () => "resolved",
        (error: Error) => `rejected:${error.message}`
      ),
      new Promise<string>((resolve) =>
        setTimeout(() => resolve("pending-past-type-gate"), 50)
      ),
    ]);
    expect(outcome).not.toMatch(/not allowed/i);
  });
});
