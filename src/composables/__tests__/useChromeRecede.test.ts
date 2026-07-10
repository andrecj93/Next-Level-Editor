import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { effectScope, ref, type EffectScope, type Ref } from "vue";
import {
  useChromeRecede,
  type UseChromeRecedeReturn,
} from "../useChromeRecede";

/**
 * Behavioral tests for the adaptive-chrome state machine: typing arms and
 * (after a quiet delay) recedes; pointer / selection / chrome-key intent
 * restores instantly. Everything runs inside an effectScope so listener
 * cleanup (onScopeDispose) is testable without mounting a component.
 */
describe("useChromeRecede", () => {
  interface Harness {
    rootEl: HTMLElement;
    inner: HTMLElement;
    toolbarButton: HTMLElement;
    outside: HTMLElement;
    enabled: Ref<boolean>;
    suppressed: Ref<boolean>;
    scope: EffectScope;
    api: UseChromeRecedeReturn;
  }

  let scopes: EffectScope[] = [];

  const createHarness = (
    overrides: {
      enabled?: boolean;
      suppressed?: boolean;
      recedeDelayMs?: number;
      armKeystrokes?: number;
      armWindowMs?: number;
      blockWhen?: () => boolean;
    } = {}
  ): Harness => {
    const rootEl = document.createElement("div");
    const toolbar = document.createElement("div");
    toolbar.className = "editor-toolbar-modern";
    const toolbarButton = document.createElement("button");
    toolbar.appendChild(toolbarButton);
    const inner = document.createElement("p");
    inner.textContent = "hello world";
    rootEl.appendChild(toolbar);
    rootEl.appendChild(inner);
    document.body.appendChild(rootEl);

    const outside = document.createElement("p");
    outside.textContent = "not this editor";
    document.body.appendChild(outside);

    const root = ref<HTMLElement | null>(rootEl);
    const enabled = ref(overrides.enabled ?? true);
    const suppressed = ref(overrides.suppressed ?? false);

    const scope = effectScope();
    const api = scope.run(() =>
      useChromeRecede({
        root,
        enabled,
        suppressed,
        recedeDelayMs: overrides.recedeDelayMs,
        armKeystrokes: overrides.armKeystrokes,
        armWindowMs: overrides.armWindowMs,
        blockWhen: overrides.blockWhen,
      })
    )!;
    scopes.push(scope);

    return { rootEl, inner, toolbarButton, outside, enabled, suppressed, scope, api };
  };

  /** Dispatch one bubbling keydown per character. */
  const type = (target: Element, keys: string[]) => {
    for (const key of keys) {
      target.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true })
      );
    }
  };

  /** Dispatch a single keydown with explicit modifier state (chords). */
  const chord = (
    target: Element,
    key: string,
    init: Pick<KeyboardEventInit, "ctrlKey" | "metaKey" | "altKey"> = {}
  ) => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init })
    );
  };

  /** happy-dom: MouseEvent carries clientX/Y fine for a "pointermove". */
  const pointerMove = (target: Element, x: number, y: number) => {
    target.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y })
    );
  };

  /** Drive a harness into the receded state (3 keystrokes + quiet delay). */
  const recede = (h: Harness) => {
    type(h.inner, ["a", "b", "c"]);
    vi.advanceTimersByTime(900);
    expect(h.api.receded.value).toBe(true);
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    for (const scope of scopes) scope.stop();
    scopes = [];
    document.body.innerHTML = "";
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("arms after 3 keydowns within the window and recedes ~900ms after the last one", () => {
    const h = createHarness();

    type(h.inner, ["a", "b", "c"]);
    expect(h.api.receded.value).toBe(false); // armed, but delay not elapsed

    vi.advanceTimersByTime(500);
    expect(h.api.receded.value).toBe(false);

    // A further keystroke of the burst restarts the delay: recede lands
    // ~900ms after the LAST keystroke, not the arming one.
    type(h.inner, ["d"]);
    vi.advanceTimersByTime(899);
    expect(h.api.receded.value).toBe(false);

    vi.advanceTimersByTime(1);
    expect(h.api.receded.value).toBe(true);
  });

  it("never recedes on a single keystroke", () => {
    const h = createHarness();

    type(h.inner, ["a"]);
    vi.advanceTimersByTime(5000);

    expect(h.api.receded.value).toBe(false);
  });

  it("does not arm when keystrokes are spread beyond the arm window", () => {
    const h = createHarness();

    type(h.inner, ["a"]);
    vi.advanceTimersByTime(1200);
    type(h.inner, ["b"]);
    vi.advanceTimersByTime(1200);
    type(h.inner, ["c"]);
    vi.advanceTimersByTime(3000);

    expect(h.api.receded.value).toBe(false);
  });

  it("counts Backspace/Enter as writing and IME 'Process' keydowns too", () => {
    const h = createHarness();

    type(h.inner, ["Backspace", "Enter", "Process"]);
    vi.advanceTimersByTime(900);

    expect(h.api.receded.value).toBe(true);
  });

  it("returns instantly on pointermove past the 4px jitter threshold", () => {
    const h = createHarness();

    pointerMove(h.inner, 10, 10); // establish the movement baseline
    recede(h);

    pointerMove(h.inner, 12, 11); // ~2.2px — jitter, stays receded
    expect(h.api.receded.value).toBe(true);

    pointerMove(h.inner, 40, 40); // real movement
    expect(h.api.receded.value).toBe(false);
  });

  it("returns on Escape", () => {
    const h = createHarness();
    recede(h);

    type(h.inner, ["Escape"]);

    expect(h.api.receded.value).toBe(false);
  });

  it("returns on a non-collapsed selection inside root, but not a collapsed one", () => {
    const h = createHarness();
    recede(h);

    const getSelection = vi.spyOn(document, "getSelection");

    // Collapsed caret movement (typing) must NOT pop the chrome back.
    getSelection.mockReturnValue({
      isCollapsed: true,
      anchorNode: h.inner,
      focusNode: h.inner,
    } as unknown as Selection);
    document.dispatchEvent(new Event("selectionchange"));
    expect(h.api.receded.value).toBe(true);

    // A real selection is intent.
    getSelection.mockReturnValue({
      isCollapsed: false,
      anchorNode: h.inner,
      focusNode: h.inner,
    } as unknown as Selection);
    document.dispatchEvent(new Event("selectionchange"));
    expect(h.api.receded.value).toBe(false);
  });

  it("returns when focus lands on the toolbar area", () => {
    const h = createHarness();
    recede(h);

    h.toolbarButton.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(h.api.receded.value).toBe(false);
  });

  it("never recedes while suppressed", () => {
    const h = createHarness({ suppressed: true });

    type(h.inner, ["a", "b", "c"]);
    vi.advanceTimersByTime(2000);

    expect(h.api.receded.value).toBe(false);
  });

  it("restores immediately when suppression turns on while receded", () => {
    const h = createHarness();
    recede(h);

    h.suppressed.value = true; // host opened a dropdown/modal

    expect(h.api.receded.value).toBe(false);
  });

  it("never recedes while disabled", () => {
    const h = createHarness({ enabled: false });

    type(h.inner, ["a", "b", "c"]);
    vi.advanceTimersByTime(2000);

    expect(h.api.receded.value).toBe(false);
  });

  it("ignores keystrokes outside its own root (ownership)", () => {
    const h = createHarness();

    type(h.outside, ["a", "b", "c"]);
    vi.advanceTimersByTime(2000);

    expect(h.api.receded.value).toBe(false);
  });

  it("restore() manually resets the receded state", () => {
    const h = createHarness();
    recede(h);

    h.api.restore();

    expect(h.api.receded.value).toBe(false);
  });

  describe("keyboard shortcuts are commands, not writing", () => {
    it("a Ctrl shortcut streak (e.g. Ctrl+Z x3) never arms or recedes", () => {
      const h = createHarness();

      chord(h.inner, "z", { ctrlKey: true });
      chord(h.inner, "z", { ctrlKey: true });
      chord(h.inner, "z", { ctrlKey: true });
      vi.advanceTimersByTime(5000);

      expect(h.api.receded.value).toBe(false);
    });

    it("a Meta (Cmd) shortcut streak never arms or recedes", () => {
      const h = createHarness();

      chord(h.inner, "b", { metaKey: true });
      chord(h.inner, "i", { metaKey: true });
      chord(h.inner, "u", { metaKey: true });
      vi.advanceTimersByTime(5000);

      expect(h.api.receded.value).toBe(false);
    });

    it("a shortcut while armed does not restart the recede timer", () => {
      const h = createHarness();

      type(h.inner, ["a", "b", "c"]); // armed; recede due at +900ms
      vi.advanceTimersByTime(800);
      chord(h.inner, "b", { ctrlKey: true }); // command — must NOT push it out

      // Fires at the original deadline (100ms later), not 900ms later.
      vi.advanceTimersByTime(100);
      expect(h.api.receded.value).toBe(true);
    });

    it("Ctrl+Backspace / Ctrl+Delete are word deletion and DO count as writing", () => {
      const h = createHarness();

      chord(h.inner, "Backspace", { ctrlKey: true });
      chord(h.inner, "Backspace", { ctrlKey: true });
      chord(h.inner, "Delete", { ctrlKey: true });
      vi.advanceTimersByTime(900);

      expect(h.api.receded.value).toBe(true);
    });

    it("AltGr-style chords (ctrlKey+altKey, printable key) count as writing", () => {
      const h = createHarness();

      // Windows AltGr reports ctrlKey && altKey while producing @, €, {, ...
      chord(h.inner, "@", { ctrlKey: true, altKey: true });
      chord(h.inner, "€", { ctrlKey: true, altKey: true });
      chord(h.inner, "{", { ctrlKey: true, altKey: true });
      vi.advanceTimersByTime(900);

      expect(h.api.receded.value).toBe(true);
    });
  });

  describe("blockWhen (DOM-based host veto at fire time)", () => {
    it("blocks the recede when true at fire time, and a later burst recedes once it clears", () => {
      let blocked = true;
      const h = createHarness({ blockWhen: () => blocked });

      // Burst arms and the timer fires — but the host vetoes: no recede, and
      // nothing is rescheduled.
      type(h.inner, ["a", "b", "c"]);
      vi.advanceTimersByTime(900);
      expect(h.api.receded.value).toBe(false);
      vi.advanceTimersByTime(5000); // nothing pending re-fires
      expect(h.api.receded.value).toBe(false);

      // Overlay gone: the machine is still armed, so a later natural burst
      // schedules a fresh recede that now lands.
      blocked = false;
      type(h.inner, ["d"]);
      vi.advanceTimersByTime(900);
      expect(h.api.receded.value).toBe(true);
    });

    it("is consulted per fire: a false blockWhen never interferes", () => {
      const blockWhen = vi.fn(() => false);
      const h = createHarness({ blockWhen });

      type(h.inner, ["a", "b", "c"]);
      vi.advanceTimersByTime(900);

      expect(blockWhen).toHaveBeenCalledTimes(1);
      expect(h.api.receded.value).toBe(true);
    });
  });

  it("removes listeners and cancels timers on scope dispose", () => {
    const h = createHarness();

    // Leave a pending recede timer behind, then dispose.
    type(h.inner, ["a", "b", "c"]);
    h.scope.stop();

    // The pending timer must have been cleared...
    vi.advanceTimersByTime(2000);
    expect(h.api.receded.value).toBe(false);

    // ...and fresh keystrokes must be inert (listeners removed).
    type(h.inner, ["x", "y", "z"]);
    vi.advanceTimersByTime(2000);
    expect(h.api.receded.value).toBe(false);
  });
});
