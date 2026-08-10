import { describe, it, expect } from "vitest";
import { NextLevelEditor } from "../index";
import type { NextLevelEditorProps, NextLevelEditorEmits } from "../index";

/**
 * The public entry must export the component's PROP and EMIT types together —
 * consumers wiring the editor up in their own render functions or wrapper
 * components need both to type props and listeners. The emits type was
 * previously an unexported inline interface in the SFC. These are compile-time
 * (vue-tsc) guarantees; the runtime assertions just keep vitest happy.
 */
describe("public API surface: prop & emit types", () => {
  it("exports the NextLevelEditor component", () => {
    expect(NextLevelEditor).toBeTruthy();
  });

  it("exposes a usable NextLevelEditorProps type", () => {
    const props: NextLevelEditorProps = {
      modelValue: "<p>hi</p>",
      enableComments: true,
      themePreset: "midnight",
    };
    expect(props.modelValue).toBe("<p>hi</p>");
  });

  it("exposes a usable NextLevelEditorEmits type", () => {
    // A consumer can type a listener map against the emits contract.
    const emitted: string[] = [];
    const emit: NextLevelEditorEmits = (event: string, value?: string) => {
      emitted.push(value !== undefined ? `${event}:${value}` : event);
    };
    emit("update:modelValue", "<p>new</p>");
    emit("focus");
    emit("blur");
    expect(emitted).toEqual(["update:modelValue:<p>new</p>", "focus", "blur"]);
  });
});
