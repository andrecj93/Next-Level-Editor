import { describe, it, expect } from "vitest";
import { createApp, defineComponent, h } from "vue";
import { useStableId } from "../useStableId";

/**
 * R23-56 (and the palette/skip-link collisions that follow from it): the ids
 * came straight from Vue 3.5's `useId()`, whose counter is PER APP with the
 * same default prefix for every app. The documented way to drop the editor into
 * a non-Vue host page twice is two independent `createApp().mount()` calls —
 * and both were handed "v-0", so both editors stamped id="v-0-main" on their
 * editing surface. `SkipLinks` does `document.getElementById(targetId)`, which
 * returns the FIRST match, so the SECOND editor's "Skip to main content" link
 * focused and scrolled to the FIRST editor. CommandPalette's listbox/option ids
 * collided the same way, pointing aria-activedescendant at another editor.
 */
const mountAppReturningId = (): string => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let id = "";
  const app = createApp(
    defineComponent({
      setup() {
        id = useStableId();
        return () => h("div");
      },
    })
  );
  app.mount(host);
  app.unmount();
  host.remove();
  return id;
};

describe("useStableId is unique across separate Vue apps (#R23-56)", () => {
  it("hands two independently-mounted apps different ids", () => {
    const first = mountAppReturningId();
    const second = mountAppReturningId();

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it("keeps ids unique across three apps", () => {
    const ids = [
      mountAppReturningId(),
      mountAppReturningId(),
      mountAppReturningId(),
    ];
    expect(new Set(ids).size).toBe(3);
  });

  it("still gives two components in the SAME app different ids", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const seen: string[] = [];
    const Child = defineComponent({
      setup() {
        seen.push(useStableId());
        return () => h("span");
      },
    });
    const app = createApp(
      defineComponent({
        setup: () => () => h("div", [h(Child), h(Child)]),
      })
    );
    app.mount(host);
    app.unmount();
    host.remove();

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });
});
