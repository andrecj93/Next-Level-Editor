<template>
  <div
    v-if="isOpen"
    class="shortcut-help-overlay"
    @click.self="close"
  >
    <div class="shortcut-help-modal">
      <!-- Header -->
      <div class="modal-header">
        <h2>⌨️ Keyboard Shortcuts Reference</h2>
        <button
          class="close-button"
          aria-label="Close"
          @click="close"
        >
          ×
        </button>
      </div>

      <!-- Quick Search -->
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search shortcuts..."
          class="search-input"
          aria-label="Search shortcuts"
        >
      </div>

      <!-- Shortcuts by Category -->
      <div class="shortcuts-content">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="category-section"
        >
          <h3 class="category-title">
            {{ category.name }}
          </h3>
          <div class="shortcuts-grid">
            <div
              v-for="shortcut in getCategoryShortcuts(category.id)"
              :key="shortcut.id"
              class="shortcut-row"
            >
              <span class="shortcut-desc">{{ shortcut.description }}</span>
              <span class="shortcut-keys-display">
                <kbd
                  v-for="(key, index) in getActiveKeys(shortcut.id)"
                  :key="index"
                  class="key"
                >
                  {{ formatKey(key) }}
                </kbd>
              </span>
            </div>
          </div>
        </div>

        <div
          v-if="filteredCategories.length === 0"
          class="no-results"
        >
          No shortcuts found matching "{{ searchQuery }}"
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <p class="footer-hint">
          Press <kbd>Ctrl</kbd> + <kbd>/</kbd> anytime to open this help
        </p>
        <button
          class="customize-button"
          @click="openCustomization"
        >
          ⚙️ Customize Shortcuts
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  isOpen: boolean;
  registry: ReturnType<
    typeof import("../composables/useShortcutRegistry").useShortcutRegistry
  >;
}

type Emits = (e: "close" | "customize") => void;

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const searchQuery = ref("");

// Get categories and shortcuts
const categories = computed(() => props.registry.getAllCategories());

// Filter categories that have visible shortcuts matching search
const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return categories.value;
  }

  return categories.value.filter((cat) => {
    const shortcuts = getCategoryShortcuts(cat.id);
    return shortcuts.length > 0;
  });
});

// Get shortcuts for a category (enabled only, filtered by search)
const getCategoryShortcuts = (categoryId: string) => {
  let shortcuts = props.registry
    .getShortcutsByCategory(categoryId)
    .filter((s) => s.enabled);

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    shortcuts = shortcuts.filter(
      (s) =>
        s.description.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        getActiveKeys(s.id)?.some((k) => k.toLowerCase().includes(query))
    );
  }

  return shortcuts;
};

// Get active keys for shortcut
const getActiveKeys = (shortcutId: string): string[] => {
  return props.registry.getActiveKeys(shortcutId) || [];
};

// Format key for display
const formatKey = (key: string): string => {
  return props.registry.getKeyDisplay([key]);
};

// Close modal
const close = () => {
  emit("close");
};

// Open customization
const openCustomization = () => {
  emit("customize");
};
</script>

<style scoped>
.shortcut-help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.shortcut-help-modal {
  background: var(--color-background, #fff);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  padding: 28px 32px;
  border-bottom: 2px solid var(--color-border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #4c51bf 0%, #5b21b6 100%);
  color: #ffffff;
}

.modal-header h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
}

.close-button {
  background: rgba(0, 0, 0, 0.2);
  border: none;
  font-size: 36px;
  cursor: pointer;
  color: #ffffff;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.search-bar {
  padding: 20px 32px;
  border-bottom: 1px solid var(--color-border, #e0e0e0);
  background: var(--color-background-secondary, #f8f9fa);
}

.search-input {
  width: 100%;
  padding: 14px 20px;
  border: 2px solid var(--color-border, #e0e0e0);
  border-radius: 12px;
  font-size: 15px;
  outline: none;
  transition: all 0.3s;
  background: white;
}

.search-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.shortcuts-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.category-section {
  margin-bottom: 32px;
}

.category-section:last-child {
  margin-bottom: 0;
}

.category-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text, #000);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-primary, #667eea);
  display: inline-block;
}

.shortcuts-grid {
  display: grid;
  gap: 8px;
}

.shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--color-background-secondary, #f8f9fa);
  border-radius: 8px;
  transition: all 0.2s;
}

.shortcut-row:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.shortcut-desc {
  font-size: 15px;
  color: var(--color-text, #000);
  font-weight: 500;
}

.shortcut-keys-display {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.key {
  padding: 6px 12px;
  background: white;
  border: 2px solid var(--color-border, #e0e0e0);
  border-radius: 6px;
  font-size: 13px;
  font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", monospace;
  font-weight: 600;
  color: var(--color-text, #000);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 -2px 0 rgba(0, 0, 0, 0.1);
  min-width: 32px;
  text-align: center;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary, #666);
  font-size: 16px;
}

.modal-footer {
  padding: 20px 32px;
  border-top: 2px solid var(--color-border, #e0e0e0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-background-secondary, #f8f9fa);
}

.footer-hint {
  margin: 0;
  color: var(--color-text-secondary, #666);
  font-size: 14px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.footer-hint kbd {
  padding: 4px 8px;
  background: white;
  border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  font-weight: 600;
}

.customize-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #4c51bf 0%, #5b21b6 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(76, 81, 191, 0.3);
}

.customize-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.customize-button:active {
  transform: translateY(0);
}

/* Scrollbar styling */
.shortcuts-content::-webkit-scrollbar {
  width: 8px;
}

.shortcuts-content::-webkit-scrollbar-track {
  background: var(--color-background-secondary, #f8f9fa);
}

.shortcuts-content::-webkit-scrollbar-thumb {
  background: var(--color-border, #e0e0e0);
  border-radius: 4px;
}

.shortcuts-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary, #999);
}
</style>
