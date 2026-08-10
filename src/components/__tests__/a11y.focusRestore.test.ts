import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import ModalsContainer from "../ModalsContainer.vue";

/**
 * r21-a11y-2: dismissing the emoji picker left document.activeElement on
 * <body>, so a keyboard user lost their place — the next Tab restarted at the
 * top of the HOST page and typing went nowhere.
 *
 * useModalDialog already captured the previously-focused element and restored
 * it in deactivate(). The hole was the UNMOUNT path: ModalsContainer renders
 * the picker inside `<div v-if="showEmojiPicker">`, so closing destroys the
 * component and onBeforeUnmount only removed the key listener — the restore
 * never ran.
 */
const baseProps = {
  showTableModal: false,
  showFindReplaceModal: false,
  showCodeBlockModal: false,
  showTableDesigner: false,
  showTablePropertiesModal: false,
  showEmojiPicker: false,
  showLinkModal: false,
  showImageUploadModal: false,
  showEmbedModal: false,
  showFileManagerModal: false,
  showTemplateModal: false,
  showHtmlCodeModal: false,
  showCommandPalette: false,
  showToast: false,
  isSaving: false,
  editorContent: "",
  tableDesignerPosition: { x: 0, y: 0 },
  tablePropertiesMode: "cell" as const,
  initialCellProps: {},
  initialTableProps: {},
  formattedHtmlContent: "",
  commandPaletteCommands: [],
  lastSaved: null,
  toastMessage: "",
  toastType: "success" as const,
};

describe("focus returns to the opener when an overlay is dismissed (#r21-a11y-2)", () => {
  let wrapper: VueWrapper | null = null;
  let trigger: HTMLButtonElement | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    trigger?.remove();
    trigger = null;
    document.body.innerHTML = "";
  });

  it("restores focus to the trigger after the emoji picker closes", async () => {
    trigger = document.createElement("button");
    trigger.textContent = "Emoji";
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    wrapper = mount(ModalsContainer, {
      props: { ...baseProps },
      attachTo: document.body,
    });
    await nextTick();

    // Open — focus moves into the picker.
    await wrapper.setProps({ showEmojiPicker: true });
    await nextTick();
    await nextTick();
    expect(document.activeElement).not.toBe(trigger);

    // Close — the picker is unmounted by the v-if wrapper.
    await wrapper.setProps({ showEmojiPicker: false });
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(trigger);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("does NOT steal focus back when the overlay's own action moved it (#r22-1)", async () => {
    // An insert action (emoji) deliberately focuses the EDITOR and then closes
    // the picker. Restoring to the opener there kills the caret — on a narrow
    // window the mobile toolbar's button keeps focus, so the next Space/Enter
    // re-opens the picker instead of typing.
    trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const surface = document.createElement("div");
    surface.setAttribute("contenteditable", "true");
    surface.tabIndex = 0;
    document.body.appendChild(surface);

    wrapper = mount(ModalsContainer, {
      props: { ...baseProps },
      attachTo: document.body,
    });
    await nextTick();

    await wrapper.setProps({ showEmojiPicker: true });
    await nextTick();
    await nextTick();

    // The action focuses the editor, THEN the overlay closes.
    surface.focus();
    expect(document.activeElement).toBe(surface);
    await wrapper.setProps({ showEmojiPicker: false });
    await nextTick();
    await nextTick();

    expect(document.activeElement).toBe(surface);
    expect(document.activeElement).not.toBe(trigger);
    surface.remove();
  });
});
