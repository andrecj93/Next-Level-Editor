import { ref, computed, watch, isRef, type Ref } from "vue";

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
export interface UseVariablesOptions {
  /**
   * The host application's variable set. Supplying it REPLACES the built-in
   * demo fixtures — a real app must not ship "John Doe" in its picker — and the
   * editor's panel, `{{` autocomplete and value substitution all use it.
   *
   * Accepts a plain array or a ref: a ref is tracked, so updating the host's
   * list (or a value inside it) flows straight through to the editor.
   *
   * Omit it and the built-in demo set is kept, so the demo and every existing
   * consumer are unaffected.
   *
   * This closes the gap between README.md's "Custom variables — add your own
   * variables programmatically" and what the package could actually do: the
   * editor called useVariables() itself, and each call built a brand-new list,
   * so a host calling useVariables() mutated an object nothing rendered.
   * #R23-46
   */
  variables?: Variable[] | Ref<Variable[] | undefined>;
}

export function useVariables(options: UseVariablesOptions = {}) {
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

  // A host-supplied set REPLACES the demo fixtures above. Synced INTO the ref
  // rather than exposed as a computed over the option, so addVariable /
  // updateVariableValue / removeVariable keep working on top of the host's set
  // instead of silently becoming no-ops — which would be the same class of bug
  // this option exists to fix. An explicit empty array is honoured (the host
  // wants no variables); `undefined` leaves the built-ins alone. #R23-46
  // Ids the HOST explicitly supplied (their values are authoritative — see
  // resolveVariableValue #R24-14) and ids added locally through addVariable
  // (which must survive host re-syncs #R24-15).
  let hostSuppliedIds = new Set<string>();
  const locallyAddedIds = new Set<string>();

  if (options.variables) {
    const source = options.variables;
    const readHostVariables = (): Variable[] | undefined =>
      isRef(source) ? source.value : source;
    watch(
      readHostVariables,
      (hostVariables) => {
        if (!hostVariables) return;
        hostSuppliedIds = new Set(hostVariables.map((v) => v.id));
        // Clone each item: sharing references let updateVariableValue write
        // into the HOST application's own objects, and every such mutation
        // re-fired this deep watcher on its own echo. #R24-15
        const next = hostVariables.map((v) => ({ ...v }));
        // The mutators are documented to keep working on top of the host's
        // set — a host tweaking one value must not erase local additions.
        for (const existing of variables.value) {
          if (
            locallyAddedIds.has(existing.id) &&
            !hostSuppliedIds.has(existing.id)
          ) {
            next.push(existing);
          }
        }
        variables.value = next;
      },
      { immediate: true, deep: true }
    );
  }

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
      // Survives host re-syncs — see the host watcher. #R24-15
      locallyAddedIds.add(variable.id);
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
   * Live resolvers for time-sensitive built-in variables. Their static `value`
   * was computed once when the composable mounted, so an editor left open (or
   * mounted early) inserted a stale time / yesterday's date. Resolving lazily
   * at insertion / substitution time keeps them current.
   */
  const DYNAMIC_VALUE_RESOLVERS: Record<string, () => string> = {
    "date.today": () => new Date().toLocaleDateString(),
    "date.now": () => new Date().toLocaleTimeString(),
    "date.year": () => new Date().getFullYear().toString(),
    "date.month": () => new Date().toLocaleDateString("en", { month: "long" }),
  };

  const resolveVariableValue = (variable: Variable | undefined): string => {
    if (!variable) return "";
    // A host-supplied variable's explicit value is authoritative: the host
    // set REPLACES the built-ins, liveness included. A host pinning
    // { id: "date.today", value: "15/01/2026" } (an as-of date, or their own
    // locale format) gets exactly that; only ids the host did NOT supply keep
    // the built-in live resolvers. #R24-14
    if (hostSuppliedIds.has(variable.id)) return variable.value;
    const dynamic = DYNAMIC_VALUE_RESOLVERS[variable.id];
    return dynamic ? dynamic() : variable.value;
  };

  /**
   * Replace variables in text with their values
   */
  const replaceVariables = (text: string): string => {
    return text.replace(
      /\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g,
      (match, varName) => {
        const token = varName.trim();
        // Name first, id second — id tokens come from ambiguous unwraps. #R27-1
        const variable =
          getVariable(token) ?? variables.value.find((v) => v.id === token);
        return variable ? resolveVariableValue(variable) : match;
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
  /**
   * The "{{ name }}" label lives in a dedicated child, not as the pill's bare
   * text: print CSS hides THIS node (display: none) so the pill keeps the
   * ambient font size and ::after — which inherits from the pill — injects the
   * value at the size of the words around it. Hiding the token with
   * `font-size: 0` on the pill instead zeroed the ::after too, and printed
   * documents lost every variable value (measured with page.pdf()). #R24-1
   */
  const buildTokenChild = (
    doc: Document,
    variableName: string
  ): HTMLSpanElement => {
    const token = doc.createElement("span");
    token.className = "variable-token";
    token.textContent = `{{ ${variableName} }}`;
    return token;
  };

  const createVariableSpan = (
    variableName: string,
    exact?: Variable
  ): HTMLSpanElement => {
    // `exact` pins the SPECIFIC variable when display names collide —
    // getVariable() finds first-by-name, so clicking the second of two rows
    // sharing a name previewed its value but stamped the first's. #R24-20
    // Ids resolve too: an unwrapped ambiguous pill re-materializes as an ID
    // token ({{ company.email }}), and re-freezing it must find the pinned
    // variable, not fail the name lookup. #R27-1
    const variable =
      exact ??
      getVariable(variableName) ??
      variables.value.find((v) => v.id === variableName);
    const span = document.createElement("span");
    span.className = "editor-variable";
    span.contentEditable = "false";
    span.dataset.variable = variableName;
    // Persist the resolved IDENTITY too: refreshes (beforeprint/export)
    // re-resolve every pill, and by NAME alone they would clobber a pinned
    // duplicate-name row again on the very next print. #R25-1
    if (variable) span.dataset.variableId = variable.id;
    span.dataset.value = resolveVariableValue(variable);
    span.appendChild(buildTokenChild(document, variableName));
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
      // Never interpolate inside code — a documented template-language sample
      // (e.g. `{{ user.name }}` in a Handlebars/Vue snippet) must stay verbatim
      // and editable, not be eaten into a contenteditable=false pill.
      if (node.parentElement?.closest("pre, code")) continue;
      const text = node.textContent || "";
      const matches = parseVariables(text).filter((match) => {
        // Never swallow a token the caret is STRICTLY INSIDE: that is a user
        // mid-edit (after an unwrap, or arrowing into the text), and wrapping
        // it would freeze the token under their fingers and eject the caret —
        // the R23-63 freeze. Caret AT the end still wraps: that is exactly
        // the state right after typing the closing "}}".
        if (node !== caretNode) return true;
        const matchIndex = match.index ?? 0;
        const matchEnd = matchIndex + match[0].length;
        return !(caretOffset > matchIndex && caretOffset < matchEnd);
      });
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
  /**
   * Backspace immediately after a pill UNWRAPS it back to its literal token
   * text with the caret at the end, ready to edit (Notion-style) — the only
   * way to EDIT a token once it froze into a contenteditable=false pill.
   * Returns true when handled (caller stops the pipeline). The caller must
   * sync the model WITHOUT dispatching an input event: the wrap pass would
   * see a complete token with the caret at its end and re-freeze it
   * instantly. #R23-63
   */
  const unwrapPillBeforeCaret = (
    editor: HTMLElement | null,
    event: KeyboardEvent
  ): boolean => {
    if (!editor) return false;
    if (
      event.key !== "Backspace" ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return false;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    // The node immediately BEFORE the caret. Empty text nodes (splitText
    // residue after heavy editing) are stepped over — declining on them made
    // the same gesture sometimes unwrap and sometimes hard-delete. #R27-3
    const { startContainer, startOffset } = range;
    let candidate: Node | null = null;
    if (startContainer.nodeType === Node.TEXT_NODE) {
      if (startOffset !== 0) return false;
      candidate = startContainer.previousSibling;
    } else {
      candidate = startContainer.childNodes[startOffset - 1] ?? null;
    }
    while (
      candidate &&
      candidate.nodeType === Node.TEXT_NODE &&
      candidate.textContent === ""
    ) {
      candidate = candidate.previousSibling;
    }
    if (
      !(candidate instanceof HTMLElement) ||
      !candidate.classList.contains("editor-variable") ||
      !editor.contains(candidate)
    ) {
      return false;
    }
    const name = candidate.dataset.variable;
    if (!name) return false;

    // Identity survives the text round-trip: plain text cannot carry the
    // data-variable-id pin, so when resolving the NAME would diverge from the
    // pin (duplicate display names), the token is the ID — which the wrap and
    // substitute paths also resolve. Rebinding first-by-name on re-wrap was
    // the R24-20 clobber reopened by a single keypress. #R27-1
    const pinnedId = candidate.dataset.variableId;
    const token =
      pinnedId && getVariable(name)?.id !== pinnedId ? pinnedId : name;
    // Never produce a token the wrap pass cannot re-freeze: host names are
    // unconstrained, the token grammar is not — unwrapping "nome completo"
    // would leave dead text that LOOKS like a live token. The pre-existing
    // atomic delete is the honest behavior there. #R27-2
    if (!/^[a-zA-Z0-9._-]{1,64}$/.test(token)) return false;

    event.preventDefault();
    const textNode = document.createTextNode(`{{ ${token} }}`);
    candidate.replaceWith(textNode);
    const caretRange = document.createRange();
    caretRange.setStart(textNode, textNode.textContent?.length ?? 0);
    caretRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caretRange);
    return true;
  };

  const insertVariable = (
    editor: HTMLElement | null,
    variableName: string,
    exact?: Variable
  ) => {
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = createVariableSpan(variableName, exact);

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

    // Never trigger the variable autocomplete inside code — typing a mustache
    // example ("{{ user.name }}") in a <pre>/<code> block is documentation,
    // not a variable. Mirrors the wrap guard in wrapVariablesInContent.
    const codeAncestor = node.parentElement?.closest("pre, code");
    if (codeAncestor && editor.contains(codeAncestor)) return null;

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

  /**
   * Refresh every pill's data-value to its CURRENT resolved value. The print CSS
   * shows `content: attr(data-value)`, but data-value is stamped once at
   * insertion — so a time-based variable (or one changed since it was inserted)
   * printed a STALE value, and a pill inserted with an empty data-value printed
   * BLANK. Call this before printing so the printed values are current. #17
   */
  /**
   * Resolve which variable a pill MEANS and stamp its current value.
   *
   * Identity first (data-variable-id), name as the legacy fallback — a
   * name-only lookup finds first-by-name and clobbered a pinned
   * duplicate-name row on every refresh (#R25-1); the resolved id is stamped
   * back so legacy pills gain the pin on their first refresh.
   *
   * Value semantics (#R25-2): a variable that RESOLVES keeps its value even
   * when that value is legitimately empty — the panel previews "" and the
   * printed document must agree. Only a variable that no longer resolves at
   * all (deleted/renamed) falls back to the visible token, so the reader
   * sees what was there instead of NOTHING. #r15-36
   */
  const restampPill = (pill: HTMLElement): void => {
    const name = pill.dataset.variable;
    if (!name) return;
    const id = pill.dataset.variableId;
    if (id) {
      // A pinned pill NEVER falls back by name: with duplicate display names,
      // a transient absence of the pinned variable (host filtering/loading)
      // would let one refresh durably rebind the pill to the same-name
      // sibling — the exact clobber the pin exists to prevent. While absent
      // it renders its token and re-resolves when the variable returns. #R26-5
      const byId = variables.value.find((v) => v.id === id);
      pill.dataset.value = byId
        ? resolveVariableValue(byId)
        : `{{ ${name} }}`;
      return;
    }
    // Legacy name-only pill: resolve first-by-name and pin the identity so
    // every later refresh is stable. #R25-1
    const variable = getVariable(name);
    if (variable) {
      pill.dataset.variableId = variable.id;
      pill.dataset.value = resolveVariableValue(variable);
    } else {
      pill.dataset.value = `{{ ${name} }}`;
    }
  };

  const refreshVariablePills = (editor: HTMLElement | null) => {
    if (!editor) return;
    editor
      .querySelectorAll<HTMLElement>(".editor-variable")
      .forEach((pill) => {
        const name = pill.dataset.variable;
        if (!name) return;
        restampPill(pill);
        // Normalize pills from documents authored before the token wrapper
        // existed: this runs on beforeprint, so by the time the print engine
        // reads the DOM every pill has the child the print CSS hides. #R24-1
        if (!pill.querySelector(".variable-token")) {
          pill.textContent = "";
          pill.appendChild(buildTokenChild(pill.ownerDocument, name));
        }
      });
  };

  /**
   * The string counterpart of refreshVariablePills, for exports: re-stamp
   * every pill's data-value from the live registry so the exported document
   * carries CURRENT values — exactly what the beforeprint hook does for
   * printing. String-based because in Preview view mode no editable surface
   * is mounted and the document only exists as HTML. Inert parse: the string
   * can be host-supplied, and a live parse would start loading its <img>s. #R24-3
   */
  const refreshVariableValuesInHtml = (html: string): string => {
    if (typeof document === "undefined" || !html.includes("editor-variable")) {
      return html;
    }
    const inert = document.implementation.createHTMLDocument("");
    const holder = inert.createElement("div");
    holder.innerHTML = html;
    holder
      .querySelectorAll<HTMLElement>(".editor-variable")
      .forEach(restampPill);
    return holder.innerHTML;
  };

  return {
    variables: computed(() => variables.value),
    // Exported so UI that PREVIEWS a value (the variables panel) resolves it
    // the same way inserting does. Reading `variable.value` showed the string
    // computed once at mount, so the panel advertised a stale clock — or, past
    // midnight, yesterday's date — and then inserted something else. #R23-65
    resolveVariableValue,
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
    unwrapPillBeforeCaret,
    detectVariableAtCursor,
    refreshVariablePills,
    refreshVariableValuesInHtml,
  };
}
