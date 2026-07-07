// Focused diagnostics: template select per-option + height input + placeholder on empty page
import { chromium } from "playwright";

const errors = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

await page.goto("http://localhost:5173/?view=playground", { waitUntil: "networkidle" });
await page.waitForTimeout(400);

// --- template loop with meta-based wait ---
const optionVals = await page.locator("#tpl option").evaluateAll((os) => os.map((o) => o.value));
console.log("options:", optionVals.join(","));
for (const val of optionVals) {
  const metaBefore = (await page.locator(".out-meta").textContent() || "").trim();
  await page.selectOption("#tpl", val);
  // wait until select value took AND meta settles
  await page.waitForTimeout(600);
  const selVal = await page.locator("#tpl").inputValue();
  const meta = (await page.locator(".out-meta").textContent() || "").trim();
  const edSnip = (await page.locator(".editor-content").innerText()).replace(/\s+/g, " ").trim().slice(0, 40);
  const pvSnip = (await page.locator(".out-preview").innerText()).replace(/\s+/g, " ").trim().slice(0, 40);
  console.log(`tpl=${val} sel=${selVal} meta:${metaBefore}->${meta} ed="${edSnip}" pv="${pvSnip}"`);
}

// --- height input diagnostics ---
await page.locator("button", { hasText: "Configure" }).first().click();
await page.waitForTimeout(300);
const numInput = page.locator(".pg-config .num");
console.log("num value before:", await numInput.inputValue());
await numInput.fill("400");
await page.waitForTimeout(400);
console.log("num value after fill:", await numInput.inputValue());
let h = await page.locator(".next-level-editor").evaluate((el) => el.style.height);
console.log("style.height after fill(400):", h);
// try typing instead
await numInput.click({ clickCount: 3 });
await page.keyboard.type("500");
await page.waitForTimeout(400);
console.log("num value after type:", await numInput.inputValue());
h = await page.locator(".next-level-editor").evaluate((el) => el.style.height);
console.log("style.height after type(500):", h);
const box = await page.locator(".next-level-editor").boundingBox();
console.log("box height:", box?.height);

// --- placeholder visible on empty page ---
await page.goto("http://localhost:5173/?empty=true", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const edHtml = await page.locator(".editor-content").innerHTML();
const before = await page.locator(".editor-content").evaluate((el) => getComputedStyle(el, "::before").content);
console.log("empty page editor innerHTML:", JSON.stringify(edHtml));
console.log("empty page ::before:", before);
// change placeholder via config and re-check
await page.locator("button", { hasText: "Configure" }).first().click();
await page.waitForTimeout(300);
await page.locator(".pg-config .text").fill("QA custom placeholder");
await page.waitForTimeout(300);
const before2 = await page.locator(".editor-content").evaluate((el) => getComputedStyle(el, "::before").content);
console.log("empty page ::before after custom:", before2);

console.log("errors:", errors.length, errors.join(" | "));
await browser.close();
