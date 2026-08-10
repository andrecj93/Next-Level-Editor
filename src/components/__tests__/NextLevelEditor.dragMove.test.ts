import { describe, it, expect, vi, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * A native contenteditable drag is a MOVE: the browser's default drop action
 * inserts at the drop point AND removes the dragged source. onDrop calls
 * preventDefault() (to sanitize the payload before insertion), which also
 * cancelled the source removal — so every intra-editor drag-move silently
 * became a drag-COPY: the dragged text appeared at the drop point while the
 * original stayed put. The editor must track the drag source on dragstart and
 * delete it on an internal (non-Ctrl) drop.
 *
 * happy-dom does not implement execCommand, so the INSERT half is asserted via
 * an execCommand spy; the DELETE half (the fix) is plain DOM we assert on.
 */
describe("NextLevelEditor intra-editor drag moves (not copies)", () => {
  let wrapper: ReturnType<typeof mount> | null = null;
  let execSpy: ReturnType<typeof vi.fn> | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    execSpy = null;
    window.getSelection()?.removeAllRanges();
    vi.restoreAllMocks();
  });

  const flush = async () => {
    await nextTick();
    await nextTick();
  };

  const mountEditor = async (html: string) => {
    // happy-dom has no execCommand — install a spy so onDrop's insert half is
    // observable (and does not throw).
    execSpy = vi.fn(() => true);
    (document as unknown as { execCommand: unknown }).execCommand = execSpy;

    wrapper = mount(NextLevelEditor, {
      props: { modelValue: html },
      attachTo: document.body,
    });
    await flush();
    return wrapper.find(".editor-content");
  };

  const selectText = (node: Node, start: number, end: number) => {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    return range;
  };

  const dropPayload = (html: string, extra: Record<string, unknown> = {}) => ({
    dataTransfer: {
      getData: (type: string) => (type === "text/html" ? html : ""),
    },
    clientX: 5,
    clientY: 5,
    ctrlKey: false,
    ...extra,
  });

  it("removes the dragged source on an internal drop (move, not copy)", async () => {
    const surface = await mountEditor("<p>alpha</p><p>target</p>");
    const firstText = surface.element.querySelector("p")!.firstChild!;
    selectText(firstText, 0, 5); // drag "alpha"

    await surface.trigger("dragstart");
    await surface.trigger("drop", dropPayload("<p>alpha</p>"));

    // The source text was deleted (the insert lands via the spied execCommand).
    expect(
      surface.element.querySelectorAll("p")[0].textContent
    ).not.toContain("alpha");
    expect(execSpy).toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("alpha")
    );
  });

  it("keeps the source on a Ctrl-drag (explicit copy)", async () => {
    const surface = await mountEditor("<p>alpha</p><p>target</p>");
    const firstText = surface.element.querySelector("p")!.firstChild!;
    selectText(firstText, 0, 5);

    await surface.trigger("dragstart");
    await surface.trigger("drop", dropPayload("<p>alpha</p>", { ctrlKey: true }));

    expect(surface.element.querySelectorAll("p")[0].textContent).toContain(
      "alpha"
    );
    expect(execSpy).toHaveBeenCalled();
  });

  it("keeps the source on an Option/Alt-drag — the mac copy gesture (#r16-8)", async () => {
    const surface = await mountEditor("<p>alpha</p><p>target</p>");
    const firstText = surface.element.querySelector("p")!.firstChild!;
    selectText(firstText, 0, 5);

    await surface.trigger("dragstart");
    // macOS exposes Option as altKey; Option-drag is the NATIVE copy gesture
    // there (Ctrl-drag is the Windows/Linux one).
    await surface.trigger("drop", dropPayload("<p>alpha</p>", { altKey: true }));

    expect(surface.element.querySelectorAll("p")[0].textContent).toContain(
      "alpha"
    );
    expect(execSpy).toHaveBeenCalled();
  });

  it("does not delete anything for an EXTERNAL drop (no dragstart in editor)", async () => {
    const surface = await mountEditor("<p>alpha</p><p>target</p>");

    // No dragstart — content arrives from outside (another app/page).
    await surface.trigger("drop", dropPayload("<p>external</p>"));

    expect(surface.element.textContent).toContain("alpha");
    expect(execSpy).toHaveBeenCalledWith(
      "insertHTML",
      false,
      expect.stringContaining("external")
    );
  });

  it("a cancelled drag (dragend without drop) leaves the document intact", async () => {
    const surface = await mountEditor("<p>alpha</p><p>target</p>");
    const firstText = surface.element.querySelector("p")!.firstChild!;
    selectText(firstText, 0, 5);

    await surface.trigger("dragstart");
    await surface.trigger("dragend");
    // A later external drop must not delete the stale source.
    await surface.trigger("drop", dropPayload("<p>external</p>"));

    expect(surface.element.textContent).toContain("alpha");
  });
});
