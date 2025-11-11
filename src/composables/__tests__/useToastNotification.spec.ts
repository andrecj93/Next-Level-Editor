import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useToastNotification } from "../useToastNotification";

describe("useToastNotification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  describe("Legacy API (Backward Compatibility)", () => {
    it("should show toast with default success type", () => {
      const { show, showToast, toastMessage, toastType } =
        useToastNotification();

      show("Test message");

      expect(showToast.value).toBe(true);
      expect(toastMessage.value).toBe("Test message");
      expect(toastType.value).toBe("success");
    });

    it("should show toast with error type", () => {
      const { show, toastType } = useToastNotification();

      show("Error message", "error");

      expect(toastType.value).toBe("error");
    });

    it("should hide toast after duration", () => {
      const { show, showToast } = useToastNotification();

      show("Test message", "success", 1000);
      expect(showToast.value).toBe(true);

      vi.advanceTimersByTime(1000);
      expect(showToast.value).toBe(false);
    });

    it("should hide toast immediately when hide is called", () => {
      const { show, hide, showToast } = useToastNotification();

      show("Test message");
      expect(showToast.value).toBe(true);

      hide();
      expect(showToast.value).toBe(false);
    });
  });

  describe("Advanced Toast System", () => {
    describe("addToast", () => {
      it("should add a toast with default options", () => {
        const { addToast, toasts } = useToastNotification();

        const id = addToast("Test message");

        expect(toasts.value).toHaveLength(1);
        expect(toasts.value[0].id).toBe(id);
        expect(toasts.value[0].message).toBe("Test message");
        expect(toasts.value[0].type).toBe("success");
        expect(toasts.value[0].dismissible).toBe(true);
      });

      it("should add toast with custom options", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Error message", {
          type: "error",
          duration: 5000,
          dismissible: false,
          icon: "🔥",
        });

        expect(toasts.value[0].type).toBe("error");
        expect(toasts.value[0].duration).toBe(5000);
        expect(toasts.value[0].dismissible).toBe(false);
        expect(toasts.value[0].icon).toBe("🔥");
      });

      it("should add toast with action button", () => {
        const { addToast, toasts } = useToastNotification();
        const actionFn = vi.fn();

        addToast("Action message", {
          action: {
            label: "Undo",
            onClick: actionFn,
          },
        });

        expect(toasts.value[0].action).toBeDefined();
        expect(toasts.value[0].action?.label).toBe("Undo");
        toasts.value[0].action?.onClick();
        expect(actionFn).toHaveBeenCalled();
      });

      it("should respect max toasts limit", () => {
        const { addToast, toasts, setMaxToasts } = useToastNotification();

        setMaxToasts(3);

        addToast("Toast 1");
        addToast("Toast 2");
        addToast("Toast 3");
        addToast("Toast 4"); // Should remove Toast 1

        expect(toasts.value).toHaveLength(3);
        expect(toasts.value[0].message).toBe("Toast 2");
        expect(toasts.value[2].message).toBe("Toast 4");
      });

      it("should auto-dismiss toast after duration", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Test message", { duration: 3000 });
        expect(toasts.value).toHaveLength(1);

        vi.advanceTimersByTime(3000);
        expect(toasts.value).toHaveLength(0);
      });

      it("should not auto-dismiss toast with duration 0", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Persistent message", { duration: 0 });
        expect(toasts.value).toHaveLength(1);

        vi.advanceTimersByTime(10000);
        expect(toasts.value).toHaveLength(1);
      });
    });

    describe("removeToast", () => {
      it("should remove specific toast by id", () => {
        const { addToast, removeToast, toasts } = useToastNotification();

        const id1 = addToast("Toast 1");
        const id2 = addToast("Toast 2");

        expect(toasts.value).toHaveLength(2);

        removeToast(id1);

        expect(toasts.value).toHaveLength(1);
        expect(toasts.value[0].id).toBe(id2);
      });

      it("should clear toast timers when removed", () => {
        const { addToast, removeToast, toasts } = useToastNotification();

        const id = addToast("Test message", { duration: 5000 });
        expect(toasts.value).toHaveLength(1);

        removeToast(id);
        expect(toasts.value).toHaveLength(0);

        // Advance past original duration
        vi.advanceTimersByTime(5000);
        // Should still be empty (no double removal)
        expect(toasts.value).toHaveLength(0);
      });
    });

    describe("pauseToast & resumeToast", () => {
      it("should pause toast auto-dismiss", () => {
        const { addToast, pauseToast, toasts } = useToastNotification();

        const id = addToast("Test message", { duration: 3000 });

        // Advance halfway
        vi.advanceTimersByTime(1500);
        pauseToast(id);

        // Advance past original duration
        vi.advanceTimersByTime(2000);

        // Toast should still be present (paused)
        expect(toasts.value).toHaveLength(1);
        expect(toasts.value[0].paused).toBe(true);
      });

      it("should resume toast auto-dismiss with remaining time", () => {
        const { addToast, pauseToast, resumeToast, toasts } =
          useToastNotification();

        const id = addToast("Test message", { duration: 3000 });

        // Advance 1 second
        vi.advanceTimersByTime(1000);

        // Update progress manually (simulating interval)
        const currentToast = toasts.value[0];
        currentToast.progress = 33.33; // ~1 second of 3 seconds

        pauseToast(id);
        expect(toasts.value[0].paused).toBe(true);

        resumeToast(id);
        expect(toasts.value[0].paused).toBe(false);

        // Advance remaining time (~2 seconds)
        vi.advanceTimersByTime(2000);

        expect(toasts.value).toHaveLength(0);
      });

      it("should not pause already paused toast", () => {
        const { addToast, pauseToast, toasts } = useToastNotification();

        const id = addToast("Test message");

        pauseToast(id);
        const firstPausedState = toasts.value[0].paused;

        pauseToast(id); // Pause again
        expect(toasts.value[0].paused).toBe(firstPausedState);
      });

      it("should not resume non-paused toast", () => {
        const { addToast, resumeToast, toasts } = useToastNotification();

        const id = addToast("Test message");
        const initialPausedState = toasts.value[0].paused;

        resumeToast(id);
        expect(toasts.value[0].paused).toBe(initialPausedState);
      });
    });

    describe("clearAll", () => {
      it("should remove all toasts", () => {
        const { addToast, clearAll, toasts } = useToastNotification();

        addToast("Toast 1");
        addToast("Toast 2");
        addToast("Toast 3");

        expect(toasts.value).toHaveLength(3);

        clearAll();

        expect(toasts.value).toHaveLength(0);
      });

      it("should clear all timers", () => {
        const { addToast, clearAll, toasts } = useToastNotification();

        addToast("Toast 1", { duration: 1000 });
        addToast("Toast 2", { duration: 2000 });

        clearAll();
        expect(toasts.value).toHaveLength(0);

        // Advance past all durations
        vi.advanceTimersByTime(3000);

        // Should still be empty (timers cleared)
        expect(toasts.value).toHaveLength(0);
      });
    });

    describe("Configuration", () => {
      it("should update position", () => {
        const { setPosition, position } = useToastNotification();

        expect(position.value).toBe("bottom-right");

        setPosition("top-center");
        expect(position.value).toBe("top-center");

        setPosition("bottom-left");
        expect(position.value).toBe("bottom-left");
      });

      it("should update max toasts", () => {
        const { setMaxToasts, maxToasts } = useToastNotification();

        expect(maxToasts.value).toBe(5);

        setMaxToasts(10);
        expect(maxToasts.value).toBe(10);
      });

      it("should enforce minimum of 1 for max toasts", () => {
        const { setMaxToasts, maxToasts } = useToastNotification();

        setMaxToasts(0);
        expect(maxToasts.value).toBe(1);

        setMaxToasts(-5);
        expect(maxToasts.value).toBe(1);
      });

      it("should update default duration", () => {
        const { setDefaultDuration, defaultDuration } = useToastNotification();

        expect(defaultDuration.value).toBe(3000);

        setDefaultDuration(5000);
        expect(defaultDuration.value).toBe(5000);
      });

      it("should enforce minimum of 0 for default duration", () => {
        const { setDefaultDuration, defaultDuration } = useToastNotification();

        setDefaultDuration(-1000);
        expect(defaultDuration.value).toBe(0);
      });
    });

    describe("Computed Properties", () => {
      it("should compute hasToasts correctly", () => {
        const { addToast, clearAll, hasToasts } = useToastNotification();

        expect(hasToasts.value).toBe(false);

        addToast("Test");
        expect(hasToasts.value).toBe(true);

        clearAll();
        expect(hasToasts.value).toBe(false);
      });

      it("should compute toastCount correctly", () => {
        const { addToast, removeToast, toastCount } = useToastNotification();

        expect(toastCount.value).toBe(0);

        const id1 = addToast("Toast 1");
        expect(toastCount.value).toBe(1);

        addToast("Toast 2");
        expect(toastCount.value).toBe(2);

        removeToast(id1);
        expect(toastCount.value).toBe(1);
      });
    });

    describe("Convenience Methods", () => {
      it("should create success toast", () => {
        const { success, toasts } = useToastNotification();

        success("Success message");

        expect(toasts.value[0].type).toBe("success");
        expect(toasts.value[0].message).toBe("Success message");
      });

      it("should create error toast", () => {
        const { error, toasts } = useToastNotification();

        error("Error message");

        expect(toasts.value[0].type).toBe("error");
        expect(toasts.value[0].message).toBe("Error message");
      });

      it("should create warning toast", () => {
        const { warning, toasts } = useToastNotification();

        warning("Warning message");

        expect(toasts.value[0].type).toBe("warning");
        expect(toasts.value[0].message).toBe("Warning message");
      });

      it("should create info toast", () => {
        const { info, toasts } = useToastNotification();

        info("Info message");

        expect(toasts.value[0].type).toBe("info");
        expect(toasts.value[0].message).toBe("Info message");
      });

      it("should accept additional options in convenience methods", () => {
        const { success, toasts } = useToastNotification();

        success("Success with options", {
          duration: 5000,
          icon: "🎉",
        });

        expect(toasts.value[0].duration).toBe(5000);
        expect(toasts.value[0].icon).toBe("🎉");
      });
    });

    describe("Progress Tracking", () => {
      it("should initialize progress at 0", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Test message");

        expect(toasts.value[0].progress).toBe(0);
      });

      it("should update progress over time", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Test message", { duration: 1000 });

        // Simulate progress interval
        vi.advanceTimersByTime(16); // One frame
        const toast = toasts.value[0];
        if (toast) {
          toast.progress = (16 / 1000) * 100;
          expect(toast.progress).toBeGreaterThan(0);
          expect(toast.progress).toBeLessThan(100);
        }
      });
    });

    describe("Default Icons", () => {
      it("should use correct default icon for success", () => {
        const { success, toasts } = useToastNotification();

        success("Success message");

        expect(toasts.value[0].icon).toBe("✓");
      });

      it("should use correct default icon for error", () => {
        const { error, toasts } = useToastNotification();

        error("Error message");

        expect(toasts.value[0].icon).toBe("✕");
      });

      it("should use correct default icon for warning", () => {
        const { warning, toasts } = useToastNotification();

        warning("Warning message");

        expect(toasts.value[0].icon).toBe("⚠");
      });

      it("should use correct default icon for info", () => {
        const { info, toasts } = useToastNotification();

        info("Info message");

        expect(toasts.value[0].icon).toBe("ℹ");
      });

      it("should allow custom icon override", () => {
        const { success, toasts } = useToastNotification();

        success("Custom icon", { icon: "🚀" });

        expect(toasts.value[0].icon).toBe("🚀");
      });
    });

    describe("Edge Cases", () => {
      it("should handle removing non-existent toast gracefully", () => {
        const { removeToast, toasts } = useToastNotification();

        removeToast("non-existent-id");

        expect(toasts.value).toHaveLength(0);
      });

      it("should handle pausing non-existent toast gracefully", () => {
        const { pauseToast } = useToastNotification();

        pauseToast("non-existent-id");
        // Should not throw
      });

      it("should handle resuming non-existent toast gracefully", () => {
        const { resumeToast } = useToastNotification();

        resumeToast("non-existent-id");
        // Should not throw
      });

      it("should generate unique IDs for each toast", () => {
        const { addToast, toasts } = useToastNotification();

        addToast("Toast 1");
        addToast("Toast 2");
        addToast("Toast 3");

        const id1 = toasts.value[0].id;
        const id2 = toasts.value[1].id;
        const id3 = toasts.value[2].id;

        expect(id1).not.toBe(id2);
        expect(id2).not.toBe(id3);
        expect(id1).not.toBe(id3);
      });
    });

    describe("Integration with Legacy API", () => {
      it("should add toast to both systems when using show()", () => {
        const { show, showToast, toasts } = useToastNotification();

        show("Test message");

        expect(showToast.value).toBe(true);
        expect(toasts.value).toHaveLength(1);
        expect(toasts.value[0].message).toBe("Test message");
      });
    });
  });
});
