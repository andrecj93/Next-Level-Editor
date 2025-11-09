import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useToastNotification } from "../useToastNotification";

describe("useToastNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize with toast hidden", () => {
      const { showToast } = useToastNotification();
      expect(showToast.value).toBe(false);
    });

    it("should initialize with empty message", () => {
      const { toastMessage } = useToastNotification();
      expect(toastMessage.value).toBe("");
    });

    it("should initialize with success type", () => {
      const { toastType } = useToastNotification();
      expect(toastType.value).toBe("success");
    });
  });

  describe("show()", () => {
    it("should display toast with success message", () => {
      const { show, showToast, toastMessage, toastType } =
        useToastNotification();

      show("Operation successful");

      expect(showToast.value).toBe(true);
      expect(toastMessage.value).toBe("Operation successful");
      expect(toastType.value).toBe("success");
    });

    it("should display toast with error message", () => {
      const { show, showToast, toastMessage, toastType } =
        useToastNotification();

      show("Operation failed", "error");

      expect(showToast.value).toBe(true);
      expect(toastMessage.value).toBe("Operation failed");
      expect(toastType.value).toBe("error");
    });

    it("should auto-hide toast after default duration (3000ms)", () => {
      const { show, showToast } = useToastNotification();

      show("Test message");
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(3000);
      expect(showToast.value).toBe(false);
    });

    it("should auto-hide toast after custom duration", () => {
      const { show, showToast } = useToastNotification();

      show("Test message", "success", 5000);
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(4999);
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(1);
      expect(showToast.value).toBe(false);
    });

    it("should update message if shown multiple times", () => {
      const { show, toastMessage } = useToastNotification();

      show("First message");
      expect(toastMessage.value).toBe("First message");

      show("Second message");
      expect(toastMessage.value).toBe("Second message");
    });

    it("should handle rapid successive calls", () => {
      const { show, showToast, toastMessage } = useToastNotification();

      show("Message 1", "success", 1000);
      show("Message 2", "error", 1000);

      expect(showToast.value).toBe(true);
      expect(toastMessage.value).toBe("Message 2");

      vi.advanceTimersByTime(1000);
      // Last message timer should hide it
      expect(showToast.value).toBe(false);
    });
  });

  describe("hide()", () => {
    it("should hide toast immediately", () => {
      const { show, hide, showToast } = useToastNotification();

      show("Test message");
      expect(showToast.value).toBe(true);

      hide();
      expect(showToast.value).toBe(false);
    });

    it("should hide toast before auto-hide timer", () => {
      const { show, hide, showToast } = useToastNotification();

      show("Test message", "success", 5000);
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(2000);
      hide();
      expect(showToast.value).toBe(false);

      // Auto-hide timer should not affect it
      vi.advanceTimersByTime(3000);
      expect(showToast.value).toBe(false);
    });

    it("should be safe to call when toast is already hidden", () => {
      const { hide, showToast } = useToastNotification();

      expect(showToast.value).toBe(false);
      hide();
      expect(showToast.value).toBe(false);
    });
  });

  describe("Message preservation", () => {
    it("should preserve message after hiding", () => {
      const { show, hide, toastMessage } = useToastNotification();

      show("Important message");
      hide();

      expect(toastMessage.value).toBe("Important message");
    });

    it("should preserve type after hiding", () => {
      const { show, hide, toastType } = useToastNotification();

      show("Error message", "error");
      hide();

      expect(toastType.value).toBe("error");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty message", () => {
      const { show, toastMessage, showToast } = useToastNotification();

      show("");

      expect(toastMessage.value).toBe("");
      expect(showToast.value).toBe(true);
    });

    it("should handle very long messages", () => {
      const { show, toastMessage } = useToastNotification();
      const longMessage = "A".repeat(1000);

      show(longMessage);

      expect(toastMessage.value).toBe(longMessage);
    });

    it("should handle zero duration", () => {
      const { show, showToast } = useToastNotification();

      show("Test", "success", 0);
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(0);
      expect(showToast.value).toBe(false);
    });

    it("should handle negative duration as positive", () => {
      const { show, showToast } = useToastNotification();

      show("Test", "success", -1000);
      expect(showToast.value).toBe(true);

      // setTimeout with negative value behaves same as 0
      vi.advanceTimersByTime(0);
      expect(showToast.value).toBe(false);
    });
  });
});
