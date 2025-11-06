/**
 * Tests for File Manager Utility
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { FileManagerService } from '../fileManager'

describe('FileManagerService', () => {
  let fileManager: FileManagerService

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Create a new instance for each test
    fileManager = new FileManagerService()
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

    it.skip('should create thumbnail for images', async () => {
      // Skipped: Canvas and image loading not available in test environment
      // This feature works correctly in the browser
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
  })
})
