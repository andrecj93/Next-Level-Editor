import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useVirtualScroll } from '../useVirtualScroll'

describe('useVirtualScroll', () => {
  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const totalItems = ref(100)
      const { visibleStartIndex, visibleEndIndex, totalHeight, visibleItems } =
        useVirtualScroll(totalItems)

      expect(visibleStartIndex.value).toBeGreaterThanOrEqual(0)
      expect(visibleEndIndex.value).toBeGreaterThan(visibleStartIndex.value)
      expect(totalHeight.value).toBe(2400) // 100 items * 24px default height
      expect(visibleItems.value.length).toBeGreaterThan(0)
    })

    it('should initialize with custom item height', () => {
      const totalItems = ref(50)
      const { totalHeight } = useVirtualScroll(totalItems, { itemHeight: 40 })

      expect(totalHeight.value).toBe(2000) // 50 items * 40px
    })

    it('should initialize with custom buffer size', () => {
      const totalItems = ref(100)
      const { visibleItems } = useVirtualScroll(totalItems, {
        bufferSize: 10,
        containerHeight: 240
      })

      // With buffer of 10, should render more items
      expect(visibleItems.value.length).toBeGreaterThan(10)
    })

    it('should initialize with custom container height', () => {
      const totalItems = ref(100)
      const { visibleItems } = useVirtualScroll(totalItems, {
        containerHeight: 480,
        itemHeight: 24
      })

      // 480px container / 24px items = ~20 visible + buffers
      expect(visibleItems.value.length).toBeGreaterThan(20)
    })
  })

  describe('Visible Range Calculation', () => {
    it('should calculate correct visible range at top', () => {
      const totalItems = ref(1000)
      const { visibleStartIndex, visibleEndIndex, visibleItems } =
        useVirtualScroll(totalItems, {
          itemHeight: 24,
          bufferSize: 5,
          containerHeight: 600
        })

      expect(visibleStartIndex.value).toBe(0)
      expect(visibleEndIndex.value).toBeGreaterThan(0)
      expect(visibleItems.value[0].index).toBe(0)
    })

    it('should include buffer items before and after visible range', () => {
      const totalItems = ref(1000)
      const bufferSize = 5
      const { visibleStartIndex, visibleEndIndex } =
        useVirtualScroll(totalItems, {
          itemHeight: 24,
          bufferSize,
          containerHeight: 240 // ~10 items visible
        })

      const visibleCount = visibleEndIndex.value - visibleStartIndex.value + 1
      // Should include buffer on both sides
      expect(visibleCount).toBeGreaterThan(10)
    })

    it('should not exceed total items bounds', () => {
      const totalItems = ref(10)
      const { visibleStartIndex, visibleEndIndex } = useVirtualScroll(
        totalItems,
        {
          itemHeight: 24,
          bufferSize: 20, // Large buffer
          containerHeight: 600
        }
      )

      expect(visibleStartIndex.value).toBeGreaterThanOrEqual(0)
      expect(visibleEndIndex.value).toBeLessThan(10)
    })
  })

  describe('Visible Items Structure', () => {
    it('should generate correct item structure', () => {
      const totalItems = ref(100)
      const { visibleItems } = useVirtualScroll(totalItems, {
        itemHeight: 30
      })

      const firstItem = visibleItems.value[0]
      expect(firstItem).toHaveProperty('index')
      expect(firstItem).toHaveProperty('height')
      expect(firstItem).toHaveProperty('offset')
      expect(firstItem.height).toBe(30)
      expect(firstItem.offset).toBe(firstItem.index * 30)
    })

    it('should have sequential indices in visible items', () => {
      const totalItems = ref(100)
      const { visibleItems } = useVirtualScroll(totalItems)

      for (let i = 1; i < visibleItems.value.length; i++) {
        expect(visibleItems.value[i].index).toBe(
          visibleItems.value[i - 1].index + 1
        )
      }
    })

    it('should calculate correct offset for each item', () => {
      const totalItems = ref(100)
      const itemHeight = 25
      const { visibleItems } = useVirtualScroll(totalItems, { itemHeight })

      visibleItems.value.forEach((item) => {
        expect(item.offset).toBe(item.index * itemHeight)
      })
    })
  })

  describe('Scroll Offsets', () => {
    it('should calculate correct top offset at start', () => {
      const totalItems = ref(1000)
      const { offsetTop } = useVirtualScroll(totalItems)

      expect(offsetTop.value).toBe(0)
    })

    it('should calculate correct bottom offset', () => {
      const totalItems = ref(1000)
      const { offsetBottom, visibleEndIndex } = useVirtualScroll(totalItems, {
        itemHeight: 24
      })

      const remainingItems = 1000 - visibleEndIndex.value - 1
      expect(offsetBottom.value).toBe(remainingItems * 24)
    })

    it('should have zero bottom offset when all items visible', () => {
      const totalItems = ref(5)
      const { offsetBottom } = useVirtualScroll(totalItems, {
        containerHeight: 1000 // Large enough to show all items
      })

      expect(offsetBottom.value).toBe(0)
    })
  })

  describe('Scroll Handling', () => {
    it('should update visible range on scroll', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        containerHeight: 600
      }) as any

      const initialStart = result.visibleStartIndex.value

      // Simulate scroll
      const mockEvent = {
        target: { scrollTop: 240 } // Scroll down 10 items
      } as unknown as Event

      result.handleScroll(mockEvent)

      expect(result.visibleStartIndex.value).toBeGreaterThan(initialStart)
    })

    it('should handle scroll to specific index', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24
      }) as any

      const targetIndex = 50
      const offset = result.scrollToIndex(targetIndex)

      expect(offset).toBe(targetIndex * 24)
      expect(result.scrollTop.value).toBe(offset)
    })

    it('should scroll to index at start of list', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24
      }) as any

      const offset = result.scrollToIndex(0)

      expect(offset).toBe(0)
      expect(result.scrollTop.value).toBe(0)
      expect(result.visibleStartIndex.value).toBe(0)
    })

    it('should scroll to index at end of list', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        containerHeight: 600
      }) as any

      const lastIndex = 999
      const offset = result.scrollToIndex(lastIndex)

      expect(offset).toBe(lastIndex * 24)
      expect(result.scrollTop.value).toBe(offset)
    })

    it('should scroll to middle index and update visible range', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 30,
        containerHeight: 600,
        bufferSize: 5
      }) as any

      const middleIndex = 500
      result.scrollToIndex(middleIndex)

      expect(result.scrollTop.value).toBe(middleIndex * 30)
      // Visible range should be updated to include the target index
      expect(result.visibleStartIndex.value).toBeLessThanOrEqual(middleIndex)
      expect(result.visibleEndIndex.value).toBeGreaterThanOrEqual(middleIndex)
    })

    it('should return correct offset for custom item heights', () => {
      const totalItems = ref(500)
      const customHeight = 50
      const result = useVirtualScroll(totalItems, {
        itemHeight: customHeight
      }) as any

      const targetIndex = 100
      const offset = result.scrollToIndex(targetIndex)

      expect(offset).toBe(targetIndex * customHeight)
      expect(offset).toBe(5000)
    })

    it('should handle multiple sequential scrollToIndex calls', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24
      }) as any

      // Scroll to multiple indices in sequence
      const indices = [10, 50, 25, 100, 5]
      indices.forEach((index) => {
        const offset = result.scrollToIndex(index)
        expect(offset).toBe(index * 24)
        expect(result.scrollTop.value).toBe(offset)
      })
    })

    it('should handle scroll to top', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems) as any

      // First scroll down
      result.scrollTop.value = 500

      // Then scroll to top
      result.scrollToTop()

      expect(result.scrollTop.value).toBe(0)
      expect(result.visibleStartIndex.value).toBe(0)
    })

    it('should handle scroll to bottom', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        containerHeight: 600
      }) as any

      result.scrollToBottom()

      expect(result.scrollTop.value).toBeGreaterThan(0)
      // Should be near the end
      const expectedScroll = 1000 * 24 - 600
      expect(result.scrollTop.value).toBe(expectedScroll)
    })
  })

  describe('Reactivity', () => {
    it('should update when total items changes', () => {
      const totalItems = ref(100)
      const { totalHeight } = useVirtualScroll(totalItems, {
        itemHeight: 24
      })

      const initialHeight = totalHeight.value

      // Change total items
      totalItems.value = 200

      expect(totalHeight.value).toBe(4800) // 200 * 24
      expect(totalHeight.value).not.toBe(initialHeight)
    })

    it('should recalculate visible range when items change', () => {
      const totalItems = ref(50)
      const { visibleEndIndex } = useVirtualScroll(totalItems)

      // Increase items
      totalItems.value = 1000

      // End index might change based on visible range calculation
      expect(visibleEndIndex.value).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero items', () => {
      const totalItems = ref(0)
      const { totalHeight, visibleItems, offsetTop, offsetBottom } =
        useVirtualScroll(totalItems)

      expect(totalHeight.value).toBe(0)
      expect(visibleItems.value.length).toBe(0)
      expect(offsetTop.value).toBe(0)
      expect(offsetBottom.value).toBe(0)
    })

    it('should handle single item', () => {
      const totalItems = ref(1)
      const { visibleItems, visibleStartIndex, visibleEndIndex } =
        useVirtualScroll(totalItems)

      expect(visibleItems.value.length).toBe(1)
      expect(visibleStartIndex.value).toBe(0)
      expect(visibleEndIndex.value).toBe(0)
    })

    it('should handle very large item counts', () => {
      const totalItems = ref(100000)
      const { totalHeight, visibleItems } = useVirtualScroll(totalItems, {
        itemHeight: 24
      })

      expect(totalHeight.value).toBe(2400000) // 100k * 24px
      // Should still only render visible items
      expect(visibleItems.value.length).toBeLessThan(100)
    })

    it('should handle negative scroll position', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems) as any

      const mockEvent = {
        target: { scrollTop: -10 }
      } as unknown as Event

      result.handleScroll(mockEvent)

      // Should clamp to 0
      expect(result.visibleStartIndex.value).toBeGreaterThanOrEqual(0)
    })

    it('should handle scroll beyond maximum', () => {
      const totalItems = ref(100)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        containerHeight: 600
      }) as any

      const mockEvent = {
        target: { scrollTop: 999999 }
      } as unknown as Event

      result.handleScroll(mockEvent)

      // Should not exceed total items
      expect(result.visibleEndIndex.value).toBeLessThan(100)
    })
  })

  describe('Performance', () => {
    it('should handle rapid scroll events efficiently', () => {
      const totalItems = ref(10000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        containerHeight: 600
      }) as any

      const startTime = performance.now()

      // Simulate 100 rapid scroll events
      for (let i = 0; i < 100; i++) {
        const mockEvent = {
          target: { scrollTop: i * 10 }
        } as unknown as Event
        result.handleScroll(mockEvent)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100)
    })

    it('should maintain consistent item count across scrolls', () => {
      const totalItems = ref(1000)
      const result = useVirtualScroll(totalItems, {
        itemHeight: 24,
        bufferSize: 5,
        containerHeight: 600
      }) as any

      const initialCount = result.visibleItems.value.length

      // Scroll multiple times
      for (let i = 1; i <= 10; i++) {
        const mockEvent = {
          target: { scrollTop: i * 100 }
        } as unknown as Event
        result.handleScroll(mockEvent)

        // Item count should be relatively stable (within buffer range)
        const currentCount = result.visibleItems.value.length
        expect(Math.abs(currentCount - initialCount)).toBeLessThan(5)
      }
    })
  })
})
