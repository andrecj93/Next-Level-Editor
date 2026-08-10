import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import VariableAutocomplete from "../VariableAutocomplete.vue";

/**
 * The variable autocomplete only re-detected on `input`. Opening it (type
 * "{{ user") then moving the caret away with Home/ArrowLeft — which fire no
 * input — left the menu floating with a stale query. onEditorKeydown now
 * re-detects after a caret-movement key so the menu closes.
 */
let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  window.getSelection()?.removeAllRanges();
});

const menuOpen = () =>
  wrapper!.findComponent(VariableAutocomplete).props("isOpen") === true;

const setCaret = (node: Node, offset: number) => {
  const range = document.createRange();
  range.setStart(node, offset);
  range.collapse(true);
  const sel = window.getSelection()!;
  sel.removeAllRanges();
  sel.addRange(range);
};

describe("variable autocomplete closes when the caret leaves {{ }}", () => {
  it("closes on Home after the caret moves out of the token", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { enableVariables: true, modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    const surface = wrapper.find(".editor-content");
    surface.element.innerHTML = "<p>{{ user</p>";
    const textNode = surface.element.querySelector("p")!.firstChild!;

    // Caret right after "{{ user" → typing detection opens the menu.
    setCaret(textNode, textNode.textContent!.length);
    await surface.trigger("input");
    await nextTick();
    expect(menuOpen()).toBe(true);

    // Move the caret to the start of the line (Home) — now OUTSIDE the token.
    setCaret(textNode, 0);
    await surface.trigger("keydown", { key: "Home" });
    await nextTick();
    await nextTick();

    expect(menuOpen()).toBe(false);
  });
});
