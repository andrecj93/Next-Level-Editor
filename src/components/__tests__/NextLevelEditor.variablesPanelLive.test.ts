import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-65: the variables panel rendered `variable.value`, which for
 * date.today / date.now / date.year / date.month is the string computed ONCE
 * when the composable was created. Inserting the same row resolves live through
 * DYNAMIC_VALUE_RESOLVERS — so the panel advertised a stale clock (or, across
 * midnight, yesterday's date) and then inserted something different. A preview
 * must preview what you will actually get.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const STALE = "STALE-PLACEHOLDER";

const openPanelWithStaleClock = async () => {
  wrapper = mount(NextLevelEditor, {
    props: { modelValue: "<p>hi</p>", enableVariables: true },
    attachTo: document.body,
  });
  await nextTick();

  const vm = wrapper.vm as unknown as {
    variablesComposable: {
      variables: { value: Array<{ id: string; value: string }> };
    };
    showVariablesPanel: boolean;
  };

  // Simulate the passage of time the cheap, deterministic way: poison the
  // STORED value for every dynamic variable. A live-resolving panel can never
  // render it; a panel reading variable.value renders it verbatim.
  const dynamicIds = ["date.today", "date.now", "date.year", "date.month"];
  let poisoned = 0;
  for (const variable of vm.variablesComposable.variables.value) {
    if (dynamicIds.includes(variable.id)) {
      variable.value = STALE;
      poisoned += 1;
    }
  }
  expect(poisoned, "expected the built-in dynamic date variables").toBe(4);

  vm.showVariablesPanel = true;
  await nextTick();
  await nextTick();
  return wrapper;
};

describe("variables panel previews the live value (#R23-65)", () => {
  it("never shows the frozen mount-time value for a dynamic variable", async () => {
    await openPanelWithStaleClock();

    const panel = wrapper!.find(".variables-panel-list");
    expect(panel.exists()).toBe(true);
    expect(panel.text()).not.toContain(STALE);
  });

  it("shows a real resolved date for the Today row", async () => {
    await openPanelWithStaleClock();

    const rows = wrapper!.findAll(".variables-panel-item");
    expect(rows.length).toBeGreaterThan(0);
    // The year resolver is the one value that is stable enough to assert on.
    const year = new Date().getFullYear().toString();
    const panelText = wrapper!.find(".variables-panel-list").text();
    expect(panelText).toContain(year);
  });

  it("still shows static variables' own values", async () => {
    // Control: only DYNAMIC ids resolve live; a plain variable keeps its value.
    await openPanelWithStaleClock();

    const panelText = wrapper!.find(".variables-panel-list").text();
    expect(panelText).toContain("John Doe");
  });
});
