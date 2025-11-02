import { ref, computed } from 'vue'
import type { EditorPlugin, PluginContext, ToolbarButton, EditorCommand, SlashCommand } from '../types/plugin'

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

    const plugin = plugins.value[index]
    
    // Call plugin uninstall if available
    if (plugin.uninstall) {
      plugin.uninstall()
    }

    plugins.value.splice(index, 1)
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
