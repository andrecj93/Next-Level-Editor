import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import TableDesigner from "../TableDesigner.vue";

/**
 * R23-29: the Table Designer floating action menu was a bare <div> — no role,
 * no accessible name, no initial focus, no focus restore. It announced as
 * nothing, its buttons were reachable only by Tab-ing forward from wherever
 * focus happened to be, and dismissing it while a button held focus dropped
 * focus to <body>.
 *
 * `role="group"`, deliberately NOT `menu`/`toolbar`: those carry a WAI-ARIA
 * KEYBOARD CONTRACT (menuitem children, arrow navigation, roving tabindex).
 * Declaring one without implementing it is exactly the defect R23-23/24
 * describe elsewhere in this codebase — a labelled group promises only what
 * this panel actually is: a named cluster of buttons.
 *
 * Its buttons are also named from CONTENT (an arrow glyph + a label), so they
 * announced as "⬆ Row Above"; the glyph must be hidden and the button named.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const mountDesigner = async (show = true) => {
  wrapper = mount(TableDesigner, {
    props: { show, position: {} },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

describe("TableDesigner is announced and manages focus (#R23-29)", () => {
  it("exposes a labelled group, not an anonymous div", async () => {
    await mountDesigner();

    const panel = wrapper!.find(".table-designer");
    expect(panel.exists()).toBe(true);
    expect(panel.attributes("role")).toBe("group");
    expect(panel.attributes("aria-label")).toBeTruthy();
  });

  it("names every action button explicitly", async () => {
    await mountDesigner();

    const buttons = wrapper!.findAll("button.control-btn");
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      const label = button.attributes("aria-label");
      expect(label, `button "${button.text()}" needs an aria-label`).toBeTruthy();
    }
  });

  it("hides the decorative glyph from the accessible name", async () => {
    await mountDesigner();

    const icons = wrapper!.findAll(".control-btn .icon");
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.attributes("aria-hidden")).toBe("true");
    }
  });

  it("moves focus into the panel when it opens", async () => {
    // Somewhere sensible to come back to.
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    anchor.focus();

    await mountDesigner(false);
    await wrapper!.setProps({ show: true });
    await nextTick();
    await nextTick();

    const panel = wrapper!.find(".table-designer").element;
    expect(document.activeElement).not.toBe(document.body);
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to where it came from when it closes", async () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    anchor.focus();

    await mountDesigner(false);
    await wrapper!.setProps({ show: true });
    await nextTick();
    await nextTick();
    // Precondition: focus really left the anchor, so the restore is meaningful.
    expect(document.activeElement).not.toBe(anchor);

    await wrapper!.setProps({ show: false });
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(anchor);
  });
});
