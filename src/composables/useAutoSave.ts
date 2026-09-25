import { ref, computed, getCurrentScope, onScopeDispose } from 'vue'

export interface SaveVersion {
  content: string
  timestamp: Date
  version: number
}

export interface ConflictInfo {
  localContent: string
  serverContent: string
  serverVersion: number
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
  const isDirty = ref(false)
  let revision = 0
  let generation = 0
  let disposed = false
  let queuedSave: { content: string; revision: number } | null = null
  let inFlight: Promise<void> | null = null

  // Computed properties
  const saveStatus = computed(() => {
    if (isSaving.value) return 'saving'
    if (hasConflict.value) return 'conflict'
    if (lastError.value) return 'error'
    if (isDirty.value) return 'unsaved'
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
    if (disposed) return
    queuedSave = { content, revision: ++revision }
    isDirty.value = true
    // Clear existing timer
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
    }

    // Set new timer
    saveTimer.value = setTimeout(async () => {
      saveTimer.value = null
      await drainQueue()
    }, delay)
  }

  /**
   * Record a non-throwing save failure (host handler resolved false) so the
   * status turns to 'error' rather than silently reading 'saved'.
   */
  const markSaveFailed = () => {
    lastError.value = new Error('Save failed')
    failedSaves.value++
    console.warn('[NextLevelEditor] Auto-save rejected', { version: currentVersion.value })
  }

  /**
   * Perform the actual save operation
   */
  const performSave = async (request: { content: string; revision: number }) => {
    const { content } = request
    const saveGeneration = generation
    isSaving.value = true
    lastError.value = null
    console.debug('[NextLevelEditor] Auto-save started', { version: currentVersion.value })

    try {
      const result = await callback(content, currentVersion.value)
      if (disposed || saveGeneration !== generation) return

      if (result.success) {
        // Save successful
        currentVersion.value = result.serverVersion ?? currentVersion.value + 1
        lastSaved.value = new Date()
        addToHistory(content)
        saveCount.value++
        hasConflict.value = false
        conflictInfo.value = null
        isDirty.value = request.revision !== revision
        console.debug('[NextLevelEditor] Auto-save completed', { version: currentVersion.value, pendingChanges: isDirty.value })
      } else if (typeof result.serverContent === 'string' && typeof result.serverVersion === 'number') {
        // Conflict detected
        const conflict = detectConflict(content, result.serverContent, result.serverVersion)

        if (conflict) {
          hasConflict.value = true
          console.warn('[NextLevelEditor] Auto-save conflict', { localVersion: currentVersion.value, serverVersion: result.serverVersion })
          conflictInfo.value = {
            localContent: content,
            serverContent: result.serverContent,
            serverVersion: result.serverVersion,
            localTimestamp: new Date(),
            serverTimestamp: lastSaved.value || new Date(),
            resolved: false,
          }

          // Notify conflict handler
          if (onConflict && conflictInfo.value) {
            onConflict(conflictInfo.value)
          }

          failedSaves.value++
        } else {
          // Server sent content but it's not actually a conflict (versions in
          // sync) — treat the unsuccessful save as a failure so the signal
          // never falsely reads "saved".
          markSaveFailed()
        }
      } else {
        // A plain failure — the host saveHandler resolved false (or threw and
        // the wrapper reported failure). Surface it: without this branch the
        // "Saved" signal lied, showing success for content that never
        // persisted.
        markSaveFailed()
      }
    } catch (error) {
      if (disposed || saveGeneration !== generation) return
      lastError.value = error instanceof Error ? error : new Error('Save failed')
      failedSaves.value++
      // Host errors can contain document payloads or credentials. Keep the
      // diagnostic useful without printing arbitrary host-provided messages.
      console.error('[NextLevelEditor] Auto-save failed', { name: lastError.value.name })
    } finally {
      isSaving.value = false
    }
  }

  /** Serialize writes and coalesce queued edits. A slow request must never
   * overwrite a newer save, nor report the current document as saved. */
  const drainQueue = async (): Promise<void> => {
    if (disposed || hasConflict.value) return
    if (inFlight) {
      await inFlight
      if (!saveTimer.value) await drainQueue()
      return
    }
    if (!queuedSave) return
    const request = queuedSave
    queuedSave = null
    inFlight = performSave(request)
    try {
      await inFlight
    } finally {
      inFlight = null
    }
    if (!saveTimer.value && queuedSave && !lastError.value) await drainQueue()
  }

  /**
   * Force save immediately
   * @param content - Content to save
   */
  const forceSave = async (content: string) => {
    if (disposed) return
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
      saveTimer.value = null
    }
    queuedSave = { content, revision: ++revision }
    isDirty.value = true
    await drainQueue()
  }

  /**
   * Cancel pending auto-save
   */
  const cancelAutoSave = () => {
    queuedSave = null
    if (saveTimer.value) {
      clearTimeout(saveTimer.value)
      saveTimer.value = null
    }
  }

  /**
   * Resolve conflict by choosing local or server version
   * @param useLocal - True to keep local changes, false to accept server version
   */
  const resolveConflict = (useLocal: boolean): string | null => {
    if (!conflictInfo.value) return null

    conflictInfo.value.resolved = true

    if (useLocal) {
      // Keep local changes and force save
      const localContent = queuedSave?.content ?? conflictInfo.value.localContent
      currentVersion.value = conflictInfo.value.serverVersion
      hasConflict.value = false
      conflictInfo.value = null
      void forceSave(localContent)
      return null
    }

    // Accept server version — advance to the server's version so the next save
    // doesn't immediately re-conflict against it, and RETURN the server content
    // so the host can load it into the editor. Without this the DOM kept the
    // local content and the next debounced save silently overwrote the server
    // copy — the opposite of the user's choice, and a data-loss surprise.
    const serverContent = conflictInfo.value.serverContent
    cancelAutoSave()
    revision++
    currentVersion.value = conflictInfo.value.serverVersion || currentVersion.value + 1
    addToHistory(serverContent)
    lastSaved.value = new Date()

    hasConflict.value = false
    conflictInfo.value = null
    lastError.value = null
    isDirty.value = false
    return serverContent
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
    cancelAutoSave()
    generation++
    isDirty.value = false
    saveHistory.value = []
    currentVersion.value = 0
    lastSaved.value = null
    hasConflict.value = false
    conflictInfo.value = null
    lastError.value = null
    saveCount.value = 0
    failedSaves.value = 0
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      disposed = true
      generation++
      cancelAutoSave()
    })
  }

  return {
    // State
    isSaving,
    isDirty,
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
