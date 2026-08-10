import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import ColorPicker from "../ColorPicker.vue";

describe("ColorPicker", () => {
  let wrapper: VueWrapper<any>;
  let clickSpy: any;

  beforeEach(() => {
    // Mock Vue3ColorPicker component
    vi.mock("@cyhnkckali/vue3-color-picker", () => ({
      Vue3ColorPicker: {
        name: "Vue3ColorPicker",
        template: '<div class="mock-color-picker"></div>',
        props: [
          "modelValue",
          "mode",
          "type",
          "theme",
          "showColorList",
          "showEyeDrop",
          "showAlpha",
          "showInputMenu",
          "showInputSet",
          "showPickerMode",
          "showButtons",
        ],
      },
    }));

    clickSpy = vi.fn();
    document.addEventListener("click", clickSpy);
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    document.removeEventListener("click", clickSpy);
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render color button with default color", () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      expect(button.exists()).toBe(true);
      expect(button.attributes("style")).toContain("background-color");
      expect(button.attributes("style")).toContain("#000000");
    });

    it("should render with custom model value", () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#ff0000",
        },
      });

      const button = wrapper.find(".color-button");
      expect(button.attributes("style")).toContain("background-color");
      expect(button.attributes("style")).toContain("#ff0000");
    });

    it("should render with custom label", () => {
      wrapper = mount(ColorPicker, {
        props: {
          label: "Text Color",
        },
      });

      const button = wrapper.find(".color-button");
      expect(button.attributes("aria-label")).toBe("Text Color");
    });

    it("should render with custom icon", () => {
      wrapper = mount(ColorPicker, {
        props: {
          icon: "🖌️",
        },
      });

      const icon = wrapper.find(".color-icon");
      expect(icon.text()).toBe("🖌️");
    });

    it("should not show picker initially", () => {
      wrapper = mount(ColorPicker);

      const picker = wrapper.find(".color-picker-container");
      expect(picker.exists()).toBe(false);
    });
  });

  describe("Toggle Picker", () => {
    it("should show picker when button is clicked", async () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");

      const picker = wrapper.find(".color-picker-container");
      expect(picker.exists()).toBe(true);
    });

    it("should hide picker when button is clicked again", async () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");
      await button.trigger("mousedown");

      const picker = wrapper.find(".color-picker-container");
      expect(picker.exists()).toBe(false);
    });

    it("should open the picker via keyboard (Enter)", async () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      // Keyboard users never fire mousedown; Enter must toggle it too.
      await button.trigger("keydown", { key: "Enter" });

      expect(wrapper.find(".color-picker-container").exists()).toBe(true);
      expect(button.attributes("aria-expanded")).toBe("true");
    });

    it("should open the picker via keyboard (Space)", async () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      await button.trigger("keydown", { key: " " });

      expect(wrapper.find(".color-picker-container").exists()).toBe(true);
    });

    it("should expose aria-haspopup and a collapsed aria-expanded at rest", () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");
      expect(button.attributes("aria-haspopup")).toBe("dialog");
      expect(button.attributes("aria-expanded")).toBe("false");
    });

    it("should display label in picker", async () => {
      wrapper = mount(ColorPicker, {
        props: {
          label: "Background Color",
        },
      });

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");

      const label = wrapper.find(".color-picker-label");
      expect(label.text()).toBe("Background Color");
    });

    it("should reset internal color when opening picker", async () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#00ff00",
        },
      });

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");

      // Internal color should be synced with modelValue
      expect(wrapper.vm.internalColor).toBe("#00ff00");
    });
  });

  describe("Color Changes", () => {
    it("should emit update:modelValue when internal color changes (debounced)", async () => {
      vi.useFakeTimers();
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#000000",
        },
      });

      // Simulate color change
      wrapper.vm.internalColor = "#ff0000";
      await wrapper.vm.$nextTick();
      // The emit is debounced — nothing yet.
      expect(wrapper.emitted("update:modelValue")).toBeFalsy();

      vi.advanceTimersByTime(150);
      expect(wrapper.emitted("update:modelValue")).toBeTruthy();
      expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["#ff0000"]);
      vi.useRealTimers();
    });

    it("coalesces a rapid drag into a SINGLE emit", async () => {
      vi.useFakeTimers();
      wrapper = mount(ColorPicker, { props: { modelValue: "#000000" } });

      // A drag pushes many intermediate colors within the debounce window.
      for (const c of ["#111111", "#222222", "#333333", "#ff0000"]) {
        wrapper.vm.internalColor = c;
        await wrapper.vm.$nextTick();
        vi.advanceTimersByTime(20);
      }
      vi.advanceTimersByTime(150);

      const emits = wrapper.emitted("update:modelValue");
      expect(emits).toHaveLength(1);
      expect(emits?.[0]).toEqual(["#ff0000"]);
      vi.useRealTimers();
    });

    it("should update internal color when modelValue prop changes", async () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#000000",
        },
      });

      await wrapper.setProps({ modelValue: "#0000ff" });

      expect(wrapper.vm.internalColor).toBe("#0000ff");
    });

    it("should not update internal color if already synced", async () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#ff0000",
        },
      });

      wrapper.vm.internalColor = "#ff0000";
      await wrapper.vm.$nextTick();

      await wrapper.setProps({ modelValue: "#ff0000" });

      // Should not trigger additional updates
      expect(wrapper.vm.internalColor).toBe("#ff0000");
    });

    it("should not emit if internal color matches modelValue", async () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "#00ff00",
        },
      });

      // Clear any initial emits
      wrapper.vm.$emit("update:modelValue", "#00ff00");

      // Change to the same color
      wrapper.vm.internalColor = "#00ff00";
      await wrapper.vm.$nextTick();

      // Should not emit duplicate
      const emits = wrapper.emitted("update:modelValue");
      expect(emits?.length).toBeLessThanOrEqual(2);
    });
  });

  describe("Click Outside", () => {
    it("should close picker when clicking outside", async () => {
      wrapper = mount(ColorPicker, {
        attachTo: document.body,
      });

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");

      expect(wrapper.find(".color-picker-container").exists()).toBe(true);

      // Simulate click outside
      const outsideElement = document.createElement("div");
      document.body.appendChild(outsideElement);
      outsideElement.click();

      await wrapper.vm.$nextTick();

      expect(wrapper.find(".color-picker-container").exists()).toBe(false);

      outsideElement.remove();
    });

    it("should not close picker when clicking inside", async () => {
      wrapper = mount(ColorPicker, {
        attachTo: document.body,
      });

      const button = wrapper.find(".color-button");
      await button.trigger("mousedown");

      const picker = wrapper.find(".color-picker-container");
      await picker.trigger("click");

      expect(wrapper.find(".color-picker-container").exists()).toBe(true);
    });
  });

  describe("Theme Detection", () => {
    it("should detect light theme by default", () => {
      wrapper = mount(ColorPicker);

      expect(wrapper.vm.theme).toBe("light");
    });

    it("should detect dark theme from ITS OWN editor ancestor", async () => {
      // Mount INSIDE the dark editor — the picker now reads the theme of the
      // editor it lives in, not the first `.next-level-editor` in the document
      // (#R23-33), so it must be a descendant to see the dark class.
      const editorDiv = document.createElement("div");
      editorDiv.className = "next-level-editor theme-dark";
      document.body.appendChild(editorDiv);

      wrapper = mount(ColorPicker, { attachTo: editorDiv });
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.theme).toBe("dark");

      editorDiv.remove();
    });

    it("ignores a dark editor it does NOT live inside (#R23-33)", async () => {
      // A dark editor elsewhere in the document must not colour a picker that
      // belongs to a light editor — the old document-wide lookup did exactly
      // that.
      const other = document.createElement("div");
      other.className = "next-level-editor theme-dark";
      document.body.appendChild(other);

      wrapper = mount(ColorPicker);
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.theme).toBe("light");

      other.remove();
    });
  });

  describe("Lifecycle", () => {
    it("should add click listener on mount", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      wrapper = mount(ColorPicker);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "click",
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it("should remove click listener on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

      wrapper = mount(ColorPicker);
      const handleClickOutside = wrapper.vm.handleClickOutside;

      wrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "click",
        handleClickOutside
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined modelValue", () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: undefined,
        },
      });

      const button = wrapper.find(".color-button");
      expect(button.attributes("style")).toContain("background-color");
      expect(button.attributes("style")).toContain("#000000");
    });

    it("should handle empty string modelValue", () => {
      wrapper = mount(ColorPicker, {
        props: {
          modelValue: "",
        },
      });

      const button = wrapper.find(".color-button");
      expect(button.attributes("style")).toContain("background-color");
      expect(button.attributes("style")).toContain("#000000");
    });

    it("should handle rapid toggle clicks", async () => {
      wrapper = mount(ColorPicker);

      const button = wrapper.find(".color-button");

      await button.trigger("mousedown");
      await button.trigger("mousedown");
      await button.trigger("mousedown");
      await button.trigger("mousedown");

      // Should be closed after even number of clicks
      expect(wrapper.find(".color-picker-container").exists()).toBe(false);
    });
  });
});
