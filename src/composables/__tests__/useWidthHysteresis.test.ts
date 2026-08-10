import { describe, it, expect } from "vitest";
import { ref, nextTick } from "vue";
import { useWidthHysteresis } from "../useWidthHysteresis";

describe("useWidthHysteresis", () => {
  it("starts inactive when the initial width is above the enter threshold", () => {
    const width = ref(Number.POSITIVE_INFINITY);
    const active = useWidthHysteresis(width, 640, 720);
    expect(active.value).toBe(false);
  });

  it("starts active when the initial width is already at/below the enter threshold", () => {
    const width = ref(500);
    const active = useWidthHysteresis(width, 640, 720);
    expect(active.value).toBe(true);
  });

  it("activates at/below the enter threshold and holds inside the dead band", async () => {
    const width = ref(1000);
    const active = useWidthHysteresis(width, 640, 720);
    expect(active.value).toBe(false);

    width.value = 640; // enter
    await nextTick();
    expect(active.value).toBe(true);

    // Inside the dead band (640 < w < 720): must NOT flip back.
    width.value = 700;
    await nextTick();
    expect(active.value).toBe(true);

    width.value = 719;
    await nextTick();
    expect(active.value).toBe(true);
  });

  it("only deactivates once width reaches the (higher) exit threshold", async () => {
    const width = ref(500);
    const active = useWidthHysteresis(width, 640, 720);
    expect(active.value).toBe(true);

    width.value = 700; // still inside dead band
    await nextTick();
    expect(active.value).toBe(true);

    width.value = 720; // exit
    await nextTick();
    expect(active.value).toBe(false);
  });

  it("does not oscillate when the width wobbles around the enter threshold", async () => {
    const width = ref(1000);
    const active = useWidthHysteresis(width, 640, 720);

    // Drop just below enter → active.
    width.value = 639;
    await nextTick();
    expect(active.value).toBe(true);

    // A jittery series entirely inside the dead band stays active throughout —
    // the exact churn a single threshold would produce.
    for (const w of [645, 660, 641, 700, 650, 719, 642]) {
      width.value = w;
      await nextTick();
      expect(active.value).toBe(true);
    }

    // Only a real climb past exit clears it.
    width.value = 800;
    await nextTick();
    expect(active.value).toBe(false);

    // And it stays clear across the dead band on the way back down…
    for (const w of [719, 700, 660, 641]) {
      width.value = w;
      await nextTick();
      expect(active.value).toBe(false);
    }

    // …until it crosses enter again.
    width.value = 640;
    await nextTick();
    expect(active.value).toBe(true);
  });
});
