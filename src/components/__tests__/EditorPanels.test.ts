import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import EditorPanels from "../EditorPanels.vue";

// EditorPanels is a purely presentational, prop-driven container. Its single
// `viewMode` prop selects which panel(s) render (editor / code / split /
// preview); DOM events on the editable surfaces are re-emitted verbatim. It
// uses no <Teleport> and no <slot>, so a plain detached mount + wrapper queries
// reach everything.
type ViewMode = "editor" | "code" | "split" | "preview";

const mountPanels = (props: Record<string, unknown> = {}) =>
  mount(EditorPanels, {
    props: { viewMode: "editor" as ViewMode, ...props },
  });

describe("EditorPanels", () => {
  describe("container view-mode class", () => {
    it.each([
      ["editor", "view-mode-editor"],
      ["code", "view-mode-code"],
      ["split", "view-mode-split"],
      ["preview", "view-mode-preview"],
    ])("stamps %s viewMode as class %s", (mode, cls) => {
      const w = mountPanels({ viewMode: mode as ViewMode });
      const container = w.get(".editor-container");
      expect(container.classes()).toContain(cls);
      w.unmount();
    });
  });

  describe("viewMode: editor", () => {
    it("renders exactly the WYSIWYG editor panel, no code/split/preview", () => {
      const w = mountPanels({ viewMode: "editor" });
      expect(w.find(".editor-panel").exists()).toBe(true);

      const editable = w.get(".editor-panel .editor-content");
      expect(editable.attributes("contenteditable")).toBe("true");
      // it is the visible editor (not the display:none code-mode twin)
      expect(editable.attributes("style") ?? "").not.toContain("display: none");

      expect(w.find(".code-editor").exists()).toBe(false);
      expect(w.find(".split-divider").exists()).toBe(false);
      expect(w.find(".split-right-panel").exists()).toBe(false);
      expect(w.find(".preview-panel").exists()).toBe(false);
      w.unmount();
    });

    it("applies the default placeholder and a custom one", () => {
      const dflt = mountPanels({ viewMode: "editor" });
      expect(dflt.get(".editor-content").attributes("placeholder")).toBe(
        "Start typing..."
      );
      dflt.unmount();

      const custom = mountPanels({
        viewMode: "editor",
        placeholder: "Write something great",
      });
      expect(custom.get(".editor-content").attributes("placeholder")).toBe(
        "Write something great"
      );
      custom.unmount();
    });

    it.each(["input", "blur", "focus", "mouseup", "contextmenu"])(
      "re-emits the raw %s event from the editable surface",
      async (evt) => {
        const w = mountPanels({ viewMode: "editor" });
        await w.get(".editor-content").trigger(evt);
        const emitted = w.emitted(evt);
        expect(emitted).toBeTruthy();
        expect(emitted!).toHaveLength(1);
        // payload is the DOM Event object forwarded verbatim
        expect(emitted![0][0]).toBeInstanceOf(Event);
        w.unmount();
      }
    );

    it("does not emit the code/split-specific events in editor mode", async () => {
      const w = mountPanels({ viewMode: "editor" });
      await w.get(".editor-content").trigger("input");
      expect(w.emitted("code-input")).toBeUndefined();
      expect(w.emitted("split-editor-input")).toBeUndefined();
      expect(w.emitted("split-right-mode-change")).toBeUndefined();
      w.unmount();
    });
  });

  describe("viewMode: code", () => {
    it("renders the code textarea plus a hidden WYSIWYG twin, no preview/split", () => {
      const w = mountPanels({ viewMode: "code", codeContent: "<p>hi</p>" });

      const textarea = w.get(".code-editor");
      expect(textarea.element.tagName).toBe("TEXTAREA");
      expect((textarea.element as HTMLTextAreaElement).value).toBe("<p>hi</p>");
      expect(textarea.attributes("spellcheck")).toBe("false");

      // The WYSIWYG editor is kept mounted but hidden to preserve functionality
      const hidden = w.get(".editor-panel .editor-content");
      expect(hidden.attributes("style")).toContain("display: none");

      expect(w.find(".preview-panel").exists()).toBe(false);
      expect(w.find(".split-right-panel").exists()).toBe(false);
      expect(w.find(".split-divider").exists()).toBe(false);
      w.unmount();
    });

    it("binds codeContent one-way onto the textarea value", async () => {
      const w = mountPanels({ viewMode: "code", codeContent: "first" });
      expect((w.get(".code-editor").element as HTMLTextAreaElement).value).toBe(
        "first"
      );
      await w.setProps({ codeContent: "second" });
      expect((w.get(".code-editor").element as HTMLTextAreaElement).value).toBe(
        "second"
      );
      w.unmount();
    });

    it("emits code-input on textarea input and code-blur on textarea blur", async () => {
      const w = mountPanels({ viewMode: "code", codeContent: "" });
      const textarea = w.get(".code-editor");

      await textarea.trigger("input");
      expect(w.emitted("code-input")).toBeTruthy();
      expect(w.emitted("code-input")![0][0]).toBeInstanceOf(Event);

      await textarea.trigger("blur");
      expect(w.emitted("code-blur")).toBeTruthy();
      w.unmount();
    });

    it("still re-emits input/focus/blur/mouseup/contextmenu from the hidden WYSIWYG twin", async () => {
      const w = mountPanels({ viewMode: "code" });
      const hidden = w.get(".editor-panel .editor-content");
      await hidden.trigger("input");
      await hidden.trigger("focus");
      await hidden.trigger("blur");
      await hidden.trigger("mouseup");
      await hidden.trigger("contextmenu");
      expect(w.emitted("input")).toBeTruthy();
      expect(w.emitted("focus")).toBeTruthy();
      expect(w.emitted("blur")).toBeTruthy();
      expect(w.emitted("mouseup")).toBeTruthy();
      expect(w.emitted("contextmenu")).toBeTruthy();
      w.unmount();
    });
  });

  describe("viewMode: split", () => {
    it("renders code editor, divider, right panel and both toggle buttons", () => {
      const w = mountPanels({ viewMode: "split" });
      expect(w.find(".code-editor").exists()).toBe(true);
      expect(w.find(".split-divider").exists()).toBe(true);
      expect(w.find(".split-right-panel").exists()).toBe(true);
      const toggles = w.findAll(".split-toggle-btn");
      expect(toggles).toHaveLength(2);
      expect(toggles.map((b) => b.text())).toEqual(["Preview", "Editor"]);
      w.unmount();
    });

    it("defaults splitRightMode to preview: preview panel shown, split editor absent", () => {
      const w = mountPanels({ viewMode: "split", htmlContent: "<b>x</b>" });
      // right-panel preview wrapper is present...
      expect(w.find(".split-right-panel .preview-panel").exists()).toBe(true);
      // ...and the split editable surface is not
      expect(w.find(".split-editor-panel").exists()).toBe(false);

      // the Preview toggle is the active one by default
      const preview = w.findAll(".split-toggle-btn")[0];
      const editor = w.findAll(".split-toggle-btn")[1];
      expect(preview.classes()).toContain("active");
      expect(editor.classes()).not.toContain("active");
      w.unmount();
    });

    it("renders the split preview via v-html from htmlContent", () => {
      const w = mountPanels({
        viewMode: "split",
        htmlContent: "<strong>bold split</strong>",
      });
      const wrapper = w.get(".split-right-panel .preview-content-wrapper");
      expect(wrapper.find("strong").exists()).toBe(true);
      expect(wrapper.text()).toContain("bold split");
      w.unmount();
    });

    it("shows the empty-preview fallback in the split preview when htmlContent is blank", () => {
      const w = mountPanels({ viewMode: "split", htmlContent: "" });
      const wrapper = w.get(".split-right-panel .preview-content-wrapper");
      expect(wrapper.find(".empty-preview").exists()).toBe(true);
      expect(wrapper.text()).toContain("Start typing to see preview...");
      w.unmount();
    });

    it("emits split-right-mode-change with 'editor' / 'preview' when the toggles are clicked", async () => {
      const w = mountPanels({ viewMode: "split" });
      const [previewBtn, editorBtn] = w.findAll(".split-toggle-btn");

      await editorBtn.trigger("click");
      await previewBtn.trigger("click");

      const changes = w.emitted("split-right-mode-change");
      expect(changes).toBeTruthy();
      expect(changes).toHaveLength(2);
      expect(changes![0]).toEqual(["editor"]);
      expect(changes![1]).toEqual(["preview"]);
      w.unmount();
    });

    it("when splitRightMode=editor: shows the split editable surface, hides the preview and flips the active toggle", () => {
      const w = mountPanels({ viewMode: "split", splitRightMode: "editor" });

      const splitEditor = w.get(".split-editor-panel .editor-content");
      expect(splitEditor.attributes("contenteditable")).toBe("true");
      expect(w.find(".split-right-panel .preview-panel").exists()).toBe(false);

      const [previewBtn, editorBtn] = w.findAll(".split-toggle-btn");
      expect(editorBtn.classes()).toContain("active");
      expect(previewBtn.classes()).not.toContain("active");
      w.unmount();
    });

    it("emits split-editor-input from the split editable surface (not plain input)", async () => {
      const w = mountPanels({ viewMode: "split", splitRightMode: "editor" });
      await w.get(".split-editor-panel .editor-content").trigger("input");
      expect(w.emitted("split-editor-input")).toBeTruthy();
      expect(w.emitted("split-editor-input")![0][0]).toBeInstanceOf(Event);
      w.unmount();
    });

    it("re-emits shared blur/focus/mouseup/contextmenu from the split editable surface", async () => {
      const w = mountPanels({ viewMode: "split", splitRightMode: "editor" });
      const surface = w.get(".split-editor-panel .editor-content");
      await surface.trigger("blur");
      await surface.trigger("focus");
      await surface.trigger("mouseup");
      await surface.trigger("contextmenu");
      expect(w.emitted("blur")).toBeTruthy();
      expect(w.emitted("focus")).toBeTruthy();
      expect(w.emitted("mouseup")).toBeTruthy();
      expect(w.emitted("contextmenu")).toBeTruthy();
      w.unmount();
    });
  });

  describe("viewMode: preview", () => {
    it("renders the standalone preview panel with a Preview header, no editor surfaces", () => {
      const w = mountPanels({ viewMode: "preview", htmlContent: "<i>y</i>" });
      const panel = w.get(".preview-panel");
      expect(panel.get(".preview-header").text()).toBe("Preview");

      expect(w.find(".editor-content").exists()).toBe(false);
      expect(w.find(".code-editor").exists()).toBe(false);
      expect(w.find(".split-right-panel").exists()).toBe(false);
      w.unmount();
    });

    it("renders htmlContent as real HTML via v-html", () => {
      const w = mountPanels({
        viewMode: "preview",
        htmlContent: "<strong>rendered</strong>",
      });
      const wrapper = w.get(".preview-panel .preview-content-wrapper");
      expect(wrapper.find("strong").exists()).toBe(true);
      expect(wrapper.text()).toContain("rendered");
      w.unmount();
    });

    it("falls back to the empty-preview placeholder when htmlContent is blank", () => {
      const w = mountPanels({ viewMode: "preview", htmlContent: "" });
      const wrapper = w.get(".preview-panel .preview-content-wrapper");
      expect(wrapper.find(".empty-preview").exists()).toBe(true);
      expect(wrapper.text()).toContain("Start typing to see preview...");
      w.unmount();
    });
  });

  describe("reactive viewMode switching", () => {
    it("swaps panels when viewMode changes without remounting", async () => {
      const w = mountPanels({ viewMode: "editor" });
      expect(w.find(".editor-panel .editor-content").exists()).toBe(true);
      expect(w.find(".preview-panel").exists()).toBe(false);

      await w.setProps({ viewMode: "preview" });
      expect(w.get(".editor-container").classes()).toContain(
        "view-mode-preview"
      );
      expect(w.find(".preview-panel").exists()).toBe(true);
      expect(w.find(".editor-content").exists()).toBe(false);
      w.unmount();
    });
  });

  describe("exposed refs (defineExpose)", () => {
    it("exposes editorRef bound to the live editable element in editor mode", () => {
      const w = mountPanels({ viewMode: "editor" });
      const exposedEl = (w.vm as unknown as { editorRef?: HTMLElement })
        .editorRef;
      expect(exposedEl).toBeTruthy();
      expect(exposedEl).toBe(w.get(".editor-panel .editor-content").element);
      w.unmount();
    });

    it("exposes codeEditorRef bound to the textarea in code mode", () => {
      const w = mountPanels({ viewMode: "code" });
      const exposedEl = (w.vm as unknown as { codeEditorRef?: HTMLElement })
        .codeEditorRef;
      expect(exposedEl).toBe(w.get(".code-editor").element);
      w.unmount();
    });

    it("exposes splitEditorRef bound to the split editable surface", () => {
      const w = mountPanels({ viewMode: "split", splitRightMode: "editor" });
      const exposedEl = (w.vm as unknown as { splitEditorRef?: HTMLElement })
        .splitEditorRef;
      expect(exposedEl).toBe(
        w.get(".split-editor-panel .editor-content").element
      );
      w.unmount();
    });
  });
});
