import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import HistoryTimeline from '../HistoryTimeline.vue'
import type { HistoryEntry } from '../../composables/useHistoryTimeline'

const createMockEntry = (id: string, content: string, label?: string, timestamp?: number): HistoryEntry => ({
  id,
  content,
  timestamp: timestamp || Date.now(),
  label
})

describe('HistoryTimeline', () => {
  const mockHistory: HistoryEntry[] = [
    createMockEntry('1', 'Content 1', 'Initial', Date.now() - 10000),
    createMockEntry('2', 'Content 2', 'Added text', Date.now() - 5000),
    createMockEntry('3', 'Content 3', 'Modified', Date.now())
  ]

  const defaultProps = {
    history: mockHistory,
    currentIndex: 2,
    canGoBack: true,
    canGoForward: false,
    hasHistory: true,
    historySize: 3,
    timelineProgress: 100
  }

  describe('Rendering', () => {
    it('should render timeline with history', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      
      expect(wrapper.find('.history-timeline').exists()).toBe(true)
      expect(wrapper.find('.timeline-title').text()).toBe('History Timeline')
      expect(wrapper.findAll('.timeline-entry')).toHaveLength(3)
    })

    it('should render custom title', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, title: 'Custom Title' }
      })
      
      expect(wrapper.find('.timeline-title').text()).toBe('Custom Title')
    })

    it('should render empty state when no history', () => {
      const wrapper = mount(HistoryTimeline, {
        props: {
          ...defaultProps,
          history: [],
          hasHistory: false,
          historySize: 0
        }
      })
      
      expect(wrapper.find('.timeline-empty').exists()).toBe(true)
      expect(wrapper.find('.timeline-empty').text()).toContain('No history available')
    })

    it('should render custom empty message', () => {
      const wrapper = mount(HistoryTimeline, {
        props: {
          ...defaultProps,
          history: [],
          hasHistory: false,
          historySize: 0,
          emptyMessage: 'Custom empty message'
        }
      })
      
      expect(wrapper.find('.timeline-empty').text()).toContain('Custom empty message')
    })

    it('should apply compact class', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, compact: true }
      })
      
      expect(wrapper.find('.history-timeline').classes()).toContain('is-compact')
    })
  })

  describe('Timeline Entries', () => {
    it('should render all entries', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      const entries = wrapper.findAll('.timeline-entry')
      
      expect(entries).toHaveLength(3)
    })

    it('should highlight current entry', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      const entries = wrapper.findAll('.timeline-entry')
      
      expect(entries[2].classes()).toContain('is-current')
    })

    it('should mark past entries', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      const entries = wrapper.findAll('.timeline-entry')
      
      expect(entries[0].classes()).toContain('is-past')
      expect(entries[1].classes()).toContain('is-past')
    })

    it('should mark future entries', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, currentIndex: 0 }
      })
      const entries = wrapper.findAll('.timeline-entry')
      
      expect(entries[1].classes()).toContain('is-future')
      expect(entries[2].classes()).toContain('is-future')
    })

    it('should render entry labels', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      const labels = wrapper.findAll('.entry-label')
      
      expect(labels[0].text()).toBe('Initial')
      expect(labels[1].text()).toBe('Added text')
      expect(labels[2].text()).toBe('Modified')
    })

    it('should render default label when none provided', () => {
      const entry = createMockEntry('1', 'Content', undefined)
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, history: [entry], currentIndex: 0 }
      })
      
      expect(wrapper.find('.entry-label').text()).toBe('Version 1')
    })

    it('should emit goToEntry when entry clicked', async () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      await wrapper.findAll('.timeline-entry')[1].trigger('click')
      
      expect(wrapper.emitted('goToEntry')).toBeTruthy()
      expect(wrapper.emitted('goToEntry')?.[0]).toEqual([1])
    })
  })

  describe('Progress Bar', () => {
    it('should render progress bar when showProgress is true', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showProgress: true }
      })
      
      expect(wrapper.find('.timeline-progress-container').exists()).toBe(true)
    })

    it('should hide progress bar when showProgress is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showProgress: false }
      })
      
      expect(wrapper.find('.timeline-progress-container').exists()).toBe(false)
    })

    it('should display correct progress', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, timelineProgress: 50 }
      })
      
      const fill = wrapper.find('.timeline-progress-fill')
      expect(fill.attributes('style')).toContain('width: 50%')
    })

    it('should display progress text', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, currentIndex: 1, historySize: 3 }
      })
      
      expect(wrapper.find('.timeline-progress-text').text()).toBe('2 / 3')
    })
  })

  describe('Navigation', () => {
    it('should render navigation buttons when showNavigation is true', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showNavigation: true }
      })
      
      expect(wrapper.find('.timeline-navigation').exists()).toBe(true)
      expect(wrapper.findAll('.nav-btn')).toHaveLength(4)
    })

    it('should hide navigation when showNavigation is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showNavigation: false }
      })
      
      expect(wrapper.find('.timeline-navigation').exists()).toBe(false)
    })

    it('should disable back buttons when canGoBack is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, canGoBack: false }
      })
      
      const buttons = wrapper.findAll('.nav-btn')
      expect(buttons[0].attributes('disabled')).toBeDefined() // First
      expect(buttons[1].attributes('disabled')).toBeDefined() // Back
    })

    it('should disable forward buttons when canGoForward is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, canGoForward: false }
      })
      
      const buttons = wrapper.findAll('.nav-btn')
      expect(buttons[2].attributes('disabled')).toBeDefined() // Forward
      expect(buttons[3].attributes('disabled')).toBeDefined() // Latest
    })

    it('should emit goBack event', async () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      await wrapper.findAll('.nav-btn')[1].trigger('click')
      
      expect(wrapper.emitted('goBack')).toBeTruthy()
    })

    it('should emit goForward event', async () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, canGoForward: true }
      })
      await wrapper.findAll('.nav-btn')[2].trigger('click')
      
      expect(wrapper.emitted('goForward')).toBeTruthy()
    })

    it('should emit goToFirst event', async () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      await wrapper.findAll('.nav-btn')[0].trigger('click')
      
      expect(wrapper.emitted('goToFirst')).toBeTruthy()
    })

    it('should emit goToLatest event', async () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, canGoForward: true }
      })
      await wrapper.findAll('.nav-btn')[3].trigger('click')
      
      expect(wrapper.emitted('goToLatest')).toBeTruthy()
    })
  })

  describe('Action Buttons', () => {
    it('should render clear button when showClearButton is true', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showClearButton: true }
      })
      
      expect(wrapper.find('.btn-clear').exists()).toBe(true)
    })

    it('should hide clear button when showClearButton is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showClearButton: false }
      })
      
      expect(wrapper.find('.btn-clear').exists()).toBe(false)
    })

    it('should render export button when showExportButton is true', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showExportButton: true }
      })
      
      expect(wrapper.find('.btn-export').exists()).toBe(true)
    })

    it('should hide export button when showExportButton is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showExportButton: false }
      })
      
      expect(wrapper.find('.btn-export').exists()).toBe(false)
    })

    it('should emit clear event', async () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      await wrapper.find('.btn-clear').trigger('click')
      
      expect(wrapper.emitted('clear')).toBeTruthy()
    })

    it('should emit export event', async () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      await wrapper.find('.btn-export').trigger('click')
      
      expect(wrapper.emitted('export')).toBeTruthy()
    })

    it('should render custom button labels', () => {
      const wrapper = mount(HistoryTimeline, {
        props: {
          ...defaultProps,
          clearButtonLabel: 'Reset',
          exportButtonLabel: 'Download'
        }
      })
      
      expect(wrapper.find('.btn-clear').text()).toBe('Reset')
      expect(wrapper.find('.btn-export').text()).toBe('Download')
    })
  })

  describe('Content Preview', () => {
    it('should show preview for current entry when showPreview is true', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showPreview: true }
      })
      
      expect(wrapper.find('.entry-preview').exists()).toBe(true)
      expect(wrapper.find('.entry-preview').text()).toBe('Content 3')
    })

    it('should hide preview when showPreview is false', () => {
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, showPreview: false }
      })
      
      expect(wrapper.find('.entry-preview').exists()).toBe(false)
    })

    it('should truncate long content', () => {
      const longContent = 'A'.repeat(200)
      const entry = createMockEntry('1', longContent)
      const wrapper = mount(HistoryTimeline, {
        props: {
          ...defaultProps,
          history: [entry],
          currentIndex: 0,
          maxPreviewLength: 50
        }
      })
      
      const preview = wrapper.find('.entry-preview').text()
      expect(preview.length).toBeLessThan(longContent.length)
      expect(preview).toContain('...')
    })
  })

  describe('Time Formatting', () => {
    it('should format recent time as "Just now"', () => {
      const entry = createMockEntry('1', 'Content', undefined, Date.now() - 10000) // 10s ago
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, history: [entry], currentIndex: 0 }
      })
      
      expect(wrapper.find('.entry-time').text()).toBe('Just now')
    })

    it('should format time in minutes', () => {
      const entry = createMockEntry('1', 'Content', undefined, Date.now() - 300000) // 5min ago
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, history: [entry], currentIndex: 0 }
      })
      
      expect(wrapper.find('.entry-time').text()).toMatch(/\dm ago/)
    })

    it('should format time in hours', () => {
      const entry = createMockEntry('1', 'Content', undefined, Date.now() - 7200000) // 2h ago
      const wrapper = mount(HistoryTimeline, {
        props: { ...defaultProps, history: [entry], currentIndex: 0 }
      })
      
      expect(wrapper.find('.entry-time').text()).toMatch(/\dh ago/)
    })
  })

  describe('Exposed Methods', () => {
    it('should expose scrollToEntry method', () => {
      const wrapper = mount(HistoryTimeline, { props: defaultProps })
      
      expect(wrapper.vm.scrollToEntry).toBeDefined()
      expect(typeof wrapper.vm.scrollToEntry).toBe('function')
    })
  })
})
