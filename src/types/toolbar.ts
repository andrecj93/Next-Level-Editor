export interface ToolbarAction {
  id: string
  label: string
  tooltip: string
  icon?: string
  onClick: () => void
  isActive?: () => boolean
}
