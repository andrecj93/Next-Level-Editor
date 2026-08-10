import { ref, nextTick, onScopeDispose } from 'vue'

/**
 * Composable for screen reader announcements
 * Provides accessibility announcements for formatting changes
 */
export function useScreenReader() {
  const announcement = ref('')
  const ariaLive = ref<'polite' | 'assertive'>('polite')

  // A single pending "clear" timer. A rapid second announcement used to leave the
  // first call's timer running, which then wiped the newer message ~50ms after it
  // appeared — before assistive tech could read it. We now cancel any pending clear
  // before scheduling the next one, so only the latest message's timer survives.
  let clearTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param priority - Priority level: 'polite' (default) or 'assertive' (urgent)
   */
  const announce = async (
    message: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    ariaLive.value = priority
    // Blank the live region first, then set on the next tick, so re-announcing the
    // SAME string still changes the text node (identical values wouldn't re-fire).
    announcement.value = ''
    await nextTick()

    if (clearTimer) clearTimeout(clearTimer)
    announcement.value = message
    // Hold long enough for assistive tech to read it, then clear so the next
    // identical message can re-announce.
    clearTimer = setTimeout(() => {
      announcement.value = ''
      clearTimer = null
    }, 1000)
  }

  onScopeDispose(() => {
    if (clearTimer) clearTimeout(clearTimer)
  })

  /**
   * Announce text formatting changes
   */
  const announceFormat = (format: string, isActive: boolean) => {
    const action = isActive ? 'applied' : 'removed'
    announce(`${format} ${action}`, 'polite')
  }

  /**
   * Announce heading changes
   */
  const announceHeading = (level: number) => {
    announce(`Heading level ${level} applied`, 'polite')
  }

  /**
   * Announce list changes
   */
  const announceList = (type: 'bullet' | 'numbered') => {
    const listType = type === 'bullet' ? 'bullet list' : 'numbered list'
    announce(`${listType} applied`, 'polite')
  }

  /**
   * Announce alignment changes
   */
  const announceAlignment = (alignment: string) => {
    announce(`Text aligned ${alignment}`, 'polite')
  }

  /**
   * Announce color changes
   */
  const announceColor = (type: 'text' | 'background', color: string) => {
    const colorType = type === 'text' ? 'Text color' : 'Background color'
    announce(`${colorType} changed to ${color}`, 'polite')
  }

  /**
   * Announce font size changes
   */
  const announceFontSize = (size: string) => {
    announce(`Font size changed to ${size}`, 'polite')
  }

  /**
   * Announce insertion
   */
  const announceInsert = (element: string) => {
    announce(`${element} inserted`, 'polite')
  }

  /**
   * Announce removal/deletion
   */
  const announceRemove = (element: string) => {
    announce(`${element} removed`, 'polite')
  }

  /**
   * Announce undo/redo
   */
  const announceHistory = (action: 'undo' | 'redo') => {
    announce(`${action} performed`, 'polite')
  }

  /**
   * Announce save status
   */
  const announceSave = (status: 'saving' | 'saved' | 'failed') => {
    const messages = {
      saving: 'Saving content',
      saved: 'Content saved',
      failed: 'Save failed'
    }
    announce(messages[status], status === 'failed' ? 'assertive' : 'polite')
  }

  return {
    announcement,
    ariaLive,
    announce,
    announceFormat,
    announceHeading,
    announceList,
    announceAlignment,
    announceColor,
    announceFontSize,
    announceInsert,
    announceRemove,
    announceHistory,
    announceSave
  }
}
