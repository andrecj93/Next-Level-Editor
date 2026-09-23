import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick, ref } from "vue";
import AriaLiveRegion from "../AriaLiveRegion.vue";
import SkipLinks from "../SkipLinks.vue";
import { useAccessibility } from "../../composables/useAccessibility";
import { provideEditorLocale } from "../../composables/useEditorLocale";

describe("localized accessibility feedback across editor instances", () => {
  const wrappers: VueWrapper[] = [];
  let region: VueWrapper;

  function publisher(initialLocale = "en", withSkipLinks = false) {
    const locale = ref(initialLocale);
    let api!: ReturnType<typeof useAccessibility>;
    let t!: ReturnType<typeof provideEditorLocale>["t"];
    const wrapper = mount(defineComponent({
      setup() {
        const context = provideEditorLocale(() => locale.value);
        t = context.t;
        api = useAccessibility(undefined, context);
        return () => withSkipLinks ? h(SkipLinks) : null;
      },
    }), { attachTo: document.body });
    wrappers.push(wrapper);
    return { api, t, locale, wrapper };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    region = mount(AriaLiveRegion, { attachTo: document.body });
    wrappers.push(region);
    publisher().api.clearAnnouncements();
  });

  afterEach(() => {
    wrappers.splice(0).reverse().forEach(wrapper => wrapper.unmount());
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("renders feedback with the publisher's language and updates it until expiry", async () => {
    const first = publisher("en");
    const second = publisher("pt-PT");
    second.api.announce(() => second.t("Suggestions closed"));
    await nextTick();
    const live = region.get("#aria-live-polite");
    expect(live.text()).toBe("Sugestões fechadas");
    expect(live.attributes("lang")).toBe("pt-PT");

    first.locale.value = "ar";
    await nextTick();
    expect(live.text()).toBe("Sugestões fechadas");
    await vi.advanceTimersByTimeAsync(4000);
    second.locale.value = "en";
    await nextTick();
    expect(live.text()).toBe("Suggestions closed");
    expect(live.attributes("lang")).toBe("en");
    await vi.advanceTimersByTimeAsync(1000);
    expect(live.text()).toBe("");
    expect(live.attributes("lang")).toBeUndefined();
  });

  it("resolves delayed feedback using the language at delivery and preserves host text", async () => {
    const source = publisher();
    source.api.announce(() => source.t("Suggestions closed"), { delay: 100 });
    source.locale.value = "pt-PT";
    await vi.advanceTimersByTimeAsync(100);
    expect(region.get("#aria-live-polite").text()).toBe("Sugestões fechadas");
    source.api.announce("A host-provided message", { priority: "assertive" });
    await nextTick();
    expect(region.get("#aria-live-assertive").text()).toBe("A host-provided message");
  });

  it("keeps the other editor's feedback when a publisher unmounts and cancels stale delays", async () => {
    const first = publisher();
    const second = publisher("pt-PT");
    first.api.announce("First editor");
    first.api.announce("Stale delayed feedback", { delay: 100 });
    second.api.announce("Still open");
    first.wrapper.unmount();
    await vi.advanceTimersByTimeAsync(100);
    expect(region.get("#aria-live-polite").text()).toBe("Still open");
    expect(second.api.announcements.value).toHaveLength(1);
    first.api.announce("After unmount");
    expect(second.api.getAnnouncements("polite")).toBe("Still open");
  });

  it("alternates identical localized feedback without losing reactivity", async () => {
    const source = publisher();
    const announce = () => source.api.announce(() => source.t("Suggestions closed"));
    announce();
    const first = source.api.getAnnouncements("polite");
    announce();
    expect(source.api.getAnnouncements("polite")).not.toBe(first);
    source.locale.value = "pt-PT";
    await nextTick();
    expect(region.get("#aria-live-polite").text().replace(/\u200B/g, "")).toBe("Sugestões fechadas");
    const second = source.api.getAnnouncements("polite");
    announce();
    expect(source.api.getAnnouncements("polite")).not.toBe(second);
  });

  it("localizes skip-link feedback, including a locale switch during its focus delay", async () => {
    const target = document.createElement("main");
    target.id = "main-content";
    document.body.appendChild(target);
    const source = publisher("en", true);
    await source.wrapper.get("a[href='#main-content']").trigger("click");
    source.locale.value = "pt-PT";
    await vi.advanceTimersByTimeAsync(100);
    expect(document.activeElement).toBe(target);
    expect(region.get("#aria-live-polite").text()).toBe("Navegação rápida: Ir para o conteúdo principal");
    expect(region.get("#aria-live-polite").attributes("lang")).toBe("pt-PT");

    await source.wrapper.get("a[href='#toolbar']").trigger("click");
    expect(region.get("#aria-live-assertive").text()).toBe("Destino toolbar não encontrado");
    source.locale.value = "en";
    await nextTick();
    expect(region.get("#aria-live-assertive").text()).toBe("Target toolbar not found");
  });
});
