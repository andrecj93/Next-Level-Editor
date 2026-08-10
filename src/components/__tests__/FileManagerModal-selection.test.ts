/**
 * Tests for the grid/list checkbox selection toggle in FileManagerModal.
 *
 * Covers issue #36: clicking a file's checkbox must toggle ONLY that file's
 * selection instead of clearing every other selection (single-select logic).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import FileManagerModal from "../FileManagerModal.vue";
import { fileManager, type ManagedFile } from "../../utils/fileManager";

vi.mock("../../utils/fileManager", () => ({
  fileManager: {
    getFiles: vi.fn(),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteFiles: vi.fn(),
    getFileIcon: vi.fn(() => "📎"),
    // Mirrors the real surface — the card template calls this per file (#R23-19).
    isContentAvailable: vi.fn(
      (file) => typeof file.url === "string" && file.url.length > 0
    ),
    formatFileSize: vi.fn((bytes: number) => `${bytes} B`),
    getTotalSize: vi.fn(() => 0),
  },
}));

const mockFiles: ManagedFile[] = [
  {
    id: "file-1",
    name: "a.txt",
    size: 10,
    type: "text/plain",
    url: "blob:a",
    uploadedAt: new Date("2024-01-15"),
  },
  {
    id: "file-2",
    name: "b.txt",
    size: 20,
    type: "text/plain",
    url: "blob:b",
    uploadedAt: new Date("2024-01-14"),
  },
  {
    id: "file-3",
    name: "c.txt",
    size: 30,
    type: "text/plain",
    url: "blob:c",
    uploadedAt: new Date("2024-01-13"),
  },
];

function createWrapper(props = {}) {
  return mount(FileManagerModal, {
    props: { isOpen: false, ...props },
  });
}

describe("FileManagerModal checkbox selection toggle", () => {
  let wrapper: VueWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fileManager.getFiles).mockReturnValue(mockFiles);
    globalThis.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    wrapper?.unmount();
  });

  it("exposes a single-item toggle that does not clear other selections", async () => {
    wrapper = createWrapper({ isOpen: false });
    await wrapper.setProps({ isOpen: true });
    const vm = wrapper.vm as any;

    // Pre-select two files.
    vm.selectedFiles = ["file-1", "file-2"];

    // Toggling a third file's checkbox adds it, keeping the others.
    vm.toggleSingleSelection("file-3");
    expect(vm.selectedFiles).toEqual(["file-1", "file-2", "file-3"]);

    // Toggling an already-selected file removes only that file.
    vm.toggleSingleSelection("file-1");
    expect(vm.selectedFiles).toEqual(["file-2", "file-3"]);
  });

  it("grid checkbox click toggles only its own file, preserving others", async () => {
    wrapper = createWrapper({ isOpen: false });
    await wrapper.setProps({ isOpen: true });
    const vm = wrapper.vm as any;

    // Force grid view and pre-select the first file.
    vm.viewMode = "grid";
    vm.selectedFiles = ["file-1"];
    await wrapper.vm.$nextTick();

    const checkboxes = wrapper.findAll('.file-card .file-checkbox input');
    expect(checkboxes.length).toBe(mockFiles.length);

    // Click the checkbox of the SECOND card.
    await checkboxes[1].trigger("click");

    // The first selection must be preserved, and the second added.
    expect(vm.selectedFiles).toContain("file-1");
    expect(vm.selectedFiles).toContain("file-2");
    expect(vm.selectedFiles).toHaveLength(2);
  });

  it("grid checkbox click on a selected file deselects only that file", async () => {
    wrapper = createWrapper({ isOpen: false });
    await wrapper.setProps({ isOpen: true });
    const vm = wrapper.vm as any;

    vm.viewMode = "grid";
    vm.selectedFiles = ["file-1", "file-2"];
    await wrapper.vm.$nextTick();

    const checkboxes = wrapper.findAll('.file-card .file-checkbox input');
    await checkboxes[0].trigger("click");

    expect(vm.selectedFiles).toEqual(["file-2"]);
  });
});
