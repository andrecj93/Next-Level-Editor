import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useHistoryTimeline } from '../useHistoryTimeline'

describe('useHistoryTimeline', () => {
  describe('Initialization', () => {
    it('should initialize with empty history', () => {
      const timeline = useHistoryTimeline()
      expect(timeline.history.value).toHaveLength(0)
      expect(timeline.currentIndex.value).toBe(-1)
      expect(timeline.hasHistory.value).toBe(false)
    })

    it('should initialize with default options', () => {
      const timeline = useHistoryTimeline()
      expect(timeline.canGoBack.value).toBe(false)
      expect(timeline.canGoForward.value).toBe(false)
      expect(timeline.historySize.value).toBe(0)
    })

    it('should accept custom options', () => {
      const onTimeTravel = vi.fn()
      const timeline = useHistoryTimeline({
        maxEntries: 20,
        enableAutoLabel: false,
        onTimeTravel
      })
      expect(timeline.history.value).toHaveLength(0)
    })
  })

  describe('Adding Entries', () => {
    it('should add entry to history', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Hello World')
      
      expect(timeline.history.value).toHaveLength(1)
      expect(timeline.currentIndex.value).toBe(0)
      expect(timeline.history.value[0].content).toBe('Hello World')
    })

    it('should add entry with custom label', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Content', 'My Custom Label')
      
      expect(timeline.history.value[0].label).toBe('My Custom Label')
    })

    it('should add entry with metadata', () => {
      const timeline = useHistoryTimeline()
      const metadata = { author: 'User', action: 'create' }
      timeline.addEntry('Content', undefined, metadata)
      
      expect(timeline.history.value[0].metadata).toEqual(metadata)
    })

    it('should generate auto label for initial content', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('First content')
      
      expect(timeline.history.value[0].label).toBe('Initial content')
    })

    it('should generate auto label for major addition', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('Short')
      timeline.addEntry('A'.repeat(100))
      
      expect(timeline.history.value[1].label).toBe('Major addition')
    })

    it('should generate auto label for content added', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('Hello')
      timeline.addEntry('Hello World')
      
      expect(timeline.history.value[1].label).toBe('Content added')
    })

    it('should generate auto label for major deletion', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('A'.repeat(100))
      timeline.addEntry('Short')
      
      expect(timeline.history.value[1].label).toBe('Major deletion')
    })

    it('should generate auto label for content removed', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('Hello World')
      timeline.addEntry('Hello')
      
      expect(timeline.history.value[1].label).toBe('Content removed')
    })

    it('should generate auto label for content modified', () => {
      const timeline = useHistoryTimeline({ enableAutoLabel: true })
      timeline.addEntry('Hello')
      timeline.addEntry('World')
      
      expect(timeline.history.value[1].label).toBe('Content modified')
    })

    it('should limit history size to maxEntries', () => {
      const timeline = useHistoryTimeline({ maxEntries: 3 })
      
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      timeline.addEntry('Entry 3')
      timeline.addEntry('Entry 4')
      
      expect(timeline.history.value).toHaveLength(3)
      expect(timeline.history.value[0].content).toBe('Entry 2')
      expect(timeline.currentIndex.value).toBe(2)
    })

    it('should remove future entries when adding from middle', () => {
      const timeline = useHistoryTimeline()
      
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      timeline.addEntry('Entry 3')
      
      timeline.goToEntry(1) // Go to Entry 2
      timeline.addEntry('Entry 4')
      
      expect(timeline.history.value).toHaveLength(3)
      expect(timeline.history.value[2].content).toBe('Entry 4')
    })

    it('should add unique IDs to entries', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      
      expect(timeline.history.value[0].id).toBeTruthy()
      expect(timeline.history.value[1].id).toBeTruthy()
      expect(timeline.history.value[0].id).not.toBe(timeline.history.value[1].id)
    })

    it('should add timestamp to entries', () => {
      const timeline = useHistoryTimeline()
      const before = Date.now()
      timeline.addEntry('Entry')
      const after = Date.now()
      
      expect(timeline.history.value[0].timestamp).toBeGreaterThanOrEqual(before)
      expect(timeline.history.value[0].timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('Navigation', () => {
    let timeline: ReturnType<typeof useHistoryTimeline>

    beforeEach(() => {
      timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      timeline.addEntry('Entry 3')
    })

    it('should navigate to specific entry by index', () => {
      const entry = timeline.goToEntry(1)
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 2')
      expect(timeline.currentIndex.value).toBe(1)
    })

    it('should return null for invalid index', () => {
      expect(timeline.goToEntry(-1)).toBeNull()
      expect(timeline.goToEntry(10)).toBeNull()
    })

    it('should navigate to entry by ID', () => {
      const entryId = timeline.history.value[1].id
      const entry = timeline.goToEntryById(entryId)
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 2')
    })

    it('should return null for invalid ID', () => {
      expect(timeline.goToEntryById('invalid-id')).toBeNull()
    })

    it('should go back in history', () => {
      const entry = timeline.goBack()
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 2')
      expect(timeline.currentIndex.value).toBe(1)
    })

    it('should not go back beyond first entry', () => {
      timeline.goToEntry(0)
      expect(timeline.goBack()).toBeNull()
      expect(timeline.currentIndex.value).toBe(0)
    })

    it('should go forward in history', () => {
      timeline.goToEntry(1)
      const entry = timeline.goForward()
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 3')
      expect(timeline.currentIndex.value).toBe(2)
    })

    it('should not go forward beyond last entry', () => {
      expect(timeline.goForward()).toBeNull()
      expect(timeline.currentIndex.value).toBe(2)
    })

    it('should go to latest entry', () => {
      timeline.goToEntry(0)
      const entry = timeline.goToLatest()
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 3')
      expect(timeline.currentIndex.value).toBe(2)
    })

    it('should go to first entry', () => {
      const entry = timeline.goToFirst()
      
      expect(entry).toBeTruthy()
      expect(entry?.content).toBe('Entry 1')
      expect(timeline.currentIndex.value).toBe(0)
    })

    it('should call onTimeTravel callback', () => {
      const onTimeTravel = vi.fn()
      const tl = useHistoryTimeline({ onTimeTravel })
      
      tl.addEntry('Entry 1')
      tl.addEntry('Entry 2')
      tl.goToEntry(0)
      
      expect(onTimeTravel).toHaveBeenCalledTimes(1)
      expect(onTimeTravel).toHaveBeenCalledWith(expect.objectContaining({
        content: 'Entry 1'
      }))
    })

    it('should set isNavigating during navigation', () => {
      expect(timeline.isNavigating.value).toBe(false)
      timeline.goToEntry(1)
      expect(timeline.isNavigating.value).toBe(false) // Back to false after navigation
    })
  })

  describe('Computed Properties', () => {
    it('should compute currentEntry', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.currentEntry.value).toBeNull()
      
      timeline.addEntry('Entry 1')
      expect(timeline.currentEntry.value?.content).toBe('Entry 1')
      
      timeline.addEntry('Entry 2')
      expect(timeline.currentEntry.value?.content).toBe('Entry 2')
    })

    it('should compute canGoBack', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.canGoBack.value).toBe(false)
      
      timeline.addEntry('Entry 1')
      expect(timeline.canGoBack.value).toBe(false)
      
      timeline.addEntry('Entry 2')
      expect(timeline.canGoBack.value).toBe(true)
    })

    it('should compute canGoForward', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      
      expect(timeline.canGoForward.value).toBe(false)
      
      timeline.goToEntry(0)
      expect(timeline.canGoForward.value).toBe(true)
    })

    it('should compute hasHistory', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.hasHistory.value).toBe(false)
      
      timeline.addEntry('Entry 1')
      expect(timeline.hasHistory.value).toBe(true)
    })

    it('should compute historySize', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.historySize.value).toBe(0)
      
      timeline.addEntry('Entry 1')
      expect(timeline.historySize.value).toBe(1)
      
      timeline.addEntry('Entry 2')
      expect(timeline.historySize.value).toBe(2)
    })

    it('should compute timelineProgress', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.timelineProgress.value).toBe(0)
      
      timeline.addEntry('Entry 1')
      expect(timeline.timelineProgress.value).toBe(0)
      
      timeline.addEntry('Entry 2')
      timeline.addEntry('Entry 3')
      expect(timeline.timelineProgress.value).toBe(100)
      
      timeline.goToEntry(1)
      expect(timeline.timelineProgress.value).toBe(50)
    })
  })

  describe('Comparison', () => {
    let timeline: ReturnType<typeof useHistoryTimeline>

    beforeEach(() => {
      timeline = useHistoryTimeline()
      timeline.addEntry('A'.repeat(10))
      timeline.addEntry('A'.repeat(20))
      timeline.addEntry('A'.repeat(5))
    })

    it('should compare two entries', () => {
      const comparison = timeline.compareEntries(0, 1)
      
      expect(comparison).toBeTruthy()
      expect(comparison?.added).toBe(10)
      expect(comparison?.removed).toBe(0)
      expect(comparison?.unchanged).toBe(10)
    })

    it('should handle removed content in comparison', () => {
      const comparison = timeline.compareEntries(1, 2)
      
      expect(comparison).toBeTruthy()
      expect(comparison?.added).toBe(0)
      expect(comparison?.removed).toBe(15)
      expect(comparison?.unchanged).toBe(5)
    })

    it('should return null for invalid indices', () => {
      expect(timeline.compareEntries(-1, 1)).toBeNull()
      expect(timeline.compareEntries(0, 10)).toBeNull()
    })
  })

  describe('History Management', () => {
    it('should clear all history', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      
      timeline.clearHistory()
      
      expect(timeline.history.value).toHaveLength(0)
      expect(timeline.currentIndex.value).toBe(-1)
    })

    it('should update entry label', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1', 'Old Label')
      
      const success = timeline.updateEntryLabel(0, 'New Label')
      
      expect(success).toBe(true)
      expect(timeline.history.value[0].label).toBe('New Label')
    })

    it('should return false for invalid index when updating label', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      
      expect(timeline.updateEntryLabel(10, 'Label')).toBe(false)
    })

    it('should get entries in time range', () => {
      const timeline = useHistoryTimeline()
      
      const time1 = Date.now()
      timeline.addEntry('Entry 1')
      
      // Wait a bit before adding next entry
      const time2 = time1 + 100
      timeline.addEntry('Entry 2')
      
      const time3 = time2 + 100
      timeline.addEntry('Entry 3')
      
      // Get entries between time1 and time2 (should get first 2 entries)
      const entries = timeline.getEntriesInTimeRange(time1, time3)
      
      expect(entries.length).toBeGreaterThanOrEqual(1)
      expect(entries.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Export/Import', () => {
    it('should export history as JSON', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      
      const exported = timeline.exportHistory()
      const parsed = JSON.parse(exported)
      
      expect(parsed.history).toHaveLength(2)
      expect(parsed.currentIndex).toBe(1)
      expect(parsed.exportedAt).toBeTruthy()
    })

    it('should import history from JSON', () => {
      const timeline1 = useHistoryTimeline()
      timeline1.addEntry('Entry 1')
      timeline1.addEntry('Entry 2')
      
      const exported = timeline1.exportHistory()
      
      const timeline2 = useHistoryTimeline()
      const success = timeline2.importHistory(exported)
      
      expect(success).toBe(true)
      expect(timeline2.history.value).toHaveLength(2)
      expect(timeline2.currentIndex.value).toBe(1)
    })

    it('should handle invalid JSON during import', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.importHistory('invalid json')).toBe(false)
      expect(timeline.importHistory('{}')).toBe(false)
    })

    it('should preserve entry details during export/import', () => {
      const timeline1 = useHistoryTimeline()
      timeline1.addEntry('Content', 'Label', { key: 'value' })
      
      const exported = timeline1.exportHistory()
      
      const timeline2 = useHistoryTimeline()
      timeline2.importHistory(exported)
      
      const entry = timeline2.history.value[0]
      expect(entry.content).toBe('Content')
      expect(entry.label).toBe('Label')
      expect(entry.metadata).toEqual({ key: 'value' })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty timeline navigation', () => {
      const timeline = useHistoryTimeline()
      
      expect(timeline.goBack()).toBeNull()
      expect(timeline.goForward()).toBeNull()
      expect(timeline.goToLatest()).toBeNull()
      expect(timeline.goToFirst()).toBeNull()
    })

    it('should handle single entry timeline', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Single Entry')
      
      expect(timeline.canGoBack.value).toBe(false)
      expect(timeline.canGoForward.value).toBe(false)
      expect(timeline.timelineProgress.value).toBe(0)
    })

    it('should handle very long content', () => {
      const timeline = useHistoryTimeline()
      const longContent = 'A'.repeat(10000)
      
      timeline.addEntry(longContent)
      
      expect(timeline.history.value[0].content).toBe(longContent)
      expect(timeline.history.value[0].content.length).toBe(10000)
    })

    it('should handle rapid additions', () => {
      const timeline = useHistoryTimeline({ maxEntries: 10 })
      
      for (let i = 0; i < 20; i++) {
        timeline.addEntry(`Entry ${i}`)
      }
      
      expect(timeline.history.value).toHaveLength(10)
      expect(timeline.history.value[0].content).toBe('Entry 10')
    })

    it('should handle navigation to same entry', () => {
      const timeline = useHistoryTimeline()
      timeline.addEntry('Entry 1')
      timeline.addEntry('Entry 2')
      
      const currentIdx = timeline.currentIndex.value
      timeline.goToEntry(currentIdx)
      
      expect(timeline.currentIndex.value).toBe(currentIdx)
    })
  })
})
