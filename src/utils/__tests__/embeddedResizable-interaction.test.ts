import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  createEmbeddedResizable,
  insertEmbeddedResizable,
  initializeEmbeddedElements,
} from "../embeddedResizable";

// Exercises the live DOM interaction paths that the handles suite does not:
// - insertEmbeddedResizable (no-selection early returns + happy path)
// - hover mouseenter/mouseleave (selected vs unselected)
// - drag-to-move is a no-op unless the container is already selected
// - post-drag click suppression
// - keyboard delete (confirm accepted / rejected), arrows without Shift
// - selection switching between two containers
// - resize handle default ("se") + getCurrentSize style/data/offset fallbacks
//
// Every test drives real elements in happy-dom and dispatches real events; the
// only stubbed browser API is window.confirm (happy-dom has no dialog).

let root: HTMLDivElement;

const clickBody = () =>
  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const moveMouse = (clientX: number, clientY: number) =>
  document.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX, clientY })
  );

const releaseMouse = () =>
  document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

const select = (container: HTMLElement) =>
  container.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const getHandles = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".embed-resize-handle"));

const mount = (
  options: Partial<Parameters<typeof createEmbeddedResizable>[0]> = {}
): HTMLElement => {
  root = document.createElement("div");
  root.innerHTML = createEmbeddedResizable({
    type: "image",
    src: "photo.png",
    alt: "photo",
    width: 400,
    height: 300,
    ...options,
  });
  document.body.appendChild(root);
  const container = root.querySelector<HTMLElement>(
    ".embedded-resizable-container"
  )!;
  initializeEmbeddedElements(root);
  return container;
};

afterEach(() => {
  // Deselect any container left selected. The first body click may be eaten by
  // the post-drag suppression flag, so click twice like the handles suite does.
  clickBody();
  clickBody();
  root?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("insertEmbeddedResizable", () => {
  beforeEach(() => {
    root = document.createElement("div");
    root.setAttribute("contenteditable", "true");
    root.innerHTML = "<p>hello</p>";
    document.body.appendChild(root);
  });

  it("does nothing when there is no active selection", () => {
    const sel = window.getSelection();
    sel?.removeAllRanges();

    // With no range, the function returns before touching the DOM.
    expect(() =>
      insertEmbeddedResizable({ type: "image", src: "x.png" })
    ).not.toThrow();
    expect(
      root.querySelector(".embedded-resizable-container")
    ).toBeNull();
  });

  it("inserts a fully-interactive container at the caret", () => {
    const p = root.querySelector("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    insertEmbeddedResizable({
      type: "image",
      src: "inserted.png",
      alt: "inserted",
    });

    const container = root.querySelector<HTMLElement>(
      ".embedded-resizable-container"
    );
    expect(container).not.toBeNull();
    expect(container?.querySelector("img")?.getAttribute("src")).toBe(
      "inserted.png"
    );

    // Interactivity was bound at insert time: a click selects it.
    select(container!);
    expect(container!.style.borderStyle).toBe("solid");
    expect(getHandles(container!)).toHaveLength(4);
  });
});

describe("hover feedback", () => {
  it("highlights the border on mouseenter when not selected", () => {
    const container = mount();
    container.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(container.style.borderStyle).toBe("dashed");
    expect(container.style.borderColor).toBe("#667eea");

    container.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(container.style.borderColor).toBe("rgba(102, 126, 234, 0.3)");
  });

  it("does not override the selected border on hover", () => {
    const container = mount();
    select(container);
    expect(container.style.borderStyle).toBe("solid");

    // Hover while selected must leave the solid selection styling untouched.
    container.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    expect(container.style.borderStyle).toBe("solid");
    container.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(container.style.borderStyle).toBe("solid");
  });
});

describe("drag-to-move gating", () => {
  it("ignores mousedown on the body when the container is not selected", () => {
    const container = mount();

    // Not selected: a body mousedown must NOT start a drag.
    container.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10 })
    );
    moveMouse(60, 60);
    // No transform applied because no drag state was created.
    expect(container.style.transform).toBe("");
    expect(container.style.cursor).not.toBe("grabbing");
  });

  it("suppresses the click that immediately follows a drag", () => {
    const container = mount();
    select(container);
    expect(container.style.borderStyle).toBe("solid");

    // Perform a drag.
    container.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 })
    );
    moveMouse(120, 130);
    releaseMouse();
    expect(container.style.transform).toBe("translate(20px, 30px)");

    // The synthetic post-drag click on the body must be swallowed, so the
    // container stays selected rather than being deselected.
    clickBody();
    expect(container.style.borderStyle).toBe("solid");

    // A subsequent, genuine outside click then deselects normally.
    clickBody();
    expect(container.style.borderStyle).toBe("dashed");
  });

  it("restores the pointer cursor if the container is deselected mid-drag", () => {
    const container = mount();
    select(container);

    container.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 })
    );
    expect(container.style.cursor).toBe("grabbing");

    // Deselect (Escape) while dragging, so at mouseup selectedContainer no
    // longer equals dragState.container and the cursor resolves to "pointer".
    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    releaseMouse();

    expect(container.style.cursor).toBe("pointer");
  });
});

describe("keyboard deletion", () => {
  const sendDelete = (container: HTMLElement, key = "Delete") =>
    container.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true })
    );

  it("removes the container when the confirm dialog is accepted", () => {
    const container = mount();
    select(container);
    // happy-dom has no window.confirm; provide one and record calls.
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    sendDelete(container);

    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(container.isConnected).toBe(false);
    expect(
      root.querySelector(".embedded-resizable-container")
    ).toBeNull();
  });

  it("keeps the container when the confirm dialog is rejected", () => {
    const container = mount();
    select(container);
    vi.stubGlobal("confirm", vi.fn(() => false));

    sendDelete(container, "Backspace");

    expect(container.isConnected).toBe(true);
    expect(
      root.querySelector(".embedded-resizable-container")
    ).not.toBeNull();
  });

  it("does not delete when the container is not the selected one", () => {
    const container = mount();
    // Never selected: keydown handler bails at the selection guard, so confirm
    // is never even reached.
    const confirmSpy = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmSpy);

    sendDelete(container);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(container.isConnected).toBe(true);
  });

  it("clears an in-flight drag state when the container is deleted mid-drag", () => {
    const container = mount();
    select(container);
    vi.stubGlobal("confirm", vi.fn(() => true));

    // Begin a drag so dragState.container === element, then delete without
    // releasing. The delete branch must null out the dangling drag state.
    container.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 50, clientY: 50 })
    );
    sendDelete(container);
    expect(container.isConnected).toBe(false);

    // A stray mousemove after deletion must not resurrect a transform on the
    // detached node — proving dragState was cleared, not left dangling.
    moveMouse(80, 80);
    expect(container.style.transform).toBe("");
  });

  it("clears an in-flight resize state when the container is deleted mid-resize", () => {
    const container = mount({ maintainAspectRatio: false });
    select(container);
    vi.stubGlobal("confirm", vi.fn(() => true));

    // Begin a resize so resizeState.container === element, then delete.
    const se = Array.from(
      container.querySelectorAll<HTMLElement>(".embed-resize-handle")
    ).find((h) => h.dataset.handle === "se")!;
    se.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 500, clientY: 400 })
    );
    sendDelete(container);
    expect(container.isConnected).toBe(false);

    // A stray mousemove after deletion must not mutate the detached node's size.
    const widthBefore = container.dataset.width;
    moveMouse(600, 500);
    expect(container.dataset.width).toBe(widthBefore);
  });
});

describe("keyboard arrow resizing requires Shift", () => {
  it("ignores every arrow key pressed without Shift", () => {
    const container = mount();
    select(container);

    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]) {
      container.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true })
      );
    }

    // Size is unchanged: the non-Shift branch of each arrow case is a no-op.
    expect(container.dataset.width).toBe("400");
    expect(container.dataset.height).toBe("300");
  });

  it("shrinks with Shift+ArrowLeft and Shift+ArrowUp", () => {
    const container = mount();
    select(container);

    container.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowLeft",
        shiftKey: true,
        bubbles: true,
      })
    );
    container.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowUp",
        shiftKey: true,
        bubbles: true,
      })
    );

    expect(container.dataset.width).toBe("390");
    expect(container.dataset.height).toBe("290");
  });

  it("grows with Shift+ArrowDown", () => {
    const container = mount();
    select(container);

    container.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        shiftKey: true,
        bubbles: true,
      })
    );

    expect(container.dataset.height).toBe("310");
  });
});

describe("selection switching between containers", () => {
  const mountTwo = (): [HTMLElement, HTMLElement] => {
    root = document.createElement("div");
    root.innerHTML =
      createEmbeddedResizable({ type: "image", src: "a.png" }) +
      createEmbeddedResizable({ type: "image", src: "b.png" });
    document.body.appendChild(root);
    const [a, b] = Array.from(
      root.querySelectorAll<HTMLElement>(".embedded-resizable-container")
    );
    initializeEmbeddedElements(root);
    return [a, b];
  };

  it("deselects the previous container when a new one is selected", () => {
    const [a, b] = mountTwo();

    select(a);
    expect(a.style.borderStyle).toBe("solid");
    expect(getHandles(a)).toHaveLength(4);

    select(b);
    // b becomes selected; a is reverted to the unselected dashed state.
    expect(b.style.borderStyle).toBe("solid");
    expect(getHandles(b)).toHaveLength(4);
    expect(a.style.borderStyle).toBe("dashed");
    expect(getHandles(a)).toHaveLength(0);
  });

  it("re-selecting the already-selected container is a no-op", () => {
    const [a] = mountTwo();
    select(a);
    const handlesFirst = getHandles(a);
    expect(handlesFirst).toHaveLength(4);

    // Clicking it again must not rebuild / duplicate the handles.
    select(a);
    expect(getHandles(a)).toHaveLength(4);
  });
});

describe("resize handle fallbacks", () => {
  const startResizeOn = (
    handle: HTMLElement,
    clientX: number,
    clientY: number
  ) =>
    handle.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX, clientY })
    );

  it("defaults an unlabelled handle to the south-east corner", () => {
    const container = mount({ maintainAspectRatio: false });
    select(container);

    const handle = getHandles(container)[0];
    // Strip the data-handle so the `|| "se"` fallback in mousedown is taken.
    delete handle.dataset.handle;

    startResizeOn(handle, 500, 400);
    moveMouse(540, 430); // se: +x grows width, +y grows height
    releaseMouse();

    expect(container.dataset.width).toBe("440");
    expect(container.dataset.height).toBe("330");
  });

  it("drives the height-dominant aspect branch when Y is the larger delta", () => {
    const container = mount({ maintainAspectRatio: true });
    select(container);

    const se = getHandles(container).find((h) => h.dataset.handle === "se")!;
    startResizeOn(se, 500, 400);
    // dy (+120) dominates dx (+10): height leads, width derives from ratio.
    moveMouse(510, 520);
    releaseMouse();

    // height 300 -> 420; width = 420 * (400/300) = 560
    expect(container.dataset.height).toBe("420");
    expect(container.dataset.width).toBe("560");
  });

  it("restores the pointer cursor if the container is deselected mid-resize", () => {
    const container = mount({ maintainAspectRatio: false });
    select(container);

    const se = getHandles(container).find((h) => h.dataset.handle === "se")!;
    startResizeOn(se, 500, 400);
    // Deselect (Escape) while the resize is still in flight, so at mouseup
    // selectedContainer !== resizeState.container and the cursor falls back to
    // "pointer" rather than "move".
    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    releaseMouse();

    expect(container.style.cursor).toBe("pointer");
  });

  it("clamps oversized resizes to the maximum", () => {
    const container = mount({ maintainAspectRatio: false });
    select(container);

    const se = getHandles(container).find((h) => h.dataset.handle === "se")!;
    startResizeOn(se, 0, 0);
    moveMouse(5000, 5000);
    releaseMouse();

    expect(container.dataset.width).toBe("1200");
    expect(container.dataset.height).toBe("1200");
  });

  it("reads the start size from inline style, then data, on resize", () => {
    // No inline width/height and no data-width: getCurrentSize must fall through
    // to offsetWidth/offsetHeight (0 in happy-dom) and finally the 400/300
    // literal defaults.
    root = document.createElement("div");
    root.innerHTML =
      '<div class="embedded-resizable-container" data-type="image" data-maintain-aspect="false" tabindex="0"><img src="x.png" /></div>';
    document.body.appendChild(root);
    const container = root.querySelector<HTMLElement>(
      ".embedded-resizable-container"
    )!;
    initializeEmbeddedElements(root);
    select(container);

    const se = getHandles(container).find((h) => h.dataset.handle === "se")!;
    startResizeOn(se, 100, 100);
    moveMouse(110, 120); // +10 width, +20 height from the 400/300 fallbacks
    releaseMouse();

    expect(container.dataset.width).toBe("410");
    expect(container.dataset.height).toBe("320");
  });
});
