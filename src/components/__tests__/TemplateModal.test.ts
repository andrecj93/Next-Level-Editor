import { describe, it, expect, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import type { Template } from "../../utils/templates";
import TemplateModal from "../TemplateModal.vue";

/**
 * TemplateModal reads its data from `getTemplates()` (there is no template
 * prop), so we inject deterministic fixtures by mocking that pure util. The
 * fixtures deliberately leave the "blog" category empty so we can exercise the
 * empty-filter branch, which the real (fully-populated) template set can't.
 */
const { fixtures } = vi.hoisted(() => {
  const fixtures: Template[] = [
    {
      id: "doc-1",
      name: "Design Doc",
      description: "A design document",
      icon: "📄",
      content: "<p>doc-1</p>",
      category: "document",
    },
    {
      id: "doc-2",
      name: "Spec Sheet",
      description: "A spec sheet",
      icon: "📝",
      content: "<p>doc-2</p>",
      category: "document",
    },
    {
      id: "email-1",
      name: "Welcome Email",
      description: "Onboarding email",
      icon: "📧",
      content: "<p>email-1</p>",
      category: "email",
    },
    {
      id: "mkt-1",
      name: "Landing Page",
      description: "Marketing landing page",
      icon: "📢",
      content: "<p>mkt-1</p>",
      category: "marketing",
    },
    {
      id: "mkt-2",
      name: "Ad Copy",
      description: "Short punchy ad copy",
      icon: "🛍️",
      content: "<p>mkt-2</p>",
      category: "marketing",
    },
  ];
  return { fixtures };
});

vi.mock("../../utils/templates", () => ({
  getTemplates: () => fixtures,
}));

const open = () => mount(TemplateModal, { props: { show: true } });

// Find a category tab button by its visible label (text includes the emoji).
const catBtn = (w: VueWrapper, label: string) =>
  w.findAll(".category-btn").find((b) => b.text().includes(label))!;

// Find a template card by the template name rendered inside it.
const card = (w: VueWrapper, name: string) =>
  w.findAll(".template-card").find((c) => c.text().includes(name))!;

const cardNames = (w: VueWrapper) =>
  w.findAll(".template-info h4").map((h) => h.text());

describe("TemplateModal", () => {
  describe("open / closed branch", () => {
    it("renders nothing when show is false", () => {
      const w = mount(TemplateModal, { props: { show: false } });
      expect(w.find(".modal-overlay").exists()).toBe(false);
      expect(w.find(".template-modal").exists()).toBe(false);
    });

    it("renders the dialog shell when show is true", () => {
      const w = open();
      expect(w.find(".modal-overlay").exists()).toBe(true);
      expect(w.find(".template-modal").exists()).toBe(true);
      expect(w.find(".modal-header h3").text()).toContain("Choose a Template");
    });

    it("exposes an accessible close button", () => {
      const w = open();
      const close = w.get(".close-btn");
      expect(close.attributes("aria-label")).toBe("Close");
    });
  });

  describe("category tabs", () => {
    it("renders one tab per category with icon + label", () => {
      const w = open();
      const tabs = w.findAll(".category-btn");
      expect(tabs).toHaveLength(5);
      const text = tabs.map((t) => t.text());
      expect(text).toEqual([
        "📚 All",
        "📄 Documents",
        "📧 Email",
        "✍️ Blog",
        "📢 Marketing",
      ]);
    });

    it("defaults to the 'All' tab being active", () => {
      const w = open();
      expect(catBtn(w, "All").classes()).toContain("active");
      expect(catBtn(w, "Documents").classes()).not.toContain("active");
    });

    it("moves the active class to the clicked tab", async () => {
      const w = open();
      await catBtn(w, "Documents").trigger("click");
      expect(catBtn(w, "Documents").classes()).toContain("active");
      expect(catBtn(w, "All").classes()).not.toContain("active");
    });
  });

  describe("template grid + filtering", () => {
    it("shows every template on the default 'All' tab", () => {
      const w = open();
      expect(w.findAll(".template-card")).toHaveLength(fixtures.length);
      expect(cardNames(w)).toEqual([
        "Design Doc",
        "Spec Sheet",
        "Welcome Email",
        "Landing Page",
        "Ad Copy",
      ]);
    });

    it("renders each template's icon, name and description", () => {
      const w = open();
      const first = card(w, "Design Doc");
      expect(first.find(".template-icon").text()).toBe("📄");
      expect(first.find(".template-info h4").text()).toBe("Design Doc");
      expect(first.find(".template-info p").text()).toBe("A design document");
    });

    it("filters to only 'document' templates", async () => {
      const w = open();
      await catBtn(w, "Documents").trigger("click");
      expect(cardNames(w)).toEqual(["Design Doc", "Spec Sheet"]);
    });

    it("filters to the single 'email' template", async () => {
      const w = open();
      await catBtn(w, "Email").trigger("click");
      expect(cardNames(w)).toEqual(["Welcome Email"]);
    });

    it("filters to both 'marketing' templates", async () => {
      const w = open();
      await catBtn(w, "Marketing").trigger("click");
      expect(cardNames(w)).toEqual(["Landing Page", "Ad Copy"]);
    });

    it("renders an empty grid for a category with no templates", async () => {
      const w = open();
      await catBtn(w, "Blog").trigger("click");
      expect(w.findAll(".template-card")).toHaveLength(0);
    });

    it("restores the full list when switching back to 'All'", async () => {
      const w = open();
      await catBtn(w, "Email").trigger("click");
      expect(w.findAll(".template-card")).toHaveLength(1);
      await catBtn(w, "All").trigger("click");
      expect(w.findAll(".template-card")).toHaveLength(fixtures.length);
    });
  });

  describe("selecting a template", () => {
    it("emits select with the template then close when a card is clicked", async () => {
      const w = open();
      await card(w, "Design Doc").trigger("click");

      const select = w.emitted("select");
      expect(select).toHaveLength(1);
      expect(select![0][0]).toBe(fixtures[0]);
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("emits the specific template that was clicked, not the first one", async () => {
      const w = open();
      await card(w, "Ad Copy").trigger("click");
      expect((w.emitted("select")![0][0] as Template).id).toBe("mkt-2");
    });

    it("emits the template that belongs to the active filtered view", async () => {
      const w = open();
      await catBtn(w, "Marketing").trigger("click");
      await card(w, "Landing Page").trigger("click");
      expect((w.emitted("select")![0][0] as Template).id).toBe("mkt-1");
    });
  });

  describe("closing", () => {
    it("emits close (and not select) from the ✕ button", async () => {
      const w = open();
      await w.get(".close-btn").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
      expect(w.emitted("select")).toBeUndefined();
    });

    it("emits close when the overlay backdrop itself is clicked", async () => {
      const w = open();
      await w.get(".modal-overlay").trigger("click");
      expect(w.emitted("close")).toHaveLength(1);
    });

    it("does NOT close when the dialog body is clicked (.self modifier)", async () => {
      const w = open();
      await w.get(".modal-content").trigger("click");
      expect(w.emitted("close")).toBeUndefined();
    });
  });

  describe("state persistence across show toggles", () => {
    // The component instance stays mounted while `show` toggles the inner
    // v-if, so the selected category is retained rather than reset.
    it("keeps the selected category when hidden and shown again", async () => {
      const w = mount(TemplateModal, { props: { show: true } });
      await catBtn(w, "Documents").trigger("click");
      expect(w.findAll(".template-card")).toHaveLength(2);

      await w.setProps({ show: false });
      expect(w.find(".modal-overlay").exists()).toBe(false);

      await w.setProps({ show: true });
      expect(catBtn(w, "Documents").classes()).toContain("active");
      expect(cardNames(w)).toEqual(["Design Doc", "Spec Sheet"]);
    });
  });
});
