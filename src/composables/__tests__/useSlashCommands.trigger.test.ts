import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import {
  useSlashCommands,
  type UseSlashCommandsOptions,
} from "../useSlashCommands";

/**
 * R24-19: SlashCommand.trigger is part of the public plugin type ("shortcut
 * text that summons this command"), but the filter matched only
 * label/description — a plugin declaring { trigger: "tbl", label: "Data
 * grid" } never matched when the user typed "/tbl".
 */
const makeOptions = (): UseSlashCommandsOptions => ({
  handleInlineAction: vi.fn(),
  handleBlockAction: vi.fn(),
  handleListAction: vi.fn(),
  insertLink: vi.fn(),
  insertImage: vi.fn(),
  openTableModal: vi.fn(),
  openCodeBlockModal: vi.fn(),
  handleInsertHR: vi.fn(),
  performWithSelection: vi.fn(),
  pluginSlashCommands: {
    value: [
      {
        id: "grid",
        label: "Data grid",
        description: "Inserts a grid",
        trigger: "tbl",
        action: vi.fn(),
      },
    ],
  } as never,
});

/** Type-to-filter goes through handleMenuKeydown — the host feeds it keys. */
const type = (api: ReturnType<typeof useSlashCommands>, text: string) => {
  for (const ch of text) {
    api.handleMenuKeydown(
      new KeyboardEvent("keydown", { key: ch, bubbles: true, cancelable: true })
    );
  }
};

/**
 * openCommandMenu resolves on nextTick and bails without a caret, and
 * handleMenuKeydown no-ops while the menu is closed — so the harness needs a
 * real selection inside an editor and an await before typing.
 */
const openMenuFor = async (api: ReturnType<typeof useSlashCommands>) => {
  const editor = document.createElement("div");
  editor.className = "next-level-editor";
  editor.contentEditable = "true";
  editor.innerHTML = "<p>x</p>";
  document.body.appendChild(editor);
  const range = document.createRange();
  range.selectNodeContents(editor.querySelector("p")!);
  range.collapse(false);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);

  api.openCommandMenu();
  await nextTick();
  await nextTick();
  expect(api.showCommandMenu.value, "harness: menu must be open").toBe(true);
  return editor;
};

describe("slash filter honours a command's trigger (#R24-19)", () => {
  it("typing the trigger keeps the command in the menu", async () => {
    const api = useSlashCommands(makeOptions());
    const editor = await openMenuFor(api);

    // "tbl" appears nowhere in "Data grid" / "Inserts a grid" — only the
    // declared trigger can match it.
    type(api, "tbl");

    expect(
      api.commandOptions.some((option) => option.id === "grid"),
      "the documented trigger must reach the filter"
    ).toBe(true);
    editor.remove();
  });

  it("a query matching nothing still filters the command out (control)", async () => {
    const api = useSlashCommands(makeOptions());
    const editor = await openMenuFor(api);

    type(api, "zzz");

    expect(api.commandOptions.some((option) => option.id === "grid")).toBe(
      false
    );
    editor.remove();
  });
});
