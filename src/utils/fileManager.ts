/**
 * File Manager Utility
 * 
 * Provides file management capabilities similar to CKBox for the editor.
 * Stores files in-memory with localStorage persistence for demo purposes.
 * In production, this should be replaced with actual server-side storage.
 */

export interface ManagedFile {
  id: string
  name: string
  type: string
  size: number
  url: string
  uploadedAt: Date
  thumbnail?: string
}

export interface FileManagerOptions {
  maxFileSize?: number // in bytes
  allowedTypes?: string[]
  storageKey?: string
}

const DEFAULT_OPTIONS: Required<FileManagerOptions> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/*', 'application/pdf', 'text/*'],
  storageKey: 'next-level-editor-files'
}

class FileManagerService {
  private files: Map<string, ManagedFile> = new Map()
  private options: Required<FileManagerOptions>

  constructor(options: FileManagerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.loadFromStorage()
  }

  /**
   * Upload a file and store it
   */
  async uploadFile(file: File): Promise<ManagedFile> {
    // Validate file size
    if (file.size > this.options.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.formatFileSize(this.options.maxFileSize)}`)
    }

    // Validate file type
    if (!this.isFileTypeAllowed(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`)
    }

    // Generate unique ID
    const id = this.generateId()

    // Convert file to data URL
    const url = await this.fileToDataUrl(file)

    // Create thumbnail for images
    let thumbnail: string | undefined
    if (file.type.startsWith('image/')) {
      thumbnail = await this.createThumbnail(url)
    }

    const managedFile: ManagedFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      uploadedAt: new Date(),
      thumbnail
    }

    this.files.set(id, managedFile)
    this.saveToStorage()

    return managedFile
  }

  /**
   * Get all files
   */
  getFiles(): ManagedFile[] {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    )
  }

  /**
   * Get a specific file by ID
   */
  getFile(id: string): ManagedFile | undefined {
    return this.files.get(id)
  }

  /**
   * Delete a file
   */
  deleteFile(id: string): boolean {
    const deleted = this.files.delete(id)
    if (deleted) {
      this.saveToStorage()
    }
    return deleted
  }

  /**
   * Delete multiple files
   */
  deleteFiles(ids: string[]): number {
    let deleted = 0
    ids.forEach(id => {
      if (this.files.delete(id)) {
        deleted++
      }
    })
    if (deleted > 0) {
      this.saveToStorage()
    }
    return deleted
  }

  /**
   * Clear all files
   */
  clearAll(): void {
    this.files.clear()
    this.saveToStorage()
  }

  /**
   * Get total storage size used
   */
  getTotalSize(): number {
    return Array.from(this.files.values()).reduce((total, file) => total + file.size, 0)
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(type: string): string {
    if (type.startsWith('image/')) return '🖼️'
    if (type.startsWith('video/')) return '🎬'
    if (type.startsWith('audio/')) return '🎵'
    if (type === 'application/pdf') return '📄'
    if (type.startsWith('text/')) return '📝'
    return '📁'
  }

  // Private methods

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isFileTypeAllowed(type: string): boolean {
    return this.options.allowedTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2)
        return type.startsWith(prefix)
      }
      return type === allowed
    })
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private async createThumbnail(dataUrl: string, maxSize = 200): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = dataUrl
    })
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.options.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        this.files = new Map(
          parsed.map((file: any) => [
            file.id,
            {
              ...file,
              uploadedAt: new Date(file.uploadedAt)
            }
          ])
        )
      }
    } catch (error) {
      console.error('Failed to load files from storage:', error)
    }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.files.values())
      localStorage.setItem(this.options.storageKey, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save files to storage:', error)
    }
  }
}

// Export singleton instance
export const fileManager = new FileManagerService()

// Export for testing
export { FileManagerService }
