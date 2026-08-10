import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import FileManagerModal from "../FileManagerModal.vue";
import { fileManager } from "../../utils/fileManager";

vi.mock("../../utils/fileManager", () => ({
  fileManager: {
    getFiles: vi.fn(() => []),
    uploadFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteFiles: vi.fn(),
    getFileIcon: vi.fn(() => "📎"),
    formatFileSize: vi.fn(() => "1 KB"),
  },
}));

/**
 * The upload loop captured each failure's reason ("File type X not allowed",
 * "File size exceeds…") but the summary then OVERWROTE it with a bare
 * "N file(s) uploaded, M failed" — so the user saw a failure with no cause and
 * no way to know what to fix. The summary must carry the reason(s).
 */
let wrapper: VueWrapper<InstanceType<typeof FileManagerModal>> | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(fileManager.getFiles).mockReturnValue([]);
});

const uploadThrough = async (files: File[]) => {
  wrapper = mount(FileManagerModal, { props: { isOpen: true } });
  const input = wrapper.find('input[type="file"]');
  Object.defineProperty(input.element, "files", {
    value: files,
    writable: false,
  });
  await input.trigger("change");
  await wrapper.vm.$nextTick();
};

describe("FileManagerModal surfaces the upload failure reason", () => {
  it("includes the error cause, not just the count", async () => {
    vi.mocked(fileManager.uploadFile).mockRejectedValueOnce(
      new Error("File type application/x-msdownload is not allowed")
    );
    await uploadThrough([
      new File(["x"], "app.exe", { type: "application/x-msdownload" }),
    ]);

    const msg = wrapper!.find(".error-message").text();
    expect(msg).toContain("1 failed");
    // The WHY must be present.
    expect(msg).toContain("not allowed");
  });

  it("de-duplicates identical reasons across multiple files", async () => {
    vi.mocked(fileManager.uploadFile)
      .mockRejectedValueOnce(new Error("File size exceeds maximum"))
      .mockRejectedValueOnce(new Error("File size exceeds maximum"));
    await uploadThrough([
      new File(["x"], "a.bin", { type: "application/octet-stream" }),
      new File(["y"], "b.bin", { type: "application/octet-stream" }),
    ]);

    const msg = wrapper!.find(".error-message").text();
    expect(msg).toContain("2 failed");
    // "exceeds maximum" appears once, not twice.
    expect(msg.match(/exceeds maximum/g)).toHaveLength(1);
  });
});
