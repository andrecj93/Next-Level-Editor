import { describe, it, expect, afterEach } from "vitest";
import { effectScope, nextTick, ref, type EffectScope } from "vue";
import { useFloatingChromeOwner } from "../useFloatingChromeOwner";

/**
 * R23-30 / R23-58: the FAB column (`position: fixed; right: 28px; bottom: 28px`)
 * and the auto-save chip (`fixed; bottom: 20px; left: 20px`) are painted at
 * hard-coded VIEWPORT coordinates. Two mounted editors therefore stack two
 * identical circles on the same pixels: you cannot tell whose comments you are
 * about to toggle, and only the last-painted one is clickable. Two auto-save
 * chips overlap the same way, so one save state hides the other.
 *
 * Same family as the mobile toolbar and the selection bubble, but with one
 * crucial difference: those appear only once you interact, while the FABs are
 * DISCOVERY affordances — on the overwhelmingly common single-editor page they
 * must be visible before any interaction. So ownership needs a default, not just
 * a transfer rule: mount order decides until the user shows intent.
 */
const scopes: EffectScope[] = [];

const makeInstance = (root: HTMLElement) => {
  const scope = effectScope();
  scopes.push(scope);
  const rootRef = ref<HTMLElement | null>(root);
  const result = scope.run(() => useFloatingChromeOwner(rootRef))!;
  return { ...result, scope };
};

const makeRoot = (): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = "<p>content</p>";
  document.body.appendChild(el);
  return el;
};

const interact = (target: Element, type = "pointerdown") => {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true }));
};

/**
 * happy-dom has no layout engine — every getBoundingClientRect is zeros, which
 * is why the composable treats "nothing measurable" as a distinct case. To test
 * the visibility rule the geometry has to be supplied explicitly.
 */
const stubRect = (
  el: HTMLElement,
  { top, bottom }: { top: number; bottom: number }
) => {
  el.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      left: 0,
      right: 800,
      width: 800,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
};

afterEach(() => {
  while (scopes.length > 0) scopes.pop()!.stop();
  document.body.innerHTML = "";
});

describe("useFloatingChromeOwner (#R23-30, #R23-58)", () => {
  it("a lone editor owns the fixed chrome with no interaction at all", () => {
    // The single-editor page is the common case: hiding its FABs until first
    // click would be a worse bug than the one being fixed.
    const only = makeInstance(makeRoot());

    expect(only.owns.value).toBe(true);
  });

  it("with two editors, only the first-mounted one owns it", () => {
    const first = makeInstance(makeRoot());
    const second = makeInstance(makeRoot());

    expect(first.owns.value).toBe(true);
    expect(second.owns.value).toBe(false);
  });

  it("interacting with the second editor hands ownership over", () => {
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    const first = makeInstance(firstRoot);
    const second = makeInstance(secondRoot);

    interact(secondRoot.querySelector("p")!);

    expect(second.owns.value).toBe(true);
    expect(first.owns.value, "exactly one owner at a time").toBe(false);
  });

  it("focus counts as intent too (keyboard users never touch a pointer)", () => {
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    makeInstance(firstRoot);
    const second = makeInstance(secondRoot);

    secondRoot
      .querySelector("p")!
      .dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(second.owns.value).toBe(true);
  });

  it("clicking plain page content leaves ownership where it was", () => {
    // Page furniture is not a claim: the affordances must not blink out
    // because the reader clicked a heading next to the editor.
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    const first = makeInstance(firstRoot);
    const second = makeInstance(secondRoot);
    interact(secondRoot.querySelector("p")!);

    const outside = document.createElement("h1");
    document.body.appendChild(outside);
    interact(outside);

    expect(second.owns.value).toBe(true);
    expect(first.owns.value).toBe(false);
  });

  it("ownership falls back when the owner unmounts", () => {
    const first = makeInstance(makeRoot());
    const second = makeInstance(makeRoot());
    expect(second.owns.value).toBe(false);

    first.scope.stop();

    expect(second.owns.value, "the survivor must show its chrome").toBe(true);
  });

  it("ownership falls back when the INTERACTION owner unmounts", () => {
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    const first = makeInstance(firstRoot);
    const second = makeInstance(secondRoot);
    interact(secondRoot.querySelector("p")!);
    expect(first.owns.value).toBe(false);

    second.scope.stop();

    expect(first.owns.value).toBe(true);
  });

  it("gives the corner to the editor on screen, not the first mounted", () => {
    // The demo home page has eight editors; three of them show a different FAB
    // and one section's caption literally reads "open the variables panel". If
    // the hero editor kept the corner forever, that instruction would be
    // impossible to follow — so what the reader is LOOKING at decides.
    const heroRoot = makeRoot();
    const variablesRoot = makeRoot();
    const hero = makeInstance(heroRoot);
    const variables = makeInstance(variablesRoot);

    // Reader has scrolled the hero off the top; the variables demo fills the view.
    stubRect(heroRoot, { top: -900, bottom: -500 });
    stubRect(variablesRoot, { top: 40, bottom: 440 });
    variables.refresh();

    expect(variables.owns.value).toBe(true);
    expect(hero.owns.value).toBe(false);
  });

  it("an interaction claim lapses once that editor scrolls away", () => {
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    const first = makeInstance(firstRoot);
    const second = makeInstance(secondRoot);

    // Reader works in the first editor while both are on screen.
    stubRect(firstRoot, { top: 10, bottom: 300 });
    stubRect(secondRoot, { top: 320, bottom: 600 });
    first.refresh();
    interact(firstRoot.querySelector("p")!);
    expect(first.owns.value).toBe(true);

    // Then scrolls it out of view entirely.
    stubRect(firstRoot, { top: -700, bottom: -400 });
    stubRect(secondRoot, { top: 20, bottom: 500 });
    first.refresh();

    expect(second.owns.value, "the corner follows the reader").toBe(true);
    expect(first.owns.value).toBe(false);
  });

  it("keeps the claim while its editor is still partly visible", () => {
    // Working in a half-scrolled editor must not hand the corner to a
    // neighbour just because the neighbour shows more pixels.
    const workedInRoot = makeRoot();
    const biggerRoot = makeRoot();
    const workedIn = makeInstance(workedInRoot);
    const bigger = makeInstance(biggerRoot);

    stubRect(workedInRoot, { top: -200, bottom: 120 });
    stubRect(biggerRoot, { top: 140, bottom: 700 });
    workedIn.refresh();
    interact(workedInRoot.querySelector("p")!);

    expect(workedIn.owns.value).toBe(true);
    expect(bigger.owns.value).toBe(false);
  });

  it("an interaction claim wins even when the visibility ledger is stale (#R24-6)", () => {
    // Layout shifts fire no scroll event: content above an editor grows and
    // moves it into view without any scroll. The ledger still says "not
    // visible", and the OLD code let that stale snapshot veto a fresh, real
    // interaction claim. An interaction is ground truth — re-measure and honor.
    const firstRoot = makeRoot();
    const secondRoot = makeRoot();
    const first = makeInstance(firstRoot);
    const second = makeInstance(secondRoot);

    // Measured while only the FIRST editor was on screen…
    stubRect(firstRoot, { top: 10, bottom: 400 });
    stubRect(secondRoot, { top: 900, bottom: 1300 });
    first.refresh();
    expect(first.owns.value).toBe(true);

    // …then a layout shift brings the SECOND into view — NO refresh call —
    // and the user clicks into it.
    stubRect(firstRoot, { top: -800, bottom: -400 });
    stubRect(secondRoot, { top: 60, bottom: 460 });
    interact(secondRoot.querySelector("p")!);

    expect(
      second.owns.value,
      "a real interaction must not lose to a stale snapshot"
    ).toBe(true);
    expect(first.owns.value).toBe(false);
  });

  it("leaves the corner empty when no editor is on screen", () => {
    // Measured on the demo home page: scrolled down to the footer, the old
    // mount-order fallback floated the hero editor's stats FAB over content
    // hundreds of pixels away from any editor.
    const root = makeRoot();
    const only = makeInstance(root);
    stubRect(root, { top: 40, bottom: 400 });
    only.refresh();
    expect(only.owns.value).toBe(true);

    stubRect(root, { top: -2000, bottom: -1600 });
    only.refresh();

    expect(only.owns.value).toBe(false);
  });

  it("re-measures AFTER the dying editor's layout slot is gone (#R25-4)", async () => {
    // onScopeDispose runs BEFORE Vue removes the unmounted subtree, so a
    // synchronous dispose-time measure reads the PRE-removal layout: editor A
    // fills the viewport, B sits below the fold; removing A measured B as
    // off-screen, left the corner ownerless, and the reflow that follows fires
    // no scroll/resize event — a visible lone editor with no chrome until the
    // next unrelated interaction.
    const aRoot = makeRoot();
    const bRoot = makeRoot();
    const a = makeInstance(aRoot);
    const b = makeInstance(bRoot);

    stubRect(aRoot, { top: 0, bottom: 700 });
    // B's position depends on whether A still occupies its slot — exactly
    // what the real page does when A is removed and B reflows up.
    bRoot.getBoundingClientRect = () =>
      ({
        top: document.contains(aRoot) ? 900 : 40,
        bottom: document.contains(aRoot) ? 1580 : 720,
        left: 0,
        right: 800,
        width: 800,
        height: 680,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    a.refresh();
    // Flush the registration-time deferred measures first — in a real page
    // they fired right after mount, long before this unmount; leaving them
    // pending here would mask the dispose-time defect.
    await nextTick();
    expect(a.owns.value).toBe(true);

    // Unmount order in the real runtime: scope disposal first, DOM removal
    // after — reproduced explicitly.
    a.scope.stop();
    aRoot.remove();
    await nextTick();

    expect(
      b.owns.value,
      "the survivor must own the corner once the layout settles"
    ).toBe(true);
  });

  it("re-mounting after every editor is gone still yields an owner", () => {
    // Guards the module-scope registry against leaking state between pages
    // (and between tests): a fresh lone instance owns the chrome.
    const first = makeInstance(makeRoot());
    first.scope.stop();

    const fresh = makeInstance(makeRoot());

    expect(fresh.owns.value).toBe(true);
  });
});
