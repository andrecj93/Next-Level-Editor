import { ref, computed } from 'vue'

export interface SaveVersion {
  content: string
  timestamp: Date
  version: number
}

export interface ConflictInfo {
  localContent: string
  serverContent: string
  localTimestamp: Date
  serverTimestamp: Date
  resolved: boolean
}

export interface AutoSaveOptions {
  delay?: number
  maxVersions?: number
  onConflict?: (conflict: ConflictInfo) => void
}

const DEFAULT_DELAY = 2000
const DEFAULT_MAX_VERSIONS = 10

/**
 * Enhanced composable for auto-saving content with conflict detection
 * @param callback - Function to call when content should be saved
 * @param options - Configuration options
 */
export function useAutoSave(
  callback: (content: string, version: number) => Promise<{ success: boolean; serverVersion?: number; serverContent?: string }>,
  options: AutoSaveOptions = {}
) {
  const { delay = DEFAULT_DELAY, maxVersions = DEFAULT_MAX_VERSIONS, onConflict } = options

  const isSaving = ref(false)
  const lastSaved = ref<Date | null>(null)
  const saveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const currentVersion = ref(0)
  const saveHistory = ref<SaveVersion[]>([])
  const hasConflict = ref(false)
  const conflictInfo = ref<ConflictInfo | null>(null)
  const lastError = ref<Error | null>(null)
  const saveCount = ref(0)
  const failedSaves = ref(0)

  // Computed properties
  const saveStatus = computed(() => {
    if (isSaving.value) return 'saving'
    if (hasConflict.value) return 'conflict'
    if (lastError.value) return 'error'
    if (lastSaved.value) return 'saved'
    return 'unsaved'
  })

  const canRollback = computed(() => saveHistory.value.length > 1)

  /**
   * Add version to history
   */
  const addToHistory = (content: string) => {
    const version: SaveVersion = {
      content,
      timestamp: new Date(),
      version: currentVersion.value,
    }

    saveHistory.value.push(version)

    // Keep only last N versions
    if (saveHistory.value.length > maxVersions) {
      saveHistory.value.shift()
    }
  }

  /**
   * Detect conflicts between local and server versions
   */
  const detectConflict = (localContent: string, serverContent: string, serverVersion: number): boolean => {
    // Conflict if server version is ahead and content differs
    if (serverVersion > currentVersion.value && localContent !== serverContent) {
      return true
    }
    return false
  }

  /**
   * Trigger auto-save with debouncing and conflict detection
   * @param content - Content to save
   */
  const triggerAutoSave = (content: string) => {
    // Clear existing timer
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }

    // Set new timer
    saveTimer.value = setTimeout(async () => {
      await performSave(content)
    }, delay)
  }

  /**
   * Perform the actual save operation
   */
  const performSave = async (content: string) => {
    isSaving.value = true
    lastError.value = null

    try {
      const result = await callback(content, currentVersion.value)

      if (result.success) {
        // Save successful
        currentVersion.value = result.serverVersion ?? currentVersion.value + 1
        lastSaved.value = new Date()
        addToHistory(content)
        saveCount.value++
        hasConflict.value = false
        conflictInfo.value = null
      } else if (result.serverContent && result.serverVersion) {
        // Conflict detected
        const conflict = detectConflict(content, result.serverContent, result.serverVersion)

        if (conflict) {
          hasConflict.value = true
          conflictInfo.value = {
            localContent: content,
            serverContent: result.serverContent,
            localTimestamp: new Date(),
            serverTimestamp: lastSaved.value || new Date(),
            resolved: false,
          }

          // Notify conflict handler
          if (onConflict && conflictInfo.value) {
            onConflict(conflictInfo.value)
          }

          failedSaves.value++
        }
      }
    } catch (error) {
      lastError.value = error as Error
      failedSaves.value++
      console.error('Auto-save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  /**
   * Force save immediately
   * @param content - Content to save
   */
  const forceSave = async (content: string) => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }

    await performSave(content)
  }

  /**
   * Cancel pending auto-save
   */
  const cancelAutoSave = () => {
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
      saveTimer.value = null
    }
  }

  /**
   * Resolve conflict by choosing local or server version
   * @param useLocal - True to keep local changes, false to accept server version
   */
  const resolveConflict = (useLocal: boolean) => {
    if (!conflictInfo.value) return

    conflictInfo.value.resolved = true

    if (useLocal) {
      // Keep local changes and force save
      currentVersion.value++
      forceSave(conflictInfo.value.localContent)
    } else {
      // Accept server version
      currentVersion.value = (conflictInfo.value as any).serverVersion || currentVersion.value + 1
      addToHistory(conflictInfo.value.serverContent)
      lastSaved.value = new Date()
    }

    hasConflict.value = false
    conflictInfo.value = null
  }

  /**
   * Rollback to a previous version
   * @param versionIndex - Index in save history (0 = oldest, -1 = latest)
   */
  const rollbackToVersion = (versionIndex: number) => {
    if (versionIndex < 0 || versionIndex >= saveHistory.value.length) {
      throw new Error('Invalid version index')
    }

    const version = saveHistory.value[versionIndex]
    currentVersion.value = version.version
    lastSaved.value = version.timestamp

    return version.content
  }

  /**
   * Get save statistics
   */
  const getStatistics = () => ({
    totalSaves: saveCount.value,
    failedSaves: failedSaves.value,
    successRate: saveCount.value > 0 ? ((saveCount.value / (saveCount.value + failedSaves.value)) * 100).toFixed(1) : '0',
    currentVersion: currentVersion.value,
    historyLength: saveHistory.value.length,
  })

  /**
   * Clear all save history
   */
  const clearHistory = () => {
    saveHistory.value = []
    currentVersion.value = 0
    lastSaved.value = null
    hasConflict.value = false
    conflictInfo.value = null
    lastError.value = null
    saveCount.value = 0
    failedSaves.value = 0
  }

  return {
    // State
    isSaving,
    lastSaved,
    currentVersion,
    saveHistory,
    hasConflict,
    conflictInfo,
    lastError,
    saveStatus,
    canRollback,

    // Actions
    triggerAutoSave,
    forceSave,
    cancelAutoSave,
    resolveConflict,
    rollbackToVersion,
    getStatistics,
    clearHistory,
  }
}
