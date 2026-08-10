import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import CommentsSidebar from "../CommentsSidebar.vue";
import EditorPanels from "../EditorPanels.vue";

let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

/**
 * CommentsSidebar's Open/Resolved tabs conveyed their active state only through
 * a CSS class — assistive tech announced two identical unlabelled buttons with
 * no selected state (WCAG 4.1.2). They need the tab pattern: role="tab" +
 * aria-selected on a role="tablist".
 */
describe("CommentsSidebar tabs expose selected state", () => {
  const open = () =>
    (wrapper = mount(CommentsSidebar, {
      props: { threads: [], activeThreadId: null, isOpen: true },
    }) as VueWrapper);

  it("marks the tabs with the tab/tablist ARIA pattern", () => {
    open();
    const tablist = wrapper!.find('[role="tablist"]');
    expect(tablist.exists()).toBe(true);
    const tabs = wrapper!.findAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it("sets aria-selected on exactly the active tab", async () => {
    open();
    const tabs = wrapper!.findAll('[role="tab"]');
    // "Open" is the default active tab.
    expect(tabs[0].attributes("aria-selected")).toBe("true");
    expect(tabs[1].attributes("aria-selected")).toBe("false");

    await tabs[1].trigger("click");
    expect(tabs[0].attributes("aria-selected")).toBe("false");
    expect(tabs[1].attributes("aria-selected")).toBe("true");
  });
});

/**
 * The code-view textarea had no accessible name — a screen-reader user tabbing
 * into it heard only "edit text" (WCAG 4.1.2 / 3.3.2).
 */
describe("code-view textarea has an accessible name", () => {
  it("labels the code editor", () => {
    wrapper = mount(EditorPanels, {
      props: { viewMode: "code" },
    }) as VueWrapper;
    const textarea = wrapper.find("textarea.code-editor");
    expect(textarea.exists()).toBe(true);
    expect(textarea.attributes("aria-label")).toBeTruthy();
  });
});

/**
 * The selection bubble's active-button state was a hardcoded #3b82f6, ignoring
 * the theme accent — under Warm/Midnight it stayed generic blue.
 */
describe("FloatingToolbar active state follows the theme accent", () => {
  it("does not hardcode the accent hex for the active button", () => {
    const sfc = readFileSync(
      resolve(process.cwd(), "src/components/FloatingToolbar.vue"),
      "utf-8"
    );
    const rule = sfc.match(/\.floating-btn\.active\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain("var(--toolbar-accent");
    expect(rule![1]).not.toMatch(/background:\s*#3b82f6/);
  });
});
