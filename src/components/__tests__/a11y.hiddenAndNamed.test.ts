import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import CommentsSidebar from "../CommentsSidebar.vue";
import FileManagerModal from "../FileManagerModal.vue";
import { fileManager } from "../../utils/fileManager";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * Round-23 accessibility cluster:
 *  - R23-21 the CLOSED comments sidebar is hidden only by a CSS transform, so
 *    four invisible controls stayed in the tab order and in the accessibility
 *    tree.
 *  - R23-27 the writing-stats FAB reported no expanded state, so a screen
 *    reader user could not tell whether the panel was showing.
 *  - R23-28 the File Manager's per-file buttons are named by their CONTENT
 *    ("✓" / "🗑️"), which beats `title` in the accessible-name algorithm — so
 *    every row announced two buttons called "check mark" and "wastebasket",
 *    the destructive one effectively unlabelled.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
  fileManager.clearAll();
  localStorage.clear();
});

describe("closed comments sidebar leaves the tab order (#R23-21)", () => {
  const mountSidebar = (isOpen: boolean) => {
    wrapper = mount(CommentsSidebar, {
      props: {
        isOpen,
        threads: [],
        activeThreadId: null,
        currentUser: { id: "u1", name: "U" },
      },
      global: { stubs: { teleport: true } },
    });
    return wrapper;
  };

  it("marks the content inert and hidden while closed", () => {
    mountSidebar(false);
    const content = wrapper!.find(".comments-sidebar-content");

    expect(content.exists()).toBe(true);
    expect(content.attributes("inert")).toBeDefined();
    expect(content.attributes("aria-hidden")).toBe("true");
  });

  it("restores it when open", async () => {
    mountSidebar(true);
    await nextTick();
    const content = wrapper!.find(".comments-sidebar-content");

    expect(content.attributes("inert")).toBeUndefined();
    expect(content.attributes("aria-hidden")).toBeUndefined();
  });
});

describe("writing-stats FAB reports its state (#R23-27)", () => {
  it("flips aria-expanded when the panel is toggled", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>", showWritingStats: true },
      attachTo: document.body,
    });
    await nextTick();

    const fab = wrapper.find(".writing-stats-toggle-fab");
    expect(fab.exists()).toBe(true);
    expect(fab.attributes("aria-expanded")).toBe("false");

    await fab.trigger("click");
    await nextTick();

    expect(
      wrapper.find(".writing-stats-toggle-fab").attributes("aria-expanded")
    ).toBe("true");
  });
});

describe("File Manager buttons have accessible names (#R23-28)", () => {
  it("names the per-file insert and delete actions", async () => {
    // Put a real file in the manager: with an empty list there are no per-file
    // buttons at all and this test would assert nothing. The modal loads its
    // files on the isOpen WATCH (not immediate), so mount closed then open.
    await fileManager.uploadFile(
      new File(["hi"], "notes.txt", { type: "text/plain" })
    );

    wrapper = mount(FileManagerModal, {
      props: { isOpen: false },
      global: { stubs: { teleport: true } },
    });
    await wrapper.setProps({ isOpen: true });
    await nextTick();

    const buttons = wrapper.findAll("button.btn-icon");
    expect(buttons.length, "expected per-file action buttons to render")
      .toBeGreaterThan(0);
    // Every icon-only button must carry an explicit label — aria-label wins
    // over name-from-content, which is what made these say "check mark".
    for (const button of buttons) {
      const label = button.attributes("aria-label");
      expect(label, `icon button "${button.text()}" needs an aria-label`)
        .toBeTruthy();
      expect(label).not.toBe("");
    }
  });
});
