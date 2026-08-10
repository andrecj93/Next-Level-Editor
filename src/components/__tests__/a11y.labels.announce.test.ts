import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import TablePropertiesModal from "../TablePropertiesModal.vue";
import FindReplaceModal from "../FindReplaceModal.vue";

/**
 * Two WCAG Level-A/AA failures flagged by the ultra-audit:
 * - Every input in Cell/Table Properties was programmatically unlabeled — the
 *   <label> elements had no for/id association, so screen readers announced
 *   bare "edit text"/"combo box" and clicking a label focused nothing
 *   (WCAG 1.3.1, 3.3.2, 4.1.2).
 * - Find & Replace's "X of N" / "No matches" status was never announced
 *   (no role=status / aria-live — WCAG 4.1.3), and the "No matches" red
 *   (#ef4444, 3.76:1 on white) failed AA contrast (WCAG 1.4.3).
 */

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("TablePropertiesModal — every control is labeled", () => {
  const assertAllLabelsAssociated = () => {
    const labels = Array.from(document.body.querySelectorAll("label"));
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      const wrapsControl =
        label.querySelector("input, select, textarea") !== null;
      const forId = label.getAttribute("for");
      const pointsAtControl =
        !!forId && document.body.querySelector(`#${CSS.escape(forId)}`) !== null;
      expect(
        wrapsControl || pointsAtControl,
        `label "${label.textContent?.trim()}" is not associated with a control`
      ).toBe(true);
    }
  };

  const open = () =>
    mount(TablePropertiesModal, {
      props: { show: true, mode: "both" } as Record<string, unknown>,
    } as never) as VueWrapper;

  it("associates every label on the Cell Properties tab", () => {
    wrapper = open();
    assertAllLabelsAssociated();
  });

  it("associates every label on the Table Properties tab", async () => {
    wrapper = open();
    const tableTab = Array.from(
      document.body.querySelectorAll("button")
    ).find((b) => b.textContent?.includes("Table Properties"))!;
    tableTab.click();
    await wrapper.vm.$nextTick();
    assertAllLabelsAssociated();
  });
});

describe("FindReplaceModal — search status is announced and readable", () => {
  it("exposes the match counter as a live status region", () => {
    // FindReplaceModal teleports to body; stub teleport so wrapper.find reaches
    // its content (mirrors FindReplaceModal.test.ts).
    wrapper = mount(FindReplaceModal, {
      props: { show: true, content: "<p>cat cat</p>" },
      global: { stubs: { teleport: true } },
    });

    const status = wrapper.get(".search-info");
    expect(status.attributes("role")).toBe("status");
    expect(status.attributes("aria-atomic")).toBe("true");
    expect(status.attributes("aria-live")).toBe("polite");
  });

  it("does not hardcode the failing #ef4444 for 'No matches'", () => {
    const sfc = readFileSync(
      resolve(process.cwd(), "src/components/FindReplaceModal.vue"),
      "utf-8"
    );
    // Whole <style> block: the whole file must be free of the sub-AA red on
    // .no-matches, and must carry a dark-theme override for it.
    expect(sfc).toMatch(/\.no-matches\s*\{/);
    expect(sfc).not.toContain("#ef4444");
    expect(sfc).toMatch(/theme-dark[^{]*\.no-matches/);
  });
});
