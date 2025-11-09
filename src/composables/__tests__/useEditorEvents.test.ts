import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick, type Ref } from "vue";
import { useEditorEvents } from "../useEditorEvents";
import * as commands from "../../utils/commands";

// Mock the commands module
vi.mock("../../utils/commands", () => ({
  getSelectedTable: vi.fn(),
  getSelectedCell: vi.fn(),
}));

describe("useEditorEvents", () => {
  let editorContent: Ref<HTMLDivElement | null>;
  let codeContent: Ref<string>;
  let htmlContent: Ref<string>;
  let showFloatingToolbar: Ref<boolean>;
  let showTableDesigner: Ref<boolean>;
  let currentTable: Ref<HTMLTableElement | null>;
  let currentCell: Ref<HTMLTableCellElement | null>;
  let tableDesignerPosition: Ref<{ x: number; y: number }>;
  let editorElement: HTMLDivElement;
  let captureSnapshot: (shouldEmit?: boolean) => void;
  let updateFloatingToolbar: () => void;
  let updateToolbarContext: (element: HTMLElement) => void;
  let rememberSelection: () => void;
  let emit: any;

  beforeEach(() => {
    // Create editor element
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    // Setup refs
    editorContent = ref<HTMLDivElement | null>(editorElement);
    codeContent = ref<string>("<p>Code content</p>");
    htmlContent = ref<string>("<p>HTML content</p>");
    showFloatingToolbar = ref<boolean>(false);
    showTableDesigner = ref<boolean>(false);
    currentTable = ref<HTMLTableElement | null>(null);
    currentCell = ref<HTMLTableCellElement | null>(null);
    tableDesignerPosition = ref<{ x: number; y: number }>({ x: 0, y: 0 });

    // Setup mock functions
    captureSnapshot = vi.fn();
    updateFloatingToolbar = vi.fn();
    updateToolbarContext = vi.fn();
    rememberSelection = vi.fn();
    emit = vi.fn();

    // Mock timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("onInput", () => {
    it("should call captureSnapshot on input", () => {
      const { onInput } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onInput();

      expect(captureSnapshot).toHaveBeenCalled();
    });

    it("should call updateFloatingToolbar on input", () => {
      const { onInput } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onInput();

      expect(updateFloatingToolbar).toHaveBeenCalled();
    });
  });

  describe("onFocus", () => {
    it("should call rememberSelection on focus", () => {
      const { onFocus } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onFocus();

      expect(rememberSelection).toHaveBeenCalled();
    });

    it("should emit focus event", () => {
      const { onFocus } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onFocus();

      expect(emit).toHaveBeenCalledWith("focus");
    });
  });

  describe("onBlur", () => {
    it("should call rememberSelection on blur", () => {
      const { onBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onBlur();

      expect(rememberSelection).toHaveBeenCalled();
    });

    it("should hide floating toolbar after delay", () => {
      const { onBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      showFloatingToolbar.value = true;
      onBlur();

      expect(showFloatingToolbar.value).toBe(true);

      vi.advanceTimersByTime(200);

      expect(showFloatingToolbar.value).toBe(false);
    });

    it("should emit blur event", () => {
      const { onBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onBlur();

      expect(emit).toHaveBeenCalledWith("blur");
    });
  });

  describe("onMouseUp", () => {
    it("should call updateFloatingToolbar on mouse up", () => {
      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(updateFloatingToolbar).toHaveBeenCalled();
    });

    it("should check for table selection on mouse up", () => {
      vi.mocked(commands.getSelectedTable).mockReturnValue(null);
      vi.mocked(commands.getSelectedCell).mockReturnValue(null);

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(commands.getSelectedTable).toHaveBeenCalled();
      expect(commands.getSelectedCell).toHaveBeenCalled();
    });
  });

  describe("checkForTableSelection", () => {
    it("should show table designer when table and cell are selected", () => {
      const table = document.createElement("table");
      const cell = document.createElement("td");
      table.appendChild(cell);
      document.body.appendChild(table);

      // Mock getBoundingClientRect - extract objects to avoid deep nesting
      const tableBoundingRect = {
        right: 200,
        top: 100,
        left: 50,
        bottom: 150,
        width: 150,
        height: 50,
        x: 50,
        y: 100,
        toJSON: () => {},
      };

      const editorBoundingRect = {
        right: 400,
        top: 50,
        left: 0,
        bottom: 400,
        width: 400,
        height: 350,
        x: 0,
        y: 50,
        toJSON: () => {},
      };

      table.getBoundingClientRect = vi.fn(() => tableBoundingRect);
      editorElement.getBoundingClientRect = vi.fn(() => editorBoundingRect);

      vi.mocked(commands.getSelectedTable).mockReturnValue(table);
      vi.mocked(commands.getSelectedCell).mockReturnValue(cell);

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(showTableDesigner.value).toBe(true);
      expect(currentTable.value).toBe(table);
      expect(currentCell.value).toBe(cell);
      expect(tableDesignerPosition.value.x).toBe(210);
      expect(tableDesignerPosition.value.y).toBe(50);

      table.remove();
    });

    it("should hide table designer when no table is selected", () => {
      vi.mocked(commands.getSelectedTable).mockReturnValue(null);
      vi.mocked(commands.getSelectedCell).mockReturnValue(null);

      showTableDesigner.value = true;
      currentTable.value = document.createElement("table");
      currentCell.value = document.createElement("td");

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(showTableDesigner.value).toBe(false);
      expect(currentTable.value).toBe(null);
      expect(currentCell.value).toBe(null);
    });

    it("should hide table designer when only table is selected without cell", () => {
      const table = document.createElement("table");
      vi.mocked(commands.getSelectedTable).mockReturnValue(table);
      vi.mocked(commands.getSelectedCell).mockReturnValue(null);

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(showTableDesigner.value).toBe(false);
    });

    it("should hide table designer when only cell is selected without table", () => {
      const cell = document.createElement("td");
      vi.mocked(commands.getSelectedTable).mockReturnValue(null);
      vi.mocked(commands.getSelectedCell).mockReturnValue(cell);

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onMouseUp();

      expect(showTableDesigner.value).toBe(false);
    });
  });

  describe("onSelectionChange", () => {
    it("should call updateFloatingToolbar on selection change", async () => {
      const { onSelectionChange } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onSelectionChange();

      expect(updateFloatingToolbar).toHaveBeenCalled();
    });

    it("should check for table selection on selection change", () => {
      vi.mocked(commands.getSelectedTable).mockReturnValue(null);
      vi.mocked(commands.getSelectedCell).mockReturnValue(null);

      const { onSelectionChange } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onSelectionChange();

      expect(commands.getSelectedTable).toHaveBeenCalled();
      expect(commands.getSelectedCell).toHaveBeenCalled();
    });

    it("should update toolbar context after nextTick", async () => {
      const { onSelectionChange } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onSelectionChange();
      await nextTick();

      expect(updateToolbarContext).toHaveBeenCalledWith(editorElement);
    });

    it("should not update toolbar context when editorContent is null", async () => {
      editorContent.value = null;

      const { onSelectionChange } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onSelectionChange();
      await nextTick();

      expect(updateToolbarContext).not.toHaveBeenCalled();
    });
  });

  describe("onCodeInput", () => {
    it("should update codeContent on code input", () => {
      const { onCodeInput } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      const textarea = document.createElement("textarea");
      textarea.value = "<h1>New code</h1>";
      const event = { target: textarea } as unknown as Event;

      onCodeInput(event);

      expect(codeContent.value).toBe("<h1>New code</h1>");
    });

    it("should sync code to editor innerHTML", () => {
      const { onCodeInput } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      const textarea = document.createElement("textarea");
      textarea.value = "<h2>Updated content</h2>";
      const event = { target: textarea } as unknown as Event;

      onCodeInput(event);

      expect(editorElement.innerHTML).toBe("<h2>Updated content</h2>");
      expect(htmlContent.value).toBe("<h2>Updated content</h2>");
    });

    it("should not sync when editorContent is null", () => {
      editorContent.value = null;

      const { onCodeInput } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      const textarea = document.createElement("textarea");
      textarea.value = "<div>Test</div>";
      const event = { target: textarea } as unknown as Event;

      expect(() => onCodeInput(event)).not.toThrow();
      expect(codeContent.value).toBe("<div>Test</div>");
    });
  });

  describe("onCodeBlur", () => {
    it("should sync code content to editor on blur", () => {
      codeContent.value = "<h3>Synced content</h3>";

      const { onCodeBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onCodeBlur();

      expect(editorElement.innerHTML).toBe("<h3>Synced content</h3>");
      expect(htmlContent.value).toBe("<h3>Synced content</h3>");
    });

    it("should emit update:modelValue on code blur", () => {
      codeContent.value = "<p>Final content</p>";

      const { onCodeBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onCodeBlur();

      expect(emit).toHaveBeenCalledWith(
        "update:modelValue",
        "<p>Final content</p>"
      );
    });

    it("should not sync when editorContent is null", () => {
      editorContent.value = null;
      codeContent.value = "<div>Test</div>";

      const { onCodeBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      expect(() => onCodeBlur()).not.toThrow();
      expect(emit).not.toHaveBeenCalled();
    });

    it("should not sync when codeContent is empty", () => {
      codeContent.value = "";

      const { onCodeBlur } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      onCodeBlur();

      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle multiple rapid events without errors", () => {
      const events = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      expect(() => {
        events.onInput();
        events.onMouseUp();
        events.onFocus();
        events.onSelectionChange();
        events.onBlur();
      }).not.toThrow();

      expect(captureSnapshot).toHaveBeenCalled();
      expect(updateFloatingToolbar).toHaveBeenCalled();
      expect(rememberSelection).toHaveBeenCalled();
    });

    it("should handle all event handlers without editor content", () => {
      editorContent.value = null;

      const events = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      expect(() => {
        events.onInput();
        events.onFocus();
        events.onBlur();
        events.onMouseUp();
        events.onSelectionChange();
        events.onCodeBlur();
      }).not.toThrow();
    });

    it("should handle table selection after table is removed from DOM", () => {
      const table = document.createElement("table");
      const cell = document.createElement("td");

      vi.mocked(commands.getSelectedTable).mockReturnValue(table);
      vi.mocked(commands.getSelectedCell).mockReturnValue(cell);

      const { onMouseUp } = useEditorEvents({
        editorContent,
        codeContent,
        htmlContent,
        captureSnapshot,
        updateFloatingToolbar,
        updateToolbarContext,
        rememberSelection,
        showFloatingToolbar,
        showTableDesigner,
        currentTable,
        currentCell,
        tableDesignerPosition,
        emit,
      });

      // Try to get bounding rect without table in DOM
      expect(() => onMouseUp()).not.toThrow();
    });
  });
});
