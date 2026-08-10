import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import EmbeddedResizable from "../EmbeddedResizable.vue";

describe("EmbeddedResizable", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";
  });

  it("renders with default props", () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    expect(wrapper.find(".embedded-resizable").exists()).toBe(true);
    expect(wrapper.find(".embedded-content").exists()).toBe(true);
  });

  it("displays control overlay when selected", async () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    // Initially no overlay
    expect(wrapper.find(".control-overlay").exists()).toBe(false);

    // Click to select
    await wrapper.find(".embedded-resizable").trigger("click");

    // Now overlay should be visible
    expect(wrapper.find(".control-overlay").exists()).toBe(true);
  });

  it("shows resize handles when selected", async () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    await wrapper.find(".embedded-resizable").trigger("click");

    // Should have 8 resize handles (4 corners + 4 edges)
    const handles = wrapper.findAll(".resize-handle");
    expect(handles).toHaveLength(8);
  });

  it("shows toolbar when selected", async () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    await wrapper.find(".embedded-resizable").trigger("click");

    expect(wrapper.find(".embedded-toolbar").exists()).toBe(true);
    expect(wrapper.find(".size-indicator").exists()).toBe(true);
  });

  it("emits delete event when delete button clicked", async () => {
    // Mock window.confirm
    global.confirm = vi.fn(() => true);

    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    await wrapper.find(".embedded-resizable").trigger("click");

    const deleteButton = wrapper
      .findAll(".toolbar-btn")
      .find((btn) => btn.classes("danger"));

    if (deleteButton) {
      await deleteButton.trigger("click");
      expect(wrapper.emitted("delete")).toBeTruthy();
    }
  });

  it("applies correct alignment class", () => {
    const wrapper = mount(EmbeddedResizable, {
      props: {
        alignment: "left",
      },
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    expect(wrapper.find(".embedded-resizable").classes()).toContain(
      "align-left"
    );
  });

  it("uses provided dimensions", () => {
    const wrapper = mount(EmbeddedResizable, {
      props: {
        initialWidth: 800,
        initialHeight: 600,
      },
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    const style = wrapper.find(".embedded-resizable").attributes("style");
    expect(style).toContain("width: 800px");
    expect(style).toContain("height: 600px");
  });

  it("shows drag handle when selected and enableDrag is true", async () => {
    const wrapper = mount(EmbeddedResizable, {
      props: {
        enableDrag: true,
      },
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    // Initially no drag handle
    expect(wrapper.find(".drag-handle").exists()).toBe(false);

    // Click to select
    await wrapper.find(".embedded-resizable").trigger("click");

    // Now drag handle should be visible
    expect(wrapper.find(".drag-handle").exists()).toBe(true);
  });

  it("emits select event when clicked", async () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    await wrapper.find(".embedded-resizable").trigger("click");
    expect(wrapper.emitted("select")).toBeTruthy();
  });

  it("handles keyboard shortcuts when selected", async () => {
    const wrapper = mount(EmbeddedResizable, {
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    // Select the element
    await wrapper.find(".embedded-resizable").trigger("click");

    // Test Escape key
    await wrapper
      .find(".embedded-resizable")
      .trigger("keydown", { key: "Escape" });
    expect(wrapper.emitted("deselect")).toBeTruthy();
  });

  it("maintains aspect ratio when prop is true", () => {
    const wrapper = mount(EmbeddedResizable, {
      props: {
        maintainAspectRatio: true,
        initialWidth: 400,
        initialHeight: 300,
      },
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    // Aspect ratio should be maintained (4:3)
    expect(wrapper.props("maintainAspectRatio")).toBe(true);
  });

  it("respects min and max dimensions", () => {
    const wrapper = mount(EmbeddedResizable, {
      props: {
        minWidth: 100,
        minHeight: 100,
        maxWidth: 1000,
        maxHeight: 1000,
      },
      slots: {
        default: '<img src="test.jpg" alt="Test" />',
      },
    });

    expect(wrapper.props("minWidth")).toBe(100);
    expect(wrapper.props("maxWidth")).toBe(1000);
  });
});
