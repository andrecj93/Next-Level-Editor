/**
 * File Manager Utility
 *
 * Provides file management capabilities similar to CKBox for the editor.
 * Stores files in-memory with localStorage persistence for demo purposes.
 * In production, this should be replaced with actual server-side storage.
 */

export interface ManagedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  thumbnail?: string;
}

export interface FileManagerOptions {
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  storageKey?: string;
}

const DEFAULT_OPTIONS: Required<FileManagerOptions> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ["image/*", "application/pdf", "text/*"],
  storageKey: "next-level-editor-files",
};

/**
 * Types a broad "text/*" allowance would admit but the sanitizer refuses to
 * persist as a data: URL. Mirrors SAFE_DATA_FILE_PATTERN EXACTLY — its rule is
 * `text/(?!html\b)`, i.e. text/html is the single exclusion; every image/* type
 * (SVG included, which is safe in an <img> context) and application/pdf stay
 * allowed. Refusing more here would silently delete working upload support.
 * #r21-3
 */
const REFUSED_MARKUP_TYPES = new Set(["text/html"]);

class FileManagerService {
  private files: Map<string, ManagedFile> = new Map();
  private options: Required<FileManagerOptions>;

  constructor(options: FileManagerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
  }

  /**
   * Upload a file and store it
   */
  async uploadFile(file: File): Promise<ManagedFile> {
    // Validate file size
    if (file.size > this.options.maxFileSize) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.formatFileSize(
          this.options.maxFileSize
        )}`
      );
    }

    // Validate file type
    if (!this.isFileTypeAllowed(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Generate unique ID
    const id = this.generateId();

    // Convert file to data URL
    const url = await this.fileToDataUrl(file);

    // Create thumbnail for images. A browser that cannot decode the image
    // (a .heic in Chrome, a corrupt .png) rejects here — but the FILE is fine,
    // so the failure must only skip the thumbnail, never fail the whole upload.
    // It used to reject the upload with a bare "Upload failed" (createThumbnail
    // hands back a DOM Event, not an Error). #R23-16
    let thumbnail: string | undefined;
    if (file.type.startsWith("image/")) {
      try {
        thumbnail = await this.createThumbnail(url);
      } catch {
        thumbnail = undefined;
      }
    }

    const managedFile: ManagedFile = {
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      url,
      uploadedAt: new Date(),
      thumbnail,
    };

    this.files.set(id, managedFile);
    this.saveToStorage();

    return managedFile;
  }

  /**
   * Whether a file still has its inline content and can be inserted. A
   * quota-degraded save (saveToStorage) drops the largest payloads and leaves
   * `url = ""` behind — the card still looked normal, and inserting it emitted
   * `<img src="">` / `<a href="">`. Callers check this before inserting and the
   * File Manager badges a file that fails it. #R23-19
   */
  isContentAvailable(file: ManagedFile): boolean {
    return typeof file.url === "string" && file.url.length > 0;
  }

  /**
   * Get all files
   */
  getFiles(): ManagedFile[] {
    return Array.from(this.files.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  /**
   * Get a specific file by ID
   */
  getFile(id: string): ManagedFile | undefined {
    return this.files.get(id);
  }

  /**
   * Delete a file
   */
  deleteFile(id: string): boolean {
    const deleted = this.files.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Delete multiple files
   */
  deleteFiles(ids: string[]): number {
    let deleted = 0;
    ids.forEach((id) => {
      if (this.files.delete(id)) {
        deleted++;
      }
    });
    if (deleted > 0) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Clear all files
   */
  clearAll(): void {
    this.files.clear();
    this.saveToStorage();
  }

  /**
   * Get total storage size used
   */
  getTotalSize(): number {
    return Array.from(this.files.values()).reduce(
      (total, file) => total + file.size,
      0
    );
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  }

  /**
   * Get file icon based on type
   */
  getFileIcon(type: string): string {
    if (type.startsWith("image/")) return "🖼️";
    if (type.startsWith("video/")) return "🎬";
    if (type.startsWith("audio/")) return "🎵";
    if (type === "application/pdf") return "📄";
    if (type.startsWith("text/")) return "📝";
    return "📁";
  }

  // Private methods

  private generateId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private isFileTypeAllowed(type: string): boolean {
    // The sanitizer deliberately refuses to persist a data:text/html payload
    // (it is a script-execution vector if it ever reaches a navigation), so a
    // markup upload matched by a broad "text/*" rule was accepted here and then
    // had its link and bytes silently discarded on save. Refusing up front is
    // honest; accepting and dropping later is data loss. #r21-3
    if (REFUSED_MARKUP_TYPES.has(type.toLowerCase())) return false;
    return this.options.allowedTypes.some((allowed) => {
      if (allowed.endsWith("/*")) {
        const prefix = allowed.slice(0, -2);
        return type.startsWith(prefix);
      }
      return type === allowed;
    });
  }

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async createThumbnail(
    dataUrl: string,
    maxSize = 200
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * The localStorage backing store, or null when it's unavailable — a server
   * (no globals), a sandboxed iframe, or a browser with storage disabled (where
   * even *accessing* localStorage throws SecurityError). Guarding here keeps the
   * singleton's import-time construction silent in SSR instead of logging a
   * "localStorage is not defined" error on every render.
   */
  private getStore(): Storage | null {
    try {
      return typeof localStorage !== "undefined" ? localStorage : null;
    } catch {
      return null;
    }
  }

  private loadFromStorage(): void {
    const store = this.getStore();
    if (!store) return;
    try {
      const stored = store.getItem(this.options.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Array<
          Omit<ManagedFile, "uploadedAt"> & { uploadedAt: string }
        >;
        this.files = new Map(
          parsed.map((file) => [
            file.id,
            {
              ...file,
              uploadedAt: new Date(file.uploadedAt),
            },
          ])
        );
      }
    } catch (error) {
      // Non-fatal: corrupt JSON or a storage that throws on read. The app
      // continues with an empty file list, so this is a warning, not an error.
      console.warn("Failed to load files from storage:", error);
    }
  }

  private saveToStorage(): void {
    const store = this.getStore();
    if (!store) return;
    const data = Array.from(this.files.values());

    try {
      store.setItem(this.options.storageKey, JSON.stringify(data));
      return;
    } catch (error) {
      // Likely a QuotaExceededError caused by large data-URL blobs.
      // Fall through to a degraded save so existing files aren't lost.
      console.warn(
        "Failed to persist files to storage, retrying without inline data:",
        error
      );
    }

    // Degrade SELECTIVELY: drop inline data-URL payloads LARGEST-FIRST,
    // retrying after each drop, so every file that still fits keeps its
    // bytes. The old fallback blanked EVERY payload at once — one oversized
    // upload silently wiped the stored bytes of files that had persisted
    // fine for weeks, while the upload reported success. Each droppable
    // payload is an individual data-URL field (a file's url OR its thumbnail).
    const entries = data.map((file) => ({ ...file }));
    type Payload = { file: (typeof entries)[number]; field: "url" | "thumbnail" };
    const payloads: Array<{ payload: Payload; size: number }> = [];
    for (const file of entries) {
      if (this.isDataUrl(file.url)) {
        payloads.push({ payload: { file, field: "url" }, size: file.url.length });
      }
      if (file.thumbnail && this.isDataUrl(file.thumbnail)) {
        payloads.push({
          payload: { file, field: "thumbnail" },
          size: file.thumbnail.length,
        });
      }
    }
    payloads.sort((a, b) => b.size - a.size);

    const degraded = new Set<string>();
    for (const { payload } of payloads) {
      if (payload.field === "url") {
        payload.file.url = "";
      } else {
        payload.file.thumbnail = undefined;
      }
      degraded.add(payload.file.name);
      try {
        store.setItem(this.options.storageKey, JSON.stringify(entries));
        console.warn(
          `Storage quota exceeded: persisted without inline data for ${[...degraded].join(", ")}. ` +
            "These files keep working this session but lose their content on reload."
        );
        return;
      } catch {
        // Still too big — drop the next-largest payload and retry.
      }
    }

    // Last resort: even metadata-only doesn't fit.
    try {
      store.setItem(this.options.storageKey, JSON.stringify(entries));
    } catch (error) {
      // Nothing more we can do; keep the in-memory files intact and don't throw.
      console.warn("Failed to persist file metadata to storage:", error);
    }
  }

  private isDataUrl(value: string | undefined): boolean {
    return typeof value === "string" && value.startsWith("data:");
  }
}

// Export singleton instance
export const fileManager = new FileManagerService();

// Export for testing
export { FileManagerService };
