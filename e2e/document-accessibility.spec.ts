import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("document panels support keyboard tabs and accessible controls on a narrow screen", async ({
  page,
}, testInfo) => {
  testInfo.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?lab=documents");
  const root = page.getByTestId("primary");
  const trigger = root.getByRole("button", {
    name: "Document tools",
    exact: false,
  });
  await trigger.click();
  const tabs = root.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("End");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(tabs.first()).toBeFocused();
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  for (let index = 0; index < (await tabs.count()); index++) {
    await tabs.nth(index).click();
    const results = await new AxeBuilder({ page })
      .include(".nle-document-tools")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      (await tabs.nth(index).textContent()) ?? "Document panel",
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await tabs.last().focus();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});
