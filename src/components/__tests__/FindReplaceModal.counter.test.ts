import { describe, it, expect, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import FindReplaceModal from "../FindReplaceModal.vue";

/**
 * "X of N" counter integrity around Replace.
 *
 * Old behavior: Replace advanced the position using the STALE total (showing
 * e.g. "3 of 5" when only 4 matches remained), and when the replaced content
 * round-tripped through the `content` prop the recount watcher reset the
 * position to "1 of N", discarding where the user actually was. Replace must
 * account for the removed match immediately (same ordinal now points at the
 * next match; wrap from the end), and a content recount must PRESERVE the
 * clamped position — only a query/option change resets navigation.
 */
type ModalProps = { show?: boolean; content?: string; theme?: string };

const mountModal = (props: ModalProps = {}) =>
  mount(FindReplaceModal, {
    props: { show: true, content: "", ...props },
    global: { stubs: { teleport: true } },
  });

const BTN = { PREVIOUS: 0, NEXT: 1, REPLACE: 2, REPLACE_ALL: 3 } as const;
const btn = (w: ReturnType<typeof mountModal>, i: number) =>
  w.findAll(".btn")[i];
const counter = (w: ReturnType<typeof mountModal>) =>
  w.get(".search-info").text().replace(/\s+/g, " ").trim();

let w: ReturnType<typeof mountModal> | null = null;
afterEach(() => {
  w?.unmount();
  w = null;
});

const FIVE = "<p>foo a foo b foo c foo d foo</p>";

describe("FindReplaceModal counter around Replace", () => {
  it("decrements the total and keeps the ordinal on Replace (no stale N)", async () => {
    w = mountModal({ content: FIVE });
    await w.get("#find-input").setValue("foo");
    expect(counter(w)).toBe("1 of 5");

    // First Next stays on match 1; second moves to 2.
    await btn(w, BTN.NEXT).trigger("click");
    await btn(w, BTN.NEXT).trigger("click");
    expect(counter(w)).toBe("2 of 5");

    // Replace match 2: 4 remain and the editor highlights the next match,
    // which now occupies ordinal 2 — NOT "3 of 5".
    await btn(w, BTN.REPLACE).trigger("click");
    expect(counter(w)).toBe("2 of 4");
  });

  it("wraps to 1 when the LAST match is replaced", async () => {
    w = mountModal({ content: "<p>foo and foo</p>" });
    await w.get("#find-input").setValue("foo");
    await btn(w, BTN.NEXT).trigger("click"); // 1 of 2
    await btn(w, BTN.NEXT).trigger("click"); // 2 of 2
    expect(counter(w)).toBe("2 of 2");

    await btn(w, BTN.REPLACE).trigger("click");
    expect(counter(w)).toBe("1 of 1");
  });

  it("preserves the clamped position when the content prop recounts", async () => {
    w = mountModal({ content: FIVE });
    await w.get("#find-input").setValue("foo");
    await btn(w, BTN.NEXT).trigger("click");
    await btn(w, BTN.NEXT).trigger("click");
    expect(counter(w)).toBe("2 of 5");

    // The replaced document round-trips through v-model: 4 matches now.
    await w.setProps({ content: "<p>bar a foo b foo c foo d foo</p>" });
    expect(counter(w)).toBe("2 of 4");
  });

  it("still resets to 1 of N when the QUERY changes", async () => {
    w = mountModal({ content: FIVE });
    await w.get("#find-input").setValue("foo");
    await btn(w, BTN.NEXT).trigger("click");
    await btn(w, BTN.NEXT).trigger("click");
    expect(counter(w)).toBe("2 of 5");

    await w.get("#find-input").setValue("a foo");
    expect(counter(w)).toBe("1 of 1");
  });

  it("clears the counter on Replace All", async () => {
    w = mountModal({ content: "<p>foo and foo</p>" });
    await w.get("#find-input").setValue("foo");
    expect(counter(w)).toBe("1 of 2");

    await btn(w, BTN.REPLACE_ALL).trigger("click");
    // All occurrences are gone; the recount on the round-tripped content
    // will confirm 0. Never show a stale "1 of 2".
    expect(w.find(".no-matches").exists()).toBe(true);
  });
});
