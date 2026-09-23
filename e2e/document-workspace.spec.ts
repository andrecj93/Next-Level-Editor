import { test, expect, type Page, type Locator } from "@playwright/test";
import { zipSync, strToU8 } from "fflate";
import { readFile } from "node:fs/promises";
const primary = (page: Page) => page.getByTestId("primary");
const editor = (page: Page) =>
  primary(page).getByRole("textbox", { name: "Rich text editor", exact: true });
async function tools(root: Locator, tab: string) {
  const button = root.getByRole("button", {
    name: "Document tools",
    exact: false,
  });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await root.getByRole("tab", { name: tab, exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.goto("/?lab=documents");
  await expect(editor(page)).toContainText("A better document");
});
test("checkpoints survive reload, compare and restore keeps undo", async ({
  page,
}) => {
  const root = primary(page);
  await tools(root, "Versions");
  await root.getByLabel("Checkpoint name").fill("Draft one");
  await root
    .getByRole("button", { name: "Save checkpoint", exact: true })
    .click();
  await expect(root.getByText("Draft one", { exact: true })).toBeVisible();
  await editor(page).fill("An entirely different draft.");
  await tools(root, "Versions");
  await root.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(root.locator(".document-diff .added").first()).toContainText(
    "A",
  );
  await root.getByRole("button", { name: "Restore", exact: true }).click();
  await expect(editor(page)).toContainText("A better document");
  await editor(page).press("ControlOrMeta+z");
  await expect(editor(page)).toContainText("An entirely different draft.");
  await page.reload();
  await tools(primary(page), "Versions");
  await expect(
    primary(page).getByText("Draft one", { exact: true }),
  ).toBeVisible();
});
test("imports a Word document through preview and restores with undo", async ({
  page,
}) => {
  const bytes = zipSync({
    "[Content_Types].xml": strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    "word/document.xml": strToU8(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Imported Portuguese document: Olá!</w:t></w:r></w:p></w:body></w:document>',
    ),
  });
  const root = primary(page);
  await tools(root, "Import Word");
  await root.getByLabel("Choose a Word document").setInputFiles({
    name: "sample.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from(bytes),
  });
  await expect(root.locator(".document-preview")).toContainText("Olá!");
  await expect(editor(page)).toContainText("A better document");
  const reportDownload = page.waitForEvent("download");
  await root
    .getByRole("button", { name: "Download conversion report", exact: true })
    .click();
  const report = JSON.parse(
    await readFile((await (await reportDownload).path())!, "utf8"),
  );
  expect(report.converter).toMatch(/mammoth/i);
  expect(report.structures.paragraphs).toBe(1);
  expect(report.html).toBeUndefined();
  await root
    .getByRole("button", { name: "Replace document", exact: true })
    .click();
  await expect(editor(page)).toContainText("Olá!");
  await editor(page).press("ControlOrMeta+z");
  await expect(editor(page)).toContainText("A better document");
});
test("review proposes, rejects and retains the original accepted content", async ({
  page,
}) => {
  const root = primary(page);
  await tools(root, "Review");
  await root.getByLabel("Suggest changes", { exact: true }).check();
  await editor(page).locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Revised.");
  await expect(root.locator(".document-diff ins")).toContainText("Revised.");
  await root.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(editor(page)).not.toContainText("Revised.");
});
test("renders and downloads a searchable tagged PDF preview", async ({
  page,
}, testInfo) => {
  const root = primary(page);
  await tools(root, "Export and pages");
  await root
    .getByRole("button", { name: "Create PDF preview", exact: true })
    .click();
  await expect(root.locator(".document-pdf")).toBeVisible({ timeout: 40000 });
  const download = page.waitForEvent("download");
  await root.getByRole("button", { name: "Download PDF", exact: true }).click();
  const file = await download;
  await file.saveAs(testInfo.outputPath("document.pdf"));
  expect(await file.failure()).toBeNull();
});
test("templates export validated data without replacing the source", async ({
  page,
}) => {
  await editor(page).fill("Hello {{name}}");
  const root = primary(page);
  await tools(root, "Templates");
  await root.getByRole("button", { name: "Add field", exact: true }).click();
  await root.getByLabel("Field name", { exact: true }).fill("name");
  await root.getByLabel("Required", { exact: true }).check();
  await root
    .getByRole("button", { name: "Preview template", exact: true })
    .click();
  await expect(root.locator("ul[role=status]")).toContainText(
    "Required value is missing.",
  );
  await root.getByLabel("Preview value", { exact: true }).fill("Ana");
  await root
    .getByRole("button", { name: "Preview template", exact: true })
    .click();
  await expect(root.locator(".document-preview")).toContainText("Hello Ana");
  const download = page.waitForEvent("download");
  await root
    .getByRole("button", { name: "Export generated HTML", exact: true })
    .click();
  await expect(editor(page)).toContainText("{{name}}");
  expect((await download).suggestedFilename()).toMatch(/html$/);
});
test("two editors sync typing and local undo preserves a remote edit", async ({
  page,
}) => {
  await page.getByLabel("Two editors", { exact: true }).check();
  const a = primary(page).getByRole("textbox", {
      name: "Collaborative rich text editor",
    }),
    b = page
      .getByTestId("peer")
      .getByRole("textbox", { name: "Collaborative rich text editor" });
  await expect(a).toHaveAttribute("contenteditable", "true");
  await expect(b).toHaveAttribute("contenteditable", "true");
  await a.locator("p").first().click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Ana edit.");
  await expect(b).toContainText("Ana edit.");
  await b.locator("h1").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" Bruno edit.");
  await expect(a).toContainText("Bruno edit.");
  await a.press("ControlOrMeta+z");
  await expect(a).not.toContainText("Ana edit.");
  await expect(a).toContainText("Bruno edit.");
  await expect(b).not.toContainText("Ana edit.");
});
test("Portuguese controls, RTL content and read-only role work together", async ({
  page,
}) => {
  await page.getByLabel("Interface", { exact: true }).selectOption("pt-PT");
  await page.getByLabel("Document language", { exact: true }).fill("pt-PT");
  await page.getByLabel("Direction", { exact: true }).selectOption("rtl");
  const root = primary(page);
  await root
    .getByRole("button", { name: "Ferramentas do documento", exact: false })
    .click();
  await root.getByRole("tab", { name: "Modelos", exact: true }).click();
  await expect(
    root.getByRole("button", { name: "Adicionar campo", exact: true }),
  ).toBeVisible();
  const editable = root.getByRole("textbox", {
    name: "Editor de texto",
    exact: true,
  });
  await expect(editable).toBeVisible();
  await expect(editable.locator("p").first()).toHaveAttribute("dir", "rtl");
  await expect(editable.locator("p").first()).toHaveAttribute("lang", "pt-PT");
  await page.getByLabel("Role", { exact: true }).selectOption("viewer");
  await expect(editable).toHaveAttribute("contenteditable", "false");
});
test("AI proposal stays separate until accepted and undo restores the selection", async ({
  page,
}) => {
  const root = primary(page),
    paragraph = editor(page).locator("p").first();
  await paragraph.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await tools(root, "AI writing");
  await root
    .getByRole("button", { name: "Generate proposal", exact: true })
    .click();
  await expect(root.locator(".document-diff ins")).toContainText("Clear:");
  await expect(paragraph).not.toContainText("Clear:");
  await root
    .getByRole("button", { name: "Accept proposal", exact: true })
    .click();
  await expect(editor(page)).toContainText("Clear:");
  await editor(page).press("ControlOrMeta+z");
  await expect(editor(page)).not.toContainText("Clear:");
});
test("notes and citations can be edited and removed without dangling markers", async ({
  page,
}) => {
  const root = primary(page);
  await tools(root, "References");
  await root.getByLabel("Note text", { exact: true }).fill("Supporting detail");
  await root.getByRole("button", { name: "Add footnote", exact: true }).click();
  await expect(editor(page)).toContainText("Supporting detail");
  await root.getByRole("button", { name: "Edit note", exact: true }).click();
  await root.getByLabel("Note text", { exact: true }).fill("Updated detail");
  await root.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(editor(page)).toContainText("Updated detail");
  await root.getByLabel("Author", { exact: true }).fill("Silva, Ana");
  await root.getByLabel("Title", { exact: true }).fill("Clear writing");
  await root.getByLabel("Year", { exact: true }).fill("2026");
  await root.getByRole("button", { name: "Add source", exact: true }).click();
  await root
    .getByRole("button", { name: "Insert citation", exact: true })
    .click();
  await expect(editor(page)).toContainText("Silva");
  await expect(editor(page)).toContainText("Bibliography");
  await root
    .getByRole("button", { name: "Delete note and references", exact: true })
    .click();
  await expect(editor(page).locator("[data-nle-note]")).toHaveCount(0);
});
