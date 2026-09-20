import { onScopeDispose, watch } from "vue";

/** Protect a host-backed save while it is pending. Attach beforeunload only
 * while dirty so a clean document remains eligible for the browser's cache. */
export function usePendingSaveGuard(isPending: () => boolean, flush: () => Promise<void>) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (!isPending()) return;
    event.preventDefault();
    event.returnValue = "";
  };
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden" && isPending()) void flush();
  };
  watch(isPending, (pending) => {
    window.removeEventListener("beforeunload", beforeUnload);
    if (pending) window.addEventListener("beforeunload", beforeUnload);
  }, { immediate: true, flush: "sync" });
  document.addEventListener("visibilitychange", onVisibilityChange);
  onScopeDispose(() => {
    window.removeEventListener("beforeunload", beforeUnload);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });
}
