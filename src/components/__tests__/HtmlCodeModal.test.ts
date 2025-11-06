import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HtmlCodeModal from '../HtmlCodeModal.vue'

describe('HtmlCodeModal', () => {
  beforeEach(() => {
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    })
  })

  it('should not render modal content when show is false', () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: false,
        htmlContent: '<p>Test content</p>',
      },
    })

    // Modal should not be in the component tree when show is false
    expect(wrapper.html()).not.toContain('modal-overlay')
  })

  it('should render modal content when show is true', () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Test content</p>',
      },
    })

    // Component should render and contain modal content
    expect(wrapper.vm).toBeTruthy()
  })

  it('should display HTML content prop', () => {
    const htmlContent = '<div>\n  <p>Test paragraph</p>\n</div>'
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent,
      },
    })

    expect(wrapper.vm).toBeTruthy()
    expect(wrapper.props('htmlContent')).toBe(htmlContent)
  })

  it('should emit close event when close is called', async () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Test content</p>',
      },
    })

    // Call the close method directly
    ;(wrapper.vm as any).close()
    await wrapper.vm.$nextTick()
    
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')?.length).toBe(1)
  })

  it('should compute highlighted HTML', () => {
    const htmlContent = '<div class="test"><p>Hello</p></div>'
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent,
      },
    })

    const vm = wrapper.vm as any
    expect(vm.highlightedHtml).toBeTruthy()
    expect(typeof vm.highlightedHtml).toBe('string')
  })

  it('should handle empty HTML content', () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.highlightedHtml).toBe('')
  })

  it('should call clipboard writeText when copyToClipboard is invoked', async () => {
    const htmlContent = '<p>Test content</p>'
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent,
      },
    })

    const vm = wrapper.vm as any
    await vm.copyToClipboard()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(htmlContent)
  })

  it('should update copy button text after successful copy', async () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Test</p>',
      },
    })

    const vm = wrapper.vm as any
    expect(vm.copyButtonText).toContain('Copy')

    await vm.copyToClipboard()
    await wrapper.vm.$nextTick()

    expect(vm.copyButtonText).toContain('Copied')
  })

  it('should handle clipboard copy errors', async () => {
    // Mock clipboard to reject
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Clipboard error')),
      },
      writable: true,
      configurable: true,
    })

    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Test</p>',
      },
    })

    const vm = wrapper.vm as any
    await vm.copyToClipboard()
    await wrapper.vm.$nextTick()

    expect(vm.copyButtonText).toContain('Failed')
  })

  it('should reset copy button text when modal is closed', async () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Test</p>',
      },
    })

    const vm = wrapper.vm as any
    vm.copyButtonText = '✓ Copied!'

    await wrapper.setProps({ show: false })
    await wrapper.vm.$nextTick()

    expect(vm.copyButtonText).toContain('Copy')
  })

  it('should handle htmlContent prop changes', async () => {
    const wrapper = mount(HtmlCodeModal, {
      props: {
        show: true,
        htmlContent: '<p>Initial</p>',
      },
    })

    expect(wrapper.props('htmlContent')).toBe('<p>Initial</p>')

    await wrapper.setProps({ htmlContent: '<p>Updated</p>' })
    expect(wrapper.props('htmlContent')).toBe('<p>Updated</p>')
  })
})

