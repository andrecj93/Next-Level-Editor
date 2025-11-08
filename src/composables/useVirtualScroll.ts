import { ref, computed, watch, type Ref } from 'vue'

export interface VirtualScrollItem {
  index: number
  height: number
  offset: number
}

export interface VirtualScrollOptions {
  itemHeight?: number
  bufferSize?: number
  containerHeight?: number
}

export interface VirtualScrollState {
  scrollTop: Ref<number>
  visibleStartIndex: Ref<number>
  visibleEndIndex: Ref<number>
  visibleItems: Ref<VirtualScrollItem[]>
  totalHeight: Ref<number>
  offsetTop: Ref<number>
  offsetBottom: Ref<number>
  handleScroll: (event: Event) => void
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => number
  scrollToTop: () => void
  scrollToBottom: () => void
}

/**
 * Composable for virtual scrolling large lists efficiently
 * Only renders visible items plus a buffer for smooth scrolling
 */
export function useVirtualScroll(
  totalItems: Ref<number>,
  options: VirtualScrollOptions = {}
): VirtualScrollState {
  const itemHeight = options.itemHeight || 24
  const bufferSize = options.bufferSize || 5
  const containerHeight = options.containerHeight || 600

  const scrollTop = ref(0)
  const visibleStartIndex = ref(0)
  const visibleEndIndex = ref(0)
  const visibleItems = ref<VirtualScrollItem[]>([])

  // Total height of all items
  const totalHeight = computed(() => totalItems.value * itemHeight)

  // Offset for items before visible range
  const offsetTop = computed(() => Math.max(0, visibleStartIndex.value * itemHeight))

  // Offset for items after visible range
  const offsetBottom = computed(() => {
    const remainingItems = totalItems.value - visibleEndIndex.value - 1
    return Math.max(0, remainingItems * itemHeight)
  })

  // Calculate visible range based on scroll position
  function updateVisibleRange() {
    const start = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferSize)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const end = Math.min(
      totalItems.value - 1,
      start + visibleCount + bufferSize * 2
    )

    visibleStartIndex.value = start
    visibleEndIndex.value = end

    // Generate visible items array
    const items: VirtualScrollItem[] = []
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        height: itemHeight,
        offset: i * itemHeight
      })
    }
    visibleItems.value = items
  }

  // Handle scroll events
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    scrollTop.value = target.scrollTop
    updateVisibleRange()
  }

  // Scroll to specific index
  function scrollToIndex(index: number): number {
    const offset = index * itemHeight
    scrollTop.value = offset
    updateVisibleRange()
    return offset
  }

  // Scroll to top
  function scrollToTop() {
    scrollTop.value = 0
    updateVisibleRange()
  }

  // Scroll to bottom
  function scrollToBottom() {
    scrollTop.value = totalHeight.value - containerHeight
    updateVisibleRange()
  }

  // Watch for changes in total items
  watch(totalItems, () => {
    updateVisibleRange()
  })

  // Initialize visible range
  updateVisibleRange()

  return {
    scrollTop,
    visibleStartIndex,
    visibleEndIndex,
    visibleItems,
    totalHeight,
    offsetTop,
    offsetBottom,
    handleScroll,
    scrollToIndex,
    scrollToTop,
    scrollToBottom
  }
}
