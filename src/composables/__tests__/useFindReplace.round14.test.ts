import { describe, it, expect, afterEach, vi } from "vitest";
import { ref } from "vue";
import { useFindReplace } from "../useFindReplace";
import { useHtmlSanitizer } from "../useHtmlSanitizer";

/**
 * Round-14 find/replace:
 *  - #6 (HIGH): Replace All rewrote text INSIDE contenteditable=false variable
 *    pills; the sanitizer re-derives the pill from data-variable and reverts it,
 *    leaving DOM/model/history desynced. Matches inside pills are now skipped.
 *  - #7 (HIGH): sequential Replace re-targeted the just-inserted replacement when
 *    it contained the search term (replace "a" → "aa"), growing the text. The
 *    cursor now resumes AFTER the replacement.
 */
const editors: HTMLElement[] = [];
const mount = (html: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.contentEditable = "true";
  el.innerHTML = html;
  document.body.appendChild(el);
  editors.push(el);
  return el;
};

afterEach(() => {
  for (const el of editors.splice(0)) el.remove();
  window.getSelection()?.removeAllRanges();
});

const build = (el: HTMLElement) =>
  useFindReplace({ editorContent: ref(el), captureSnapshot: vi.fn() });

const OPTS = { caseSensitive: false, wholeWord: false };

describe("Replace All skips variable pills (#6)", () => {
  it("does not rewrite the pill label, only plain text", () => {
    const el = mount(
      '<p>Hello ' +
        '<span class="editor-variable" data-variable="name">{{name}}</span>' +
        ' and name here</p>'
    );
    build(el).handleReplaceAll({
      findText: "name",
      replaceText: "XXX",
      options: OPTS,
    });

    // The pill is untouched…
    expect(el.querySelector(".editor-variable")!.textContent).toBe("{{name}}");
    // …but the plain occurrence is replaced.
    expect(el.textContent).toContain("and XXX here");
  });
});

describe("sequential Replace does not re-target its own output (#7)", () => {
  it("replaces both originals when the replacement contains the search term", () => {
    const el = mount("<p>a b a</p>");
    const fr = build(el);

    fr.handleFind({ findText: "a", direction: "next", options: OPTS });
    fr.handleReplace({ findText: "a", replaceText: "aa", options: OPTS });
    // The modal advances after a Replace; the next Find must NOT land inside the
    // inserted "aa".
    fr.handleFind({ findText: "a", direction: "next", options: OPTS });
    fr.handleReplace({ findText: "a", replaceText: "aa", options: OPTS });

    // Both ORIGINAL a's became "aa"; the replacement was never re-targeted.
    expect(el.textContent).toBe("aa b aa");
  });

  it("a plain single Replace still works", () => {
    const el = mount("<p>cat dog cat</p>");
    const fr = build(el);
    fr.handleFind({ findText: "cat", direction: "next", options: OPTS });
    fr.handleReplace({ findText: "cat", replaceText: "fox", options: OPTS });
    expect(el.textContent).toBe("fox dog cat");
  });
});

describe("Replace All re-binds comments/embeds via onContentReplaced (r14b-1)", () => {
  it("invokes onContentReplaced after the innerHTML rewrite", () => {
    const el = mount("<p>cat cat cat</p>");
    const onContentReplaced = vi.fn();
    const fr = useFindReplace({
      editorContent: ref(el),
      captureSnapshot: vi.fn(),
      onContentReplaced,
    });

    fr.handleReplaceAll({ findText: "cat", replaceText: "dog", options: OPTS });

    // The rewrite happened AND the re-bind hook fired (so comment click
    // listeners / embed handlers are restored on the fresh nodes).
    expect(el.textContent).toBe("dog dog dog");
    expect(onContentReplaced).toHaveBeenCalledTimes(1);
  });

  it("still works when no onContentReplaced is provided", () => {
    const el = mount("<p>a a</p>");
    const fr = useFindReplace({ editorContent: ref(el), captureSnapshot: vi.fn() });
    fr.handleReplaceAll({ findText: "a", replaceText: "b", options: OPTS });
    expect(el.textContent).toBe("b b");
  });
});

describe("find highlight cannot bake into the saved model (#16)", () => {
  it("flashes via a sanitizer-stripped class, not an inline background", () => {
    const el = mount("<p>find me here</p>");
    build(el).handleFind({ findText: "me", direction: "next", options: OPTS });

    // The flash is a class on the match's element, NOT an inline background.
    const flashed = el.querySelector<HTMLElement>(".nle-find-flash");
    expect(flashed).not.toBeNull();
    expect(flashed!.style.backgroundColor).toBe("");

    // So on emit the sanitizer strips it — it can never persist into the model.
    const { sanitizeHtml } = useHtmlSanitizer();
    expect(sanitizeHtml(el.innerHTML)).not.toContain("nle-find-flash");
  });
});
