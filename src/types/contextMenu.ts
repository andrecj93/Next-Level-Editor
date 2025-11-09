export interface ContextMenuItem {
  id?: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  divider?: boolean;
}
