import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ImageUploadModal from '../ImageUploadModal.vue'

describe('ImageUploadModal', () => {
  it('should not render when isOpen is false', () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: false,
      },
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('should render when isOpen is true', () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-header').text()).toContain('Insert Image')
  })

  it('should show hint when no image is provided', () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    expect(wrapper.find('.footer-hint').exists()).toBe(true)
    expect(wrapper.find('.footer-hint').text()).toContain('Enter a URL or upload a file')
  })

  it('should disable Insert button when no preview URL', () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    const insertButton = wrapper.find('.insert-button')
    expect(insertButton.exists()).toBe(true)
    expect(insertButton.attributes('disabled')).toBeDefined()
  })

  it('should enable Insert button when image URL is provided', async () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    const input = wrapper.find('#image-url')
    await input.setValue('https://example.com/image.jpg')

    const insertButton = wrapper.find('.insert-button')
    expect(insertButton.attributes('disabled')).toBeUndefined()
  })

  it('should emit insert event with correct data', async () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    const urlInput = wrapper.find('#image-url')
    await urlInput.setValue('https://example.com/image.jpg')

    const altInput = wrapper.find('#alt-text')
    await altInput.setValue('Test image')

    const insertButton = wrapper.find('.insert-button')
    await insertButton.trigger('click')

    expect(wrapper.emitted('insert')).toBeTruthy()
    expect(wrapper.emitted('insert')?.[0]).toEqual(['https://example.com/image.jpg', 'Test image'])
  })

  it('should emit close event when Cancel is clicked', async () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    const cancelButton = wrapper.find('.cancel-button')
    await cancelButton.trigger('click')

    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('should show preview when valid image URL is entered', async () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    expect(wrapper.find('.preview-section').exists()).toBe(false)

    const input = wrapper.find('#image-url')
    await input.setValue('https://example.com/image.jpg')

    expect(wrapper.find('.preview-section').exists()).toBe(true)
  })

  it('should have Insert Image button with checkmark icon', () => {
    const wrapper = mount(ImageUploadModal, {
      props: {
        isOpen: true,
      },
    })

    const insertButton = wrapper.find('.insert-button')
    expect(insertButton.text()).toContain('✓ Insert Image')
  })
})
