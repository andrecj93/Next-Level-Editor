import { describe, it, expect, beforeEach } from "vitest";
import { generateTableOfContents } from "../pageManagement";

/**
 * R23-42: heading anchors collided, so TOC entries jumped to the wrong heading.
 * The slug strips every non-ASCII character, so a Cyrillic/Greek/CJK/Arabic
 * document degrades every heading to `heading-<index>-` — and because an
 * EXISTING id is reused while the index is positional, inserting a heading
 * above an existing one produces two headings with the same id. The generated
 * TOC then contains two links to the same anchor and one heading is
 * unreachable.
 */
let root: HTMLElement;

const ids = () =>
  Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((h) => h.id);

beforeEach(() => {
  document.body.innerHTML = "";
  root = document.createElement("div");
  document.body.appendChild(root);
});

describe("TOC heading anchors are unique (#R23-42)", () => {
  it("gives non-Latin headings distinct ids", () => {
    // Control: the slug is empty for every one of these (the regex strips all
    // non-ASCII), so only the positional index keeps them apart.
    root.innerHTML = "<h1>Заголовок</h1><h1>Текст</h1><h1>Раздел</h1>";

    generateTableOfContents(root);

    const seen = ids();
    expect(seen).toHaveLength(3);
    expect(new Set(seen).size).toBe(3);
  });

  it("does not hand a new heading an id an existing heading already owns", () => {
    // The collision needs a KEPT id to equal a NEWLY generated one: existing
    // ids are reused while the index is positional, so adding a heading with
    // the same text above an existing one regenerates the very same id.
    root.innerHTML = "<h1>Summary</h1>";
    generateTableOfContents(root);
    const original = root.querySelector("h1")!.id;

    const added = document.createElement("h1");
    added.textContent = "Summary";
    root.insertBefore(added, root.firstChild);
    generateTableOfContents(root);

    const seen = ids();
    expect(seen).toHaveLength(2);
    expect(new Set(seen).size).toBe(2);
    // The heading that already had an anchor keeps it, so existing links and
    // previously exported HTML do not rot.
    expect(seen).toContain(original);
  });

  it("keeps non-Latin headings apart when one is inserted above another", () => {
    // Every slug here is empty, so the positional index is the ONLY thing
    // distinguishing them — and it is exactly what an insertion shifts.
    root.innerHTML = "<h1>Обзор</h1>";
    generateTableOfContents(root);

    const added = document.createElement("h1");
    added.textContent = "Итог";
    root.insertBefore(added, root.firstChild);
    generateTableOfContents(root);

    expect(new Set(ids()).size).toBe(2);
  });

  it("every TOC item points at a heading that actually exists", () => {
    root.innerHTML = "<h1>Обзор</h1>";
    generateTableOfContents(root);
    const added = document.createElement("h1");
    added.textContent = "Итог";
    root.insertBefore(added, root.firstChild);

    const items = generateTableOfContents(root);

    expect(items).toHaveLength(2);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
    const targets = items.map((i) => root.querySelector(`#${CSS.escape(i.id)}`));
    expect(targets.every(Boolean)).toBe(true);
    // Each entry resolves to ITS OWN heading, not the same one twice.
    expect(new Set(targets).size).toBe(2);
  });
});
