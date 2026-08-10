import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import ColorPicker from "../ColorPicker.vue";

/**
 * R23-33: ColorPicker read its theme with a document-wide
 * `document.querySelector(".next-level-editor")`, always the FIRST editor in
 * DOM order — so the picker in a DARK second editor rendered with the light
 * first editor's theme. It must read the theme of the editor it actually lives
 * in. (The old computed also had no reactive DOM dependency, so it never even
 * tracked a theme toggle in its own editor.)
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const Vue3ColorPickerStub = defineComponent({
  name: "Vue3ColorPicker",
  props: { theme: { type: String, default: "" } },
  setup: (props) => () => h("div", { class: "vendor-picker", "data-theme": props.theme }),
});

/** Render a ColorPicker inside a `.next-level-editor` with the given classes. */
const mountInEditor = async (
  editorClasses: string,
  { precedeWith }: { precedeWith?: string } = {}
) => {
  const Host = defineComponent({
    setup() {
      return () =>
        h("div", {}, [
          // Another editor FIRST in the DOM, to catch the document-wide lookup.
          ...(precedeWith
            ? [h("div", { class: `next-level-editor ${precedeWith}` })]
            : []),
          h("div", { class: `next-level-editor ${editorClasses}` }, [
            h(ColorPicker, { modelValue: "#123456", label: "Text color" }),
          ]),
        ]);
    },
  });
  wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { Vue3ColorPicker: Vue3ColorPickerStub } },
  });
  // Open the picker so the vendor component renders.
  await wrapper.find(".color-button").trigger("mousedown");
  await nextTick();
  return wrapper;
};

const vendorTheme = () =>
  wrapper!.find(".vendor-picker").attributes("data-theme");

describe("ColorPicker uses its own editor's theme (#R23-33)", () => {
  it("renders dark inside a dark editor", async () => {
    await mountInEditor("theme-dark");
    expect(vendorTheme()).toBe("dark");
  });

  it("renders light inside a light editor", async () => {
    await mountInEditor("");
    expect(vendorTheme()).toBe("light");
  });

  it("uses its OWN editor's theme, not the first on the page", async () => {
    // A light editor sits first in the DOM; the picker lives in the dark one.
    await mountInEditor("theme-dark", { precedeWith: "first-light-editor" });
    expect(vendorTheme()).toBe("dark");
  });
});
