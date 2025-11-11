import { ref, computed } from "vue";

/**
 * Keyboard shortcut definition
 */
export interface Shortcut {
  id: string;
  category: string;
  description: string;
  keys: string[];
  action: (event: KeyboardEvent) => void | boolean;
  enabled: boolean;
  customizable: boolean;
  platforms?: ("win" | "mac" | "linux")[];
}

/**
 * Shortcut category definition
 */
export interface ShortcutCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

/**
 * Shortcut conflict information
 */
export interface ShortcutConflict {
  keys: string;
  shortcuts: Shortcut[];
}

/**
 * Custom shortcut binding saved by user
 */
export interface CustomBinding {
  shortcutId: string;
  keys: string[];
}

/**
 * Normalize key string for comparison
 * Converts "Ctrl+B", "ctrl+b", "Control+B" all to "ctrl+b"
 */
function normalizeKeys(keys: string[]): string {
  return keys
    .map((k) =>
      k
        .toLowerCase()
        .replace("control", "ctrl")
        .replace("command", "cmd")
        .replace("meta", "cmd")
        .split("+")
        .sort((a, b) => a.localeCompare(b))
        .join("+")
    )
    .join("|");
}

/**
 * Convert KeyboardEvent to normalized key string
 */
function eventToKeyString(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push("ctrl");
  }
  if (event.altKey) {
    parts.push("alt");
  }
  if (event.shiftKey) {
    parts.push("shift");
  }

  const key = event.key.toLowerCase();
  if (key !== "control" && key !== "alt" && key !== "shift" && key !== "meta") {
    parts.push(key);
  }

  const sorted = [...parts].sort((a, b) => a.localeCompare(b));
  return sorted.join("+");
}

/**
 * Get current platform
 */
function getPlatform(): "win" | "mac" | "linux" {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "mac";
  if (platform.includes("linux")) return "linux";
  return "win";
}

/**
 * Storage key for custom bindings
 */
const STORAGE_KEY = "nle-custom-shortcuts";

/**
 * Shortcut Registry - Professional keyboard shortcut management
 * Inspired by VS Code, Word, and Google Docs
 *
 * Features:
 * - 80+ predefined shortcuts
 * - Conflict detection
 * - User customization
 * - Platform-specific bindings
 * - Category organization
 * - Import/export
 * - Search & filter
 */
export function useShortcutRegistry() {
  const shortcuts = ref<Map<string, Shortcut>>(new Map());
  const categories = ref<Map<string, ShortcutCategory>>(new Map());
  const customBindings = ref<Map<string, string[]>>(new Map());
  const platform = getPlatform();

  /**
   * Register a new shortcut category
   */
  const registerCategory = (category: ShortcutCategory) => {
    categories.value.set(category.id, category);
  };

  /**
   * Register a new shortcut
   */
  const registerShortcut = (shortcut: Shortcut) => {
    // Check if shortcut is for current platform
    if (shortcut.platforms && !shortcut.platforms.includes(platform)) {
      return;
    }

    shortcuts.value.set(shortcut.id, shortcut);
  };

  /**
   * Unregister a shortcut
   */
  const unregisterShortcut = (id: string) => {
    shortcuts.value.delete(id);
  };

  /**
   * Get shortcut by ID
   */
  const getShortcut = (id: string): Shortcut | undefined => {
    return shortcuts.value.get(id);
  };

  /**
   * Get all shortcuts in a category
   */
  const getShortcutsByCategory = (categoryId: string): Shortcut[] => {
    return Array.from(shortcuts.value.values()).filter(
      (s) => s.category === categoryId
    );
  };

  /**
   * Get all categories
   */
  const getAllCategories = (): ShortcutCategory[] => {
    return Array.from(categories.value.values());
  };

  /**
   * Get all shortcuts
   */
  const getAllShortcuts = (): Shortcut[] => {
    return Array.from(shortcuts.value.values());
  };

  /**
   * Find shortcuts by key combination
   */
  const findShortcutsByKeys = (keys: string[]): Shortcut[] => {
    const normalized = normalizeKeys(keys);
    return Array.from(shortcuts.value.values()).filter((s) => {
      const customKeys = customBindings.value.get(s.id);
      const activeKeys = customKeys || s.keys;
      return normalizeKeys(activeKeys) === normalized;
    });
  };

  /**
   * Detect conflicts - multiple shortcuts with same keys
   */
  const detectConflicts = computed((): ShortcutConflict[] => {
    const keyMap = new Map<string, Shortcut[]>();

    // Build map of keys to shortcuts
    shortcuts.value.forEach((shortcut) => {
      if (!shortcut.enabled) return;

      const customKeys = customBindings.value.get(shortcut.id);
      const activeKeys = customKeys || shortcut.keys;
      const normalized = normalizeKeys(activeKeys);

      if (!keyMap.has(normalized)) {
        keyMap.set(normalized, []);
      }
      keyMap.get(normalized)!.push(shortcut);
    });

    // Find conflicts
    const conflicts: ShortcutConflict[] = [];
    keyMap.forEach((shortcuts, keys) => {
      if (shortcuts.length > 1) {
        conflicts.push({ keys, shortcuts });
      }
    });

    return conflicts;
  });

  /**
   * Check if specific shortcut has conflicts
   */
  const hasConflict = (shortcutId: string): boolean => {
    return detectConflicts.value.some((conflict) =>
      conflict.shortcuts.some((s) => s.id === shortcutId)
    );
  };

  /**
   * Customize shortcut keys
   */
  const customizeShortcut = (
    shortcutId: string,
    newKeys: string[]
  ): boolean => {
    const shortcut = shortcuts.value.get(shortcutId);
    if (!shortcut?.customizable) {
      return false;
    }

    // Check if new keys create conflicts
    const normalized = normalizeKeys(newKeys);
    const existing = Array.from(shortcuts.value.values()).find((s) => {
      if (s.id === shortcutId) return false;
      const customKeys = customBindings.value.get(s.id);
      const activeKeys = customKeys || s.keys;
      return normalizeKeys(activeKeys) === normalized;
    });

    if (existing) {
      console.warn(
        `Shortcut conflict: ${newKeys.join("+")} already used by ${existing.id}`
      );
      return false;
    }

    customBindings.value.set(shortcutId, newKeys);
    saveCustomBindings();
    return true;
  };

  /**
   * Reset shortcut to default keys
   */
  const resetShortcut = (shortcutId: string): boolean => {
    const shortcut = shortcuts.value.get(shortcutId);
    if (!shortcut) return false;

    customBindings.value.delete(shortcutId);
    saveCustomBindings();
    return true;
  };

  /**
   * Reset all shortcuts to defaults
   */
  const resetAllShortcuts = () => {
    customBindings.value.clear();
    saveCustomBindings();
  };

  /**
   * Enable shortcut
   */
  const enableShortcut = (shortcutId: string): boolean => {
    const shortcut = shortcuts.value.get(shortcutId);
    if (!shortcut) return false;

    shortcut.enabled = true;
    return true;
  };

  /**
   * Disable shortcut
   */
  const disableShortcut = (shortcutId: string): boolean => {
    const shortcut = shortcuts.value.get(shortcutId);
    if (!shortcut) return false;

    shortcut.enabled = false;
    return true;
  };

  /**
   * Handle keyboard event and execute matching shortcut
   */
  const handleKeyboardEvent = (event: KeyboardEvent): boolean => {
    const keyString = eventToKeyString(event);
    const matches = Array.from(shortcuts.value.values()).filter((s) => {
      if (!s.enabled) return false;

      const customKeys = customBindings.value.get(s.id);
      const activeKeys = customKeys || s.keys;
      return activeKeys.some((k) => normalizeKeys([k]) === keyString);
    });

    if (matches.length === 0) return false;

    // Execute first matching shortcut
    const shortcut = matches[0];
    const result = shortcut.action(event);
    return result !== false;
  };

  /**
   * Search shortcuts by description or keys
   */
  const searchShortcuts = (query: string): Shortcut[] => {
    const lowerQuery = query.toLowerCase();
    return Array.from(shortcuts.value.values()).filter((s) => {
      const descMatch = s.description.toLowerCase().includes(lowerQuery);
      const keyMatch = s.keys.some((k) => k.toLowerCase().includes(lowerQuery));
      return descMatch || keyMatch;
    });
  };

  /**
   * Export custom bindings to JSON
   */
  const exportCustomBindings = (): string => {
    const data: CustomBinding[] = [];
    customBindings.value.forEach((keys, shortcutId) => {
      data.push({ shortcutId, keys });
    });
    return JSON.stringify(data, null, 2);
  };

  /**
   * Import custom bindings from JSON
   */
  const importCustomBindings = (json: string): boolean => {
    try {
      const data: CustomBinding[] = JSON.parse(json);
      customBindings.value.clear();

      data.forEach(({ shortcutId, keys }) => {
        if (shortcuts.value.has(shortcutId)) {
          customBindings.value.set(shortcutId, keys);
        }
      });

      saveCustomBindings();
      return true;
    } catch (error) {
      console.error("Failed to import custom bindings:", error);
      return false;
    }
  };

  /**
   * Save custom bindings to localStorage
   */
  const saveCustomBindings = () => {
    try {
      const data: CustomBinding[] = [];
      customBindings.value.forEach((keys, shortcutId) => {
        data.push({ shortcutId, keys });
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save custom bindings:", error);
    }
  };

  /**
   * Load custom bindings from localStorage
   */
  const loadCustomBindings = () => {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (json) {
        const data: CustomBinding[] = JSON.parse(json);
        data.forEach(({ shortcutId, keys }) => {
          customBindings.value.set(shortcutId, keys);
        });
      }
    } catch (error) {
      console.error("Failed to load custom bindings:", error);
    }
  };

  /**
   * Get active keys for shortcut (custom or default)
   */
  const getActiveKeys = (shortcutId: string): string[] | undefined => {
    const shortcut = shortcuts.value.get(shortcutId);
    if (!shortcut) return undefined;

    const customKeys = customBindings.value.get(shortcutId);
    return customKeys || shortcut.keys;
  };

  /**
   * Check if shortcut has custom binding
   */
  const hasCustomBinding = (shortcutId: string): boolean => {
    return customBindings.value.has(shortcutId);
  };

  /**
   * Get formatted key display string
   * Converts internal format to user-friendly display
   */
  const getKeyDisplay = (keys: string[]): string => {
    const isMac = platform === "mac";
    return keys
      .map((k) => {
        return k
          .split("+")
          .map((part) => {
            switch (part.toLowerCase()) {
              case "ctrl":
                return isMac ? "⌘" : "Ctrl";
              case "cmd":
                return "⌘";
              case "alt":
                return isMac ? "⌥" : "Alt";
              case "shift":
                return isMac ? "⇧" : "Shift";
              case "enter":
                return "↵";
              case "backspace":
                return "⌫";
              case "delete":
                return "⌦";
              case "escape":
              case "esc":
                return "Esc";
              case "arrowup":
                return "↑";
              case "arrowdown":
                return "↓";
              case "arrowleft":
                return "←";
              case "arrowright":
                return "→";
              default:
                return part.charAt(0).toUpperCase() + part.slice(1);
            }
          })
          .join(isMac ? "" : "+");
      })
      .join(" or ");
  };

  // Load custom bindings on init
  loadCustomBindings();

  return {
    // Registration
    registerCategory,
    registerShortcut,
    unregisterShortcut,

    // Getters
    getShortcut,
    getShortcutsByCategory,
    getAllCategories,
    getAllShortcuts,
    findShortcutsByKeys,
    getActiveKeys,
    hasCustomBinding,

    // Conflict detection
    detectConflicts,
    hasConflict,

    // Customization
    customizeShortcut,
    resetShortcut,
    resetAllShortcuts,
    enableShortcut,
    disableShortcut,

    // Execution
    handleKeyboardEvent,

    // Search
    searchShortcuts,

    // Import/Export
    exportCustomBindings,
    importCustomBindings,

    // Display
    getKeyDisplay,

    // State
    shortcuts,
    categories,
    customBindings,
    platform,
  };
}
