import { test, expect, type Locator, type Page } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
const primary = (page: Page) => page.getByTestId("primary");
const editor = (root: Locator) =>
  root.getByRole("textbox", {
    name: /^(?:Collaborative rich text editor|Rich text editor)$/,
  });
async function tools(root: Locator, name: string) {
  const button = root.getByRole("button", {
    name: "Document tools",
    exact: false,
  });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await root.getByRole("tab", { name, exact: true }).click();
}
async function addReferences(page: Page) {
  const root = primary(page);
  await tools(root, "References");
  await root
    .getByLabel("Note text", { exact: true })
    .fill("Imported detail: Olá, שלום, مرحبا");
  await root.getByRole("button", { name: "Add footnote", exact: true }).click();
  await root.getByLabel("Author", { exact: true }).fill("Silva, Ana");
  await root
    .getByLabel("Title", { exact: true })
    .fill("Writing across documents");
  await root.getByLabel("Year", { exact: true }).fill("2026");
  await root.getByRole("button", { name: "Add source", exact: true }).click();
  await root
    .getByRole("button", { name: "Insert citation", exact: true })
    .click();
  await expect(editor(root)).toContainText("Writing across documents");
}
async function copyReferences(root: Locator, cut = false) {
  return editor(root).evaluate((el, cut) => {
    const passage = el.querySelector("[data-nle-note]")!.closest("p")!;
    (el as HTMLElement).focus();
    const range = document.createRange();
    range.selectNodeContents(passage);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const data = new DataTransfer();
    el.dispatchEvent(
      new ClipboardEvent(cut ? "cut" : "copy", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
    return Object.fromEntries(
      Array.from(data.types).map((type) => [type, data.getData(type)]),
    );
  }, cut);
}
async function pasteReferences(root: Locator, data: Record<string, string>) {
  const surface = editor(root);
  if (await surface.locator("p").count())
    await surface.locator("p").first().click();
  else await surface.click();
  await surface.press("Home");
  await surface.press("End");
  await surface.evaluate((el, data) => {
    const clipboardData = new DataTransfer();
    for (const [type, value] of Object.entries(data))
      clipboardData.setData(type, value);
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, data);
}
test("reference paste retains source definitions, caret, one-step undo and saved reload", async ({
  page,
  context,
}) => {
  await page.goto("/?lab=documents&document=reference-origin");
  await addReferences(page);
  const copied = await copyReferences(primary(page));
  expect(copied["text/html"]).toContain("data-nle-reference-fragment");
  const target = await context.newPage();
  await target.goto("/?lab=documents&document=reference-destination");
  const root = primary(target),
    surface = editor(root);
  await surface.fill("Destination passage.");
  // Exercise the standard HTML fallback: mobile browsers may omit custom MIME.
  await pasteReferences(root, {
    "text/html": copied["text/html"],
    "text/plain": copied["text/plain"],
  });
  await expect(surface).toContainText("Imported detail: Olá, שלום, مرحبا");
  await expect(surface.locator("[data-nle-cite]")).toHaveCount(1);
  await expect(surface.locator("[data-nle-note]")).toHaveCount(1);
  expect(
    await surface.evaluate((el) => {
      const selection = document.getSelection()!;
      const node = selection.anchorNode;
      return (
        selection.isCollapsed &&
        el.contains(node) &&
        !(node instanceof Element ? node : node?.parentElement)?.closest(
          "[data-nle-generated]",
        )
      );
    }),
  ).toBe(true);
  await surface.press("ControlOrMeta+z");
  await expect(surface).toHaveText("Destination passage.");
  await tools(root, "References");
  await expect(
    root.getByRole("button", { name: "Insert citation", exact: true }),
  ).toHaveCount(0);
  await surface.press("ControlOrMeta+Shift+z");
  await expect(surface).toContainText("Writing across documents");
  await expect(
    root.getByRole("button", { name: "Insert citation", exact: true }),
  ).toHaveCount(1);
  await tools(root, "Versions");
  await root.getByLabel("Checkpoint name").fill("Transferred references");
  await root
    .getByRole("button", { name: "Save checkpoint", exact: true })
    .click();
  await expect(
    root.getByText("Transferred references", { exact: true }),
  ).toBeVisible();
  await target.reload();
  await tools(primary(target), "Versions");
  await primary(target)
    .getByRole("button", { name: "Restore", exact: true })
    .click();
  await expect(editor(primary(target))).toContainText(
    "Imported detail: Olá, שלום, مرحبا",
  );
  await tools(primary(target), "References");
  await expect(
    primary(target).getByRole("button", {
      name: "Insert citation",
      exact: true,
    }),
  ).toHaveCount(1);
  await expect(
    primary(target).getByRole("button", { name: "Edit note", exact: true }),
  ).toHaveCount(1);
});
test("cut and paste within a document preserves reference identity and each undo boundary", async ({
  page,
}) => {
  await page.goto("/?lab=documents&document=reference-cut");
  await addReferences(page);
  const root = primary(page),
    surface = editor(root);
  const originalId = await surface
    .locator("[data-nle-note]")
    .getAttribute("data-nle-note");
  const copied = await copyReferences(root, true);
  await expect(surface.locator("[data-nle-note]")).toHaveCount(0);
  await expect(surface).not.toContainText("Imported detail");
  await pasteReferences(root, copied);
  await expect(surface.locator("[data-nle-note]")).toHaveAttribute(
    "data-nle-note",
    originalId!,
  );
  await expect(
    root.getByRole("button", { name: "Edit note", exact: true }),
  ).toHaveCount(1);
  await surface.press("ControlOrMeta+z");
  await expect(surface.locator("[data-nle-note]")).toHaveCount(0);
  await surface.press("ControlOrMeta+z");
  await expect(surface.locator("[data-nle-note]")).toHaveAttribute(
    "data-nle-note",
    originalId!,
  );
});
test("a coauthor receives pasted definitions and local undo preserves the other author's typing", async ({
  page,
  context,
}) => {
  await page.goto("/?lab=documents&document=reference-source-for-peers");
  await addReferences(page);
  const copied = await copyReferences(primary(page));
  const target = await context.newPage();
  await target.goto(
    "/?lab=documents&collaboration=true&document=reference-peers",
  );
  const root = primary(target),
    peer = target.getByTestId("peer");
  await expect(editor(root)).toHaveAttribute("contenteditable", "true");
  await expect(editor(peer)).toContainText("A better document");
  await pasteReferences(root, copied);
  await expect(editor(peer)).toContainText("Imported detail: Olá, שלום, مرحبا");
  await tools(peer, "References");
  await expect(
    peer.getByRole("button", { name: "Insert citation", exact: true }),
  ).toHaveCount(1);
  await editor(peer).locator("p").first().click();
  await editor(peer).press("Home");
  await editor(peer).pressSequentially("Peer edit. ");
  await expect(editor(root)).toContainText("Peer edit. ");
  await editor(root).press("ControlOrMeta+z");
  await expect(editor(peer).locator("[data-nle-cite]")).toHaveCount(0);
  await expect(editor(peer)).toContainText("Peer edit. ");
  await expect(
    peer.getByRole("button", { name: "Insert citation", exact: true }),
  ).toHaveCount(0);
  await editor(root).press("ControlOrMeta+Shift+z");
  await expect(editor(peer)).toContainText("Imported detail: Olá, שלום, مرحبا");
  await expect(editor(peer)).toContainText("Peer edit. ");
});
test("repeated Word footnote imports keep unique targets, backlinks and undo", async ({
  page,
}) => {
  const ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const bytes = zipSync({
    "[Content_Types].xml": strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    "word/_rels/document.xml.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/></Relationships>',
    ),
    "word/document.xml": strToU8(
      `<w:document xmlns:w="${ns}"><w:body><w:p><w:r><w:t>Imported Word claim</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p></w:body></w:document>`,
    ),
    "word/footnotes.xml": strToU8(
      `<w:footnotes xmlns:w="${ns}"><w:footnote w:id="1"><w:p><w:r><w:t>Word note contents</w:t></w:r></w:p></w:footnote></w:footnotes>`,
    ),
  });
  await page.goto("/?lab=documents&document=word-reference-import");
  const root = primary(page),
    surface = editor(root);
  for (let count = 1; count <= 2; count++) {
    await surface.locator("p").first().click();
    await surface.press("End");
    await tools(root, "Import Word");
    await root
      .getByLabel("Choose a Word document")
      .setInputFiles({
        name: "footnotes.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: Buffer.from(bytes),
      });
    await expect(root.locator(".document-preview")).toContainText(
      "Word note contents",
    );
    await root
      .getByRole("button", { name: "Insert at selection", exact: true })
      .click();
    await expect(
      surface.getByText("Word note contents", { exact: false }),
    ).toHaveCount(count);
  }
  const targets = await surface.evaluate((el) => {
    const ids = Array.from(el.querySelectorAll("[id]")).map((node) => node.id);
    const references = Array.from(
      el.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'),
    ).map((link) => ({
      href: link.getAttribute("href")!,
      resolves: Boolean(
        el.querySelector(`[id="${link.getAttribute("href")!.slice(1)}"]`),
      ),
    }));
    return { ids, references };
  });
  expect(new Set(targets.ids).size).toBe(targets.ids.length);
  expect(targets.references).toHaveLength(4);
  expect(targets.references.every((link) => link.resolves)).toBe(true);
  await surface.press("ControlOrMeta+z");
  await expect(
    surface.getByText("Word note contents", { exact: false }),
  ).toHaveCount(1);
});
test("the Chromium clipboard and context-menu paste carry reference definitions", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Programmatic clipboard permission is exercised in Chromium; event/HTML fallback is covered in WebKit.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?lab=documents&document=system-clipboard-origin");
  await addReferences(page);
  const origin = primary(page);
  const passage = editor(origin).locator("p:has([data-nle-note])").first();
  await passage.scrollIntoViewIfNeeded();
  await copyReferences(origin); // Select the passage; the menu command writes the system clipboard.
  await passage.click({ button: "right" });
  await page.getByRole("menuitem", { name: /Copy Ctrl\+C/ }).click();
  const html = await page.evaluate(async () => {
    for (const item of await navigator.clipboard.read())
      if (item.types.includes("text/html"))
        return (await item.getType("text/html")).text();
    return "";
  });
  expect(html).toContain("data-nle-reference-fragment");
  const target = await context.newPage();
  await target.goto("/?lab=documents&document=system-clipboard-target");
  const root = primary(target),
    surface = editor(root);
  await surface.locator("p").first().click();
  await surface.press("End");
  await surface.locator("p").first().click({ button: "right" });
  await target.getByRole("menuitem", { name: /Paste/ }).click();
  await expect(surface).toContainText("Imported detail: Olá, שלום, مرحبا");
  await tools(root, "References");
  await expect(
    root.getByRole("button", { name: "Edit note", exact: true }),
  ).toHaveCount(1);
  await expect(
    root.getByRole("button", { name: "Insert citation", exact: true }),
  ).toHaveCount(1);
});
