import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * #11 wiring: pasting a Word bulleted/numbered list (styled mso-list paragraphs)
 * must reconstruct a real <ul>/<ol> before sanitizing, so it inserts as a list
 * instead of flat paragraphs with literal bullet glyphs.
 */
describe("NextLevelEditor reconstructs Word lists on paste (#11)", () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  let execSpy: ReturnType<typeof vi.fn> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    execSpy = null;
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
  });

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

  it("inserts a <ul> for a pasted Word bulleted list", async () => {
    const surface = await mountEditor("<p>x</p>");
    caretIn(surface.element.querySelector("p")!.firstChild!, 1);

    const wordHtml =
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>First</p>" +
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>Second</p>";

    await surface.trigger("paste", {
      clipboardData: {
        getData: (type: string) =>
          type === "text/html" ? wordHtml : "First\nSecond",
      },
    });

    const insertHtmlCall = execSpy!.mock.calls.find(
      (c) => c[0] === "insertHTML"
    );
    expect(insertHtmlCall).toBeTruthy();
    const inserted = insertHtmlCall![2] as string;
    expect(inserted).toMatch(/<ul[\s>]/);
    expect(inserted).toContain("First");
    expect(inserted).toContain("Second");
    // The mso-list paragraphs are gone.
    expect(inserted).not.toMatch(/mso-list/i);
  });
});
