import { test, expect, type Page } from "@playwright/test";
const primary = (page: Page) => page.getByTestId("primary");
const editor = (page: Page) =>
  primary(page).getByRole("textbox", { name: "Rich text editor", exact: true });
async function view(page: Page, label: string) {
  const root = primary(page);
  if ((page.viewportSize()?.width ?? 1280) < 768) {
    const expand = root.getByRole("button", {
      name: "Expand toolbar",
      exact: true,
    });
    if (await expand.isVisible()) await expand.click();
    await root.getByRole("button", { name: "More", exact: true }).click();
    await page.getByRole("menuitem", { name: label, exact: true }).click();
  } else await root.getByRole("button", { name: label, exact: true }).click();
}
async function seed(page: Page, count = 22) {
  await page.goto("/?lab=documents");
  const root = primary(page);
  await expect(editor(page)).toContainText("A better document");
  if ((page.viewportSize()?.width ?? 1280) < 768)
    await expect(
      root.getByRole("button", { name: "Expand toolbar", exact: true }),
    ).toBeVisible();
  await view(page, "Code view");
  const html = Array.from(
    { length: count },
    (_, index) =>
      `${index ? `<div class="page-break" data-nle-id="nle-break-${index}" lang="en" dir="auto"></div>` : ""}<h2 data-nle-id="nle-heading-${index}" lang="en" dir="auto">Page section ${index + 1}</h2><p data-nle-id="nle-paragraph-${index}" lang="en" dir="auto">Readable text on page ${index + 1} — Olá.</p>`,
  ).join("");
  await root.locator(".code-editor").fill(html);
  await view(page, "Editor view");
  await editor(page).locator("p").first().click();
  await editor(page).press("Home");
  for (let i = 0; i < 4; i++) await editor(page).press("ArrowRight");
}
async function open(page: Page) {
  const root = primary(page);
  await root
    .getByRole("button", { name: "Document tools", exact: false })
    .click();
  await root
    .getByRole("tab", { name: "Export and pages", exact: true })
    .click();
  return root;
}
const caret = (page: Page) =>
  editor(page).evaluate((root) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !root.contains(selection.focusNode))
      return null;
    const range = document.createRange();
    range.selectNodeContents(root);
    range.setEnd(selection.focusNode!, selection.focusOffset);
    return {
      precedingText: range.toString(),
      collapsed: selection.isCollapsed,
    };
  });

test("PDF pages support keyboard, narrow reflow and returning to the original caret", async ({
  page,
}, info) => {
  await seed(page);
  const selection = await caret(page);
  expect(selection?.collapsed).toBe(true);
  const root = await open(page);
  await root
    .getByRole("combobox", { name: "Paper", exact: true })
    .selectOption("Letter");
  await root
    .getByRole("combobox", { name: "Orientation", exact: true })
    .selectOption("landscape");
  await root
    .getByRole("button", { name: "Save page settings", exact: true })
    .click();
  // Preview/navigation must preserve the saved document, including exact undo.
  const before = await editor(page).innerHTML();
  await root
    .getByRole("button", { name: "Create PDF preview", exact: true })
    .click();
  const preview = root.getByRole("region", {
    name: "PDF preview",
    exact: true,
  });
  await expect(preview.getByRole("status")).toHaveText("Page 1 of 22", {
    timeout: 40000,
  });
  await expect(
    editor(page),
    "Creating a preview preserves editor HTML",
  ).toHaveJSProperty("innerHTML", before);
  await preview.getByText("Page text", { exact: true }).click();
  await expect(preview.locator("pre")).toContainText("Readable text on page 1");
  const geometry = await preview.locator("canvas").boundingBox();
  expect(geometry!.width / geometry!.height).toBeGreaterThan(1.2);
  await preview.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(preview.getByRole("status")).toHaveText("Page 2 of 22");
  await expect(preview.locator("pre")).toContainText("Readable text on page 2");
  const pageArea = preview.locator(".pdf-canvas-container");
  await pageArea.focus();
  await pageArea.press("PageDown");
  await expect(preview.getByRole("status")).toHaveText("Page 3 of 22");
  await pageArea.press("End");
  await expect(preview.getByRole("status")).toHaveText("Page 22 of 22");
  await pageArea.press("Home");
  await expect(preview.getByRole("status")).toHaveText("Page 1 of 22");
  await preview
    .getByRole("spinbutton", { name: "Go to page", exact: true })
    .fill("999");
  await preview
    .getByRole("spinbutton", { name: "Go to page", exact: true })
    .press("Enter");
  await expect(preview.getByRole("status")).toHaveText("Page 22 of 22");
  await expect(
    preview.getByRole("spinbutton", { name: "Go to page", exact: true }),
  ).toHaveValue("22");
  await expect(preview.locator("pre")).toContainText(
    "Readable text on page 22",
  );
  await expect(
    editor(page),
    "Page navigation preserves editor HTML",
  ).toHaveJSProperty("innerHTML", before);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect
    .poll(() => pageArea.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBeLessThanOrEqual(1);
  await expect(preview.getByRole("status")).toHaveText("Page 22 of 22");
  await preview
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await expect(preview.getByRole("status")).toHaveText("Page 21 of 22");
  await pageArea.scrollIntoViewIfNeeded();
  await expect(
    editor(page),
    "Narrow preview preserves editor HTML",
  ).toHaveJSProperty("innerHTML", before);
  await page.screenshot({
    path: info.outputPath("page-preview-narrow.png"),
    // Playwright's caret hiding otherwise leaves style="" on noneditable breaks.
    caret: "initial",
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await root.getByRole("button", { name: "Download PDF", exact: true }).click();
  const file = await download;
  await file.saveAs(info.outputPath("preview-document.pdf"));
  expect(await file.failure()).toBeNull();
  await expect(
    editor(page),
    "Downloading the existing preview preserves editor HTML",
  ).toHaveJSProperty("innerHTML", before);
  await preview
    .getByRole("button", { name: "Return to writing", exact: true })
    .click();
  await expect(editor(page)).toBeFocused();
  expect(await caret(page)).toEqual(selection);
  await expect(editor(page)).toHaveJSProperty("innerHTML", before);
  await page.keyboard.type("NEW");
  await expect(editor(page).locator("p").first()).toContainText(
    "ReadNEWable text",
  );
  await editor(page).press("ControlOrMeta+z");
  await expect(editor(page)).toHaveJSProperty("innerHTML", before);
});

test("a preview load failure preserves download and editor selection", async ({
  page,
}) => {
  await page.route("**/pdf.min-*.mjs", (route) => route.abort());
  await seed(page, 2);
  const before = await editor(page).innerHTML(),
    selection = await caret(page);
  const root = await open(page);
  await root
    .getByRole("button", { name: "Create PDF preview", exact: true })
    .click();
  const preview = root.getByRole("region", {
    name: "PDF preview",
    exact: true,
  });
  await expect(preview.getByRole("alert")).toContainText("Download the PDF", {
    timeout: 40000,
  });
  const download = page.waitForEvent("download");
  await root.getByRole("button", { name: "Download PDF", exact: true }).click();
  expect(await (await download).failure()).toBeNull();
  await preview
    .getByRole("button", { name: "Return to writing", exact: true })
    .click();
  await expect(editor(page)).toBeFocused();
  expect(await caret(page)).toEqual(selection);
  await expect(editor(page)).toHaveJSProperty("innerHTML", before);
});

test("preview disposal, regeneration and Escape leave the current document editable", async ({
  page,
}) => {
  await seed(page, 2);
  const selection = await caret(page);
  const root = await open(page);
  await root
    .getByRole("button", { name: "Create PDF preview", exact: true })
    .click();
  const preview = root.getByRole("region", {
    name: "PDF preview",
    exact: true,
  });
  await expect(preview.getByRole("status")).toHaveText("Page 1 of 2", {
    timeout: 40000,
  });
  await preview.locator(".pdf-canvas-container").focus();
  await preview.locator(".pdf-canvas-container").press("Escape");
  await expect(editor(page)).toBeFocused();
  expect(await caret(page)).toEqual(selection);
  await page.keyboard.type("Changed ");
  const changedSelection = await caret(page);
  await open(page);
  await expect(preview).toHaveCount(0);
  await root
    .getByRole("button", { name: "Create PDF preview", exact: true })
    .click();
  await expect(preview.getByRole("status")).toHaveText("Page 1 of 2", {
    timeout: 40000,
  });
  await preview.getByText("Page text", { exact: true }).click();
  await expect(preview.locator("pre")).toContainText("Changed");
  await preview
    .getByRole("button", { name: "Return to writing", exact: true })
    .click();
  expect(await caret(page)).toEqual(changedSelection);
});
