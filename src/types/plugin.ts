/**
 * Plugin system types for extending the editor
 */

export interface ToolbarButton {
  /** Unique identifier for the button */
  id: string
  /** Button label/text */
  label: string
  /** Icon HTML or text */
  icon?: string
  /** Button title/tooltip */
  title?: string
  /** Keyboard shortcut hint */
  shortcut?: string
  /** Click handler */
  onClick: () => void
  /** Check if button should be active */
  isActive?: () => boolean
  /** Check if button should be disabled */
  isDisabled?: () => boolean
}

export interface EditorCommand {
  /** Unique identifier for the command */
  id: string
  /** Command name */
  name: string
  /** Command description */
  description?: string
  /** Keyboard shortcut */
  shortcut?: string
  /** Execute the command */
  execute: () => void
  /** Check if command can execute */
  canExecute?: () => boolean
}

export interface SlashCommand {
  /** Unique identifier */
  id: string
  /** Command trigger (without the /) */
  trigger: string
  /** Display label */
  label: string
  /** Command description */
  description?: string
  /** Icon HTML or text */
  icon?: string
  /** Execute the command */
  execute: () => void
}

export interface EditorPlugin {
  /** Plugin name */
  name: string
  /** Plugin version */
  version?: string
  /** Plugin description */
  description?: string
  /** Toolbar buttons to add */
  toolbarButtons?: ToolbarButton[]
  /** Editor commands to register */
  commands?: EditorCommand[]
  /** Slash commands to register */
  slashCommands?: SlashCommand[]
  /** Plugin initialization */
  install?: (context: PluginContext) => void
  /** Plugin cleanup */
  uninstall?: () => void
}

export interface PluginContext {
  /** Editor element reference */
  editorElement: HTMLElement | null
  /** Get current editor content */
  getContent: () => string
  /** Set editor content */
  setContent: (html: string) => void
  /** Execute document command */
  execCommand: (command: string, value?: string) => void
  /** Get current selection */
  getSelection: () => Selection | null
  /** Emit event */
  emit: (event: string, ...args: unknown[]) => void
  /** Listen to event */
  on: (event: string, handler: (...args: unknown[]) => void) => void
  /** Stop listening — pass the same handler given to on(). A plugin's
   *  uninstall hook uses this so its handlers do not outlive it. #R24-18 */
  off: (event: string, handler: (...args: unknown[]) => void) => void
}
