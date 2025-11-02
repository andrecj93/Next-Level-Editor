import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Composable for mobile gesture support
 * Provides swipe gestures for undo/redo on mobile devices
 */
export function useMobileGestures(
  editorRef: { value: HTMLElement | null },
  onUndo: () => void,
  onRedo: () => void
) {
  const isSwiping = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const minSwipeDistance = 50 // minimum distance for swipe
  const maxVerticalDistance = 30 // max vertical movement for horizontal swipe

  const handleTouchStart = (e: TouchEvent) => {
    if (!editorRef.value || e.touches.length !== 2) return
    
    startX.value = e.touches[0].clientX
    startY.value = e.touches[0].clientY
    isSwiping.value = true
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping.value || !editorRef.value || e.touches.length !== 2) return
    
    // Prevent default behavior during gesture
    e.preventDefault()
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isSwiping.value || !editorRef.value) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - startX.value
    const deltaY = Math.abs(touch.clientY - startY.value)

    // Check if it's a horizontal swipe (minimal vertical movement)
    if (deltaY < maxVerticalDistance && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        // Swipe right - Undo
        onUndo()
      } else {
        // Swipe left - Redo
        onRedo()
      }
    }

    isSwiping.value = false
  }

  onMounted(() => {
    if (editorRef.value) {
      const element = editorRef.value
      element.addEventListener('touchstart', handleTouchStart, { passive: false })
      element.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.addEventListener('touchend', handleTouchEnd)
    }
  })

  onUnmounted(() => {
    if (editorRef.value) {
      const element = editorRef.value
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  })

  return {
    isSwiping
  }
}
