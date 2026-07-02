import { ref, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from "vue";
import {
  isInlineStyleActive,
  isBlockActive,
  isListActive,
} from "../utils/formatting";

export interface ActiveStates {
  isInlineActionActive: (tag: string) => boolean;
  isBlockActionActive: (tag: string) => boolean;
  isListActionActive: (tag: "ul" | "ol") => boolean;
}

export function useActiveStates(
  editorContent: Ref<HTMLDivElement | null> | ComputedRef<HTMLDivElement | null>
): ActiveStates {
  // The active-state helpers read the LIVE DOM selection, which is not a Vue
  // reactive dependency. Without a reactive signal the toolbar would never
  // re-evaluate its highlights as the caret moves (it only refreshed as a side
  // effect of clicking a format button). This tick is bumped on every
  // `selectionchange`; each isActive helper reads it so any component that
  // calls them during render re-renders whenever the caret/selection moves.
  const selectionTick = ref(0);

  const handleSelectionChange = () => {
    selectionTick.value++;
  };

  onMounted(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("selectionchange", handleSelectionChange);
  });

  const isInlineActionActive = (tag: string): boolean => {
    // Touch the tick so this call is tracked as a reactive dependency.
    void selectionTick.value;
    if (!editorContent.value) return false;
    return isInlineStyleActive(editorContent.value, tag);
  };

  const isBlockActionActive = (tag: string): boolean => {
    void selectionTick.value;
    if (!editorContent.value) return false;
    return isBlockActive(editorContent.value, tag);
  };

  const isListActionActive = (tag: "ul" | "ol"): boolean => {
    void selectionTick.value;
    if (!editorContent.value) return false;
    return isListActive(editorContent.value, tag);
  };

  return {
    isInlineActionActive,
    isBlockActionActive,
    isListActionActive,
  };
}
