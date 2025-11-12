/**
 * Example plugin for the Next Level Editor
 * This demonstrates how to create custom plugins
 */

import { createPlugin } from "../../composables/usePlugin";
import type { EditorPlugin } from "../../types/plugin";

/**
 * Example: Word Count Plugin
 * Adds a button to show word count in an alert
 */
export const wordCountPlugin: EditorPlugin = createPlugin({
  name: "WordCountPlugin",
  version: "1.0.0",
  description: "Shows word count in alert",

  toolbarButtons: [
    {
      id: "word-count-alert",
      label: "📊",
      title: "Show Word Count",
      onClick: function (this: { getContent: () => string }) {
        const content = this.getContent();
        // Using replace with global flag (replaceAll not available in ES2019)
        const text = content.replace(/<[^>]*>/g, "");
        const words = text
          .trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;
        alert(`Word Count: ${words}`);
      },
    },
  ],
});

/**
 * Example: Uppercase Plugin
 * Adds a command to convert selected text to uppercase
 */
export const uppercasePlugin: EditorPlugin = createPlugin({
  name: "UppercasePlugin",
  version: "1.0.0",
  description: "Convert selected text to uppercase",

  commands: [
    {
      id: "uppercase",
      name: "Uppercase",
      description: "Convert selected text to uppercase",
      shortcut: "Ctrl+Shift+U",
      execute: function (this: { getSelection: () => Selection | null }) {
        const selection = this.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const text = selection.toString();
          const uppercase = text.toUpperCase();

          // Insert uppercase text using Range API
          range.deleteContents();
          range.insertNode(document.createTextNode(uppercase));
        }
      },
      canExecute: function (this: { getSelection: () => Selection | null }) {
        const selection = this.getSelection();
        return selection !== null && !selection.isCollapsed;
      },
    },
  ],

  slashCommands: [
    {
      id: "uppercase-slash",
      trigger: "uppercase",
      label: "Uppercase",
      description: "Convert selection to uppercase",
      icon: "🔠",
      execute: function (this: { getSelection: () => Selection | null }) {
        const selection = this.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const text = selection.toString();
          const uppercase = text.toUpperCase();

          // Insert uppercase text using Range API
          range.deleteContents();
          range.insertNode(document.createTextNode(uppercase));
        }
      },
    },
  ],
});

/**
 * Example: Insert Date Plugin
 * Adds a button and slash command to insert current date
 */
export const insertDatePlugin: EditorPlugin = createPlugin({
  name: "InsertDatePlugin",
  version: "1.0.0",
  description: "Insert current date into the editor",

  toolbarButtons: [
    {
      id: "insert-date",
      label: "📅",
      title: "Insert Date",
      onClick: function (this: { getSelection: () => Selection | null }) {
        const date = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const selection = this.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement("span");
          span.className = "date";
          span.textContent = date;

          range.deleteContents();
          range.insertNode(span);

          // Move cursor after inserted date
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      },
    },
  ],

  slashCommands: [
    {
      id: "date",
      trigger: "date",
      label: "Insert Date",
      description: "Insert current date",
      icon: "📅",
      execute: function (this: { getSelection: () => Selection | null }) {
        const date = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const selection = this.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const span = document.createElement("span");
          span.className = "date";
          span.textContent = date;

          range.deleteContents();
          range.insertNode(span);

          // Move cursor after inserted date
          range.setStartAfter(span);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      },
    },
  ],
});

/**
 * Example: Custom Highlight Plugin
 * Adds a button to highlight text with custom color
 */
export const customHighlightPlugin: EditorPlugin = createPlugin({
  name: "CustomHighlightPlugin",
  version: "1.0.0",
  description: "Highlight text with custom color",

  toolbarButtons: [
    {
      id: "custom-highlight",
      label: "🖍️",
      title: "Custom Highlight (Ctrl+Shift+H)",
      shortcut: "Ctrl+Shift+H",
      onClick: function (this: { getSelection: () => Selection | null }) {
        const selection = this.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const mark = document.createElement("mark");
          mark.style.backgroundColor = "#ffeb3b";

          try {
            range.surroundContents(mark);
          } catch {
            // Fallback for complex selections
            const contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
          }

          // Restore selection
          selection.removeAllRanges();
          selection.addRange(range);
        }
      },
    },
  ],

  install(context) {
    // Add keyboard shortcut listener
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();

        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const mark = document.createElement("mark");
          mark.style.backgroundColor = "#ffeb3b";

          try {
            range.surroundContents(mark);
          } catch {
            // Fallback for complex selections
            const contents = range.extractContents();
            mark.appendChild(contents);
            range.insertNode(mark);
          }

          // Restore selection
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    };

    if (context.editorElement) {
      context.editorElement.addEventListener("keydown", handleKeydown);
    }
  },
});
