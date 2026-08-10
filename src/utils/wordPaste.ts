/**
 * Reconstruct Word / Google-Docs pasted lists.
 *
 * Word (and some Google-Docs) paste bulleted/numbered lists NOT as <ul>/<li>
 * but as runs of styled `<p style="mso-list:l0 level2 lfo1">` paragraphs whose
 * bullet-or-number glyph lives in a `<span style="mso-list:Ignore">` marker.
 * The sanitizer then strips those styles, leaving flat paragraphs with literal
 * bullet glyphs. Running this on the raw clipboard HTML BEFORE sanitization
 * rebuilds real lists:
 * - NESTING is reconstructed from the `levelN` token (#r15-10);
 * - a run switching marker kind (bullet ↔ number) splits into sibling lists of
 *   the right type (#r15-26);
 * - roman/alpha markers ("iv.", "(a)") classify as ordered (#r15-27);
 * - runs are found under EVERY container (table cells, WordSection wrappers),
 *   not just at the top level (#r15-11).
 */

const P_LIST_LEVEL = /mso-list\s*:\s*l\d/i;
const MARKER_IGNORE = /mso-list\s*:\s*ignore/i;

interface WordListItem {
  p: HTMLElement;
  level: number;
  ordered: boolean;
}

const isWordListParagraph = (node: Node): node is HTMLElement =>
  node.nodeType === Node.ELEMENT_NODE &&
  (node as HTMLElement).tagName === "P" &&
  P_LIST_LEVEL.test((node as HTMLElement).getAttribute("style") || "");

const isWhitespaceText = (node: Node): boolean =>
  node.nodeType === Node.TEXT_NODE && !(node.textContent || "").trim();

/** The `<span mso-list:Ignore>` holding the bullet/number, if any. */
const findMarkerSpan = (p: HTMLElement): HTMLElement | null =>
  Array.from(p.querySelectorAll("span")).find((s) =>
    MARKER_IGNORE.test(s.getAttribute("style") || "")
  ) ?? null;

/** The Word outline level from `levelN` in the paragraph's style (1-based). */
const levelOf = (p: HTMLElement): number => {
  const match = /level(\d+)/i.exec(p.getAttribute("style") || "");
  const level = match ? parseInt(match[1], 10) : 1;
  return Number.isFinite(level) && level >= 1 ? level : 1;
};

/**
 * Ordered when the marker is numeric ("1.", "12)"), alphabetic ("a.", "(B)"),
 * or roman ("iv.", "III)") — Word's bullet glyphs (·, o, §, ▪) are none of
 * these. #r15-27
 */
const isOrderedMarker = (marker: string): boolean => {
  const m = marker.trim().replace(/^\(/, "");
  if (/^\d+[.)]/.test(m)) return true;
  if (/^[ivxlcdm]+[.)]/i.test(m)) return true; // roman (covers single letters too)
  return /^[a-z][.)]/i.test(m);
};

/** Drop leading whitespace/NBSP the removed marker left behind. */
const trimLeadingWhitespace = (li: HTMLElement): void => {
  while (li.firstChild && li.firstChild.nodeType === Node.TEXT_NODE) {
    // JS \s already matches NBSP (U+00A0), which Word inserts after the marker.
    const stripped = (li.firstChild.textContent || "").replace(/^\s+/, "");
    if (stripped === "") {
      li.firstChild.remove();
      continue;
    }
    li.firstChild.textContent = stripped;
    break;
  }
};

/** Convert one Word paragraph into a clean <li>. */
const makeListItem = (p: HTMLElement): HTMLElement => {
  // `p.ownerDocument`, never the global `document`: every node here must stay
  // in the inert parsing document (see reconstructWordLists). #R23-8
  const li = p.ownerDocument.createElement("li");
  findMarkerSpan(p)?.remove();
  while (p.firstChild) li.appendChild(p.firstChild);
  trimLeadingWhitespace(li);
  return li;
};

/**
 * Build the list tree for one run of Word list paragraphs. Returns the ROOT
 * lists (plural: a top-level marker-kind switch opens a sibling list).
 */
const buildListsFromRun = (items: WordListItem[]): HTMLElement[] => {
  const roots: HTMLElement[] = [];
  const stack: Array<{ list: HTMLElement; level: number }> = [];
  // Build in the paragraphs' own (inert) document, not the live one. #R23-8
  const doc = items[0]?.p.ownerDocument ?? document;
  const mk = (ordered: boolean) => doc.createElement(ordered ? "ol" : "ul");

  for (const item of items) {
    while (stack.length > 0 && stack[stack.length - 1].level > item.level) {
      stack.pop();
    }

    let top = stack[stack.length - 1];

    if (top && top.level < item.level) {
      // Deeper level → nest a new list inside the previous item; with no host
      // item yet (degenerate first-item-deep), clamp to the current level.
      const host = top.list.lastElementChild;
      if (host && host.tagName === "LI") {
        const nested = mk(item.ordered);
        host.appendChild(nested);
        stack.push({ list: nested, level: item.level });
        top = stack[stack.length - 1];
      } else {
        item.level = top.level;
      }
    }

    if (!top) {
      const list = mk(item.ordered);
      roots.push(list);
      stack.push({ list, level: item.level });
      top = stack[stack.length - 1];
    } else if (
      top.level === item.level &&
      top.list.tagName !== (item.ordered ? "OL" : "UL")
    ) {
      // Same level, different marker KIND → sibling list of the right type,
      // at the root or inside the same parent item. #r15-26
      stack.pop();
      const list = mk(item.ordered);
      const parent = stack[stack.length - 1];
      const host = parent?.list.lastElementChild;
      if (parent && host && host.tagName === "LI") {
        host.appendChild(list);
      } else {
        roots.push(list);
      }
      stack.push({ list, level: item.level });
      top = stack[stack.length - 1];
    }

    top.list.appendChild(makeListItem(item.p));
  }

  return roots;
};

/** Rebuild every Word list run among `parent`'s direct children. */
const convertRunsIn = (parent: Node): void => {
  const nodes = Array.from(parent.childNodes);
  let i = 0;
  while (i < nodes.length) {
    if (!isWordListParagraph(nodes[i])) {
      i++;
      continue;
    }

    // Gather a run of list paragraphs, tolerating whitespace text nodes
    // between them but stopping at the first real non-list node.
    const items: WordListItem[] = [];
    const extras: ChildNode[] = [];
    let j = i;
    while (j < nodes.length) {
      const n = nodes[j];
      if (isWordListParagraph(n)) {
        items.push({
          p: n,
          level: levelOf(n),
          ordered: isOrderedMarker(findMarkerSpan(n)?.textContent || ""),
        });
        j++;
      } else if (isWhitespaceText(n)) {
        extras.push(n as ChildNode);
        j++;
      } else {
        break;
      }
    }

    const anchor = items[0].p;
    const roots = buildListsFromRun(items);
    // makeListItem drained every <p>; swap the first for the built lists and
    // drop the leftover husks + whitespace.
    anchor.replaceWith(...roots);
    items.slice(1).forEach((item) => item.p.remove());
    extras.forEach((n) => n.remove());

    i = j;
  }
};

export function reconstructWordLists(html: string): string {
  // Fast path: nothing that looks like a Word list — return the input verbatim.
  if (!/mso-list/i.test(html)) return html;

  // Parse in an INERT document. This runs before the sanitizer by design (it
  // needs Word's markup intact), so the raw clipboard string is still hostile
  // here — and parsing it into the live document starts loading every <img>,
  // firing `onerror` handlers in the host application's origin before the
  // sanitizer ever sees them. A document from createHTMLDocument has no
  // browsing context, so nothing fetches and no handler runs. Every node below
  // is created from this document too, so nothing is ever adopted back into
  // the live one. #R23-8
  const inert = document.implementation.createHTMLDocument("");
  const temp = inert.createElement("div");
  temp.innerHTML = html;

  // Runs live under EVERY container Word emits (top level, WordSection divs,
  // table cells) — collect each distinct parent of a Word list paragraph and
  // convert its runs. #r15-11
  const parents = new Set<Node>([temp]);
  temp.querySelectorAll("p").forEach((p) => {
    if (isWordListParagraph(p) && p.parentNode) parents.add(p.parentNode);
  });
  parents.forEach(convertRunsIn);

  return temp.innerHTML;
}
