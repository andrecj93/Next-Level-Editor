import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { nextTick } from "vue";
import { mount, flushPromises } from "@vue/test-utils";
import ToastContainer from "../ToastContainer.vue";
import { useToastNotification } from "../../composables/useToastNotification";
import type { Toast } from "../../composables/useToastNotification";

// ---------------------------------------------------------------------------
// Why this file mocks useToastNotification (and why it is NOT mock theatre)
// ---------------------------------------------------------------------------
// `useToastNotification()` is a FACTORY, not a singleton: every call declares
// fresh function-local refs (`toasts`, `position`, ...). ToastContainer.vue
// calls it *internally* in its own <script setup>, so the instance the mounted
// component renders from is unreachable from a test. To exercise the REAL
// component against REAL composable state, we replace the factory with a thin
// wrapper that always returns ONE real instance (built from the actual module),
// so the component-under-test and the test drive the SAME reactive state.
// Every bit of behaviour under test — addToast/removeToast, the auto-dismiss
// setTimeout, the 16ms progress interval, pause/resume — runs the real code.
// Nothing about the toast logic is faked; the mock only removes the accidental
// per-call isolation that would otherwise make the component untestable.
vi.mock("../../composables/useToastNotification", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../composables/useToastNotification")
    >();
  const singleton = actual.useToastNotification();
  return {
    ...actual,
    useToastNotification: () => singleton,
  };
});

// ToastContainer renders through <Teleport to="body">, so its DOM lands in
// document.body (the live target exists regardless of attachTo) rather than in
// the wrapper's own subtree. We therefore query document.body directly and, for
// interactions, dispatch native events on the teleported nodes (Vue's listeners
// are attached there) then await the scheduler.
const bodyContainer = () =>
  document.body.querySelector(".toast-container") as HTMLElement | null;
const bodyToasts = () =>
  Array.from(document.body.querySelectorAll<HTMLElement>(".toast"));
const messages = () =>
  bodyToasts().map((t) =>
    t.querySelector(".toast__message")?.textContent?.trim()
  );

const settle = async () => {
  await flushPromises();
  await nextTick();
};

const fire = async (
  el: Element | null | undefined,
  type: "click" | "mouseenter" | "mouseleave"
) => {
  el?.dispatchEvent(
    new MouseEvent(type, { bubbles: type === "click", cancelable: true })
  );
  await settle();
};

// The shared real instance (same object the component reads).
let toast: ReturnType<typeof useToastNotification>;

beforeEach(() => {
  toast = useToastNotification();
  // Reset the persistent singleton to a known baseline between tests.
  toast.clearAll();
  toast.setPosition("bottom-right");
  toast.setMaxToasts(5);
  toast.setDefaultDuration(3000);
});

afterEach(() => {
  toast.clearAll();
  vi.useRealTimers();
  // Safety net: drop any teleported nodes a test forgot to unmount.
  document.body
    .querySelectorAll(".toast-container")
    .forEach((n) => n.remove());
});

describe("ToastContainer", () => {
  describe("empty / presence of the container", () => {
    it("renders no container while there are no toasts (v-if=hasToasts)", () => {
      const w = mount(ToastContainer);
      expect(bodyContainer()).toBeNull();
      w.unmount();
    });

    it("teleports a labelled live-region container to <body> once a toast exists", async () => {
      const w = mount(ToastContainer);
      // The Teleport itself renders nothing where the component is mounted.
      expect(w.find(".toast-container").exists()).toBe(false);

      toast.addToast("Saved", { type: "success", duration: 0 });
      await settle();

      const section = bodyContainer();
      expect(section).not.toBeNull();
      expect(section!.tagName).toBe("SECTION");
      expect(section!.getAttribute("aria-label")).toBe("Notifications");
      expect(section!.getAttribute("aria-live")).toBe("polite");
      w.unmount();
    });

    it("removes the container again after the last toast is dismissed", async () => {
      const w = mount(ToastContainer);
      const id = toast.addToast("Bye", { type: "info", duration: 0 });
      await settle();
      expect(bodyContainer()).not.toBeNull();

      toast.removeToast(id);
      await settle();
      expect(toast.toasts.value).toHaveLength(0);
      expect(bodyContainer()).toBeNull();
      w.unmount();
    });
  });

  describe("toast content, type variants and icons", () => {
    it.each([
      ["success", "status", "polite"],
      ["error", "alert", "assertive"],
      ["warning", "status", "polite"],
      ["info", "status", "polite"],
    ] as const)(
      "renders a %s toast with the right class, role and aria-live",
      async (type, role, live) => {
        const w = mount(ToastContainer);
        toast.addToast(`${type} message`, { type, duration: 0 });
        await settle();

        const el = bodyToasts()[0];
        expect(el).toBeTruthy();
        expect(el.classList.contains(`toast--${type}`)).toBe(true);
        expect(el.getAttribute("role")).toBe(role);
        expect(el.getAttribute("aria-live")).toBe(live);
        expect(el.querySelector(".toast__message")?.textContent?.trim()).toBe(
          `${type} message`
        );
        w.unmount();
      }
    );

    it("renders the default inline-SVG icon (v-html) for a toast with no custom icon", async () => {
      const w = mount(ToastContainer);
      toast.addToast("Done", { type: "success", duration: 0 });
      await settle();

      const icon = bodyToasts()[0].querySelector(".toast__icon");
      expect(icon).not.toBeNull();
      expect(icon!.getAttribute("aria-hidden")).toBe("true");
      // Default icons are inline stroke SVGs injected via v-html.
      expect(icon!.querySelector("svg")).not.toBeNull();
      w.unmount();
    });

    it("renders a caller-supplied custom icon string through v-html", async () => {
      const w = mount(ToastContainer);
      toast.addToast("Party", {
        type: "info",
        duration: 0,
        icon: '<span class="custom-emoji">PARTY</span>',
      });
      await settle();

      const custom = bodyToasts()[0].querySelector(".toast__icon .custom-emoji");
      expect(custom).not.toBeNull();
      expect(custom!.textContent).toBe("PARTY");
      w.unmount();
    });
  });

  describe("dismiss button", () => {
    it("shows a close button with a type-specific aria-label and removes the toast on click", async () => {
      const w = mount(ToastContainer);
      toast.addToast("Removable", { type: "error", duration: 0 });
      await settle();

      const closeBtn = bodyToasts()[0].querySelector(
        ".toast__close"
      ) as HTMLButtonElement | null;
      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.getAttribute("aria-label")).toBe(
        "Dismiss error notification"
      );

      await fire(closeBtn, "click");

      // Real removeToast ran: gone from reactive state AND from the DOM.
      expect(toast.toasts.value).toHaveLength(0);
      expect(bodyToasts()).toHaveLength(0);
      w.unmount();
    });

    it("renders no close button when the toast is not dismissible", async () => {
      const w = mount(ToastContainer);
      toast.addToast("Sticky", {
        type: "info",
        duration: 0,
        dismissible: false,
      });
      await settle();

      expect(bodyToasts()[0].querySelector(".toast__close")).toBeNull();
      w.unmount();
    });

    it("only dismisses the clicked toast, leaving the others stacked", async () => {
      const w = mount(ToastContainer);
      toast.addToast("first", { type: "info", duration: 0 });
      const secondId = toast.addToast("second", { type: "info", duration: 0 });
      toast.addToast("third", { type: "info", duration: 0 });
      await settle();
      expect(bodyToasts()).toHaveLength(3);

      const middleClose = bodyToasts()[1].querySelector(".toast__close");
      await fire(middleClose, "click");

      expect(toast.toasts.value.map((t: Toast) => t.id)).not.toContain(
        secondId
      );
      expect(messages()).toEqual(["first", "third"]);
      w.unmount();
    });
  });

  describe("action button", () => {
    it("renders the action label, invokes onClick, and keeps the toast on screen", async () => {
      const onClick = vi.fn();
      const w = mount(ToastContainer);
      toast.addToast("Undo?", {
        type: "info",
        duration: 0,
        action: { label: "Undo", onClick },
      });
      await settle();

      const actionBtn = bodyToasts()[0].querySelector(
        ".toast__action"
      ) as HTMLButtonElement | null;
      expect(actionBtn).not.toBeNull();
      expect(actionBtn!.textContent?.trim()).toBe("Undo");

      await fire(actionBtn, "click");

      expect(onClick).toHaveBeenCalledTimes(1);
      // The component does NOT auto-dismiss on action — the toast stays.
      expect(toast.toasts.value).toHaveLength(1);
      expect(bodyToasts()).toHaveLength(1);
      w.unmount();
    });

    it("renders no action button when no action is configured", async () => {
      const w = mount(ToastContainer);
      toast.addToast("Plain", { type: "info", duration: 0 });
      await settle();
      expect(bodyToasts()[0].querySelector(".toast__action")).toBeNull();
      w.unmount();
    });
  });

  describe("stacking order and max-toasts cap", () => {
    it("renders toasts in insertion order (newest last)", async () => {
      const w = mount(ToastContainer);
      toast.addToast("alpha", { type: "info", duration: 0 });
      toast.addToast("beta", { type: "success", duration: 0 });
      toast.addToast("gamma", { type: "warning", duration: 0 });
      await settle();

      expect(messages()).toEqual(["alpha", "beta", "gamma"]);
      w.unmount();
    });

    it("honours the maxToasts cap by dropping the oldest toast", async () => {
      toast.setMaxToasts(3);
      const w = mount(ToastContainer);
      toast.addToast("t1", { type: "info", duration: 0 });
      toast.addToast("t2", { type: "info", duration: 0 });
      toast.addToast("t3", { type: "info", duration: 0 });
      toast.addToast("t4", { type: "info", duration: 0 });
      await settle();

      // Oldest (t1) evicted; the container reflects exactly the capped stack.
      expect(bodyToasts()).toHaveLength(3);
      expect(messages()).toEqual(["t2", "t3", "t4"]);
      w.unmount();
    });
  });

  describe("position class", () => {
    it("reflects the composable's position on the container element", async () => {
      const w = mount(ToastContainer);
      toast.addToast("here", { type: "info", duration: 0 });
      await settle();
      expect(bodyContainer()!.classList.contains("toast-container--bottom-right")).toBe(
        true
      );

      toast.setPosition("top-left");
      await settle();
      const section = bodyContainer()!;
      expect(section.classList.contains("toast-container--top-left")).toBe(true);
      expect(section.classList.contains("toast-container--bottom-right")).toBe(
        false
      );
      w.unmount();
    });
  });

  describe("auto-dismiss timers (real setTimeout via fake timers)", () => {
    it("auto-dismisses a toast only after its full duration elapses", async () => {
      vi.useFakeTimers();
      const w = mount(ToastContainer);
      toast.addToast("temporary", { type: "info", duration: 1000 });
      await nextTick();
      expect(bodyToasts()).toHaveLength(1);

      vi.advanceTimersByTime(999);
      await nextTick();
      expect(bodyToasts()).toHaveLength(1);

      vi.advanceTimersByTime(1);
      await settle();
      expect(toast.toasts.value).toHaveLength(0);
      expect(bodyToasts()).toHaveLength(0);
      expect(bodyContainer()).toBeNull();
      w.unmount();
    });

    it("renders a progress bar whose value tracks the real elapsed progress", async () => {
      vi.useFakeTimers();
      const w = mount(ToastContainer);
      const id = toast.addToast("loading", { type: "info", duration: 2000 });
      await nextTick();

      const progressEl = bodyToasts()[0].querySelector(
        ".toast__progress"
      ) as HTMLProgressElement | null;
      expect(progressEl).not.toBeNull();
      expect(progressEl!.getAttribute("aria-label")).toContain("elapsed");
      // value = 100 - progress, and progress starts at 0.
      const readValue = (el: HTMLProgressElement) => {
        const attr = el.getAttribute("value");
        return attr !== null ? Number(attr) : el.value;
      };
      expect(readValue(progressEl!)).toBe(100);

      // Drive the real 16ms progress interval to ~half of the 2000ms duration.
      vi.advanceTimersByTime(1000);
      await nextTick();

      const live = toast.toasts.value.find((t: Toast) => t.id === id)!;
      expect(live.progress).toBeGreaterThan(40);
      expect(live.progress).toBeLessThan(60);
      const barValue = readValue(
        bodyToasts()[0].querySelector(".toast__progress") as HTMLProgressElement
      );
      expect(barValue).toBeLessThan(100);
      expect(barValue).toBeGreaterThan(40);
      w.unmount();
    });

    it("renders no progress bar for a toast with duration 0", async () => {
      const w = mount(ToastContainer);
      toast.addToast("no-timer", { type: "info", duration: 0 });
      await settle();
      expect(bodyToasts()[0].querySelector(".toast__progress")).toBeNull();
      w.unmount();
    });
  });

  describe("pause / resume on hover", () => {
    it("mouseenter pauses auto-dismiss (bar hidden) and keeps the toast past its duration", async () => {
      vi.useFakeTimers();
      const w = mount(ToastContainer);
      toast.addToast("hover me", { type: "success", duration: 1000 });
      await nextTick();

      const el = bodyToasts()[0];
      await fire(el, "mouseenter");

      // Paused: the progress bar's v-if (`!toast.paused`) drops it.
      expect(toast.toasts.value[0].paused).toBe(true);
      expect(el.querySelector(".toast__progress")).toBeNull();

      // Timer was cleared, so advancing well past the duration must NOT dismiss.
      vi.advanceTimersByTime(5000);
      await nextTick();
      expect(bodyToasts()).toHaveLength(1);
      w.unmount();
    });

    it("mouseleave resumes the timer (bar returns) and the toast then auto-dismisses", async () => {
      vi.useFakeTimers();
      const w = mount(ToastContainer);
      toast.addToast("hover me", { type: "success", duration: 1000 });
      await nextTick();

      const el = bodyToasts()[0];
      await fire(el, "mouseenter");
      vi.advanceTimersByTime(5000); // proves the pause held
      await nextTick();
      expect(bodyToasts()).toHaveLength(1);

      await fire(el, "mouseleave");
      expect(toast.toasts.value[0].paused).toBe(false);
      expect(bodyToasts()[0].querySelector(".toast__progress")).not.toBeNull();

      // Remaining duration (~full 1000ms, since we paused at progress 0) elapses.
      vi.advanceTimersByTime(1000);
      await settle();
      expect(toast.toasts.value).toHaveLength(0);
      expect(bodyToasts()).toHaveLength(0);
      w.unmount();
    });
  });
});
