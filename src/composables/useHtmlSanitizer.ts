import { buildEmbedContainerStyle } from "../utils/embeddedResizable";
import { EMBED_IFRAME_STYLE, getEmbedPlayerChrome } from "../utils/embed";

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

// A CSS font-weight value that is NOT bold (normal / lighter / numeric < 600).
// Used to detect fake-bold <b>/<strong> WRAPPERS — e.g. Google Docs' payload
// wrapper `<b style="font-weight:normal">` — which must be unwrapped so the
// paste doesn't render entirely bold once the neutralizing style is stripped.
const isNonBoldWeight = (fontWeight: string): boolean => {
  const value = fontWeight.trim().toLowerCase();
  if (!value) return false;
  if (value === "normal" || value === "lighter") return true;
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) && numeric < 600;
};

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
// Checklist block (utils/useSmartAutocomplete + the toolbar): a
// `<ul class="checklist">` whose `<li data-checked="true|false">` carry the
// toggle state. `class` isn't allowed on ul, nor `data-checked` on li, so the
// generic path would strip both and degrade the checklist to a plain bullet
// list. The special-case preserves the class and canonicalises each item's
// checked state (only a literal "true" survives as checked); item text is
// sanitized normally. No live <input> is ever introduced — the checkbox is a
// pure CSS ::before keyed on data-checked, so there is no new script surface.
const CHECKLIST_CLASS = "checklist";
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
/** The pill's "{{ name }}" label child — see sanitizeVariablePill. #R24-1 */
const VARIABLE_TOKEN_CLASS = "variable-token";
const VARIABLE_NAME_PATTERN = /^[\w.-]{1,64}$/;

// Comment-highlight spans (<span class="comment-highlight" data-thread-id="…">)
// are another special-cased span: their class + thread-id anchoring attributes
// are preserved (rebuilt from a validated thread id) instead of stripped by the
// generic span path, so comment anchors survive the v-model/persist round-trip.
const COMMENT_HIGHLIGHT_CLASS = "comment-highlight";
const COMMENT_HIGHLIGHT_RESOLVED_CLASS = "comment-highlight-resolved";
const THREAD_ID_PATTERN = /^[\w-]{1,64}$/;

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
  h1: new Set(["style", "id"]),
  h2: new Set(["style", "id"]),
  h3: new Set(["style", "id"]),
  h4: new Set(["style", "id"]),
  h5: new Set(["style", "id"]),
  h6: new Set(["style", "id"]),
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

/**
 * Browsers ignore ASCII whitespace and control characters when parsing a URL's
 * scheme, so they must be stripped before deciding whether one is present —
 * "java\nscript:alert(1)" and " javascript:alert(1)" ARE javascript: URLs.
 */
const stripUrlControlChars = (value: string): string =>
  // eslint-disable-next-line no-control-regex
  value.replace(/[\u0000-\u0020\u007f]/g, "");

const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Whether `value` is a PATH-relative reference ("images/logo.png", "./a.png",
 * "../up.png"). Such a reference carries NO scheme, so it can never execute
 * script — it only resolves against the document base — which is why it is safe
 * to allow alongside the absolute/root-relative/fragment forms SAFE_URL_PATTERN
 * already covers. Without it an inserted image or link with a relative URL had
 * its src/href stripped on the first round-trip and was lost on reload. #r21-1
 */
const isRelativeReference = (value: string): boolean => {
  const cleaned = stripUrlControlChars(value);
  return cleaned.length > 0 && !URL_SCHEME_PATTERN.test(cleaned);
};
// The TOC feature's generated heading ids ("heading-<n>-<slug>").
const TOC_HEADING_ID_PATTERN = /^heading-[\w-]{1,80}$/;
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/(?:[a-z0-9.+-]+);base64,/i;
// File Manager attachments are inlined as data: URLs (readAsDataURL), and its
// own upload allowlist is image/*, application/pdf and text/*. Mirror that here
// for `file` embeds only — without it a PDF/text attachment lost its payload on
// the first round-trip. text/html is excluded on purpose: nothing needs it, and
// a data:text/html payload is a script-execution vector if it ever reaches a
// navigation instead of a download.
/**
 * Attachment payloads are `data:` URLs, so the media type is the whole of the
 * defence. The previous `text/(?!html\b)…` blocklist had two holes an audit
 * measured: `\b` does not fire between `l` and `x`, so `text/htmlx` sailed
 * through, and `text/xml` / `text/xsl` / `image/svg+xml` are all scriptable
 * markup a browser will happily run once the file is saved and reopened.
 *
 * Inverted to an ALLOWLIST of the types the File Manager can actually produce
 * — raster images, PDF, and genuinely inert text — which is the same posture
 * the rest of this file takes. #R32-7
 */
const SAFE_DATA_FILE_PATTERN =
  /^data:(?:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)|application\/pdf|text\/(?:plain|csv|markdown|tab-separated-values));base64,/i;

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
 * The allowlist above validates a property NAME but said nothing about its
 * VALUE, and that gap is a clickjacking primitive rather than a cosmetic one.
 * `padding` on an inline element paints OUTSIDE its line box without consuming
 * layout, and the painted area is hit-testable — so
 *
 *   <a href="https://evil"><span style="padding:600px;background:#08f">Sign in</span></a>
 *
 * measured (real Chromium, 1000x700) a 659x1238px clickable rectangle starting
 * 532px ABOVE its own container, covering 39% of the viewport and returning the
 * attacker's anchor from elementFromPoint over a host's own buttons. Negative
 * margins reproduce it horizontally. Inside the editor the scroll containers
 * clip it; a bare consumer surface rendering stored HTML is fully exposed.
 *
 * So every length in a value must be within a sane bound, and negative lengths
 * are refused outright (nothing in the editor's own output needs one). Values
 * carrying no numbers at all — `text-align: center`, colours, keywords — pass
 * through untouched. #R32-5
 */
/**
 * Bounds are PER PROPERTY, because the safe magnitude differs by two orders of
 * magnitude: an image may legitimately be 2000px wide, while inline padding
 * beyond a few dozen px is not styling, it is a hit-testable overlay. A single
 * generous bound would have let the measured 600px payload straight through
 * (it did, on the first attempt — the test caught it).
 */
const STYLE_LENGTH_LIMIT_PX: Record<string, number> = {
  padding: 64,
  "border-radius": 64,
  "margin-left": 200,
  "font-size": 200,
};
const DEFAULT_STYLE_LENGTH_PX = 2000;
const LENGTH_IN_VALUE = /(-?\d*\.?\d+)\s*(px|pt|pc|in|cm|mm|q|em|rem|ex|ch|vw|vh|vmin|vmax|%)/gi;
/** Rough px-equivalents, only to compare magnitudes against one bound. */
const UNIT_TO_PX: Record<string, number> = {
  px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4,
  q: 96 / 101.6, em: 16, rem: 16, ex: 8, ch: 8, vw: 10, vh: 10,
  vmin: 10, vmax: 10, "%": 10,
};
const isSaneLengthValue = (property: string, value: string): boolean => {
  const limit = STYLE_LENGTH_LIMIT_PX[property] ?? DEFAULT_STYLE_LENGTH_PX;
  LENGTH_IN_VALUE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LENGTH_IN_VALUE.exec(value)) !== null) {
    const amount = Number.parseFloat(match[1]);
    if (!Number.isFinite(amount)) return false;
    // Negative lengths are the horizontal half of the same overlay trick and
    // nothing the editor emits needs one.
    if (amount < 0) return false;
    if (amount * (UNIT_TO_PX[match[2].toLowerCase()] ?? 1) > limit) return false;
  }
  return true;
};

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
    if (!isSaneLengthValue(property, value)) continue;

    safeDeclarations.push(`${property}: ${value}`);
  }
  return safeDeclarations.join("; ");
};

/**
 * Composable for HTML sanitization in the editor
 * Provides secure HTML cleaning and validation
 */
export function useHtmlSanitizer() {
  const sanitizeHtml = (input: string | null = "", options: { fragment?: boolean } = {}): string => {
    const value = input ?? "";
    if (!value.trim()) return "";
    // No DOM (SSR / Node): we cannot sanitize, so never echo raw untrusted HTML
    // through — return empty. The editor is browser-only and re-applies the real
    // content on client mount, so this only affects a server pre-render.
    if (globalThis.window === undefined || document === undefined) return "";

    const workingDocument =
      document.implementation.createHTMLDocument("sanitizer");
    workingDocument.body.innerHTML = value;

    const sanitizeTree = (root: HTMLElement) => {
      let child: ChildNode | null = root.firstChild;
      while (child) {
        const next = child.nextSibling;
        if (child.nodeType === Node.COMMENT_NODE) {
          // Strip HTML comments — inert, but Word / Google-Docs paste is full
          // of `<!--[if gte mso 9]>…<![endif]-->` cruft that otherwise persists
          // into saved content.
          child.remove();
          child = next;
          continue;
        }
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
                const embedType = element.getAttribute("data-type");
                if (embedType === "file") {
                  // Attachments need their data: link regenerated — the generic
                  // pass would strip the href and `download` and lose the file.
                  rebuildFileEmbed(element);
                } else if (
                  embedType === "embed" &&
                  rebuildVideoEmbed(element)
                ) {
                  // Player rebuilt from its validated src; nothing untrusted is
                  // left inside it to sanitize.
                } else {
                  sanitizeTree(element);
                }
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
          } else if (element.tagName === "IFRAME") {
            // A surviving (allowlisted-host) iframe parses its children as
            // RAWTEXT, so they become a single text node that sanitizeTree
            // never inspects — and the serializer emits raw text LITERALLY.
            // `<iframe src="…youtube…"><script>x</script></iframe>` therefore
            // round-tripped byte-for-byte. Browsers never execute it (fallback
            // content is inert, and an XHTML reparse fails well-formedness),
            // but a sanitizer whose OUTPUT still contains `<script>…</script>`
            // is unsafe for every downstream consumer that is not a
            // spec-compliant HTML parser: regex scrubbers, feed pipelines,
            // templating layers. The fallback content has no purpose here —
            // the player is rebuilt from constants — so drop it. #R32-4
            element.textContent = "";
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
          } else if (
            element.tagName === "SPAN" &&
            (element.getAttribute("class") ?? "")
              .split(/\s+/)
              .includes(COMMENT_HIGHLIGHT_CLASS)
          ) {
            if (!sanitizeCommentHighlight(element)) {
              sanitizeAttributes(element);
            }
            // Highlights wrap real content — always sanitize the children.
            sanitizeTree(element);
          } else if (element.tagName === "SPAN") {
            // A generic (non-pill, non-highlight) span: strip its attributes and
            // sanitize its subtree, then drop it entirely if it is now an empty,
            // attribute-less wrapper. Word/Google-Docs leave runs of these behind
            // (class/lang/style all stripped, no text), pure noise that otherwise
            // survives every round-trip.
            sanitizeAttributes(element);
            sanitizeTree(element);
            if (
              element.childNodes.length === 0 &&
              element.attributes.length === 0
            ) {
              child = next;
              element.remove();
              continue;
            }
          } else if (
            element.tagName === "UL" &&
            element.classList.contains(CHECKLIST_CLASS)
          ) {
            // Checklist: keep the class, canonicalise each item's checked state,
            // and sanitize item text — but never trust the raw attributes.
            sanitizeChecklist(element);
          } else if (
            (element.tagName === "B" || element.tagName === "STRONG") &&
            isNonBoldWeight(element.style.fontWeight)
          ) {
            // A <b>/<strong> whose OWN inline font-weight is non-bold is a
            // fake-bold WRAPPER, not real emphasis — most notably Google Docs'
            // `<b style="font-weight:normal" id="docs-internal-guid-…">` around
            // the whole payload. Keeping the tag while stripping its style
            // would turn the entire paste bold. Unwrap it; children survive.
            child = element.firstChild ?? next;
            unwrapElement(element);
            continue;
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
      // A `data:` payload is judged by what it BECOMES. Rendered into an
      // <img> an SVG is inert (image context refuses scripts), but a `file`
      // container turns its src into an `<a download>` — saved to disk and
      // reopened, `image/svg+xml` is a scriptable document. So attachments get
      // the strict attachment allowlist ONLY; the permissive image pattern
      // does not vouch for them. #R32-7
      const dataUrlAllowed =
        type === "file"
          ? SAFE_DATA_FILE_PATTERN.test(srcRaw)
          : SAFE_DATA_IMAGE_PATTERN.test(srcRaw);
      const src =
        srcRaw &&
        (SAFE_URL_PATTERN.test(srcRaw) ||
          dataUrlAllowed ||
          // A path-relative image/file reference (no scheme -> cannot execute
          // script); without this it was blanked and lost on reload. #r21-1
          isRelativeReference(srcRaw))
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
     * Rebuild a file attachment's inner link from the container's already
     * validated `data-src`. The generic path cannot carry it: the href is a
     * data: URL (rejected by SAFE_URL_PATTERN) and `download` isn't an allowed
     * <a> attribute, so a persisted attachment used to come back as an empty
     * dashed box with dead text and the payload gone for good. Regenerating the
     * known-safe structure keeps the bytes and the link across round-trips.
     *
     * Runs AFTER sanitizeEmbedContainer, which stamps the validated data-src;
     * the label is taken from the existing anchor's `download` (the value this
     * function itself writes, so a second pass reproduces byte-identical output)
     * and set via textContent, which cannot inject markup.
     */
    const rebuildFileEmbed = (element: HTMLElement) => {
      const src = element.getAttribute("data-src") ?? "";
      const existingAnchor = element.querySelector("a");
      const label =
        existingAnchor?.getAttribute("download")?.trim() ||
        (element.textContent ?? "").replace(/📎/g, "").trim() ||
        "Download File";

      element.textContent = "";
      // The payload failed validation — leave an empty container rather than a
      // link to something we refused to vouch for.
      if (!src) return;

      const anchor = workingDocument.createElement("a");
      anchor.setAttribute("href", src);
      anchor.setAttribute("download", label);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");
      anchor.setAttribute(
        "style",
        "display: flex; align-items: center; justify-content: center; height: 100%; text-decoration: none; color: inherit;"
      );

      const inner = workingDocument.createElement("div");
      inner.setAttribute("style", "text-align: center;");
      const icon = workingDocument.createElement("div");
      icon.setAttribute("style", "font-size: 48px; margin-bottom: 8px;");
      icon.textContent = "📎";
      const name = workingDocument.createElement("div");
      name.setAttribute("style", "font-weight: 600;");
      name.textContent = label;

      inner.appendChild(icon);
      inner.appendChild(name);
      anchor.appendChild(inner);
      element.appendChild(anchor);
    };

    /**
     * Rebuild an embedded video player from its validated iframe src.
     *
     * The generic pass cannot carry it: the player's entire presentation is
     * inline CSS (`position: absolute`, the offsets, `border: 0`) and every one
     * of those properties is deliberately absent from STYLE_ALLOWED_PROPERTIES
     * — an attacker-supplied `position: fixed` box is an overlay surface, so
     * widening the allowlist to save the player is not an option. Stripping
     * them left the player with the browser's default 2px inset border, in
     * flow, clipped by its own container, on the FIRST round-trip. #R23-62
     *
     * So the player is regenerated instead: the src is the only thing taken
     * from the untrusted element (and only after it passes the embed-host
     * allowlist), while the style, permissions and title come from constants
     * shared with utils/embed.ts. Any surrounding wrapper markup is dropped —
     * the container already provides the sized, positioned box.
     *
     * Returns false when the container holds no player worth vouching for, so
     * the caller falls back to the generic pass (which removes unsafe iframes).
     */
    const rebuildVideoEmbed = (element: HTMLElement): boolean => {
      const source = Array.from(element.querySelectorAll("iframe"))
        .map((candidate) => candidate.getAttribute("src")?.trim() ?? "")
        .find((src) => SAFE_EMBED_IFRAME_PATTERN.test(src));
      if (!source) return false;

      const { allow, title } = getEmbedPlayerChrome(source);
      const player = workingDocument.createElement("iframe");
      player.setAttribute("src", source);
      player.setAttribute("style", EMBED_IFRAME_STYLE);
      player.setAttribute("allow", allow);
      player.setAttribute("allowfullscreen", "");
      player.setAttribute("title", title);

      element.textContent = "";
      element.appendChild(player);
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
     * Normalize a checklist block: force the ul back to exactly
     * class="checklist" (dropping every other/spoofed attribute), then for each
     * direct <li> child strip its attributes, re-stamp a canonical
     * data-checked ("true" only when the raw value is literally "true",
     * case-insensitively; everything else — missing, "yes", etc. — becomes
     * "false"), and sanitize the item's text/inline content. Loose text nodes
     * directly under the ul are wrapped into unchecked items; any non-<li>
     * element child is dropped (the checklist grammar is ul > li only).
     */
    const sanitizeChecklist = (ul: HTMLElement) => {
      for (const attribute of Array.from(ul.attributes)) {
        ul.removeAttribute(attribute.name);
      }
      ul.setAttribute("class", CHECKLIST_CLASS);

      let child: ChildNode | null = ul.firstChild;
      while (child) {
        const next = child.nextSibling;
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          (child as HTMLElement).tagName === "LI"
        ) {
          const li = child as HTMLElement;
          const checked =
            (li.getAttribute("data-checked") ?? "").trim().toLowerCase() ===
            "true"
              ? "true"
              : "false";
          for (const attribute of Array.from(li.attributes)) {
            li.removeAttribute(attribute.name);
          }
          li.setAttribute("data-checked", checked);
          // Re-stamp the accessibility contract stripped by the attribute purge
          // above, in sync with data-checked, so screen readers announce the
          // item as a checkbox with its state across every round-trip.
          li.setAttribute("role", "checkbox");
          li.setAttribute("aria-checked", checked);
          sanitizeTree(li);
        } else if (
          child.nodeType === Node.TEXT_NODE &&
          (child.textContent ?? "").trim()
        ) {
          // Stamp the SAME trio the <li> branch above does. Stamping only
          // data-checked made the pass non-idempotent (pass 2 then added the
          // role/aria pair), and the editor decides whether to rewrite its own
          // innerHTML by comparing sanitizeHtml(current) with
          // sanitizeHtml(next) — an unstable result triggers a spurious
          // rewrite that destroys the caret mid-typing. It also left the
          // rescued item unannounced as a checkbox. #R32-6
          const li = workingDocument.createElement("li");
          li.setAttribute("data-checked", "false");
          li.setAttribute("role", "checkbox");
          li.setAttribute("aria-checked", "false");
          li.textContent = (child.textContent ?? "").trim();
          ul.replaceChild(li, child);
        } else {
          child.remove();
        }
        child = next;
      }
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
      // The pill's IDENTITY pin (#R25-1): which variable this pill means when
      // display names collide — print/export refreshes resolve by it. Same
      // validated alphabet as the name; anything else is dropped, not kept.
      const variableId = element.getAttribute("data-variable-id");
      const validVariableId =
        variableId !== null && VARIABLE_NAME_PATTERN.test(variableId)
          ? variableId
          : null;

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      element.setAttribute("class", VARIABLE_PILL_CLASS);
      element.setAttribute("contenteditable", "false");
      element.setAttribute("data-variable", name);
      if (validVariableId !== null)
        element.setAttribute("data-variable-id", validVariableId);
      if (value !== null) element.setAttribute("data-value", value);
      if (title !== null) element.setAttribute("title", title);
      // Canonical pill content: the "{{ name }}" label inside a .variable-token
      // child. Print CSS hides that child so the ::after value (which inherits
      // font-size from the PILL) prints at the ambient size — hiding the label
      // with font-size: 0 on the pill zeroed the value too. Rebuilt from the
      // VALIDATED name, never preserved: whatever children arrived here (bare
      // legacy text or a spoofed wrapper) are discarded wholesale. #R24-1
      element.textContent = "";
      const token = element.ownerDocument.createElement("span");
      token.setAttribute("class", VARIABLE_TOKEN_CLASS);
      token.textContent = `{{ ${name} }}`;
      element.appendChild(token);
      return true;
    };

    /**
     * Preserve a comment-highlight span's anchoring: validate the thread id,
     * rebuild the class + data-thread-id/data-comment-thread from it, and drop
     * everything else. Returns false when there is no valid thread id (then the
     * generic span path strips the markup). Children are sanitized by the caller.
     */
    const sanitizeCommentHighlight = (element: HTMLElement): boolean => {
      const threadId =
        element.getAttribute("data-thread-id") ??
        element.getAttribute("data-comment-thread") ??
        "";
      if (!THREAD_ID_PATTERN.test(threadId)) return false;

      const resolved = (element.getAttribute("class") ?? "")
        .split(/\s+/)
        .includes(COMMENT_HIGHLIGHT_RESOLVED_CLASS);

      for (const attribute of Array.from(element.attributes)) {
        element.removeAttribute(attribute.name);
      }
      element.setAttribute(
        "class",
        resolved
          ? `${COMMENT_HIGHLIGHT_CLASS} ${COMMENT_HIGHLIGHT_RESOLVED_CLASS}`
          : COMMENT_HIGHLIGHT_CLASS
      );
      element.setAttribute("data-thread-id", threadId);
      element.setAttribute("data-comment-thread", threadId);
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
        return (
          SAFE_URL_PATTERN.test(attributeValue) ||
          isRelativeReference(attributeValue)
        );
      }
      if (attributeName === "id") {
        // Only the TOC's own generated ids (utils/pageManagement.ts stamps
        // `heading-N-slug` on headings) survive the round-trip — without this
        // every TOC link died on save/reload. Arbitrary ids stay stripped: an
        // id like "location" can shadow window globals (DOM clobbering).
        return TOC_HEADING_ID_PATTERN.test(attributeValue);
      }
      if (attributeName === "src") {
        if (element.tagName === "IFRAME") {
          return SAFE_EMBED_IFRAME_PATTERN.test(attributeValue);
        }
        return (
          SAFE_URL_PATTERN.test(attributeValue) ||
          SAFE_DATA_IMAGE_PATTERN.test(attributeValue) ||
          isRelativeReference(attributeValue)
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
      const inlineTags = new Set(['A', 'B', 'BR', 'CODE', 'EM', 'I', 'IMG', 'S', 'SPAN', 'STRONG', 'SUB', 'SUP', 'U']);
      let run: ChildNode[] = [];
      const flush = () => {
        // Ignore indentation between blocks, but retain spaces BETWEEN inline
        // marks. Wrapping each orphan text node separately splits one sentence
        // around its emphasis and moves punctuation into another paragraph.
        const first = run[0];
        const last = run[run.length - 1];
        if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent?.trimStart() ?? '';
        if (last?.nodeType === Node.TEXT_NODE) last.textContent = last.textContent?.trimEnd() ?? '';
        run = run.filter(node => {
          if (node.nodeType === Node.TEXT_NODE && !node.textContent) { node.remove(); return false; }
          return true;
        });
        if (run.some(node => node.nodeType === Node.TEXT_NODE)) {
          const paragraph = workingDocument.createElement('p');
          root.insertBefore(paragraph, run[0]);
          for (const node of run) paragraph.appendChild(node);
        }
        run = [];
      };
      for (const node of Array.from(root.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && inlineTags.has((node as Element).tagName))) run.push(node);
        else flush();
      }
      flush();
    };

    const convertDivsToParagraphs = (root: HTMLElement) => {
      const divs = Array.from(root.querySelectorAll("div")).filter(
        // Embedded-media wrappers and page breaks are the legitimate divs in
        // content; both were already normalized in sanitizeTree above — as is
        // anything INSIDE them (an attachment card's layout is rebuilt
        // deterministically; other embeds had stray divs unwrapped). Converting
        // those descendants would nest <p> inside <p>, which is invalid.
        (div) =>
          !div.closest(`.${EMBED_CONTAINER_CLASS}`) &&
          !div.closest(`.${PAGE_BREAK_CLASS}`)
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
    // An inline clipboard fragment belongs at the caret in the current block.
    // Adding a paragraph here makes Firefox split that block and leave an
    // unwanted blank paragraph after it. Full documents still normalize text.
    if (!options.fragment) wrapOrphanTextNodes(workingDocument.body);
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
