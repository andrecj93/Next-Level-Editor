import { ref, watch, type Ref } from "vue";

/**
 * Hysteresis gate for a width-driven boolean — e.g. the toolbar's auto-compact
 * flip.
 *
 * A single threshold makes a boolean chatter whenever the measured width
 * hovers right at the breakpoint (a panel opening, a resize drag, sub-pixel
 * ResizeObserver deltas): it flips on/off/on every frame, which is exactly the
 * "toolbar keeps switching" churn we want gone. Two thresholds with a dead band
 * fix it:
 *
 * - turns ON  when `width <= enterAtOrBelow`
 * - turns OFF only when `width >= exitAtOrAbove` (with `exitAtOrAbove` set
 *   comfortably above `enterAtOrBelow`)
 *
 * Between the two thresholds the state simply holds, so a width wobbling inside
 * the dead band never oscillates the result.
 *
 * Pure state: it reads `width` and returns a boolean ref. Callers bind the
 * result to a class/computed and animate in CSS.
 */
export function useWidthHysteresis(
  width: Ref<number>,
  enterAtOrBelow: number,
  exitAtOrAbove: number
): Ref<boolean> {
  const active = ref(width.value <= enterAtOrBelow);

  watch(width, (w) => {
    if (!active.value && w <= enterAtOrBelow) {
      active.value = true;
    } else if (active.value && w >= exitAtOrAbove) {
      active.value = false;
    }
  });

  return active;
}
