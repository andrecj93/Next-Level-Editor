# Website Redesign Implementation Plan

> **For agentic workers:** This is cohesive frontend-design work. Execute inline with the
> `frontend-design:frontend-design` skill, verifying each stage in the preview server (light +
> dark, desktop + mobile). The existing unit + e2e suites are the correctness guardrails — do NOT
> author fake per-step failing CSS tests. Run the full check gate (lint, vue-tsc, vitest, e2e,
> build) at the end. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild the `src/demo/` site into a distinctive, tactile "Editorial Ink" experience where
the editor itself is the hero and features are proven by live, interactive mini-demos.

**Architecture:** Evolve the existing site.css token system (no teardown). Add a handful of small
reusable demo primitives (Icon, EditorSheet, RevealOnScroll, LiveDemo), rebuild HomeView around
them, then bring Nav/Footer/Playground/Docs onto the same system. Non-hero live editors lazy-mount
on scroll via IntersectionObserver.

**Tech Stack:** Vue 3 `<script setup>`, TypeScript (strict), plain CSS custom properties, inline
SVG icons, IntersectionObserver. No new runtime deps.

---

### Task 1: Design foundation — tokens + Icon set

**Files:**
- Modify: `src/demo/styles/site.css`
- Create: `src/demo/components/Icon.vue`

- [ ] Extend `site.css` with new tokens/utilities: `.sheet` (floating paper frame + page-edge +
      `--shadow-lg`), `.margin-rule` (faint vermilion vertical line), `.caret` (blinking vermilion
      caret, `prefers-reduced-motion` safe), `.reveal` / `.reveal-in` (fade-up + ink-underline),
      icon sizing. Reuse existing color/spacing tokens; add dark-mode values where a new surface
      needs one.
- [ ] Create `Icon.vue`: `name` prop → inline stroke SVG (`stroke="currentColor"`, `fill="none"`,
      `stroke-width≈1.8`, 24×24 viewBox). Icons needed: slash, comment, variable/braces, export,
      chart/stats, mobile, palette/theme, plugin/puzzle, shield (sanitized paste), accessibility,
      arrow-right, check, star, sun, moon, github, menu, close. One `<svg>` per name via a map.
- [ ] Verify in preview: an Icon smoke render + tokens compile with no console errors.
- [ ] Commit: `feat(site): design tokens + crafted stroke icon set`

### Task 2: Reusable primitives — EditorSheet, RevealOnScroll, LiveDemo

**Files:**
- Create: `src/demo/components/EditorSheet.vue` — slot wrapper: page-edge, warm shadow, optional
  `filename` prop for the top chrome (traffic dots + mono filename). Replaces ad-hoc `.demo-frame`.
- Create: `src/demo/components/RevealOnScroll.vue` — IntersectionObserver wrapper; adds
  `.reveal-in` when in view (once). No-op / immediately-visible under `prefers-reduced-motion`.
- Create: `src/demo/components/LiveDemo.vue` — props: `title`, `hint`, `icon`. Renders a caption,
  a slot for the live editor, and a "what to try" hint. Uses IntersectionObserver to set a
  `mounted` flag so the parent can `v-if`-gate the heavy editor (lazy mount); shows a lightweight
  skeleton/static preview until then.

- [ ] Build the three components following existing demo component conventions (`<script setup>`,
      scoped styles, tokens).
- [ ] Verify each renders in isolation via a temporary mount in HomeView, preview clean.
- [ ] Commit: `feat(site): EditorSheet, RevealOnScroll, LiveDemo primitives`

### Task 3: HomeView — hero

**Files:**
- Modify: `src/demo/views/HomeView.vue`

- [ ] Rebuild hero: self-typing Fraunces headline with blinking `.caret` (typing loop respects
      `prefers-reduced-motion` — show final text immediately when reduced), sub-lede, `npm install`
      CodeBlock, "Try it live" / "Read the docs" CTAs, margin-rule motif.
- [ ] Below fold-line: real hero `NextLevelEditor` wrapped in `EditorSheet` (desktop); keep the
      existing phone static-preview fallback (`compact` MediaQuery) exactly as-is.
- [ ] Verify: hero types then settles; caret blinks; reduced-motion shows static; mobile shows
      static preview; no layout shift.
- [ ] Commit: `feat(home): typographic hero with live editor sheet`

### Task 4: HomeView — living demos band (4 lazy demos)

**Files:**
- Modify: `src/demo/views/HomeView.vue`

- [ ] Add four `LiveDemo`s, each lazy-mounting a scoped `NextLevelEditor`:
      1. Slash commands — seed content inviting `/`.
      2. Comments — `:enable-comments="true"` + a `mentionSearch` stub returning 2–3 users; seed a
         thread.
      3. Variables — `:enable-variables="true"` + seeded `{{ pills }}`.
      4. Export — editor + buttons wired to the real export utils producing Markdown/HTML into a
         preview pane (reuse `src/utils/export`).
- [ ] Ensure only the hero editor mounts at first paint; the four mount on scroll. Confirm via
      preview (no 5 editors on load).
- [ ] Verify each demo's interaction actually works (type `/`, resolve a comment, fill a variable,
      export produces output).
- [ ] Commit: `feat(home): four live interactive feature demos`

### Task 5: HomeView — DX section, feature index, CTA

**Files:**
- Modify: `src/demo/views/HomeView.vue`
- Modify: `src/demo/components/FeatureCard.vue` (swap emoji prop → `Icon` name)

- [ ] DX section "One component. One `v-model`." with syntax-highlighted usage card + RevealOnScroll.
- [ ] Feature index grid of the supporting features using `Icon` (no emoji): mobile, theming,
      plugin API, accessibility, sanitized paste, writing stats.
- [ ] CTA band with "sign here" manuscript motif + vermilion pen; playground + GitHub star buttons.
- [ ] Verify light/dark, reveals fire once, reduced-motion safe.
- [ ] Commit: `feat(home): DX section, crafted feature index, manuscript CTA`

### Task 6: SiteNav + SiteFooter

**Files:**
- Modify: `src/demo/components/SiteNav.vue`, `src/demo/components/SiteFooter.vue`

- [ ] Refine nav: elevated surface, crafted Icon (menu/close/sun/moon/github), clearer active
      state, margin-rule accent. Preserve existing `navigate` / `toggle-theme` events + a11y.
- [ ] Refine footer to match; Icon-based social/links; no emoji.
- [ ] Verify sticky behavior, mobile menu, theme toggle still drive editor theme sync (App.vue).
- [ ] Commit: `feat(site): elevated nav + footer`

### Task 7: Playground + Docs reskin

**Files:**
- Modify: `src/demo/views/PlaygroundView.vue`, `src/demo/views/DocsView.vue`

- [ ] Reskin both onto shared primitives/tokens (EditorSheet where an editor is framed, Icon,
      section headers, margin-rule). Preserve structure, deep-link behavior, and the single
      `.editor-content` the e2e suite relies on.
- [ ] Verify playground deep-link (`?view=playground` / `?empty=true`) still resolves synchronously
      and renders one editor.
- [ ] Commit: `feat(site): reskin playground + docs onto shared system`

### Task 8: Full verification gate

- [ ] `npm run lint`
- [ ] `npx vue-tsc --noEmit`
- [ ] `npm test -- --run`
- [ ] `npm run test:e2e` (chromium + mobile-safari)
- [ ] `npm run build` and `npm run build:demo`
- [ ] Preview pass: Home/Playground/Docs in light + dark, desktop + mobile; console clean.
- [ ] Fix any failures, then final commit if needed.

---

## Self-review notes

- Spec coverage: hero (T3), 4 live demos (T4), DX+index+CTA (T5), nav/footer (T6), playground/docs
  (T7), primitives+icons+tokens (T1–T2), perf/reduced-motion/dark/e2e guards (T3–T8). All covered.
- No new runtime deps; export uses existing `src/utils/export`; editor props verified
  (`showWritingStats`, `enableComments`, `enableVariables`, `mentionSearch`, `width`, `height`).
- Preserved invariants called out per task: mobile static preview, synchronous view resolution,
  single `.editor-content`, no mount-time toolbar transforms, theme sync.
