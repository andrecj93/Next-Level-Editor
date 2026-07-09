import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
import FindReplaceModal from "../FindReplaceModal.vue";

// FindReplaceModal uses `<teleport to="body">`. With VTU 2.4.6, `wrapper.find`
// does NOT reach teleported content, so we stub teleport to render the modal
// inline inside the wrapper — this lets us query DOM and assert on emits
// directly (verified empirically). Focus is spied on the input elements, so it
// works fine without attaching to the document.
type ModalProps = {
  show?: boolean;
  content?: string;
  theme?: string;
};

const mountModal = (props: ModalProps = {}) =>
  mount(FindReplaceModal, {
    props: { show: true, content: "", ...props },
    global: { stubs: { teleport: true } },
  });

// The 4 footer buttons, in DOM order.
const BTN = { PREVIOUS: 0, NEXT: 1, REPLACE: 2, REPLACE_ALL: 3 } as const;
const btn = (w: ReturnType<typeof mountModal>, i: number) =>
  w.findAll(".btn")[i];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FindReplaceModal", () => {
  describe("open / closed rendering", () => {
    it("renders nothing when show is false", () => {
      const w = mountModal({ show: false });
      expect(w.find(".modal-overlay").exists()).toBe(false);
      expect(w.find("#find-input").exists()).toBe(false);
      w.unmount();
    });

    it("renders the dialog, title and both inputs when show is true", () => {
      const w = mountModal();
      expect(w.find(".modal-overlay").exists()).toBe(true);
      expect(w.get(".modal-header h3").text()).toBe("Find & Replace");
      expect(w.find("#find-input").exists()).toBe(true);
      expect(w.find("#replace-input").exists()).toBe(true);
      expect(w.find('input[type="checkbox"]').exists()).toBe(true);
      w.unmount();
    });

    it("applies the default theme-light class to the overlay", () => {
      const w = mountModal();
      expect(w.get(".modal-overlay").classes()).toContain("theme-light");
      w.unmount();
    });

    it("reflects a custom theme prop on the overlay", () => {
      const w = mountModal({ theme: "theme-dark" });
      expect(w.get(".modal-overlay").classes()).toContain("theme-dark");
      expect(w.get(".modal-overlay").classes()).not.toContain("theme-light");
      w.unmount();
    });
  });

  describe("button disabled states", () => {
    it("disables all action buttons when the find field is empty", () => {
      const w = mountModal({ content: "hello world" });
      expect((btn(w, BTN.PREVIOUS).element as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((btn(w, BTN.NEXT).element as HTMLButtonElement).disabled).toBe(
        true
      );
      expect((btn(w, BTN.REPLACE).element as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(
        (btn(w, BTN.REPLACE_ALL).element as HTMLButtonElement).disabled
      ).toBe(true);
      w.unmount();
    });

    it("enables Previous/Next once a query is typed, even with no matches", async () => {
      const w = mountModal({ content: "hello world" });
      await w.get("#find-input").setValue("zzz"); // 0 matches
      await nextTick();
      // navigation only needs findText
      expect((btn(w, BTN.PREVIOUS).element as HTMLButtonElement).disabled).toBe(
        false
      );
      expect((btn(w, BTN.NEXT).element as HTMLButtonElement).disabled).toBe(
        false
      );
      // replace still needs at least one match
      expect((btn(w, BTN.REPLACE).element as HTMLButtonElement).disabled).toBe(
        true
      );
      expect(
        (btn(w, BTN.REPLACE_ALL).element as HTMLButtonElement).disabled
      ).toBe(true);
      w.unmount();
    });

    it("enables Replace/Replace All only when there is at least one match", async () => {
      const w = mountModal({ content: "hello world" });
      await w.get("#find-input").setValue("hello"); // 1 match
      await nextTick();
      expect((btn(w, BTN.REPLACE).element as HTMLButtonElement).disabled).toBe(
        false
      );
      expect(
        (btn(w, BTN.REPLACE_ALL).element as HTMLButtonElement).disabled
      ).toBe(false);
      w.unmount();
    });
  });

  describe("match counting / search-info", () => {
    it("shows nothing in search-info while the find field is empty", () => {
      const w = mountModal({ content: "hello hello" });
      expect(w.get(".search-info").text()).toBe("");
      w.unmount();
    });

    it('shows "N of M" when there are matches, computed from HTML text content', async () => {
      const w = mountModal({ content: "<p>one two <b>one</b> one</p>" });
      await w.get("#find-input").setValue("one");
      await nextTick();
      // textContent = "one two one one" -> 3 matches
      expect(w.get(".search-info").text()).toBe("1 of 3");
      expect(w.find(".no-matches").exists()).toBe(false);
      w.unmount();
    });

    it('shows "No matches" when the query is present but unmatched', async () => {
      const w = mountModal({ content: "hello world" });
      await w.get("#find-input").setValue("zzz");
      await nextTick();
      expect(w.get(".no-matches").text()).toBe("No matches");
      w.unmount();
    });

    it("honours the case-sensitive checkbox when counting", async () => {
      const w = mountModal({ content: "Hello hello HELLO" });
      await w.get("#find-input").setValue("hello");
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 3"); // case-insensitive default

      await w.get('input[type="checkbox"]').setValue(true); // first checkbox = case sensitive
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 1");
      w.unmount();
    });

    it("honours the whole-word checkbox when counting", async () => {
      const w = mountModal({ content: "cat category concatenate cat" });
      await w.get("#find-input").setValue("cat");
      await nextTick();
      // substring match hits cat, cat(egory), con-cat-enate, cat = 4
      expect(w.get(".search-info").text()).toBe("1 of 4");

      const checkboxes = w.findAll('input[type="checkbox"]');
      await checkboxes[1].setValue(true); // second checkbox = whole word
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 2");
      w.unmount();
    });

    it("recomputes matches when the content prop changes", async () => {
      const w = mountModal({ content: "one two one" });
      await w.get("#find-input").setValue("one");
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 2");

      await w.setProps({ content: "one" });
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 1");
      w.unmount();
    });

    it("resets counts to zero when the query is cleared", async () => {
      const w = mountModal({ content: "one one" });
      await w.get("#find-input").setValue("one");
      await nextTick();
      expect(w.get(".search-info").text()).toBe("1 of 2");

      await w.get("#find-input").setValue("");
      await nextTick();
      expect(w.get(".search-info").text()).toBe("");
      expect(w.find(".no-matches").exists()).toBe(false);
      w.unmount();
    });

    it("escapes regex metacharacters in the query (literal match, no crash)", async () => {
      const w = mountModal({ content: "price is $5.00 and $5x00" });
      await w.get("#find-input").setValue("$5.00");
      await nextTick();
      // '.' must be treated literally, so only "$5.00" matches (not "$5x00")
      expect(w.get(".search-info").text()).toBe("1 of 1");
      w.unmount();
    });
  });

  describe("find navigation emits", () => {
    it("emits find {direction: next} when Next is clicked", async () => {
      const w = mountModal({ content: "abc" });
      await w.get("#find-input").setValue("abc");
      await nextTick();
      await btn(w, BTN.NEXT).trigger("click");
      expect(w.emitted("find")).toHaveLength(1);
      expect(w.emitted("find")![0]).toEqual([
        { findText: "abc", direction: "next" },
      ]);
      w.unmount();
    });

    it("emits find {direction: previous} when Previous is clicked", async () => {
      const w = mountModal({ content: "abc" });
      await w.get("#find-input").setValue("abc");
      await nextTick();
      await btn(w, BTN.PREVIOUS).trigger("click");
      expect(w.emitted("find")![0]).toEqual([
        { findText: "abc", direction: "previous" },
      ]);
      w.unmount();
    });

    it("emits find on Enter inside the find field", async () => {
      const w = mountModal({ content: "abc" });
      await w.get("#find-input").setValue("abc");
      await w.get("#find-input").trigger("keydown.enter");
      expect(w.emitted("find")![0]).toEqual([
        { findText: "abc", direction: "next" },
      ]);
      w.unmount();
    });

    it("does not emit find when the query is empty (Enter is a no-op)", async () => {
      const w = mountModal({ content: "abc" });
      await w.get("#find-input").trigger("keydown.enter");
      expect(w.emitted("find")).toBeUndefined();
      w.unmount();
    });
  });

  describe("replace emits", () => {
    it("emits replace with query/replacement/options, then advances to the next match", async () => {
      const w = mountModal({ content: "foo foo" });
      await w.get("#find-input").setValue("foo");
      await w.get("#replace-input").setValue("bar");
      await nextTick();
      await btn(w, BTN.REPLACE).trigger("click");

      expect(w.emitted("replace")).toHaveLength(1);
      expect(w.emitted("replace")![0]).toEqual([
        {
          findText: "foo",
          replaceText: "bar",
          options: { caseSensitive: false, wholeWord: false },
        },
      ]);
      // replaceOne() advances via findNext() -> a find(next) is also emitted
      expect(w.emitted("find")![0]).toEqual([
        { findText: "foo", direction: "next" },
      ]);
      w.unmount();
    });

    it("emits replace on Enter inside the replace field", async () => {
      const w = mountModal({ content: "foo foo" });
      await w.get("#find-input").setValue("foo");
      await w.get("#replace-input").setValue("bar");
      await nextTick();
      await w.get("#replace-input").trigger("keydown.enter");
      expect(w.emitted("replace")).toHaveLength(1);
      w.unmount();
    });

    it("does not emit replace when there are no matches (Enter is a no-op)", async () => {
      const w = mountModal({ content: "hello" });
      await w.get("#find-input").setValue("zzz"); // 0 matches
      await w.get("#replace-input").setValue("bar");
      await nextTick();
      await w.get("#replace-input").trigger("keydown.enter");
      expect(w.emitted("replace")).toBeUndefined();
      w.unmount();
    });

    it("emits replace-all with the current query/replacement/options", async () => {
      const w = mountModal({ content: "foo foo foo" });
      await w.get("#find-input").setValue("foo");
      await w.get("#replace-input").setValue("bar");
      await w.get('input[type="checkbox"]').setValue(true); // case sensitive on
      await nextTick();
      await btn(w, BTN.REPLACE_ALL).trigger("click");

      expect(w.emitted("replace-all")).toHaveLength(1);
      expect(w.emitted("replace-all")![0]).toEqual([
        {
          findText: "foo",
          replaceText: "bar",
          options: { caseSensitive: true, wholeWord: false },
        },
      ]);
      // replace-all should NOT trigger an extra find navigation
      expect(w.emitted("find")).toBeUndefined();
      w.unmount();
    });

    it("carries an empty replacement string through (delete-matches case)", async () => {
      const w = mountModal({ content: "foo foo" });
      await w.get("#find-input").setValue("foo");
      await nextTick();
      await btn(w, BTN.REPLACE_ALL).trigger("click");
      expect(w.emitted("replace-all")![0][0]).toMatchObject({
        findText: "foo",
        replaceText: "",
      });
      w.unmount();
    });
  });

  describe("closing", () => {
    it("emits close when the ✕ button is clicked", async () => {
      const w = mountModal();
      await w.get(".close-btn").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
      w.unmount();
    });

    it("emits close when the overlay backdrop is clicked", async () => {
      const w = mountModal();
      await w.get(".modal-overlay").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
      w.unmount();
    });

    it("does not close when the dialog body itself is clicked (@click.stop)", async () => {
      const w = mountModal();
      await w.get(".modal-content").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
      w.unmount();
    });

    it("emits close on Escape from the find field", async () => {
      const w = mountModal();
      await w.get("#find-input").trigger("keydown.esc");
      expect(w.emitted("close")).toHaveLength(1);
      w.unmount();
    });

    it("emits close on Escape from the replace field", async () => {
      const w = mountModal();
      await w.get("#replace-input").trigger("keydown.esc");
      expect(w.emitted("close")).toHaveLength(1);
      w.unmount();
    });
  });

  describe("focus behaviour", () => {
    it("focuses the find input when the modal transitions to open", async () => {
      const focusSpy = vi.spyOn(HTMLInputElement.prototype, "focus");
      const w = mountModal({ show: false });
      expect(focusSpy).not.toHaveBeenCalled();

      await w.setProps({ show: true });
      await flushPromises(); // focus runs inside a nextTick callback
      expect(focusSpy).toHaveBeenCalled();
      w.unmount();
    });

    it("Ctrl+F focuses and selects the find field and prevents default while open", async () => {
      const w = mountModal({ show: true });
      const input = w.get("#find-input").element as HTMLInputElement;
      const focusSpy = vi.spyOn(input, "focus");
      const selectSpy = vi.spyOn(input, "select");

      const evt = new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        cancelable: true,
        bubbles: true,
      });
      window.dispatchEvent(evt);

      expect(focusSpy).toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
      expect(evt.defaultPrevented).toBe(true);
      w.unmount();
    });

    it("ignores a plain 'f' keypress (no modifier)", async () => {
      const w = mountModal({ show: true });
      const input = w.get("#find-input").element as HTMLInputElement;
      const focusSpy = vi.spyOn(input, "focus");

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", cancelable: true })
      );
      expect(focusSpy).not.toHaveBeenCalled();
      w.unmount();
    });

    it("does not hijack Ctrl+F when the modal is closed", async () => {
      const w = mountModal({ show: true });
      // keep a stable reference to this instance's find input element
      const input = w.get("#find-input").element as HTMLInputElement;
      const focusSpy = vi.spyOn(input, "focus");
      await w.setProps({ show: false });

      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "f", ctrlKey: true, cancelable: true })
      );
      // this instance's handler is guarded by props.show, so it must not focus
      expect(focusSpy).not.toHaveBeenCalled();
      w.unmount();
    });
  });

  describe("state persistence across reopen", () => {
    // The component intentionally does NOT clear its fields when reopened; this
    // documents that observed behaviour so a future reset would fail loudly.
    it("retains the find/replace text and options when toggled closed then open", async () => {
      const w = mountModal({ show: true, content: "one one" });
      await w.get("#find-input").setValue("one");
      await w.get("#replace-input").setValue("two");
      await w.get('input[type="checkbox"]').setValue(true);
      await nextTick();

      await w.setProps({ show: false });
      await w.setProps({ show: true });
      await nextTick();

      expect((w.get("#find-input").element as HTMLInputElement).value).toBe(
        "one"
      );
      expect((w.get("#replace-input").element as HTMLInputElement).value).toBe(
        "two"
      );
      expect(
        (w.get('input[type="checkbox"]').element as HTMLInputElement).checked
      ).toBe(true);
      // and the match count is preserved / recomputed
      expect(w.get(".search-info").text()).toBe("1 of 2");
      w.unmount();
    });
  });
});
