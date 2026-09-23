export interface ToolbarAction {
  id: string
  label: string
  tooltip: string
  /** Platform-neutral key combination, displayed in the selected UI locale. */
  shortcut?: string
  icon?: string
  onClick: () => void
  isActive?: () => boolean
  /** When it returns true the button is rendered disabled and not clickable. */
  isDisabled?: () => boolean
}
