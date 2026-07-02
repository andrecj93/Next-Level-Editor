import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import TablePropertiesModal from "../TablePropertiesModal.vue";

// Regression for #20: opening the modal in "table" mode must show the TABLE
// form (Border Style / Border Color), not the CELL form (Vertical Alignment /
// Padding). activeTab must track props.mode, not just its setup-time default.
// The modal teleports to <body>, so assert against document.body.
describe("TablePropertiesModal mode/section sync", () => {
  let wrapper: VueWrapper | null = null;
  const bodyText = () => document.body.textContent || "";

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  it("shows the table form when opened in table mode", async () => {
    wrapper = mount(TablePropertiesModal, { props: { show: false, mode: "table" } });
    await wrapper.setProps({ show: true });

    expect(bodyText()).toContain("Border Style");
    expect(bodyText()).toContain("Border Color");
    expect(bodyText()).not.toContain("Vertical Alignment");
    expect(bodyText()).not.toContain("Padding");
  });

  it("shows the cell form when opened in cell mode", async () => {
    wrapper = mount(TablePropertiesModal, { props: { show: false, mode: "cell" } });
    await wrapper.setProps({ show: true });

    expect(bodyText()).toContain("Vertical Alignment");
    expect(bodyText()).toContain("Padding");
    expect(bodyText()).not.toContain("Border Style");
  });

  it("switches the visible form when the mode prop changes", async () => {
    wrapper = mount(TablePropertiesModal, { props: { show: true, mode: "cell" } });
    expect(bodyText()).toContain("Vertical Alignment");

    await wrapper.setProps({ mode: "table" });
    expect(bodyText()).toContain("Border Style");
    expect(bodyText()).not.toContain("Vertical Alignment");
  });
});
