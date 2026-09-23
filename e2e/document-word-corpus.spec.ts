import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  corpusNames,
  wordCorpus,
  type WordCorpusCase,
  type EncodedImages,
} from "./helpers/word-corpus";

const primary = (page: Page) => page.getByTestId("primary");
const editor = (page: Page) =>
  primary(page).getByRole("textbox", { name: "Rich text editor", exact: true });
async function tools(page: Page, tab: string) {
  const root = primary(page),
    button = root.getByRole("button", { name: "Document tools", exact: false });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
  await root.getByRole("tab", { name: tab, exact: true }).click();
  return root;
}
async function images(page: Page): Promise<EncodedImages> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#c04030";
    context.fillRect(0, 0, 2, 2);
    return {
      jpeg: canvas.toDataURL("image/jpeg"),
      webp: canvas.toDataURL("image/webp"),
    };
  });
}
async function preserves(root: Locator, fixture: WordCorpusCase) {
  await expect(root).toHaveText(fixture.text, { useInnerText: false });
  for (const [selector, texts] of Object.entries(fixture.matches))
    await expect(root.locator(selector)).toHaveText(texts);
  const pictures = fixture.images ?? [];
  await expect(root.locator("img")).toHaveCount(pictures.length);
  for (let index = 0; index < pictures.length; index++) {
    const image = root.locator("img").nth(index),
      expected = pictures[index];
    expect((await image.getAttribute("alt")) ?? "").toBe(expected.alt);
    expect(await image.getAttribute("src")).toMatch(
      new RegExp(`^data:image/${expected.mime};base64,`),
    );
    const dimensions = await image.evaluate(
      async (element: HTMLImageElement) => {
        await element.decode();
        return { width: element.naturalWidth, height: element.naturalHeight };
      },
    );
    expect(dimensions).toEqual({
      width: expected.width,
      height: expected.height,
    });
  }
}
async function prepare(page: Page) {
  await page.goto("/?lab=documents");
  await expect(editor(page)).toContainText("A better document");
  await editor(page).fill("Keep original draft.");
  await editor(page).press("Home");
  for (let index = 0; index < 5; index++)
    await editor(page).press("ArrowRight");
}
for (const name of corpusNames) {
  test(`Word corpus ${name}: preview, replace, exact undo and redo`, async ({
    page,
  }, info) => {
    await prepare(page);
    const fixture = wordCorpus(name, await images(page)),
      before = await editor(page).innerHTML();
    const external: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (
        /^https?:$/.test(url.protocol) &&
        !["localhost", "127.0.0.1"].includes(url.hostname)
      )
        external.push(url.origin);
    });
    const root = await tools(page, "Import Word");
    await root
      .getByLabel("Choose a Word document")
      .setInputFiles({
        name: name + ".docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: fixture.bytes,
      });
    const preview = root.locator(".document-preview");
    await expect(preview).toBeVisible();
    await preserves(preview, fixture);
    await expect(editor(page)).toHaveJSProperty("innerHTML", before);
    const download = page.waitForEvent("download");
    await root
      .getByRole("button", { name: "Download conversion report", exact: true })
      .click();
    const report = JSON.parse(
      await readFile((await (await download).path())!, "utf8"),
    );
    expect(report.converter).toBe("mammoth 1.12.3");
    expect(report.structures).toEqual({
      paragraphs: await preview.locator("p").count(),
      headings: await preview.locator("h1,h2,h3,h4,h5,h6").count(),
      tables: await preview.locator("table").count(),
      images: fixture.images?.length ?? 0,
    });
    expect(report.html).toBeUndefined();
    await info.attach("corpus-evidence", {
      body: JSON.stringify(
        {
          fixture: name,
          sha256: fixture.sha256,
          bytes: fixture.bytes.length,
          report,
        },
        null,
        2,
      ),
      contentType: "application/json",
    });
    await root
      .getByRole("button", { name: "Replace document", exact: true })
      .click();
    await preserves(editor(page), fixture);
    const imported = await editor(page).innerHTML();
    await editor(page).press("ControlOrMeta+z");
    await expect(editor(page)).toHaveJSProperty("innerHTML", before);
    await editor(page).press("ControlOrMeta+Shift+z");
    await expect(editor(page)).toHaveJSProperty("innerHTML", imported);
    await preserves(editor(page), fixture);
    expect(external).toEqual([]);
    if (
      name === "headings-and-nested-lists" ||
      name === "merged-and-nested-tables"
    ) {
      // A real edit after conversion must retain the imported structure.
      await editor(page).locator(":scope > p").last().click();
      await page.keyboard.press("End");
      await page.keyboard.type(" Edited after import.");
      await expect(editor(page)).toContainText("Edited after import.");
      await editor(page).press("ControlOrMeta+z");
      await expect(editor(page)).toHaveJSProperty("innerHTML", imported);
      await tools(page, "Versions");
      await root.getByLabel("Checkpoint name", { exact: true }).fill(name);
      await root
        .getByRole("button", { name: "Save checkpoint", exact: true })
        .click();
      await expect(root.getByText(name, { exact: true })).toBeVisible();
      await page.reload();
      // The lab opens its starter document. Persisted versions are explicitly
      // restored, never silently substituted for the host's current draft.
      await tools(page, "Versions");
      const saved = root.locator(".document-card").filter({
        has: page.getByText(name, { exact: true }),
      });
      await expect(saved).toBeVisible();
      await saved.getByRole("button", { name: "Restore", exact: true }).click();
      await preserves(editor(page), fixture);
      await expect(editor(page)).toHaveJSProperty("innerHTML", imported);
    }
  });
}

for (const tag of ["p", "h2"] as const)
  test(`inserting a rich Word document splits the selected ${tag} and undoes once`, async ({
    page,
  }) => {
    await prepare(page);
    await editor(page).evaluate((element, tag) => {
      element.innerHTML = `<${tag}>Left edge|Right edge</${tag}>`;
      element.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          inputType: "insertFromPaste",
        }),
      );
    }, tag);
    await editor(page).focus();
    await editor(page).evaluate((element) => {
      const text = element.firstElementChild!.firstChild!;
      const range = document.createRange();
      range.setStart(text, 9);
      range.setEnd(text, 10);
      const selection = document.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    });
    // WebKit can return an empty Selection.toString() for an editable while
    // retaining the correct Range. Check the text, endpoints and ownership;
    // the subsequent insertion and exact undo/redo still verify the edit.
    expect(await editor(page).evaluate(element => {
      const selection = document.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      return {
        text: range?.toString(), collapsed: range?.collapsed,
        start: range?.startOffset, end: range?.endOffset,
        contained: Boolean(range && element.contains(range.commonAncestorContainer)),
      };
    })).toEqual({ text: "|", collapsed: false, start: 9, end: 10, contained: true });
    const before = await editor(page).innerHTML();
    const fixture = wordCorpus("merged-and-nested-tables", await images(page));
    const root = await tools(page, "Import Word");
    await root
      .getByLabel("Choose a Word document")
      .setInputFiles({
        name: "rich-insertion.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: fixture.bytes,
      });
    await preserves(root.locator(".document-preview"), fixture);
    await root
      .getByRole("button", { name: "Insert at selection", exact: true })
      .click();
    await expect(editor(page)).toHaveText(
      "Left edge" + fixture.text + "Right edge",
    );
    await expect(editor(page).locator(`:scope > ${tag}`).first()).toHaveText(
      "Left edge",
    );
    await expect(editor(page).locator(`:scope > ${tag}`).last()).toHaveText(
      "Right edge",
    );
    await expect(
      editor(page).locator("p > table, p > ol, h2 > table, h2 > ol"),
    ).toHaveCount(0);
    const inserted = await editor(page).innerHTML();
    await editor(page).press("ControlOrMeta+z");
    await expect(editor(page)).toHaveJSProperty("innerHTML", before);
    await editor(page).press("ControlOrMeta+Shift+z");
    await expect(editor(page)).toHaveJSProperty("innerHTML", inserted);
  });
