import { ref, computed } from "vue";

/**
 * Variable definition
 */
export interface Variable {
  id: string;
  name: string;
  label: string;
  value: string;
  category?: string;
  description?: string;
}

/**
 * Variable category for organization
 */
export interface VariableCategory {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Composable for managing template variables in the editor
 * Variables are displayed as {{ variableName }} and rendered with special styling
 */
export function useVariables() {
  // Available variables that can be inserted
  const variables = ref<Variable[]>([
    // User variables
    {
      id: "user.name",
      name: "user.name",
      label: "User Name",
      value: "John Doe",
      category: "user",
      description: "Current user full name",
    },
    {
      id: "user.email",
      name: "user.email",
      label: "User Email",
      value: "john.doe@example.com",
      category: "user",
      description: "Current user email address",
    },
    {
      id: "user.firstName",
      name: "user.firstName",
      label: "First Name",
      value: "John",
      category: "user",
      description: "User first name",
    },
    {
      id: "user.lastName",
      name: "user.lastName",
      label: "Last Name",
      value: "Doe",
      category: "user",
      description: "User last name",
    },

    // Date variables
    {
      id: "date.today",
      name: "date.today",
      label: "Today",
      value: new Date().toLocaleDateString(),
      category: "date",
      description: "Current date",
    },
    {
      id: "date.now",
      name: "date.now",
      label: "Current Time",
      value: new Date().toLocaleTimeString(),
      category: "date",
      description: "Current time",
    },
    {
      id: "date.year",
      name: "date.year",
      label: "Year",
      value: new Date().getFullYear().toString(),
      category: "date",
      description: "Current year",
    },
    {
      id: "date.month",
      name: "date.month",
      label: "Month",
      value: new Date().toLocaleDateString("en", { month: "long" }),
      category: "date",
      description: "Current month",
    },

    // Document variables
    {
      id: "doc.title",
      name: "doc.title",
      label: "Document Title",
      value: "Untitled Document",
      category: "document",
      description: "Document title",
    },
    {
      id: "doc.author",
      name: "doc.author",
      label: "Author",
      value: "John Doe",
      category: "document",
      description: "Document author",
    },
    {
      id: "doc.version",
      name: "doc.version",
      label: "Version",
      value: "1.0",
      category: "document",
      description: "Document version",
    },

    // Company variables
    {
      id: "company.name",
      name: "company.name",
      label: "Company Name",
      value: "Acme Corp",
      category: "company",
      description: "Company name",
    },
    {
      id: "company.address",
      name: "company.address",
      label: "Company Address",
      value: "123 Main St, City, State",
      category: "company",
      description: "Company address",
    },
    {
      id: "company.phone",
      name: "company.phone",
      label: "Company Phone",
      value: "+1 (555) 123-4567",
      category: "company",
      description: "Company phone number",
    },
  ]);

  // Variable categories. Icons are rendered by the UI as stroke SVGs keyed
  // off the category id (see VariableAutocomplete.vue) — the editor chrome
  // never uses raw emoji.
  const categories = ref<VariableCategory[]>([
    { id: "user", name: "User" },
    { id: "date", name: "Date & Time" },
    { id: "document", name: "Document" },
    { id: "company", name: "Company" },
  ]);

  // Get variables by category
  const getVariablesByCategory = (categoryId: string) => {
    return variables.value.filter((v) => v.category === categoryId);
  };

  // Get variable by name
  const getVariable = (name: string): Variable | undefined => {
    return variables.value.find((v) => v.name === name);
  };

  // Add a custom variable
  const addVariable = (variable: Variable) => {
    if (!variables.value.some((v) => v.id === variable.id)) {
      variables.value.push(variable);
    }
  };

  // Update variable value
  const updateVariableValue = (name: string, value: string) => {
    const variable = variables.value.find((v) => v.name === name);
    if (variable) {
      variable.value = value;
    }
  };

  // Remove variable
  const removeVariable = (name: string) => {
    const index = variables.value.findIndex((v) => v.name === name);
    if (index !== -1) {
      variables.value.splice(index, 1);
    }
  };

  // Search variables
  const searchVariables = (query: string): Variable[] => {
    const lowerQuery = query.toLowerCase();
    return variables.value.filter(
      (v) =>
        v.name.toLowerCase().includes(lowerQuery) ||
        v.label.toLowerCase().includes(lowerQuery) ||
        v.description?.toLowerCase().includes(lowerQuery)
    );
  };

  /**
   * Parse variable syntax from text
   * Matches {{ variableName }} pattern
   */
  const parseVariables = (text: string): RegExpMatchArray[] => {
    const regex = /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g;
    return Array.from(text.matchAll(regex));
  };

  /**
   * Replace variables in text with their values
   */
  const replaceVariables = (text: string): string => {
    return text.replace(
      /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g,
      (match, varName) => {
        const variable = getVariable(varName.trim());
        return variable ? variable.value : match;
      }
    );
  };

  /**
   * Build the styled, non-editable pill span for a variable token.
   *
   * NOTE: the attribute creation order (class, contenteditable,
   * data-variable, data-value, title) is mirrored by useHtmlSanitizer's pill
   * rebuild so a sanitize round-trip of a fresh pill is string-identical —
   * innerHTML string comparisons decide whether the editor DOM gets rewritten
   * (destroying the caret), so keep them in sync.
   */
  const createVariableSpan = (variableName: string): HTMLSpanElement => {
    const variable = getVariable(variableName);
    const span = document.createElement("span");
    span.className = "editor-variable";
    span.contentEditable = "false";
    span.dataset.variable = variableName;
    span.dataset.value = variable?.value || "";
    span.textContent = `{{ ${variableName} }}`;
    if (variable?.description) {
      span.title = variable.description;
    }
    return span;
  };

  /**
   * Wrap variable spans in the editor content
   * This transforms completed {{ varName }} tokens into styled pill spans.
   *
   * Two invariants keep typing safe once a pill exists:
   * - Idempotence: a pill's own "{{ name }}" label is never re-wrapped, so
   *   repeated passes (this runs on every input) cannot nest pills and the
   *   DOM only changes when a new token actually completes.
   * - Caret preservation: when the text node under the caret is rewritten
   *   (the user just typed the closing "}}"), the caret is restored to the
   *   equivalent position among the new nodes instead of collapsing to the
   *   start of the document.
   */
  const wrapVariablesInContent = (editor: HTMLElement | null) => {
    if (!editor) return;

    const selection = globalThis.getSelection?.() ?? null;
    const caretRange =
      selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    const caretNode = caretRange ? caretRange.startContainer : null;
    const caretOffset = caretRange ? caretRange.startOffset : 0;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodesToReplace: { node: Node; matches: RegExpMatchArray[] }[] = [];

    let node: Node | null;
    while ((node = walker.nextNode())) {
      // A pill's own "{{ name }}" label is a text node too — re-wrapping it
      // would nest a new pill inside the old one on every input.
      if (node.parentElement?.closest(".editor-variable")) continue;
      const text = node.textContent || "";
      const matches = parseVariables(text);
      if (matches.length > 0) {
        nodesToReplace.push({ node, matches });
      }
    }

    // Replace text nodes with variable spans
    nodesToReplace.forEach(({ node, matches }) => {
      const text = node.textContent || "";
      const fragment = document.createDocumentFragment();
      const holdsCaret = node === caretNode;

      // Where to restore the caret after the rewrite: either inside a plain
      // text segment (node + offset) or immediately after a pill span. Only
      // the first matching segment latches.
      let restoreIn: Text | null = null;
      let restoreOffset = 0;
      let restoreAfter: HTMLElement | null = null;
      const placeCaret = (candidate: Text | HTMLElement, offset = 0) => {
        if (restoreIn || restoreAfter) return;
        if (candidate instanceof HTMLElement) {
          restoreAfter = candidate;
        } else {
          restoreIn = candidate;
          restoreOffset = Math.max(0, Math.min(offset, candidate.length));
        }
      };

      let lastIndex = 0;

      matches.forEach((match) => {
        const matchIndex = match.index!;
        const varName = match[1].trim();

        // Add text before variable
        if (matchIndex > lastIndex) {
          const before = document.createTextNode(
            text.substring(lastIndex, matchIndex)
          );
          fragment.appendChild(before);
          if (holdsCaret && caretOffset <= matchIndex) {
            placeCaret(before, caretOffset - lastIndex);
          }
        }

        const span = createVariableSpan(varName);
        fragment.appendChild(span);
        if (holdsCaret && caretOffset <= matchIndex + match[0].length) {
          placeCaret(span);
        }
        lastIndex = matchIndex + match[0].length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        const after = document.createTextNode(text.substring(lastIndex));
        fragment.appendChild(after);
        if (holdsCaret) {
          placeCaret(after, caretOffset - lastIndex);
        }
      }

      const lastChild = fragment.lastChild;
      node.parentNode?.replaceChild(fragment, node);

      if (holdsCaret && selection) {
        const range = document.createRange();
        if (restoreIn) {
          range.setStart(restoreIn, restoreOffset);
        } else if (restoreAfter) {
          range.setStartAfter(restoreAfter);
        } else if (lastChild) {
          range.setStartAfter(lastChild);
        } else {
          return;
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  /**
   * Insert a variable at cursor position
   */
  const insertVariable = (editor: HTMLElement | null, variableName: string) => {
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = createVariableSpan(variableName);

    // Insert variable
    range.deleteContents();
    range.insertNode(span);

    // Add space after variable
    const space = document.createTextNode("\u00A0");
    range.setStartAfter(span);
    range.insertNode(space);
    range.setStartAfter(space);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  /**
   * Detect if cursor is inside variable syntax {{ }}
   */
  const detectVariableAtCursor = (
    editor: HTMLElement | null
  ): {
    isInVariable: boolean;
    variableName: string;
    query: string;
  } | null => {
    if (!editor) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent || "";
    const cursorPos = range.startOffset;

    // Find {{ before cursor
    const textBefore = text.substring(0, cursorPos);
    const lastOpenBrace = textBefore.lastIndexOf("{{");

    if (lastOpenBrace === -1) return null;

    // Check if we're inside {{ }}
    const prevCloseBrace = textBefore.lastIndexOf("}}");
    if (prevCloseBrace > lastOpenBrace) return null;

    // Extract variable name/query
    const query = textBefore.substring(lastOpenBrace + 2).trim();

    return {
      isInVariable: true,
      variableName: query,
      query: query,
    };
  };

  return {
    variables: computed(() => variables.value),
    categories: computed(() => categories.value),
    getVariablesByCategory,
    getVariable,
    addVariable,
    updateVariableValue,
    removeVariable,
    searchVariables,
    parseVariables,
    replaceVariables,
    wrapVariablesInContent,
    insertVariable,
    detectVariableAtCursor,
  };
}
