import { test, expect, type Locator } from "@playwright/test";
import {
  createCollaborationServer,
  fileStorage,
} from "../examples/collaboration/server.mjs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Cursor badges annotate the live DOM but are not document prose.
const paragraphText = (editable: Locator) =>
  editable
    .locator("p")
    .first()
    .evaluate((element) => {
      const clone = element.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll(".nle-remote-cursor, .ProseMirror-yjs-cursor")
        .forEach((node) => node.remove());
      return clone.textContent;
    });

test("separate browser contexts merge offline edits, preserve local undo and reload durable state", async ({
  browser,
  baseURL,
}, testInfo) => {
  testInfo.setTimeout(90000);
  const directory = await mkdtemp(join(tmpdir(), "nle-sync-e2e-"));
  const host = createCollaborationServer({
    port: 0,
    storage: fileStorage(directory),
    authorize: async ({ token }: { token: string }) =>
      token === "e2e-fixture"
        ? {
            role: "author",
            user: { id: "fixture", name: "Test author", color: "#2563eb" },
          }
        : null,
  });
  await new Promise<void>((resolve) => host.server.on("listening", resolve));
  let networkPartition = false;
  host.server.on("connection", (socket: { terminate: () => void }) => {
    if (networkPartition) socket.terminate();
  });
  const endpoint = "ws://127.0.0.1:" + host.server.address().port;
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  try {
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    const url =
      baseURL +
      "/?lab=documents&transport=websocket&document=network-fixture&endpoint=" +
      encodeURIComponent(endpoint);
    async function connect(page: (typeof pages)[number]) {
      await page.goto(url);
      await page
        .getByLabel("Access token", { exact: true })
        .fill("e2e-fixture");
      await page
        .getByRole("button", { name: "Connect to server", exact: true })
        .click();
      await expect(
        page.getByRole("textbox", { name: "Collaborative rich text editor" }),
      ).toHaveAttribute("contenteditable", "true");
    }
    await connect(pages[0]);
    await connect(pages[1]);
    const a = pages[0].getByRole("textbox", {
        name: "Collaborative rich text editor",
      }),
      b = pages[1].getByRole("textbox", {
        name: "Collaborative rich text editor",
      });
    await a.locator("p").first().click();
    await pages[0].keyboard.press("End");
    await pages[0].keyboard.type(" Author A.");
    await expect(b).toContainText("Author A.");
    await b.locator("h1").click();
    await pages[1].keyboard.press("End");
    await pages[1].keyboard.type(" Author B.");
    await expect(a).toContainText("Author B.");
    await a.press("ControlOrMeta+z");
    await expect(b).not.toContainText("Author A.");
    await expect(a).toContainText("Author B.");
    await expect
      .poll(() => paragraphText(a))
      .toBe("Write, review, and share a clear story.");
    // Hold both clients offline so these operations share the same original paragraph.
    // Browser offline emulation does not consistently suspend WebSockets in WebKit.
    networkPartition = true;
    host.server.clients.forEach((client: { terminate: () => void }) =>
      client.terminate(),
    );
    await a.locator("p").first().click();
    await pages[0].keyboard.press("End");
    await pages[0].keyboard.type(" Reconnected A.");
    await expect
      .poll(() => paragraphText(a))
      .toBe("Write, review, and share a clear story. Reconnected A.");
    await b
      .locator("p")
      .first()
      .evaluate(async (element) => {
        (element.closest("[contenteditable]") as HTMLElement).focus();
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let text = walker.nextNode();
        while (
          text &&
          (text.parentElement?.closest(".nle-remote-cursor") ||
            !text.textContent)
        )
          text = walker.nextNode();
        if (!text) throw new Error("The paragraph has no prose");
        document.getSelection()?.setPosition(text, 0);
        document.dispatchEvent(new Event("selectionchange"));
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      });
    await pages[1].keyboard.press("Delete");
    await pages[1].keyboard.type("Edited B: ");
    await testInfo.attach("partitioned-edits", {
      body: JSON.stringify({
        first: await a.innerHTML(),
        second: await b.innerHTML(),
      }),
      contentType: "application/json",
    });
    await expect
      .poll(() => paragraphText(b))
      .toBe("Edited B: rite, review, and share a clear story.");
    networkPartition = false;
    await expect
      .poll(() => paragraphText(a), { timeout: 20000 })
      .toBe("Edited B: rite, review, and share a clear story. Reconnected A.");
    await expect
      .poll(() => paragraphText(b), { timeout: 20000 })
      .toBe(await paragraphText(a));
    await b.locator("td").first().click();
    await pages[1].keyboard.press("End");
    await pages[1].keyboard.type(" Reconnected B.");
    await expect(a).toContainText("Reconnected B.", { timeout: 20000 });
    await expect(b).toContainText("Reconnected A.", { timeout: 20000 });
    await connect(pages[0]);
    await expect(
      pages[0].getByRole("textbox", { name: "Collaborative rich text editor" }),
    ).toContainText("Reconnected B.");
    await testInfo.attach("persistence-evidence", {
      body: JSON.stringify({
        storage: "atomic local files",
        independentContexts: 2,
        reconnect: true,
        sameParagraphConcurrentInsertDelete: true,
        localUndo: true,
      }),
      contentType: "application/json",
    });
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await host.close();
  }
});
