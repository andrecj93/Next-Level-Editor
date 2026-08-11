<!-- eslint-disable vue/max-attributes-per-line -->
<template>
  <div ref="wrapperRef" class="color-picker-wrapper">
    <button
      class="color-button"
      :style="{ backgroundColor: modelValue || '#000000' }"
      :aria-label="label"
      aria-haspopup="dialog"
      :aria-expanded="showPicker"
      @mousedown.prevent="togglePicker"
      @keydown.enter.prevent="togglePicker"
      @keydown.space.prevent="togglePicker"
    >
      <span class="color-icon">{{ icon }}</span>
    </button>

    <transition name="picker-fade">
      <div v-if="showPicker" class="color-picker-container" @click.stop>
        <div class="color-picker-label">
          {{ label }}
        </div>
        <Vue3ColorPicker
          v-model="internalColor"
          mode="solid"
          type="HEX"
          :theme="theme"
          :show-color-list="false"
          :show-eye-drop="false"
          :show-alpha="true"
          :show-input-menu="true"
          :show-input-set="true"
          :show-picker-mode="false"
          :show-buttons="false"
        />
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  computed,
  watch,
  defineAsyncComponent,
} from "vue";
// The vendor picker is only ever RENDERED behind `v-if="showPicker"`, so it
// loads the first time someone actually opens the colour popup instead of
// riding in the library's eager bundle for every consumer. #R31-2
const Vue3ColorPicker = defineAsyncComponent(async () => {
  const module = await import("@cyhnkckali/vue3-color-picker");
  return module.Vue3ColorPicker;
});
// The STYLESHEET stays a static import: cssCodeSplit is off, so this folds
// into the single shipped stylesheet and a consumer importing
// 'next-level-editor/style.css' gets a styled picker. It was once imported
// only in the demo — which the lib build excludes — and every consumer saw an
// unstyled, broken widget. Importing only the CSS subpath pulls no JS.
import "@cyhnkckali/vue3-color-picker/dist/style.css";

interface Props {
  modelValue?: string;
  label?: string;
  icon?: string;
}

type Emits = (e: "update:modelValue", value: string) => void;

const props = withDefaults(defineProps<Props>(), {
  modelValue: "#000000",
  label: "Color",
  icon: "🎨",
});

const emit = defineEmits<Emits>();

const showPicker = ref(false);
const internalColor = ref(props.modelValue || "#000000");

// Watch for external changes to modelValue
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue && newValue !== internalColor.value) {
      internalColor.value = newValue;
    }
  }
);

// Watch for internal color changes and emit — DEBOUNCED. The vendor picker
// updates internalColor on every pointer-drag tick; emitting each intermediate
// color made the parent wrap the selection in a span, push a history entry and
// steal focus back on EVERY tick (dozens per drag). Coalesce a drag into a
// single emit shortly after the user settles on a color.
let emitTimer: ReturnType<typeof setTimeout> | null = null;
const EMIT_DEBOUNCE_MS = 120;

watch(internalColor, (newColor) => {
  if (emitTimer) clearTimeout(emitTimer);
  emitTimer = setTimeout(() => {
    emitTimer = null;
    if (newColor !== props.modelValue) {
      emit("update:modelValue", newColor);
    }
  }, EMIT_DEBOUNCE_MS);
});

// Detect theme from OUR OWN editor, by walking up from this picker — never a
// document-wide querySelector, which returned the FIRST editor on the page, so
// the picker in a dark second editor rendered light. Kept live with an observer
// (the old computed had no reactive DOM dependency, so it never tracked a theme
// toggle even in a single editor). #R23-33
const wrapperRef = ref<HTMLElement | null>(null);
const isDark = ref(false);
let themeObserver: MutationObserver | null = null;

const ownEditor = (): HTMLElement | null =>
  wrapperRef.value?.closest<HTMLElement>(".next-level-editor") ?? null;

const syncTheme = () => {
  isDark.value = ownEditor()?.classList.contains("theme-dark") ?? false;
};

const theme = computed(() => (isDark.value ? "dark" : "light"));

onMounted(() => {
  syncTheme();
  const editor = ownEditor();
  if (editor) {
    themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(editor, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
});

onBeforeUnmount(() => {
  themeObserver?.disconnect();
  themeObserver = null;
});

const togglePicker = () => {
  showPicker.value = !showPicker.value;
  if (showPicker.value) {
    internalColor.value = props.modelValue || "#000000";
  }
};

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".color-picker-wrapper")) {
    showPicker.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
  if (emitTimer) clearTimeout(emitTimer);
});
</script>

<style scoped>
.color-picker-wrapper {
  position: relative;
  display: inline-block;
}

.color-button {
  width: 38px;
  height: 38px;
  border: 2px solid currentColor;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: transform var(--transition-fast, 150ms) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.color-button:hover {
  transform: scale(1.05);
}

.color-icon {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.color-picker-container {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  /* Same layer as the ToolbarDropdown menus — at 100 this popup lost to
     sibling dropdowns (z-index 10000) and painted underneath them. */
  z-index: 10000;
  background: var(--editor-bg, white);
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: var(--radius-lg, 10px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  padding: 12px;
  min-width: 280px;
  /* Scroll internally when the editor/viewport can't fit the whole panel. */
  max-height: min(420px, calc(100vh - 120px));
  overflow-y: auto;
}

.color-picker-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
  color: var(--toolbar-text, #1f2937);
}

.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: opacity var(--transition-fast, 150ms) ease,
    transform var(--transition-fast, 150ms) ease;
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
