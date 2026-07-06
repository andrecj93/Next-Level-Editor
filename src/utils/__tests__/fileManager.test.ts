/**
 * Tests for File Manager Utility
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileManagerService, fileManager as sharedFileManager } from '../fileManager'

/**
 * happy-dom ships a real `Image` constructor but never decodes a `src`, so the
 * `onload`/`onerror` handlers that `createThumbnail` relies on are never fired.
 * These fakes are the minimal missing piece: they let us assign dimensions and
 * deterministically trigger load/error so the real thumbnail code path (canvas
 * sizing, `getContext`, `toDataURL`) runs for real under happy-dom.
 */
class LoadableImage {
  onload: (() => void) | null = null
  onerror: ((err?: unknown) => void) | null = null
  width: number
  height: number
  private _src = ''

  constructor(width = 100, height = 100) {
    this.width = width
    this.height = height
  }

  set src(value: string) {
    this._src = value
    // Mirror the browser: decoding is async, so fire on a microtask.
    queueMicrotask(() => this.onload?.())
  }

  get src(): string {
    return this._src
  }
}

class FailingImage {
  onload: (() => void) | null = null
  onerror: ((err?: unknown) => void) | null = null
  width = 100
  height = 100
  private _src = ''

  set src(value: string) {
    this._src = value
    queueMicrotask(() => this.onerror?.(new Error('decode failed')))
  }

  get src(): string {
    return this._src
  }
}

/**
 * Install a fake `Image` global for the duration of one test.
 *
 * The source calls `new Image()`, so the global must be a real constructor.
 * A regular `function` invoked with `new` returns any object it explicitly
 * returns, which lets us hand back a freshly-built fake each time.
 */
function stubImage(factory: () => LoadableImage | FailingImage) {
  function FakeImageCtor(this: unknown) {
    return factory()
  }
  vi.stubGlobal('Image', FakeImageCtor as unknown as typeof Image)
}

describe('FileManagerService', () => {
  let fileManager: FileManagerService

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Create a new instance for each test
    fileManager = new FileManagerService()
  })

  afterEach(() => {
    // Guarantee any per-test Image/global stub is torn down so it cannot leak
    // into an unrelated test.
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('File Upload', () => {
    it('should upload a file successfully', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      
      const result = await fileManager.uploadFile(mockFile)
      
      expect(result).toBeDefined()
      expect(result.name).toBe('test.txt')
      expect(result.type).toBe('text/plain')
      expect(result.size).toBeGreaterThan(0)
      expect(result.url).toContain('data:')
      expect(result.id).toBeDefined()
    })

    it('should reject files exceeding max size', async () => {
      const largeContent = new Array(15 * 1024 * 1024).join('a') // 15MB
      const mockFile = new File([largeContent], 'large.txt', { type: 'text/plain' })
      
      await expect(fileManager.uploadFile(mockFile)).rejects.toThrow('exceeds maximum')
    })

    it('should reject files with disallowed types', async () => {
      const mockFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' })
      
      await expect(fileManager.uploadFile(mockFile)).rejects.toThrow('not allowed')
    })

    it('should create a thumbnail for image uploads', async () => {
      // happy-dom does not decode images, so provide a fake Image that fires
      // onload. This exercises the real createThumbnail canvas path.
      stubImage(() => new LoadableImage(300, 200))

      const imageFile = new File(['fakebytes'], 'pic.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(imageFile)

      // A thumbnail property is populated (canvas.toDataURL is '' under
      // happy-dom, but the property is still explicitly set, not undefined).
      expect(result.thumbnail).toBeDefined()
      expect(typeof result.thumbnail).toBe('string')
    })

    it('should not create a thumbnail for non-image uploads', async () => {
      // Even if Image were available, a text file must skip the thumbnail path.
      stubImage(() => new LoadableImage(300, 200))

      const textFile = new File(['plain'], 'notes.txt', { type: 'text/plain' })
      const result = await fileManager.uploadFile(textFile)

      expect(result.thumbnail).toBeUndefined()
    })

    it('propagates thumbnail decode failures as an upload rejection', async () => {
      // When the underlying Image fails to load, createThumbnail rejects and
      // uploadFile surfaces that rejection to the caller.
      stubImage(() => new FailingImage())

      const imageFile = new File(['broken'], 'broken.png', { type: 'image/png' })

      await expect(fileManager.uploadFile(imageFile)).rejects.toBeDefined()
    })

    it('does not persist a file whose thumbnail generation fails', async () => {
      stubImage(() => new FailingImage())
      const imageFile = new File(['broken'], 'broken.png', { type: 'image/png' })

      await expect(fileManager.uploadFile(imageFile)).rejects.toBeDefined()

      // Because the rejection happens before this.files.set, nothing is stored.
      expect(fileManager.getFiles()).toHaveLength(0)
    })
  })

  describe('Thumbnail resize branches', () => {
    // The top-level afterEach unstubs the fake Image after each case.
    // createThumbnail(maxSize = 200) has four size branches. We drive each via
    // a real upload and assert the file was accepted (the resolved data URL is
    // '' in happy-dom, but the branch executes without throwing).
    it('handles a wide oversized image (width > height, width > maxSize)', async () => {
      stubImage(() => new LoadableImage(800, 400))
      const file = new File(['x'], 'wide.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(file)
      expect(result.type).toBe('image/png')
      expect(result.thumbnail).toBeDefined()
    })

    it('handles a wide small image (width > height, width <= maxSize)', async () => {
      stubImage(() => new LoadableImage(150, 100))
      const file = new File(['x'], 'wide-small.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(file)
      expect(result.thumbnail).toBeDefined()
    })

    it('handles a tall oversized image (height >= width, height > maxSize)', async () => {
      stubImage(() => new LoadableImage(400, 800))
      const file = new File(['x'], 'tall.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(file)
      expect(result.thumbnail).toBeDefined()
    })

    it('handles a tall small image (height >= width, height <= maxSize)', async () => {
      stubImage(() => new LoadableImage(100, 150))
      const file = new File(['x'], 'tall-small.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(file)
      expect(result.thumbnail).toBeDefined()
    })

    it('handles a square image at exactly maxSize (no resize)', async () => {
      stubImage(() => new LoadableImage(200, 200))
      const file = new File(['x'], 'square.png', { type: 'image/png' })
      const result = await fileManager.uploadFile(file)
      expect(result.thumbnail).toBeDefined()
    })
  })

  describe('File Retrieval', () => {
    it('should get all files', async () => {
      const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' })
      
      await fileManager.uploadFile(file1)
      await fileManager.uploadFile(file2)
      
      const files = fileManager.getFiles()
      
      expect(files).toHaveLength(2)
      expect(files[0].name).toBe('file2.txt') // Most recent first
      expect(files[1].name).toBe('file1.txt')
    })

    it('should get a specific file by ID', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const uploaded = await fileManager.uploadFile(mockFile)
      
      const retrieved = fileManager.getFile(uploaded.id)
      
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(uploaded.id)
      expect(retrieved?.name).toBe('test.txt')
    })

    it('should return undefined for non-existent file', () => {
      const result = fileManager.getFile('non-existent-id')
      
      expect(result).toBeUndefined()
    })
  })

  describe('File Deletion', () => {
    it('should delete a file', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const uploaded = await fileManager.uploadFile(mockFile)
      
      const deleted = fileManager.deleteFile(uploaded.id)
      
      expect(deleted).toBe(true)
      expect(fileManager.getFile(uploaded.id)).toBeUndefined()
    })

    it('should return false when deleting non-existent file', () => {
      const deleted = fileManager.deleteFile('non-existent-id')
      
      expect(deleted).toBe(false)
    })

    it('should delete multiple files', async () => {
      const file1 = new File(['1'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['2'], 'file2.txt', { type: 'text/plain' })
      const file3 = new File(['3'], 'file3.txt', { type: 'text/plain' })
      
      const uploaded1 = await fileManager.uploadFile(file1)
      const uploaded2 = await fileManager.uploadFile(file2)
      const uploaded3 = await fileManager.uploadFile(file3)
      
      const deletedCount = fileManager.deleteFiles([uploaded1.id, uploaded3.id])
      
      expect(deletedCount).toBe(2)
      expect(fileManager.getFiles()).toHaveLength(1)
      expect(fileManager.getFile(uploaded2.id)).toBeDefined()
    })

    it('should clear all files', async () => {
      const file1 = new File(['1'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['2'], 'file2.txt', { type: 'text/plain' })
      
      await fileManager.uploadFile(file1)
      await fileManager.uploadFile(file2)
      
      fileManager.clearAll()
      
      expect(fileManager.getFiles()).toHaveLength(0)
    })
  })

  describe('Storage Size', () => {
    it('should calculate total storage size', async () => {
      const file1 = new File(['a'], 'file1.txt', { type: 'text/plain' })
      const file2 = new File(['bb'], 'file2.txt', { type: 'text/plain' })
      
      await fileManager.uploadFile(file1)
      await fileManager.uploadFile(file2)
      
      const totalSize = fileManager.getTotalSize()
      
      expect(totalSize).toBeGreaterThan(0)
    })
  })

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(fileManager.formatFileSize(0)).toBe('0 Bytes')
      expect(fileManager.formatFileSize(1024)).toBe('1 KB')
      expect(fileManager.formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(fileManager.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB')
    })

    it('should handle fractional values', () => {
      const result = fileManager.formatFileSize(1536) // 1.5 KB
      expect(result).toContain('1.5')
      expect(result).toContain('KB')
    })
  })

  describe('File Icons', () => {
    it('should return correct icons for file types', () => {
      expect(fileManager.getFileIcon('image/png')).toBe('🖼️')
      expect(fileManager.getFileIcon('video/mp4')).toBe('🎬')
      expect(fileManager.getFileIcon('audio/mp3')).toBe('🎵')
      expect(fileManager.getFileIcon('application/pdf')).toBe('📄')
      expect(fileManager.getFileIcon('text/plain')).toBe('📝')
      expect(fileManager.getFileIcon('application/unknown')).toBe('📁')
    })
  })

  describe('LocalStorage Persistence', () => {
    it('should persist files to localStorage', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      await fileManager.uploadFile(mockFile)
      
      // Check that localStorage has been updated
      const stored = localStorage.getItem('next-level-editor-files')
      expect(stored).toBeDefined()
      
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('test.txt')
    })

    it('should load files from localStorage on init', async () => {
      // Upload a file with first instance
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      await fileManager.uploadFile(mockFile)
      
      // Create a new instance
      const newManager = new FileManagerService()
      const files = newManager.getFiles()
      
      expect(files).toHaveLength(1)
      expect(files[0].name).toBe('test.txt')
    })

    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem('next-level-editor-files', 'invalid json')
      
      // Should not throw
      expect(() => new FileManagerService()).not.toThrow()
      
      const manager = new FileManagerService()
      expect(manager.getFiles()).toHaveLength(0)
    })
  })

  describe('Custom Options', () => {
    it('should respect custom max file size', async () => {
      const customManager = new FileManagerService({ maxFileSize: 100 })
      const largeFile = new File([new Array(200).join('a')], 'large.txt', { type: 'text/plain' })
      
      await expect(customManager.uploadFile(largeFile)).rejects.toThrow('exceeds maximum')
    })

    it('should respect custom allowed types', async () => {
      const customManager = new FileManagerService({ allowedTypes: ['image/*'] })
      const textFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      await expect(customManager.uploadFile(textFile)).rejects.toThrow('not allowed')
    })

    it('should use custom storage key', async () => {
      const customManager = new FileManagerService({ storageKey: 'custom-key' })
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })

      await customManager.uploadFile(mockFile)

      const stored = localStorage.getItem('custom-key')
      expect(stored).toBeDefined()
    })

    it('merges partial options over the defaults', async () => {
      // Only maxFileSize is overridden; the default allowedTypes must still
      // apply, so a text file (allowed by default) uploads fine.
      const customManager = new FileManagerService({ maxFileSize: 5 * 1024 })
      const textFile = new File(['ok'], 'notes.txt', { type: 'text/plain' })

      await expect(customManager.uploadFile(textFile)).resolves.toBeDefined()

      // ...but a PDF (also default-allowed) works too, proving defaults survived.
      const pdfFile = new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' })
      await expect(customManager.uploadFile(pdfFile)).resolves.toBeDefined()
    })
  })

  describe('File type allow-listing', () => {
    it('accepts an exact (non-wildcard) allowed type', async () => {
      const manager = new FileManagerService({ allowedTypes: ['application/pdf'] })
      const pdf = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })

      await expect(manager.uploadFile(pdf)).resolves.toBeDefined()
    })

    it('rejects a type that only partially matches an exact allowed type', async () => {
      const manager = new FileManagerService({ allowedTypes: ['application/pdf'] })
      // 'application/pdf-variant' shares a prefix but is not an exact match and
      // the allow entry is not a wildcard, so it must be rejected.
      const file = new File(['x'], 'x.bin', { type: 'application/pdf-variant' })

      await expect(manager.uploadFile(file)).rejects.toThrow('not allowed')
    })

    it('accepts any subtype under a wildcard allowed type', async () => {
      const manager = new FileManagerService({ allowedTypes: ['image/*'] })
      stubImage(() => new LoadableImage(50, 50))
      const gif = new File(['GIF'], 'a.gif', { type: 'image/gif' })

      await expect(manager.uploadFile(gif)).resolves.toBeDefined()
    })

    it('rejects when no allowed types are configured', async () => {
      const manager = new FileManagerService({ allowedTypes: [] })
      const file = new File(['x'], 'a.txt', { type: 'text/plain' })

      await expect(manager.uploadFile(file)).rejects.toThrow('not allowed')
    })

    it('rejects a file with an empty MIME type against default allow-list', async () => {
      // An empty type matches neither a wildcard prefix nor an exact entry.
      const manager = new FileManagerService()
      const file = new File(['x'], 'unknown', { type: '' })

      await expect(manager.uploadFile(file)).rejects.toThrow('not allowed')
    })
  })

  describe('getFiles ordering', () => {
    it('sorts by uploadedAt descending across multiple uploads', async () => {
      const manager = new FileManagerService()
      const a = await manager.uploadFile(new File(['a'], 'a.txt', { type: 'text/plain' }))
      const b = await manager.uploadFile(new File(['b'], 'b.txt', { type: 'text/plain' }))
      const c = await manager.uploadFile(new File(['c'], 'c.txt', { type: 'text/plain' }))

      // Force a strictly-decreasing chronological order regardless of how fast
      // the uploads ran, then verify the comparator reorders newest-first.
      manager.getFile(a.id)!.uploadedAt = new Date(1000)
      manager.getFile(b.id)!.uploadedAt = new Date(2000)
      manager.getFile(c.id)!.uploadedAt = new Date(3000)

      const names = manager.getFiles().map((f) => f.name)
      expect(names).toEqual(['c.txt', 'b.txt', 'a.txt'])
    })

    it('returns an empty array when no files exist', () => {
      const manager = new FileManagerService()
      expect(manager.getFiles()).toEqual([])
    })
  })

  describe('deleteFiles edge cases', () => {
    it('returns 0 and does not touch storage for an empty id list', async () => {
      const manager = new FileManagerService()
      await manager.uploadFile(new File(['a'], 'a.txt', { type: 'text/plain' }))

      const setSpy = vi.spyOn(Storage.prototype, 'setItem')
      const removed = manager.deleteFiles([])

      expect(removed).toBe(0)
      // deleted === 0, so the save-to-storage guard is skipped entirely.
      expect(setSpy).not.toHaveBeenCalled()
      setSpy.mockRestore()
    })

    it('counts only ids that actually existed', async () => {
      const manager = new FileManagerService()
      const a = await manager.uploadFile(new File(['a'], 'a.txt', { type: 'text/plain' }))

      const removed = manager.deleteFiles([a.id, 'ghost-1', 'ghost-2'])

      expect(removed).toBe(1)
      expect(manager.getFiles()).toHaveLength(0)
    })

    it('returns 0 when none of the ids exist', async () => {
      const manager = new FileManagerService()
      await manager.uploadFile(new File(['a'], 'a.txt', { type: 'text/plain' }))

      const removed = manager.deleteFiles(['nope-1', 'nope-2'])

      expect(removed).toBe(0)
      expect(manager.getFiles()).toHaveLength(1)
    })
  })

  describe('getTotalSize', () => {
    it('returns 0 when there are no files', () => {
      const manager = new FileManagerService()
      expect(manager.getTotalSize()).toBe(0)
    })

    it('sums the sizes of all stored files', async () => {
      const manager = new FileManagerService()
      const a = await manager.uploadFile(new File(['ab'], 'a.txt', { type: 'text/plain' }))
      const b = await manager.uploadFile(new File(['cdef'], 'b.txt', { type: 'text/plain' }))

      expect(manager.getTotalSize()).toBe(a.size + b.size)
    })

    it('drops back to 0 after clearAll', async () => {
      const manager = new FileManagerService()
      await manager.uploadFile(new File(['abc'], 'a.txt', { type: 'text/plain' }))
      expect(manager.getTotalSize()).toBeGreaterThan(0)

      manager.clearAll()
      expect(manager.getTotalSize()).toBe(0)
    })
  })

  describe('formatFileSize additional cases', () => {
    it('reports sub-kilobyte sizes in Bytes', () => {
      const manager = new FileManagerService()
      expect(manager.formatFileSize(1)).toBe('1 Bytes')
      expect(manager.formatFileSize(512)).toBe('512 Bytes')
      expect(manager.formatFileSize(1023)).toBe('1023 Bytes')
    })

    it('rounds to two decimal places', () => {
      const manager = new FileManagerService()
      // 1500 bytes = 1.46484375 KB -> rounds to 1.46 KB
      expect(manager.formatFileSize(1500)).toBe('1.46 KB')
    })

    it('formats megabyte and gigabyte magnitudes', () => {
      const manager = new FileManagerService()
      expect(manager.formatFileSize(5 * 1024 * 1024)).toBe('5 MB')
      expect(manager.formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB')
    })
  })

  describe('getFileIcon coverage', () => {
    it('returns the generic icon for an empty type string', () => {
      const manager = new FileManagerService()
      // No prefix matches and it is not application/pdf -> fallback folder icon.
      expect(manager.getFileIcon('')).toBe('📁')
    })

    it('matches video and audio wildcard prefixes', () => {
      const manager = new FileManagerService()
      expect(manager.getFileIcon('video/webm')).toBe('🎬')
      expect(manager.getFileIcon('audio/ogg')).toBe('🎵')
    })

    it('does not treat application/json as a PDF', () => {
      const manager = new FileManagerService()
      expect(manager.getFileIcon('application/json')).toBe('📁')
    })
  })

  describe('generated ids', () => {
    it('produces unique ids across uploads', async () => {
      const manager = new FileManagerService()
      const ids = new Set<string>()
      for (let i = 0; i < 20; i++) {
        const f = await manager.uploadFile(
          new File(['x'], `f${i}.txt`, { type: 'text/plain' })
        )
        ids.add(f.id)
        expect(f.id).toMatch(/^file_\d+_[a-z0-9]+$/)
      }
      expect(ids.size).toBe(20)
    })
  })

  describe('LocalStorage load edge cases', () => {
    it('leaves the file map empty when storage has no entry', () => {
      // localStorage was cleared in beforeEach, so getItem returns null and the
      // `if (stored)` guard is false.
      const manager = new FileManagerService()
      expect(manager.getFiles()).toEqual([])
    })

    it('revives uploadedAt as a real Date instance on load', async () => {
      const first = new FileManagerService()
      await first.uploadFile(new File(['x'], 'dated.txt', { type: 'text/plain' }))

      const reloaded = new FileManagerService()
      const [file] = reloaded.getFiles()

      expect(file.uploadedAt).toBeInstanceOf(Date)
      expect(Number.isNaN(file.uploadedAt.getTime())).toBe(false)
    })

    it('logs an error (does not throw) when JSON parsing fails', () => {
      localStorage.setItem('next-level-editor-files', '{ not valid')
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => new FileManagerService()).not.toThrow()
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load files from storage:',
        expect.any(Error)
      )
    })

    it('treats an empty stored array as no files', () => {
      localStorage.setItem('next-level-editor-files', '[]')
      const manager = new FileManagerService()
      expect(manager.getFiles()).toEqual([])
    })
  })

  describe('saveToStorage happy path', () => {
    it('writes the full JSON payload including data URLs when quota allows', async () => {
      const manager = new FileManagerService()
      await manager.uploadFile(new File(['hello'], 'a.txt', { type: 'text/plain' }))

      const raw = localStorage.getItem('next-level-editor-files')!
      const parsed = JSON.parse(raw) as Array<{ url: string; name: string }>

      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('a.txt')
      // The primary (non-degraded) save keeps the inline data URL.
      expect(parsed[0].url.startsWith('data:')).toBe(true)
    })
  })

  describe('exported singleton', () => {
    afterEach(() => {
      sharedFileManager.clearAll()
    })

    it('is a usable FileManagerService instance', async () => {
      expect(sharedFileManager).toBeInstanceOf(FileManagerService)

      const uploaded = await sharedFileManager.uploadFile(
        new File(['x'], 'singleton.txt', { type: 'text/plain' })
      )
      expect(sharedFileManager.getFile(uploaded.id)).toBeDefined()
    })
  })
})
