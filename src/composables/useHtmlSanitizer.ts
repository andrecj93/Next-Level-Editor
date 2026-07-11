import { buildEmbedContainerStyle } from "../utils/embeddedResizable";

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "U",
  "UL",
  "TABLE",
  "CAPTION",
  "COLGROUP",
  "COL",
  "THEAD",
  "TBODY",
  "TR",
  "TH",
  "TD",
  // Media inside embedded-resizable containers. IFRAME src is additionally
  // restricted to the embed-host allowlist below.
  "VIDEO",
  "IFRAME",
]);

const GLOBAL_ALLOWED_ATTRIBUTES = new Set(["title"]);
// Semantic containers commonly found in pasted content (figures, sectioning
// elements, description lists). They are not part of the editor's document
// model, so they are unwrapped — children survive and are still recursively
// sanitized — rather than removed with their subtree.
const UNWRAP_TAGS = new Set([
  "DIV",
  "FIGURE",
  "FIGCAPTION",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "MAIN",
  "ASIDE",
  "NAV",
  "DL",
  "DT",
  "DD",
]);

// The editor's media wrapper (created by utils/embeddedResizable.ts). Kept as
// a special-cased DIV: its attributes are rebuilt from validated data-* values
// rather than trusted. The transient corner resize handles must never persist.
const EMBED_CONTAINER_CLASS = "embedded-resizable-container";
const RESIZE_HANDLE_CLASS = "embed-resize-handle";

// Page break (utils/pageManagement.ts) — a fixed, content-free presentational
// block: `<div class="page-break" contenteditable="false">` with a label span
// and a rule. Without a special case it would hit the generic DIV-unwrap path
// and be destroyed on every v-model round-trip, silently losing page breaks
// from persisted documents. Rebuilt from scratch (never trust attributes).
const PAGE_BREAK_CLASS = "page-break";
// Table of contents (utils/pageManagement.ts) — `<nav class="table-of-contents">`
// wrapping generated heading links. NAV is otherwise in UNWRAP_TAGS, so without
// this the semantic wrapper (and its styling + update/detection hooks) would be
// stripped on round-trip. The nav is preserved; its children sanitize normally.
const TOC_CLASS = "table-of-contents";
const EMBED_TYPES = new Set(["image", "video", "embed", "file"]);
const EMBED_ALIGNMENTS = new Set(["left", "center", "right"]);

// Only these iframe sources may survive sanitization (YouTube/Vimeo embeds as
// produced by utils/embed.ts).
const SAFE_EMBED_IFRAME_PATTERN =
  /^https:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+|^https:\/\/player\.vimeo\.com\/video\/\d+/i;

// The inline template-variable pill (created by useVariables). Like the embed
// container above it is a special-cased element: a SPAN whose class is exactly
// "editor-variable" has its attribute set REBUILT from a validated
// data-variable value rather than trusted, and its visible text is regenerated
// from that validated name. Anything that fails validation falls back to the
// generic span path (class and unknown attributes stripped).
const VARIABLE_PILL_CLASS = "editor-variable";
const VARIABLE_NAME_PATTERN = /^[\w.-]{1,64}$/;

const ELEMENT_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target", "title"]),
  img: new Set(["alt", "src", "title", "width", "height", "style"]),
  table: new Set(["border", "cellpadding", "cellspacing", "style"]),
  colgroup: new Set(["span", "style"]),
  col: new Set(["span", "style"]),
  td: new Set(["colspan", "rowspan", "style"]),
  th: new Set(["colspan", "rowspan", "style"]),
  span: new Set(["style"]),
  p: new Set(["style"]),
  h1: new Set(["style"]),
  h2: new Set(["style"]),
  h3: new Set(["style"]),
  h4: new Set(["style"]),
  h5: new Set(["style"]),
  h6: new Set(["style"]),
  li: new Set(["style"]),
  ul: new Set(["style"]),
  ol: new Set(["style"]),
  blockquote: new Set(["style"]),
  video: new Set(["src", "controls", "style", "width", "height"]),
  iframe: new Set([
    "src",
    "width",
    "height",
    "frameborder",
    "allow",
    "allowfullscreen",
    "title",
    "style",
  ]),
};

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto|tel):|\/\/|\/|#)/i;
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:[a-z0-9.+-]+);base64,/i;

const STYLE_ALLOWED_PROPERTIES = new Set([
  "text-align",
  "color",
  "background-color",
  "font-size",
  // Highlight pills (applyBackgroundColor) round-trip padding/border-radius.
  "padding",
  "border-radius",
  // Safe sizing properties used by media inside embed containers.
  "width",
  "height",
  "object-fit",
  "display",
  // Table-of-contents list items indent nested headings via margin-left; a
  // plain length value is layout-only and carries no script surface.
  "margin-left",
]);
const UNSAFE_STYLE_VALUE_PATTERN = /url\(|expression\(|javascript:|[<>]/i;

/**
 * Reduce a raw style attribute to a small allowlist of safe CSS declarations.
 * Any property outside STYLE_ALLOWED_PROPERTIES, or any value containing a
 * dangerous token (url(), expression(), javascript:, angle brackets), is dropped.
 * Returns the sanitized style string (declarations joined by "; ") or "" when
 * nothing safe remains.
 */
const sanitizeStyleValue = (styleValue: string): string => {
  const safeDeclarations: string[] = [];
  for (const declaration of styleValue.split(";")) {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex === -1) continue;

    const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
    const value = declaration.slice(separatorIndex + 1).trim();
    if (!property || !value) continue;
    if (!STYLE_ALLOWED_PROPERTIES.has(property)) continue;
    if (UNSAFE_STYLE_VALUE_PATTERN.test(value)) continue;

    safeDeclarations.push(`${property}: ${value}`);
  }
  return safeDeclarations.join("; ");
};

/**
 * Composable for HTML sanitization in the editor
 * Provides secure HTML cleaning and validation
 */
export function useHtmlSanitizer() {
  const sanitizeHtml = (input: string | null = ""): string => {
    const value = input ?? "";
    if (!value.trim()) return "";
    if (globalThis.window === undefined || document === undefined) return value;

    const workingDocument =
      document.implementation.createHTMLDocument("sanitizer");
    workingDocument.body.innerHTML = value;

    const sanitizeTree = (root: HTMLElement) => {
      let child: ChildNode | null = root.firstChild;
      while (child) {
        const next = child.nextSibling;
        if (child.nodeType === Node.ELEMENT_NODE) {
          const element = child as HTMLElement;
          if (element.tagName === "DIV") {
            if (element.classList.contains(RESIZE_HANDLE_CLASS)) {
              // Transient resize-handle UI must never persist into content.
              element.remove();
            } else if (element.classList.contains(EMBED_CONTAINER_CLASS)) {
              // Media wrapper: rebuild its attributes from validated data-*
              // values instead of trusting them, then sanitize its children.
              if (sanitizeEmbedContainer(element)) {
                sanitizeTree(element);
              } else {
                child = element.firstChild ?? next;
                unwrapElement(element);
                continue;
              }
            } else if (element.classList.contains(PAGE_BREAK_CLASS)) {
              // Fixed, content-free block: regenerate its known-safe structure
              // from scratch so a persisted page break survives round-trips.
              rebuildPageBreak(element);
            } else {
              // Unwrapping splices the children in BEFORE the saved `next`;
              // resume iteration from the first spliced child so they are
              // sanitized too instead of being skipped.
              child = element.firstChild ?? next;
              unwrapElement(element);
              continue;
            }
          } else if (
            element.tagName === "IFRAME" &&
            !SAFE_EMBED_IFRAME_PATTERN.test(
              element.getAttribute("src")?.trim() ?? ""
            )
          ) {
            // Iframes are only allowed from the embed-host allowlist; an
            // iframe without a safe src is useless and gets removed whole.
            element.remove();
          } else if (
            element.tagName === "NAV" &&
            element.classList.contains(TOC_CLASS)
          ) {
            // Table of contents wrapper: keep the nav, force the known class,
            // drop every other (untrusted) attribute, and sanitize its
            // generated heading links normally.
            for (const attribute of Array.from(element.attributes)) {
              element.removeAttribute(attribute.name);
            }
            element.setAttribute("class", TOC_CLASS);
            sanitizeTree(element);
          } else if (
            element.tagName === "SPAN" &&
            (element.getAttribute("class") ?? "").trim() ===
              VARIABLE_PILL_CLASS
          ) {
            if (!sanitizeVariablePill(element)) {
              // Invalid or missing data-variable: not a real pill. Fall back
              // to the generic span path, which strips the class and every
              // other spoofed attribute but keeps the (sanitized) children.
              sanitizeAttributes(element);
              sanitizeTree(element);
            }
          } else if (ALLOWED_TAGS.has(element.tagName)) {
            sanitizeAttributes(element);
            sanitizeTree(element);
          } else if (UNWRAP_TAGS.has(element.tagName)) {
            child = element.firstChild ?? next;
            unwrapElement(element);
            continue;
          } else {
            element.remove();
          }
        }
        child = next;
      }
    };

    /**
     * Normalize an embedded-resizable media container: validate its data-*
     * payload, drop every attribute, and rebuild the trusted set (including a
     * deterministic style regenerated from the validated size/alignment).
     * Returns false when the container is not salvageable (unknown type).
     */
    const sanitizeEmbedContainer = (element: HTMLElement): boolean => {
      const type = (element.getAttribute("data-type") ?? "").toLowerCase();
      if (!EMBED_TYPES.has(type)) return false;

      const parseSize = (raw: string | null, fallback: number): number => {
        const parsed = Number.parseInt(raw ?? "", 10);
        if (Number.isNaN(parsed)) return fallback;
        return Math.min(2000, Math.max(50, parsed));
      };
      const width = parseSize(element.getAttribute("data-width"), 400);
      const height = parseSize(element.getAttribute("data-height"), 300);

      const alignmentRaw = (
        element.getAttribute("data-alignment") ?? "center"
      ).toLowerCase();
      const alignment = (
        EMBED_ALIGNMENTS.has(alignmentRaw) ? alignmentRaw : "center"
      ) as "left" | "center" | "right";
      const maintainAspect =
        element.getAttribute("data-maintain-aspect") === "true";

      const srcRaw = (element.getAttribute("data-src") ?? "").trim();
      const src =
        srcRaw &&
        (SAFE_URL_PATTERN.test(srcRaw) || SAFE_DATA_IMAGE_PATTERN.test(srcRaw))
          ? srcRaw
          : "";

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      element.setAttribute("class", EMBED_CONTAINER_CLASS);
      element.setAttribute("data-type", type);
      element.setAttribute("data-src", src);
      element.setAttribute("data-width", String(width));
      element.setAttribute("data-height", String(height));
      element.setAttribute("data-maintain-aspect", String(maintainAspect));
      element.setAttribute("data-alignment", alignment);
      element.setAttribute(
        "style",
        buildEmbedContainerStyle(width, height, alignment)
      );
      element.setAttribute("contenteditable", "false");
      element.setAttribute("tabindex", "0");
      return true;
    };

    /**
     * Rebuild a page-break block from scratch. The element carries no user
     * content — only a fixed label and rule — so every attribute is dropped
     * and the known-safe structure is regenerated deterministically.
     */
    const rebuildPageBreak = (element: HTMLElement) => {
      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      element.setAttribute("class", PAGE_BREAK_CLASS);
      element.setAttribute("contenteditable", "false");
      element.innerHTML =
        '<span class="page-break-label">Page Break</span><hr class="page-break-line" />';
    };

    /**
     * Normalize a template-variable pill: validate its data-variable name,
     * drop every attribute, and rebuild the trusted set. The pill's visible
     * text is regenerated from the validated name so no markup can hide
     * inside the span. Returns false when data-variable does not validate.
     *
     * NOTE: the attribute rebuild order (class, contenteditable,
     * data-variable, data-value, title) mirrors the pill construction in
     * useVariables so a sanitize round-trip of a freshly built pill is
     * string-identical — innerHTML string comparisons decide whether the
     * editor DOM gets rewritten (destroying the caret), so keep them in sync.
     */
    const sanitizeVariablePill = (element: HTMLElement): boolean => {
      const name = element.getAttribute("data-variable") ?? "";
      if (!VARIABLE_NAME_PATTERN.test(name)) return false;

      const value = element.getAttribute("data-value");
      const title = element.getAttribute("title");

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      element.setAttribute("class", VARIABLE_PILL_CLASS);
      element.setAttribute("contenteditable", "false");
      element.setAttribute("data-variable", name);
      if (value !== null) element.setAttribute("data-value", value);
      if (title !== null) element.setAttribute("title", title);
      element.textContent = `{{ ${name} }}`;
      return true;
    };

    const isAttributeAllowed = (
      attributeName: string,
      elementTag: string
    ): boolean => {
      const allowed = new Set(GLOBAL_ALLOWED_ATTRIBUTES);
      const elementSpecific =
        ELEMENT_ALLOWED_ATTRIBUTES[elementTag.toLowerCase()];
      if (elementSpecific) {
        for (const attr of elementSpecific) {
          allowed.add(attr);
        }
      }
      return allowed.has(attributeName);
    };

    const validateAttributeValue = (
      element: HTMLElement,
      attributeName: string,
      attributeValue: string
    ): boolean => {
      if (attributeName === "href") {
        return SAFE_URL_PATTERN.test(attributeValue);
      }
      if (attributeName === "src") {
        if (element.tagName === "IFRAME") {
          return SAFE_EMBED_IFRAME_PATTERN.test(attributeValue);
        }
        return (
          SAFE_URL_PATTERN.test(attributeValue) ||
          SAFE_DATA_IMAGE_PATTERN.test(attributeValue)
        );
      }
      if (attributeName === "target") {
        if (attributeValue !== "_blank" && attributeValue !== "_self") {
          element.setAttribute(attributeName, "_self");
        }
        return true;
      }
      return true;
    };

    const sanitizeAnchorElement = (element: HTMLElement) => {
      if (element.hasAttribute("href")) {
        const rel = element.getAttribute("rel") ?? "";
        const relTokens = new Set(rel.split(/\s+/).filter(Boolean));
        relTokens.add("noopener");
        relTokens.add("noreferrer");
        element.setAttribute("rel", Array.from(relTokens).join(" "));
      } else {
        element.removeAttribute("target");
        element.removeAttribute("rel");
      }
    };

    const sanitizeAttributes = (element: HTMLElement) => {
      for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase();
        if (!isAttributeAllowed(attributeName, element.tagName)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        const attributeValue = attribute.value.trim();
        if (attributeName === "style") {
          const safeStyle = sanitizeStyleValue(attributeValue);
          if (safeStyle) {
            element.setAttribute("style", safeStyle);
          } else {
            element.removeAttribute(attribute.name);
          }
          continue;
        }
        if (!validateAttributeValue(element, attributeName, attributeValue)) {
          element.removeAttribute(attribute.name);
        }
      }

      if (element.tagName === "A") {
        sanitizeAnchorElement(element);
      }
    };

    const unwrapElement = (element: HTMLElement) => {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
    };

    const wrapOrphanTextNodes = (root: HTMLElement) => {
      const nodes = Array.from(root.childNodes);
      for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const textContent = node.textContent ?? "";
          if (!textContent.trim()) {
            node.remove();
            continue;
          }
          const paragraph = workingDocument.createElement("p");
          paragraph.textContent = textContent.trim();
          node.replaceWith(paragraph);
        }
      }
    };

    const convertDivsToParagraphs = (root: HTMLElement) => {
      const divs = Array.from(root.querySelectorAll("div")).filter(
        // Embedded-media wrappers and page breaks are the legitimate divs in
        // content; both were already normalized in sanitizeTree above.
        (div) =>
          !div.classList.contains(EMBED_CONTAINER_CLASS) &&
          !div.classList.contains(PAGE_BREAK_CLASS)
      );
      for (const div of divs) {
        const paragraph = workingDocument.createElement("p");
        while (div.firstChild) {
          paragraph.appendChild(div.firstChild);
        }
        if (!paragraph.innerHTML.trim()) {
          paragraph.innerHTML = "<br>";
        }
        div.replaceWith(paragraph);
      }
    };

    const normalizeListTextNode = (child: ChildNode) => {
      const textContent = child.textContent?.trim() ?? "";
      if (textContent) {
        const listItem = workingDocument.createElement("li");
        listItem.textContent = textContent;
        child.replaceWith(listItem);
      } else {
        child.remove();
      }
    };

    const normalizeListElementNode = (child: ChildNode) => {
      const childElement = child as HTMLElement;
      if (childElement.tagName !== "LI") {
        const listItem = workingDocument.createElement("li");
        childElement.replaceWith(listItem);
        listItem.appendChild(childElement);
      }
    };

    const ensureListItemsHaveContent = (list: HTMLElement) => {
      for (const listItem of Array.from(list.querySelectorAll("li"))) {
        if (!listItem.innerHTML.trim()) {
          listItem.innerHTML = "<br>";
        }
      }
    };

    const normalizeLists = (root: HTMLElement) => {
      const lists = Array.from(root.querySelectorAll("ul, ol"));
      for (const list of lists) {
        const children = Array.from(list.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE) {
            normalizeListTextNode(child);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            normalizeListElementNode(child);
          }
        }
        ensureListItemsHaveContent(list as HTMLElement);
      }
    };

    const ensureBlockLineBreaks = (root: HTMLElement) => {
      const blocks = root.querySelectorAll("p, li");
      for (const block of blocks) {
        if (!block.innerHTML.trim()) {
          block.innerHTML = "<br>";
        }
      }
    };

    sanitizeTree(workingDocument.body);
    wrapOrphanTextNodes(workingDocument.body);
    convertDivsToParagraphs(workingDocument.body);
    normalizeLists(workingDocument.body);
    ensureBlockLineBreaks(workingDocument.body);
    workingDocument.body.normalize();

    return workingDocument.body.innerHTML;
  };

  return {
    sanitizeHtml,
  };
}
