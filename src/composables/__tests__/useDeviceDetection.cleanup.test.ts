import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { useDeviceDetection } from "../useDeviceDetection";

/**
 * Regression tests for #46: useDeviceDetection leaked the hover/pointer
 * matchMedia "change" listeners because they were only added on mount and
 * never removed on unmount. These tests assert the corrected behaviour:
 * every "change" listener added to a MediaQueryList on mount is removed again
 * when the owning component is unmounted.
 */
describe("useDeviceDetection - matchMedia listener cleanup (#46)", () => {
  // Track every MediaQueryList-like object handed out by matchMedia so we can
  // inspect the add/remove calls after mount/unmount.
  interface FakeMediaQueryList {
    media: string;
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  }

  let createdQueries: FakeMediaQueryList[] = [];
  let queryCache: Map<string, FakeMediaQueryList>;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    createdQueries = [];
    queryCache = new Map();
    originalMatchMedia = window.matchMedia;

    // Return the SAME MediaQueryList instance per media string so that the
    // object receiving addEventListener is the same one receiving
    // removeEventListener (mirrors real browser matchMedia identity semantics
    // closely enough for listener-leak assertions).
    const fakeMatchMedia = (query: string): FakeMediaQueryList => {
      let mql = queryCache.get(query);
      if (!mql) {
        mql = {
          media: query,
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        };
        queryCache.set(query, mql);
        createdQueries.push(mql);
      }
      return mql;
    };

    // Provide matchMedia both on window and globalThis (used unqualified in src)
    window.matchMedia = fakeMatchMedia as unknown as typeof window.matchMedia;
    (globalThis as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
      fakeMatchMedia as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
      (globalThis as unknown as { matchMedia: typeof window.matchMedia }).matchMedia =
        originalMatchMedia;
    }
    vi.restoreAllMocks();
  });

  const TestComponent = defineComponent({
    setup() {
      useDeviceDetection();
      return () => null;
    },
  });

  it("adds change listeners to hover/pointer media queries on mount", () => {
    const wrapper = mount(TestComponent);

    // At least the hover and pointer queries used for listening should exist
    const queriesWithChangeListener = createdQueries.filter(
      (q) => q.addEventListener.mock.calls.length > 0
    );

    expect(queriesWithChangeListener.length).toBeGreaterThanOrEqual(2);
    for (const q of queriesWithChangeListener) {
      expect(q.addEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    }

    wrapper.unmount();
  });

  it("removes every change listener it added when unmounted", () => {
    const wrapper = mount(TestComponent);

    const queriesWithChangeListener = createdQueries.filter(
      (q) => q.addEventListener.mock.calls.length > 0
    );
    expect(queriesWithChangeListener.length).toBeGreaterThanOrEqual(2);

    wrapper.unmount();

    // Every "change" listener added must be removed with the same handler
    for (const q of queriesWithChangeListener) {
      const addedHandlers = q.addEventListener.mock.calls
        .filter((call) => call[0] === "change")
        .map((call) => call[1]);
      const removedHandlers = q.removeEventListener.mock.calls
        .filter((call) => call[0] === "change")
        .map((call) => call[1]);

      for (const handler of addedHandlers) {
        expect(removedHandlers).toContain(handler);
      }
      // No leak: as many change removals as additions
      expect(removedHandlers.length).toBeGreaterThanOrEqual(
        addedHandlers.length
      );
    }
  });
});
