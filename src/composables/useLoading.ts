/**
 * Loading State Composable
 * Manages loading states for async operations with debouncing
 */

import { ref, computed } from 'vue'

export interface LoadingState {
  isLoading: boolean
  error: Error | null
  data: any
}

export function useLoading(initialDelay = 200) {
  const loadingStates = ref<Map<string, LoadingState>>(new Map())
  const loadingTimers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  /**
   * Start loading state for a specific key
   * Uses delay to prevent flash of loading state for fast operations
   */
  function startLoading(key: string, delay = initialDelay) {
    // Clear any existing timer
    const existingTimer = loadingTimers.value.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set loading after delay to avoid flash
    const timer = setTimeout(() => {
      loadingStates.value.set(key, {
        isLoading: true,
        error: null,
        data: null,
      })
      loadingTimers.value.delete(key)
    }, delay)

    loadingTimers.value.set(key, timer)
  }

  /**
   * Complete loading state successfully
   */
  function completeLoading(key: string, data: any = null) {
    // Clear timer if still pending
    const timer = loadingTimers.value.get(key)
    if (timer) {
      clearTimeout(timer)
      loadingTimers.value.delete(key)
    }

    loadingStates.value.set(key, {
      isLoading: false,
      error: null,
      data,
    })
  }

  /**
   * Complete loading state with error
   */
  function errorLoading(key: string, error: Error) {
    // Clear timer if still pending
    const timer = loadingTimers.value.get(key)
    if (timer) {
      clearTimeout(timer)
      loadingTimers.value.delete(key)
    }

    loadingStates.value.set(key, {
      isLoading: false,
      error,
      data: null,
    })
  }

  /**
   * Check if a specific key is loading
   */
  function isLoading(key: string): boolean {
    return loadingStates.value.get(key)?.isLoading ?? false
  }

  /**
   * Get error for a specific key
   */
  function getError(key: string): Error | null {
    return loadingStates.value.get(key)?.error ?? null
  }

  /**
   * Get data for a specific key
   */
  function getData(key: string): any {
    return loadingStates.value.get(key)?.data ?? null
  }

  /**
   * Clear loading state for a specific key
   */
  function clearLoading(key: string) {
    const timer = loadingTimers.value.get(key)
    if (timer) {
      clearTimeout(timer)
      loadingTimers.value.delete(key)
    }
    loadingStates.value.delete(key)
  }

  /**
   * Clear all loading states
   */
  function clearAll() {
    // Clear all timers
    loadingTimers.value.forEach((timer) => clearTimeout(timer))
    loadingTimers.value.clear()
    loadingStates.value.clear()
  }

  /**
   * Check if any operation is loading
   */
  const hasAnyLoading = computed(() => {
    return Array.from(loadingStates.value.values()).some((state) => state.isLoading)
  })

  /**
   * Wrap an async function with loading state
   */
  async function withLoading<T>(
    key: string,
    fn: () => Promise<T>,
    options: { delay?: number; onError?: (error: Error) => void } = {}
  ): Promise<T | null> {
    try {
      startLoading(key, options.delay)
      const result = await fn()
      completeLoading(key, result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errorLoading(key, err)
      if (options.onError) {
        options.onError(err)
      }
      return null
    }
  }

  return {
    startLoading,
    completeLoading,
    errorLoading,
    isLoading,
    getError,
    getData,
    clearLoading,
    clearAll,
    hasAnyLoading,
    withLoading,
  }
}
