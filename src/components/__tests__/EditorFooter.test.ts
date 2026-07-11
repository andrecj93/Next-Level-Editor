import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import EditorFooter from "../EditorFooter.vue";

describe("EditorFooter", () => {
  it("renders word and character counts", () => {
    const w = mount(EditorFooter, {
      props: { wordCount: 3, characterCount: 13 },
    });
    expect(w.find(".word-count").text()).toBe("3 words");
    expect(w.find(".char-count").text()).toBe("13 characters");
  });

  it("shows 'Full width' when not full width and emits toggle on click", async () => {
    const w = mount(EditorFooter, {
      props: { wordCount: 0, characterCount: 0, fullWidth: false },
    });
    const toggle = w.find(".width-toggle");
    expect(toggle.text()).toContain("Full width");
    expect(toggle.attributes("aria-pressed")).toBe("false");

    await toggle.trigger("click");
    expect(w.emitted("toggle-full-width")).toHaveLength(1);
  });

  it("shows 'Fit width' and pressed state when full width", () => {
    const w = mount(EditorFooter, {
      props: { wordCount: 0, characterCount: 0, fullWidth: true },
    });
    const toggle = w.find(".width-toggle");
    expect(toggle.text()).toContain("Fit width");
    expect(toggle.attributes("aria-pressed")).toBe("true");
  });
});
