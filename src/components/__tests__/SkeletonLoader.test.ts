import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonLoader from '../SkeletonLoader.vue'

describe('SkeletonLoader.vue', () => {
  describe('Variants', () => {
    it('should render editor skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'editor',
        },
      })

      expect(wrapper.find('.skeleton-editor').exists()).toBe(true)
      expect(wrapper.find('.skeleton-toolbar').exists()).toBe(true)
      expect(wrapper.find('.skeleton-content').exists()).toBe(true)
      expect(wrapper.find('.skeleton-footer').exists()).toBe(true)
    })

    it('should render modal skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'modal',
        },
      })

      expect(wrapper.find('.skeleton-modal').exists()).toBe(true)
      expect(wrapper.find('.skeleton-modal-header').exists()).toBe(true)
      expect(wrapper.find('.skeleton-modal-body').exists()).toBe(true)
      expect(wrapper.find('.skeleton-modal-footer').exists()).toBe(true)
    })

    it('should render dropdown skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'dropdown',
        },
      })

      expect(wrapper.find('.skeleton-dropdown').exists()).toBe(true)
      expect(wrapper.findAll('.skeleton-dropdown-item').length).toBeGreaterThan(0)
    })

    it('should render table skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'table',
        },
      })

      expect(wrapper.find('.skeleton-table').exists()).toBe(true)
      expect(wrapper.findAll('.skeleton-table-row').length).toBeGreaterThan(0)
    })

    it('should render card skeleton', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'card',
        },
      })

      expect(wrapper.find('.skeleton-card').exists()).toBe(true)
      expect(wrapper.find('.skeleton-card-image').exists()).toBe(true)
      expect(wrapper.find('.skeleton-card-body').exists()).toBe(true)
    })

    it('should render text skeleton by default', () => {
      const wrapper = mount(SkeletonLoader)

      expect(wrapper.find('.skeleton-text').exists()).toBe(true)
    })
  })

  describe('Customization', () => {
    it('should render custom number of lines for editor', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'editor',
          lines: 5,
        },
      })

      const lines = wrapper.findAll('.skeleton-line')
      expect(lines.length).toBe(5)
    })

    it('should render custom number of items for dropdown', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'dropdown',
          items: 7,
        },
      })

      const items = wrapper.findAll('.skeleton-dropdown-item')
      expect(items.length).toBe(7)
    })

    it('should render custom rows and columns for table', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'table',
          rows: 4,
          columns: 5,
        },
      })

      const rows = wrapper.findAll('.skeleton-table-row')
      expect(rows.length).toBe(5) // 4 data rows + 1 header row

      const cells = rows[0].findAll('.skeleton-table-cell')
      expect(cells.length).toBe(5)
    })
  })

  describe('Styling', () => {
    it('should have animation class', () => {
      const wrapper = mount(SkeletonLoader)

      expect(wrapper.classes()).toContain('skeleton-loader')
    })

    it('should apply variant class', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'editor',
        },
      })

      expect(wrapper.classes()).toContain('editor')
    })
  })

  describe('Line Width Variation', () => {
    it('should vary line widths for editor content', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'editor',
          lines: 10,
        },
      })

      const lines = wrapper.findAll('.skeleton-line')
      const widths = lines.map((line) => line.attributes('style'))
      
      // Check that not all widths are the same
      const uniqueWidths = new Set(widths)
      expect(uniqueWidths.size).toBeGreaterThan(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'modal',
        },
      })

      expect(wrapper.find('.skeleton-modal-header').exists()).toBe(true)
      expect(wrapper.find('.skeleton-modal-body').exists()).toBe(true)
      expect(wrapper.find('.skeleton-modal-footer').exists()).toBe(true)
    })
  })

  describe('Default Props', () => {
    it('should use default variant', () => {
      const wrapper = mount(SkeletonLoader)
      expect(wrapper.find('.skeleton-text').exists()).toBe(true)
    })

    it('should use default lines count', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'editor',
        },
      })

      const lines = wrapper.findAll('.skeleton-line')
      expect(lines.length).toBe(10) // default is 10
    })

    it('should use default items count', () => {
      const wrapper = mount(SkeletonLoader, {
        props: {
          variant: 'dropdown',
        },
      })

      const items = wrapper.findAll('.skeleton-dropdown-item')
      expect(items.length).toBe(5) // default is 5
    })
  })
})
