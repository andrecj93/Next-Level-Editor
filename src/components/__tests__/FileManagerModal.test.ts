import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import FileManagerModal from "../FileManagerModal.vue";
import { fileManager, type ManagedFile } from "../../utils/fileManager";

// Helper function to create wrapper
function createWrapper(props = {}) {
  return mount(FileManagerModal, {
    props: {
      isOpen: false,
      ...props,
    },
  });
}

// Mock fileManager
vi.mock("../../utils/fileManager", () => ({
  fileManager: {
    getFiles: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteFiles: vi.fn(),
    getFileIcon: vi.fn((type: string) => {
      if (type.startsWith("image/")) return "🖼️";
      if (type.startsWith("video/")) return "🎬";
      if (type.startsWith("audio/")) return "🎵";
      if (type.includes("pdf")) return "📄";
      return "📎";
    }),
    // Mirrors the real surface — the card template calls this per file (#R23-19).
    isContentAvailable: vi.fn(
      (file: { url?: string }) =>
        typeof file.url === "string" && file.url.length > 0
    ),
    formatFileSize: vi.fn((bytes: number) => {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
    }),
    getTotalSize: vi.fn(() => 0),
  },
}));

describe("FileManagerModal", () => {
  let wrapper: VueWrapper;
  const mockFiles: ManagedFile[] = [
    {
      id: "file-1",
      name: "image.png",
      size: 1024,
      type: "image/png",
      url: "blob:image1",
      thumbnail: "blob:thumb1",
      uploadedAt: new Date("2024-01-15"),
    },
    {
      id: "file-2",
      name: "document.pdf",
      size: 2048,
      type: "application/pdf",
      url: "blob:doc1",
      uploadedAt: new Date("2024-01-14"),
    },
    {
      id: "file-3",
      name: "video.mp4",
      size: 1048576, // 1MB
      type: "video/mp4",
      url: "blob:video1",
      uploadedAt: new Date("2024-01-10"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementations
    vi.mocked(fileManager.getFiles).mockReturnValue([]);
    vi.mocked(fileManager.getTotalSize).mockReturnValue(0);
    vi.mocked(fileManager.uploadFile).mockResolvedValue(mockFiles[0]);
    // Mock confirm globally
    globalThis.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.restoreAllMocks();
  });

  describe("Modal Visibility", () => {
    it("should not render when isOpen is false", () => {
      wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find(".modal-overlay").exists()).toBe(false);
    });

    it("should render when isOpen is true", () => {
      wrapper = createWrapper({ isOpen: true });
      expect(wrapper.find(".modal-overlay").exists()).toBe(true);
      expect(wrapper.find(".file-manager-modal").exists()).toBe(true);
    });

    it("should show modal title", () => {
      wrapper = createWrapper({ isOpen: true });
      expect(wrapper.find("#modal-title").text()).toBe("📁 File Manager");
    });

    it("should emit close when close button clicked", async () => {
      wrapper = createWrapper({ isOpen: true });
      await wrapper.find(".close-button").trigger("click");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("should emit close when overlay clicked", async () => {
      wrapper = createWrapper({ isOpen: true });
      await wrapper.find(".modal-overlay").trigger("click");
      expect(wrapper.emitted("close")).toBeTruthy();
    });

    it("should not emit close when modal content clicked", async () => {
      wrapper = createWrapper({ isOpen: true });
      await wrapper.find(".modal-content").trigger("click");
      expect(wrapper.emitted("close")).toBeFalsy();
    });
  });

  describe("File Loading", () => {
    it("should load files when modal opens", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: false });

      await wrapper.setProps({ isOpen: true });

      expect(fileManager.getFiles).toHaveBeenCalled();
    });

    it("should display empty state when no files", () => {
      vi.mocked(fileManager.getFiles).mockReturnValue([]);
      wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find(".drop-zone").exists()).toBe(true);
      expect(wrapper.find(".drop-text").text()).toBe(
        "Drag and drop files here"
      );
    });

    it("should display files when available", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: false });

      await wrapper.setProps({ isOpen: true });

      expect(wrapper.find(".file-container").exists()).toBe(true);
      expect(wrapper.find(".drop-zone").exists()).toBe(false);
    });

    it("should reset selected files when modal opens", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: false });

      // Simulate selection in previous session
      await wrapper.setProps({ isOpen: true });
      const vm = wrapper.vm as any;
      vm.selectedFiles = ["file-1"];

      // Close and reopen
      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({ isOpen: true });

      expect(vm.selectedFiles).toEqual([]);
    });

    it("should reset error message when modal opens", async () => {
      wrapper = createWrapper({ isOpen: false });

      await wrapper.setProps({ isOpen: true });
      const vm = wrapper.vm as any;
      vm.uploadResult = { uploaded: 0, failed: 1, reasons: [new Error('Test error')] };

      await wrapper.setProps({ isOpen: false });
      await wrapper.setProps({ isOpen: true });

      expect(vm.errorMessage).toBe("");
    });
  });

  describe("View Mode Toggle", () => {
    it("should highlight active view toggle button", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: true });

      const buttons = wrapper.findAll(".view-toggle");
      expect(buttons[0].classes()).toContain("active"); // Grid active by default
      expect(buttons[1].classes()).not.toContain("active");
    });

    it("should toggle viewMode internally", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      expect(vm.viewMode).toBe("grid");
      vm.viewMode = "list";
      expect(vm.viewMode).toBe("list");
    });
  });

  describe("File Upload", () => {
    it("should trigger file input when upload button clicked", async () => {
      wrapper = createWrapper({ isOpen: true });

      const fileInput = wrapper.find('input[type="file"]');
      const inputElement = fileInput.element as HTMLInputElement;
      const clickSpy = vi.fn();
      inputElement.click = clickSpy;

      await wrapper.find(".btn-primary").trigger("click");

      expect(clickSpy).toHaveBeenCalled();
    });

    it("should handle file selection", async () => {
      wrapper = createWrapper({ isOpen: true });

      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: [file],
        writable: false,
      });

      await fileInput.trigger("change");

      expect(fileManager.uploadFile).toHaveBeenCalledWith(file);
    });

    it("should reset file input after upload", async () => {
      wrapper = createWrapper({ isOpen: true });

      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: [file],
        writable: false,
      });

      await fileInput.trigger("change");
      await wrapper.vm.$nextTick();

      expect((fileInput.element as HTMLInputElement).value).toBe("");
    });

    it("should upload multiple files", async () => {
      wrapper = createWrapper({ isOpen: true });

      const files = [
        new File(["content1"], "test1.txt", { type: "text/plain" }),
        new File(["content2"], "test2.txt", { type: "text/plain" }),
      ];
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: files,
        writable: false,
      });

      await fileInput.trigger("change");

      expect(fileManager.uploadFile).toHaveBeenCalledTimes(2);
      expect(fileManager.uploadFile).toHaveBeenCalledWith(files[0]);
      expect(fileManager.uploadFile).toHaveBeenCalledWith(files[1]);
    });

    it("should show error count on upload failure", async () => {
      vi.mocked(fileManager.uploadFile).mockRejectedValueOnce(
        new Error("Upload failed")
      );
      wrapper = createWrapper({ isOpen: true });

      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: [file],
        writable: false,
      });

      await fileInput.trigger("change");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".error-message").text()).toContain(
        "0 files uploaded, 1 failed"
      );
    });

    it("should show partial success message when some uploads fail", async () => {
      vi.mocked(fileManager.uploadFile)
        .mockResolvedValueOnce(mockFiles[0])
        .mockRejectedValueOnce(new Error("Failed"));

      wrapper = createWrapper({ isOpen: true });

      const files = [
        new File(["content1"], "test1.txt", { type: "text/plain" }),
        new File(["content2"], "test2.txt", { type: "text/plain" }),
      ];
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: files,
        writable: false,
      });

      await fileInput.trigger("change");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".error-message").text()).toContain(
        "1 file uploaded, 1 failed"
      );
    });

    it("should clear error message on successful upload", async () => {
      wrapper = createWrapper({ isOpen: true });

      const vm = wrapper.vm as any;
      vm.uploadResult = { uploaded: 0, failed: 1, reasons: [new Error('Previous error')] };

      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const fileInput = wrapper.find('input[type="file"]');

      Object.defineProperty(fileInput.element, "files", {
        value: [file],
        writable: false,
      });

      await fileInput.trigger("change");
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".error-message").exists()).toBe(false);
    });
  });

  describe("Drag and Drop", () => {
    it("should show drag-over state on dragover", async () => {
      wrapper = createWrapper({ isOpen: true });

      const dropZone = wrapper.find(".drop-zone");
      await dropZone.trigger("dragover");

      expect(dropZone.classes()).toContain("drag-over");
    });

    it("should remove drag-over state on dragleave", async () => {
      wrapper = createWrapper({ isOpen: true });

      const dropZone = wrapper.find(".drop-zone");
      await dropZone.trigger("dragover");
      expect(dropZone.classes()).toContain("drag-over");

      await dropZone.trigger("dragleave");
      expect(dropZone.classes()).not.toContain("drag-over");
    });
  });

  describe("File Selection", () => {
    it("should toggle file selection internally", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.toggleFileSelection("file-1");
      expect(vm.selectedFiles).toContain("file-1");

      vm.toggleFileSelection("file-1");
      expect(vm.selectedFiles).not.toContain("file-1");
    });

    it("should support multi-select with Ctrl modifier", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.toggleFileSelection("file-1");
      expect(vm.selectedFiles).toEqual(["file-1"]);

      vm.toggleFileSelection("file-2", { ctrlKey: true });
      expect(vm.selectedFiles).toEqual(["file-1", "file-2"]);
    });

    it("should show delete button when files selected", async () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      expect(wrapper.find(".btn-danger").exists()).toBe(false);

      vm.selectedFiles = ["file-1"];
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".btn-danger").exists()).toBe(true);
      expect(wrapper.find(".btn-danger").text()).toContain("Delete (1)");
    });
  });

  describe("File Deletion", () => {
    it("should delete selected files in batch", async () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;
      vm.selectedFiles = ["file-1", "file-2"];
      await wrapper.vm.$nextTick();

      const deleteButton = wrapper.find(".btn-danger");
      await deleteButton.trigger("click");

      expect(globalThis.confirm).toHaveBeenCalledWith("Delete 2 files?");
      expect(fileManager.deleteFiles).toHaveBeenCalledWith([
        "file-1",
        "file-2",
      ]);
    });

    it("should clear selection after batch delete", async () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;
      vm.selectedFiles = ["file-1", "file-2"];
      await wrapper.vm.$nextTick();

      const deleteButton = wrapper.find(".btn-danger");
      await deleteButton.trigger("click");

      expect(vm.selectedFiles).toEqual([]);
    });

    it("should call deleteFile when deleting single file", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.deleteFile("file-1");

      expect(fileManager.deleteFile).toHaveBeenCalledWith("file-1");
    });

    it("should not delete if user cancels confirmation", () => {
      vi.mocked(globalThis.confirm).mockReturnValueOnce(false);
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.deleteFile("file-1");

      expect(fileManager.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("File Insertion", () => {
    it("should emit insert and close events", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.insertFile(mockFiles[0]);

      expect(wrapper.emitted("insert")).toBeTruthy();
      expect(wrapper.emitted("insert")![0]).toEqual([mockFiles[0]]);
      expect(wrapper.emitted("close")).toBeTruthy();
    });
  });

  describe("File Display Helpers", () => {
    it("should call getFileIcon for file types", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.getFileIcon("image/png");
      expect(fileManager.getFileIcon).toHaveBeenCalledWith("image/png");
    });

    it("should format byte quantities for display", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      expect(vm.formatFileSize(1024)).toBe('1 KB');
      expect(vm.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format date as "Today" for today', () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      const today = new Date();
      const result = vm.formatDate(today);
      expect(result).toBe("Today");
    });

    it('should format date as "Yesterday" for yesterday', () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = vm.formatDate(yesterday);
      expect(result).toBe("Yesterday");
    });

    it("should format date as days ago for recent dates", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = vm.formatDate(threeDaysAgo);
      expect(result).toBe("3 days ago");
    });

    it("should format date as locale string for old dates", () => {
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      const oldDate = new Date("2023-01-01");
      const result = vm.formatDate(oldDate);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });
  });

  describe("Storage Info", () => {
    it("should not display storage info when no files", () => {
      vi.mocked(fileManager.getFiles).mockReturnValue([]);
      wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find(".storage-info").exists()).toBe(false);
    });

    it("should show max file size in drop zone", () => {
      wrapper = createWrapper({ isOpen: true });

      const dropInfo = wrapper.find(".drop-info");
      expect(dropInfo.text()).toContain("Max file size:");
      expect(dropInfo.text()).toContain("10 MB");
    });

    it("should compute totalSize reactively from the loaded files", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: false });

      await wrapper.setProps({ isOpen: true });
      const vm = wrapper.vm as any;

      // Sum of mockFiles sizes: 1024 + 2048 + 1048576
      expect(vm.totalSize).toBe(1024 + 2048 + 1048576);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty file list gracefully", () => {
      vi.mocked(fileManager.getFiles).mockReturnValue([]);
      wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find(".drop-zone").exists()).toBe(true);
      expect(wrapper.findAll(".file-card").length).toBe(0);
    });

    it("should handle file upload without files", async () => {
      wrapper = createWrapper({ isOpen: true });

      const fileInput = wrapper.find('input[type="file"]');
      Object.defineProperty(fileInput.element, "files", {
        value: null,
        writable: false,
      });

      await fileInput.trigger("change");

      expect(fileManager.uploadFile).not.toHaveBeenCalled();
    });

    it("should handle drop event without files", async () => {
      wrapper = createWrapper({ isOpen: true });

      const dropZone = wrapper.find(".drop-zone");
      const dropEvent = new DragEvent("drop", {
        dataTransfer: new DataTransfer(),
      });

      await dropZone.trigger("drop", { dataTransfer: dropEvent.dataTransfer });

      expect(fileManager.uploadFile).not.toHaveBeenCalled();
    });

    it("should handle selection with non-existent file ID", async () => {
      vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
      wrapper = createWrapper({ isOpen: true });
      const vm = wrapper.vm as any;

      vm.toggleFileSelection("non-existent-id");

      expect(vm.selectedFiles).toContain("non-existent-id");
    });
  });
});
