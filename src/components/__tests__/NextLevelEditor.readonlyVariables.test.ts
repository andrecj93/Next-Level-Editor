import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * r21-2 (HIGH): `readonly` correctly suppressed contenteditable and the
 * toolbar, but the Variables FAB still rendered — and clicking a panel item
 * INSERTED a pill into the locked document and emitted the mutation to the
 * host. A read-only document must not be editable through any affordance.
 */
describe("NextLevelEditor — readonly blocks variable insertion", () => {
  let wrapper: VueWrapper | null = null;

  const DOC = "<p>Locked content.</p>";

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const mountEditor = async (readonly: boolean) => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: DOC, readonly, enableVariables: true },
      attachTo: document.body,
    });
    await nextTick();
    return wrapper;
  };

  it("does not render the variables FAB in a read-only document", async () => {
    const w = await mountEditor(true);
    expect(w.find(".variables-toggle-fab").exists()).toBe(false);
  });

  it("still renders the variables FAB when editable (control)", async () => {
    const w = await mountEditor(false);
    expect(w.find(".variables-toggle-fab").exists()).toBe(true);
  });

  it("never mutates or emits when a panel insert is attempted in readonly", async () => {
    const w = await mountEditor(true);
    const editor = w.find(".editor-content").element as HTMLElement;
    const before = editor.innerHTML;

    // Drive the insert path directly — even if some future affordance reaches
    // it, a read-only document must not change.
    (
      w.vm as unknown as { handlePanelInsert: (v: unknown) => void }
    ).handlePanelInsert?.({ name: "user.name", value: "John Doe" });
    await nextTick();

    expect(editor.innerHTML).toBe(before);
    expect(editor.querySelector(".editor-variable")).toBeNull();
    const emitted = (w.emitted("update:modelValue") ?? []).map((e) =>
      String(e[0])
    );
    for (const html of emitted) {
      expect(html).not.toContain("editor-variable");
    }
  });
});
