import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createEmbeddedResizable,
  initializeEmbeddedElements,
} from "../embeddedResizable";

// Regression for #15 (no visible resize handles — the only way to resize was
// Shift+Arrow) and #41 (document-level mousemove/mouseup/click listeners were
// registered per inserted element and never removed, leaking detached nodes).
// Selecting a container must show four draggable corner handles, and document
// listeners must be delegated: attached once, never per element.
describe("embedded resizable corner handles", () => {
  let root: HTMLDivElement;

  const clickBody = () =>
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  afterEach(() => {
    // Clear module selection state between tests: the first click may be
    // consumed by the post-drag click suppression, so click twice.
    clickBody();
    clickBody();
    root?.remove();
    vi.restoreAllMocks();
  });

  const mountContainer = (
    options: Partial<Parameters<typeof createEmbeddedResizable>[0]> = {}
  ) => {
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

  const select = (container: HTMLElement) =>
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  const getHandles = (container: HTMLElement) =>
    Array.from(
      container.querySelectorAll<HTMLElement>(".embed-resize-handle")
    );

  const startResize = (
    container: HTMLElement,
    corner: string,
    clientX: number,
    clientY: number
  ) => {
    const handle = getHandles(container).find(
      (h) => h.dataset.handle === corner
    )!;
    handle.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX, clientY })
    );
  };

  const moveMouse = (clientX: number, clientY: number) =>
    document.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX, clientY })
    );

  const releaseMouse = () =>
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

  it("shows four corner handles with distinct cursors when selected", () => {
    const container = mountContainer();
    expect(getHandles(container)).toHaveLength(0);

    select(container);

    const handles = getHandles(container);
    expect(handles).toHaveLength(4);
    const cursors = handles.map((h) => h.style.cursor).sort();
    expect(cursors).toEqual([
      "ne-resize",
      "nw-resize",
      "se-resize",
      "sw-resize",
    ]);
  });

  it("removes the handles when deselected by clicking outside", () => {
    const container = mountContainer();
    select(container);
    expect(getHandles(container)).toHaveLength(4);

    clickBody();

    expect(getHandles(container)).toHaveLength(0);
    expect(container.style.borderStyle).toBe("dashed");
  });

  it("removes the handles when deselected via Escape", () => {
    const container = mountContainer();
    select(container);
    expect(getHandles(container)).toHaveLength(4);

    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );

    expect(getHandles(container)).toHaveLength(0);
  });

  it("resizes width and height by dragging the south-east handle", () => {
    const container = mountContainer({ maintainAspectRatio: false });
    select(container);

    startResize(container, "se", 500, 400);
    moveMouse(560, 430); // +60 x, +30 y
    releaseMouse();

    expect(container.style.width).toBe("460px");
    expect(container.style.height).toBe("330px");
    expect(container.dataset.width).toBe("460");
    expect(container.dataset.height).toBe("330");
  });

  it("shrinks from the north-west handle (inverted deltas)", () => {
    const container = mountContainer({ maintainAspectRatio: false });
    select(container);

    startResize(container, "nw", 100, 100);
    moveMouse(140, 120); // dragging inward shrinks
    releaseMouse();

    expect(container.dataset.width).toBe("360");
    expect(container.dataset.height).toBe("280");
  });

  it("keeps the aspect ratio when data-maintain-aspect is true", () => {
    const container = mountContainer({ maintainAspectRatio: true });
    select(container);

    startResize(container, "se", 500, 400);
    moveMouse(590, 410); // width is the dominant axis: 400 -> 490
    releaseMouse();

    expect(container.dataset.width).toBe("490");
    // 490 / (400/300) = 367.5 -> rounded
    expect(container.dataset.height).toBe("368");
  });

  it("clamps handle-drag resizing to the minimum size", () => {
    const container = mountContainer({ maintainAspectRatio: false });
    select(container);

    startResize(container, "se", 500, 400);
    moveMouse(-1000, -1000);
    releaseMouse();

    expect(container.dataset.width).toBe("100");
    expect(container.dataset.height).toBe("100");
  });

  it("keeps drag-to-move working on the container body", () => {
    const container = mountContainer();
    select(container);

    container.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 200, clientY: 200 })
    );
    expect(container.style.cursor).toBe("grabbing");

    moveMouse(215, 225);
    expect(container.style.transform).toBe("translate(15px, 25px)");

    releaseMouse();
    expect(container.style.cursor).toBe("move");
  });

  it("keeps keyboard resizing working and syncs data attributes", () => {
    const container = mountContainer();
    select(container);

    container.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        shiftKey: true,
        bubbles: true,
      })
    );

    expect(container.style.width).toBe("410px");
    expect(container.dataset.width).toBe("410");
  });

  it("does not accumulate document-level listeners across inits", () => {
    // Ensure the one-time lazy document listeners are already attached.
    mountContainer();

    const addSpy = vi.spyOn(document, "addEventListener");
    for (let i = 0; i < 5; i++) {
      const extra = document.createElement("div");
      extra.innerHTML = createEmbeddedResizable({
        type: "image",
        src: `img-${i}.png`,
      });
      root.appendChild(extra);
      initializeEmbeddedElements(extra);
    }

    // The old implementation added mousemove + mouseup + click on document
    // for EVERY element (15 calls here); delegation adds none.
    expect(addSpy).not.toHaveBeenCalled();
  });
});
