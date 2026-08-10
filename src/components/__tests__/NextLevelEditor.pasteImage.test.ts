import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * Round-13 paste/drop image cluster:
 *  - #4 (HIGH): an image-only clipboard (screenshot, "Copy image") carries no
 *    text/html, so onPaste bailed WITHOUT preventDefault and the browser
 *    inserted a blob:/unsanitized <img> that vanished on reload. The handler now
 *    reads the image blob and inserts it as a data-URL image.
 *  - #14 (MED): dropping formatted text into a code block inserted rich markup
 *    soup; onDrop now mirrors onPaste's code-block guard and inserts plain text.
 */
describe("NextLevelEditor image paste + code-block drop guard", () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  let execSpy: ReturnType<typeof vi.fn> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    execSpy = null;
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
  });

  const flush = async () => {
    // The image insert chains through an async FileReader, so drain several
    // macrotasks before asserting.
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 5));
      await nextTick();
    }
  };

  const mountEditor = async (html: string) => {
    execSpy = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execSpy;
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: html },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();
    return wrapper.find(".editor-content");
  };

  const caretIn = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const imageClipboard = (file: File) => ({
    preventDefault: vi.fn(),
    clipboardData: {
      getData: () => "", // image-only: no text/html, no text/plain
      items: [
        {
          kind: "file",
          type: file.type,
          getAsFile: () => file,
        },
      ],
      files: [file],
    },
  });

  it("inserts an image pasted as a bare blob (no text/html) (#4)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    const file = new File([new Uint8Array([1, 2, 3, 4])], "shot.png", {
      type: "image/png",
    });
    await surface.trigger("paste", imageClipboard(file));
    await flush();

    // The image landed in the live DOM as a data-URL <img> (via the sanitized
    // embed path), not a dropped blob: URL.
    const img = surface.element.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toMatch(/^data:image\/png/);
  });

  it("html+image clipboard keeps the RICH flavor — Excel/Word paste stays editable (#r15-3)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    // Excel/Word/"Copy image" put BOTH a bitmap and text/html on the clipboard.
    const file = new File([new Uint8Array([1, 2, 3, 4])], "cells.png", {
      type: "image/png",
    });
    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? "<table><tr><td>A1</td><td>B1</td></tr></table>"
            : "A1\tB1",
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
        files: [file],
      },
    });
    await flush();

    // The editable table was inserted via the sanitized html path…
    expect(execSpy).toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("A1")
    );
    // …and the bitmap did NOT shadow it into a flat picture.
    expect(
      surface.element.querySelector(".embedded-resizable-container")
    ).toBeNull();
  });

  it("a rejected image-only paste gives feedback instead of silently doing nothing (#r15-28)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    // Image-only clipboard, but over the 10MB inline cap.
    const big = {
      name: "huge.png",
      type: "image/png",
      size: 11 * 1024 * 1024,
    } as File;
    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: () => "",
        items: [{ kind: "file", type: "image/png", getAsFile: () => big }],
        files: [big],
      },
    });
    await flush();

    // Nothing inserted…
    expect(surface.element.querySelector("img")).toBeNull();
    // …but the user is TOLD why (toast), not left with a dead paste.
    const toast = wrapper!
      .findComponent({ name: "ModalsContainer" })
      .props("toastMessage") as string;
    expect(toast.toLowerCase()).toContain("image");
  });

  it("falls back to the bitmap when the html flavor sanitizes to nothing — Office single image (#r16-1)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    // Office "Copy image" ships text/html whose ONLY payload is a local-file
    // <img> the sanitizer must strip — the bitmap in items is the real content.
    const file = new File([new Uint8Array([1, 2, 3, 4])], "clip.png", {
      type: "image/png",
    });
    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<img src="file:///C:/Temp/msohtmlclip1/01/clip_image001.png">'
            : "",
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
        files: [file],
      },
    });
    await flush();

    const img = surface.element.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toMatch(/^data:image\/png/);
    // The husk html was NOT inserted.
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.anything()
    );
  });

  it("falls back to text/plain when the html flavor sanitizes to nothing and there is no bitmap (#r16-1)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<img src="file:///C:/Temp/clip_image001.png">'
            : type === "text/plain"
              ? "hello from plain"
              : "",
        items: [],
        files: [],
      },
    });
    await flush();

    expect(execSpy).toHaveBeenCalledWith(
      "insertText",
      false,
      "hello from plain"
    );
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.anything()
    );
  });

  it("an image-only list item prefers the bitmap, not an empty bullet (#r18)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    // A bulleted image from Word: the <li>'s only content is a file:// image
    // the sanitizer strips, leaving <ul><li></li></ul>. A bitmap is on the
    // clipboard — it must win, or the image is lost to an empty bullet.
    const file = new File([new Uint8Array([1, 2, 3, 4])], "bullet.png", {
      type: "image/png",
    });
    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<ul><li><img src="file:///C:/Temp/clip_image001.png"></li></ul>'
            : "",
        items: [{ kind: "file", type: "image/png", getAsFile: () => file }],
        files: [file],
      },
    });
    await flush();

    const img = surface.element.querySelector("img");
    expect(img).not.toBeNull();
    expect(img!.getAttribute("src")).toMatch(/^data:image\/png/);
    // The empty-bullet husk was NOT inserted.
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.anything()
    );
  });

  it("an empty checklist with no bitmap still pastes its structure (#r17-b78-1 kept)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    // Empty checklist: no text, no media — exercises the htmlHasStructure path.
    await surface.trigger("paste", {
      preventDefault: vi.fn(),
      clipboardData: {
        getData: (type: string) =>
          type === "text/html"
            ? '<ul class="checklist"><li data-checked="false"><br></li></ul>'
            : "",
        items: [],
        files: [],
      },
    });
    await flush();

    // No bitmap, no image path — the list structure is inserted, not dropped.
    expect(execSpy).toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("<li")
    );
  });

  it("a non-image FILE drop is cancelled with feedback — never navigates the page away (#r16-5)", async () => {
    const surface = await mountEditor("<p>hi</p>");
    const p = surface.element.querySelector("p")!;
    caretIn(p.firstChild!, 2);

    const pdf = { name: "report.pdf", type: "application/pdf" } as File;
    // A real cancelable event: defaultPrevented is the browser-observable
    // outcome (trigger()'s payload can't shadow preventDefault reliably).
    const ev = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", {
      value: {
        getData: () => "", // file drops carry no text/html
        items: [{ kind: "file", type: "application/pdf", getAsFile: () => pdf }],
        files: [pdf],
      },
    });
    surface.element.dispatchEvent(ev);
    await flush();

    // Without preventDefault the browser's default action NAVIGATES the tab to
    // the file, destroying the editing session.
    expect(ev.defaultPrevented).toBe(true);
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.anything()
    );
    const toast = wrapper!
      .findComponent({ name: "ModalsContainer" })
      .props("toastMessage") as string;
    expect(toast.toLowerCase()).toContain("image");
  });

  it("drops formatted text into a code block as PLAIN text (#14)", async () => {
    const surface = await mountEditor("<pre><code>const x = 1;</code></pre>");
    const codeText = surface.element.querySelector("code")!.firstChild!;
    caretIn(codeText, 5);

    await surface.trigger("drop", {
      preventDefault: vi.fn(),
      clientX: 0,
      clientY: 0,
      dataTransfer: {
        getData: (type: string) =>
          type === "text/html"
            ? "<b>bold</b> text"
            : type === "text/plain"
              ? "bold text"
              : "",
        files: [],
        items: [],
      },
    });
    await nextTick();

    expect(execSpy).toHaveBeenCalledWith("insertText", false, "bold text");
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("<b>")
    );
  });
});
