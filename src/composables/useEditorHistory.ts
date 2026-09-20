import { ref, nextTick } from "vue";
import type { CaretOffsets } from "../utils/caretOffset";

/**
 * Kind of keystroke burst a capture belongs to, derived from the input event's
 * inputType ("typing" = insertText runs, "deleting" = backspace/delete runs).
 * Captures with NO key — formatting, Enter, paste, programmatic edits — are
 * undo boundaries and never coalesce.
 */
export type HistoryCoalesceKey = "typing" | "deleting";

export interface HistoryEntry {
  id: string;
  html: string;
  preview: string;
  /** Capture time (epoch ms) — shown by the history timeline. */
  timestamp: number;
  /**
   * Caret/selection at capture time, as text offsets within the editor. Lets
   * undo/redo put the cursor back where it was instead of at the document top.
   */
  selection?: CaretOffsets | null;
  /** Set on burst-coalesced entries (typing/deleting runs). */
  coalesceKey?: HistoryCoalesceKey;
  /** When the burst folded into this entry started / last received a key. */
  burstStart?: number;
  lastInputAt?: number;
}

/** Callback that applies a restored snapshot's HTML and (optionally) caret. */
type ApplyCallback = (html: string, selection?: CaretOffsets | null) => void;

/**
 * Composable for managing editor history (undo/redo)
 * Provides a robust undo/redo system with previews
 */
/**
 * Upper bound on retained undo snapshots. Each entry holds a full HTML copy of
 * the document, and captureSnapshot fires on every input event, so without a cap
 * a long editing session grows memory roughly O(edits × document size). 200
 * keeps a generous undo depth while bounding the footprint.
 */
const MAX_HISTORY_ENTRIES = 200;

/**
 * Keystroke-burst coalescing (r13 #12): every input event captures a snapshot,
 * so without merging, undoing a typed word took one Ctrl+Z per character.
 * Consecutive same-kind captures merge into ONE undo step while the user keeps
 * typing: broken by a ≥1s pause, a different edit kind, any keyless capture,
 * the 5s burst cap (so a non-stop paragraph still yields several steps), or
 * not being at the history tail (typing after an undo pushes + prunes redo).
 */
const COALESCE_IDLE_MS = 1000;
const COALESCE_BURST_MS = 5000;

export function useEditorHistory() {
  const history = ref<HistoryEntry[]>([]);
  const historyIndex = ref(-1);
  const isApplyingHistory = ref(false);

  /**
   * Build a preview text from HTML content
   */
  const buildPreview = (html: string): string => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    // Normalize whitespace
    const text = temp.innerText.replace(/\s+/g, " ").trim();
    return text.length > 60
      ? `${text.slice(0, 57)}...`
      : text || "Empty content";
  };

  /**
   * Capture a snapshot of current content
   */
  const captureSnapshot = (
    html: string,
    selection?: CaretOffsets | null,
    coalesceKey?: HistoryCoalesceKey
  ): void => {
    if (isApplyingHistory.value) return;

    const preview = buildPreview(html);
    const current = history.value[historyIndex.value];

    if (current?.html === html) {
      // Same content, but the caret may have moved since — keep the latest
      // caret so an undo landing here restores the most recent position.
      if (current && selection) current.selection = selection;
      // A command can establish a boundary before editing unchanged content.
      // Close the typing burst now, or execCommand's synchronous input event
      // can merge the command into the prose the writer just typed.
      if (!coalesceKey) {
        delete current.coalesceKey;
        delete current.burstStart;
        delete current.lastInputAt;
      }
      return;
    }

    const now = Date.now();

    // Continue the current keystroke burst: fold this capture into the tail
    // entry instead of pushing, so one undo reverts the whole run. Only at the
    // tail — after an undo a new keystroke must push (pruning redo), never
    // rewrite the entry the user just undid to.
    const atTail = historyIndex.value === history.value.length - 1;
    if (
      coalesceKey &&
      atTail &&
      current &&
      current.coalesceKey === coalesceKey &&
      now - (current.lastInputAt ?? current.timestamp) < COALESCE_IDLE_MS &&
      now - (current.burstStart ?? current.timestamp) < COALESCE_BURST_MS
    ) {
      current.html = html;
      current.preview = preview;
      current.selection = selection ?? null;
      current.lastInputAt = now;
      return;
    }

    history.value = history.value.slice(0, historyIndex.value + 1);
    const entry: HistoryEntry = {
      id: `${now}-${Math.random().toString(16).slice(2)}`,
      html,
      preview,
      timestamp: now,
      selection: selection ?? null,
    };
    if (coalesceKey) {
      entry.coalesceKey = coalesceKey;
      entry.burstStart = now;
      entry.lastInputAt = now;
    }
    history.value.push(entry);

    // Bound memory: drop the oldest snapshots once past the cap. historyIndex is
    // pinned to the newest entry here, so trimming from the front keeps it valid.
    if (history.value.length > MAX_HISTORY_ENTRIES) {
      history.value.splice(0, history.value.length - MAX_HISTORY_ENTRIES);
    }

    historyIndex.value = history.value.length - 1;
  };

  /**
   * Apply a history entry to the editor
   */
  const applyHistoryEntry = async (
    entry: HistoryEntry | undefined,
    callback: ApplyCallback
  ): Promise<void> => {
    if (!entry) return;

    // Navigating history CLOSES any keystroke burst on the target entry:
    // after undo→redo (or a timeline jump) the next keystroke must start a
    // NEW undo step, never fold into — and overwrite — the burst the user
    // just navigated back to. #r15-23
    delete entry.coalesceKey;
    delete entry.burstStart;
    delete entry.lastInputAt;

    isApplyingHistory.value = true;
    callback(entry.html, entry.selection ?? null);

    await nextTick();
    isApplyingHistory.value = false;
  };

  /**
   * Undo to previous state
   */
  const undo = (callback: ApplyCallback): void => {
    if (historyIndex.value <= 0) return;
    historyIndex.value -= 1;
    applyHistoryEntry(history.value[historyIndex.value], callback);
  };

  /**
   * Redo to next state
   */
  const redo = (callback: ApplyCallback): void => {
    if (historyIndex.value >= history.value.length - 1) return;
    historyIndex.value += 1;
    applyHistoryEntry(history.value[historyIndex.value], callback);
  };

  /**
   * Jump directly to a history entry by index (history-timeline navigation).
   */
  const goToIndex = (
    index: number,
    callback: ApplyCallback
  ): void => {
    if (
      index < 0 ||
      index >= history.value.length ||
      index === historyIndex.value
    ) {
      return;
    }
    historyIndex.value = index;
    applyHistoryEntry(history.value[index], callback);
  };

  /**
   * Clear the timeline, keeping only the current state as the sole entry so
   * the document itself is untouched.
   */
  const clearHistory = (): void => {
    const current = history.value[historyIndex.value];
    if (current) {
      // The kept baseline must never absorb the next keystroke burst —
      // otherwise typing right after a clear folds into (and overwrites) the
      // sole entry, and undo can never return to the promised kept state.
      // #r15-34
      delete current.coalesceKey;
      delete current.burstStart;
      delete current.lastInputAt;
    }
    history.value = current ? [current] : [];
    historyIndex.value = history.value.length - 1;
  };

  /**
   * Check if undo is available
   */
  const canUndo = (): boolean => historyIndex.value > 0;

  /**
   * Check if redo is available
   */
  const canRedo = (): boolean => historyIndex.value < history.value.length - 1;

  return {
    history,
    historyIndex,
    isApplyingHistory,
    captureSnapshot,
    undo,
    redo,
    goToIndex,
    clearHistory,
    canUndo,
    canRedo,
  };
}
