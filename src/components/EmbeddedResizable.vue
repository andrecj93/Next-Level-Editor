<template>
  <div
    ref="containerRef"
    class="embedded-resizable"
    :class="{
      'is-selected': isSelected,
      'is-dragging': isDragging,
      'is-resizing': isResizing,
      [`align-${alignment}`]: alignment,
    }"
    :style="containerStyle"
    role="button"
    tabindex="0"
    :aria-label="t(ariaLabel)"
    @click="handleSelect"
    @keydown="handleKeyDown"
  >
    <!-- Content Wrapper -->
    <div class="embedded-content" @mousedown.stop @touchstart.stop>
      <slot />
    </div>

    <!-- Control Overlay (visible when selected) -->
    <div v-if="isSelected" class="control-overlay">
      <!-- Resize Handles -->
      <div
        v-for="handle in resizeHandles"
        :key="handle"
        :class="['resize-handle', `handle-${handle}`]"
        :data-handle="handle"
        @mousedown="startResize($event, handle)"
        @touchstart="startResize($event, handle)"
      />

      <!-- Toolbar -->
      <div class="embedded-toolbar">
        <div class="toolbar-group">
          <button
            class="toolbar-btn"
            :title="t('Align Left')"
            @click="changeAlignment('left')"
          >
            <span>⬅️</span>
          </button>
          <button
            class="toolbar-btn"
            :title="t('Align Center')"
            @click="changeAlignment('center')"
          >
            <span>↔️</span>
          </button>
          <button
            class="toolbar-btn"
            :title="t('Align Right')"
            @click="changeAlignment('right')"
          >
            <span>➡️</span>
          </button>
        </div>

        <div class="toolbar-divider" />

        <div class="toolbar-group">
          <button class="toolbar-btn" :title="t('Reset Size')" @click="resetSize">
            <span>🔄</span>
          </button>
          <button
            class="toolbar-btn danger"
            :title="t('Delete')"
            @click="handleDelete"
          >
            <span>🗑️</span>
          </button>
        </div>

        <!-- Size Indicator -->
        <div class="size-indicator">
          {{ number(Math.round(currentWidth)) }}×{{ number(Math.round(currentHeight)) }}{{ t("px") }}
        </div>
      </div>
    </div>

    <!-- Drag Handle (visible when selected) -->
    <div
      v-if="isSelected && enableDrag"
      class="drag-handle"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      <span>⋮⋮</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, number } = useEditorLocale();
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useResizable } from "../composables/useResizable";
import { useDraggable } from "../composables/useDraggable";

export interface EmbeddedResizableProps {
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  enableDrag?: boolean;
  alignment?: "left" | "center" | "right";
  ariaLabel?: string;
}

const props = withDefaults(defineProps<EmbeddedResizableProps>(), {
  initialWidth: 400,
  initialHeight: 300,
  minWidth: 100,
  minHeight: 100,
  maxWidth: 1200,
  maxHeight: 1200,
  maintainAspectRatio: true,
  enableDrag: false,
  alignment: "center",
  ariaLabel: "Embedded media content",
});

const emit = defineEmits<{
  delete: [];
  select: [];
  deselect: [];
  resize: [{ width: number; height: number }];
  move: [{ x: number; y: number }];
}>();

const containerRef = ref<HTMLElement | null>(null);
const isSelected = ref(false);

// Resize functionality
const { currentWidth, currentHeight, isResizing, startResize, resetSize } =
  useResizable({
    containerRef,
    initialWidth: props.initialWidth,
    initialHeight: props.initialHeight,
    minWidth: props.minWidth,
    minHeight: props.minHeight,
    maxWidth: props.maxWidth,
    maxHeight: props.maxHeight,
    maintainAspectRatio: props.maintainAspectRatio,
    onResize: (dimensions: { width: number; height: number }) => {
      emit("resize", dimensions);
    },
  });

// Drag functionality
const { isDragging, startDrag } = useDraggable({
  containerRef,
  onMove: (position: { x: number; y: number }) => {
    emit("move", position);
  },
});

const resizeHandles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const containerStyle = computed(() => ({
  width: `${currentWidth.value}px`,
  height: `${currentHeight.value}px`,
}));

const changeAlignment = (newAlignment: "left" | "center" | "right") => {
  // This would update the alignment prop - handled by parent
  if (containerRef.value) {
    if (newAlignment === "left") {
      containerRef.value.style.marginLeft = "0";
      containerRef.value.style.marginRight = "auto";
    } else if (newAlignment === "center") {
      containerRef.value.style.marginLeft = "auto";
      containerRef.value.style.marginRight = "auto";
    } else {
      containerRef.value.style.marginLeft = "auto";
      containerRef.value.style.marginRight = "0";
    }
  }
};

const handleSelect = (e: MouseEvent) => {
  e.stopPropagation();
  if (!isSelected.value) {
    isSelected.value = true;
    emit("select");
  }
};

const handleDeselect = (e: MouseEvent) => {
  // Only deselect if we were actually selected — otherwise every outside click
  // anywhere on the page would emit a spurious `deselect`.
  if (isSelected.value && !containerRef.value?.contains(e.target as Node)) {
    isSelected.value = false;
    emit("deselect");
  }
};

const handleDelete = () => {
  if (confirm("Delete this embedded content?")) {
    emit("delete");
    containerRef.value?.remove();
  }
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isSelected.value) return;

  switch (e.key) {
    case "Delete":
    case "Backspace":
      e.preventDefault();
      handleDelete();
      break;
    case "Escape":
      isSelected.value = false;
      emit("deselect");
      break;
    case "ArrowLeft":
      if (e.shiftKey) {
        e.preventDefault();
        currentWidth.value = Math.max(props.minWidth, currentWidth.value - 10);
      }
      break;
    case "ArrowRight":
      if (e.shiftKey) {
        e.preventDefault();
        currentWidth.value = Math.min(props.maxWidth, currentWidth.value + 10);
      }
      break;
    case "ArrowUp":
      if (e.shiftKey) {
        e.preventDefault();
        currentHeight.value = Math.max(
          props.minHeight,
          currentHeight.value - 10
        );
      }
      break;
    case "ArrowDown":
      if (e.shiftKey) {
        e.preventDefault();
        currentHeight.value = Math.min(
          props.maxHeight,
          currentHeight.value + 10
        );
      }
      break;
  }
};

onMounted(() => {
  document.addEventListener("click", handleDeselect);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDeselect);
});
</script>

<style scoped>
.embedded-resizable {
  position: relative;
  display: inline-block;
  margin: 16px auto;
  outline: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  cursor: pointer;
  user-select: none;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
}

.embedded-resizable:hover {
  border-color: rgba(102, 126, 234, 0.3);
}

.embedded-resizable.is-selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  z-index: 100;
}

.embedded-resizable.is-dragging {
  cursor: move;
  opacity: 0.8;
}

.embedded-resizable.is-resizing {
  user-select: none;
}

/* Alignment */
.embedded-resizable.align-left {
  margin-left: 0;
  margin-right: auto;
}

.embedded-resizable.align-center {
  margin-left: auto;
  margin-right: auto;
}

.embedded-resizable.align-right {
  margin-left: auto;
  margin-right: 0;
}

/* Content Wrapper */
.embedded-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
}

.embedded-content :deep(img),
.embedded-content :deep(video),
.embedded-content :deep(iframe) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

/* Control Overlay */
.control-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

/* Resize Handles */
.resize-handle {
  position: absolute;
  background: #667eea;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  z-index: 10;
  transition: all 0.2s ease;
}

.resize-handle:hover {
  background: #5568d3;
  transform: scale(1.2);
}

/* Corner handles */
.handle-nw,
.handle-ne,
.handle-se,
.handle-sw {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.handle-nw {
  top: -6px;
  left: -6px;
  cursor: nw-resize;
}

.handle-ne {
  top: -6px;
  right: -6px;
  cursor: ne-resize;
}

.handle-se {
  bottom: -6px;
  right: -6px;
  cursor: se-resize;
}

.handle-sw {
  bottom: -6px;
  left: -6px;
  cursor: sw-resize;
}

/* Edge handles */
.handle-n,
.handle-s {
  width: 40px;
  height: 8px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 4px;
}

.handle-e,
.handle-w {
  width: 8px;
  height: 40px;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 4px;
}

.handle-n {
  top: -4px;
  cursor: n-resize;
}

.handle-s {
  bottom: -4px;
  cursor: s-resize;
}

.handle-e {
  right: -4px;
  cursor: e-resize;
}

.handle-w {
  left: -4px;
  cursor: w-resize;
}

/* Toolbar */
.embedded-toolbar {
  position: absolute;
  top: -48px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  z-index: 20;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.toolbar-group {
  display: flex;
  gap: 4px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e9ecef;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
}

.toolbar-btn:hover {
  background: #f8f9fa;
  transform: translateY(-2px);
}

.toolbar-btn:active {
  transform: translateY(0);
}

.toolbar-btn.danger:hover {
  background: #fee;
  color: #dc3545;
}

.size-indicator {
  padding: 4px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  font-family: "Courier New", monospace;
}

/* Drag Handle */
.drag-handle {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background: rgba(102, 126, 234, 0.9);
  border: 2px solid white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  color: white;
  font-size: 18px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
  z-index: 20;
  transition: all 0.2s ease;
}

.drag-handle:hover {
  background: #5568d3;
  transform: scale(1.1);
}

.drag-handle:active {
  transform: scale(0.95);
}

/* Dark mode support — keyed to the editor's own theme class (.theme-dark on
   the .next-level-editor root), not the OS prefers-color-scheme setting. */
.theme-dark .embedded-resizable:hover {
  border-color: rgba(102, 126, 234, 0.5);
}

.theme-dark .embedded-toolbar {
  background: #2a2a2a;
  border-color: #444;
}

.theme-dark .toolbar-btn {
  background: #2a2a2a;
  color: #fff;
}

.theme-dark .toolbar-btn:hover {
  background: #3a3a3a;
}

.theme-dark .size-indicator {
  background: #3a3a3a;
  color: #ccc;
}

.theme-dark .resize-handle {
  border-color: #2a2a2a;
}

/* Responsive */
@media (max-width: 768px) {
  .embedded-toolbar {
    top: -44px;
    padding: 4px 6px;
  }

  .toolbar-btn {
    width: 28px;
    height: 28px;
    font-size: 14px;
  }

  .size-indicator {
    font-size: 10px;
    padding: 3px 8px;
  }

  .drag-handle {
    width: 28px;
    height: 28px;
    font-size: 16px;
  }

  .resize-handle {
    touch-action: none;
  }
}
</style>
