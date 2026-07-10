import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import TableModal from "../TableModal.vue";

// TableModal wraps its dialog in `<teleport to="body">` (inside a <transition>).
// Stubbing teleport renders that content inline in the wrapper, so
// `find`/`trigger`/`emitted` all work against a single tree — matching the
// CodeBlockModal / EmbedModal style used elsewhere in this suite. VTU also
// stubs the <transition> automatically, so `v-if="show"` content is present
// synchronously with no enter/leave delay.
const mountModal = (props: Record<string, unknown> = {}) =>
  mount(TableModal, {
    props: { show: true, ...props },
    global: { stubs: { teleport: true } },
  });

// Convenience readers over the rendered preview grid.
const cellCount = (w: ReturnType<typeof mountModal>) =>
  w.findAll(".preview-cell").length;
const headerCellCount = (w: ReturnType<typeof mountModal>) =>
  w.findAll(".preview-cell.header").length;

describe("TableModal", () => {
  describe("open vs closed rendering", () => {
    it("renders nothing when show is false", () => {
      const w = mount(TableModal, {
        props: { show: false },
        global: { stubs: { teleport: true } },
      });
      expect(w.find(".modal-overlay").exists()).toBe(false);
      expect(w.find(".modal-content").exists()).toBe(false);
      w.unmount();
    });

    it("renders the dialog, heading, both inputs, checkbox and preview when open", () => {
      const w = mountModal();
      expect(w.find(".modal-content").exists()).toBe(true);
      expect(w.find(".modal-header h3").text()).toBe("Insert Table");
      expect(w.find("#table-rows").exists()).toBe(true);
      expect(w.find("#table-cols").exists()).toBe(true);
      expect(w.find('input[type="checkbox"]').exists()).toBe(true);
      expect(w.find(".preview-grid").exists()).toBe(true);
      w.unmount();
    });

    it("labels the close button for assistive tech", () => {
      const w = mountModal();
      expect(w.get(".close-btn").attributes("aria-label")).toBe("Close modal");
      w.unmount();
    });

    it("applies the theme class to the overlay (default and custom)", () => {
      const def = mountModal();
      expect(def.get(".modal-overlay").classes()).toContain("theme-light");
      def.unmount();

      const dark = mountModal({ theme: "theme-dark" });
      expect(dark.get(".modal-overlay").classes()).toContain("theme-dark");
      dark.unmount();
    });
  });

  describe("defaults", () => {
    it("defaults to a 3x3 table with the header row enabled", () => {
      const w = mountModal();
      expect((w.get("#table-rows").element as HTMLInputElement).value).toBe("3");
      expect((w.get("#table-cols").element as HTMLInputElement).value).toBe("3");
      expect(
        (w.get('input[type="checkbox"]').element as HTMLInputElement).checked
      ).toBe(true);
      w.unmount();
    });

    it("declares the min/max range on the row and column inputs", () => {
      const w = mountModal();
      const rows = w.get("#table-rows");
      const cols = w.get("#table-cols");
      expect(rows.attributes("type")).toBe("number");
      expect(rows.attributes("min")).toBe("1");
      expect(rows.attributes("max")).toBe("20");
      expect(cols.attributes("type")).toBe("number");
      expect(cols.attributes("min")).toBe("1");
      expect(cols.attributes("max")).toBe("10");
      w.unmount();
    });
  });

  describe("preview grid reflects the chosen dimensions", () => {
    it("renders rows x cols preview cells (9 for the 3x3 default)", () => {
      const w = mountModal();
      expect(cellCount(w)).toBe(9);
      w.unmount();
    });

    it("sets grid-template-columns to repeat(cols, 1fr)", () => {
      const w = mountModal();
      expect(w.get(".preview-grid").attributes("style")).toContain(
        "repeat(3, 1fr)"
      );
      w.unmount();
    });

    it("grows the preview when rows increase (5x3 -> 15 cells)", async () => {
      const w = mountModal();
      await w.get("#table-rows").setValue("5");
      expect((w.vm as any).rows).toBe(5);
      expect(cellCount(w)).toBe(15);
      w.unmount();
    });

    it("grows the preview and the column template when cols increase (3x4)", async () => {
      const w = mountModal();
      await w.get("#table-cols").setValue("4");
      expect((w.vm as any).cols).toBe(4);
      expect(cellCount(w)).toBe(12);
      expect(w.get(".preview-grid").attributes("style")).toContain(
        "repeat(4, 1fr)"
      );
      w.unmount();
    });
  });

  describe("header-row option", () => {
    it("highlights exactly the first row of cells (one per column) while enabled", () => {
      const w = mountModal(); // 3x3, header on
      expect(headerCellCount(w)).toBe(3);
      w.unmount();
    });

    it("tracks the column count for the highlighted header cells", async () => {
      const w = mountModal();
      await w.get("#table-cols").setValue("5");
      // header cells are the first `cols` cells
      expect(headerCellCount(w)).toBe(5);
      w.unmount();
    });

    it("removes all header highlighting when the checkbox is unchecked", async () => {
      const w = mountModal();
      expect(headerCellCount(w)).toBe(3);

      await w.get('input[type="checkbox"]').setValue(false);
      expect((w.vm as any).includeHeader).toBe(false);
      expect(headerCellCount(w)).toBe(0);
      // cells themselves remain — only the highlight is gone
      expect(cellCount(w)).toBe(9);
      w.unmount();
    });
  });

  describe("inserting", () => {
    it("emits insert with the default {rows:3, cols:3, includeHeader:true} payload", async () => {
      const w = mountModal();
      await w.get(".btn-primary").trigger("click");

      const inserted = w.emitted("insert");
      expect(inserted).toBeTruthy();
      expect(inserted!).toHaveLength(1);
      expect(inserted![0][0]).toEqual({
        rows: 3,
        cols: 3,
        includeHeader: true,
      });
      w.unmount();
    });

    it("emits the edited dimensions and header choice", async () => {
      const w = mountModal();
      await w.get("#table-rows").setValue("6");
      await w.get("#table-cols").setValue("4");
      await w.get('input[type="checkbox"]').setValue(false);

      await w.get(".btn-primary").trigger("click");

      expect(w.emitted("insert")![0][0]).toEqual({
        rows: 6,
        cols: 4,
        includeHeader: false,
      });
      w.unmount();
    });

    it("also emits close after a successful insert (modal self-dismisses)", async () => {
      const w = mountModal();
      await w.get(".btn-primary").trigger("click");
      expect(w.emitted("insert")!).toHaveLength(1);
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("close")!).toHaveLength(1);
      w.unmount();
    });
  });

  describe("closing", () => {
    it("emits close from the Cancel button", async () => {
      const w = mountModal();
      await w.get(".btn-cancel").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      expect(w.emitted("insert")).toBeUndefined();
      w.unmount();
    });

    it("emits close from the x header button", async () => {
      const w = mountModal();
      await w.get(".close-btn").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("emits close when the overlay backdrop is clicked", async () => {
      const w = mountModal();
      await w.get(".modal-overlay").trigger("click");
      expect(w.emitted("close")).toBeTruthy();
      w.unmount();
    });

    it("does NOT close when the dialog body itself is clicked (@click.stop)", async () => {
      const w = mountModal();
      await w.get(".modal-content").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
      w.unmount();
    });
  });

  // ----- Real-behaviour edges / documented gaps -------------------------------

  describe("no clamping of out-of-range input (documents real behaviour)", () => {
    it("lets a row value above max=20 flow straight into the preview and payload", async () => {
      // The min/max attributes are advisory only — nothing in insertTable()
      // clamps the value, so an out-of-range number is accepted verbatim.
      const w = mountModal();
      await w.get("#table-rows").setValue("25");
      expect((w.vm as any).rows).toBe(25);
      expect(cellCount(w)).toBe(25 * 3);

      await w.get(".btn-primary").trigger("click");
      expect(w.emitted("insert")![0][0]).toMatchObject({ rows: 25, cols: 3 });
      w.unmount();
    });

    it("accepts a zero/blank column count, producing an empty preview and a 0-col payload", async () => {
      // Clearing a number input yields '' which `.number` keeps as ''. totalCells
      // becomes '' * rows === 0, so no cells render. insertTable() still fires
      // with the empty value — there is no validation guard.
      const w = mountModal();
      await w.get("#table-cols").setValue("");
      expect(cellCount(w)).toBe(0);

      await w.get(".btn-primary").trigger("click");
      const payload = w.emitted("insert")![0][0] as {
        rows: number;
        cols: unknown;
      };
      expect(payload.rows).toBe(3);
      // cols is the un-coerced empty value — the modal offered no lower bound.
      expect(payload.cols === "" || payload.cols === 0).toBe(true);
      w.unmount();
    });
  });

  describe("keyboard: Escape is not wired up (documents real behaviour / a11y gap)", () => {
    it("pressing Escape on the overlay or dialog does not emit close", async () => {
      const w = mountModal();
      await w.get(".modal-overlay").trigger("keydown", { key: "Escape" });
      await w.get(".modal-content").trigger("keydown", { key: "Escape" });
      expect(w.emitted("close")).toBeUndefined();
      w.unmount();
    });
  });

  describe("state persistence across show toggles (no reset watcher)", () => {
    it("keeps edited dimensions when the modal is closed and reopened", async () => {
      const w = mountModal();
      await w.get("#table-rows").setValue("7");

      await w.setProps({ show: false });
      expect(w.find(".modal-content").exists()).toBe(false);

      await w.setProps({ show: true });
      // Unlike EmbedModal, TableModal has no reopen-reset, so the value survives.
      expect((w.get("#table-rows").element as HTMLInputElement).value).toBe("7");
      expect(cellCount(w)).toBe(7 * 3);
      w.unmount();
    });
  });
});
