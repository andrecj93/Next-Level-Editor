import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useCommandPalette } from "../useCommandPalette";

/**
 * R23-31: useCommandPalette registers a document-level keydown, and its handler
 * looked only at the key combo — never at which editor has focus. With two
 * editors mounted, one Ctrl/Cmd+Shift+K opened BOTH palettes, and the last one
 * to focus stole the keystrokes. The shortcut must belong to the editor the
 * caret is in.
 */
const wrappers: VueWrapper[] = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
});

/** A stand-in editor: a focusable root plus a palette bound to it. */
const mountEditor = () => {
  let api!: ReturnType<typeof useCommandPalette>;
  const Comp = defineComponent({
    setup() {
      const root = ref<HTMLElement | null>(null);
      api = useCommandPalette({ editorRoot: root });
      return () =>
        h("div", { ref: root, tabindex: -1, class: "next-level-editor" }, [
          h("div", { class: "editor-content", contenteditable: "true" }),
        ]);
    },
  });
  const w = mount(Comp, { attachTo: document.body });
  wrappers.push(w);
  return { w, api };
};

const pressPaletteShortcut = () => {
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      shiftKey: true,
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    })
  );
};

describe("command-palette shortcut belongs to the focused editor (#R23-31)", () => {
  it("opens only the palette of the editor that has focus", async () => {
    const first = mountEditor();
    const second = mountEditor();

    // Put the caret in the FIRST editor.
    (first.w.find(".editor-content").element as HTMLElement).focus();

    pressPaletteShortcut();

    expect(first.api.showCommandPalette.value).toBe(true);
    expect(second.api.showCommandPalette.value).toBe(false);
  });

  it("lets the second editor own it when IT is focused", () => {
    const first = mountEditor();
    const second = mountEditor();

    (second.w.find(".editor-content").element as HTMLElement).focus();

    pressPaletteShortcut();

    expect(first.api.showCommandPalette.value).toBe(false);
    expect(second.api.showCommandPalette.value).toBe(true);
  });

  it("still toggles closed on a second press while focus sits in its palette", () => {
    const only = mountEditor();
    (only.w.find(".editor-content").element as HTMLElement).focus();

    pressPaletteShortcut();
    expect(only.api.showCommandPalette.value).toBe(true);

    // The palette teleports to <body>, so focus is no longer inside the editor
    // root — a second press must still close the palette that IS open.
    (document.activeElement as HTMLElement)?.blur();
    document.body.focus();
    pressPaletteShortcut();
    expect(only.api.showCommandPalette.value).toBe(false);
  });
});
