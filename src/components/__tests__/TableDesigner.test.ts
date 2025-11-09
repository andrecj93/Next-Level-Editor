import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TableDesigner from "../TableDesigner.vue";

describe("TableDesigner", () => {
  let wrapper: ReturnType<typeof mount>;

  const defaultProps = {
    show: true,
    x: 100,
    y: 200,
  };

  beforeEach(() => {
    wrapper = mount(TableDesigner, {
      props: defaultProps,
    });
  });

  describe("Rendering", () => {
    it("should render when show is true", () => {
      expect(wrapper.find(".table-designer").exists()).toBe(true);
    });

    it("should not render when show is false", () => {
      wrapper = mount(TableDesigner, {
        props: {
          ...defaultProps,
          show: false,
        },
      });

      expect(wrapper.find(".table-designer").exists()).toBe(false);
    });

    it("should render all control buttons", () => {
      const buttons = wrapper.findAll(".control-btn");
      expect(buttons).toHaveLength(9); // 4 add + 2 delete + 2 properties + 1 delete table
    });

    it("should render with correct position", () => {
      const designer = wrapper.find(".table-designer");
      expect(designer.attributes("style")).toContain("left: 100px");
      expect(designer.attributes("style")).toContain("top: 200px");
    });

    it("should default position to 0, 0 when not provided", () => {
      wrapper = mount(TableDesigner, {
        props: {
          show: true,
        },
      });

      const designer = wrapper.find(".table-designer");
      expect(designer.attributes("style")).toContain("left: 0px");
      expect(designer.attributes("style")).toContain("top: 0px");
    });

    it("should render row above button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[0];
      expect(button.find(".label").text()).toBe("Row Above");
      expect(button.find(".icon").text()).toBe("⬆");
      expect(button.attributes("title")).toBe("Add row above");
    });

    it("should render row below button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[1];
      expect(button.find(".label").text()).toBe("Row Below");
      expect(button.find(".icon").text()).toBe("⬇");
      expect(button.attributes("title")).toBe("Add row below");
    });

    it("should render column left button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[2];
      expect(button.find(".label").text()).toBe("Column Left");
      expect(button.find(".icon").text()).toBe("⬅");
      expect(button.attributes("title")).toBe("Add column left");
    });

    it("should render column right button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[3];
      expect(button.find(".label").text()).toBe("Column Right");
      expect(button.find(".icon").text()).toBe("➡");
      expect(button.attributes("title")).toBe("Add column right");
    });

    it("should render delete row button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[4];
      expect(button.find(".label").text()).toBe("Delete Row");
      expect(button.find(".icon").text()).toBe("🗑");
      expect(button.attributes("title")).toBe("Remove current row");
    });

    it("should render delete column button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[5];
      expect(button.find(".label").text()).toBe("Delete Column");
      expect(button.find(".icon").text()).toBe("🗑");
      expect(button.attributes("title")).toBe("Remove current column");
    });

    it("should render cell properties button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[6];
      expect(button.find(".label").text()).toBe("Cell Properties");
      expect(button.find(".icon").text()).toBe("🎨");
      expect(button.attributes("title")).toBe("Cell properties");
    });

    it("should render table properties button with correct label and icon", () => {
      const button = wrapper.findAll(".control-btn")[7];
      expect(button.find(".label").text()).toBe("Table Properties");
      expect(button.find(".icon").text()).toBe("⚙️");
      expect(button.attributes("title")).toBe("Table properties");
    });

    it("should render delete table button with danger class", () => {
      const button = wrapper.findAll(".control-btn")[8];
      expect(button.find(".label").text()).toBe("Delete Table");
      expect(button.find(".icon").text()).toBe("✕");
      expect(button.classes()).toContain("danger");
      expect(button.attributes("title")).toBe("Delete table");
    });

    it("should render dividers between button groups", () => {
      const dividers = wrapper.findAll(".divider");
      expect(dividers).toHaveLength(3);
    });
  });

  describe("Event Emissions", () => {
    it("should emit add-row-above when row above button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[0];
      await button.trigger("click");

      expect(wrapper.emitted("add-row-above")).toBeTruthy();
      expect(wrapper.emitted("add-row-above")).toHaveLength(1);
    });

    it("should emit add-row-below when row below button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[1];
      await button.trigger("click");

      expect(wrapper.emitted("add-row-below")).toBeTruthy();
      expect(wrapper.emitted("add-row-below")).toHaveLength(1);
    });

    it("should emit add-column-left when column left button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[2];
      await button.trigger("click");

      expect(wrapper.emitted("add-column-left")).toBeTruthy();
      expect(wrapper.emitted("add-column-left")).toHaveLength(1);
    });

    it("should emit add-column-right when column right button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[3];
      await button.trigger("click");

      expect(wrapper.emitted("add-column-right")).toBeTruthy();
      expect(wrapper.emitted("add-column-right")).toHaveLength(1);
    });

    it("should emit remove-row when delete row button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[4];
      await button.trigger("click");

      expect(wrapper.emitted("remove-row")).toBeTruthy();
      expect(wrapper.emitted("remove-row")).toHaveLength(1);
    });

    it("should emit remove-column when delete column button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[5];
      await button.trigger("click");

      expect(wrapper.emitted("remove-column")).toBeTruthy();
      expect(wrapper.emitted("remove-column")).toHaveLength(1);
    });

    it("should emit cell-properties when cell properties button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[6];
      await button.trigger("click");

      expect(wrapper.emitted("cell-properties")).toBeTruthy();
      expect(wrapper.emitted("cell-properties")).toHaveLength(1);
    });

    it("should emit table-properties when table properties button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[7];
      await button.trigger("click");

      expect(wrapper.emitted("table-properties")).toBeTruthy();
      expect(wrapper.emitted("table-properties")).toHaveLength(1);
    });

    it("should emit delete-table when delete table button is clicked", async () => {
      const button = wrapper.findAll(".control-btn")[8];
      await button.trigger("click");

      expect(wrapper.emitted("delete-table")).toBeTruthy();
      expect(wrapper.emitted("delete-table")).toHaveLength(1);
    });
  });

  describe("Position Updates", () => {
    it("should update position when props change", async () => {
      await wrapper.setProps({ x: 300, y: 400 });

      const designer = wrapper.find(".table-designer");
      expect(designer.attributes("style")).toContain("left: 300px");
      expect(designer.attributes("style")).toContain("top: 400px");
    });

    it("should handle negative positions", async () => {
      await wrapper.setProps({ x: -10, y: -20 });

      const designer = wrapper.find(".table-designer");
      expect(designer.attributes("style")).toContain("left: -10px");
      expect(designer.attributes("style")).toContain("top: -20px");
    });

    it("should handle large positions", async () => {
      await wrapper.setProps({ x: 5000, y: 3000 });

      const designer = wrapper.find(".table-designer");
      expect(designer.attributes("style")).toContain("left: 5000px");
      expect(designer.attributes("style")).toContain("top: 3000px");
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid button clicks without issues", async () => {
      const button = wrapper.findAll(".control-btn")[0];

      await button.trigger("click");
      await button.trigger("click");
      await button.trigger("click");

      expect(wrapper.emitted("add-row-above")).toHaveLength(3);
    });

    it("should toggle visibility correctly", async () => {
      expect(wrapper.find(".table-designer").exists()).toBe(true);

      await wrapper.setProps({ show: false });
      expect(wrapper.find(".table-designer").exists()).toBe(false);

      await wrapper.setProps({ show: true });
      expect(wrapper.find(".table-designer").exists()).toBe(true);
    });

    it("should maintain button structure after multiple interactions", async () => {
      const buttons = wrapper.findAll(".control-btn");

      // Click all buttons
      for (const button of buttons) {
        await button.trigger("click");
      }

      // Verify structure is intact
      expect(wrapper.findAll(".control-btn")).toHaveLength(9);
      expect(wrapper.findAll(".divider")).toHaveLength(3);
    });
  });
});
