import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import EditorToolbar from "../EditorToolbar.vue";

/**
 * Regression tests for the Colors menu active-swatch indication.
 *
 * The active indicators must reflect the actual selection's computed
 * color/highlight (read from the contenteditable root), not the
 * textColor/backgroundColor props — those only track the last custom-picked
 * value and are never written back when a swatch is applied, which used to
 * leave the #000000 swatch permanently active.
 */
describe("EditorToolbar - Colors menu active swatches", () => {
  let wrapper: VueWrapper<any> | null = null;
  let editor: HTMLElement;
  let span: HTMLElement;

  const baseProps = {
    isToolbarSectionVisible: vi.fn(() => true),
    formatDropdownItems: [],
    inlineFormatActions: [],
    alignmentDropdownItems: [],
    listActions: [],
    insertDropdownItems: [],
    showColorsDropdown: true,
    textColor: "#000000",
    backgroundColor: "#ffff00",
    fontSizeDropdownItems: [],
    historyIndex: 0,
    historyLength: 1,
    productivityDropdownItems: [],
    toolActions: [],
    exportDropdownItems: [],
    viewMode: "editor" as const,
    theme: "light" as const,
    isFullScreen: false,
  };

  const mountToolbar = (extraProps: Record<string, unknown> = {}) => {
    wrapper = mount(EditorToolbar, {
      props: { ...baseProps, ...extraProps },
      global: {
        stubs: { ToolbarSection: true, ColorPicker: true },
      },
    });
    return wrapper;
  };

  const selectInside = (el: Element) => {
    const range = document.createRange();
    range.selectNodeContents(el.firstChild ?? el);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const textSwatch = (w: VueWrapper<any>, color: string) =>
    w.findAll(".colors-section")[0].find(`.colors-swatch[title="${color}"]`);
  const highlightSwatch = (w: VueWrapper<any>, color: string) =>
    w.findAll(".colors-section")[1].find(`.colors-swatch[title="${color}"]`);

  beforeEach(() => {
    editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    editor.innerHTML = "<p><span>colored text</span></p>";
    document.body.appendChild(editor);
    span = editor.querySelector("span")!;
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    window.getSelection()?.removeAllRanges();
    editor.remove();
  });

  it("marks the text-color preset matching the selection's computed color", () => {
    span.style.color = "rgb(220, 38, 38)"; // #dc2626 preset
    selectInside(span);
    const w = mountToolbar();

    expect(textSwatch(w, "#dc2626").classes()).toContain("active");
    expect(textSwatch(w, "#000000").classes()).not.toContain("active");
  });

  it("marks the highlight preset matching the selection's computed background", () => {
    span.style.backgroundColor = "rgb(253, 224, 71)"; // #fde047 preset
    selectInside(span);
    const w = mountToolbar();

    expect(highlightSwatch(w, "#fde047").classes()).toContain("active");
    expect(w.find(".colors-swatch-none").classes()).not.toContain("active");
  });

  it("marks 'None' active when the selection has no highlight", () => {
    selectInside(span);
    const w = mountToolbar();

    expect(w.find(".colors-swatch-none").classes()).toContain("active");
    const highlightSection = w.findAll(".colors-section")[1];
    const activePresets = highlightSection.findAll(
      ".colors-swatch.active:not(.colors-swatch-none)"
    );
    expect(activePresets).toHaveLength(0);
  });

  it("does not mark a stale default (#000000) active when the selection is outside the editor", () => {
    const outside = document.createElement("div");
    outside.textContent = "not editable";
    document.body.appendChild(outside);
    selectInside(outside);
    const w = mountToolbar();

    const textSection = w.findAll(".colors-section")[0];
    expect(textSection.findAll(".colors-swatch.active")).toHaveLength(0);
    outside.remove();
  });

  it("moves the active indicator to the clicked swatch once the color is applied", async () => {
    span.style.color = "rgb(0, 0, 0)";
    selectInside(span);
    // Simulate the host applying the color synchronously on the emit, exactly
    // like NextLevelEditor's handleTextColor -> performWithSelection path.
    const w = mountToolbar({
      onTextColorChange: (color: string) => {
        span.style.color = color;
      },
    });
    expect(textSwatch(w, "#000000").classes()).toContain("active");

    await textSwatch(w, "#16a34a").trigger("click");
    await nextTick();

    expect(w.emitted("text-color-change")?.[0]).toEqual(["#16a34a"]);
    expect(textSwatch(w, "#16a34a").classes()).toContain("active");
    expect(textSwatch(w, "#000000").classes()).not.toContain("active");
  });

  it("marks the applied highlight swatch active after a highlight pick", async () => {
    selectInside(span);
    const w = mountToolbar({
      onBackgroundColorChange: (color: string) => {
        span.style.backgroundColor = color;
      },
    });
    expect(w.find(".colors-swatch-none").classes()).toContain("active");

    await highlightSwatch(w, "#93c5fd").trigger("click");
    await nextTick();

    expect(w.emitted("background-color-change")?.[0]).toEqual(["#93c5fd"]);
    expect(highlightSwatch(w, "#93c5fd").classes()).toContain("active");
    expect(w.find(".colors-swatch-none").classes()).not.toContain("active");
  });

  it("re-reads the colors when the selection changes while the menu is open", async () => {
    span.style.color = "rgb(220, 38, 38)";
    const second = document.createElement("span");
    second.style.color = "rgb(37, 99, 235)"; // #2563eb preset
    second.textContent = "other";
    editor.querySelector("p")!.appendChild(second);

    selectInside(span);
    const w = mountToolbar();
    expect(textSwatch(w, "#dc2626").classes()).toContain("active");

    selectInside(second);
    document.dispatchEvent(new Event("selectionchange"));
    await nextTick();

    expect(textSwatch(w, "#2563eb").classes()).toContain("active");
    expect(textSwatch(w, "#dc2626").classes()).not.toContain("active");
  });

  it("stops tracking selection changes after the menu closes", async () => {
    span.style.color = "rgb(220, 38, 38)";
    selectInside(span);
    const w = mountToolbar();
    expect(textSwatch(w, "#dc2626").classes()).toContain("active");

    await w.setProps({ showColorsDropdown: false });
    span.style.color = "rgb(37, 99, 235)";
    document.dispatchEvent(new Event("selectionchange"));
    await nextTick();
    await w.setProps({ showColorsDropdown: true });

    // Re-opening re-reads the (new) selection color fresh.
    expect(textSwatch(w, "#2563eb").classes()).toContain("active");
  });

  it('shows the passage colors in writing Style and follows a moved selection', async () => {
    span.style.color = 'rgb(220, 38, 38)';
    span.style.backgroundColor = 'rgb(253, 224, 71)';
    selectInside(span);
    const w = mountToolbar({ writingMode: true, showColorsDropdown: false });
    await w.get('[aria-label="More formatting"]').trigger('click');
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#dc2626');
    expect((w.get('[aria-label="Highlight color"]').element as HTMLInputElement).value).toBe('#fde047');
    expect(w.get('[aria-label="Remove highlight"]').attributes('aria-pressed')).toBe('false');
    span.style.color = 'rgb(37, 99, 235)';
    span.style.backgroundColor = '';
    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#2563eb');
    expect(w.get('[aria-label="Remove highlight"]').attributes('aria-pressed')).toBe('true');
  });

  it('reads a just-applied writing color even without a selectionchange event', async () => {
    selectInside(span);
    const w = mountToolbar({ writingMode: true, showColorsDropdown: false,
      onTextColorChange: (color: string) => { span.style.color = color; } });
    await w.get('[aria-label="More formatting"]').trigger('click');
    await w.get('[aria-label="Text color"]').setValue('#2563eb');
    await nextTick();
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#2563eb');
  });

  it('refreshes writing colors after the theme changes', async () => {
    span.style.color = 'rgb(236, 227, 212)';
    selectInside(span);
    const w = mountToolbar({ writingMode: true, showColorsDropdown: false, theme: 'dark' });
    await w.get('[aria-label="More formatting"]').trigger('click');
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#ece3d4');
    span.style.color = 'rgb(46, 42, 36)';
    await w.setProps({ theme: 'light' });
    await flushPromises();
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#2e2a24');
  });

  it('reads inside a selected wrapper instead of its differently colored parent', async () => {
    span.style.color = '#dc2626';
    span.innerHTML = '<span style="color:#16a34a">green words</span>';
    const range = document.createRange();
    range.selectNode(span.firstChild!);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    const w = mountToolbar({ writingMode: true, showColorsDropdown: false });
    await w.get('[aria-label="More formatting"]').trigger('click');
    expect((w.get('[aria-label="Text color"]').element as HTMLInputElement).value).toBe('#16a34a');
  });

  it('does not overwrite the color field while its own text is being selected', async () => {
    span.style.color = '#dc2626';
    selectInside(span);
    const w = mountToolbar({ writingMode: true, showColorsDropdown: false });
    document.body.appendChild(w.element);
    await w.get('[aria-label="More formatting"]').trigger('click');
    const input = w.get('[aria-label="Text color"]').element as HTMLInputElement;
    input.focus();
    window.getSelection()!.removeAllRanges();
    document.dispatchEvent(new Event('selectionchange'));
    await nextTick();
    expect(input.value).toBe('#dc2626');
    w.element.remove();
  });
});
