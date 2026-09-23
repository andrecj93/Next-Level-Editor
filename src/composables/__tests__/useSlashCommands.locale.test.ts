import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { useSlashCommands, type SlashCommandOption } from "../useSlashCommands";
import { createEditorLocaleFormatter } from "../../utils/editorLocale";
import { portugueseMessages } from "../../locales/pt-PT";

describe("slash-command search follows runtime locale changes", () => {
  it("refilters the current query after switching language and changing host messages", async () => {
    const scope = effectScope();
    const locale = ref("en");
    const messages = ref({});
    const formatter = createEditorLocaleFormatter(() => locale.value, () => messages.value,
      () => locale.value === "pt-PT" ? portugueseMessages : {});
    const plugins = ref<SlashCommandOption[]>([]);
    const api = scope.run(() => useSlashCommands({
      handleInlineAction: vi.fn(), handleBlockAction: vi.fn(), handleListAction: vi.fn(),
      insertLink: vi.fn(), insertImage: vi.fn(), openTableModal: vi.fn(),
      openCodeBlockModal: vi.fn(), handleInsertHR: vi.fn(), performWithSelection: vi.fn(),
      translate: formatter.t, pluginSlashCommands: plugins,
    }))!;
    try {
      api.showCommandMenu.value = true;
      for (const key of "título") {
        if (key === "í") {
          const input = new InputEvent("beforeinput", { inputType: "insertText", data: key, cancelable: true });
          expect(api.handleMenuBeforeInput(input)).toBe(true);
          expect(input.defaultPrevented).toBe(true);
        } else api.handleMenuKeydown(new KeyboardEvent("keydown", { key, cancelable: true }));
      }
      expect(api.commandOptions).toHaveLength(0);
      locale.value = "pt-PT";
      await nextTick();
      expect(api.commandOptions.map(option => option.id)).toEqual(["slash-h1", "slash-h2", "slash-h3"]);
      api.handleMenuKeydown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
      expect(api.selectedIndex.value).toBe(1);
      locale.value = "en";
      await nextTick();
      expect(api.commandOptions).toHaveLength(0);
      expect(api.selectedIndex.value).toBe(0);
      expect(api.showCommandMenu.value).toBe(true);

      messages.value = { Table: "Título personalizado" };
      await nextTick();
      expect(api.commandOptions.map(option => option.id)).toEqual(["slash-table"]);
      plugins.value.push({ id: "host", label: "Título do anfitrião", description: "Host command", action: vi.fn() });
      await nextTick();
      expect(api.commandOptions.map(option => option.id)).toEqual(["slash-table", "host"]);
      plugins.value[0].label = "Other command";
      await nextTick();
      expect(api.commandOptions.map(option => option.id)).toEqual(["slash-table"]);
      for (const input of [
        new InputEvent("beforeinput", { inputType: "insertCompositionText", data: "文", isComposing: true, cancelable: true }),
        new InputEvent("beforeinput", { inputType: "insertText", data: "文", cancelable: false }),
      ]) {
        expect(api.handleMenuBeforeInput(input)).toBe(false);
        expect(input.defaultPrevented).toBe(false);
        expect(api.commandOptions.map(option => option.id)).toEqual(["slash-table"]);
      }
    } finally {
      scope.stop();
    }
  });
});
