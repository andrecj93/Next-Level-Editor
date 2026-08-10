# Website Redesign — "The Page Is The Product"

**Date:** 2026-07-06
**Scope:** The demo/marketing site under `src/demo/` (Home, Playground, Docs, Nav, Footer).
**Goal:** A distinctive, elegant, tactile redesign that makes `next-level-editor` feel like
what it is — a *writing instrument* — and proves its features by demonstrating them live on
the page, not describing them in emoji cards.

## Chosen direction (from brainstorming)

- **Aesthetic:** Warm craft / tactile — an *evolution* of the existing "Editorial Ink" token
  system (warm paper, deep ink, vermilion pen accent, Fraunces serif, paper grain, dark mode),
  pushed to feel crafted, layered, and alive. NOT a teardown of the tokens.
- **Feature proof:** Live & interactive — real `NextLevelEditor` instances embedded as scoped
  mini-demos.
- **Scope:** Whole site, with Home as the hero. Playground + Docs brought onto the same elevated
  system so nothing feels stitched together.
- **Demo density:** One hero editor + **four** live mini-demos, lazy-mounted on scroll so first
  paint stays fast.

## Design language (what changes vs. today)

Keep: paper ground, ink text, vermilion accent, Fraunces display, `--font-mono`, grain, `.site-dark`.

Add / elevate:
- **Layered "sheet" depth** — the editor renders on a floating paper sheet with warm `--shadow-lg`
  and a thin top page-edge, so it reads as a physical document lifting off the page.
- **Margin-rule motif** — a faint vermilion vertical margin line (manuscript / legal-pad) used on
  the hero and section headers as a recurring signature.
- **Crafted stroke icons** — a small inline SVG icon set replaces EVERY emoji (aligns with the
  established "kill the emoji + AI-slop gradients" design decision). Lives in one place.
- **Caret motif** — a blinking vermilion caret as a design element (hero headline types itself;
  used sparingly, respects `prefers-reduced-motion`).
- **Ink-underline reveal** — key headline accents "draw" their underline on scroll-in
  (IntersectionObserver; disabled under reduced motion).

## Component inventory (new + changed, all in `src/demo/`)

New reusable primitives:
- `components/Icon.vue` — inline stroke-icon set (name prop). One source of truth; no emoji.
- `components/EditorSheet.vue` — the floating "paper sheet" frame (page edge, shadow, optional
  filename chrome) wrapping any slot. Replaces the ad-hoc `.demo-frame` markup.
- `components/RevealOnScroll.vue` (or a `v-reveal` directive) — IntersectionObserver wrapper for
  ink-underline / fade-up, reduced-motion aware.
- `components/LiveDemo.vue` — labeled container for a single feature mini-demo: caption, the live
  editor slot, and a "what to try" hint. Lazy-mounts its editor when scrolled near.

Changed:
- `views/HomeView.vue` — rebuilt around the new sections (below).
- `components/SiteNav.vue`, `components/SiteFooter.vue` — refined to the elevated system + crafted
  icons + margin-rule.
- `views/PlaygroundView.vue`, `views/DocsView.vue` — reskinned onto shared primitives (structure
  preserved; look leveled up).
- `styles/site.css` — extend tokens/utilities for sheet, margin-rule, caret, reveal, icon sizing.

## Home page structure

1. **Hero** — self-typing Fraunces headline + blinking caret; sub-lede; `npm install` block;
   "Try it live" / "Read the docs". Below the fold-line: the real hero editor on an `EditorSheet`
   (live on desktop; static rendered preview on phones, preserving today's mobile behavior so the
   editor's fixed bottom toolbar doesn't hijack the landing page).
2. **Living demos band** — four `LiveDemo` instances, each a real `NextLevelEditor` scoped to one
   capability, lazy-mounted on scroll:
   - **Slash commands** — focus, type `/`, the real menu opens.
   - **Comments & mentions** — `enableComments`, a real thread you can resolve/reopen.
   - **Template variables** — `enableVariables`, `{{ pills }}` that render/fill live.
   - **Export** — buttons that actually produce Markdown/HTML into a preview pane.
   (Writing stats can ride along on the hero or comments instance via `showWritingStats`.)
3. **"One component. One `v-model`."** — DX section: crafted copy + syntax-highlighted usage card.
4. **Feature index** — the supporting cast (mobile, theming, plugin API, accessibility, sanitized
   paste, writing stats) as a tight crafted stroke-icon grid.
5. **CTA** — "sign here" manuscript motif with the vermilion pen; playground + GitHub star.

## Performance & correctness constraints

- **Lazy-mount** every non-hero live editor via IntersectionObserver; never mount 5 editors at
  first paint. Keep `keep-alive` friendliness.
- **Preserve existing behaviors that tests/mobile depend on:** phone static-preview fallback,
  synchronous initial view resolution in `App.vue`, editor self-managed theme sync, no
  transform-animation of toolbars on mount (breaks Playwright "stable"; per prior design notes).
- **Reduced motion:** every animation (caret, typing, ink-underline, reveal) gated behind
  `prefers-reduced-motion`.
- **Dark mode:** every new surface uses tokens so `.site-dark` just works; verified in preview.
- **No new runtime deps.** Icons are inline SVG. Fonts already loaded.

## Success criteria

- Home page feels unmistakably like a *writing tool*, visually distinct from generic dev-tool /
  SaaS landing pages; zero emoji in the UI chrome.
- At least four features are provably interactive on the home page (real editor behavior).
- Nav, Footer, Playground, Docs share the elevated system — no visual seams.
- Light + dark, desktop + mobile all verified in the preview server.
- `npm run lint`, `npx vue-tsc --noEmit`, `npm test -- --run`, and the build all pass; existing
  e2e expectations (playground deep-link, single `.editor-content`, stable toolbars) intact.

## Out of scope

- No change to the published library (`src/components`, `src/composables`, `src/index.ts`).
- No new marketing copy strategy beyond section-level headlines/hints.
- The separate Vue-plugin-readiness research + `/code-review ultra` request are a follow-up phase,
  not part of this redesign.
