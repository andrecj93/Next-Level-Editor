import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useLoading } from '../useLoading'

describe('useLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Loading State', () => {
    it('should initialize without loading states', () => {
      const { isLoading } = useLoading()
      expect(isLoading('test')).toBe(false)
    })

    it('should start loading after delay', () => {
      const { startLoading, isLoading } = useLoading(100)
      
      startLoading('test')
      expect(isLoading('test')).toBe(false) // Not loading yet
      
      vi.advanceTimersByTime(100)
      expect(isLoading('test')).toBe(true) // Now loading
    })

    it('should complete loading successfully', () => {
      const { startLoading, completeLoading, isLoading, getData } = useLoading(0)
      
      startLoading('test', 0)
      vi.advanceTimersByTime(0)
      expect(isLoading('test')).toBe(true)
      
      completeLoading('test', { result: 'success' })
      expect(isLoading('test')).toBe(false)
      expect(getData('test')).toEqual({ result: 'success' })
    })

    it('should handle loading error', () => {
      const { startLoading, errorLoading, isLoading, getError } = useLoading(0)
      
      startLoading('test', 0)
      vi.advanceTimersByTime(0)
      
      const error = new Error('Test error')
      errorLoading('test', error)
      
      expect(isLoading('test')).toBe(false)
      expect(getError('test')).toBe(error)
    })
  })

  describe('Multiple Loading States', () => {
    it('should handle multiple concurrent loading states', () => {
      const { startLoading, isLoading } = useLoading(0)
      
      startLoading('task1', 0)
      startLoading('task2', 0)
      vi.advanceTimersByTime(0)
      
      expect(isLoading('task1')).toBe(true)
      expect(isLoading('task2')).toBe(true)
    })

    it('should track hasAnyLoading correctly', () => {
      const { startLoading, completeLoading, hasAnyLoading } = useLoading(0)
      
      expect(hasAnyLoading.value).toBe(false)
      
      startLoading('task1', 0)
      vi.advanceTimersByTime(0)
      expect(hasAnyLoading.value).toBe(true)
      
      startLoading('task2', 0)
      vi.advanceTimersByTime(0)
      expect(hasAnyLoading.value).toBe(true)
      
      completeLoading('task1')
      expect(hasAnyLoading.value).toBe(true) // task2 still loading
      
      completeLoading('task2')
      expect(hasAnyLoading.value).toBe(false)
    })
  })

  describe('Delay Prevention', () => {
    it('should cancel loading if completed before delay', () => {
      const { startLoading, completeLoading, isLoading } = useLoading(100)
      
      startLoading('test')
      expect(isLoading('test')).toBe(false)
      
      completeLoading('test', 'data')
      vi.advanceTimersByTime(100)
      
      expect(isLoading('test')).toBe(false) // Should never have started
    })

    it('should clear timer on error before delay', () => {
      const { startLoading, errorLoading, isLoading } = useLoading(100)
      
      startLoading('test')
      errorLoading('test', new Error('Quick error'))
      vi.advanceTimersByTime(100)
      
      expect(isLoading('test')).toBe(false)
    })
  })

  describe('Clear Functions', () => {
    it('should clear specific loading state', () => {
      const { startLoading, clearLoading, isLoading, getData } = useLoading(0)
      
      startLoading('test', 0)
      vi.advanceTimersByTime(0)
      
      clearLoading('test')
      expect(isLoading('test')).toBe(false)
      expect(getData('test')).toBe(null)
    })

    it('should clear all loading states', () => {
      const { startLoading, clearAll, isLoading } = useLoading(0)
      
      startLoading('task1', 0)
      startLoading('task2', 0)
      vi.advanceTimersByTime(0)
      
      clearAll()
      expect(isLoading('task1')).toBe(false)
      expect(isLoading('task2')).toBe(false)
    })

    it('should clear pending timers on clearAll', () => {
      const { startLoading, clearAll, isLoading } = useLoading(100)
      
      startLoading('test')
      clearAll()
      vi.advanceTimersByTime(100)
      
      expect(isLoading('test')).toBe(false)
    })
  })

  describe('WithLoading Wrapper', () => {
    it('should wrap async function with loading state', async () => {
      const { withLoading, isLoading } = useLoading(0)
      
      const asyncFn = vi.fn().mockResolvedValue('result')
      
      const promise = withLoading('test', asyncFn, { delay: 0 })
      vi.advanceTimersByTime(0)
      
      expect(isLoading('test')).toBe(true)
      
      const result = await promise
      expect(result).toBe('result')
      expect(isLoading('test')).toBe(false)
    })

    it('should handle errors in wrapped function', async () => {
      const { withLoading, getError } = useLoading(0)
      
      const error = new Error('Async error')
      const asyncFn = vi.fn().mockRejectedValue(error)
      
      const onError = vi.fn()
      const result = await withLoading('test', asyncFn, { delay: 0, onError })
      
      expect(result).toBe(null)
      expect(getError('test')).toEqual(error)
      expect(onError).toHaveBeenCalledWith(error)
    })

    it('should convert non-Error rejections to Error', async () => {
      const { withLoading, getError } = useLoading(0)
      
      const asyncFn = vi.fn().mockRejectedValue('string error')
      
      await withLoading('test', asyncFn, { delay: 0 })
      
      const error = getError('test')
      expect(error).toBeInstanceOf(Error)
      expect(error?.message).toBe('string error')
    })
  })

  describe('Data Management', () => {
    it('should store and retrieve data', () => {
      const { completeLoading, getData } = useLoading()
      
      const testData = { id: 1, name: 'Test' }
      completeLoading('test', testData)
      
      expect(getData('test')).toEqual(testData)
    })

    it('should return null for non-existent key', () => {
      const { getData, getError } = useLoading()
      
      expect(getData('nonexistent')).toBe(null)
      expect(getError('nonexistent')).toBe(null)
    })
  })

  describe('Timer Management', () => {
    it('should clear old timer when restarting loading', () => {
      const { startLoading, isLoading } = useLoading(100)
      
      startLoading('test')
      startLoading('test') // Restart before first timer fires
      
      vi.advanceTimersByTime(100)
      expect(isLoading('test')).toBe(true) // Should only be loading once
    })
  })

  describe('Custom Delays', () => {
    it('should use custom delay for specific operations', () => {
      const { startLoading, isLoading } = useLoading(100) // default 100ms
      
      startLoading('test', 50) // custom 50ms
      
      vi.advanceTimersByTime(49)
      expect(isLoading('test')).toBe(false)
      
      vi.advanceTimersByTime(1)
      expect(isLoading('test')).toBe(true)
    })

    it('should allow zero delay for immediate loading', () => {
      const { startLoading, isLoading } = useLoading()
      
      startLoading('test', 0)
      vi.advanceTimersByTime(0)
      
      expect(isLoading('test')).toBe(true)
    })
  })
})
