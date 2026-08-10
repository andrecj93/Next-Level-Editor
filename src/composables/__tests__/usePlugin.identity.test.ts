import { describe, it, expect, vi } from "vitest";
import { usePlugin } from "../usePlugin";
import type { EditorPlugin } from "../../types/plugin";

/**
 * R26-1: the R25-7/R25-9 fixes were vacuous for PLAIN plugin objects — the
 * documented consumer shape (a module-const plugin passed via :plugins).
 * `plugins` is a deep ref, so `plugins.value.find()` returns a reactive PROXY:
 * the identity guard compared proxy-vs-raw (never equal), and the refcount
 * WeakMap was keyed with the raw at register but probed with the proxy at
 * unregister (never hit) — so every re-render still bounced install/uninstall
 * and the FIRST of two sharing editors still killed the plugin. The component
 * tests stayed green only because @vue/test-utils delivers props as proxies.
 * These tests use bare objects, the shape a real host ships.
 */
const makeRaw = (uninstall?: () => void): EditorPlugin => ({
  name: "raw-plugin",
  version: "1.0.0",
  uninstall,
});

describe("plugin identity survives the reactive boundary (#R26-1)", () => {
  it("getRegisteredPlugin returns the EXACT object the host registered", () => {
    const raw = makeRaw();
    const api = usePlugin();
    api.registerPlugin(raw);

    expect(
      api.getRegisteredPlugin("raw-plugin"),
      "identity comparison is the whole point of this accessor"
    ).toBe(raw);
  });

  it("the shared-object refcount pairs register and unregister correctly", () => {
    const uninstall = vi.fn();
    const raw = makeRaw(uninstall);
    const editorA = usePlugin();
    const editorB = usePlugin();
    editorA.registerPlugin(raw);
    editorB.registerPlugin(raw);

    editorA.unregisterPlugin("raw-plugin");
    expect(
      uninstall,
      "the surviving editor still holds this plugin"
    ).not.toHaveBeenCalled();

    editorB.unregisterPlugin("raw-plugin");
    expect(uninstall).toHaveBeenCalledTimes(1);
  });
});
