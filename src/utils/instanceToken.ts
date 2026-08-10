let sequence = 0;

/**
 * A token unique across every caller in the page, for claiming ownership of a
 * DOCUMENT-level resource (a property on `<html>`, a singleton listener…).
 *
 * Deliberately NOT Vue's `useId()`: that counter is per-APP, so two editors
 * mounted as separate apps are both handed "v-1" and an ownership check passes
 * for a non-owner. This module is shared by every importer, so the sequence is
 * genuinely global — which is the scope a document-level resource needs.
 */
export function nextInstanceToken(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}
