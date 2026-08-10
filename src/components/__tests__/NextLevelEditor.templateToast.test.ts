import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import ModalsContainer from "../ModalsContainer.vue";

/**
 * #r14b-5: applying a template to an EMPTY document skips the replace-confirm
 * (correct) but still toasted "press Ctrl+Z to restore your previous content" —
 * misleading, since there was nothing to restore and undo is a no-op. The undo
 * hint is now only shown when there was actually content to replace.
 */
let wrapper: VueWrapper | null = null;
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("template-applied toast (#r14b-5)", () => {
  it("omits the Ctrl+Z hint on an empty document", async () => {
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "" },
      attachTo: document.body,
    });
    await nextTick();

    wrapper
      .findComponent(ModalsContainer)
      .vm.$emit("select-template", { content: "<p>Body</p>", name: "T" });
    await nextTick();
    await nextTick();

    const toast = wrapper
      .findComponent(ModalsContainer)
      .props("toastMessage") as string;
    expect(toast).toBe("Template applied");
    expect(toast).not.toContain("Ctrl+Z");
  });
});
