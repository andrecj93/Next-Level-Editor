import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import SkipLinks from "../SkipLinks.vue";

/**
 * A skip link whose landmark is absent (toolbar hidden via showToolbar/pill
 * mode; footer hidden at toolbarPosition="bottom") used to still render — and
 * activating it announced "Target … not found" and moved no focus, misleading
 * AT users. Absent landmarks are dropped from the list.
 */
let w: VueWrapper | null = null;
afterEach(() => {
  w?.unmount();
  w = null;
});

const labels = () => w!.findAll(".skip-link").map((a) => a.text());

describe("SkipLinks only lists present landmarks", () => {
  it("lists all three by default (standalone)", () => {
    w = mount(SkipLinks);
    expect(labels()).toEqual([
      "Skip to main content",
      "Skip to toolbar",
      "Skip to footer",
    ]);
  });

  it("drops 'Skip to toolbar' when the toolbar is absent", () => {
    w = mount(SkipLinks, { props: { hasToolbar: false } });
    expect(labels()).toEqual(["Skip to main content", "Skip to footer"]);
  });

  it("drops 'Skip to footer' when the footer is absent", () => {
    w = mount(SkipLinks, { props: { hasFooter: false } });
    expect(labels()).toEqual(["Skip to main content", "Skip to toolbar"]);
  });

  it("keeps custom links regardless", () => {
    w = mount(SkipLinks, {
      props: {
        hasToolbar: false,
        hasFooter: false,
        customLinks: [{ id: "c", label: "Skip to comments", target: "cmt" }],
      },
    });
    expect(labels()).toEqual(["Skip to main content", "Skip to comments"]);
  });

  it("defaults the landmark name to 'Skip links'", () => {
    w = mount(SkipLinks);
    expect(w.get("nav.skip-links").attributes("aria-label")).toBe("Skip links");
  });

  it("takes a per-instance label so two editors' landmarks differ", () => {
    w = mount(SkipLinks, { props: { label: "Skip links (draft editor)" } });
    expect(w.get("nav.skip-links").attributes("aria-label")).toBe(
      "Skip links (draft editor)"
    );
  });
});
