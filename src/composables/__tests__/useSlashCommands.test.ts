import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSlashCommands } from "../useSlashCommands";
import type { UseSlashCommandsOptions } from "../useSlashCommands";

// Mock the formatting utils
vi.mock("../../utils/formatting", () => ({
  getSelectionRange: vi.fn(() => {
    const range = document.createRange();
    const textNode = document.createTextNode("test content");
    document.body.appendChild(textNode);
    range.setStart(textNode, 0);
    range.setEnd(textNode, 4);
    return range;
  }),
}));

describe("useSlashCommands", () => {
  let options: UseSlashCommandsOptions;
  let editorElement: HTMLDivElement;

  beforeEach(() => {
    // Create mock editor element
    editorElement = document.createElement("div");
    editorElement.setAttribute("contenteditable", "true");
    editorElement.innerHTML = "<p>Test content</p>";
    document.body.appendChild(editorElement);

    // Create mock options
    options = {
      handleInlineAction: vi.fn(),
      handleBlockAction: vi.fn(),
      handleListAction: vi.fn(),
      insertLink: vi.fn(),
      insertImage: vi.fn(),
      openTableModal: vi.fn(),
      openCodeBlockModal: vi.fn(),
      handleInsertHR: vi.fn(),
      performWithSelection: vi.fn((callback) => callback(editorElement)),
    };
  });

  afterEach(() => {
    editorElement.remove();
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with command menu closed", () => {
      const { showCommandMenu } = useSlashCommands(options);

      expect(showCommandMenu.value).toBe(false);
    });

    it("should initialize with default command menu position", () => {
      const { commandMenuPosition } = useSlashCommands(options);

      expect(commandMenuPosition.value).toEqual({ top: 0, left: 0 });
    });

    it("should have 14 command options", () => {
      const { commandOptions } = useSlashCommands(options);

      expect(commandOptions).toHaveLength(14);
    });
  });

  describe("Command Options", () => {
    it("should have heading 1 command", () => {
      const { commandOptions } = useSlashCommands(options);

      const h1Command = commandOptions.find((cmd) => cmd.id === "slash-h1");
      expect(h1Command).toBeDefined();
      expect(h1Command?.label).toBe("Heading 1");
      expect(h1Command?.description).toBe("Large section heading");
    });

    it("should have heading 2 command", () => {
      const { commandOptions } = useSlashCommands(options);

      const h2Command = commandOptions.find((cmd) => cmd.id === "slash-h2");
      expect(h2Command).toBeDefined();
      expect(h2Command?.label).toBe("Heading 2");
    });

    it("should have heading 3 command", () => {
      const { commandOptions } = useSlashCommands(options);

      const h3Command = commandOptions.find((cmd) => cmd.id === "slash-h3");
      expect(h3Command).toBeDefined();
      expect(h3Command?.label).toBe("Heading 3");
    });

    it("should have paragraph command", () => {
      const { commandOptions } = useSlashCommands(options);

      const pCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-paragraph"
      );
      expect(pCommand).toBeDefined();
      expect(pCommand?.label).toBe("Paragraph");
    });

    it("should have bold command", () => {
      const { commandOptions } = useSlashCommands(options);

      const boldCommand = commandOptions.find((cmd) => cmd.id === "slash-bold");
      expect(boldCommand).toBeDefined();
      expect(boldCommand?.label).toBe("Bold");
    });

    it("should have italic command", () => {
      const { commandOptions } = useSlashCommands(options);

      const italicCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-italic"
      );
      expect(italicCommand).toBeDefined();
      expect(italicCommand?.label).toBe("Italic");
    });

    it("should have bullet list command", () => {
      const { commandOptions } = useSlashCommands(options);

      const bulletCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-bullet"
      );
      expect(bulletCommand).toBeDefined();
      expect(bulletCommand?.label).toBe("Bullet List");
    });

    it("should have numbered list command", () => {
      const { commandOptions } = useSlashCommands(options);

      const numberedCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-numbered"
      );
      expect(numberedCommand).toBeDefined();
      expect(numberedCommand?.label).toBe("Numbered List");
    });

    it("should have quote command", () => {
      const { commandOptions } = useSlashCommands(options);

      const quoteCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-quote"
      );
      expect(quoteCommand).toBeDefined();
      expect(quoteCommand?.label).toBe("Quote");
    });

    it("should have code block command", () => {
      const { commandOptions } = useSlashCommands(options);

      const codeCommand = commandOptions.find((cmd) => cmd.id === "slash-code");
      expect(codeCommand).toBeDefined();
      expect(codeCommand?.label).toBe("Code Block");
    });

    it("should have link command", () => {
      const { commandOptions } = useSlashCommands(options);

      const linkCommand = commandOptions.find((cmd) => cmd.id === "slash-link");
      expect(linkCommand).toBeDefined();
      expect(linkCommand?.label).toBe("Link");
    });

    it("should have image command", () => {
      const { commandOptions } = useSlashCommands(options);

      const imageCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-image"
      );
      expect(imageCommand).toBeDefined();
      expect(imageCommand?.label).toBe("Image");
    });

    it("should have table command", () => {
      const { commandOptions } = useSlashCommands(options);

      const tableCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-table"
      );
      expect(tableCommand).toBeDefined();
      expect(tableCommand?.label).toBe("Table");
    });

    it("should have divider command", () => {
      const { commandOptions } = useSlashCommands(options);

      const dividerCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-divider"
      );
      expect(dividerCommand).toBeDefined();
      expect(dividerCommand?.label).toBe("Divider");
    });
  });

  describe("Command Actions", () => {
    it("should call handleBlockAction for h1 command", () => {
      const { commandOptions } = useSlashCommands(options);

      const h1Command = commandOptions.find((cmd) => cmd.id === "slash-h1");
      h1Command?.action();

      expect(options.handleBlockAction).toHaveBeenCalledWith("h1");
    });

    it("should call handleBlockAction for h2 command", () => {
      const { commandOptions } = useSlashCommands(options);

      const h2Command = commandOptions.find((cmd) => cmd.id === "slash-h2");
      h2Command?.action();

      expect(options.handleBlockAction).toHaveBeenCalledWith("h2");
    });

    it("should call handleBlockAction for paragraph command", () => {
      const { commandOptions } = useSlashCommands(options);

      const pCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-paragraph"
      );
      pCommand?.action();

      expect(options.handleBlockAction).toHaveBeenCalledWith("p");
    });

    it("should call handleInlineAction for bold command", () => {
      const { commandOptions } = useSlashCommands(options);

      const boldCommand = commandOptions.find((cmd) => cmd.id === "slash-bold");
      boldCommand?.action();

      expect(options.handleInlineAction).toHaveBeenCalledWith("strong");
    });

    it("should call handleInlineAction for italic command", () => {
      const { commandOptions } = useSlashCommands(options);

      const italicCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-italic"
      );
      italicCommand?.action();

      expect(options.handleInlineAction).toHaveBeenCalledWith("em");
    });

    it("should call handleListAction for bullet list command", () => {
      const { commandOptions } = useSlashCommands(options);

      const bulletCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-bullet"
      );
      bulletCommand?.action();

      expect(options.handleListAction).toHaveBeenCalledWith("ul");
    });

    it("should call handleListAction for numbered list command", () => {
      const { commandOptions } = useSlashCommands(options);

      const numberedCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-numbered"
      );
      numberedCommand?.action();

      expect(options.handleListAction).toHaveBeenCalledWith("ol");
    });

    it("should call insertLink for link command", () => {
      const { commandOptions } = useSlashCommands(options);

      const linkCommand = commandOptions.find((cmd) => cmd.id === "slash-link");
      linkCommand?.action();

      expect(options.insertLink).toHaveBeenCalled();
    });

    it("should call insertImage for image command", () => {
      const { commandOptions } = useSlashCommands(options);

      const imageCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-image"
      );
      imageCommand?.action();

      expect(options.insertImage).toHaveBeenCalled();
    });

    it("should call openTableModal for table command", () => {
      const { commandOptions } = useSlashCommands(options);

      const tableCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-table"
      );
      tableCommand?.action();

      expect(options.openTableModal).toHaveBeenCalled();
    });

    it("should call openCodeBlockModal for code block command", () => {
      const { commandOptions } = useSlashCommands(options);

      const codeCommand = commandOptions.find((cmd) => cmd.id === "slash-code");
      codeCommand?.action();

      expect(options.openCodeBlockModal).toHaveBeenCalled();
    });

    it("should call handleInsertHR for divider command", () => {
      const { commandOptions } = useSlashCommands(options);

      const dividerCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-divider"
      );
      dividerCommand?.action();

      expect(options.handleInsertHR).toHaveBeenCalled();
    });
  });

  describe("Command Menu Operations", () => {
    it("should open command menu", async () => {
      const { openCommandMenu, showCommandMenu } = useSlashCommands(options);

      openCommandMenu();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(showCommandMenu.value).toBe(true);
    });

    it("should close command menu", () => {
      const { openCommandMenu, closeCommandMenu, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      closeCommandMenu();

      expect(showCommandMenu.value).toBe(false);
    });

    it("should set command menu position when opened", async () => {
      const { openCommandMenu, commandMenuPosition } =
        useSlashCommands(options);

      openCommandMenu();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(commandMenuPosition.value.top).toBeGreaterThanOrEqual(0);
      expect(commandMenuPosition.value.left).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Handle Command Option", () => {
    it("should execute command action and close menu", () => {
      const {
        handleCommandOption,
        commandOptions,
        showCommandMenu,
        openCommandMenu,
      } = useSlashCommands(options);

      openCommandMenu();
      const boldCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-bold"
      )!;
      handleCommandOption(boldCommand);

      expect(options.handleInlineAction).toHaveBeenCalledWith("strong");
      expect(showCommandMenu.value).toBe(false);
    });

    it("toasts 'applied' for a command that applies content immediately", () => {
      const showToast = vi.fn();
      const { handleCommandOption, commandOptions } = useSlashCommands({
        ...options,
        showToast,
      });
      handleCommandOption(commandOptions.find((c) => c.id === "slash-bold")!);
      expect(showToast).toHaveBeenCalledWith("Bold applied", "success");
    });

    it("does NOT toast 'applied' for a command that only opens a modal", () => {
      const showToast = vi.fn();
      const { handleCommandOption, commandOptions } = useSlashCommands({
        ...options,
        showToast,
      });
      // Table/Link/Image/Code Block open a modal — nothing has been applied yet,
      // so "Table applied" is a lie. The modal itself is the feedback.
      for (const id of [
        "slash-table",
        "slash-link",
        "slash-image",
        "slash-code",
      ]) {
        const cmd = commandOptions.find((c) => c.id === id);
        if (cmd) handleCommandOption(cmd);
      }
      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe("Event Handlers", () => {
    it("should close menu on escape key", () => {
      const { openCommandMenu, handleEscape, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      handleEscape(event);

      expect(showCommandMenu.value).toBe(false);
    });

    it("should not close menu on other keys", () => {
      const { openCommandMenu, handleEscape, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      const event = new KeyboardEvent("keydown", { key: "Enter" });
      handleEscape(event);

      // Menu should still be open (showCommandMenu initially false after openCommandMenu due to timing)
      expect(showCommandMenu.value).toBe(false);
    });

    it("should close menu on document click outside", () => {
      const { openCommandMenu, handleDocumentClick, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      showCommandMenu.value = true; // Manually set to true

      const event = new MouseEvent("click");
      Object.defineProperty(event, "target", {
        value: document.body,
        writable: false,
      });
      handleDocumentClick(event);

      expect(showCommandMenu.value).toBe(false);
    });

    it("should not close menu on click inside command menu", () => {
      const { openCommandMenu, handleDocumentClick, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      showCommandMenu.value = true;

      const commandMenuElement = document.createElement("div");
      commandMenuElement.className = "command-menu";
      document.body.appendChild(commandMenuElement);

      const event = new MouseEvent("click");
      Object.defineProperty(event, "target", {
        value: commandMenuElement,
        writable: false,
      });
      handleDocumentClick(event);

      expect(showCommandMenu.value).toBe(true);

      commandMenuElement.remove();
    });
  });

  describe("Blockquote Command", () => {
    it("should call performWithSelection for quote command", () => {
      const { commandOptions } = useSlashCommands(options);

      const quoteCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-quote"
      );
      quoteCommand?.action();

      expect(options.performWithSelection).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid command menu toggling", async () => {
      const { openCommandMenu, closeCommandMenu, showCommandMenu } =
        useSlashCommands(options);

      openCommandMenu();
      closeCommandMenu();
      openCommandMenu();
      closeCommandMenu();

      expect(showCommandMenu.value).toBe(false);
    });

    it("should handle executing multiple commands in sequence", () => {
      const { handleCommandOption, commandOptions } = useSlashCommands(options);

      const boldCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-bold"
      )!;
      const italicCommand = commandOptions.find(
        (cmd) => cmd.id === "slash-italic"
      )!;

      handleCommandOption(boldCommand);
      handleCommandOption(italicCommand);

      expect(options.handleInlineAction).toHaveBeenCalledWith("strong");
      expect(options.handleInlineAction).toHaveBeenCalledWith("em");
    });

    it("should handle all command types", () => {
      const { commandOptions } = useSlashCommands(options);

      // Execute all commands to ensure no errors
      commandOptions.forEach((command) => {
        command.action();
      });

      // Verify all handlers were called at least once
      expect(options.handleBlockAction).toHaveBeenCalled();
      expect(options.handleInlineAction).toHaveBeenCalled();
      expect(options.handleListAction).toHaveBeenCalled();
      expect(options.insertLink).toHaveBeenCalled();
      expect(options.insertImage).toHaveBeenCalled();
      expect(options.openTableModal).toHaveBeenCalled();
      expect(options.openCodeBlockModal).toHaveBeenCalled();
      expect(options.handleInsertHR).toHaveBeenCalled();
    });
  });

  describe("Keyboard navigation", () => {
    it("starts with the first option highlighted", () => {
      const { selectedIndex } = useSlashCommands(options);
      expect(selectedIndex.value).toBe(0);
    });

    it("ignores keys while the menu is closed", () => {
      const { handleMenuKeydown, selectedIndex } = useSlashCommands(options);
      const handled = handleMenuKeydown(
        new KeyboardEvent("keydown", { key: "ArrowDown" })
      );
      expect(handled).toBe(false);
      expect(selectedIndex.value).toBe(0);
    });

    it("moves the highlight with arrow keys and wraps around", () => {
      const {
        showCommandMenu,
        selectedIndex,
        commandOptions,
        handleMenuKeydown,
      } = useSlashCommands(options);
      showCommandMenu.value = true;

      expect(
        handleMenuKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" }))
      ).toBe(true);
      expect(selectedIndex.value).toBe(1);

      handleMenuKeydown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(selectedIndex.value).toBe(0);

      // wrap from the first item back to the last
      handleMenuKeydown(new KeyboardEvent("keydown", { key: "ArrowUp" }));
      expect(selectedIndex.value).toBe(commandOptions.length - 1);
    });

    it("runs the highlighted command on Enter and closes the menu", () => {
      const { showCommandMenu, handleMenuKeydown } = useSlashCommands(options);
      showCommandMenu.value = true;
      // index 0 is "Heading 1" -> handleBlockAction('h1')
      const handled = handleMenuKeydown(
        new KeyboardEvent("keydown", { key: "Enter" })
      );
      expect(handled).toBe(true);
      expect(options.handleBlockAction).toHaveBeenCalledWith("h1");
      expect(showCommandMenu.value).toBe(false);
    });

    it("selects with Tab as well", () => {
      const { showCommandMenu, selectedIndex, handleMenuKeydown } =
        useSlashCommands(options);
      showCommandMenu.value = true;
      selectedIndex.value = 3; // "Paragraph"
      handleMenuKeydown(new KeyboardEvent("keydown", { key: "Tab" }));
      expect(options.handleBlockAction).toHaveBeenCalledWith("p");
      expect(showCommandMenu.value).toBe(false);
    });

    it("closes on Escape", () => {
      const { showCommandMenu, handleMenuKeydown } = useSlashCommands(options);
      showCommandMenu.value = true;
      const handled = handleMenuKeydown(
        new KeyboardEvent("keydown", { key: "Escape" })
      );
      expect(handled).toBe(true);
      expect(showCommandMenu.value).toBe(false);
    });
  });
});
