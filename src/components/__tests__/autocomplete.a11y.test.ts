import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import AutocompleteDropdown from "../AutocompleteDropdown.vue";
import VariableAutocomplete from "../VariableAutocomplete.vue";
import NextLevelEditor from "../NextLevelEditor.vue";

/**
 * R23-53 / R23-54: the two autocompletes intercepted Enter/Tab/arrows while
 * remaining INVISIBLE to assistive tech.
 *
 * - AutocompleteDropdown put aria-activedescendant on the LISTBOX itself —
 *   inert: the attribute belongs on the FOCUSED element (the editing
 *   surface), pointing INTO the listbox. Its option ids were also global
 *   (`autocomplete-option-0`), colliding across instances (the R23-56 class).
 * - VariableAutocomplete had no listbox semantics at all.
 *
 * The wiring model is R23-5's slash-menu fix: the popup exposes a listbox id
 * and the active option id; the HOST binds aria-haspopup/expanded/controls/
 * activedescendant on the surface. AutocompleteDropdown has no in-editor host
 * (it is a public export), so exposing the bindings IS its fix; the variables
 * popup is hosted by the editor, which merges it with the slash menu's trio.
 */
const wrappers: VueWrapper[] = [];

afterEach(() => {
  while (wrappers.length > 0) wrappers.pop()!.unmount();
  document.body.innerHTML = "";
});

const SUGGESTIONS = [
  { label: "https://a.dev", value: "https://a.dev", type: "url" as const },
  { label: "https://b.dev", value: "https://b.dev", type: "url" as const },
];

const mountDropdown = () => {
  const w = mount(AutocompleteDropdown, {
    attachTo: document.body,
    props: {
      visible: true,
      suggestions: SUGGESTIONS,
      cursorPosition: { x: 10, y: 10 },
    },
  });
  wrappers.push(w);
  // Harness control: the popup must actually render options.
  expect(w.findAll('[role="option"]').length).toBeGreaterThan(0);
  return w;
};

describe("AutocompleteDropdown speaks listbox (#R23-53)", () => {
  it("does not carry the inert aria-activedescendant itself", () => {
    const w = mountDropdown();
    expect(
      w.get('[role="listbox"]').attributes("aria-activedescendant"),
      "activedescendant belongs on the focused element, not the popup"
    ).toBeUndefined();
  });

  it("exposes the ids the host needs to wire the surface", () => {
    const w = mountDropdown();
    const vm = w.vm as unknown as {
      listboxId?: string;
      activeOptionId?: string;
    };

    expect(vm.listboxId, "the listbox must be addressable").toBeTruthy();
    expect(w.get('[role="listbox"]').attributes("id")).toBe(vm.listboxId);
    const active = w.find(".suggestion-item.selected");
    expect(vm.activeOptionId).toBe(active.attributes("id"));
  });

  it("two instances never collide on option ids", () => {
    const a = mountDropdown();
    const b = mountDropdown();

    const idsA = a.findAll('[role="option"]').map((o) => o.attributes("id"));
    const idsB = b.findAll('[role="option"]').map((o) => o.attributes("id"));
    for (const id of idsA) {
      expect(idsB, `id "${id}" must be instance-unique`).not.toContain(id);
    }
  });
});

describe("VariableAutocomplete speaks listbox (#R23-54)", () => {
  const mountVarAc = () => {
    const w = mount(VariableAutocomplete, {
      attachTo: document.body,
      props: {
        variables: [
          {
            id: "user.name",
            name: "user.name",
            label: "User name",
            value: "John",
            category: "user",
          },
          {
            id: "user.email",
            name: "user.email",
            label: "User email",
            value: "j@x",
            category: "user",
          },
        ],
        categories: [{ id: "user", name: "User" }],
        query: "user",
        isOpen: true,
        position: { top: 10, left: 10 },
      },
    });
    wrappers.push(w);
    return w;
  };

  it("renders a labelled listbox with selected-state options", async () => {
    const w = mountVarAc();
    await nextTick();

    const listbox = w.find('[role="listbox"]');
    expect(listbox.exists(), "the popup must be a listbox").toBe(true);
    expect(listbox.attributes("id")).toBeTruthy();

    const options = w.findAll('[role="option"]');
    expect(options.length).toBe(2);
    expect(options[0].attributes("aria-selected")).toBe("true");
    expect(options[1].attributes("aria-selected")).toBe("false");
    expect(options[0].attributes("id")).toBeTruthy();
  });

  it("exposes listboxId and the active option id for the host", async () => {
    const w = mountVarAc();
    await nextTick();
    const vm = w.vm as unknown as {
      listboxId?: string;
      activeOptionId?: string;
    };

    expect(vm.listboxId).toBeTruthy();
    expect(vm.activeOptionId).toBe(
      w.findAll('[role="option"]')[0].attributes("id")
    );
  });
});

describe("the editing surface announces the variables popup (#R23-54)", () => {
  it("binds controls/activedescendant while the popup is visible", async () => {
    const w = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>", enableVariables: true },
      attachTo: document.body,
    });
    wrappers.push(w);
    await nextTick();

    const vm = w.vm as unknown as {
      showVariableAutocomplete: boolean;
      variableAutocompleteQuery: string;
    };
    vm.variableAutocompleteQuery = "user";
    vm.showVariableAutocomplete = true;
    await nextTick();
    await nextTick();

    const surface = w.get(".editor-content");
    const popupListbox = w.find(".variable-autocomplete [role='listbox']");
    expect(popupListbox.exists()).toBe(true);
    expect(surface.attributes("aria-controls")).toBe(
      popupListbox.attributes("id")
    );
    expect(surface.attributes("aria-activedescendant")).toBe(
      w.find(".variable-autocomplete [role='option']").attributes("id")
    );
    // Deliberately NOT aria-expanded: ARIA 1.2 does not allow it on
    // role="textbox", and axe reports it as a critical violation. The open
    // state reaches screen readers through the live region. #R32-1
    expect(surface.attributes("aria-expanded")).toBeUndefined();
    expect(surface.attributes("aria-haspopup")).toBe("listbox");
  });
});
