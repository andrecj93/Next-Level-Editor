import { describe, it, expect, afterEach } from "vitest";
import { initializeEmbeddedElements } from "../embeddedResizable";

// Regression for #17: setting innerHTML (undo/redo, code round-trip, loading
// saved content) discards the listeners attached to embedded media at insert
// time, leaving it inert. initializeEmbeddedElements re-binds interactivity to
// the fresh element instances.
describe("initializeEmbeddedElements re-binds embedded media", () => {
  let root: HTMLDivElement;

  afterEach(() => {
    root?.remove();
  });

  const makeRoot = () => {
    root = document.createElement("div");
    root.innerHTML =
      '<div class="embedded-resizable-container" data-type="image" tabindex="0" style="border-style: dashed;"><img src="x.png" alt="x" /></div>';
    document.body.appendChild(root);
    return root.querySelector<HTMLElement>(".embedded-resizable-container")!;
  };

  it("makes a freshly-reset container respond to clicks again", () => {
    const container = makeRoot();
    // Before re-init the container has no click listener.
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.style.borderStyle).toBe("dashed");

    // Simulate the re-initialization that runs after an innerHTML reset.
    initializeEmbeddedElements(root);
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.style.borderStyle).toBe("solid");
  });

  it("does not throw or break when called twice on the same element", () => {
    const container = makeRoot();
    initializeEmbeddedElements(root);
    // Second call is a no-op for already-initialized elements (WeakSet guard).
    expect(() => initializeEmbeddedElements(root)).not.toThrow();
    container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.style.borderStyle).toBe("solid");
  });
});
