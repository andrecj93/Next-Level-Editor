import { describe, it, expect, afterEach, vi } from "vitest";
import {
  createEmbeddedResizable,
  initializeEmbeddedElements,
} from "../embeddedResizable";

/**
 * Drag-to-move used to write only a cosmetic `translate(...)` transform: the
 * embed LOOKED moved, but the document flow never changed, the drag branch
 * never dispatched the bubbling `input` signal (unlike resize/delete), and the
 * transform did not survive the sanitizer round-trip — so the move silently
 * vanished on save/reload. Releasing a drag must complete the move in the
 * DOCUMENT (re-inserting the block container at the drop point) and notify the
 * editor, or snap back when dropped somewhere invalid.
 */

let root: HTMLDivElement;

const clickBody = () =>
  document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const moveMouse = (clientX: number, clientY: number) =>
  document.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX, clientY })
  );

const releaseMouseAt = (clientX: number, clientY: number) =>
  document.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, clientX, clientY })
  );

const select = (container: HTMLElement) =>
  container.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const startDrag = (container: HTMLElement, clientX: number, clientY: number) =>
  container.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, clientX, clientY })
  );

const mountEditor = () => {
  root = document.createElement("div");
  root.setAttribute("contenteditable", "true");
  root.innerHTML =
    "<p>one</p>" +
    createEmbeddedResizable({
      type: "image",
      src: "photo.png",
      alt: "photo",
      width: 400,
      height: 300,
    }) +
    "<p>two</p>";
  document.body.appendChild(root);
  initializeEmbeddedElements(root);
  return root.querySelector<HTMLElement>(".embedded-resizable-container")!;
};

afterEach(() => {
  clickBody();
  clickBody();
  root?.remove();
  vi.restoreAllMocks();
  delete (document as unknown as { caretRangeFromPoint?: unknown })
    .caretRangeFromPoint;
});

describe("embed drag-to-move persists in the document", () => {
  it("relocates the container at the drop point and notifies the editor", () => {
    const container = mountEditor();
    const inputSpy = vi.fn();
    root.addEventListener("input", inputSpy);

    // Drop point: inside the trailing <p>two</p>.
    const twoText = root.querySelectorAll("p")[1].firstChild!;
    (
      document as unknown as {
        caretRangeFromPoint: (x: number, y: number) => Range;
      }
    ).caretRangeFromPoint = () => {
      const r = document.createRange();
      r.setStart(twoText, 1);
      r.collapse(true);
      return r;
    };

    select(container);
    startDrag(container, 0, 0);
    moveMouse(0, 200);
    releaseMouseAt(0, 200);

    // The live-feedback transform is gone…
    expect(container.style.transform).toBe("");
    // …and the container was RE-INSERTED in the flow next to <p>two</p>
    // (no longer between the paragraphs).
    const order = Array.from(root.children).map((el) =>
      el.tagName === "P" ? el.textContent : "EMBED"
    );
    expect(order).toEqual(["one", "two", "EMBED"]);
    // The move reached the editor's emit pipeline.
    expect(inputSpy).toHaveBeenCalled();
  });

  it("snaps back without notifying when dropped outside the editor", () => {
    const container = mountEditor();
    const inputSpy = vi.fn();
    root.addEventListener("input", inputSpy);

    const outside = document.createElement("p");
    outside.textContent = "outside";
    document.body.appendChild(outside);
    (
      document as unknown as {
        caretRangeFromPoint: (x: number, y: number) => Range;
      }
    ).caretRangeFromPoint = () => {
      const r = document.createRange();
      r.setStart(outside.firstChild!, 0);
      r.collapse(true);
      return r;
    };

    select(container);
    startDrag(container, 0, 0);
    moveMouse(0, 300);
    releaseMouseAt(0, 300);

    expect(container.style.transform).toBe("");
    const order = Array.from(root.children).map((el) =>
      el.tagName === "P" ? el.textContent : "EMBED"
    );
    expect(order).toEqual(["one", "EMBED", "two"]);
    expect(inputSpy).not.toHaveBeenCalled();
    outside.remove();
  });
});
