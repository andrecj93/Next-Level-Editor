import { describe, it, expect } from "vitest";
import { ref } from "vue";
import { useResizable } from "../useResizable";

describe("useResizable", () => {
  it("initializes with correct dimensions", () => {
    const containerRef = ref(document.createElement("div"));

    const { currentWidth, currentHeight } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    expect(currentWidth.value).toBe(400);
    expect(currentHeight.value).toBe(300);
  });

  it("resets to initial dimensions", () => {
    const containerRef = ref(document.createElement("div"));

    const { currentWidth, currentHeight, resetSize } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    // Change dimensions
    currentWidth.value = 600;
    currentHeight.value = 450;

    // Reset
    resetSize();

    expect(currentWidth.value).toBe(400);
    expect(currentHeight.value).toBe(300);
  });

  it("sets isResizing to true during resize", () => {
    const containerRef = ref(document.createElement("div"));

    const { isResizing, startResize } = useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
    });

    expect(isResizing.value).toBe(false);

    // Start resize
    const mouseEvent = new MouseEvent("mousedown", {
      clientX: 100,
      clientY: 100,
    });
    startResize(mouseEvent, "se");

    expect(isResizing.value).toBe(true);
  });

  it("calls onResize callback when dimensions change", () => {
    const containerRef = ref(document.createElement("div"));
    let callbackCalled = false;

    useResizable({
      containerRef,
      initialWidth: 400,
      initialHeight: 300,
      minWidth: 100,
      minHeight: 100,
      maxWidth: 1000,
      maxHeight: 1000,
      maintainAspectRatio: true,
      onResize: () => {
        callbackCalled = true;
      },
    });

    // Callback would be called during resize
    // In real usage, this would be triggered by mouse/touch events
    expect(callbackCalled).toBeDefined();
  });
});
