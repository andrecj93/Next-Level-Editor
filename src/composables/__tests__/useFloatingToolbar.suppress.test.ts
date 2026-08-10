import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useFloatingToolbar } from "../useFloatingToolbar";

// Regression for the dropdown-interception bug: while the user interacts with
// the main toolbar (dropdown open), any selectionchange used to re-show the
// selection bubble on top of the open menu, intercepting clicks on its items.
// Suppression must hide the bubble and keep updateFloatingToolbar from
// re-showing it until unsuppressed by editor interaction.
describe("useFloatingToolbar suppression", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    host.textContent = "some selectable text";
    document.body.appendChild(host);
    // Create a non-collapsed selection so updateFloatingToolbar wants to show.
    const range = document.createRange();
    range.selectNodeContents(host);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
  });

  afterEach(() => {
    window.getSelection()?.removeAllRanges();
    host.remove();
  });

  it("shows on a non-collapsed selection by default", () => {
    const ft = useFloatingToolbar();
    ft.updateFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(true);
  });

  it("suppression hides the bubble and blocks re-show on selection change", () => {
    const ft = useFloatingToolbar();
    ft.updateFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(true);

    ft.suppressFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(false);

    // A selectionchange while a dropdown is open used to re-show the bubble.
    ft.updateFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(false);
  });

  it("unsuppress lets the bubble show again on the next update", () => {
    const ft = useFloatingToolbar();
    ft.suppressFloatingToolbar();
    ft.updateFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(false);

    ft.unsuppressFloatingToolbar();
    ft.updateFloatingToolbar();
    expect(ft.showFloatingToolbar.value).toBe(true);
  });
});
