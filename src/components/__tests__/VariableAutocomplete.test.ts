import { describe, it, expect, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import VariableAutocomplete from "../VariableAutocomplete.vue";
import type {
  Variable,
  VariableCategory,
} from "../../composables/useVariables";

// ---------------------------------------------------------------------------
// Fixtures — a small, deterministic set with isolated match targets so we can
// prove each filter path (name / label / description) independently, plus one
// "orphan" whose category is unknown and which has no description (icon
// fallback + missing-description branches).
// ---------------------------------------------------------------------------
const CATEGORIES: VariableCategory[] = [
  { id: "user", name: "User", icon: "👤" },
  { id: "date", name: "Date & Time", icon: "📅" },
  { id: "company", name: "Company", icon: "🏢" },
];

const userName: Variable = {
  id: "user.name",
  name: "user.name",
  label: "Full Name",
  value: "John Doe",
  category: "user",
  description: "The full name of the current user",
};
const userEmail: Variable = {
  id: "user.email",
  name: "user.email",
  label: "Email Address",
  value: "john@example.com",
  category: "user",
  description: "Where mail is delivered",
};
const greeting: Variable = {
  id: "sys.greeting",
  name: "sys.greeting",
  label: "Welcome Banner",
  value: "Hi!",
  category: "user",
  description: "Top of page text",
};
const dateToday: Variable = {
  id: "date.today",
  name: "date.today",
  label: "Date",
  value: "2026-07-09",
  category: "date",
  description: "Calendar day",
};
const companyPhone: Variable = {
  id: "company.phone",
  name: "company.phone",
  label: "Phone",
  value: "+1 555",
  category: "company",
  description: "Support hotline",
};
// unknown category ("nope" is not in CATEGORIES) + no description
const orphan: Variable = {
  id: "misc.thing",
  name: "misc.thing",
  label: "Thing",
  value: "z",
  category: "nope",
};

const VARIABLES: Variable[] = [
  userName,
  userEmail,
  greeting,
  dateToday,
  companyPhone,
  orphan,
];

// Track every wrapper so we always tear down the document-level keydown
// listener the component registers onMounted — otherwise stale listeners from
// one test would react to keydowns dispatched by the next.
let wrappers: VueWrapper<any>[] = [];

function mountAC(overrides: Partial<Record<string, unknown>> = {}) {
  const w = mount(VariableAutocomplete, {
    props: {
      variables: VARIABLES,
      categories: CATEGORIES,
      query: "",
      isOpen: true,
      position: { top: 100, left: 50 },
      ...overrides,
    },
  });
  wrappers.push(w);
  return w;
}

// Fire a real keydown on `document` (the component listens there, not on its
// own root), then flush the reactive re-render.
async function pressKey(w: VueWrapper<any>, key: string) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));
  await w.vm.$nextTick();
}

const itemNames = (w: VueWrapper<any>) =>
  w.findAll(".variable-autocomplete-item-name").map((n) => n.text());

const selectedName = (w: VueWrapper<any>) =>
  w
    .find(".variable-autocomplete-item.is-selected .variable-autocomplete-item-name")
    .text();

afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
});

describe("VariableAutocomplete", () => {
  describe("open / closed / empty rendering", () => {
    it("renders nothing when isOpen is false, even with matching variables", () => {
      const w = mountAC({ isOpen: false });
      expect(w.find(".variable-autocomplete").exists()).toBe(false);
    });

    it("renders the dropdown, header and footer hint when open with matches", () => {
      const w = mountAC();
      expect(w.find(".variable-autocomplete").exists()).toBe(true);
      expect(w.find(".variable-autocomplete-header").text()).toContain(
        "Variables"
      );
      const footer = w.find(".variable-autocomplete-footer");
      expect(footer.exists()).toBe(true);
      expect(footer.text()).toContain("Navigate");
      expect(footer.text()).toContain("Insert");
      expect(footer.text()).toContain("Close");
    });

    it("renders nothing (empty state) when the query matches no variable", () => {
      const w = mountAC({ query: "zzzznomatch" });
      // The whole component is v-if'd out — the empty state IS the absence of
      // the dropdown, there is no dedicated 'no results' row.
      expect(w.find(".variable-autocomplete").exists()).toBe(false);
      expect(w.findAll(".variable-autocomplete-item")).toHaveLength(0);
    });

    it("applies the fixed position via inline style", () => {
      const w = mountAC({ position: { top: 240, left: 88 } });
      const style = w.get(".variable-autocomplete").attributes("style") || "";
      expect(style).toContain("top: 240px");
      expect(style).toContain("left: 88px");
    });
  });

  describe("filtering by the query prop", () => {
    it("shows every variable (in source order) when the query is empty", () => {
      const w = mountAC({ query: "" });
      expect(itemNames(w)).toEqual([
        "user.name",
        "user.email",
        "sys.greeting",
        "date.today",
        "company.phone",
        "misc.thing",
      ]);
    });

    it("filters by name substring", () => {
      const w = mountAC({ query: "email" });
      expect(itemNames(w)).toEqual(["user.email"]);
    });

    it("filters by label substring (label-only match)", () => {
      // 'welcome' appears only in greeting.label ("Welcome Banner")
      const w = mountAC({ query: "welcome" });
      expect(itemNames(w)).toEqual(["sys.greeting"]);
    });

    it("filters by description substring (description-only match)", () => {
      // 'hotline' appears only in companyPhone.description ("Support hotline")
      const w = mountAC({ query: "hotline" });
      expect(itemNames(w)).toEqual(["company.phone"]);
    });

    it("matches case-insensitively", () => {
      const w = mountAC({ query: "PHONE" });
      expect(itemNames(w)).toEqual(["company.phone"]);
    });

    it("can match several variables at once", () => {
      // 'user' is in both user.name and user.email names
      const w = mountAC({ query: "user" });
      expect(itemNames(w)).toEqual(["user.name", "user.email"]);
    });

    it("updates the visible list live when the query prop changes", async () => {
      const w = mountAC({ query: "" });
      expect(itemNames(w)).toHaveLength(6);
      await w.setProps({ query: "email" });
      expect(itemNames(w)).toEqual(["user.email"]);
      await w.setProps({ query: "" });
      expect(itemNames(w)).toHaveLength(6);
    });

    it("caps the empty-query list at 10 items", () => {
      const many: Variable[] = Array.from({ length: 15 }, (_, i) => ({
        id: `v.${i}`,
        name: `v.${i}`,
        label: `Var ${i}`,
        value: String(i),
        category: "user",
      }));
      const w = mountAC({ variables: many, query: "" });
      expect(w.findAll(".variable-autocomplete-item")).toHaveLength(10);
    });

    it("caps a filtered list at 10 items", () => {
      const many: Variable[] = Array.from({ length: 15 }, (_, i) => ({
        id: `match.${i}`,
        name: `match.${i}`,
        label: `Var ${i}`,
        value: String(i),
        category: "user",
      }));
      const w = mountAC({ variables: many, query: "match" });
      expect(w.findAll(".variable-autocomplete-item")).toHaveLength(10);
    });
  });

  describe("category icons (per-item)", () => {
    it("renders each variable's category as a stroke SVG icon (no emoji in chrome), with a tag fallback for unknown categories", () => {
      const w = mountAC({ query: "" });
      const icons = w.findAll(".variable-autocomplete-item-icon");
      // order follows VARIABLES: user, user, user, date, company, unknown
      expect(icons).toHaveLength(6);
      const paths = icons.map((n) => n.find("svg path").attributes("d"));
      // Same category -> same icon path; unknown falls back to the tag icon.
      expect(paths[0]).toBe(paths[1]);
      expect(paths[0]).toBe(paths[2]);
      expect(paths[3]).not.toBe(paths[0]); // date differs from user
      expect(paths[4]).not.toBe(paths[0]); // company differs from user
      expect(paths[5]).toMatch(/^M12 2H2/); // DEFAULT_ICON_PATH (tag shape)
      // And absolutely no emoji anywhere in the item icons.
      for (const icon of icons) {
        expect(icon.text()).toBe("");
      }
    });
  });

  describe("item content rendering", () => {
    it("shows name + label, and only renders the description block when present", () => {
      const w = mountAC({ query: "" });
      const items = w.findAll(".variable-autocomplete-item");

      // First item (userName) has a description
      const first = items[0];
      expect(first.find(".variable-autocomplete-item-name").text()).toBe(
        "user.name"
      );
      expect(first.find(".variable-autocomplete-item-label").text()).toBe(
        "Full Name"
      );
      expect(
        first.find(".variable-autocomplete-item-description").exists()
      ).toBe(true);
      expect(
        first.find(".variable-autocomplete-item-description").text()
      ).toBe("The full name of the current user");

      // Last item (orphan) has no description
      const last = items[items.length - 1];
      expect(
        last.find(".variable-autocomplete-item-description").exists()
      ).toBe(false);
    });
  });

  describe("keyboard navigation (document-level keydown)", () => {
    it("selects the first item by default", () => {
      const w = mountAC({ query: "" });
      expect(selectedName(w)).toBe("user.name");
    });

    it("ArrowDown moves the selection down, clamping at the last item", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "ArrowDown");
      expect(selectedName(w)).toBe("user.email");
      await pressKey(w, "ArrowDown");
      expect(selectedName(w)).toBe("sys.greeting");

      // Drive past the end — it must clamp on the last item (6 items → idx 5)
      for (let i = 0; i < 10; i++) await pressKey(w, "ArrowDown");
      expect(selectedName(w)).toBe("misc.thing");
    });

    it("ArrowUp moves the selection up, clamping at the first item", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "ArrowDown");
      await pressKey(w, "ArrowDown");
      expect(selectedName(w)).toBe("sys.greeting");

      await pressKey(w, "ArrowUp");
      expect(selectedName(w)).toBe("user.email");

      // Drive past the top — clamps at index 0
      for (let i = 0; i < 5; i++) await pressKey(w, "ArrowUp");
      expect(selectedName(w)).toBe("user.name");
    });

    it("Enter emits select with the highlighted variable", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "ArrowDown"); // -> user.email
      await pressKey(w, "Enter");

      const sel = w.emitted("select");
      expect(sel).toBeTruthy();
      expect(sel).toHaveLength(1);
      expect(sel![0][0]).toEqual(userEmail);
    });

    it("Tab also emits select (treated like Enter)", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "Tab");
      const sel = w.emitted("select");
      expect(sel).toBeTruthy();
      expect(sel![0][0]).toEqual(userName);
    });

    it("Escape emits close", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "Escape");
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("close")).toHaveLength(1);
      expect(w.emitted("select")).toBeUndefined();
    });

    it("ignores keys entirely when closed", async () => {
      const w = mountAC({ isOpen: false });
      await pressKey(w, "Enter");
      await pressKey(w, "Escape");
      await pressKey(w, "ArrowDown");
      expect(w.emitted("select")).toBeUndefined();
      expect(w.emitted("close")).toBeUndefined();
    });

    it("ignores keys (incl. Escape) when the filter yields no matches", async () => {
      // The handler short-circuits on an empty list before reaching the switch,
      // so even Escape is a no-op while there are no results.
      const w = mountAC({ query: "zzzznomatch" });
      await pressKey(w, "Enter");
      await pressKey(w, "Escape");
      await pressKey(w, "ArrowDown");
      expect(w.emitted("select")).toBeUndefined();
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("mouse interaction", () => {
    it("mouseenter moves the highlight to the hovered item", async () => {
      const w = mountAC({ query: "" });
      const items = w.findAll(".variable-autocomplete-item");
      await items[3].trigger("mouseenter");
      expect(selectedName(w)).toBe("date.today");
      // and a keyboard Enter now selects that hovered item
      await pressKey(w, "Enter");
      expect(w.emitted("select")![0][0]).toEqual(dateToday);
    });

    it("clicking an item emits select with that exact variable", async () => {
      const w = mountAC({ query: "" });
      const items = w.findAll(".variable-autocomplete-item");
      await items[4].trigger("click"); // company.phone
      const sel = w.emitted("select");
      expect(sel).toBeTruthy();
      expect(sel).toHaveLength(1);
      expect(sel![0][0]).toEqual(companyPhone);
    });
  });

  describe("selectedIndex reset watchers", () => {
    it("resets the highlight to the first item when the query changes", async () => {
      const w = mountAC({ query: "" });
      await pressKey(w, "ArrowDown"); // highlight user.email
      expect(selectedName(w)).toBe("user.email");

      await w.setProps({ query: "user" }); // list -> [user.name, user.email]
      expect(itemNames(w)).toEqual(["user.name", "user.email"]);
      // watcher on query forced the highlight back to the top
      expect(selectedName(w)).toBe("user.name");
    });

    it("clamps the highlight when the variables list shrinks below the current index", async () => {
      const w = mountAC({ query: "" });
      for (let i = 0; i < 6; i++) await pressKey(w, "ArrowDown"); // -> last (misc.thing)
      expect(selectedName(w)).toBe("misc.thing");

      // Shrink to two items WITHOUT touching the query, so only the
      // filteredVariables watcher runs (index 5 >= length 2 -> clamp to 1)
      await w.setProps({ variables: [userName, userEmail] });
      expect(itemNames(w)).toEqual(["user.name", "user.email"]);
      expect(selectedName(w)).toBe("user.email");
    });
  });

  describe("teardown", () => {
    it("removes its document keydown listener on unmount (no emits after)", async () => {
      const w = mountAC({ query: "" });
      w.unmount();
      // Not tracked-for-teardown twice is fine; unmount is idempotent enough.
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(w.emitted("select")).toBeUndefined();
      expect(w.emitted("close")).toBeUndefined();
    });
  });
});
