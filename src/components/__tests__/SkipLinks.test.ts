import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import SkipLinks from "../SkipLinks.vue";

/**
 * Regression tests for the skip links: every default link must resolve to a
 * real landmark inside the editor instance (previously all three hrefs
 * pointed at non-existent ids, so the links were decorative and broken).
 */
interface Scaffold {
  editorRoot: HTMLElement;
  mountPoint: HTMLElement;
  toolbar: HTMLElement;
  content: HTMLElement;
  footer: HTMLElement;
}

function buildEditorScaffold(): Scaffold {
  const editorRoot = document.createElement("div");
  editorRoot.className = "next-level-editor";

  const mountPoint = document.createElement("div");

  const toolbar = document.createElement("div");
  toolbar.setAttribute("role", "toolbar");

  const content = document.createElement("div");
  content.className = "editor-content";
  content.contentEditable = "true";

  const footer = document.createElement("div");
  footer.className = "editor-footer";

  editorRoot.append(mountPoint, toolbar, content, footer);
  document.body.appendChild(editorRoot);

  return { editorRoot, mountPoint, toolbar, content, footer };
}

describe("SkipLinks", () => {
  let scaffold: Scaffold;
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    scaffold = buildEditorScaffold();
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    document.body.innerHTML = "";
  });

  const mountSkipLinks = (mountPoint: HTMLElement) =>
    mount(SkipLinks, { attachTo: mountPoint });

  it("stamps the landmark ids the hrefs point to on mount", () => {
    wrapper = mountSkipLinks(scaffold.mountPoint);

    expect(document.getElementById("main-content")).toBe(scaffold.content);
    expect(document.getElementById("toolbar")).toBe(scaffold.toolbar);
    expect(document.getElementById("footer")).toBe(scaffold.footer);
  });

  it("renders one anchor per default link with matching hrefs", () => {
    wrapper = mountSkipLinks(scaffold.mountPoint);

    const hrefs = wrapper
      .findAll("a.skip-link")
      .map((a) => a.attributes("href"));
    expect(hrefs).toEqual(["#main-content", "#toolbar", "#footer"]);
  });

  it("focuses the landmark when a skip link is activated", async () => {
    wrapper = mountSkipLinks(scaffold.mountPoint);

    const toolbarLink = wrapper
      .findAll("a.skip-link")
      .find((a) => a.text() === "Skip to toolbar")!;
    await toolbarLink.trigger("click");

    expect(scaffold.toolbar.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(scaffold.toolbar);
  });

  it("re-resolves a landmark recreated after mount (view-mode switch)", async () => {
    wrapper = mountSkipLinks(scaffold.mountPoint);

    // Simulate the v-if destroy/recreate of the editor pane.
    const recreated = document.createElement("div");
    recreated.className = "editor-content";
    recreated.contentEditable = "true";
    scaffold.content.replaceWith(recreated);

    const mainLink = wrapper
      .findAll("a.skip-link")
      .find((a) => a.text() === "Skip to main content")!;
    await mainLink.trigger("click");

    expect(document.activeElement).toBe(recreated);
  });

  it("scopes landmark resolution to its own editor instance", async () => {
    // First editor claims the plain ids.
    wrapper = mountSkipLinks(scaffold.mountPoint);

    // Second editor instance on the same page.
    const second = buildEditorScaffold();
    const secondWrapper = mountSkipLinks(second.mountPoint);

    try {
      const toolbarLink = secondWrapper
        .findAll("a.skip-link")
        .find((a) => a.text() === "Skip to toolbar")!;
      await toolbarLink.trigger("click");

      // The second instance skips into ITS OWN toolbar, not the first one's.
      expect(document.activeElement).toBe(second.toolbar);

      // And it never stole or duplicated the first instance's id.
      expect(document.getElementById("toolbar")).toBe(scaffold.toolbar);
    } finally {
      secondWrapper.unmount();
    }
  });
});
