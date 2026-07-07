<template>
  <div class="home">
    <!-- ============================ HERO ============================ -->
    <section class="hero">
      <div class="hero-grain" aria-hidden="true" />
      <div class="container hero-inner ruled">
        <span class="hero-badge">
          <span class="dot" aria-hidden="true" /> Open source · MIT · Vue 3 · Zero config
        </span>

        <h1 class="h-display hero-title">
          <span class="hero-line1">The rich-text editor</span><br>
          <!-- The animated line is decorative for assistive tech (it would
               otherwise be read char-by-char, then duplicate the sr-only line);
               the sr-only span is the single accessible phrase, derived from the
               same FULL constant so the two can't drift. -->
          <span class="hero-line2" aria-hidden="true">
            that <span class="ink is-in grad-text">{{ typed }}</span
            ><i v-if="showCaret" class="caret" />
          </span>
          <span class="sr-only">that {{ FULL }}</span>
        </h1>

        <p class="lede hero-lede">
          A professional-grade WYSIWYG editor for Vue&nbsp;3 — slash commands, live comments,
          template variables, one-click export and total theming. Bind one
          <code>v-model</code> and ship a writing experience people actually enjoy.
        </p>

        <div class="hero-ctas">
          <button class="btn btn-primary btn-lg" @click="$emit('navigate', 'playground')">
            Try it live <Icon name="arrow" :size="18" />
          </button>
          <button class="btn btn-ghost btn-lg" @click="$emit('navigate', 'docs')">Read the docs</button>
        </div>

        <div class="hero-install">
          <CodeBlock code="npm install next-level-editor" label="terminal" />
        </div>

        <ul class="hero-trust">
          <li v-for="t in trust" :key="t"><Icon name="check" :size="15" />{{ t }}</li>
        </ul>
      </div>
    </section>

    <!-- ===================== HERO LIVE EDITOR ====================== -->
    <section class="container demo-wrap">
      <RevealOnScroll>
        <EditorSheet filename="MyDocument.vue" badge="live">
          <NextLevelEditor
            v-if="!compact"
            v-model="demoContent"
            :show-writing-stats="true"
            width="100%"
            height="380px"
          />
          <div v-else class="demo-static" v-html="demoContent" />
        </EditorSheet>
      </RevealOnScroll>
      <p class="demo-hint">
        <Icon name="pen" :size="15" /> That's the real editor — select text, press
        <kbd>/</kbd>, or open the
        <button class="linklike" @click="$emit('navigate', 'playground')">full playground</button>.
      </p>
    </section>

    <!-- ======================= LIVING DEMOS ======================= -->
    <section class="section">
      <div class="container">
        <RevealOnScroll class="section-head">
          <span class="eyebrow"><Icon name="bolt" :size="15" /> Proof, not promises</span>
          <h2 class="h-section">Every feature, <span class="ink">live on this page.</span></h2>
          <p class="lede">
These aren't screenshots. Each panel below is the real component — type in
            it, comment on it, break it. That's the whole pitch.
</p>
        </RevealOnScroll>

        <div class="demos">
          <LiveDemo
            index="01 — SLASH COMMANDS"
            icon="slash"
            title="Type / and build anything"
            desc="A keyboard-first block menu — headings, lists, tables, quotes, code — all reachable without lifting your hands from the keys."
            hint="Click in, then press <kbd>/</kbd>"
            filename="notes.md"
          >
            <NextLevelEditor v-model="slashContent" width="100%" height="300px" />
          </LiveDemo>

          <LiveDemo
            index="02 — COMMENTS & MENTIONS"
            icon="comment"
            title="Collaborate inline"
            desc="Real comment threads anchored to the text, with @mentions, resolve and reopen, and a dedicated review sidebar."
            hint="Select a sentence &amp; add a comment, or type <kbd>@</kbd>"
            filename="proposal.doc"
            alt
          >
            <NextLevelEditor
              v-model="commentsContent"
              :enable-comments="true"
              :mention-search="demoMentionSearch"
              width="100%"
              height="300px"
            />
          </LiveDemo>

          <LiveDemo
            index="03 — TEMPLATE VARIABLES"
            icon="braces"
            title="Mail-merge, built in"
            :desc="'Insert {{ mustache }} tokens that render as styled pills and fill from your data — perfect for contracts, emails and templates.'"
            hint="Open the variables panel &amp; insert a token"
            filename="contract.tpl"
          >
            <NextLevelEditor v-model="variablesContent" :enable-variables="true" width="100%" height="300px" />
          </LiveDemo>

          <LiveDemo
            index="04 — EXPORT ANYWHERE"
            icon="export"
            title="Clean output, one click"
            desc="Round-trip to pristine HTML or Markdown with faithful formatting. Edit on the left, watch the export update on the right."
            hint="Edit the doc, then flip HTML / Markdown"
            filename="release-notes.md"
            alt
          >
            <div class="export-demo">
              <NextLevelEditor v-model="exportContent" width="100%" height="300px" />
              <div class="export-out">
                <div class="export-tabs">
                  <button :class="{ on: exportMode === 'markdown' }" @click="exportMode = 'markdown'">Markdown</button>
                  <button :class="{ on: exportMode === 'html' }" @click="exportMode = 'html'">HTML</button>
                </div>
                <pre class="export-pre"><code>{{ exportOutput }}</code></pre>
              </div>
            </div>
          </LiveDemo>
        </div>
      </div>
    </section>

    <!-- ====================== DX / v-model ======================== -->
    <section class="section alt">
      <div class="container">
        <div class="split">
          <RevealOnScroll class="split-copy ruled">
            <span class="eyebrow"><Icon name="bolt" :size="15" /> Developer experience</span>
            <h2 class="h-section">One component.<br>One <code>v-model</code>.</h2>
            <p class="lede">
No document schema to learn, no render props, no ceremony. It binds to a
              plain HTML string — exactly what you'd expect from a Vue component.
</p>
            <ul class="split-list">
              <li v-for="p in points" :key="p"><Icon name="check" :size="16" />{{ p }}</li>
            </ul>
            <button class="btn btn-primary" @click="$emit('navigate', 'docs')">Get started <Icon name="arrow" :size="16" /></button>
          </RevealOnScroll>
          <RevealOnScroll class="split-code" :delay="120">
            <CodeBlock :code="usageSnippet" lang="vue" />
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <!-- ===================== FEATURE INDEX ======================== -->
    <section class="section">
      <div class="container">
        <RevealOnScroll class="section-head">
          <span class="eyebrow"><Icon name="layers" :size="15" /> And the rest of the kit</span>
          <h2 class="h-section">Everything else, <span class="ink">already handled.</span></h2>
        </RevealOnScroll>
        <div class="grid-auto features">
          <RevealOnScroll v-for="(f, i) in features" :key="f.title" :delay="i * 55">
            <article class="feature card card-hover">
              <span class="icon-tile"><Icon :name="f.icon" :size="24" /></span>
              <h3 class="feature-title">{{ f.title }}</h3>
              <p class="feature-desc">{{ f.desc }}</p>
            </article>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <!-- ========================== CTA ============================= -->
    <section class="section">
      <div class="container">
        <RevealOnScroll>
          <div class="cta-band sheet">
            <div class="cta-rule" aria-hidden="true" />
            <span class="eyebrow"><Icon name="pen" :size="15" /> Sign here</span>
            <h2 class="cta-title h-display">Ready to give your users<br>an editor they'll <span class="grad-text">love</span>?</h2>
            <p class="cta-sub">
Free, open source, production-ready. Add it to your Vue app in under a minute —
              then never think about rich text again.
</p>
            <div class="hero-ctas">
              <button class="btn btn-primary btn-lg" @click="$emit('navigate', 'playground')">Open the playground <Icon name="arrow" :size="18" /></button>
              <a class="btn btn-ghost btn-lg" href="https://github.com/andrecj93/next-level-editor" target="_blank" rel="noopener"><Icon name="star" :size="17" /> Star on GitHub</a>
            </div>
            <p class="cta-signoff">— crafted for people who care about writing</p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import NextLevelEditor from "../../components/NextLevelEditor.vue";
import { htmlToMarkdown, formatHtml } from "../../utils/export";
import { demoMentionSearch } from "../examples/demoTeam";
import CodeBlock from "../components/CodeBlock.vue";
import Icon from "../components/Icon.vue";
import type { IconName } from "../components/icons";
import EditorSheet from "../components/EditorSheet.vue";
import RevealOnScroll from "../components/RevealOnScroll.vue";
import LiveDemo from "../components/LiveDemo.vue";

defineEmits<{ navigate: [id: string] }>();

/* ---- Phones get a static preview of the hero editor (its fixed bottom
   toolbar shouldn't dominate the landing page). Resolved synchronously so
   there's no editor→preview flash on load. ---- */
const mql = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;
const compact = ref(mql?.matches ?? false);
const onMqChange = (e: MediaQueryListEvent) => (compact.value = e.matches);

/* ---- Hero: type the closing phrase behind a live pen caret ---- */
const FULL = "writes back.";
const typed = ref(FULL);
const showCaret = ref(false);
let typingTimer: number | undefined;

onMounted(() => {
  mql?.addEventListener("change", onMqChange);

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  showCaret.value = true;
  if (reduce) return; // leave the full phrase in place, just blink the caret

  typed.value = "";
  let i = 0;
  const tick = () => {
    typed.value = FULL.slice(0, i);
    if (i < FULL.length) {
      i += 1;
      typingTimer = window.setTimeout(tick, 92 + (i % 3) * 26); // organic cadence
    }
  };
  typingTimer = window.setTimeout(tick, 480);
});

onUnmounted(() => {
  mql?.removeEventListener("change", onMqChange);
  if (typingTimer) clearTimeout(typingTimer);
});

/* ---- Hero editor content ---- */
const demoContent = ref(
  `<h2>Edit me — I'm a real editor</h2>` +
    `<p>Try <strong>bold</strong>, <em>italic</em>, or a <a href="#">link</a>. ` +
    `Type <code>/</code> for slash commands, or select text for the floating toolbar.</p>` +
    `<ul><li>Tables, images &amp; code blocks</li><li>Undo / redo, find &amp; replace</li><li>Light &amp; dark themes</li></ul>` +
    `<blockquote>“Finally, an editor that just works.”</blockquote>`
);

/* ---- Per-demo seeded content ---- */
const slashContent = ref(
  `<h3>Release checklist</h3><p>Put your cursor at the end of this line and press <code>/</code> to add a block…</p><p></p>`
);
const commentsContent = ref(
  `<h3>Q3 launch proposal</h3><p>We should ship the new onboarding flow before the conference. Select this sentence and leave a comment, or type <strong>@</strong> to mention a teammate.</p>`
);
const variablesContent = ref(
  `<h3>Offer letter</h3><p>Dear <strong>{{ candidate_name }}</strong>, we're delighted to offer you the role of <strong>{{ job_title }}</strong>, starting <strong>{{ start_date }}</strong>.</p>`
);
const exportContent = ref(
  `<h2>v2.0 — highlights</h2><p>A <strong>faster</strong> editor with <em>live</em> collaboration.</p><ul><li>Slash commands</li><li>Comments &amp; mentions</li></ul><blockquote>Ship it.</blockquote>`
);

/* ---- Export demo output ---- */
const exportMode = ref<"markdown" | "html">("markdown");
const exportOutput = computed(() =>
  exportMode.value === "markdown"
    ? htmlToMarkdown(exportContent.value)
    : formatHtml(exportContent.value)
);


const trust = ["No dependencies to wrangle", "TypeScript-first", "Fully themeable", "SSR-friendly"];

const features: { icon: IconName; title: string; desc: string }[] = [
  { icon: "chart", title: "Writing stats", desc: "Live word count, reading time, readability scoring and lightweight SEO hints." },
  { icon: "palette", title: "Beautiful theming", desc: "A token-based design system with first-class light and dark modes out of the box." },
  { icon: "mobile", title: "Mobile ready", desc: "A dedicated touch toolbar, responsive layout and comfortable 44px targets." },
  { icon: "puzzle", title: "Plugin system", desc: "Register toolbar buttons, commands and slash commands through a clean plugin API." },
  { icon: "shield", title: "Safe by default", desc: "Every paste and import is sanitised through explicit allowlists and DOMPurify." },
  { icon: "access", title: "Accessible", desc: "Keyboard-navigable, screen-reader friendly, with visible focus everywhere." },
];

const points = [
  "Two-way binding with a plain HTML string",
  "Feature flags to enable only what you need",
  "Sanitised paste & import for safe HTML round-trips",
  "Accessible: keyboard-navigable & screen-reader friendly",
];

const usageSnippet = `<script setup>
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/style.css'
import { ref } from 'vue'

const content = ref('<h1>Hello world</h1>')
</scr${""}ipt>

<template>
  <NextLevelEditor
    v-model="content"
    :enable-comments="true"
    :enable-variables="true"
    :show-writing-stats="true"
  />
</template>`;
</script>

<style scoped>
/* ============================= HERO ============================= */
.hero { position: relative; padding: clamp(60px, 10vw, 128px) 0 44px; text-align: center; overflow: hidden; }
.hero-grain {
  position: absolute; inset: -20% 0 auto 0; height: 620px; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 30%, rgba(196, 57, 44, 0.10), transparent 70%),
    radial-gradient(ellipse 42% 40% at 72% 42%, rgba(221, 106, 58, 0.08), transparent 72%);
}
.site-dark .hero-grain {
  background:
    radial-gradient(ellipse 60% 50% at 50% 30%, rgba(240, 112, 90, 0.16), transparent 70%),
    radial-gradient(ellipse 42% 40% at 72% 42%, rgba(244, 160, 122, 0.11), transparent 72%);
}
.hero-inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
/* the manuscript rule is a centred flourish here rather than a hard left margin */
.hero-inner.ruled { padding-left: 0; }
.hero-inner.ruled::before { display: none; }

.hero-badge {
  display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
  color: var(--ink-soft); background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px; padding: 7px 16px; box-shadow: var(--shadow-sm);
}
.hero-badge .dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }

.hero-title { margin: 26px 0 0; }
.hero-line2 { display: inline-block; } /* keep caret on the same baseline */
.hero-title .grad-text { font-style: italic; }
/* reserve the animated phrase's width so the caret doesn't reflow the line */
.hero-title .ink { min-width: 0; }

.hero-lede { max-width: 660px; margin: 24px auto 0; }
.hero-lede code { font-family: var(--font-mono); font-size: 0.9em; background: var(--brand-gradient-soft); padding: 2px 7px; border-radius: 6px; }
.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 34px; }
.hero-install { width: min(430px, 100%); margin: 30px auto 0; text-align: left; }
.hero-trust { display: flex; flex-wrap: wrap; gap: 8px 22px; justify-content: center; list-style: none; padding: 0; margin: 28px 0 0; font-size: 14px; color: var(--ink-soft); }
.hero-trust li { display: flex; align-items: center; gap: 7px; }
.hero-trust :deep(.ic) { color: #22c55e; }

/* ========================= HERO EDITOR ========================= */
.demo-wrap { margin-top: 8px; }
.demo-static { padding: 22px 22px 26px; line-height: 1.7; color: var(--ink); }
.demo-static :deep(h2) { font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5em; letter-spacing: -0.01em; }
.demo-static :deep(p) { margin: 0 0 0.8em; color: var(--ink-soft); }
.demo-static :deep(ul) { margin: 0 0 0.8em; padding-left: 20px; color: var(--ink-soft); }
.demo-static :deep(li) { margin: 3px 0; }
.demo-static :deep(a) { color: var(--accent); text-decoration: underline; }
.demo-static :deep(code) { font-family: var(--font-mono); font-size: 0.86em; background: var(--brand-gradient-soft); padding: 2px 6px; border-radius: 5px; }
.demo-static :deep(blockquote) { margin: 12px 0 0; padding: 4px 0 4px 16px; border-left: 3px solid var(--accent); font-style: italic; color: var(--ink-soft); }
.demo-hint { display: flex; align-items: center; justify-content: center; gap: 7px; text-align: center; margin: 16px 0 0; font-size: 14px; color: var(--ink-muted); }
.demo-hint :deep(.ic) { color: var(--accent); }
.demo-hint kbd { font-family: var(--font-mono); background: var(--bg-subtle); border: 1px solid var(--border-strong); border-radius: 5px; padding: 1px 6px; }
.linklike { background: none; border: none; padding: 0; font: inherit; color: var(--brand-500); font-weight: 600; cursor: pointer; }

/* ======================== LIVING DEMOS ========================= */
.section-head { max-width: 640px; margin: 0 auto 56px; text-align: center; }
.section-head .eyebrow { justify-content: center; }
.section-head .h-section { margin: 14px 0; }
.demos { display: flex; flex-direction: column; gap: clamp(48px, 8vw, 104px); }

/* export demo split */
.export-demo { display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
.export-out { display: flex; flex-direction: column; border-left: 1px solid var(--border); background: var(--code-bg); min-width: 0; }
.export-tabs { display: flex; gap: 4px; padding: 8px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
.export-tabs button {
  font-family: var(--font-mono); font-size: 12px; cursor: pointer; color: #b3a996;
  background: transparent; border: 1px solid transparent; border-radius: 7px; padding: 4px 11px;
  transition: background 0.15s, color 0.15s;
}
.export-tabs button.on { color: #fff; background: rgba(255, 255, 255, 0.12); }
.export-pre { margin: 0; padding: 14px 16px; overflow: auto; flex: 1; color: var(--code-ink); font-family: var(--font-mono); font-size: 12.5px; line-height: 1.6; }
@media (max-width: 720px) { .export-demo { grid-template-columns: 1fr; } .export-out { border-left: none; border-top: 1px solid var(--border); max-height: 260px; } }

/* ============================ SPLIT ============================ */
.section.alt { background: var(--bg-subtle); }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
.split-copy, .split-code { min-width: 0; }
.split-copy .h-section { margin: 12px 0 16px; }
.split-copy code { font-family: var(--font-mono); font-size: 0.82em; background: var(--brand-gradient-soft); padding: 2px 8px; border-radius: 7px; }
.split-list { list-style: none; padding: 0; margin: 22px 0 28px; display: flex; flex-direction: column; gap: 12px; }
.split-list li { display: flex; align-items: flex-start; gap: 10px; color: var(--ink-soft); line-height: 1.5; }
.split-list :deep(.ic) { color: var(--accent); margin-top: 2px; }

/* ======================= FEATURE INDEX ======================== */
.features { margin-top: 8px; }
.feature { padding: 26px 24px; height: 100%; }
.feature-title { font-family: var(--font-display); font-size: 1.24rem; font-weight: 600; margin: 16px 0 8px; letter-spacing: -0.01em; }
.feature-desc { margin: 0; color: var(--ink-soft); line-height: 1.58; font-size: 0.97rem; }

/* ============================= CTA ============================= */
.cta-band { position: relative; overflow: hidden; text-align: center; border-radius: var(--radius-xl); padding: clamp(44px, 6vw, 80px) clamp(24px, 5vw, 72px); }
.cta-rule { position: absolute; top: 22px; bottom: 22px; left: clamp(20px, 5vw, 54px); width: 2px; background: var(--rule-red); border-radius: 2px; }
.cta-band .eyebrow { justify-content: center; }
.cta-title { font-size: clamp(1.9rem, 4vw, 3rem); line-height: 1.08; margin: 14px 0 0; }
.cta-sub { max-width: 520px; margin: 18px auto 4px; color: var(--ink-soft); line-height: 1.62; }
.cta-band .hero-ctas { margin-top: 30px; }
.cta-signoff { margin: 26px 0 0; font-family: var(--font-display); font-style: italic; color: var(--ink-muted); font-size: 1.02rem; }

/* ======================== RESPONSIVE ========================== */
@media (max-width: 820px) {
  .split { grid-template-columns: 1fr; gap: 28px; }
}

/* visually-hidden but available to AT and tests */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
</style>
