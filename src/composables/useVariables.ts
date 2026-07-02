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

  // Variable categories
  const categories = ref<VariableCategory[]>([
    { id: "user", name: "User", icon: "👤" },
    { id: "date", name: "Date & Time", icon: "📅" },
    { id: "document", name: "Document", icon: "📄" },
    { id: "company", name: "Company", icon: "🏢" },
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
   * Wrap variable spans in the editor content
   * This transforms {{ varName }} into styled spans
   */
  const wrapVariablesInContent = (editor: HTMLElement | null) => {
    if (!editor) return;

    // The text node that currently holds the caret must not be rewritten:
    // replacing it with a fragment destroys the node under the cursor and jumps
    // the caret to the start of the editor while the user is still typing the
    // variable. It gets wrapped on a later pass once the caret moves away.
    const selection = globalThis.getSelection?.();
    const caretNode =
      selection && selection.rangeCount > 0 ? selection.anchorNode : null;

    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );

    const nodesToReplace: { node: Node; matches: RegExpMatchArray[] }[] = [];

    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node === caretNode) continue;
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
      let lastIndex = 0;

      matches.forEach((match) => {
        const matchIndex = match.index!;
        const varName = match[1].trim();
        const variable = getVariable(varName);

        // Add text before variable
        if (matchIndex > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, matchIndex))
          );
        }

        // Create variable span
        const span = document.createElement("span");
        span.className = "editor-variable";
        span.contentEditable = "false";
        span.dataset.variable = varName;
        span.dataset.value = variable?.value || "";
        span.textContent = `{{ ${varName} }}`;

        // Add tooltip
        if (variable?.description) {
          span.title = variable.description;
        }

        fragment.appendChild(span);
        lastIndex = matchIndex + match[0].length;
      });

      // Add remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex))
        );
      }

      node.parentNode?.replaceChild(fragment, node);
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
    const variable = getVariable(variableName);

    // Create variable span
    const span = document.createElement("span");
    span.className = "editor-variable";
    span.contentEditable = "false";
    span.dataset.variable = variableName;
    span.dataset.value = variable?.value || "";
    span.textContent = `{{ ${variableName} }}`;

    if (variable?.description) {
      span.title = variable.description;
    }

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
