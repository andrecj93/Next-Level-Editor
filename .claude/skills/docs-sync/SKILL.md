---
name: docs-sync
description: Keep every documentation surface in sync when next-level-editor's public API changes. Use this skill whenever you add, remove, rename, or change the behavior/default of ANYTHING a consumer can see — component props or emits (src/components/NextLevelEditor.types.ts), exports in src/index.ts, theme presets, toolbar layouts, slash commands, keyboard shortcuts, the package.json exports map, or the CSS import path — even if the user only asked for the code change and never mentioned docs. Also use it when the user says "update the docs", "document this prop", or asks why the website docs/README disagree with the code.
---

# Docs Sync — the public API has more than one home

This library's public API is documented in **four places that do not update themselves**.
History shows they drift: the README once documented a CSS path that didn't resolve, and
`index.d.ts` once missed ~40 real exports. A code change that touches the public surface is
**not done** until every surface below tells the same story.

## The documentation surfaces (check each one, in this order)

1. **`src/components/NextLevelEditor.types.ts`** — the prop contract itself. Every prop gets a
   JSDoc comment (these flow into the generated `dist/index.d.ts`, which is what consumers'
   IDEs show). New public types must be exported here and re-exported from `src/index.ts`.

2. **`src/index.ts`** — the CLAUDE.md rule: *anything meant to be consumable externally must be
   re-exported here.* Types regenerate from this file at build time — no hand-written d.ts.

3. **`README.md`** — the npm-facing docs:
   - the **Props table** and **Events table** in the API Reference section,
   - any **usage snippets** that should showcase the new capability,
   - install/import paths if the exports map changed (the CSS import is
     `next-level-editor/style.css` — keep it that way everywhere).

4. **`src/demo/views/DocsView.vue`** — the website docs page:
   - the `props` array (rendered as the Props table),
   - the relevant section prose + `CodeBlock` snippet (add a section for a new subsystem;
     extend "Feature flags" for a new flag),
   - keep snippets copy-pasteable and truthful — they are what visitors actually try.

5. **`CLAUDE.md`** — only when the change is architectural (new subsystem, new build step,
   changed public-API *rules*), not for individual props.

## Also make it demonstrable

A prop nobody can try is a prop nobody adopts. When you add a user-facing option:

- Wire it into the **Playground** (`src/demo/views/PlaygroundView.vue`) — a toggle in the
  Configure panel or a chip row, whichever matches existing patterns — and include it in
  `resetConfig`.
- If it changes how the editor looks/behaves at rest, consider whether a home-page demo
  (`src/demo/views/HomeView.vue`) should use it.

## Definition of done

- [ ] Prop/emit documented with JSDoc in `NextLevelEditor.types.ts`; defaults in `withDefaults` match the docs
- [ ] Re-exported from `src/index.ts` if it's a type/function/component consumers import
- [ ] README props/events tables + snippets updated
- [ ] DocsView props array + section/snippet updated
- [ ] Playground exposes it (when it's a user-facing option)
- [ ] Tests cover it (unit at minimum; e2e if it changes visible behavior)
- [ ] `npm run build` regenerates types cleanly; `npx vue-tsc --noEmit` passes

## Why this matters

Consumers meet this library through the README and the website docs *before* they meet the
code. A drifted table teaches them a wrong API, and a broken snippet costs a user in the
first five minutes. The cheapest moment to update docs is the same commit as the API change —
you already have all the context loaded.
