import {
  Schema,
  DOMParser,
  DOMSerializer,
  type NodeSpec,
  type MarkSpec,
  type Node as PMNode,
} from "prosemirror-model";
import { tableNodes } from "prosemirror-tables";
import { useHtmlSanitizer } from "../composables/useHtmlSanitizer";
const { sanitizeHtml } = useHtmlSanitizer();
const attributeNames = [
  "data-nle-id",
  "data-nle-suggestion",
  "data-nle-deletion",
  "data-nle-cite",
  "data-nle-locator",
  "data-nle-note",
  "data-nle-generated",
  "data-nle-if",
  "data-nle-repeat",
  "lang",
  "dir",
  "style",
  "id",
];
const attrs = Object.fromEntries(
  attributeNames.map((name) => [name, { default: null }]),
);
const read = (node: Node | string) =>
  typeof node === "string"
    ? {}
    : Object.fromEntries(
        attributeNames.map((name) => [
          name,
          (node as Element).getAttribute(name),
        ]),
      );
// Remote CRDT values bypass DOM parsing: validate again BEFORE rendering any live DOM.
const cleanAttrs = (value: Record<string, unknown>, tag = "span") => {
  const candidate = document.createElement(tag);
  for (const [key, val] of Object.entries(value))
    if (
      val !== null &&
      val !== undefined &&
      typeof val !== "object" &&
      key !== "html" &&
      key !== "level"
    )
      candidate.setAttribute(key, String(val));
  const holder = document.createElement("div");
  holder.innerHTML = sanitizeHtml(candidate.outerHTML);
  const safe = holder.querySelector(tag);
  return Object.fromEntries(
    Array.from(safe?.attributes ?? []).map((attr) => [attr.name, attr.value]),
  );
};
const block = (tag: string, content = "inline*"): NodeSpec => ({
  group: "block",
  content,
  attrs,
  parseDOM: [{ tag, getAttrs: read }],
  toDOM: (node) => [tag, cleanAttrs(node.attrs, tag), 0],
});
const nodes: Record<string, NodeSpec> = {
  doc: { content: "block+" },
  text: { group: "inline" },
  paragraph: block("p"),
  blockquote: block("blockquote", "block+"),
  heading: {
    group: "block",
    content: "inline*",
    attrs: { ...attrs, level: { default: 1 } },
    defining: true,
    parseDOM: [1, 2, 3, 4, 5, 6].map((level) => ({
      tag: "h" + level,
      getAttrs: (node) => ({ ...read(node), level }),
    })),
    toDOM: (node) => [
      "h" + Math.max(1, Math.min(6, Number(node.attrs.level) || 1)),
      cleanAttrs(
        Object.fromEntries(attributeNames.map((key) => [key, node.attrs[key]])),
      ),
      0,
    ],
  },
  bullet_list: {
    ...block("ul", "list_item+"),
    attrs: { ...attrs, class: { default: null } },
    parseDOM: [
      {
        tag: "ul",
        getAttrs: (node) => ({
          ...read(node),
          class:
            (node as Element).getAttribute("class") === "checklist"
              ? "checklist"
              : null,
        }),
      },
    ],
  },
  ordered_list: {
    ...block("ol", "list_item+"),
    attrs: { ...attrs, start: { default: 1 } },
    parseDOM: [
      {
        tag: "ol",
        getAttrs: (node) => ({
          ...read(node),
          start: Number((node as Element).getAttribute("start") ?? 1),
        }),
      },
    ],
  },
  list_item: {
    ...block("li", "paragraph block*"),
    attrs: { ...attrs, "data-checked": { default: null } },
    parseDOM: [
      {
        tag: "li",
        getAttrs: (node) => ({
          ...read(node),
          "data-checked": (node as Element).getAttribute("data-checked"),
        }),
      },
    ],
  },
  code_block: {
    ...block("pre", "text*"),
    marks: "",
    code: true,
    defining: true,
    parseDOM: [{ tag: "pre", preserveWhitespace: "full", getAttrs: read }],
    toDOM: (node) => ["pre", cleanAttrs(node.attrs), ["code", 0]],
  },
  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    parseDOM: [{ tag: "br" }],
    toDOM: () => ["br"],
  },
  horizontal_rule: {
    group: "block",
    parseDOM: [{ tag: "hr" }],
    toDOM: () => ["hr"],
  },
  image: {
    inline: true,
    group: "inline",
    draggable: true,
    attrs: {
      src: {},
      alt: { default: "" },
      title: { default: null },
      width: { default: null },
      height: { default: null },
    },
    parseDOM: [
      {
        tag: "img[src]",
        getAttrs: (node) =>
          Object.fromEntries(
            ["src", "alt", "title", "width", "height"].map((name) => [
              name,
              (node as Element).getAttribute(name),
            ]),
          ),
      },
    ],
    toDOM: (node) => ["img", cleanAttrs(node.attrs, "img")],
  },
  page_break: {
    group: "block",
    atom: true,
    attrs,
    parseDOM: [{ tag: "div.page-break", getAttrs: read }],
    toDOM: (node) => [
      "div",
      {
        ...cleanAttrs(node.attrs),
        class: "page-break",
        contenteditable: "false",
      },
      ["span", { class: "page-break-label" }, "Page Break"],
      ["hr"],
    ],
  },
  embedded: {
    group: "block",
    atom: true,
    attrs: { ...attrs, html: { default: "" } },
    parseDOM: [
      {
        tag: "div.embedded-resizable-container",
        getAttrs: (node) => ({
          ...read(node),
          html: (node as Element).outerHTML,
        }),
      },
    ],
    toDOM: (node) => {
      const holder = document.createElement("div");
      holder.innerHTML = sanitizeHtml(String(node.attrs.html));
      const el = (holder.firstElementChild ??
        document.createElement("p")) as HTMLElement;
      Object.entries(cleanAttrs(node.attrs)).forEach(([key, value]) =>
        el.setAttribute(key, value),
      );
      return el;
    },
  },
  variable: {
    group: "inline",
    inline: true,
    atom: true,
    attrs: { name: {}, value: { default: "" } },
    parseDOM: [
      {
        tag: "span.editor-variable",
        getAttrs: (node) => ({
          name: (node as Element).getAttribute("data-variable"),
          value: (node as Element).getAttribute("data-value"),
        }),
      },
    ],
    toDOM: (node) => [
      "span",
      {
        class: "editor-variable",
        "data-variable": node.attrs.name,
        "data-value": node.attrs.value,
        contenteditable: "false",
      },
      "{{ " + node.attrs.name + " }}",
    ],
  },
  ...tableNodes({
    tableGroup: "block",
    cellContent: "block+",
    cellAttributes: {
      style: {
        default: null,
        getFromDOM: (el) => el.getAttribute("style"),
        setDOMAttr: (value, target) => {
          const style = cleanAttrs({ style: value }).style;
          if (style) target.style = style;
        },
      },
    },
  }),
};
nodes.table = {
  ...nodes.table,
  attrs: { ...nodes.table.attrs, ...attrs },
  parseDOM: [{ tag: "table", getAttrs: read }],
  toDOM: (node) => ["table", cleanAttrs(node.attrs), ["tbody", 0]],
};
const simpleMark = (tag: string, aliases: string[] = []): MarkSpec => ({
  parseDOM: [tag, ...aliases].map((t) => ({ tag: t })),
  toDOM: () => [tag, 0],
});
const marks: Record<string, MarkSpec> = {
  strong: simpleMark("strong", ["b"]),
  em: simpleMark("em", ["i"]),
  underline: simpleMark("u"),
  strike: simpleMark("s"),
  sub: simpleMark("sub"),
  sup: simpleMark("sup"),
  code: simpleMark("code"),
  link: {
    attrs: { href: {}, title: { default: null }, ...attrs },
    inclusive: false,
    parseDOM: [
      {
        tag: "a[href]",
        getAttrs: (node) => ({
          ...read(node),
          href: (node as Element).getAttribute("href"),
          title: (node as Element).getAttribute("title"),
        }),
      },
    ],
    toDOM: (node) => [
      "a",
      { ...cleanAttrs(node.attrs, "a"), rel: "noopener noreferrer" },
      0,
    ],
  },
  span: {
    attrs: {
      ...attrs,
      "data-thread-id": { default: null },
      class: { default: null },
    },
    parseDOM: [
      {
        tag: "span:not(.editor-variable)",
        getAttrs: (node) => ({
          ...read(node),
          "data-thread-id": (node as Element).getAttribute("data-thread-id"),
          class: /^comment-highlight(?:-resolved)?$/.test(
            (node as Element).className,
          )
            ? (node as Element).className
            : null,
        }),
      },
    ],
    toDOM: (node) => ["span", cleanAttrs(node.attrs), 0],
  },
};
export const collaborationSchema = new Schema({ nodes, marks });
export function parseCollaborativeHtml(html: string): PMNode {
  const root = document.createElement("div");
  root.innerHTML = html;
  root
    .querySelectorAll(
      ".nle-remote-cursor, .ProseMirror-yjs-cursor, .ProseMirror-widget, .ProseMirror-separator, br.ProseMirror-trailingBreak",
    )
    .forEach((node) => node.remove());
  return DOMParser.fromSchema(collaborationSchema).parse(root);
}
export function serializeCollaborativeDocument(node: PMNode): string {
  const root = document.createElement("div");
  root.appendChild(
    DOMSerializer.fromSchema(collaborationSchema).serializeFragment(
      node.content,
    ),
  );
  return root.innerHTML;
}
