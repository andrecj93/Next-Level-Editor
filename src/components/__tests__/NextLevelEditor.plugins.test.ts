import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { nextTick } from "vue";
import NextLevelEditor from "../NextLevelEditor.vue";
import * as publicApi from "../../index";
import type { EditorPlugin, PluginContext } from "../../types/plugin";

/**
 * R23-45: the README and the website docs advertise a plugin system that could
 * not be reached from the published package. usePlugin() was never called by
 * NextLevelEditor, setPluginContext() was never called anywhere (so
 * pluginContext stayed null and install() could never run), the
 * pluginToolbarButtons / pluginCommands / pluginSlashCommands computeds had no
 * consumers, none of usePlugin / createPlugin / EditorPlugin / PluginContext
 * were exported from src/index.ts, and there was no `plugins` prop.
 *
 * A promise the tarball cannot keep is worse than an absent feature, so this
 * covers the whole path a consumer actually walks: import the API, pass a
 * plugin, get install() called with a live context, and see the plugin's slash
 * command and toolbar button in the editor.
 */
let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  document.body.innerHTML = "";
});

const makePlugin = (spy: {
  install?: (c: PluginContext) => void;
  slash?: () => void;
  button?: () => void;
}): EditorPlugin => ({
  name: "test-plugin",
  version: "1.0.0",
  description: "A plugin used by the reachability test",
  install: spy.install,
  toolbarButtons: [
    {
      id: "tp-button",
      label: "Plugin Button",
      title: "Does a plugin thing",
      onClick: spy.button ?? (() => {}),
    },
  ],
  slashCommands: [
    {
      id: "tp-slash",
      trigger: "pluginthing",
      label: "Plugin Thing",
      description: "Inserted by a plugin",
      execute: spy.slash ?? (() => {}),
    },
  ],
});

const mountWithPlugin = async (plugin: EditorPlugin) => {
  wrapper = mount(NextLevelEditor, {
    props: { modelValue: "<p>hello</p>", plugins: [plugin] },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
  return wrapper;
};

describe("the plugin system is reachable from the package (#R23-45)", () => {
  it("exports everything the docs tell a consumer to import", () => {
    // `import { usePlugin, createPlugin } from 'next-level-editor'`
    expect(typeof publicApi.usePlugin).toBe("function");
    expect(typeof publicApi.createPlugin).toBe("function");
  });

  it("calls install() with a live context when a plugin is passed", async () => {
    const install = vi.fn();
    await mountWithPlugin(makePlugin({ install }));

    expect(install).toHaveBeenCalledTimes(1);
    const context = install.mock.calls[0][0] as PluginContext;
    expect(typeof context.getContent).toBe("function");
    expect(typeof context.setContent).toBe("function");
    expect(typeof context.execCommand).toBe("function");
    expect(context.editorElement).toBeTruthy();
  });

  it("gives the plugin a context that can actually read and write", async () => {
    let captured: PluginContext | null = null;
    await mountWithPlugin(
      makePlugin({ install: (c) => { captured = c; } })
    );

    const context = captured as unknown as PluginContext;
    expect(context.getContent()).toContain("hello");

    context.setContent("<p>written by the plugin</p>");
    await nextTick();
    const surface = wrapper!.find(".editor-content").element as HTMLElement;
    expect(surface.innerHTML).toContain("written by the plugin");
  });

  it("surfaces the plugin's slash command in the slash menu", async () => {
    await mountWithPlugin(makePlugin({}));

    const vm = wrapper!.vm as unknown as {
      commandOptions: Array<{ id: string; label: string }>;
    };
    expect(vm.commandOptions.map((o) => o.id)).toContain("plugin:tp-slash");
  });

  it("runs the plugin's slash command when it is chosen", async () => {
    const slash = vi.fn();
    await mountWithPlugin(makePlugin({ slash }));

    const vm = wrapper!.vm as unknown as {
      commandOptions: Array<{ id: string; action: () => void }>;
      handleCommandOption: (o: { id: string; action: () => void }) => void;
    };
    const option = vm.commandOptions.find((o) => o.id === "plugin:tp-slash")!;
    expect(option).toBeTruthy();
    vm.handleCommandOption(option);

    expect(slash).toHaveBeenCalledTimes(1);
  });

  it("surfaces the plugin's toolbar button in the Tools menu", async () => {
    const button = vi.fn();
    await mountWithPlugin(makePlugin({ button }));

    const vm = wrapper!.vm as unknown as {
      toolActions: Array<{ id: string; label: string; onClick: () => void }>;
    };
    const entry = vm.toolActions.find((a) => a.id === "tp-button");
    expect(entry, "plugin toolbar button should appear in the Tools menu")
      .toBeTruthy();
    expect(entry!.label).toBe("Plugin Button");

    entry!.onClick();
    expect(button).toHaveBeenCalledTimes(1);
  });

  it("carries a plugin button's disabled/active/shortcut into the Tools menu (#R24-12)", async () => {
    // The ToolbarButton type documents all three and the destination
    // DropdownItem renders them — the mapping silently dropped them, so a
    // button whose author guarded it with isDisabled rendered ENABLED and
    // fired in a state it was guarded against.
    const button = vi.fn();
    const plugin = makePlugin({ button });
    plugin.toolbarButtons![0].isDisabled = () => true;
    plugin.toolbarButtons![0].isActive = () => true;
    plugin.toolbarButtons![0].shortcut = "Ctrl+Alt+P";
    await mountWithPlugin(plugin);

    const vm = wrapper!.vm as unknown as {
      toolActions: Array<{
        id: string;
        isDisabled?: () => boolean;
        isActive?: () => boolean;
        shortcut?: string;
      }>;
    };
    const entry = vm.toolActions.find((a) => a.id === "tp-button")!;
    expect(entry.isDisabled?.(), "the guard must reach the menu item").toBe(
      true
    );
    expect(entry.isActive?.()).toBe(true);
    expect(entry.shortcut).toBe("Ctrl+Alt+P");
  });

  it("a plugin command colliding with a built-in id cannot hijack it (#R24-13)", async () => {
    // Palette rows were keyed and EXECUTED by bare id: a plugin declaring
    // "insert-table" produced duplicate row ids (the recents byId map is
    // last-wins, so running the BUILT-IN recorded a recent that re-ran the
    // PLUGIN), and two plugins sharing an id both ran the first one's execute.
    const pluginExec = vi.fn();
    const plugin = makePlugin({});
    plugin.commands = [
      {
        id: "insert-table",
        name: "Plugin Table",
        description: "colliding id",
        execute: pluginExec,
      },
    ];
    await mountWithPlugin(plugin);

    const vm = wrapper!.vm as unknown as {
      commandPaletteCommands: Array<{
        id: string;
        category: string;
        action: () => void;
      }>;
    };
    const ids = vm.commandPaletteCommands.map((c) => c.id);
    expect(new Set(ids).size, "palette row ids must be unique").toBe(
      ids.length
    );

    // And the plugin row executes ITS OWN command, not a lookup-by-id winner.
    const pluginRow = vm.commandPaletteCommands.find(
      (c) => c.category === "Plugin"
    )!;
    pluginRow.action();
    expect(pluginExec).toHaveBeenCalledTimes(1);
  });

  it("re-rendering with the SAME plugin object does not reinstall it (#R25-7)", async () => {
    // Hosts pass inline arrays (`:plugins="[myPlugin]"`), which are a NEW
    // array reference on every parent render — and with v-model the parent
    // re-renders per keystroke. The R24-16 identity guard compared against
    // usePlugin's SUMMARY computed (fresh literals per read), so it never
    // matched and every keystroke bounced every plugin through
    // uninstall+install — accumulating install-time listeners unboundedly.
    const install = vi.fn();
    const uninstall = vi.fn();
    const plugin = makePlugin({ install });
    plugin.uninstall = uninstall;
    await mountWithPlugin(plugin);
    expect(install).toHaveBeenCalledTimes(1);

    // Same object, new array — exactly what an inline :plugins binding does.
    await wrapper!.setProps({ plugins: [plugin] });
    await nextTick();
    await wrapper!.setProps({ plugins: [plugin] });
    await nextTick();

    expect(install, "a stable plugin must not be reinstalled").toHaveBeenCalledTimes(1);
    expect(uninstall, "…nor bounced through uninstall").not.toHaveBeenCalled();
  });

  it("unmounting one of two editors sharing a plugin object spares the other (#R25-9)", async () => {
    // One imported plugin object, two editors: the batch-133 unmount teardown
    // called the plugin's single uninstall closure when EITHER editor died,
    // tearing down the survivor's listeners too.
    const uninstall = vi.fn();
    const plugin = makePlugin({});
    plugin.uninstall = uninstall;
    const first = mount(NextLevelEditor, {
      props: { modelValue: "<p>a</p>", plugins: [plugin] },
      attachTo: document.body,
    });
    const second = mount(NextLevelEditor, {
      props: { modelValue: "<p>b</p>", plugins: [plugin] },
      attachTo: document.body,
    });
    await nextTick();
    await nextTick();

    first.unmount();
    expect(
      uninstall,
      "the surviving editor still uses this plugin"
    ).not.toHaveBeenCalled();

    second.unmount();
    expect(uninstall, "the LAST editor releases it").toHaveBeenCalledTimes(1);
  });

  it("a handler removing itself during emit does not skip the next handler (#R25-8)", async () => {
    let ctx: PluginContext | null = null;
    await mountWithPlugin(makePlugin({ install: (c) => (ctx = c) }));

    const calls: string[] = [];
    const once = (...args: unknown[]) => {
      void args;
      ctx!.off("evt", once);
      calls.push("once");
    };
    const second = vi.fn(() => calls.push("second"));
    ctx!.on("evt", once);
    ctx!.on("evt", second);

    ctx!.emit("evt");

    expect(calls, "the once-pattern must not eat its neighbour").toEqual([
      "once",
      "second",
    ]);
  });

  it("a guarded palette command that refuses to run stays out of recents (#R25-11)", async () => {
    const plugin = makePlugin({});
    plugin.commands = [
      {
        id: "guarded",
        name: "Guarded",
        execute: vi.fn(),
        canExecute: () => false,
      },
    ];
    await mountWithPlugin(plugin);

    const vm = wrapper!.vm as unknown as {
      commandPaletteCommands: Array<{ id: string; category: string; action: () => unknown }>;
      handleCommandExecute: (c: unknown) => void;
      recentCommands: string[];
    };
    const row = vm.commandPaletteCommands.find((c) => c.category === "Plugin")!;
    vm.handleCommandExecute(row);

    expect(
      vm.recentCommands.includes(row.id),
      "a silent no-op must not be promoted to the recents row"
    ).toBe(false);
  });

  it("swapping a same-name plugin object takes effect (#R24-16)", async () => {
    // The registration watch diffed by NAME only: replacing the plugins array
    // with a same-name but different plugin left the OLD commands live,
    // despite the comment advertising runtime swap.
    const oldExec = vi.fn();
    const newExec = vi.fn();
    const v1 = makePlugin({});
    v1.commands = [{ id: "cmd", name: "Old Command", execute: oldExec }];
    await mountWithPlugin(v1);

    const v2 = makePlugin({});
    v2.commands = [{ id: "cmd", name: "New Command", execute: newExec }];
    await wrapper!.setProps({ plugins: [v2] });
    await nextTick();

    const vm = wrapper!.vm as unknown as {
      commandPaletteCommands: Array<{ name: string; action: () => void }>;
    };
    const names = vm.commandPaletteCommands.map((c) => c.name);
    expect(names).toContain("New Command");
    expect(names, "the stale registration must be replaced").not.toContain(
      "Old Command"
    );
  });

  it("unmounting the editor uninstalls its plugins (#R24-17)", async () => {
    const uninstall = vi.fn();
    const plugin = makePlugin({});
    plugin.uninstall = uninstall;
    await mountWithPlugin(plugin);
    expect(uninstall).not.toHaveBeenCalled();

    wrapper!.unmount();
    wrapper = null;

    expect(
      uninstall,
      "install-time listeners must get their teardown hook"
    ).toHaveBeenCalledTimes(1);
  });

  it("the plugin event bus supports off() (#R24-18)", async () => {
    let ctx: PluginContext | null = null;
    await mountWithPlugin(makePlugin({ install: (c) => (ctx = c) }));
    expect(ctx).not.toBeNull();

    const handler = vi.fn();
    ctx!.on("thing", handler);
    ctx!.emit("thing");
    expect(handler).toHaveBeenCalledTimes(1);

    ctx!.off("thing", handler);
    ctx!.emit("thing");
    expect(handler, "a detached handler must not fire again").toHaveBeenCalledTimes(1);
  });

  it("a slash command's documented trigger actually matches (#R24-19)", async () => {
    // SlashCommand.trigger is in the public type; the bridge dropped it and
    // the filter matched only label/description — "/tbl" for a command
    // labelled "Data grid" never matched.
    const plugin = makePlugin({});
    plugin.slashCommands = [
      {
        id: "tp-grid",
        trigger: "tbl",
        label: "Data grid",
        description: "Inserts a grid",
        execute: () => {},
      },
    ];
    await mountWithPlugin(plugin);

    const vm = wrapper!.vm as unknown as {
      commandOptions: Array<{ id: string; trigger?: string }>;
    };
    const option = vm.commandOptions.find((o) => o.id === "plugin:tp-grid");
    expect(option, "bridged option should exist").toBeTruthy();
    expect(
      option!.trigger,
      "the trigger must survive the bridge so the filter can match it"
    ).toBe("tbl");
  });

  it("works with no plugins at all", async () => {
    // Back-compat: the prop is optional and every existing consumer is
    // unaffected.
    wrapper = mount(NextLevelEditor, {
      props: { modelValue: "<p>hi</p>" },
      attachTo: document.body,
    });
    await nextTick();

    const vm = wrapper.vm as unknown as {
      commandOptions: Array<{ id: string }>;
    };
    expect(vm.commandOptions.length).toBeGreaterThan(0);
    expect(vm.commandOptions.some((o) => o.id === "plugin:tp-slash")).toBe(false);
  });
});
