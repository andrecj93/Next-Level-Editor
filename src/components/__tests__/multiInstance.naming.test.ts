import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import { generateTableOfContents } from "../../utils/pageManagement";

/**
 * Round-23 multi-instance naming:
 *  - R23-52 the skip-link announcement was built from the generated landmark
 *    ID, so a screen reader said "Skipped to v 0-main" — a raw internal
 *    identifier (and `replace("-", " ")` only ever replaced the FIRST hyphen).
 *  - R23-57 SkipLinks takes a `label` prop for exactly this reason — its own
 *    doc comment says two editors would otherwise expose two navigation
 *    landmarks both called "Skip links" — but nothing ever passed one.
 *  - R23-60 heading anchors are `heading-<index>-<slug>` scoped to the editor
 *    they were generated in, so two editors whose first heading reads
 *    "Overview" both minted `heading-0-overview` and a TOC link jumped into the
 *    OTHER editor's document.
 */
const wrappers: VueWrapper[] = [];

afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const mountEditor = (modelValue = "<p>hi</p>") => {
  const w = mount(NextLevelEditor, {
    props: { modelValue },
    attachTo: document.body,
  });
  wrappers.push(w);
  return w;
};

describe("skip links are per-instance and speak plainly", () => {
  it("announces the link's own wording, not the internal id (#R23-52)", async () => {
    const wrapper = mountEditor();
    await nextTick();

    const link = wrapper.find(".skip-links a, .skip-link");
    expect(link.exists()).toBe(true);
    const wording = link.text();

    await link.trigger("click");
    // setFocus announces with delay: 100 — wait past it, then let Vue render.
    await new Promise((resolve) => setTimeout(resolve, 160));
    await nextTick();

    const polite = document.getElementById("aria-live-polite");
    expect(polite).not.toBeNull();
    const spoken = polite!.textContent || "";
    expect(spoken).not.toMatch(/\bv[\s-]?\d/); // no "v 0-main" style ids
    expect(spoken.toLowerCase()).toContain(wording.toLowerCase().slice(0, 8));
  });

  it("gives each editor a distinguishable landmark name (#R23-57)", async () => {
    mountEditor();
    mountEditor();
    await nextTick();

    const labels = Array.from(
      document.querySelectorAll("nav.skip-links")
    ).map((nav) => nav.getAttribute("aria-label"));

    expect(labels).toHaveLength(2);
    expect(labels[0]).toBeTruthy();
    expect(new Set(labels).size).toBe(2);
  });
});

describe("TOC anchors do not collide across editors (#R23-60)", () => {
  it("keeps two editors' identical headings on distinct ids", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.innerHTML = "<h1>Overview</h1>";
    second.innerHTML = "<h1>Overview</h1>";
    document.body.append(first, second);

    generateTableOfContents(first);
    generateTableOfContents(second);

    const firstId = first.querySelector("h1")!.id;
    const secondId = second.querySelector("h1")!.id;
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
  });

  it("re-homes an id that arrived already taken by another editor", () => {
    // Both editors load the SAME saved HTML, ids and all — a docs page showing
    // one document twice, or a two-language form.
    const saved = '<h1 id="heading-0-overview">Overview</h1>';
    const first = document.createElement("div");
    const second = document.createElement("div");
    first.innerHTML = saved;
    second.innerHTML = saved;
    document.body.append(first, second);

    generateTableOfContents(first);
    generateTableOfContents(second);

    expect(second.querySelector("h1")!.id).not.toBe(
      first.querySelector("h1")!.id
    );
  });
});
