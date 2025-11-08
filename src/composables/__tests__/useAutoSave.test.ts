import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAutoSave } from '../useAutoSave'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Auto-Save', () => {
    it('should initialize with default state', () => {
      const mockCallback = vi.fn(async () => ({ success: true }))
      const autoSave = useAutoSave(mockCallback)

      expect(autoSave.isSaving.value).toBe(false)
      expect(autoSave.lastSaved.value).toBeNull()
      expect(autoSave.currentVersion.value).toBe(0)
      expect(autoSave.saveHistory.value).toEqual([])
      expect(autoSave.hasConflict.value).toBe(false)
      expect(autoSave.conflictInfo.value).toBeNull()
    })

    it('should trigger auto-save after delay', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 1000 })

      autoSave.triggerAutoSave('test content')
      expect(mockCallback).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledWith('test content', 0)
    })

    it('should debounce multiple save attempts', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 1000 })

      autoSave.triggerAutoSave('content 1')
      await vi.advanceTimersByTimeAsync(500)

      autoSave.triggerAutoSave('content 2')
      await vi.advanceTimersByTimeAsync(500)

      autoSave.triggerAutoSave('content 3')
      await vi.advanceTimersByTimeAsync(1000)

      // Should only save once with the latest content
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith('content 3', 0)
    })

    it('should update state after successful save', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 500 })

      autoSave.triggerAutoSave('test content')
      await vi.advanceTimersByTimeAsync(500)

      expect(autoSave.lastSaved.value).toBeInstanceOf(Date)
      expect(autoSave.currentVersion.value).toBe(1)
      expect(autoSave.saveHistory.value).toHaveLength(1)
      expect(autoSave.saveHistory.value[0].content).toBe('test content')
    })
  })

  describe('Force Save', () => {
    it('should save immediately without delay', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 2000 })

      await autoSave.forceSave('urgent content')

      expect(mockCallback).toHaveBeenCalledWith('urgent content', 0)
      expect(autoSave.lastSaved.value).toBeInstanceOf(Date)
    })

    it('should cancel pending auto-save when force saving', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 2000 })

      autoSave.triggerAutoSave('delayed content')
      await autoSave.forceSave('urgent content')
      await vi.runAllTimersAsync()

      // Should only have been called once (force save)
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith('urgent content', 0)
    })
  })

  describe('Cancel Auto-Save', () => {
    it('should cancel pending save', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 1000 })

      autoSave.triggerAutoSave('test content')
      autoSave.cancelAutoSave()
      await vi.advanceTimersByTimeAsync(1000)

      expect(mockCallback).not.toHaveBeenCalled()
    })
  })

  describe('Version History', () => {
    it('should maintain save history', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))
      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('version 1')
      await autoSave.forceSave('version 2')
      await autoSave.forceSave('version 3')

      expect(autoSave.saveHistory.value).toHaveLength(3)
      expect(autoSave.saveHistory.value[0].content).toBe('version 1')
      expect(autoSave.saveHistory.value[1].content).toBe('version 2')
      expect(autoSave.saveHistory.value[2].content).toBe('version 3')
    })

    it('should limit history to maxVersions', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))
      const autoSave = useAutoSave(mockCallback, { delay: 100, maxVersions: 3 })

      await autoSave.forceSave('v1')
      await autoSave.forceSave('v2')
      await autoSave.forceSave('v3')
      await autoSave.forceSave('v4')
      await autoSave.forceSave('v5')

      expect(autoSave.saveHistory.value).toHaveLength(3)
      expect(autoSave.saveHistory.value[0].content).toBe('v3')
      expect(autoSave.saveHistory.value[1].content).toBe('v4')
      expect(autoSave.saveHistory.value[2].content).toBe('v5')
    })

    it('should rollback to specific version', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))
      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('version 1')
      await autoSave.forceSave('version 2')
      await autoSave.forceSave('version 3')

      const rolledBackContent = autoSave.rollbackToVersion(1)

      expect(rolledBackContent).toBe('version 2')
      expect(autoSave.currentVersion.value).toBe(2)
    })

    it('should throw error for invalid version index', async () => {
      const mockCallback = vi.fn(async () => ({ success: true }))
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('test')

      expect(() => autoSave.rollbackToVersion(-1)).toThrow('Invalid version index')
      expect(() => autoSave.rollbackToVersion(10)).toThrow('Invalid version index')
    })
  })

  describe('Conflict Detection', () => {
    it('should detect conflicts when server version is ahead', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'server content',
        })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('initial content')
      await autoSave.forceSave('local changes')

      expect(autoSave.hasConflict.value).toBe(true)
      expect(autoSave.conflictInfo.value).not.toBeNull()
      expect(autoSave.conflictInfo.value?.localContent).toBe('local changes')
      expect(autoSave.conflictInfo.value?.serverContent).toBe('server content')
    })

    it('should not detect conflict when content is same', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'same content',
        })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('same content')
      await autoSave.forceSave('same content')

      expect(autoSave.hasConflict.value).toBe(false)
    })

    it('should call onConflict callback when conflict detected', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'server content',
        })

      const onConflict = vi.fn()
      const autoSave = useAutoSave(mockCallback, { delay: 100, onConflict })

      await autoSave.forceSave('initial content')
      await autoSave.forceSave('local changes')

      expect(onConflict).toHaveBeenCalled()
      expect(onConflict).toHaveBeenCalledWith(
        expect.objectContaining({
          localContent: 'local changes',
          serverContent: 'server content',
          resolved: false,
        })
      )
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve conflict by keeping local changes', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'server content',
        })
        .mockResolvedValueOnce({ success: true, serverVersion: 4 })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('initial')
      await autoSave.forceSave('local changes')

      expect(autoSave.hasConflict.value).toBe(true)

      autoSave.resolveConflict(true) // Keep local
      await vi.runAllTimersAsync()

      expect(autoSave.hasConflict.value).toBe(false)
      expect(autoSave.conflictInfo.value).toBeNull()
      expect(mockCallback).toHaveBeenCalledWith('local changes', 2)
    })

    it('should resolve conflict by accepting server version', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'server content',
        })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('initial')
      await autoSave.forceSave('local changes')

      expect(autoSave.hasConflict.value).toBe(true)

      autoSave.resolveConflict(false) // Accept server

      expect(autoSave.hasConflict.value).toBe(false)
      expect(autoSave.conflictInfo.value).toBeNull()
      expect(autoSave.saveHistory.value[autoSave.saveHistory.value.length - 1].content).toBe(
        'server content'
      )
    })
  })

  describe('Save Status', () => {
    it('should return "unsaved" initially', () => {
      const mockCallback = vi.fn(async () => ({ success: true }))
      const autoSave = useAutoSave(mockCallback)

      expect(autoSave.saveStatus.value).toBe('unsaved')
    })

    it('should return "saving" while save in progress', async () => {
      let resolveCallback: (value: any) => void
      const mockCallback = vi.fn(
        () =>
          new Promise<{ success: boolean; serverVersion?: number }>((resolve) => {
            resolveCallback = resolve
          })
      )

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      autoSave.triggerAutoSave('test')
      await vi.advanceTimersByTimeAsync(100)

      expect(autoSave.saveStatus.value).toBe('saving')

      resolveCallback!({ success: true, serverVersion: 1 })
      await vi.runAllTimersAsync()
    })

    it('should return "saved" after successful save', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('test')

      expect(autoSave.saveStatus.value).toBe('saved')
    })

    it('should return "conflict" when conflict exists', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({
          success: false,
          serverVersion: 3,
          serverContent: 'server content',
        })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('initial')
      await autoSave.forceSave('local changes')

      expect(autoSave.saveStatus.value).toBe('conflict')
    })

    it('should return "error" after save failure', async () => {
      const mockCallback = vi.fn(async () => {
        throw new Error('Save failed')
      })

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('test')

      expect(autoSave.saveStatus.value).toBe('error')
      expect(autoSave.lastError.value).toBeInstanceOf(Error)
    })
  })

  describe('Statistics', () => {
    it('should track save statistics', async () => {
      const mockCallback = vi.fn()
        .mockResolvedValueOnce({ success: true, serverVersion: 1 })
        .mockResolvedValueOnce({ success: true, serverVersion: 2 })
        .mockRejectedValueOnce(new Error('Failed'))

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('save 1')
      await autoSave.forceSave('save 2')
      await autoSave.forceSave('save 3')

      const stats = autoSave.getStatistics()

      expect(stats.totalSaves).toBe(2)
      expect(stats.failedSaves).toBe(1)
      expect(stats.successRate).toBe('66.7')
      expect(stats.currentVersion).toBe(2)
      expect(stats.historyLength).toBe(2)
    })

    it('should handle zero saves correctly', () => {
      const mockCallback = vi.fn(async () => ({ success: true }))
      const autoSave = useAutoSave(mockCallback)

      const stats = autoSave.getStatistics()

      expect(stats.successRate).toBe('0')
    })
  })

  describe('Clear History', () => {
    it('should clear all state and history', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('test 1')
      await autoSave.forceSave('test 2')

      autoSave.clearHistory()

      expect(autoSave.saveHistory.value).toEqual([])
      expect(autoSave.currentVersion.value).toBe(0)
      expect(autoSave.lastSaved.value).toBeNull()
      expect(autoSave.hasConflict.value).toBe(false)
      expect(autoSave.conflictInfo.value).toBeNull()
      expect(autoSave.lastError.value).toBeNull()
    })
  })

  describe('canRollback Computed', () => {
    it('should return false when no history', () => {
      const mockCallback = vi.fn(async () => ({ success: true }))
      const autoSave = useAutoSave(mockCallback)

      expect(autoSave.canRollback.value).toBe(false)
    })

    it('should return false with only one version', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('test')

      expect(autoSave.canRollback.value).toBe(false)
    })

    it('should return true with multiple versions', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('test 1')
      await autoSave.forceSave('test 2')

      expect(autoSave.canRollback.value).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid save attempts correctly', async () => {
      const mockCallback = vi.fn(async (_content: string, version: number) => ({
        success: true,
        serverVersion: version + 1,
      }))

      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      // Trigger many saves rapidly
      for (let i = 0; i < 10; i++) {
        autoSave.triggerAutoSave(`content ${i}`)
        await vi.advanceTimersByTimeAsync(50)
      }

      await vi.runAllTimersAsync()

      // Should only save the last one
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith('content 9', 0)
    })

    it('should handle empty content', async () => {
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('')

      expect(mockCallback).toHaveBeenCalledWith('', 0)
      expect(autoSave.saveHistory.value[0].content).toBe('')
    })

    it('should handle very long content', async () => {
      const longContent = 'a'.repeat(100000)
      const mockCallback = vi.fn(async () => ({ success: true, serverVersion: 1 }))
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave(longContent)

      expect(mockCallback).toHaveBeenCalledWith(longContent, 0)
      expect(autoSave.saveHistory.value[0].content).toBe(longContent)
    })
  })

  describe('Callback Function Flexibility', () => {
    it('should work with callback that ignores parameters', async () => {
      // Test that callback can be defined without using content/version parameters
      const mockCallback = vi.fn(() => 
        Promise.resolve({ success: true, serverVersion: 1 })
      )
      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      await autoSave.forceSave('test content')

      expect(mockCallback).toHaveBeenCalledWith('test content', 0)
      expect(autoSave.saveStatus.value).toBe('saved')
    })

    it('should work with callback using only content parameter', async () => {
      const mockCallback = vi.fn((content: string) => {
        expect(content).toBe('my content')
        return Promise.resolve({ success: true, serverVersion: 1 })
      })
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('my content')

      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(autoSave.lastSaved.value).not.toBeNull()
    })

    it('should work with callback using both parameters', async () => {
      const mockCallback = vi.fn((content: string, version: number) => {
        expect(content).toBe('content v2')
        expect(version).toBeGreaterThanOrEqual(0)
        return Promise.resolve({ success: true, serverVersion: version + 1 })
      })
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('content v2')

      expect(mockCallback).toHaveBeenCalledWith('content v2', 0)
      expect(autoSave.currentVersion.value).toBe(1)
    })

    it('should pass correct version number across multiple saves', async () => {
      const versions: number[] = []
      const mockCallback = vi.fn((content: string, version: number) => {
        versions.push(version)
        return Promise.resolve({ success: true, serverVersion: version + 1 })
      })
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('content 1')
      await autoSave.forceSave('content 2')
      await autoSave.forceSave('content 3')

      expect(versions).toEqual([0, 1, 2])
      expect(autoSave.currentVersion.value).toBe(3)
    })

    it('should handle callback returning promise without parameters', async () => {
      let resolveCallback: (value: any) => void
      const mockCallback = vi.fn(
        () =>
          new Promise<{ success: boolean; serverVersion?: number }>((resolve) => {
            resolveCallback = resolve
          })
      )
      const autoSave = useAutoSave(mockCallback, { delay: 100 })

      autoSave.triggerAutoSave('async test')
      await vi.advanceTimersByTimeAsync(100)

      expect(autoSave.saveStatus.value).toBe('saving')

      resolveCallback!({ success: true, serverVersion: 1 })
      await vi.runAllTimersAsync()

      expect(autoSave.saveStatus.value).toBe('saved')
    })

    it('should work with async callback without parameter destructuring', async () => {
      const mockCallback = vi.fn(async () => {
        // Simulate some async operation without setTimeout
        return { success: true, serverVersion: 5 }
      })
      const autoSave = useAutoSave(mockCallback)

      await autoSave.forceSave('test')

      expect(mockCallback).toHaveBeenCalled()
      expect(autoSave.currentVersion.value).toBe(5)
    })
  })
})
