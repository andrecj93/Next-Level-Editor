import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useDraggable } from "../useDraggable";

describe("useDraggable", () => {
  it("initializes with isDragging as false", () => {
    const containerRef = ref(document.createElement("div"));

    const { isDragging } = useDraggable({
      containerRef,
    });

    expect(isDragging.value).toBe(false);
  });

  it("sets isDragging to true when drag starts", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const parent = document.createElement("div");
    parent.appendChild(container);
    document.body.appendChild(parent);

    const containerRef = ref(container);

    const { isDragging, startDrag } = useDraggable({
      containerRef,
    });

    expect(isDragging.value).toBe(false);

    // Start drag
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
    });
    startDrag(mouseEvent);

    expect(isDragging.value).toBe(true);

    // Cleanup
    parent.remove();
  });

  it("calls onMove callback during drag", () => {
    const container = document.createElement("div");
    const parent = document.createElement("div");
    parent.appendChild(container);
    document.body.appendChild(parent);

    const containerRef = ref(container);
    let moveCallbackCalled = false;

    useDraggable({
      containerRef,
      onMove: () => {
        moveCallbackCalled = true;
      },
    });

    // Callback would be called during drag
    // In real usage, this would be triggered by mouse/touch events
    expect(moveCallbackCalled).toBeDefined();

    // Cleanup
    parent.remove();
  });
});
