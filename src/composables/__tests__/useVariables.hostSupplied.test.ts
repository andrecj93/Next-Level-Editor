import { describe, it, expect, afterEach } from "vitest";
import { ref, nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import { useVariables, type Variable } from "../useVariables";
import NextLevelEditor from "../../components/NextLevelEditor.vue";

/**
 * R23-46: README.md promises "Custom variables — add your own variables
 * programmatically", and docs/VARIABLES_SYSTEM.md gives a recipe. It was
 * impossible: the editor calls useVariables() itself, and every call builds a
 * BRAND-NEW ref([...]), so a host calling useVariables() in its own component
 * mutates a list nothing renders. There was no `variables` prop and no
 * provide/inject, so the panel and the {{ autocomplete always showed the 14
 * built-in demo fixtures ("John Doe", "Acme Corp") and inserted THEIR values.
 *
 * Contract: a host-supplied set REPLACES the demo fixtures (a real app must not
 * ship "John Doe" in its picker); with no prop the built-ins remain, so the
 * demo and every existing consumer are unaffected.
 */
const HOST_VARS: Variable[] = [
  {
    id: "user.name",
    name: "userName",
    label: "User Name",
    value: "Jane Smith",
    category: "user",
  },
  {
    id: "custom.projectName",
    name: "projectName",
    label: "Project Name",
    value: "Apollo",
    category: "custom",
  },
];

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

describe("host-supplied variables (#R23-46)", () => {
  it("uses the host's set instead of the demo fixtures", () => {
    const api = useVariables({ variables: HOST_VARS });

    const names = api.variables.value.map((v) => v.name);
    expect(names).toContain("projectName");
    // The demo fixtures must be gone — a real app cannot ship "John Doe".
    expect(
      api.variables.value.some((v) => v.value === "John Doe")
    ).toBe(false);
  });

  it("inserts the HOST's value, not the built-in one", () => {
    const api = useVariables({ variables: HOST_VARS });

    const out = api.replaceVariables("Hi {{userName}}, welcome to {{projectName}}");

    expect(out).toContain("Jane Smith");
    expect(out).toContain("Apollo");
    expect(out).not.toContain("John Doe");
  });

  it("tracks the host list reactively", async () => {
    const hostList = ref<Variable[]>([...HOST_VARS]);
    const api = useVariables({ variables: hostList });

    expect(api.variables.value).toHaveLength(2);

    hostList.value = [
      ...hostList.value,
      {
        id: "custom.tier",
        name: "tier",
        label: "Tier",
        value: "Enterprise",
        category: "custom",
      },
    ];
    await nextTick();

    expect(api.variables.value.map((v) => v.name)).toContain("tier");
    expect(api.replaceVariables("{{tier}}")).toContain("Enterprise");
  });

  it("keeps the built-in set when the host supplies nothing", () => {
    // Back-compat: existing consumers and the demo keep working untouched.
    const api = useVariables();

    expect(api.variables.value.length).toBeGreaterThan(5);
    expect(api.variables.value.some((v) => v.value === "John Doe")).toBe(true);
  });

  it("a host-supplied value beats the built-in live resolver on id collision (#R24-14)", () => {
    // The host set REPLACES the built-ins — including their liveness. A host
    // pinning { id: "date.today", value: "15/01/2026" } (an as-of date, or
    // their own locale format) must get THAT, not the default-locale clock;
    // the REQUIRED `value` field cannot be silently ignored.
    const api = useVariables({
      variables: [
        {
          id: "date.today",
          name: "asOfDate",
          label: "As-of date",
          value: "FROZEN-DATE",
          category: "date",
        },
      ],
    });

    const frozen = api.variables.value.find((v) => v.id === "date.today")!;
    expect(api.resolveVariableValue(frozen)).toBe("FROZEN-DATE");
  });

  it("without a host set, built-in dynamic dates still resolve live (control)", () => {
    const api = useVariables();
    const today = api.variables.value.find((v) => v.id === "date.year")!;

    expect(api.resolveVariableValue(today)).toBe(
      new Date().getFullYear().toString()
    );
  });

  it("updateVariableValue never writes into the HOST's own objects (#R24-15)", async () => {
    const hostRef = ref<Variable[]>([
      {
        id: "user.name",
        name: "userName",
        label: "User Name",
        value: "Original",
        category: "user",
      },
    ]);
    const api = useVariables({ variables: hostRef });

    api.updateVariableValue("userName", "Changed");
    await nextTick();

    expect(
      hostRef.value[0].value,
      "the host application's object must not be mutated"
    ).toBe("Original");
    expect(
      api.variables.value.find((v) => v.name === "userName")?.value
    ).toBe("Changed");
  });

  it("a locally added variable survives a host deep-change (#R24-15)", async () => {
    // The composable's own comment promises addVariable "keeps working on top
    // of the host's set" — a host tweaking one value must not silently erase
    // what the app added.
    const hostRef = ref<Variable[]>([
      {
        id: "user.name",
        name: "userName",
        label: "User Name",
        value: "A",
        category: "user",
      },
    ]);
    const api = useVariables({ variables: hostRef });
    api.addVariable({
      id: "local.extra",
      name: "extra",
      label: "Extra",
      value: "kept",
      category: "user",
    });

    hostRef.value[0].value = "B";
    await nextTick();

    expect(api.variables.value.some((v) => v.id === "local.extra")).toBe(true);
    expect(
      api.variables.value.find((v) => v.name === "userName")?.value
    ).toBe("B");
  });

  it("inserting a specific panel row stamps THAT row's value on duplicate names (#R24-20)", () => {
    // getVariable() finds first-by-name; with a host set where two variables
    // share a display name, clicking the SECOND panel row previewed its value
    // but inserted the FIRST's. The insert path can carry the exact variable.
    const api = useVariables({
      variables: [
        {
          id: "user.email",
          name: "email",
          label: "User email",
          value: "a@x",
          category: "user",
        },
        {
          id: "company.email",
          name: "email",
          label: "Company email",
          value: "b@x",
          category: "company",
        },
      ],
    });
    const editor = document.createElement("div");
    editor.innerHTML = "<p>Hi</p>";
    document.body.appendChild(editor);
    const range = document.createRange();
    range.selectNodeContents(editor.querySelector("p")!);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const second = api.variables.value.find((v) => v.id === "company.email")!;
    api.insertVariable(editor, second.name, second);

    const pill = editor.querySelector<HTMLElement>(".editor-variable")!;
    expect(pill.dataset.value, "the clicked row's value must be stamped").toBe(
      "b@x"
    );
    editor.remove();
  });

  it("a print/export refresh keeps the exact-inserted value on duplicate names (#R25-1)", () => {
    // R24-20 pinned the clicked row at insertion — but the pill only stored
    // the NAME, so the very next beforeprint/export refresh re-resolved
    // first-by-name and durably clobbered the pinned value. The pill now
    // carries data-variable-id and refresh resolves by id first.
    const api = useVariables({
      variables: [
        {
          id: "user.email",
          name: "email",
          label: "User email",
          value: "a@x",
          category: "user",
        },
        {
          id: "company.email",
          name: "email",
          label: "Company email",
          value: "b@x",
          category: "company",
        },
      ],
    });
    const editor = document.createElement("div");
    editor.innerHTML = "<p>Hi</p>";
    document.body.appendChild(editor);
    const range = document.createRange();
    range.selectNodeContents(editor.querySelector("p")!);
    range.collapse(false);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const second = api.variables.value.find((v) => v.id === "company.email")!;
    api.insertVariable(editor, second.name, second);

    // The beforeprint pass (live DOM) …
    api.refreshVariablePills(editor);
    const pill = editor.querySelector<HTMLElement>(".editor-variable")!;
    expect(pill.dataset.value, "print refresh must honour the pinned row").toBe(
      "b@x"
    );

    // … and the export pass (string) both keep the pinned identity.
    const out = api.refreshVariableValuesInHtml(editor.innerHTML);
    expect(out).toContain('data-value="b@x"');
    expect(out).not.toContain('data-value="a@x"');
    editor.remove();
  });

  it("refresh stamps the resolved id onto a legacy name-only pill (#R25-1)", () => {
    const api = useVariables();
    const editor = document.createElement("div");
    editor.innerHTML =
      '<p><span class="editor-variable" data-variable="user.name" ' +
      'data-value="x">{{ user.name }}</span></p>';
    document.body.appendChild(editor);

    api.refreshVariablePills(editor);

    const pill = editor.querySelector<HTMLElement>(".editor-variable")!;
    expect(
      pill.dataset.variableId,
      "resolving by name should pin the identity for future refreshes"
    ).toBe("user.name");
    editor.remove();
  });

  it("a pinned id survives its variable being transiently absent (#R26-5)", async () => {
    // With duplicate display names, the name-fallback used to OVERWRITE the
    // pin: if the pinned variable was momentarily missing (filtered/loading)
    // while a same-name sibling remained, one refresh durably rebound the
    // pill to the sibling — the exact clobber the pin exists to prevent. An
    // id-carrying pill never falls back by name; a transient absence renders
    // the token and re-resolves when the variable returns.
    const hostRef = ref<Variable[]>([
      {
        id: "user.email",
        name: "email",
        label: "User email",
        value: "a@x",
        category: "user",
      },
      {
        id: "company.email",
        name: "email",
        label: "Company email",
        value: "b@x",
        category: "company",
      },
    ]);
    const api = useVariables({ variables: hostRef });
    const pinned =
      '<p><span class="editor-variable" data-variable="email" ' +
      'data-variable-id="company.email" data-value="b@x">{{ email }}</span></p>';

    // The pinned variable vanishes while its same-name sibling remains.
    hostRef.value = [hostRef.value[0]];
    await nextTick();
    const whileAbsent = api.refreshVariableValuesInHtml(pinned);
    expect(whileAbsent).toContain('data-variable-id="company.email"');
    expect(whileAbsent).not.toContain('data-value="a@x"');

    // It returns — the pill must resolve IT again, not the sibling.
    hostRef.value = [
      hostRef.value[0],
      {
        id: "company.email",
        name: "email",
        label: "Company email",
        value: "b@x",
        category: "company",
      },
    ];
    await nextTick();
    const restored = api.refreshVariableValuesInHtml(whileAbsent);
    expect(restored).toContain('data-value="b@x"');
  });

  it("a host value that is legitimately empty refreshes as empty, not as the token (#R25-2)", () => {
    // The #r15-36 token fallback is for variables that no longer RESOLVE
    // (deleted/renamed). A host explicitly supplying "" (client has no fax)
    // must print/export as empty — the panel already previews it as empty.
    const api = useVariables({
      variables: [
        {
          id: "client.fax",
          name: "clientFax",
          label: "Client fax",
          value: "",
          category: "company",
        },
      ],
    });
    const doc =
      '<p><span class="editor-variable" data-variable="clientFax" ' +
      'data-value="stale">{{ clientFax }}</span></p>';

    const out = api.refreshVariableValuesInHtml(doc);

    expect(out).toContain('data-value=""');
    expect(out).not.toContain("stale");
    expect(out).not.toContain('data-value="{{ clientFax }}"');
  });

  it("an UNRESOLVABLE variable still falls back to its token (control, #r15-36)", () => {
    const api = useVariables();
    const doc =
      '<p><span class="editor-variable" data-variable="gone.var" ' +
      'data-value="">{{ gone.var }}</span></p>';

    const out = api.refreshVariableValuesInHtml(doc);

    expect(out).toContain('data-value="{{ gone.var }}"');
  });

  it("threads the component's `variables` prop through to the panel", async () => {
    wrapper = mount(NextLevelEditor, {
      props: {
        modelValue: "<p>hi</p>",
        enableVariables: true,
        variables: HOST_VARS,
      },
      attachTo: document.body,
    });
    await nextTick();

    const vm = wrapper.vm as unknown as {
      variablesComposable: { variables: { value: Variable[] } } | null;
    };
    const names = vm.variablesComposable?.variables.value.map((v) => v.name);
    expect(names).toContain("projectName");
    expect(
      vm.variablesComposable?.variables.value.some((v) => v.value === "John Doe")
    ).toBe(false);
  });
});
