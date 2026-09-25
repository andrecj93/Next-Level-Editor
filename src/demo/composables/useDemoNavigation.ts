import { ref, onMounted, onUnmounted } from "vue";

export type ViewId = "home" | "playground" | "docs";
const isView = (value: string | null): value is ViewId =>
  value === "home" || value === "playground" || value === "docs";

export function resolveView(url: URL): ViewId {
  const hash = url.hash.slice(1);
  if (isView(hash)) return hash;
  const query = url.searchParams.get("view");
  if (isView(query)) return query;
  return url.searchParams.get("empty") === "true" ? "playground" : "home";
}

/** Keep deep links, refresh and browser history aligned with the visible page. */
export function useDemoNavigation(onNavigate: () => void) {
  const view = ref<ViewId>(resolveView(new URL(window.location.href)));
  const restore = () => {
    view.value = resolveView(new URL(window.location.href));
    onNavigate();
  };
  const navigate = (id: string) => {
    if (!isView(id) || id === view.value) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("view");
    url.hash = id;
    window.history.pushState(null, "", url);
    view.value = id;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    onNavigate();
  };
  onMounted(() => {
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
  });
  onUnmounted(() => {
    window.removeEventListener("popstate", restore);
    window.removeEventListener("hashchange", restore);
  });
  return { view, navigate };
}
