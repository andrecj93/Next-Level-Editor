import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import TablePropertiesModal from "../TablePropertiesModal.vue";

// TablePropertiesModal renders through <teleport to="body">, so the live form
// lives in `document.body`, NOT inside the VueWrapper's root element
// (`wrapper.find(...)` cannot reach teleported nodes). We therefore query
// document.body for the DOM and read `wrapper.emitted()` for the component's
// output — exactly the split the sibling *.mode.test.ts uses (it asserts against
// document.body.textContent). We still drive v-model through REAL native events
// (input/change/click) so Vue's real two-way binding runs; only the DOM lookup
// crosses the teleport boundary. Every test unmounts to clear the teleported
// subtree from the shared <body> before the next one.
//
// happy-dom caveats honestly noted below where they bite: no layout engine
// (scoped-CSS positioning is untestable) and number <input> does NOT clamp to
// min/max on value-set (the browser doesn't either — clamping only happens via
// the spinner UI / stepUp) so "validation" here is the HTML min/max contract,
// not JS clamping the component does not perform.

type ModalProps = Record<string, unknown>;

const openModal = (props: ModalProps = {}) =>
  mount(TablePropertiesModal, {
    // `mode` is typed required but has a runtime default; cast so the helper can
    // open with just `show` (individual tests override mode/initial* via props).
    props: { show: true, ...props } as Record<string, unknown>,
  } as never) as VueWrapper;

// --- teleport-aware DOM helpers (all scoped to the live document.body) --------
const q = <T extends Element = HTMLElement>(sel: string): T | null =>
  document.body.querySelector(sel) as T | null;

const qq = (sel: string): HTMLElement[] =>
  Array.from(document.body.querySelectorAll(sel)) as HTMLElement[];

const bodyText = () => document.body.textContent || "";

// Find the .property-group whose <label> text exactly matches (the inputs are
// siblings of the label, so we scope input lookups through the group).
const group = (labelText: string): HTMLElement => {
  const found = qq(".property-group").find(
    (g) => (g.querySelector("label")?.textContent || "").trim() === labelText
  );
  if (!found) throw new Error(`property-group not found for label "${labelText}"`);
  return found;
};

const inGroup = <T extends Element = HTMLElement>(
  labelText: string,
  sel: string
): T => {
  const el = group(labelText).querySelector(sel);
  if (!el) throw new Error(`"${sel}" not found in group "${labelText}"`);
  return el as unknown as T;
};

// An alignment .btn-option identified by its (unique) visible label.
const optionBtn = (text: string): HTMLElement => {
  const btn = qq(".btn-option").find(
    (b) => (b.textContent || "").trim() === text
  );
  if (!btn) throw new Error(`.btn-option "${text}" not found`);
  return btn;
};

// --- real-event drivers -------------------------------------------------------
const setText = async (el: HTMLInputElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("input"));
  await nextTick();
};

const setSelect = async (el: HTMLSelectElement, value: string) => {
  el.value = value;
  el.dispatchEvent(new Event("change"));
  await nextTick();
};

const toggle = async (el: HTMLInputElement) => {
  el.checked = !el.checked;
  el.dispatchEvent(new Event("change"));
  await nextTick();
};

const click = async (el: HTMLElement) => {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await nextTick();
};

// Emitted payload of the single most-recent apply.
const lastApply = (w: VueWrapper) => {
  const events = w.emitted("apply");
  return events![events!.length - 1][0] as {
    cellProps?: Record<string, unknown>;
    tableProps?: Record<string, unknown>;
  };
};

let wrapper: VueWrapper | null = null;
const track = (w: VueWrapper) => (wrapper = w);

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("TablePropertiesModal — field set", () => {
  describe("which fields render for each mode", () => {
    it("cell mode renders every cell control and no table-only control", () => {
      track(openModal({ mode: "cell" }));

      // Cell controls present.
      expect(inGroup("Background Color", "input[type=color]")).toBeTruthy();
      expect(inGroup("Background Color", "input[type=text]")).toBeTruthy();
      expect(qq(".btn-option").map((b) => b.textContent?.trim())).toEqual([
        "left", "center", "right", "justify", // horizontal
        "top", "middle", "bottom",            // vertical
      ]);
      expect(inGroup("Padding (px)", "input[type=number]")).toBeTruthy();
      expect(inGroup("Width", "input[type=text]")).toBeTruthy();
      expect(inGroup("Height", "input[type=text]")).toBeTruthy();

      // Table-only controls absent.
      expect(bodyText()).not.toContain("Border Style");
      expect(bodyText()).not.toContain("Border Width");
      expect(bodyText()).not.toContain("Collapse Borders");
      expect(q("select.select-input")).toBeNull();
    });

    it("table mode renders every table control and no cell-only control", () => {
      track(openModal({ mode: "table" }));

      expect(inGroup("Border Style", "select.select-input")).toBeTruthy();
      expect(inGroup("Border Width (px)", "input[type=number]")).toBeTruthy();
      expect(inGroup("Border Color", "input[type=color]")).toBeTruthy();
      expect(inGroup("Border Color", "input[type=text]")).toBeTruthy();
      expect(inGroup("Table Width", "input[type=text]")).toBeTruthy();
      expect(inGroup("Background Color", "input[type=color]")).toBeTruthy();
      expect(inGroup("Collapse Borders", "input[type=checkbox]")).toBeTruthy();

      // Cell-only controls absent.
      expect(bodyText()).not.toContain("Vertical Alignment");
      expect(bodyText()).not.toContain("Horizontal Alignment");
      expect(bodyText()).not.toContain("Padding");
    });

    it("both mode shows the tab strip and defaults to the cell form", () => {
      track(openModal({ mode: "both" }));
      expect(qq(".tab").map((t) => t.textContent?.trim())).toEqual([
        "Cell Properties",
        "Table Properties",
      ]);
      // Default visible tab is the cell form.
      expect(bodyText()).toContain("Horizontal Alignment");
      expect(bodyText()).not.toContain("Border Style");
    });
  });

  describe("cell field bindings + change events", () => {
    it("background color: text and color inputs share one model, Clear empties it", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      const textInput = inGroup<HTMLInputElement>("Background Color", "input[type=text]");
      const colorInput = inGroup<HTMLInputElement>("Background Color", "input[type=color]");

      await setText(textInput, "#ff0000");
      // The sibling color input mirrors the same v-model value.
      expect(colorInput.value).toBe("#ff0000");

      await click(inGroup("Background Color", ".btn-clear"));
      expect(textInput.value).toBe("");

      await click(q(".btn-primary")!);
      expect(lastApply(w).cellProps!.backgroundColor).toBe("");
    });

    it("horizontal alignment buttons set the value and mark the active one", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      // Default is 'left' -> its button is active.
      expect(optionBtn("left").classList.contains("active")).toBe(true);
      expect(optionBtn("center").classList.contains("active")).toBe(false);

      await click(optionBtn("center"));
      expect(optionBtn("center").classList.contains("active")).toBe(true);
      expect(optionBtn("left").classList.contains("active")).toBe(false);

      await click(q(".btn-primary")!);
      expect(lastApply(w).cellProps!.textAlign).toBe("center");
    });

    it("vertical alignment buttons set the value and mark the active one", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      // Default verticalAlign is 'middle'.
      expect(optionBtn("middle").classList.contains("active")).toBe(true);

      await click(optionBtn("bottom"));
      expect(optionBtn("bottom").classList.contains("active")).toBe(true);
      expect(optionBtn("middle").classList.contains("active")).toBe(false);

      await click(q(".btn-primary")!);
      expect(lastApply(w).cellProps!.verticalAlign).toBe("bottom");
    });

    it("padding is a numeric input whose value binds as a number", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      const padding = inGroup<HTMLInputElement>("Padding (px)", "input[type=number]");

      await setText(padding, "24");
      await click(q(".btn-primary")!);
      const value = lastApply(w).cellProps!.padding;
      expect(value).toBe(24);
      expect(typeof value).toBe("number");
    });

    it("width and height text inputs feed straight into the payload", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      await setText(inGroup<HTMLInputElement>("Width", "input[type=text]"), "120px");
      await setText(inGroup<HTMLInputElement>("Height", "input[type=text]"), "60px");

      await click(q(".btn-primary")!);
      expect(lastApply(w).cellProps!.width).toBe("120px");
      expect(lastApply(w).cellProps!.height).toBe("60px");
    });
  });

  describe("table field bindings + change events", () => {
    it("border style <select> updates the model", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      const select = inGroup<HTMLSelectElement>("Border Style", "select.select-input");
      // Ships the full style menu.
      expect(Array.from(select.options).map((o) => o.value)).toEqual([
        "solid", "dashed", "dotted", "double", "none",
      ]);

      await setSelect(select, "dashed");
      await click(q(".btn-primary")!);
      expect(lastApply(w).tableProps!.borderStyle).toBe("dashed");
    });

    it("border width numeric input binds as a number", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      await setText(
        inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]"),
        "5"
      );
      await click(q(".btn-primary")!);
      const value = lastApply(w).tableProps!.borderWidth;
      expect(value).toBe(5);
      expect(typeof value).toBe("number");
    });

    it("border color: color + text inputs share one model", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      const text = inGroup<HTMLInputElement>("Border Color", "input[type=text]");
      const color = inGroup<HTMLInputElement>("Border Color", "input[type=color]");
      // Default seeded value.
      expect(text.value).toBe("#d1d5db");

      await setText(text, "#00ff00");
      expect(color.value).toBe("#00ff00");
      await click(q(".btn-primary")!);
      expect(lastApply(w).tableProps!.borderColor).toBe("#00ff00");
    });

    it("table width text input binds", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      await setText(inGroup<HTMLInputElement>("Table Width", "input[type=text]"), "500px");
      await click(q(".btn-primary")!);
      expect(lastApply(w).tableProps!.width).toBe("500px");
    });

    it("table background color Clear button empties the model", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      const text = inGroup<HTMLInputElement>("Background Color", "input[type=text]");
      await setText(text, "#123456");
      expect(text.value).toBe("#123456");

      await click(inGroup("Background Color", ".btn-clear"));
      expect(text.value).toBe("");
      await click(q(".btn-primary")!);
      expect(lastApply(w).tableProps!.backgroundColor).toBe("");
    });

    it("collapse-borders checkbox reflects the default and toggles", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      const box = inGroup<HTMLInputElement>("Collapse Borders", "input[type=checkbox]");
      // borderCollapse default is true.
      expect(box.checked).toBe(true);

      await toggle(box);
      expect(box.checked).toBe(false);
      await click(q(".btn-primary")!);
      expect(lastApply(w).tableProps!.borderCollapse).toBe(false);
    });
  });

  describe("apply assembles the correct payload per mode", () => {
    it("cell mode emits only cellProps (full shape) and then close", async () => {
      const w = openModal({ mode: "cell" });
      track(w);
      await setText(inGroup<HTMLInputElement>("Background Color", "input[type=text]"), "#abcdef");
      await click(optionBtn("right"));
      await click(optionBtn("top"));
      await setText(inGroup<HTMLInputElement>("Padding (px)", "input[type=number]"), "16");
      await setText(inGroup<HTMLInputElement>("Width", "input[type=text]"), "40%");
      await setText(inGroup<HTMLInputElement>("Height", "input[type=text]"), "80px");

      await click(q(".btn-primary")!);

      const payload = lastApply(w);
      expect(payload).toHaveProperty("cellProps");
      expect(payload).not.toHaveProperty("tableProps");
      expect(payload.cellProps).toEqual({
        backgroundColor: "#abcdef",
        textAlign: "right",
        verticalAlign: "top",
        padding: 16,
        width: "40%",
        height: "80px",
      });
      // Apply also closes the modal.
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("table mode emits only tableProps (full shape)", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      await setSelect(inGroup<HTMLSelectElement>("Border Style", "select.select-input"), "dotted");
      await setText(inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]"), "3");
      await setText(inGroup<HTMLInputElement>("Border Color", "input[type=text]"), "#111111");
      await setText(inGroup<HTMLInputElement>("Table Width", "input[type=text]"), "75%");
      await setText(inGroup<HTMLInputElement>("Background Color", "input[type=text]"), "#eeeeee");
      await toggle(inGroup<HTMLInputElement>("Collapse Borders", "input[type=checkbox]"));

      await click(q(".btn-primary")!);

      const payload = lastApply(w);
      expect(payload).toHaveProperty("tableProps");
      expect(payload).not.toHaveProperty("cellProps");
      expect(payload.tableProps).toEqual({
        borderStyle: "dotted",
        borderWidth: 3,
        borderColor: "#111111",
        width: "75%",
        backgroundColor: "#eeeeee",
        borderCollapse: false,
      });
    });

    it("both mode emits BOTH cellProps and tableProps", async () => {
      const w = openModal({ mode: "both" });
      track(w);
      await click(q(".btn-primary")!);

      const payload = lastApply(w);
      expect(payload).toHaveProperty("cellProps");
      expect(payload).toHaveProperty("tableProps");
      // Defaults flow through untouched.
      expect(payload.cellProps).toEqual({
        backgroundColor: "",
        textAlign: "left",
        verticalAlign: "middle",
        padding: 8,
        width: "",
        height: "",
      });
      expect(payload.tableProps).toEqual({
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#d1d5db",
        width: "100%",
        backgroundColor: "",
        borderCollapse: true,
      });
    });
  });

  describe("initial props seed the fields on open, and reset on reopen", () => {
    it("populates cell fields from initialCellProps when show goes false -> true", async () => {
      const w = mount(TablePropertiesModal, {
        props: {
          show: false,
          mode: "cell",
          initialCellProps: {
            backgroundColor: "#fefefe",
            textAlign: "right",
            verticalAlign: "top",
            padding: 20,
            width: "50%",
            height: "30px",
          },
        },
      });
      track(w);
      await w.setProps({ show: true });
      await nextTick();

      expect(inGroup<HTMLInputElement>("Background Color", "input[type=text]").value).toBe("#fefefe");
      expect(optionBtn("right").classList.contains("active")).toBe(true);
      expect(optionBtn("top").classList.contains("active")).toBe(true);
      expect(inGroup<HTMLInputElement>("Padding (px)", "input[type=number]").value).toBe("20");
      expect(inGroup<HTMLInputElement>("Width", "input[type=text]").value).toBe("50%");
      expect(inGroup<HTMLInputElement>("Height", "input[type=text]").value).toBe("30px");
    });

    it("populates table fields from initialTableProps when show goes false -> true", async () => {
      const w = mount(TablePropertiesModal, {
        props: {
          show: false,
          mode: "table",
          initialTableProps: {
            borderStyle: "double",
            borderWidth: 4,
            borderColor: "#abcabc",
            width: "60%",
            backgroundColor: "#f0f0f0",
            borderCollapse: false,
          },
        },
      });
      track(w);
      await w.setProps({ show: true });
      await nextTick();

      expect(inGroup<HTMLSelectElement>("Border Style", "select.select-input").value).toBe("double");
      expect(inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]").value).toBe("4");
      expect(inGroup<HTMLInputElement>("Border Color", "input[type=text]").value).toBe("#abcabc");
      expect(inGroup<HTMLInputElement>("Table Width", "input[type=text]").value).toBe("60%");
      expect(inGroup<HTMLInputElement>("Background Color", "input[type=text]").value).toBe("#f0f0f0");
      // borderCollapse:false is respected because the reset uses `?? true` (nullish),
      // NOT `|| true` — so an explicit false survives.
      expect(inGroup<HTMLInputElement>("Collapse Borders", "input[type=checkbox]").checked).toBe(false);
    });

    it("re-opening the modal resets a field the user had dirtied", async () => {
      const w = mount(TablePropertiesModal, { props: { show: false, mode: "cell" } });
      track(w);
      await w.setProps({ show: true });
      await nextTick();

      const width = inGroup<HTMLInputElement>("Width", "input[type=text]");
      await setText(width, "999px");
      expect(inGroup<HTMLInputElement>("Width", "input[type=text]").value).toBe("999px");

      // Close then reopen -> the watch on `show` re-seeds from defaults.
      await w.setProps({ show: false });
      await w.setProps({ show: true });
      await nextTick();

      expect(inGroup<HTMLInputElement>("Width", "input[type=text]").value).toBe("");
    });
  });

  describe("cancel / close / overlay / stop-propagation", () => {
    it("Cancel emits close and never emits apply", async () => {
      const w = openModal({ mode: "both" });
      track(w);
      await click(q(".btn-cancel")!);
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("close")).toHaveLength(1);
      expect(w.emitted("apply")).toBeUndefined();
    });

    it("the ✕ header button emits close", async () => {
      const w = openModal({ mode: "both" });
      track(w);
      await click(q(".close-btn")!);
      expect(w.emitted("close")).toBeTruthy();
    });

    it("clicking the overlay backdrop emits close", async () => {
      const w = openModal({ mode: "both" });
      track(w);
      await click(q(".modal-overlay")!);
      expect(w.emitted("close")).toBeTruthy();
    });

    it("clicking inside the dialog does NOT close it (@click.stop)", async () => {
      const w = openModal({ mode: "both" });
      track(w);
      await click(q(".modal-content")!);
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("numeric field constraints (HTML min/max contract)", () => {
    // The component performs NO JavaScript clamping — min/max are HTML
    // attributes only. In a real browser (and in happy-dom) setting an
    // out-of-range value via typing is NOT clamped; only the spinner UI honours
    // min/max. These tests pin the declared contract AND document the real,
    // un-clamped passthrough so a future "add clamping" change is a visible diff.
    it("padding input declares min=0 / max=100", () => {
      track(openModal({ mode: "cell" }));
      const padding = inGroup<HTMLInputElement>("Padding (px)", "input[type=number]");
      expect(padding.getAttribute("min")).toBe("0");
      expect(padding.getAttribute("max")).toBe("100");
    });

    it("border width input declares min=0 / max=20", () => {
      track(openModal({ mode: "table" }));
      const bw = inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]");
      expect(bw.getAttribute("min")).toBe("0");
      expect(bw.getAttribute("max")).toBe("20");
    });

    it("an out-of-range border width flows into the payload UN-clamped (no JS clamp)", async () => {
      const w = openModal({ mode: "table" });
      track(w);
      await setText(
        inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]"),
        "999"
      );
      await click(q(".btn-primary")!);
      // Documents current behaviour: 999 is NOT clamped to 20.
      expect(lastApply(w).tableProps!.borderWidth).toBe(999);
    });
  });

  describe("falsy-coalescing quirks in the reset logic", () => {
    // The reset uses `initial?.x || default` for padding/borderWidth, which
    // treats a legitimate 0 as "unset" and substitutes the default. Documented
    // here as CURRENT behaviour (reported as a product quirk, not fixed).
    it("preserves an explicit initialCellProps.padding = 0 (nullish, not truthy, coalescing)", async () => {
      const w = mount(TablePropertiesModal, {
        props: { show: false, mode: "cell", initialCellProps: { padding: 0 } },
      });
      track(w);
      await w.setProps({ show: true });
      await nextTick();
      expect(inGroup<HTMLInputElement>("Padding (px)", "input[type=number]").value).toBe("0");
    });

    it("preserves an explicit initialTableProps.borderWidth = 0 for a borderless table", async () => {
      const w = mount(TablePropertiesModal, {
        props: { show: false, mode: "table", initialTableProps: { borderWidth: 0 } },
      });
      track(w);
      await w.setProps({ show: true });
      await nextTick();
      expect(inGroup<HTMLInputElement>("Border Width (px)", "input[type=number]").value).toBe("0");
    });
  });
});
