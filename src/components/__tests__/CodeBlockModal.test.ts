import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import CodeBlockModal from "../CodeBlockModal.vue";

// CodeBlockModal wraps its dialog in `<teleport to="body">`. Stubbing teleport
// renders that content inline in the wrapper, so `find`/`trigger`/`emitted`
// all work against a single tree.
const mountModal = (props: Record<string, unknown> = {}) =>
  mount(CodeBlockModal, {
    props: { show: true, ...props },
    global: { stubs: { teleport: true } },
  });

describe("CodeBlockModal", () => {
  describe("open vs closed", () => {
    it("renders nothing when show is false", () => {
      const w = mount(CodeBlockModal, {
        props: { show: false },
        global: { stubs: { teleport: true } },
      });
      expect(w.find(".modal-overlay").exists()).toBe(false);
      expect(w.find(".modal-content").exists()).toBe(false);
    });

    it("renders the dialog, language select and code textarea when open", () => {
      const w = mountModal();
      expect(w.find(".modal-content").exists()).toBe(true);
      expect(w.find("#language-select").exists()).toBe(true);
      expect(w.find("#code-input").exists()).toBe(true);
      expect(w.find(".modal-header h3").text()).toBe("Insert Code Block");
    });

    it("applies the theme class to the overlay (custom and default)", () => {
      const dark = mountModal({ theme: "theme-dark" });
      expect(dark.get(".modal-overlay").classes()).toContain("theme-dark");

      const def = mountModal();
      expect(def.get(".modal-overlay").classes()).toContain("theme-light");
    });
  });

  describe("language select", () => {
    it("lists all supported languages and defaults to javascript", () => {
      const w = mountModal();
      const options = w.findAll("#language-select option");
      expect(options.length).toBe(22);

      const values = options.map(
        (o) => (o.element as HTMLOptionElement).value
      );
      expect(values).toContain("plaintext");
      expect(values).toContain("typescript");
      expect(values).toContain("markdown");

      const select = w.get("#language-select").element as HTMLSelectElement;
      expect(select.value).toBe("javascript");
      expect((w.vm as any).selectedLanguage).toBe("javascript");
    });

    it("updates selectedLanguage and the preview language class on change", async () => {
      const w = mountModal();
      await w.get("#code-input").setValue("print('hi')");
      await w.get("#language-select").setValue("python");

      expect((w.vm as any).selectedLanguage).toBe("python");
      expect(w.find(".code-preview code").classes()).toContain(
        "language-python"
      );
    });
  });

  describe("code input, preview and validation", () => {
    it("disables Insert Code until code is entered, enables it once filled", async () => {
      const w = mountModal();
      const insert = w.get(".btn-primary").element as HTMLButtonElement;
      expect(insert.disabled).toBe(true);

      await w.get("#code-input").setValue("const x = 1");
      expect(insert.disabled).toBe(false);
    });

    it("hides the preview while empty and shows highlighted code once filled", async () => {
      const w = mountModal();
      expect(w.find(".preview-section").exists()).toBe(false);
      expect((w.vm as any).highlightedCode).toBe("");

      await w.get("#code-input").setValue("const x = 1");

      expect(w.find(".preview-section").exists()).toBe(true);
      const code = w.find(".code-preview code");
      expect(code.exists()).toBe(true);
      expect(code.classes()).toContain("language-javascript");
      expect((w.vm as any).highlightedCode).toBeTruthy();
      expect(typeof (w.vm as any).highlightedCode).toBe("string");
    });

    it("inserts two spaces at the caret when Tab is pressed in the textarea", async () => {
      const w = mountModal();
      const ta = w.get("#code-input");
      await ta.setValue("abcd");

      const el = ta.element as HTMLTextAreaElement;
      el.selectionStart = 2;
      el.selectionEnd = 2;

      await ta.trigger("keydown", { key: "Tab" });

      // "ab" + two spaces + "cd"
      expect((w.vm as any).code).toBe("ab  cd");
    });
  });

  describe("insert flow", () => {
    it("emits insert with the exact { code, language } payload, then closes and clears", async () => {
      const w = mountModal();
      await w.get("#language-select").setValue("typescript");
      await w.get("#code-input").setValue("const x: number = 1");

      await w.get(".btn-primary").trigger("click");

      const insertEvents = w.emitted("insert");
      expect(insertEvents).toBeTruthy();
      expect(insertEvents!.length).toBe(1);
      expect(insertEvents![0]).toEqual([
        { code: "const x: number = 1", language: "typescript" },
      ]);

      // insertCode() calls close() afterwards, which emits close and resets code
      expect(w.emitted("close")).toBeTruthy();
      expect((w.vm as any).code).toBe("");
    });

    it("carries the default javascript language when none is changed", async () => {
      const w = mountModal();
      await w.get("#code-input").setValue("let a = 2");
      await w.get(".btn-primary").trigger("click");

      expect(w.emitted("insert")![0]).toEqual([
        { code: "let a = 2", language: "javascript" },
      ]);
    });

    it("does not emit insert when the disabled Insert button is clicked with no code", async () => {
      const w = mountModal();
      await w.get(".btn-primary").trigger("click");
      expect(w.emitted("insert")).toBeUndefined();
    });

    it("insertCode is a no-op when code is empty (guard branch)", () => {
      // The button is disabled while empty, so this guard is only reachable
      // programmatically — invoke it directly to cover the early return.
      const w = mountModal();
      (w.vm as any).insertCode();
      expect(w.emitted("insert")).toBeUndefined();
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("closing", () => {
    it("Cancel clears the code and emits close, re-disabling Insert", async () => {
      const w = mountModal();
      await w.get("#code-input").setValue("dirty");
      expect((w.get(".btn-primary").element as HTMLButtonElement).disabled).toBe(
        false
      );

      await w.get(".btn-cancel").trigger("click");

      expect(w.emitted("close")).toBeTruthy();
      expect((w.vm as any).code).toBe("");
      expect((w.get("#code-input").element as HTMLTextAreaElement).value).toBe(
        ""
      );
      expect((w.get(".btn-primary").element as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(w.find(".preview-section").exists()).toBe(false);
    });

    it("the ✕ close button emits close", async () => {
      const w = mountModal();
      await w.get(".close-btn").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
    });

    it("clicking the overlay backdrop emits close", async () => {
      const w = mountModal();
      await w.get(".modal-overlay").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
    });

    it("clicking inside the dialog does not emit close (@click.stop)", async () => {
      const w = mountModal();
      await w.get(".modal-content").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });
  });
});
