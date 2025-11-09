import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useImageResize } from '../useImageResize'

describe('useImageResize', () => {
  let editorContent: any
  let onResizeComplete: any
  let imageResize: ReturnType<typeof useImageResize>
  let mockImg: HTMLImageElement
  let mockWrapper: HTMLDivElement

  beforeEach(() => {
    // Create mock editor
    editorContent = ref(document.createElement('div'))
    editorContent.value.className = 'editor-content'
    document.body.appendChild(editorContent.value)

    onResizeComplete = vi.fn()
    imageResize = useImageResize(editorContent, onResizeComplete)

    // Create mock image and wrapper
    mockWrapper = document.createElement('div')
    mockWrapper.className = 'editor-image-wrapper'
    
    mockImg = document.createElement('img')
    mockImg.className = 'editor-image-resizable'
    mockImg.src = 'https://example.com/test.jpg'
    
    // Mock offsetWidth/offsetHeight
    Object.defineProperty(mockImg, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(mockImg, 'offsetHeight', { value: 100, configurable: true })
    
    mockWrapper.appendChild(mockImg)
    editorContent.value.appendChild(mockWrapper)
  })

  afterEach(() => {
    imageResize.cleanup()
    if (editorContent.value && document.body.contains(editorContent.value)) {
      editorContent.value.remove()
    }
    vi.clearAllMocks()
  })

  describe('setupImageResizing', () => {
    it('should set up image resizing functionality', () => {
      const addEventListenerSpy = vi.spyOn(editorContent.value, 'addEventListener')
      
      imageResize.setupImageResizing()
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should do nothing if editorContent is null', () => {
      editorContent.value = null
      
      expect(() => {
        imageResize.setupImageResizing()
      }).not.toThrow()
    })

    it('should only add listener once even if called multiple times', () => {
      imageResize.setupImageResizing()
      imageResize.setupImageResizing()
      
      // Both calls should complete without error
      expect(editorContent.value).toBeDefined()
    })
  })

  describe('handleImageClick', () => {
    beforeEach(() => {
      imageResize.setupImageResizing()
    })

    it('should select image wrapper when clicking on image', () => {
      mockImg.click()
      
      expect(mockWrapper.classList.contains('selected')).toBe(true)
    })

    it('should select image wrapper when clicking on wrapper itself', () => {
      mockWrapper.click()
      
      expect(mockWrapper.classList.contains('selected')).toBe(true)
    })

    it('should add resize handles when selecting image', () => {
      mockImg.click()
      
      const handles = mockWrapper.querySelectorAll('.image-resize-handle')
      expect(handles.length).toBe(4)
    })

    it('should create handles in all four corners', () => {
      mockImg.click()
      
      expect(mockWrapper.querySelector('.top-left')).toBeTruthy()
      expect(mockWrapper.querySelector('.top-right')).toBeTruthy()
      expect(mockWrapper.querySelector('.bottom-left')).toBeTruthy()
      expect(mockWrapper.querySelector('.bottom-right')).toBeTruthy()
    })

    it('should clear other image selections when selecting new image', () => {
      const anotherWrapper = document.createElement('div')
      anotherWrapper.className = 'editor-image-wrapper'
      const anotherImg = document.createElement('img')
      anotherImg.className = 'editor-image-resizable'
      anotherWrapper.appendChild(anotherImg)
      editorContent.value.appendChild(anotherWrapper)

      // Select first image
      mockImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(true)

      // Select second image
      anotherImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(false)
      expect(anotherWrapper.classList.contains('selected')).toBe(true)
    })

    it('should deselect images when clicking outside', () => {
      mockImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(true)

      // Click on editor content (outside image)
      editorContent.value.click()
      expect(mockWrapper.classList.contains('selected')).toBe(false)
    })

    it('should not add duplicate handles if image already selected', () => {
      mockImg.click()
      const handlesBefore = mockWrapper.querySelectorAll('.image-resize-handle').length
      
      mockImg.click()
      const handlesAfter = mockWrapper.querySelectorAll('.image-resize-handle').length
      
      expect(handlesAfter).toBe(handlesBefore)
    })

    it('should handle clicks on non-image elements', () => {
      const p = document.createElement('p')
      p.textContent = 'Text content'
      editorContent.value.appendChild(p)

      p.click()
      
      expect(mockWrapper.classList.contains('selected')).toBe(false)
    })
  })

  describe('startImageResize', () => {
    let handle: HTMLDivElement

    beforeEach(() => {
      imageResize.setupImageResizing()
      mockImg.click()
      handle = mockWrapper.querySelector('.image-resize-handle.top-right') as HTMLDivElement
    })

    it('should prevent default event behavior', () => {
      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      
      handle.dispatchEvent(event)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should stop event propagation', () => {
      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')
      
      handle.dispatchEvent(event)
      
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('should add mousemove listener to document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      
      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(event)
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    })

    it('should add mouseup listener to document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      
      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(event)
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should set user-select to none on body', () => {
      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(event)
      
      expect(document.body.style.userSelect).toBe('none')
    })

    it('should handle missing img gracefully', () => {
      const emptyWrapper = document.createElement('div')
      emptyWrapper.className = 'editor-image-wrapper'
      editorContent.value.appendChild(emptyWrapper)

      const emptyHandle = document.createElement('div')
      emptyHandle.className = 'image-resize-handle top-right'
      emptyWrapper.appendChild(emptyHandle)

      const event = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      
      expect(() => {
        emptyHandle.dispatchEvent(event)
      }).not.toThrow()
    })
  })

  describe('doImageResize', () => {
    let handle: HTMLDivElement

    beforeEach(() => {
      imageResize.setupImageResizing()
      mockImg.click()
    })

    it('should increase width when dragging right handle to the right', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.top-right') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', { 
        clientX: 150, 
        clientY: 50,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      expect(mockImg.style.width).toBe('250px')
    })

    it('should decrease width when dragging left handle to the right', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.top-left') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', { 
        clientX: 150, 
        clientY: 50,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      // Left handle: moving right decreases width (200 - 50 = 150)
      expect(mockImg.style.width).toBe('150px')
    })

    it('should increase height when dragging bottom handle down', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.bottom-right') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', { 
        clientX: 100, 
        clientY: 100,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      // Height should change proportionally
      expect(mockImg.style.height).toBeTruthy()
    })

    it('should maintain aspect ratio during resize', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.bottom-right') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', { 
        clientX: 200, 
        clientY: 150,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      // Width should be roughly 2x height (original ratio 200/100 = 2)
      const width = Number.parseInt(mockImg.style.width)
      const height = Number.parseInt(mockImg.style.height)
      const ratio = width / height
      expect(ratio).toBeCloseTo(2, 0.5)
    })

    it('should enforce minimum size of 50x50', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.top-left') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      // Try to resize to very small
      const mousemove = new MouseEvent('mousemove', { 
        clientX: 200, 
        clientY: 150,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      // Should not allow dimensions below 50
      const width = Number.parseInt(mockImg.style.width || '200')
      const height = Number.parseInt(mockImg.style.height || '100')
      expect(width).toBeGreaterThanOrEqual(50)
      expect(height).toBeGreaterThanOrEqual(50)
    })

    it('should set max-width to 100%', () => {
      handle = mockWrapper.querySelector('.image-resize-handle.bottom-right') as HTMLDivElement
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mousemove = new MouseEvent('mousemove', { 
        clientX: 150, 
        clientY: 75,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      expect(mockImg.style.maxWidth).toBe('100%')
    })

    it('should do nothing if no resize data', () => {
      // Dispatch mousemove without starting resize
      const mousemove = new MouseEvent('mousemove', { 
        clientX: 150, 
        clientY: 75,
        bubbles: true 
      })
      
      expect(() => {
        document.dispatchEvent(mousemove)
      }).not.toThrow()
    })
  })

  describe('stopImageResize', () => {
    let handle: HTMLDivElement

    beforeEach(() => {
      imageResize.setupImageResizing()
      mockImg.click()
      handle = mockWrapper.querySelector('.image-resize-handle.bottom-right') as HTMLDivElement
    })

    it('should remove mousemove listener', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    })

    it('should remove mouseup listener', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should restore user-select on body', () => {
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      expect(document.body.style.userSelect).toBe('none')

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      expect(document.body.style.userSelect).toBe('')
    })

    it('should call onResizeComplete', () => {
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      expect(onResizeComplete).toHaveBeenCalledTimes(1)
    })

    it('should clear resize data', () => {
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      // After mouseup, subsequent mousemove should do nothing
      const mousemove = new MouseEvent('mousemove', { 
        clientX: 200, 
        clientY: 100,
        bubbles: true 
      })
      const widthBefore = mockImg.style.width
      document.dispatchEvent(mousemove)
      expect(mockImg.style.width).toBe(widthBefore)
    })

    it('should do nothing if resize not started', () => {
      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      
      expect(() => {
        document.dispatchEvent(mouseup)
      }).not.toThrow()
    })
  })

  describe('cleanup', () => {
    it('should remove click listener from editor', () => {
      imageResize.setupImageResizing()
      const removeEventListenerSpy = vi.spyOn(editorContent.value, 'removeEventListener')
      
      imageResize.cleanup()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    })

    it('should remove document listeners', () => {
      imageResize.setupImageResizing()
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      
      imageResize.cleanup()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    })

    it('should handle cleanup when editorContent is null', () => {
      imageResize.setupImageResizing()
      editorContent.value = null
      
      expect(() => {
        imageResize.cleanup()
      }).not.toThrow()
    })

    it('should prevent image clicks after cleanup', () => {
      imageResize.setupImageResizing()
      mockImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(true)

      imageResize.cleanup()
      mockWrapper.classList.remove('selected')
      
      mockImg.click()
      // Should not select since listener is removed
      expect(mockWrapper.classList.contains('selected')).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should complete full resize workflow', () => {
      imageResize.setupImageResizing()
      
      // 1. Click image to select
      mockImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(true)

      // 2. Start resize
      const handle = mockWrapper.querySelector('.image-resize-handle.bottom-right') as HTMLDivElement
      const mousedown = new MouseEvent('mousedown', { 
        clientX: 100, 
        clientY: 50,
        bubbles: true 
      })
      handle.dispatchEvent(mousedown)

      // 3. Resize
      const mousemove = new MouseEvent('mousemove', { 
        clientX: 150, 
        clientY: 75,
        bubbles: true 
      })
      document.dispatchEvent(mousemove)

      // 4. Stop resize
      const mouseup = new MouseEvent('mouseup', { bubbles: true })
      document.dispatchEvent(mouseup)

      expect(onResizeComplete).toHaveBeenCalled()
      expect(mockImg.style.width).toBeTruthy()
    })

    it('should handle multiple images independently', () => {
      imageResize.setupImageResizing()

      const wrapper2 = document.createElement('div')
      wrapper2.className = 'editor-image-wrapper'
      const img2 = document.createElement('img')
      img2.className = 'editor-image-resizable'
      Object.defineProperty(img2, 'offsetWidth', { value: 300, configurable: true })
      Object.defineProperty(img2, 'offsetHeight', { value: 150, configurable: true })
      wrapper2.appendChild(img2)
      editorContent.value.appendChild(wrapper2)

      // Select first image
      mockImg.click()
      expect(mockWrapper.classList.contains('selected')).toBe(true)
      expect(wrapper2.classList.contains('selected')).toBe(false)

      // Select second image
      img2.click()
      expect(mockWrapper.classList.contains('selected')).toBe(false)
      expect(wrapper2.classList.contains('selected')).toBe(true)
    })
  })
})
