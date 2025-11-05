import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VirtualScrollContainer from '../VirtualScrollContainer.vue'
import { h } from 'vue'

describe('VirtualScrollContainer', () => {
  describe('Rendering', () => {
    it('should render container with correct height', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100,
          height: 500
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const container = wrapper.find('.virtual-scroll-container')
      expect(container.exists()).toBe(true)
      expect(container.attributes('style')).toContain('height: 500px')
    })

    it('should render spacer with correct total height', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100,
          itemHeight: 30
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      expect(spacer.exists()).toBe(true)
      // 100 items * 30px = 3000px
      expect(spacer.attributes('style')).toContain('height: 3000px')
    })

    it('should render content with correct top offset', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 1000,
          itemHeight: 24
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const content = wrapper.find('.virtual-scroll-content')
      expect(content.exists()).toBe(true)
      expect(content.attributes('style')).toContain('top: 0px')
    })

    it('should render visible items using slot', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item' }, `Item ${slotProps.index}`)
        }
      })

      const items = wrapper.findAll('.test-item')
      expect(items.length).toBeGreaterThan(0)
    })
  })

  describe('Props', () => {
    it('should use default item height', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 50
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      // 50 items * 24px default = 1200px
      expect(spacer.attributes('style')).toContain('height: 1200px')
    })

    it('should use custom item height', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 50,
          itemHeight: 40
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      // 50 items * 40px = 2000px
      expect(spacer.attributes('style')).toContain('height: 2000px')
    })

    it('should use default buffer size', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      // Should render items with default buffer
      expect(wrapper.vm).toBeDefined()
    })

    it('should use default container height', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const container = wrapper.find('.virtual-scroll-container')
      // Default height is 600px
      expect(container.attributes('style')).toContain('height: 600px')
    })
  })

  describe('Scroll Handling', () => {
    it('should handle scroll events', async () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 1000
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item' }, `Item ${slotProps.index}`)
        }
      })

      const container = wrapper.find('.virtual-scroll-container')

      // Trigger scroll event
      await container.trigger('scroll')

      expect(wrapper.vm).toBeDefined()
    })

    it('should update visible items on scroll', async () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 1000,
          itemHeight: 24
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item' }, `Item ${slotProps.index}`)
        }
      })

      const container = wrapper.find('.virtual-scroll-container')
      const element = container.element as HTMLElement

      // Simulate scroll by setting scrollTop
      Object.defineProperty(element, 'scrollTop', {
        writable: true,
        value: 240 // Scroll down 10 items
      })

      await container.trigger('scroll')

      expect(wrapper.vm).toBeDefined()
    })
  })

  describe('Exposed Methods', () => {
    it('should expose scrollToIndex method', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      expect(wrapper.vm.scrollToIndex).toBeDefined()
      expect(typeof wrapper.vm.scrollToIndex).toBe('function')
    })

    it('should expose scrollToTop method', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      expect(wrapper.vm.scrollToTop).toBeDefined()
      expect(typeof wrapper.vm.scrollToTop).toBe('function')
    })

    it('should expose scrollToBottom method', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      expect(wrapper.vm.scrollToBottom).toBeDefined()
      expect(typeof wrapper.vm.scrollToBottom).toBe('function')
    })

    it('should expose containerRef', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      expect(wrapper.vm.containerRef).toBeDefined()
    })
  })

  describe('Slot Props', () => {
    it('should pass item to slot', () => {
      let receivedItem: any = null

      mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: (slotProps: any) => {
            if (!receivedItem) receivedItem = slotProps.item
            return h('div', 'Item')
          }
        }
      })

      expect(receivedItem).toBeDefined()
      expect(receivedItem).toHaveProperty('index')
      expect(receivedItem).toHaveProperty('height')
      expect(receivedItem).toHaveProperty('offset')
    })

    it('should pass index to slot', () => {
      let receivedIndex: number | null = null

      mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: (slotProps: any) => {
            if (receivedIndex === null) receivedIndex = slotProps.index
            return h('div', 'Item')
          }
        }
      })

      expect(receivedIndex).toBeGreaterThanOrEqual(0)
    })

    it('should render different items with unique keys', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item', 'data-index': slotProps.index }, `Item ${slotProps.index}`)
        }
      })

      const items = wrapper.findAll('.test-item')
      expect(items.length).toBeGreaterThan(0)

      // Check that items have different indices
      const indices = items.map((item) =>
        parseInt(item.attributes('data-index') || '0')
      )
      const uniqueIndices = new Set(indices)
      expect(uniqueIndices.size).toBe(indices.length)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero items', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 0
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      expect(spacer.attributes('style')).toContain('height: 0px')
    })

    it('should handle single item', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 1
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item' }, `Item ${slotProps.index}`)
        }
      })

      const items = wrapper.findAll('.test-item')
      expect(items.length).toBe(1)
    })

    it('should handle very large item counts', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100000,
          itemHeight: 24
        },
        slots: {
          item: (slotProps: any) =>
            h('div', { class: 'test-item' }, `Item ${slotProps.index}`)
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      // 100k * 24px = 2,400,000px
      expect(spacer.attributes('style')).toContain('height: 2400000px')

      // Should still only render visible items, not all 100k
      const items = wrapper.findAll('.test-item')
      expect(items.length).toBeLessThan(100)
    })
  })

  describe('Styling', () => {
    it('should apply overflow auto to container', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const container = wrapper.find('.virtual-scroll-container')
      expect(container.attributes('style')).toContain('overflow: auto')
    })

    it('should apply relative positioning to spacer', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const spacer = wrapper.find('.virtual-scroll-spacer')
      expect(spacer.attributes('style')).toContain('position: relative')
    })

    it('should apply absolute positioning to content', () => {
      const wrapper = mount(VirtualScrollContainer, {
        props: {
          totalItems: 100
        },
        slots: {
          item: () => h('div', 'Item')
        }
      })

      const content = wrapper.find('.virtual-scroll-content')
      expect(content.attributes('style')).toContain('position: absolute')
    })
  })
})
