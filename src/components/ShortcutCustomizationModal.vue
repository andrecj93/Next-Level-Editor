<template>
  <div
    v-if="isOpen"
    class="shortcut-customization-modal-overlay"
    @click.self="close"
  >
    <dialog
      open
      class="shortcut-customization-modal"
      aria-labelledby="shortcut-modal-title"
    >
      <!-- Header -->
      <div class="modal-header">
        <h2 id="shortcut-modal-title">
          ⌨️ Keyboard Shortcuts
        </h2>
        <button
          class="close-button"
          aria-label="Close"
          @click="close"
        >
          ×
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="modal-controls">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Search shortcuts..."
          aria-label="Search shortcuts"
        >
        <select
          v-model="selectedCategory"
          class="category-filter"
          aria-label="Filter by category"
        >
          <option value="">
            All Categories
          </option>
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- Conflicts Warning -->
      <div
        v-if="conflicts.length > 0"
        class="conflicts-warning"
      >
        <strong>⚠️ {{ conflicts.length }} Conflict(s) Detected</strong>
        <p>
          Multiple shortcuts are using the same keys. Please resolve conflicts
          below.
        </p>
      </div>

      <!-- Shortcuts List -->
      <div class="shortcuts-list">
        <div
          v-for="shortcut in filteredShortcuts"
          :key="shortcut.id"
          class="shortcut-item"
          :class="{
            'has-conflict': hasConflict(shortcut.id),
            disabled: !shortcut.enabled,
          }"
        >
          <div class="shortcut-info">
            <div class="shortcut-header">
              <span class="shortcut-description">{{
                shortcut.description
              }}</span>
              <span class="shortcut-category-badge">{{
                getCategoryName(shortcut.category)
              }}</span>
            </div>
            <div class="shortcut-keys">
              <span
                v-for="(key, index) in getActiveKeys(shortcut.id)"
                :key="index"
                class="key-badge"
                :class="{ custom: hasCustomBinding(shortcut.id) }"
              >
                {{ formatKey(key) }}
              </span>
            </div>
          </div>

          <div class="shortcut-actions">
            <button
              v-if="shortcut.customizable"
              class="action-button"
              :aria-label="`Customize ${shortcut.description}`"
              @click="startCustomizing(shortcut)"
            >
              ✏️ Edit
            </button>
            <button
              v-if="hasCustomBinding(shortcut.id)"
              class="action-button reset"
              :aria-label="`Reset ${shortcut.description} to default`"
              @click="resetShortcut(shortcut.id)"
            >
              🔄 Reset
            </button>
            <button
              class="action-button toggle"
              :aria-label="
                shortcut.enabled
                  ? `Disable ${shortcut.description}`
                  : `Enable ${shortcut.description}`
              "
              @click="toggleShortcut(shortcut.id)"
            >
              {{ shortcut.enabled ? "✅" : "❌" }}
            </button>
          </div>
        </div>

        <div
          v-if="filteredShortcuts.length === 0"
          class="no-results"
        >
          No shortcuts found matching "{{ searchQuery }}"
        </div>
      </div>

      <!-- Customization Dialog -->
      <div
        v-if="customizingShortcut"
        class="customization-dialog"
      >
        <div class="dialog-content">
          <h3>Customize {{ customizingShortcut.description }}</h3>
          <p>Press the new key combination you want to use...</p>
          <div class="recording-keys">
            <span
              v-if="recordedKeys.length === 0"
              class="hint"
            >
              Waiting for keys...
            </span>
            <span
              v-else
              class="recorded-keys"
            >
              {{ recordedKeys.join(" + ") }}
            </span>
          </div>
          <div class="dialog-actions">
            <button
              class="dialog-button"
              @click="saveCustomKeys"
            >
              Save
            </button>
            <button
              class="dialog-button cancel"
              @click="cancelCustomization"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="modal-footer">
        <button
          class="footer-button"
          @click="exportBindings"
        >
          📥 Export
        </button>
        <button
          class="footer-button"
          @click="importBindings"
        >
          📤 Import
        </button>
        <button
          class="footer-button danger"
          @click="resetAll"
        >
          🔄 Reset All
        </button>
        <button
          class="footer-button primary"
          @click="close"
        >
          Done
        </button>
      </div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import type { Shortcut } from "../composables/useShortcutRegistry";

interface Props {
  isOpen: boolean;
  registry: ReturnType<
    typeof import("../composables/useShortcutRegistry").useShortcutRegistry
  >;
}

type Emits = (e: "close") => void;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref("");
const selectedCategory = ref("");
const customizingShortcut = ref<Shortcut | null>(null);
const recordedKeys = ref<string[]>([]);

// Get data from registry
const categories = computed(() => props.registry.getAllCategories());
const shortcuts = computed(() => props.registry.getAllShortcuts());
const conflicts = computed(() => props.registry.detectConflicts.value);

// Filtered shortcuts based on search and category
const filteredShortcuts = computed(() => {
  let result = shortcuts.value;

  // Filter by category
  if (selectedCategory.value) {
    result = result.filter((s) => s.category === selectedCategory.value);
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (s) =>
        s.description.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        getActiveKeys(s.id)?.some((k) => k.toLowerCase().includes(query))
    );
  }

  return result;
});

// Get category name by ID
const getCategoryName = (categoryId: string): string => {
  const category = categories.value.find((c) => c.id === categoryId);
  return category?.name || categoryId;
};

// Get active keys for shortcut
const getActiveKeys = (shortcutId: string): string[] => {
  return props.registry.getActiveKeys(shortcutId) || [];
};

// Check if shortcut has custom binding
const hasCustomBinding = (shortcutId: string): boolean => {
  return props.registry.hasCustomBinding(shortcutId);
};

// Check if shortcut has conflicts
const hasConflict = (shortcutId: string): boolean => {
  return props.registry.hasConflict(shortcutId);
};

// Format key for display
const formatKey = (key: string): string => {
  return props.registry.getKeyDisplay([key]);
};

// Close modal
const close = () => {
  emit("close");
};

// Start customizing shortcut
const startCustomizing = (shortcut: Shortcut) => {
  customizingShortcut.value = shortcut;
  recordedKeys.value = [];
};

// Cancel customization
const cancelCustomization = () => {
  customizingShortcut.value = null;
  recordedKeys.value = [];
};

// Save custom keys
const saveCustomKeys = () => {
  if (!customizingShortcut.value || recordedKeys.value.length === 0) {
    return;
  }

  const success = props.registry.customizeShortcut(
    customizingShortcut.value.id,
    [recordedKeys.value.join("+").toLowerCase()]
  );

  if (!success) {
    alert(
      "Failed to customize shortcut. Keys may be in use by another shortcut."
    );
  }

  customizingShortcut.value = null;
  recordedKeys.value = [];
};

// Record key combination
const handleKeyRecording = (event: KeyboardEvent) => {
  if (!customizingShortcut.value) return;

  event.preventDefault();
  const keys: string[] = [];

  if (event.ctrlKey || event.metaKey) keys.push("Ctrl");
  if (event.altKey) keys.push("Alt");
  if (event.shiftKey) keys.push("Shift");

  const key = event.key;
  if (key !== "Control" && key !== "Alt" && key !== "Shift" && key !== "Meta") {
    keys.push(key);
  }

  if (keys.length > 0) {
    recordedKeys.value = keys;
  }
};

// Reset shortcut to default
const resetShortcut = (shortcutId: string) => {
  props.registry.resetShortcut(shortcutId);
};

// Toggle shortcut enabled/disabled
const toggleShortcut = (shortcutId: string) => {
  const shortcut = props.registry.getShortcut(shortcutId);
  if (!shortcut) return;

  if (shortcut.enabled) {
    props.registry.disableShortcut(shortcutId);
  } else {
    props.registry.enableShortcut(shortcutId);
  }
};

// Reset all shortcuts
const resetAll = () => {
  if (confirm("Are you sure you want to reset all shortcuts to defaults?")) {
    props.registry.resetAllShortcuts();
  }
};

// Export bindings
const exportBindings = () => {
  const json = props.registry.exportCustomBindings();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "keyboard-shortcuts.json";
  a.click();
  URL.revokeObjectURL(url);
};

// Import bindings
const importBindings = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    file
      .text()
      .then((json) => {
        const success = props.registry.importCustomBindings(json);
        if (success) {
          alert("Shortcuts imported successfully!");
        } else {
          alert("Failed to import shortcuts. Please check the file format.");
        }
      })
      .catch((error) => {
        console.error("Failed to read file:", error);
        alert("Failed to read file.");
      });
  };
  input.click();
};

// Watch for customization mode to add key listener
watch(customizingShortcut, (val) => {
  if (val) {
    document.addEventListener("keydown", handleKeyRecording);
  } else {
    document.removeEventListener("keydown", handleKeyRecording);
  }
});

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyRecording);
});
</script>

<style scoped>
.shortcut-customization-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.shortcut-customization-modal {
  background: var(--color-background, #fff);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: var(--color-text-secondary, #666);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-button:hover {
  background: var(--color-hover, #f0f0f0);
  color: var(--color-text, #000);
}

.modal-controls {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
}

.search-input,
.category-filter {
  padding: 10px 16px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.search-input {
  flex: 1;
}

.search-input:focus {
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.conflicts-warning {
  padding: 16px 24px;
  background: #fff3cd;
  border-bottom: 1px solid #ffc107;
  color: #856404;
}

.conflicts-warning strong {
  display: block;
  margin-bottom: 4px;
}

.shortcuts-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  margin-bottom: 12px;
  transition: all 0.2s;
}

.shortcut-item:hover {
  background: var(--color-hover, #f8f9fa);
  border-color: var(--color-primary, #007bff);
}

.shortcut-item.has-conflict {
  border-color: #ffc107;
  background: #fff9e6;
}

.shortcut-item.disabled {
  opacity: 0.5;
}

.shortcut-info {
  flex: 1;
}

.shortcut-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.shortcut-description {
  font-weight: 500;
  font-size: 15px;
}

.shortcut-category-badge {
  padding: 2px 8px;
  background: var(--color-primary, #0056b3);
  color: #ffffff;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.key-badge {
  padding: 4px 10px;
  background: var(--color-background-secondary, #f0f0f0);
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
  font-weight: 500;
}

.key-badge.custom {
  background: #e7f3ff;
  border-color: var(--color-primary, #007bff);
  color: var(--color-primary, #007bff);
}

.shortcut-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.action-button:hover {
  background: var(--color-hover, #f0f0f0);
  border-color: var(--color-primary, #007bff);
}

.action-button.reset {
  color: #fd7e14;
}

.action-button.toggle {
  min-width: 44px;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: var(--color-text-secondary, #666);
  font-size: 15px;
}

.customization-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.dialog-content {
  background: white;
  padding: 32px;
  border-radius: 12px;
  text-align: center;
  min-width: 400px;
}

.recording-keys {
  padding: 32px;
  background: var(--color-background-secondary, #f0f0f0);
  border-radius: 8px;
  margin: 24px 0;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hint {
  color: var(--color-text-secondary, #666);
  font-size: 14px;
}

.recorded-keys {
  font-size: 24px;
  font-weight: 600;
  font-family: monospace;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.dialog-button {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.dialog-button:not(.cancel) {
  background: var(--color-primary, #0056b3);
  color: #ffffff;
}

.dialog-button.cancel {
  background: var(--color-background-secondary, #f0f0f0);
  color: var(--color-text, #000);
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e0e0e0);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.footer-button {
  padding: 10px 20px;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.footer-button:hover {
  background: var(--color-hover, #f0f0f0);
}

.footer-button.danger {
  color: #dc3545;
}

.footer-button.primary {
  background: var(--color-primary, #0056b3);
  color: #ffffff;
  border-color: var(--color-primary, #0056b3);
}

.footer-button.primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}
</style>
