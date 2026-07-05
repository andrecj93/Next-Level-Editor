import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, ref, h, nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useActiveStates } from "../useActiveStates";

// Regression for #11: toolbar active-state helpers must re-evaluate as the
// caret moves. useActiveStates now bumps an internal reactive tick on every
// document "selectionchange", so any component that calls isInlineActionActive
// during render re-renders when the selection changes.
describe("useActiveStates reactivity on selection change", () => {
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const placeCaretIn = (node: Node) => {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Some environments require an explicit event to notify listeners.
    document.dispatchEvent(new Event("selectionchange"));
  };

  it("re-renders the bold active-state as the caret moves in and out of bold text", async () => {
    const editor = document.createElement("div");
    editor.contentEditable = "true";
    editor.innerHTML = "<p><strong>bold</strong> plain</p>";
    document.body.appendChild(editor);

    const editorRef = ref<HTMLDivElement | null>(editor);

    const TestComponent = defineComponent({
      setup() {
        const { isInlineActionActive } = useActiveStates(editorRef);
        return () =>
          h("span", { class: "flag" }, String(isInlineActionActive("strong")));
      },
    });

    wrapper = mount(TestComponent);

    const strongNode = editor.querySelector("strong")!.firstChild!;
    const plainText = editor.querySelector("p")!.lastChild!;

    placeCaretIn(strongNode);
    await nextTick();
    expect(wrapper.find(".flag").text()).toBe("true");

    placeCaretIn(plainText);
    await nextTick();
    expect(wrapper.find(".flag").text()).toBe("false");
  });

  it("removes the selectionchange listener on unmount", () => {
    const editorRef = ref<HTMLDivElement | null>(document.createElement("div"));
    const added: string[] = [];
    const removed: string[] = [];
    const origAdd = document.addEventListener.bind(document);
    const origRemove = document.removeEventListener.bind(document);
    document.addEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === "selectionchange") added.push(type);
      // @ts-expect-error passthrough
      return origAdd(type, ...rest);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, ...rest: unknown[]) => {
      if (type === "selectionchange") removed.push(type);
      // @ts-expect-error passthrough
      return origRemove(type, ...rest);
    }) as typeof document.removeEventListener;

    const TestComponent = defineComponent({
      setup() {
        useActiveStates(editorRef);
        return () => h("div");
      },
    });
    const w = mount(TestComponent);
    w.unmount();

    document.addEventListener = origAdd;
    document.removeEventListener = origRemove;

    expect(added).toContain("selectionchange");
    expect(removed).toContain("selectionchange");
  });
});
