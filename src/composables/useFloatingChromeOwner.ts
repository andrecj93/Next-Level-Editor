import {
  computed,
  nextTick,
  onScopeDispose,
  ref,
  type ComputedRef,
  type Ref,
} from "vue";
import { nextInstanceToken } from "../utils/instanceToken";

/**
 * Which editor instance may paint viewport-fixed chrome?
 *
 * The FAB column, the variables panel hanging off it and the auto-save chip are
 * `position: fixed` at hard-coded viewport coordinates (bottom-right /
 * bottom-left). That is fine for one editor and broken for several: N instances
 * stack N identical controls on the same pixels, so the user cannot tell whose
 * comments a circle toggles and only the last-painted one is clickable. The
 * demo's own home page proves it — eight editors, three of them showing a
 * different FAB, all three landing in the same corner at once. #R23-30 #R23-58
 *
 * The mobile toolbar and the selection bubble solve their version of this by
 * appearing only after you interact with an instance. That rule cannot simply be
 * reused here, because the FABs are how the features are DISCOVERED: a section
 * whose caption reads "open the variables panel" needs its FAB before any click.
 * So ownership follows what the user is actually looking at:
 *
 *   1. the instance last interacted with, while it is still on screen;
 *   2. otherwise the instance occupying the most of the viewport;
 *   3. otherwise the first one that registered.
 *
 * A claim LAPSES once its editor scrolls away — the corner must never belong to
 * an editor the reader can no longer see. Interaction outside every editor
 * changes nothing: clicking a heading next to the editor is not a claim.
 *
 * State is module-scope on purpose: "who owns the bottom-right corner of the
 * viewport" is a page-level question, and `<script setup>` runs per instance.
 * Same reasoning as `regionOwner` in AriaLiveRegion and `fullScreenOwner` in
 * useEditorUIState.
 */

/** Live instances, in registration (mount) order. */
const registered = ref<string[]>([]);
/** The instance the user last interacted with, if it is still live. */
const interactionOwner = ref<string | null>(null);
/** Roots by token, so document events and measurements can find their owner. */
const roots = new Map<string, Ref<HTMLElement | null>>();

/** Tokens currently intersecting the viewport, in registration order. */
const visibleTokens = ref<string[]>([]);
/** Of those, the one showing the most pixels (ties go to the earliest). */
const mostVisible = ref<string | null>(null);
/**
 * Whether layout is measurable at all — i.e. some editor reported a non-zero
 * box. It separates "the reader is looking at no editor" (corner stays empty)
 * from "we cannot tell" (happy-dom, SSR, pre-layout), where guessing nobody
 * would wrongly strip the affordances off a perfectly visible lone editor.
 */
const layoutMeasurable = ref(false);

/**
 * Measure how much of each editor is on screen.
 *
 * Deliberately getBoundingClientRect on scroll/resize rather than an
 * IntersectionObserver: the editor already refreshes the playhead anchor this
 * way, the instance count is tiny, and it degrades honestly where layout is not
 * measurable (happy-dom, SSR) — every rect reads zero, nothing is "visible", and
 * the mount-order fallback applies instead of a wrong answer.
 */
const measureVisibility = (): void => {
  if (typeof window === "undefined") {
    visibleTokens.value = [];
    mostVisible.value = null;
    layoutMeasurable.value = false;
    return;
  }
  const seen: string[] = [];
  let best: string | null = null;
  let bestArea = 0;
  let measurable = false;
  for (const token of registered.value) {
    const el = roots.get(token)?.value;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) measurable = true;
    const height =
      Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const width =
      Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    if (height <= 0 || width <= 0) continue;
    seen.push(token);
    const area = height * width;
    // Strict >, so an exact tie keeps the earlier-registered instance.
    if (area > bestArea) {
      bestArea = area;
      best = token;
    }
  }
  visibleTokens.value = seen;
  mostVisible.value = best;
  layoutMeasurable.value = measurable;
};

const activeOwner = computed<string | null>(() => {
  const live = registered.value;
  const claimed = interactionOwner.value;
  if (claimed !== null && live.includes(claimed)) {
    // Where layout is unmeasurable, honour the claim — it is the only real
    // signal available. Otherwise it holds only while that editor is on screen.
    if (!layoutMeasurable.value || visibleTokens.value.includes(claimed)) {
      return claimed;
    }
  }
  const visible = mostVisible.value;
  if (visible !== null && live.includes(visible)) return visible;
  // Layout measured and no editor is on screen: leave the corner empty rather
  // than float a control for an editor the reader cannot see.
  if (layoutMeasurable.value) return null;
  return live[0] ?? null;
});

const onInteraction = (event: Event) => {
  const target = event.target;
  if (!(target instanceof Node)) return;
  // Re-measure BEFORE recording the claim: layout shifts (an image loading,
  // an accordion opening) move editors without firing any scroll event, and a
  // stale "not visible" snapshot must never veto a real interaction — the
  // interaction is ground truth for where the user is. #R24-6
  measureVisibility();
  for (const [token, root] of roots) {
    if (root.value?.contains(target)) {
      interactionOwner.value = token;
      return;
    }
  }
  // Outside every editor: not a claim. The current owner keeps it.
};

let listening = false;

const startListening = () => {
  if (listening || typeof document === "undefined") return;
  // Capture phase, like the other ownership trackers: widgets that call
  // stopPropagation must not be able to desync ownership. Scroll is captured
  // too, so scrolling an inner container counts as much as the page.
  document.addEventListener("pointerdown", onInteraction, true);
  document.addEventListener("focusin", onInteraction, true);
  document.addEventListener("scroll", measureVisibility, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", measureVisibility, { passive: true });
  listening = true;
};

const stopListening = () => {
  if (!listening || typeof document === "undefined") return;
  document.removeEventListener("pointerdown", onInteraction, true);
  document.removeEventListener("focusin", onInteraction, true);
  document.removeEventListener("scroll", measureVisibility, true);
  window.removeEventListener("resize", measureVisibility);
  listening = false;
};

export interface UseFloatingChromeOwnerReturn {
  /** True while THIS instance may render viewport-fixed chrome. */
  owns: ComputedRef<boolean>;
  /**
   * Re-measure which editors are on screen. Exposed for hosts that move or
   * resize an editor without a scroll/resize event (and for tests).
   */
  refresh: () => void;
}

/**
 * Register this editor instance as a candidate owner of the page's fixed
 * chrome. `root` is the instance's root element, used both to attribute
 * interactions and to measure visibility.
 */
export function useFloatingChromeOwner(
  root: Ref<HTMLElement | null>
): UseFloatingChromeOwnerReturn {
  const token = nextInstanceToken("nle-chrome");

  roots.set(token, root);
  registered.value = [...registered.value, token];
  startListening();
  // setup() runs before the root element exists, so the first measurement waits
  // for the DOM. (nextTick, not onMounted: this composable is also used outside
  // a component instance.)
  void nextTick(measureVisibility);

  onScopeDispose(() => {
    roots.delete(token);
    registered.value = registered.value.filter((entry) => entry !== token);
    // Drop a stale claim so the fallbacks apply again.
    if (interactionOwner.value === token) interactionOwner.value = null;
    visibleTokens.value = visibleTokens.value.filter((entry) => entry !== token);
    if (mostVisible.value === token) mostVisible.value = null;
    if (registered.value.length === 0) {
      stopListening();
      // Nothing left to measure. Clearing this matters: a stale "layout is
      // measurable" would make the next editor to mount look off-screen during
      // the frame before its own first measurement, hiding its chrome.
      layoutMeasurable.value = false;
    } else {
      // Deferred: scope disposal runs BEFORE Vue removes the unmounted
      // subtree, so a synchronous measure here reads the PRE-removal layout —
      // survivors below the dying editor look off-screen, the corner goes
      // ownerless, and the reflow that follows fires no scroll/resize event
      // to heal it. Measure once the removal has actually happened. #R25-4
      void nextTick(() => {
        if (registered.value.length > 0) measureVisibility();
      });
    }
  });

  return {
    owns: computed(() => activeOwner.value === token),
    refresh: measureVisibility,
  };
}
