import * as Vue from "vue";
import { nextInstanceToken } from "./instanceToken";

let counter = 0;

/**
 * A token per Vue APP. `useId()`'s counter is per-app and every app uses the
 * same default prefix, so two independent `createApp().mount()` calls — the
 * documented way to put the editor on a non-Vue page twice — both hand out
 * "v-0". Every id then collides: two `id="v-0-main"` editing surfaces, so
 * SkipLinks' getElementById sent the second editor's "Skip to main content" to
 * the FIRST editor, and the palette's aria-activedescendant pointed at another
 * editor's option. Prefixing with a per-app token keeps `useId`'s SSR-stable
 * suffix intact (a single app — the only case SSR realistically hydrates —
 * always gets the same first token on server and client). #R23-56
 */
const appTokens = new WeakMap<object, string>();

const appToken = (instance: unknown): string => {
  const app = (instance as { appContext?: { app?: object } } | null)?.appContext
    ?.app;
  if (!app) return "";
  let token = appTokens.get(app);
  if (!token) {
    token = nextInstanceToken("nle");
    appTokens.set(app, token);
  }
  return token;
};

/**
 * Stable unique id for a component instance.
 *
 * Uses Vue 3.5's `useId()` when the installed Vue provides it (SSR-stable,
 * hydration-safe), and falls back to a client-only counter otherwise. This
 * matters for packaging: a STATIC `import { useId } from "vue"` fails to link
 * on Vue < 3.5, so a consumer within the declared `vue: ^3.3.0` peer range got
 * a hard `SyntaxError` and a blank screen on first import. Feature-detecting off
 * the namespace object keeps the library working across the whole peer range.
 *
 * Must be called from `setup()` (like `useId`) so the SSR-stable path is valid.
 */
export function useStableId(): string {
  const vue = Vue as unknown as {
    useId?: () => string;
    getCurrentInstance?: () => unknown;
  };
  // Only call useId() when there IS an active instance — calling it standalone
  // returns undefined and logs a warning. getCurrentInstance exists in all
  // Vue 3.x, so it's a safe gate.
  const instance = vue.getCurrentInstance?.();
  if (typeof vue.useId === "function" && instance) {
    const id = vue.useId();
    if (id) {
      const scope = appToken(instance);
      return scope ? `${scope}-${id}` : id;
    }
  }
  return `nle-${(++counter).toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
