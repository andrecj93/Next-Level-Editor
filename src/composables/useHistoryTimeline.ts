import { ref, computed, type Ref } from 'vue'

/**
 * Interface for a history entry in the timeline
 */
export interface HistoryEntry {
  id: string
  content: string
  timestamp: number
  label?: string
  metadata?: Record<string, unknown>
}

/**
 * Interface for timeline configuration options
 */
export interface TimelineOptions {
  maxEntries?: number
  enableAutoLabel?: boolean
  onTimeTravel?: (entry: HistoryEntry) => void
}

/**
 * Composable for managing visual history timeline with time-travel capabilities
 * 
 * Features:
 * - Maintain chronological history of changes
 * - Time-travel to any point in history
 * - Visual timeline with timestamps
 * - Automatic or manual labeling
 * - Undo/redo with timeline navigation
 * - Content comparison between versions
 * 
 * @param options - Configuration options for the timeline
 * @returns Timeline state and methods
 */
export function useHistoryTimeline(options: TimelineOptions = {}) {
  const {
    maxEntries = 50,
    enableAutoLabel = true,
    onTimeTravel
  } = options

  // Timeline state
  const history = ref<HistoryEntry[]>([])
  const currentIndex = ref(-1)
  const isNavigating = ref(false)

  /**
   * Generate a unique ID for history entries
   */
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate automatic label based on content changes
   */
  const generateAutoLabel = (content: string, previousContent?: string): string => {
    if (!previousContent) {
      return 'Initial content'
    }

    const contentLength = content.length
    const previousLength = previousContent?.length || 0
    const diff = contentLength - previousLength

    if (diff > 50) {
      return 'Major addition'
    } else if (diff > 0) {
      return 'Content added'
    } else if (diff < -50) {
      return 'Major deletion'
    } else if (diff < 0) {
      return 'Content removed'
    } else {
      return 'Content modified'
    }
  }

  /**
   * Add a new entry to the history timeline
   */
  const addEntry = (
    content: string,
    label?: string,
    metadata?: Record<string, unknown>
  ): void => {
    // If we're not at the end of history, remove future entries
    if (currentIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, currentIndex.value + 1)
    }

    // Generate label if auto-labeling is enabled and no label provided
    const previousEntry = history.value[history.value.length - 1]
    const entryLabel = label || (enableAutoLabel 
      ? generateAutoLabel(content, previousEntry?.content)
      : undefined)

    // Create new entry
    const entry: HistoryEntry = {
      id: generateId(),
      content,
      timestamp: Date.now(),
      label: entryLabel,
      metadata
    }

    // Add to history
    history.value.push(entry)

    // Limit history size
    if (history.value.length > maxEntries) {
      history.value.shift()
    } else {
      currentIndex.value++
    }
  }

  /**
   * Navigate to a specific point in history
   */
  const goToEntry = (index: number): HistoryEntry | null => {
    if (index < 0 || index >= history.value.length) {
      return null
    }

    isNavigating.value = true
    currentIndex.value = index
    const entry = history.value[index]

    if (onTimeTravel) {
      onTimeTravel(entry)
    }

    isNavigating.value = false
    return entry
  }

  /**
   * Navigate to a specific entry by ID
   */
  const goToEntryById = (id: string): HistoryEntry | null => {
    const index = history.value.findIndex(entry => entry.id === id)
    if (index === -1) {
      return null
    }
    return goToEntry(index)
  }

  /**
   * Go back in history (undo)
   */
  const goBack = (): HistoryEntry | null => {
    if (!canGoBack.value) {
      return null
    }
    return goToEntry(currentIndex.value - 1)
  }

  /**
   * Go forward in history (redo)
   */
  const goForward = (): HistoryEntry | null => {
    if (!canGoForward.value) {
      return null
    }
    return goToEntry(currentIndex.value + 1)
  }

  /**
   * Jump to the most recent entry
   */
  const goToLatest = (): HistoryEntry | null => {
    if (history.value.length === 0) {
      return null
    }
    return goToEntry(history.value.length - 1)
  }

  /**
   * Jump to the first entry
   */
  const goToFirst = (): HistoryEntry | null => {
    if (history.value.length === 0) {
      return null
    }
    return goToEntry(0)
  }

  /**
   * Compare two history entries
   */
  const compareEntries = (
    index1: number,
    index2: number
  ): { added: number; removed: number; unchanged: number } | null => {
    if (
      index1 < 0 || index1 >= history.value.length ||
      index2 < 0 || index2 >= history.value.length
    ) {
      return null
    }

    const content1 = history.value[index1].content
    const content2 = history.value[index2].content

    const added = Math.max(0, content2.length - content1.length)
    const removed = Math.max(0, content1.length - content2.length)
    const unchanged = Math.min(content1.length, content2.length)

    return { added, removed, unchanged }
  }

  /**
   * Clear all history
   */
  const clearHistory = (): void => {
    history.value = []
    currentIndex.value = -1
  }

  /**
   * Update label for an entry
   */
  const updateEntryLabel = (index: number, label: string): boolean => {
    if (index < 0 || index >= history.value.length) {
      return false
    }
    history.value[index].label = label
    return true
  }

  /**
   * Get entries within a time range
   */
  const getEntriesInTimeRange = (
    startTime: number,
    endTime: number
  ): HistoryEntry[] => {
    return history.value.filter(
      entry => entry.timestamp >= startTime && entry.timestamp <= endTime
    )
  }

  /**
   * Export history as JSON
   */
  const exportHistory = (): string => {
    return JSON.stringify({
      history: history.value,
      currentIndex: currentIndex.value,
      exportedAt: Date.now()
    }, null, 2)
  }

  /**
   * Import history from JSON
   */
  const importHistory = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString)
      if (!data.history || !Array.isArray(data.history)) {
        return false
      }
      history.value = data.history
      currentIndex.value = data.currentIndex ?? data.history.length - 1
      return true
    } catch {
      return false
    }
  }

  // Computed properties
  const currentEntry = computed<HistoryEntry | null>(() => {
    return history.value[currentIndex.value] || null
  })

  const canGoBack = computed<boolean>(() => {
    return currentIndex.value > 0
  })

  const canGoForward = computed<boolean>(() => {
    return currentIndex.value < history.value.length - 1
  })

  const hasHistory = computed<boolean>(() => {
    return history.value.length > 0
  })

  const historySize = computed<number>(() => {
    return history.value.length
  })

  const timelineProgress = computed<number>(() => {
    if (history.value.length === 0) {
      return 0
    }
    return (currentIndex.value / (history.value.length - 1)) * 100
  })

  return {
    // State
    history: history as Ref<readonly HistoryEntry[]>,
    currentIndex: computed(() => currentIndex.value),
    currentEntry,
    isNavigating: computed(() => isNavigating.value),

    // Computed
    canGoBack,
    canGoForward,
    hasHistory,
    historySize,
    timelineProgress,

    // Methods
    addEntry,
    goToEntry,
    goToEntryById,
    goBack,
    goForward,
    goToLatest,
    goToFirst,
    compareEntries,
    clearHistory,
    updateEntryLabel,
    getEntriesInTimeRange,
    exportHistory,
    importHistory
  }
}
