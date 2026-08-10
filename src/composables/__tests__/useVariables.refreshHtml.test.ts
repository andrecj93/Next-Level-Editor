import { describe, it, expect } from "vitest";
import { useVariables } from "../useVariables";

/**
 * R24-3: the string-based half of the export freshness fix. This is the exact
 * counterpart of refreshVariablePills (the beforeprint hook), operating on an
 * HTML string instead of the live DOM — because in Preview view mode no
 * editable surface is mounted and the document only exists as a string.
 */
describe("refreshVariableValuesInHtml (#R24-3)", () => {
  it("re-stamps a stale data-value from the live registry", () => {
    const { refreshVariableValuesInHtml, updateVariableValue } = useVariables();
    updateVariableValue("user.name", "Current Name");
    const stale =
      '<p><span class="editor-variable" data-variable="user.name" ' +
      'data-value="Stale Name">{{ user.name }}</span></p>';

    const out = refreshVariableValuesInHtml(stale);

    expect(out).toContain('data-value="Current Name"');
    expect(out).not.toContain("Stale Name");
  });

  it("falls back to the literal token for a variable that no longer resolves", () => {
    // Mirrors refreshVariablePills' #r15-36 rule: an unresolvable variable
    // must not export as an empty gap.
    const { refreshVariableValuesInHtml } = useVariables();
    const doc =
      '<p><span class="editor-variable" data-variable="gone.var" ' +
      'data-value="">{{ gone.var }}</span></p>';

    const out = refreshVariableValuesInHtml(doc);

    expect(out).toContain('data-value="{{ gone.var }}"');
  });

  it("leaves a document without pills untouched", () => {
    const { refreshVariableValuesInHtml } = useVariables();
    const doc = "<p>Just <strong>prose</strong>.</p>";

    expect(refreshVariableValuesInHtml(doc)).toBe(doc);
  });

  it("does not disturb surrounding content while re-stamping", () => {
    const { refreshVariableValuesInHtml } = useVariables();
    const doc =
      '<h2>Title</h2><p>Hi <span class="editor-variable" ' +
      'data-variable="user.name" data-value="x">{{ user.name }}</span>!</p>';

    const out = refreshVariableValuesInHtml(doc);

    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("{{ user.name }}");
    expect(out).toContain("!</p>");
  });
});
