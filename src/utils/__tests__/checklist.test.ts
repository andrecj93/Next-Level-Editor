import { describe, it, expect } from "vitest";
import {
  toggleChecklistItem,
  checklistItemForCheckboxClick,
  checklistItemForNode,
  applyChecklistItemA11y,
  CHECKLIST_CHECKBOX_HIT_PX,
} from "../checklist";

/**
 * Checklist toggle helpers. The checkbox is a CSS ::before in the left gutter
 * of a `<li data-checked>`, so a click toggles only when it lands in that
 * gutter — clicks on the label text must still place a caret for editing.
 */
describe("checklist utils", () => {
  const makeChecklist = (checked: boolean) => {
    const ul = document.createElement("ul");
    ul.className = "checklist";
    const li = document.createElement("li");
    li.setAttribute("data-checked", checked ? "true" : "false");
    li.textContent = "task";
    ul.appendChild(li);
    return { ul, li };
  };

  // getBoundingClientRect returns zeroes in happy-dom (no layout), so stub the
  // li's left edge to exercise the gutter hit-test deterministically.
  const stubLeft = (li: HTMLElement, left: number) => {
    li.getBoundingClientRect = () =>
      ({ left, right: left + 200, top: 0, bottom: 24, width: 200, height: 24, x: left, y: 0, toJSON() {} }) as DOMRect;
  };

  describe("toggleChecklistItem", () => {
    it("flips an unchecked item to checked and returns the new state", () => {
      const { li } = makeChecklist(false);
      expect(toggleChecklistItem(li)).toBe(true);
      expect(li.getAttribute("data-checked")).toBe("true");
    });

    it("flips a checked item back to unchecked", () => {
      const { li } = makeChecklist(true);
      expect(toggleChecklistItem(li)).toBe(false);
      expect(li.getAttribute("data-checked")).toBe("false");
    });

    it("treats a missing/invalid data-checked as unchecked (toggles to checked)", () => {
      const li = document.createElement("li");
      expect(toggleChecklistItem(li)).toBe(true);
      expect(li.getAttribute("data-checked")).toBe("true");
    });

    it("keeps the ARIA checkbox state in sync with data-checked", () => {
      const { li } = makeChecklist(false);
      toggleChecklistItem(li); // → checked
      expect(li.getAttribute("role")).toBe("checkbox");
      expect(li.getAttribute("aria-checked")).toBe("true");
      toggleChecklistItem(li); // → unchecked
      expect(li.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("applyChecklistItemA11y", () => {
    it("stamps role=checkbox and aria-checked reflecting the state", () => {
      const li = document.createElement("li");
      applyChecklistItemA11y(li, true);
      expect(li.getAttribute("role")).toBe("checkbox");
      expect(li.getAttribute("aria-checked")).toBe("true");
      applyChecklistItemA11y(li, false);
      expect(li.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("checklistItemForNode", () => {
    it("resolves the checklist li that contains a caret text node", () => {
      const { li } = makeChecklist(false);
      const textNode = li.firstChild; // the "task" text
      expect(checklistItemForNode(textNode)).toBe(li);
    });

    it("resolves the li from a nested inline element (caret inside bold)", () => {
      const { li } = makeChecklist(false);
      const strong = document.createElement("strong");
      strong.textContent = "milk";
      li.appendChild(strong);
      expect(checklistItemForNode(strong.firstChild)).toBe(li);
    });

    it("returns null for a li in a plain (non-checklist) list", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "x";
      ul.appendChild(li);
      expect(checklistItemForNode(li.firstChild)).toBeNull();
    });

    it("returns null outside any list", () => {
      const p = document.createElement("p");
      p.textContent = "hello";
      expect(checklistItemForNode(p.firstChild)).toBeNull();
      expect(checklistItemForNode(null)).toBeNull();
    });
  });

  describe("checklistItemForCheckboxClick", () => {
    it("returns the li when the click lands in the checkbox gutter", () => {
      const { li } = makeChecklist(false);
      stubLeft(li, 100);
      const hit = checklistItemForCheckboxClick(li, 100 + CHECKLIST_CHECKBOX_HIT_PX - 1);
      expect(hit).toBe(li);
    });

    it("returns null when the click lands on the label text (past the gutter)", () => {
      const { li } = makeChecklist(false);
      stubLeft(li, 100);
      const miss = checklistItemForCheckboxClick(li, 100 + CHECKLIST_CHECKBOX_HIT_PX + 20);
      expect(miss).toBeNull();
    });

    it("resolves the li when the click target is a descendant (e.g. bold span)", () => {
      const { li } = makeChecklist(false);
      const strong = document.createElement("strong");
      strong.textContent = "milk";
      li.appendChild(strong);
      stubLeft(li, 100);
      const hit = checklistItemForCheckboxClick(strong, 100 + 5);
      expect(hit).toBe(li);
    });

    it("returns null for a li in a plain (non-checklist) list", () => {
      const ul = document.createElement("ul");
      const li = document.createElement("li");
      li.textContent = "x";
      ul.appendChild(li);
      stubLeft(li, 100);
      expect(checklistItemForCheckboxClick(li, 105)).toBeNull();
    });

    it("returns null for a non-element target", () => {
      expect(checklistItemForCheckboxClick(null, 100)).toBeNull();
    });
  });
});
