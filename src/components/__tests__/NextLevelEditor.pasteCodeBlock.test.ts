import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * Pasting into a code block: code is literal text. onPaste sanitized the
 * clipboard's rich HTML and insertHTML'd it wherever the caret was — so a
 * paste inside <pre><code> embedded <b>/<span>/<p> markup soup INSIDE the code
 * sample, corrupting it. With the caret in code, the plain-text clipboard
 * flavor must be inserted instead.
 */
describe("NextLevelEditor paste inside a code block stays plain text", () => {
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
    await nextTick();
    await nextTick();
  };

  const mountEditor = async (html: string) => {
    execSpy = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execSpy;
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: html },
      attachTo: document.body,
    });
    await flush();
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

  const clipboard = (html: string, text: string) => ({
    clipboardData: {
      getData: (type: string) =>
        type === "text/html" ? html : type === "text/plain" ? text : "",
    },
  });

  it("inserts the PLAIN TEXT flavor when the caret is inside <pre><code>", async () => {
    const surface = await mountEditor("<pre><code>const x = 1;</code></pre>");
    const codeText = surface.element.querySelector("code")!.firstChild!;
    caretIn(codeText, 5);

    await surface.trigger(
      "paste",
      clipboard("<p><b>bold</b> snippet</p>", "bold snippet")
    );

    expect(execSpy).toHaveBeenCalledWith("insertText", false, "bold snippet");
    expect(execSpy).not.toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.anything()
    );
  });

  it("still pastes rich HTML in normal prose", async () => {
    const surface = await mountEditor("<p>hello</p>");
    const text = surface.element.querySelector("p")!.firstChild!;
    caretIn(text, 2);

    await surface.trigger(
      "paste",
      clipboard("<p><b>bold</b></p>", "bold")
    );

    expect(execSpy).toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("bold")
    );
  });
});
