<template>
  <div
    ref="containerRef"
    class="virtual-scroll-container"
    :style="{ height: `${height}px`, overflow: 'auto' }"
    @scroll="handleScroll"
  >
    <div
      class="virtual-scroll-spacer"
      :style="{ height: `${totalHeight}px`, position: 'relative' }"
    >
      <div
        class="virtual-scroll-content"
        :style="{
          position: 'absolute',
          top: `${offsetTop}px`,
          left: 0,
          right: 0
        }"
      >
        <slot
          name="item"
          v-for="item in visibleItems"
          :key="item.index"
          :item="item"
          :index="item.index"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs } from 'vue'
import { useVirtualScroll } from '../composables/useVirtualScroll'

interface Props {
  totalItems: number
  itemHeight?: number
  bufferSize?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  itemHeight: 24,
  bufferSize: 5,
  height: 600
})

const { totalItems } = toRefs(props)
const containerRef = ref<HTMLElement | null>(null)

const virtualScroll = useVirtualScroll(totalItems, {
  itemHeight: props.itemHeight,
  bufferSize: props.bufferSize,
  containerHeight: props.height
})

const {
  visibleItems,
  totalHeight,
  offsetTop,
  handleScroll: onScroll,
  scrollToIndex,
  scrollToTop,
  scrollToBottom
} = virtualScroll

function handleScroll(event: Event) {
  onScroll(event)
}

// Expose methods to parent
defineExpose({
  scrollToIndex,
  scrollToTop,
  scrollToBottom,
  containerRef
})
</script>

<style scoped>
.virtual-scroll-container {
  position: relative;
  will-change: scroll-position;
}

.virtual-scroll-spacer {
  width: 100%;
}

.virtual-scroll-content {
  width: 100%;
}
</style>
