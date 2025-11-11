<template>
  <div
    v-if="showToolbar"
    class="mobile-toolbar"
    :class="{ 'toolbar-collapsed': isCollapsed }"
  >
    <!-- Toolbar Header -->
    <div class="toolbar-header">
      <button
        class="toolbar-toggle touch-target"
        :aria-label="isCollapsed ? 'Expand toolbar' : 'Collapse toolbar'"
        :aria-expanded="!isCollapsed"
        @click="toggleCollapse"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            v-if="isCollapsed"
            d="M5 8l5 5 5-5H5z"
          />
          <path
            v-else
            d="M5 12l5-5 5 5H5z"
          />
        </svg>
      </button>

      <div class="toolbar-title">
        {{ currentTab.label }}
      </div>

      <button
        class="toolbar-close touch-target"
        aria-label="Close toolbar"
        @click="emit('close')"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M6 6l8 8m0-8l-8 8"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>

    <!-- Tab Navigation -->
    <div
      v-show="!isCollapsed"
      class="toolbar-tabs"
      role="tablist"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="toolbar-tab touch-target"
        :class="{ 'tab-active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        role="tab"
        @click="selectTab(tab.id)"
      >
        <span
          class="tab-icon"
          v-html="tab.icon"
        />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div
      v-show="!isCollapsed"
      class="toolbar-content"
    >
      <!-- Format Tab -->
      <div
        v-show="activeTab === 'format'"
        id="panel-format"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="button-group">
          <button
            v-for="action in formatActions"
            :key="action.id"
            class="toolbar-button touch-target-lg"
            :class="{ active: action.isActive?.() }"
            :aria-label="action.label"
            :title="action.label"
            @click="action.onClick"
          >
            <span v-html="action.icon" />
          </button>
        </div>
      </div>

      <!-- Insert Tab -->
      <div
        v-show="activeTab === 'insert'"
        id="panel-insert"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="button-grid">
          <button
            v-for="action in insertActions"
            :key="action.id"
            class="toolbar-button-large touch-target-xl"
            :aria-label="action.label"
            @click="action.onClick"
          >
            <span
              class="button-icon"
              v-html="action.icon"
            />
            <span class="button-label">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Blocks Tab -->
      <div
        v-show="activeTab === 'blocks'"
        id="panel-blocks"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="block-list">
          <button
            v-for="block in blockActions"
            :key="block.id"
            class="block-button touch-target"
            :aria-label="`Convert to ${block.label}`"
            @click="block.onClick"
          >
            <span
              class="block-icon"
              v-html="block.icon"
            />
            <span class="block-label">{{ block.label }}</span>
          </button>
        </div>
      </div>

      <!-- More Tab -->
      <div
        v-show="activeTab === 'more'"
        id="panel-more"
        class="toolbar-panel"
        role="tabpanel"
      >
        <div class="more-list">
          <button
            v-for="action in moreActions"
            :key="action.id"
            class="more-button touch-target"
            :aria-label="action.label"
            @click="action.onClick"
          >
            <span
              class="more-icon"
              v-html="action.icon"
            />
            <span class="more-label">{{ action.label }}</span>
            <span
              v-if="action.badge"
              class="more-badge"
            >
              {{ action.badge }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Haptic Feedback Indicator (for debugging) -->
    <div
      v-if="showHapticIndicator"
      class="haptic-indicator"
    >
      <div class="haptic-pulse" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useDeviceDetection } from "../composables/useDeviceDetection";

// Props
interface Props {
  visible?: boolean;
  defaultTab?: string;
  enableHaptics?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  defaultTab: "format",
  enableHaptics: true,
});

// Emits
const emit = defineEmits<{
  close: [];
  action: [actionId: string];
}>();

// Composables
const { showMobileToolbar } = useDeviceDetection();

// State
const isCollapsed = ref(false);
const activeTab = ref(props.defaultTab);
const showHapticIndicator = ref(false);

// Show toolbar only on mobile devices
const showToolbar = computed(() => props.visible && showMobileToolbar.value);

// Tabs configuration
const tabs = [
  {
    id: "format",
    label: "Format",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><text x="2" y="15" font-weight="bold" font-size="14">B</text></svg>',
  },
  {
    id: "insert",
    label: "Insert",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5v10M5 10h10"/></svg>',
  },
  {
    id: "blocks",
    label: "Blocks",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><rect x="4" y="4" width="12" height="3" rx="1"/><rect x="4" y="9" width="12" height="3" rx="1"/><rect x="4" y="14" width="12" height="3" rx="1"/></svg>',
  },
  {
    id: "more",
    label: "More",
    icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="5" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="10" cy="15" r="1.5"/></svg>',
  },
];

// Current tab data
const currentTab = computed(
  () => tabs.find((t) => t.id === activeTab.value) || tabs[0]
);

// Format actions (bold, italic, etc.)
const formatActions = [
  {
    id: "bold",
    label: "Bold",
    icon: "<strong>B</strong>",
    onClick: () => executeAction("bold"),
    isActive: () => false,
  },
  {
    id: "italic",
    label: "Italic",
    icon: "<em>I</em>",
    onClick: () => executeAction("italic"),
    isActive: () => false,
  },
  {
    id: "underline",
    label: "Underline",
    icon: "<u>U</u>",
    onClick: () => executeAction("underline"),
    isActive: () => false,
  },
  {
    id: "strikethrough",
    label: "Strikethrough",
    icon: "<s>S</s>",
    onClick: () => executeAction("strikethrough"),
    isActive: () => false,
  },
  {
    id: "code",
    label: "Code",
    icon: "<code>&lt;/&gt;</code>",
    onClick: () => executeAction("code"),
    isActive: () => false,
  },
  {
    id: "link",
    label: "Link",
    icon: "🔗",
    onClick: () => executeAction("link"),
    isActive: () => false,
  },
];

// Insert actions (image, table, etc.)
const insertActions = [
  {
    id: "image",
    label: "Image",
    icon: "🖼️",
    onClick: () => executeAction("image"),
  },
  {
    id: "table",
    label: "Table",
    icon: "📊",
    onClick: () => executeAction("table"),
  },
  {
    id: "link",
    label: "Link",
    icon: "🔗",
    onClick: () => executeAction("link"),
  },
  {
    id: "emoji",
    label: "Emoji",
    icon: "😀",
    onClick: () => executeAction("emoji"),
  },
];

// Block actions (heading, list, etc.)
const blockActions = [
  {
    id: "paragraph",
    label: "Paragraph",
    icon: "¶",
    onClick: () => executeAction("paragraph"),
  },
  {
    id: "h1",
    label: "Heading 1",
    icon: "H1",
    onClick: () => executeAction("h1"),
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: "H2",
    onClick: () => executeAction("h2"),
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: "H3",
    onClick: () => executeAction("h3"),
  },
  {
    id: "bullet-list",
    label: "Bullet List",
    icon: "•",
    onClick: () => executeAction("bullet-list"),
  },
  {
    id: "numbered-list",
    label: "Numbered List",
    icon: "1.",
    onClick: () => executeAction("numbered-list"),
  },
  {
    id: "checklist",
    label: "Checklist",
    icon: "☑",
    onClick: () => executeAction("checklist"),
  },
  {
    id: "blockquote",
    label: "Quote",
    icon: '"',
    onClick: () => executeAction("blockquote"),
  },
  {
    id: "code-block",
    label: "Code Block",
    icon: "{  }",
    onClick: () => executeAction("code-block"),
  },
];

// More actions (settings, export, etc.)
const moreActions = [
  {
    id: "undo",
    label: "Undo",
    icon: "↶",
    onClick: () => executeAction("undo"),
  },
  {
    id: "redo",
    label: "Redo",
    icon: "↷",
    onClick: () => executeAction("redo"),
  },
  {
    id: "find",
    label: "Find & Replace",
    icon: "🔍",
    onClick: () => executeAction("find"),
  },
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    icon: "⌨️",
    onClick: () => executeAction("shortcuts"),
  },
  {
    id: "export",
    label: "Export",
    icon: "📤",
    onClick: () => executeAction("export"),
    badge: "New",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
    onClick: () => executeAction("settings"),
  },
];

// Methods
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  triggerHaptic("light");
};

const selectTab = (tabId: string) => {
  activeTab.value = tabId;
  triggerHaptic("light");
};

const executeAction = (actionId: string) => {
  emit("action", actionId);
  triggerHaptic("medium");
};

const triggerHaptic = (intensity: "light" | "medium" | "heavy" = "light") => {
  if (!props.enableHaptics) return;
  if (!("vibrate" in navigator)) return;

  const patterns = {
    light: 10,
    medium: 20,
    heavy: 50,
  };

  try {
    navigator.vibrate(patterns[intensity]);

    // Show visual indicator
    showHapticIndicator.value = true;
    setTimeout(() => {
      showHapticIndicator.value = false;
    }, patterns[intensity] + 100);
  } catch (error) {
    console.debug("Haptic feedback failed:", error);
  }
};
</script>

<style scoped>
/* ============================================
   Mobile Toolbar Container
   ============================================ */

.mobile-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--toolbar-bg, #ffffff);
  border-top: 1px solid var(--toolbar-border, #e5e7eb);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 60vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.toolbar-collapsed {
  transform: translateY(calc(100% - 56px));
}

/* ============================================
   Toolbar Header
   ============================================ */

.toolbar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  min-height: 56px;
  background: var(--toolbar-header-bg, #f9fafb);
  border-bottom: 1px solid var(--toolbar-border, #e5e7eb);
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #1f2937);
  flex: 1;
  text-align: center;
}

.toolbar-toggle,
.toolbar-close {
  background: none;
  border: none;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.toolbar-toggle:active,
.toolbar-close:active {
  background: var(--button-active-bg, #e5e7eb);
  transform: scale(0.95);
}

/* ============================================
   Tab Navigation
   ============================================ */

.toolbar-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: var(--toolbar-tabs-bg, #f9fafb);
  overflow-x: auto;
  scrollbar-width: none;
}

.toolbar-tabs::-webkit-scrollbar {
  display: none;
}

.toolbar-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px 12px;
}

.toolbar-tab.tab-active {
  background: var(--tab-active-bg, #ffffff);
  color: var(--primary-color, #4a90e2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-icon {
  font-size: 20px;
}

.tab-label {
  font-size: 12px;
  font-weight: 500;
}

/* ============================================
   Toolbar Content
   ============================================ */

.toolbar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: var(--toolbar-content-bg, #ffffff);
}

.toolbar-panel {
  min-height: 100%;
}

/* Format Panel */
.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-button {
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 8px;
  color: var(--text-primary, #1f2937);
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.2s;
}

.toolbar-button.active {
  background: var(--button-active-bg, #2563eb);
  color: #ffffff;
  border-color: var(--button-active-border, #1e40af);
}

.toolbar-button:active {
  transform: scale(0.95);
}

/* Insert Panel */
.button-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.toolbar-button-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-button-large:active {
  transform: scale(0.97);
  background: var(--button-active-bg, #e5e7eb);
}

.button-icon {
  font-size: 32px;
}

.button-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

/* Blocks Panel */
.block-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.block-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--button-bg, #f3f4f6);
  border: 1px solid var(--button-border, #e5e7eb);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.block-button:active {
  transform: scale(0.98);
  background: var(--button-active-bg, #e5e7eb);
}

.block-icon {
  font-size: 24px;
  font-weight: bold;
  min-width: 32px;
  text-align: center;
}

.block-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #1f2937);
}

/* More Panel */
.more-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.more-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.more-button:active {
  background: var(--button-active-bg, #f3f4f6);
}

.more-icon {
  font-size: 24px;
  min-width: 32px;
  text-align: center;
}

.more-label {
  flex: 1;
  font-size: 16px;
  color: var(--text-primary, #1f2937);
}

.more-badge {
  padding: 2px 8px;
  background: var(--badge-bg, #2563eb);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
}

/* ============================================
   Haptic Indicator (Debug)
   ============================================ */

.haptic-indicator {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10000;
}

.haptic-pulse {
  width: 80px;
  height: 80px;
  background: rgba(74, 144, 226, 0.3);
  border-radius: 50%;
  animation: pulse 0.3s ease-out;
}

@keyframes pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* ============================================
   Safe Area Support (iOS notch/island)
   ============================================ */

@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .mobile-toolbar {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
