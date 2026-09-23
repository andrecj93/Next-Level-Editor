import { test, expect, type Browser, type Locator, type Page } from "@playwright/test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCollaborationServer, fileStorage } from "../examples/collaboration/server.mjs";
import { switchViewMode } from "./helpers/toolbar";

const editable = (page: Page) => page.getByRole("textbox", { name: "Collaborative rich text editor", exact: true });
async function peers(browser: Browser, baseURL: string, html: string) {
  const directory = await mkdtemp(join(tmpdir(), "nle-rich-sync-"));
  const host = createCollaborationServer({
    port: 0, storage: fileStorage(directory),
    authorize: async ({ token }: { token: string }) => token === "rich-fixture"
      ? { role: "author", user: { id: "fixture", name: "Fixture author", color: "#2563eb" } } : null,
  });
  await new Promise<void>(resolve => host.server.on("listening", resolve));
  let partitioned = false;
  host.server.on("connection", (socket: { terminate: () => void }) => { if (partitioned) socket.terminate(); });
  const endpoint = "ws://127.0.0.1:" + host.server.address().port;
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages = await Promise.all(contexts.map(context => context.newPage()));
  const errors: string[] = [];
  pages.forEach((page, client) => {
    page.on("pageerror", error => { errors.push(error.message); console.error(JSON.stringify({ event: "rich.browser_error", client, message: error.message })); });
  });
  const url = baseURL + "/?lab=documents&transport=websocket&document=rich-fixture&endpoint=" + encodeURIComponent(endpoint);
  const connect = async (page: Page, seed?: string) => {
    await page.goto(url);
    if (seed) {
      await switchViewMode(page, "Code");
      await page.locator(".code-editor").fill(seed);
      await switchViewMode(page, "Editor");
    }
    await page.getByLabel("Access token", { exact: true }).fill("rich-fixture");
    await page.getByRole("button", { name: "Connect to server", exact: true }).click();
    await expect(editable(page)).toHaveAttribute("contenteditable", "true");
  };
  const close = async () => { await Promise.all(contexts.map(context => context.close())); await host.close(); };
  try {
    await connect(pages[0], html);
    await connect(pages[1]);
  } catch (error) { await close(); throw error; }
  return {
    pages, a: editable(pages[0]), b: editable(pages[1]), connect, close, errors,
    partition() { partitioned = true; host.server.clients.forEach((socket: { terminate: () => void }) => socket.terminate()); },
    reconnect() { partitioned = false; },
  };
}

async function caretAtEnd(target: Locator) {
  await target.evaluate(async element => {
    (element.closest("[contenteditable]") as HTMLElement).focus();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let last: Node | null = null, node: Node | null;
    while ((node = walker.nextNode())) if (!node.parentElement?.closest(".nle-remote-cursor, .ProseMirror-widget")) last = node;
    if (!last) throw new Error("Missing fixture text");
    document.getSelection()!.setPosition(last, last.textContent!.length);
    document.dispatchEvent(new Event("selectionchange"));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
}

const cleanText = (target: Locator) => target.evaluate(element => {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".nle-remote-cursor, .ProseMirror-widget").forEach(node => node.remove());
  return clone.textContent;
});

test("a deleted comment passage stays orphaned through concurrent replies and reload", async ({ browser, baseURL }, info) => {
  info.setTimeout(90000);
  const r = await peers(browser, baseURL!, '<p data-nle-id="nle-commented">Repeated passage</p><p data-nle-id="nle-identical">Repeated passage</p>');
  const [a, b] = r.pages;
  const history: { phase: string; documents: string[] }[] = [];
  const record = async (phase: string) => history.push({ phase, documents: await Promise.all([r.a.innerHTML(), r.b.innerHTML()]) });
  try {
    await r.a.locator('p').first().evaluate(async element => {
      (element.closest('[contenteditable]') as HTMLElement).focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    });
    await a.getByRole('toolbar', { name: 'Text formatting toolbar', exact: true }).getByRole('button', { name: 'Insert', exact: true }).click();
    await a.getByRole('menuitem', { name: 'Comment', exact: true }).click();
    const modal = a.getByRole('dialog', { name: 'Add Comment', exact: true });
    await modal.locator('textarea').fill('Keep this discussion');
    await modal.getByRole('button', { name: 'Add Comment', exact: true }).click();
    await expect(r.b.locator('.comment-highlight')).toHaveText('Repeated passage', { timeout: 20000 });
    await a.getByRole('button', { name: 'Close comments sidebar', exact: true }).click();
    await r.b.locator('.comment-highlight').click();
    await expect(b.locator('.comment-thread-card')).toContainText('Keep this discussion');
    await record('comment-created');
    r.partition();
    await r.a.locator('p').first().evaluate(async element => {
      (element.closest('[contenteditable]') as HTMLElement).focus();
      const range = document.createRange();
      range.selectNode(element);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    });
    await a.keyboard.press('Backspace');
    await expect(r.a.locator('.comment-highlight')).toHaveCount(0);
    await record('passage-deleted');
    const card = b.locator('.comment-thread-card');
    await card.getByRole('button', { name: 'Write a reply', exact: true }).click();
    await card.locator('textarea').fill('Reply from the other author');
    await card.getByRole('button', { name: 'Reply', exact: true }).click();
    r.reconnect();
    for (const page of [a, b]) {
      await expect(editable(page).locator('.comment-highlight')).toHaveCount(0, { timeout: 20000 });
      if (!(await page.locator('.comments-sidebar-open').count())) await page.getByRole('button', { name: 'Open comments', exact: true }).click();
      await expect(page.locator('.comment-anchor-notice')).toHaveText('This passage was removed. The discussion is still available.');
      await expect(page.locator('.comment-thread-card')).toContainText('Keep this discussion');
    }
    await a.getByRole('button', { name: 'Close comments sidebar', exact: true }).click();
    await record('reply-merged');
    await r.a.press('ControlOrMeta+z');
    await record('local-undo');
    await expect(r.b.locator('.comment-highlight')).toHaveText('Repeated passage');
    await expect(b.locator('.comment-anchor-notice')).toHaveCount(0);
    await expect(card.locator('.comment-reply')).toContainText('Reply from the other author');
    await r.a.press('ControlOrMeta+y');
    await expect(r.b.locator('.comment-highlight')).toHaveCount(0);
    await r.connect(a);
    await a.getByRole('button', { name: 'Open comments', exact: true }).click();
    await expect(a.locator('.comment-anchor-notice')).toBeVisible();
    const reloaded = a.locator('.comment-thread-card');
    await reloaded.getByRole('button', { name: 'View 1 reply', exact: true }).click();
    await expect(reloaded.locator('.comment-reply')).toContainText('Reply from the other author');
    await expect(editable(a).locator('.comment-highlight')).toHaveCount(0);
    await info.attach('orphaned-discussion', { body: await a.screenshot(), contentType: 'image/png' });
    expect(r.errors).toEqual([]);
  } finally {
    try {
      await record('final');
      await info.attach('comment-anchor-history', { body: JSON.stringify(history, null, 2), contentType: 'application/json' });
    } finally { await r.close(); }
  }
});

test("rich paste converges with a remote edit and remains one local undo", async ({ browser, baseURL }, info) => {
  info.setTimeout(90000);
  const r = await peers(browser, baseURL!, '<p data-nle-id="nle-paste">Paste here.</p><p data-nle-id="nle-remote">Remote paragraph.</p>');
  const [a, b] = r.pages;
  const html = '<h2>Pasted heading</h2><ul><li><p>Parent item</p><ul><li><p>Nested item</p></li></ul></li></ul><table><tbody><tr><td colspan="2"><p>Merged paste</p></td></tr><tr><td><p>Left</p></td><td><p>Right</p></td></tr></tbody></table><p><img alt="Pasted diagram" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XcAAAAASUVORK5CYII=" onerror="window.pasteExecuted=1"><span class="editor-variable" data-variable="customer" data-value="Ana">{{ customer }}</span><a href="javascript:window.pasteExecuted=1">Unsafe link</a></p><script>window.pasteExecuted=1</script>';
  try {
    r.partition();
    await caretAtEnd(r.a.locator('p').first());
    if (info.project.name === 'chromium') {
      await a.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await a.evaluate(async content => {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([content], { type: 'text/html' }),
          'text/plain': new Blob(['Pasted heading'], { type: 'text/plain' }),
        })]);
      }, html);
      await a.keyboard.press('ControlOrMeta+v');
    } else {
      // WebKit does not expose Chromium's programmatic clipboard permission.
      // Exercise the same application event path with both clipboard flavors.
      await r.a.evaluate((element, content) => {
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/html', content);
        clipboardData.setData('text/plain', 'Pasted heading');
        element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }));
      }, html);
    }
    await expect(r.a.locator('h2')).toHaveText('Pasted heading');
    await caretAtEnd(r.b.locator('p').last());
    await b.keyboard.insertText(' Kept from B.');
    r.reconnect();
    const verify = async (editor: Locator) => {
      await expect(editor.locator('h2')).toHaveText('Pasted heading', { timeout: 20000 });
      await expect(editor.locator('ul ul p')).toHaveText('Nested item');
      await expect(editor.locator('td[colspan="2"]')).toHaveText('Merged paste');
      await expect(editor.getByRole('img', { name: 'Pasted diagram', exact: true })).toHaveCount(1);
      await expect(editor.locator('[data-variable]')).toHaveAttribute('data-value', 'Ana');
      await expect(editor).toContainText('Remote paragraph. Kept from B.');
      await expect(editor.locator('script, [onerror], a[href^="javascript:"]')).toHaveCount(0);
    };
    await verify(r.a);
    await verify(r.b);
    await r.a.press('ControlOrMeta+z');
    await expect(r.b.locator('h2, table, ul, [data-variable]')).toHaveCount(0);
    await expect(r.b).toContainText('Remote paragraph. Kept from B.');
    await r.a.press('ControlOrMeta+y');
    await verify(r.b);
    await r.connect(a);
    await verify(editable(a));
    expect(await a.evaluate(() => (window as Window & { pasteExecuted?: number }).pasteExecuted)).toBeUndefined();
    await info.attach('rich-paste-reconnect', { body: JSON.stringify({ clipboard: info.project.name === 'chromium' ? 'system' : 'event', nestedList: true, mergedTable: true, image: true, variable: true, sanitized: true, localUndo: true, durableReload: true }), contentType: 'application/json' });
    expect(r.errors).toEqual([]);
  } finally { await r.close(); }
});

test("a paragraph split preserves a concurrent insertion at its formatting boundary", async ({ browser, baseURL }, info) => {
  info.setTimeout(90000);
  const r = await peers(browser, baseURL!, '<p data-nle-id="nle-marked">Before <strong>Marked passage</strong> After</p><p data-nle-id="nle-next">Next</p>');
  try {
    r.partition();
    await caretAtEnd(r.a.locator("strong"));
    await r.pages[0].keyboard.press("Enter");
    await expect(r.a.locator("p")).toHaveCount(3);
    await caretAtEnd(r.b.locator("strong"));
    await r.pages[1].keyboard.insertText(" by B");
    await expect.poll(() => cleanText(r.b.locator("strong"))).toBe("Marked passage by B");
    r.reconnect();
    await expect.poll(() => cleanText(r.a.locator("strong")), { timeout: 20000 }).toBe("Marked passage by B");
    await expect(r.b.locator("p")).toHaveCount(3);
    await r.a.press("ControlOrMeta+z");
    await expect(r.b.locator("p")).toHaveCount(2);
    await expect.poll(() => cleanText(r.a.locator("strong"))).toBe("Marked passage by B");
    await r.a.press("ControlOrMeta+y");
    await expect(r.b.locator("p")).toHaveCount(3);
    await r.connect(r.pages[0]);
    await expect.poll(() => cleanText(editable(r.pages[0]).locator("strong"))).toBe("Marked passage by B");
    await info.attach("marked-split-reconnect", { body: JSON.stringify({ split: true, boundaryInsertion: "space preserved", localUndo: true, durableReload: true }), contentType: "application/json" });
    expect(r.errors).toEqual([]);
  } finally { await r.close(); }
});

test("nested lists and merged tables preserve both authors through structural edits and reload", async ({ browser, baseURL }, info) => {
  info.setTimeout(90000);
  const r = await peers(browser, baseURL!, '<ul data-nle-id="nle-list"><li><p>Parent</p><ul><li><p>Nested</p></li></ul></li><li><p>Last</p></li></ul><table data-nle-id="nle-table"><tbody><tr><td colspan="2"><p>Merged</p></td></tr><tr><td><p>Left</p></td><td><p>Right</p></td></tr></tbody></table><p data-nle-id="nle-rich"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XcAAAAASUVORK5CYII=" alt="Diagram"> <span class="editor-variable" data-variable="customer" data-value="Ana">{{ customer }}</span></p>');
  try {
    r.partition();
    await caretAtEnd(r.a.locator("ul > li > p").filter({ hasText: /^Last$/ }));
    await r.pages[0].keyboard.press("Enter");
    await r.pages[0].keyboard.insertText("Sibling A");
    await caretAtEnd(r.b.locator("ul ul p"));
    await r.pages[1].keyboard.insertText(" by B");
    await caretAtEnd(r.a.locator("td").last());
    await test.step("Tab appends the last table row", async () => {
      await r.pages[0].keyboard.press("Tab");
      await expect(r.a.locator("tr")).toHaveCount(3);
      await r.pages[0].keyboard.insertText("New row A");
    });
    await caretAtEnd(r.b.locator("td[colspan='2'] p"));
    await r.pages[1].keyboard.insertText(" by B");
    r.reconnect();
    for (const editor of [r.a, r.b]) {
      await expect.poll(() => cleanText(editor.locator("ul ul p")), { timeout: 20000 }).toBe("Nested by B");
      await expect.poll(() => cleanText(editor.locator("td[colspan='2']"))).toBe("Merged by B");
      await expect(editor).toContainText("Sibling A");
      await expect(editor).toContainText("New row A");
      await expect(editor.locator("tr")).toHaveCount(3);
      await expect(editor.getByRole("img", { name: "Diagram", exact: true })).toHaveCount(1);
      await expect(editor.locator("[data-variable]")).toHaveAttribute("data-value", "Ana");
    }
    await r.connect(r.pages[0]);
    await expect(editable(r.pages[0])).toContainText("Merged by B");
    await expect(editable(r.pages[0])).toContainText("New row A");
    await expect(editable(r.pages[0]).locator("ul ul p")).toHaveText("Nested by B");
    await info.attach("rich-structure-reconnect", { body: JSON.stringify({ nestedLists: true, mergedCells: true, insertedRow: true, retainedImageAndVariable: true, durableReload: true }), contentType: "application/json" });
    expect(r.errors).toEqual([]);
  } finally { await r.close(); }
});
