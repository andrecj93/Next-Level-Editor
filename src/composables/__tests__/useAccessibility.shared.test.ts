import { describe, it, expect, beforeEach } from "vitest";
import { useAccessibility } from "../useAccessibility";

// Regression for #2: useAccessibility is a factory, but AriaLiveRegion, the
// editor and SkipLinks each call it separately. Announcements must be shared so
// an announce() from one instance is visible to the aria-live regions rendered
// by another; otherwise screen-reader users get no spoken feedback.
describe("useAccessibility shared announcements", () => {
  beforeEach(() => {
    // Reset the shared singleton between tests.
    useAccessibility().clearAnnouncements();
  });

  it("makes an announce() from one instance visible to another", () => {
    const editor = useAccessibility();
    const liveRegion = useAccessibility();

    editor.announce("Bold applied", { priority: "polite" });

    expect(liveRegion.getAnnouncements("polite")).toContain("Bold applied");
  });

  it("shares assertive announcements too", () => {
    const skipLinks = useAccessibility();
    const liveRegion = useAccessibility();

    skipLinks.announce("Saved", { priority: "assertive" });

    expect(liveRegion.getAnnouncements("assertive")).toContain("Saved");
    // Not surfaced under the wrong politeness level.
    expect(liveRegion.getAnnouncements("polite")).not.toContain("Saved");
  });
});
