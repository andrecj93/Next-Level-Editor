import { describe, it, expect, vi, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import TemplateModal from "../TemplateModal.vue";

const fixtures = [
  {
    id: "t1",
    name: "Blog Post",
    description: "A blog layout",
    icon: "📝",
    category: "writing",
    content: "<h1>Blog</h1>",
  },
];

vi.mock("../../utils/templates", () => ({
  getTemplates: () => fixtures,
}));

/**
 * Template cards were click-only <div>s — no role, tabindex or key handler, so
 * keyboard-only users could not select a template at all (WCAG 2.1.1). They
 * are now focusable buttons activatable with Enter and Space.
 */
let w: VueWrapper | null = null;
afterEach(() => {
  w?.unmount();
  w = null;
});

describe("TemplateModal cards are keyboard-operable", () => {
  it("exposes each card as a focusable button", () => {
    w = mount(TemplateModal, { props: { show: true } });
    const card = w.get(".template-card");
    expect(card.attributes("role")).toBe("button");
    expect(card.attributes("tabindex")).toBe("0");
    expect(card.attributes("aria-label")).toContain("Blog Post");
  });

  it("selects the template on Enter", async () => {
    w = mount(TemplateModal, { props: { show: true } });
    await w.get(".template-card").trigger("keydown.enter");
    expect(w.emitted("select")).toBeTruthy();
    expect((w.emitted("select")![0][0] as { name: string }).name).toBe(
      "Blog Post"
    );
  });

  it("selects the template on Space", async () => {
    w = mount(TemplateModal, { props: { show: true } });
    await w.get(".template-card").trigger("keydown.space");
    expect(w.emitted("select")).toBeTruthy();
  });
});
