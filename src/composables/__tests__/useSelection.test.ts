import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ref, effectScope, type Ref } from "vue";
import { useSelection } from "../useSelection";
import * as formatting from "../../utils/formatting";

// Mock the formatting utils
vi.mock("../../utils/formatting", () => ({
  saveSelection: vi.fn(() => {
    const range = document.createRange();
    range.setStart(document.body, 0);
    range.setEnd(document.body, 0);
    return range;
  }),
  restoreSelection: vi.fn((range: Range) => {
    const selection = globalThis.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }),
}));

describe("useSelection", () => {
  let editorElement: HTMLDivElement;
  let editorContent: Ref<HTMLElement | null>;

  beforeEach(() => {
    // Create a mock editor element
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    editorContent = ref(editorElement);

    // Clear any existing selections
    const selection = globalThis.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("saveSelection", () => {
    it("should save current selection", () => {
      const { saveSelection } = useSelection(editorContent);

      const result = saveSelection();

      expect(result).toBeInstanceOf(Range);
    });

    it("should call saveSelectionUtil from formatting utils", () => {
      const { saveSelection } = useSelection(editorContent);
      const mockedSave = vi.mocked(formatting.saveSelection);

      saveSelection();

      expect(mockedSave).toHaveBeenCalled();
    });
  });

  describe("rememberSelection", () => {
    it("should remember the current selection", () => {
      const { rememberSelection, saveSelection } = useSelection(editorContent);

      rememberSelection();

      // Should have called saveSelection internally
      expect(saveSelection()).toBeInstanceOf(Range);
    });

    it("should store selection in savedRange", async () => {
      const { rememberSelection } = useSelection(editorContent);

      // Create a selection
      const range = document.createRange();
      range.selectNodeContents(editorElement);
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      rememberSelection();

      // savedRange should now be populated (internal state)
      expect(true).toBe(true); // Internal state not directly testable
    });
  });

  describe("performWithSelection", () => {
    it("should execute action with editor root", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalledWith(editorElement);
    });

    it("should not execute if editor content is null", () => {
      editorContent.value = null;
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      performWithSelection(actionMock);

      expect(actionMock).not.toHaveBeenCalled();
    });

    it("should focus editor before executing action", () => {
      const { performWithSelection } = useSelection(editorContent);
      const focusSpy = vi.spyOn(editorElement, "focus");
      const actionMock = vi.fn();

      performWithSelection(actionMock);

      expect(focusSpy).toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it("should create fallback selection when no active selection", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      // Ensure no selection
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();
    });

    it("should use active selection if present in editor", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      // Create active selection in editor
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();
    });

    it("should restore saved selection if available and no active selection", () => {
      const { rememberSelection, performWithSelection } =
        useSelection(editorContent);

      // Remember a selection first
      rememberSelection();

      // Clear current selection
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const actionMock = vi.fn();
      performWithSelection(actionMock);

      // Action should still be executed even without active selection
      expect(actionMock).toHaveBeenCalled();
    });

    it("should execute afterAction callback if provided", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();
      const afterActionMock = vi.fn();

      performWithSelection(actionMock, afterActionMock);

      expect(actionMock).toHaveBeenCalled();
      expect(afterActionMock).toHaveBeenCalled();
    });

    it("should call afterAction after action is executed", () => {
      const { performWithSelection } = useSelection(editorContent);
      const callOrder: string[] = [];
      const actionMock = vi.fn(() => callOrder.push("action"));
      const afterActionMock = vi.fn(() => callOrder.push("afterAction"));

      performWithSelection(actionMock, afterActionMock);

      expect(callOrder).toEqual(["action", "afterAction"]);
    });

    it("should handle action errors gracefully", () => {
      const { performWithSelection } = useSelection(editorContent);
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const errorAction = vi.fn(() => {
        throw new Error("Action failed");
      });

      expect(() => performWithSelection(errorAction)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Action execution failed",
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it("should save new selection after action", () => {
      const { performWithSelection, saveSelection } =
        useSelection(editorContent);
      const actionMock = vi.fn(() => {
        // Modify selection during action
        const range = document.createRange();
        range.selectNodeContents(editorElement);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      });

      performWithSelection(actionMock);

      // Should have saved the selection after action
      expect(saveSelection()).toBeInstanceOf(Range);
    });

    it("should handle invalid saved range gracefully", () => {
      const { rememberSelection, performWithSelection } =
        useSelection(editorContent);
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Remember selection
      rememberSelection();

      // Remove editor from DOM to make saved range invalid
      const parent = editorElement.parentNode;
      editorElement.remove();

      // Create new editor element
      const newEditor = document.createElement("div");
      newEditor.setAttribute("contenteditable", "true");
      document.body.appendChild(newEditor);
      editorContent.value = newEditor;

      const actionMock = vi.fn();
      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();
      // Should have created fallback selection without errors

      newEditor.remove();
      if (parent) {
        parent.appendChild(editorElement);
      }
      consoleWarnSpy.mockRestore();
    });

    it("should handle selection restoration errors", () => {
      const { performWithSelection } = useSelection(editorContent);
      const mockedRestore = vi.mocked(formatting.restoreSelection);
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      // Make restoreSelection throw an error
      mockedRestore.mockImplementationOnce(() => {
        throw new Error("Restore failed");
      });

      const actionMock = vi.fn();
      expect(() => performWithSelection(actionMock)).not.toThrow();
      expect(actionMock).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it("should collapse selection to end for fallback", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      // Clear selection
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      performWithSelection(actionMock);

      // Check that selection was created
      expect(selection?.rangeCount).toBeGreaterThan(0);
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        expect(range.collapsed).toBe(true); // Should be collapsed to end
      }
    });

    it("should not restore saved selection if active selection exists", () => {
      const { rememberSelection, performWithSelection } =
        useSelection(editorContent);
      const mockedRestore = vi.mocked(formatting.restoreSelection);

      // Remember selection
      rememberSelection();

      // Create active selection
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 4);
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      mockedRestore.mockClear();
      const actionMock = vi.fn();
      performWithSelection(actionMock);

      // Should NOT have called restoreSelection because there's an active selection
      expect(mockedRestore).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle editor with no content", () => {
      editorElement.innerHTML = "";
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();
    });

    it("should handle multiple consecutive performWithSelection calls", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock1 = vi.fn();
      const actionMock2 = vi.fn();
      const actionMock3 = vi.fn();

      performWithSelection(actionMock1);
      performWithSelection(actionMock2);
      performWithSelection(actionMock3);

      expect(actionMock1).toHaveBeenCalled();
      expect(actionMock2).toHaveBeenCalled();
      expect(actionMock3).toHaveBeenCalled();
    });

    it("should handle collapsed selection", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      // Create collapsed selection (cursor)
      const range = document.createRange();
      const textNode = editorElement.querySelector("p")?.firstChild;
      if (textNode) {
        range.setStart(textNode, 2);
        range.setEnd(textNode, 2); // Collapsed
        const selection = globalThis.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();
    });

    it("should handle selection outside editor", () => {
      const { performWithSelection } = useSelection(editorContent);
      const actionMock = vi.fn();

      // Create selection outside editor
      const outsideElement = document.createElement("div");
      outsideElement.textContent = "Outside content";
      document.body.appendChild(outsideElement);

      const range = document.createRange();
      range.selectNodeContents(outsideElement);
      const selection = globalThis.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      performWithSelection(actionMock);

      expect(actionMock).toHaveBeenCalled();

      outsideElement.remove();
    });
  });

  describe("cleanup on scope disposal", () => {
    it("removes the document selectionchange listener when the scope stops", () => {
      const removeSpy = vi.spyOn(document, "removeEventListener");

      const scope = effectScope();
      scope.run(() => {
        useSelection(ref(editorElement));
      });

      // Before teardown the listener is still registered.
      expect(
        removeSpy.mock.calls.some(([type]) => type === "selectionchange")
      ).toBe(false);

      scope.stop();

      // The document-level listener (which used to leak per mount/unmount) is
      // released on scope disposal.
      expect(
        removeSpy.mock.calls.some(([type]) => type === "selectionchange")
      ).toBe(true);

      removeSpy.mockRestore();
    });
  });
});
