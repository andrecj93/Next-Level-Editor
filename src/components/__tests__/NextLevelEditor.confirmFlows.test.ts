import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ModalsContainer from "../ModalsContainer.vue";
import HistoryTimeline from "../HistoryTimeline.vue";

/**
 * Destructive actions must ask before destroying work. Two flows used to be
 * silent and unguarded:
 * - clicking a template card while browsing instantly replaced the ENTIRE
 *   document (no confirmation, no toast, modal just closed over new content);
 * - History Timeline "Clear" erased the whole undo stack in one click.
 * Both now route through a styled, accessible confirmation dialog.
 */
describe("NextLevelEditor — destructive actions confirm first", () => {
  let wrapper: VueWrapper | null = null;

  const TEMPLATE = { name: "Meeting Notes", content: "<h1>Meeting</h1>" };

  const mountEditor = async (modelValue: string) => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper.find(".editor-content").element as HTMLElement;
  };

  const selectTemplate = async () => {
    wrapper!
      .findComponent(ModalsContainer)
      .vm.$emit("select-template", TEMPLATE);
    await nextTick();
  };

  const dialog = () => wrapper!.find(".nle-confirm-dialog");
  const accept = async () => {
    await wrapper!.find(".nle-confirm-accept").trigger("click");
    await nextTick();
  };
  const cancel = async () => {
    await wrapper!.find(".nle-confirm-cancel").trigger("click");
    await nextTick();
  };

  const pressUndo = (editor: HTMLElement) =>
    editor.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "z",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  it("selecting a template over existing content asks instead of replacing", async () => {
    const editor = await mountEditor("<p>My half-written work</p>");

    await selectTemplate();

    // Nothing replaced yet…
    expect(editor.innerHTML).toContain("My half-written work");
    expect(editor.innerHTML).not.toContain("<h1>Meeting</h1>");
    // …because a proper alertdialog is asking first.
    const box = dialog();
    expect(box.exists()).toBe(true);
    expect(box.attributes("role")).toBe("alertdialog");
    expect(box.attributes("aria-modal")).toBe("true");
    expect(box.attributes("aria-labelledby")).toBeTruthy();
    expect(box.attributes("aria-describedby")).toBeTruthy();
  });

  it("confirming applies the template and closes the dialog", async () => {
    const editor = await mountEditor("<p>My half-written work</p>");
    await selectTemplate();

    await accept();

    expect(editor.innerHTML).toContain("<h1>Meeting</h1>");
    expect(editor.innerHTML).not.toContain("My half-written work");
    expect(dialog().exists()).toBe(false);
  });

  it("cancelling keeps the document untouched", async () => {
    const editor = await mountEditor("<p>My half-written work</p>");
    await selectTemplate();

    await cancel();

    expect(editor.innerHTML).toContain("My half-written work");
    expect(editor.innerHTML).not.toContain("<h1>Meeting</h1>");
    expect(dialog().exists()).toBe(false);
  });

  it("an empty document applies the template immediately, no dialog", async () => {
    const editor = await mountEditor("");

    await selectTemplate();

    expect(dialog().exists()).toBe(false);
    expect(editor.innerHTML).toContain("<h1>Meeting</h1>");
  });

  it("history Clear asks first; cancelling keeps undo working", async () => {
    const editor = await mountEditor("<p>one</p>");
    editor.querySelector("p")!.textContent = "two";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    (wrapper!.vm as unknown as { showHistoryTimeline: boolean }).showHistoryTimeline = true;
    await nextTick();
    wrapper!.findComponent(HistoryTimeline).vm.$emit("clear");
    await nextTick();

    expect(dialog().exists()).toBe(true);
    await cancel();

    // Undo still works: the stack was NOT cleared.
    pressUndo(editor);
    await nextTick();
    expect(editor.textContent).toContain("one");
  });

  it("confirming Clear erases the undo stack", async () => {
    const editor = await mountEditor("<p>one</p>");
    editor.querySelector("p")!.textContent = "two";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();

    (wrapper!.vm as unknown as { showHistoryTimeline: boolean }).showHistoryTimeline = true;
    await nextTick();
    wrapper!.findComponent(HistoryTimeline).vm.$emit("clear");
    await nextTick();
    await accept();

    // Nothing to undo anymore: content stays as-is.
    pressUndo(editor);
    await nextTick();
    expect(editor.textContent).toContain("two");
    expect(editor.textContent).not.toContain("one");
  });
});
