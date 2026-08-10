import { ref, computed, toRaw } from 'vue'
import type { EditorPlugin, PluginContext, ToolbarButton, EditorCommand, SlashCommand } from '../types/plugin'

/**
 * How many EDITORS currently hold a registration for a given plugin OBJECT.
 * Module-scope on purpose: usePlugin() state is per-editor, but a host may
 * hand the same imported plugin object to several editors — the object has a
 * single uninstall closure, so tearing it down when ONE editor unmounts would
 * kill the survivors' listeners too. uninstall runs only when the LAST editor
 * releases it. (install still runs once per editor: each gets its own
 * context — a long-standing, documented asymmetry.) #R25-9
 */
const pluginHolders = new WeakMap<EditorPlugin, number>()

/**
 * Composable for plugin system
 * Allows extending the editor with custom functionality
 */
export function usePlugin() {
  const plugins = ref<EditorPlugin[]>([])
  const pluginContext = ref<PluginContext | null>(null)

  /**
   * Register a plugin
   * @param plugin - The plugin to register
   */
  const registerPlugin = (plugin: EditorPlugin) => {
    // Check if plugin already registered
    if (plugins.value.some(p => p.name === plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`)
      return
    }

    // Install plugin if it has install method
    if (plugin.install && pluginContext.value) {
      plugin.install(pluginContext.value)
    }

    plugins.value.push(plugin)
    // toRaw at EVERY holder boundary: `plugins` is a deep ref, so anything
    // read back out of it is a reactive proxy — while the host's object (a
    // plain module const per the docs) is raw. Mixing the two made the
    // WeakMap never hit and identity checks never match; the component tests
    // stayed green only because @vue/test-utils delivers props as proxies. #R26-1
    const raw = toRaw(plugin)
    pluginHolders.set(raw, (pluginHolders.get(raw) ?? 0) + 1)
  }

  /**
   * Unregister a plugin
   * @param pluginName - Name of the plugin to unregister
   */
  const unregisterPlugin = (pluginName: string) => {
    const index = plugins.value.findIndex(p => p.name === pluginName)
    if (index === -1) {
      console.warn(`Plugin "${pluginName}" is not registered`)
      return
    }

    // De-proxy before touching the holder map or calling hooks: reading from
    // the deep ref hands back a proxy, and the map is keyed by the raw. #R26-1
    const plugin = toRaw(plugins.value[index])

    // Only the LAST editor holding this plugin object runs its uninstall —
    // the closure is shared, and killing it earlier tears down listeners a
    // surviving editor still depends on. #R25-9
    const holders = (pluginHolders.get(plugin) ?? 1) - 1
    if (holders <= 0) {
      pluginHolders.delete(plugin)
      plugin.uninstall?.()
    } else {
      pluginHolders.set(plugin, holders)
    }

    plugins.value.splice(index, 1)
  }

  /**
   * The RAW registered plugin object for a name — raw as in `toRaw`: the
   * exported `plugins` summary computed maps to fresh literals, and even the
   * backing ref hands back reactive PROXIES, neither of which can ever be
   * identity-compared against the host's plain object. #R25-7 #R26-1
   */
  const getRegisteredPlugin = (name: string): EditorPlugin | undefined => {
    const found = plugins.value.find(p => p.name === name)
    return found ? toRaw(found) : undefined
  }

  /**
   * Set the plugin context (editor reference and methods)
   */
  const setPluginContext = (context: PluginContext) => {
    pluginContext.value = context

    // Install all registered plugins with new context
    plugins.value.forEach(plugin => {
      if (plugin.install) {
        plugin.install(context)
      }
    })
  }

  /**
   * Get all toolbar buttons from all plugins
   */
  const pluginToolbarButtons = computed<ToolbarButton[]>(() => {
    return plugins.value.flatMap(plugin => plugin.toolbarButtons || [])
  })

  /**
   * Get all commands from all plugins
   */
  const pluginCommands = computed<EditorCommand[]>(() => {
    return plugins.value.flatMap(plugin => plugin.commands || [])
  })

  /**
   * Get all slash commands from all plugins
   */
  const pluginSlashCommands = computed<SlashCommand[]>(() => {
    return plugins.value.flatMap(plugin => plugin.slashCommands || [])
  })

  /**
   * Get list of registered plugins
   */
  const registeredPlugins = computed(() => {
    return plugins.value.map(p => ({
      name: p.name,
      version: p.version,
      description: p.description
    }))
  })

  /**
   * Execute a command by ID
   */
  const executeCommand = (commandId: string) => {
    const command = pluginCommands.value.find(c => c.id === commandId)
    if (!command) {
      console.warn(`Command "${commandId}" not found`)
      return
    }

    if (command.canExecute && !command.canExecute()) {
      console.warn(`Command "${commandId}" cannot be executed`)
      return
    }

    command.execute()
  }

  return {
    plugins: registeredPlugins,
    registerPlugin,
    unregisterPlugin,
    getRegisteredPlugin,
    setPluginContext,
    pluginToolbarButtons,
    pluginCommands,
    pluginSlashCommands,
    executeCommand
  }
}

/**
 * Create a simple plugin
 * @param config - Plugin configuration
 * @returns EditorPlugin
 */
export function createPlugin(config: EditorPlugin): EditorPlugin {
  return config
}
