<div align="center">

<!-- Absolute, not relative: npmjs.com renders this README without the repo
     behind it, so a relative path shows a broken image on the package page. -->
<img src="https://raw.githubusercontent.com/andrecj93/Next-Level-Editor/main/public/og-image.png" alt="Next Level Editor — the rich-text editor that writes back" width="820" />

<h1>Next Level Editor</h1>

**The rich-text editor for Vue 3 that writes back.**

A manuscript workspace, optional writing notes, chapter navigation, comments,
template variables, and PDF / Word / Markdown / HTML export — in one `v-model`.

[**Live demo →**](https://andrecj93.github.io/Next-Level-Editor/) &nbsp;·&nbsp;
[Playground](https://andrecj93.github.io/Next-Level-Editor/#playground) &nbsp;·&nbsp;
[Docs](https://andrecj93.github.io/Next-Level-Editor/#docs)

[![CI/CD](https://github.com/andrecj93/Next-Level-Editor/actions/workflows/ci.yml/badge.svg)](https://github.com/andrecj93/Next-Level-Editor/actions/workflows/ci.yml)
[![Playwright Tests](https://img.shields.io/badge/Playwright-browser%20checks-45ba4b?logo=playwright)](https://github.com/andrecj93/Next-Level-Editor/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/next-level-editor.svg)](https://www.npmjs.com/package/next-level-editor)
[![WCAG 2.2 AA](https://img.shields.io/badge/WCAG_2.2_AA-0_violations-45ba4b)](#why-this-one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.3%2B-4FC08D.svg)](https://vuejs.org/)

</div>

---

## Optional document workspace

Enable `document-tools` for durable versions, Word import, searchable tagged PDF,
content accessibility checks, English/Portuguese controls, tracked review,
coauthoring, host AI proposals, citations, page setup, block operations, and typed
templates. [Integration guide and capability boundaries](docs/document-workspace.md).
Persistence, server authorization, and AI services use explicit host adapters.

## Start in 30 seconds

```bash
npm install next-level-editor
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/style.css'

const content = ref('<p>Hello World!</p>')
</script>

<template>
  <NextLevelEditor v-model="content" writing-mode />
</template>
```

That is the whole integration. No config, no plugin registry to wire up, no
peer dependencies beyond Vue 3.3+. `content` is HTML, and it stays sanitized
on every keystroke, paste and import.

> **Try before installing:** the [live demo](https://andrecj93.github.io/Next-Level-Editor/)
> is the real editor, not a video.

---

## Why this one

**It writes back.** Pause while writing and find optional notes beside the exact
passages they refer to. Repeated words, wordy phrases, and long sentences get
small, explainable suggestions. Apply a change, undo it, or keep your wording.
These English prose checks run on your device; they do not generate text or call
an AI service. The chapter outline helps you find your way through longer work.

**Revise without losing your place.** In writing mode, Find & Replace stays
beside the manuscript, with a chapter and sentence excerpt for each match.
Enter and Shift+Enter move through results while focus stays in search. Replace
one occurrence or all, undo in the document, and keep writing with search open.
Changing a heading or list keeps your caret and selected passage in place, so
you can continue the sentence or apply another style without selecting it again.

**It exports what you actually see.** PDF, Word, Markdown and HTML round-trip
your tables, checklists, page breaks, code blocks and embeds. Videos that no
static format can render degrade to a labelled link instead of vanishing —
because silently losing content is worse than admitting the format's limits.
PDF export prepares numbered A4 pages with progress and cancellation, including
long manuscripts and explicit page breaks. A Unicode text layer makes prose
searchable and selectable, with chapter bookmarks and working document links.
Page appearance is rendered as images; this is not a tagged PDF/UA export.

**You only download what you use.** Syntax
highlighting, the colour picker and both exporters are separate chunks your
bundler fetches the first time someone opens them — a page that never opens a
code block never pays for Prism.

**Accessibility is checked.** axe-core scans WCAG 2.2 A/AA in covered application
states, including dialogs, menus, mobile layouts, and 320px reflow. The suite
also exercises keyboard navigation, live announcements, skip links, and focus
restoration. Automated checks supplement manual keyboard and visual review.

**The HTML it eats cannot bite you.** The sanitizer is an explicit allowlist,
adversarially audited in real Chromium against the classic and modern XSS/mXSS
corpus — namespace confusion, the DOMPurify-2.0 `form`/`mglyph` bypass, 15
scheme-obfuscation variants — with no script execution produced. Style
*values* are bounded too, so pasted content cannot paint a clickable overlay
over your UI.

**It is tested like something you'd put in production.** 4,882 unit tests
across 383 files, plus end-to-end checks on Chromium and mobile Safari. Both
suites gate the npm publish; neither is decoration.

---

## What you get

|  |  |
| --- | --- |
| ✍️ **Writing** | Bold/italic/underline/strike, 6 heading levels, lists, checklists, alignment, colours, font sizes, format painter |
| ⚡ **Speed** | Slash commands, command palette, 80+ keyboard shortcuts, find & replace, auto-save |
| 📊 **Structure** | Tables with a designer, page breaks, table of contents, code blocks in 22 languages |
| 🖼️ **Media** | Images, file manager, YouTube/Vimeo embeds, resizable & draggable containers |
| 💬 **Collaboration** | Threaded comments with mentions and resolution |
| 🧩 **Templating** | `{{ variables }}` with live substitution, 8 document templates |
| 📤 **Export** | PDF, Word, Markdown, HTML — plus three view modes (code / split / preview) |
| 🎨 **Theming** | 4 presets and 14 CSS custom properties; light and dark throughout |

Every one of these is documented in detail below.

---

## Everything else

The editor has a lot of surface. It is all here, folded so the page stays
readable — click any section to open it.

<details>
<summary><b>📸 Screenshots — light and dark</b></summary>

<!-- markdownlint-disable MD033 -->
<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/d43e86b6-1f22-4775-91b5-3699eb6b00a7" alt="Light Mode" width="100%"/>
      <br />
      <em>Light Mode - Clean and professional interface with comprehensive toolbar</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/5314509f-8f25-45fd-92b5-c1f625754a98" alt="Dark Mode" width="100%"/>
      <br />
      <em>Dark Mode - Beautiful dark theme with code/split/preview view modes</em>
    </td>
  </tr>
</table>
<!-- markdownlint-enable MD033 -->

</details>

<details>
<summary><b>✨ Every feature, in detail</b></summary>

> **Why Next Level Editor?** Built with modern web standards, best practices, and a focus on developer experience. Every feature is thoroughly tested, accessible, and performant.

### 🎨 Modern UI & Experience

- **CKEditor-Inspired Toolbar** - Professional horizontal toolbar with dropdown menus
- **Three View Modes** - Code view, Split view (side-by-side), and Preview view for different workflows
- **Responsive Design** - Adapts seamlessly from desktop to mobile
- **Dark Mode** - Beautiful dark theme with smooth transitions and localStorage persistence
- **Floating Toolbar** - Medium-style context menu appears on text selection
- **Context Menu** - Right-click menu with cut, copy, paste, and formatting operations
- **Smart Toolbar** - Intelligent toolbar that adapts based on content and selection
- **Visual Feedback** - Hover effects, active states, and smooth animations
- **Skeleton Loading** - Smooth loading states for better perceived performance

### ✏️ Rich Text Editing

- **Text Formatting** - Bold, italic, underline, strikethrough
- **Headings** - H1, H2, H3, and paragraph styles with keyboard shortcuts
- **Lists** - Ordered and unordered lists with nested support
- **Text Alignment** - Left, center, right, justify for all elements
- **Color Pickers** - Text and background colors with 25 presets + custom selector
- **Font Sizes** - 4 preset sizes (small, normal, large, huge)
- **Clear Formatting** - Remove all formatting with one click

### 💻 Code & Media

- **Syntax Highlighting** - Code blocks with Prism.js for 22 programming languages
  - JavaScript, TypeScript, Python, Java, C++, Go, Rust, PHP, Ruby, SQL, and more
- **File Manager** - CKBox-inspired file management system for organizing media assets
  - Upload multiple files with drag-and-drop support (max 10MB per file)
  - Grid and list view modes for browsing files
  - Insert images directly or download links for other file types
  - LocalStorage persistence (in demo - use server storage in production)
  - File type validation and thumbnail generation for images
- **Image Upload** - URL input or file upload with live preview and alt text for accessibility
- **Video Embeds** - Auto-detect and embed YouTube and Vimeo videos with responsive iframes
- **Emoji Picker** - 100+ emojis across 7 categories with search functionality
- **Tables** - Create custom tables with header rows and configurable columns

### ⚡ Power Features

- **Command Palette** - Quick access to all commands with keyboard-driven interface
- **Slash Commands** - Type `/` to access 14+ quick actions
- **Find & Replace** - Full-featured search with case-sensitive and whole-word options (Ctrl+F)
- **Auto-Save** - 2-second debounce, ordered saves, pending/error status and retry. Supply `saveHandler` for persistence; without it, the indicator reports a `v-model` update. The playground saves a local draft in your browser.
- **Export** - Download as HTML, Markdown, PDF, or Word document with one click
- **Format HTML** - Pretty-print HTML code with proper indentation
- **View HTML Code** - Modal to view and edit formatted HTML source
- **Full-Screen Mode** - Distraction-free writing with centered content layout
- **Word & Character Count** - Live statistics in footer
- **Undo/Redo** - Full history management with Ctrl+Z/Ctrl+Shift+Z and visual timeline
- **History Timeline** - Visual representation of document history for easy navigation

### 🚀 Productivity Features

- **Format Painter** - Copy formatting from one selection and apply it to another with one click
- **Document Templates** - 8 pre-built templates across 4 categories (Documents, Email, Blog, Marketing)
  - Meeting Notes, Project Proposal, Blog Post, Email, Product Description, Press Release, Technical Documentation
- **Page Breaks** - Insert visual page breaks for print/export formatting
- **Table of Contents** - Auto-generate clickable TOC from document headings (H1-H6) with smooth scrolling
- **Table Designer** - Advanced table editing with properties modal for customization
- **Spell Checker** - Browser-based spell checking with enable/disable toggle
- **Virtual Scrolling** - Performance-optimized rendering for large documents

### 🔐 Security & Quality

- **HTML Sanitization** - Every ingestion path (paste, import, `v-model`, HTML-source editing) goes through an explicit tag/attribute/style allowlist, with obfuscated-scheme and round-trip tamper tests. Adversarially audited in real Chromium against the classic and modern XSS/mXSS corpus — namespace confusion, the DOMPurify-2.0 `form`/`mglyph` bypass, 15 scheme-obfuscation variants, foster-parenting — with **no script execution produced**. Style values are bounded, not just property names, so stored content cannot paint a clickable overlay
- **Accessibility** - axe-core WCAG 2.2 A/AA scan across 14 application states, **zero violations**, enforced in CI
- **TypeScript Strict Mode** - Full type safety throughout the codebase
- **4,646 Unit Tests** - Across 357 files, with enforced coverage thresholds (70% lines/functions/statements, 65% branches)
- **239 Passing E2E Checks** - Playwright across Chromium and mobile Safari, both gating the release
- **0 Known Vulnerabilities** - `npm audit` clean for production dependencies
- **GitHub Actions CI/CD** - Unit, lint, type-check and E2E all gate the demo deploy and the npm publish
- **Keyboard & screen readers** - Full keyboard operability, ARIA live regions, skip links, focus management, and 44×44px touch targets
- **Plugin System** - Register plugins with the `plugins` prop: slash commands, Tools-menu buttons and palette commands
- **Mobile Gestures** - Touch-friendly interface with 10 gesture types

### 🎯 Advanced Features (Opt-in)

#### ✍️ Writing Assistant & Analytics

Professional text analysis powered by industry-standard readability algorithms:

- **Readability Scoring** - Flesch Reading Ease, Flesch-Kincaid Grade Level, Gunning Fog, Coleman-Liau, ARI
- **Statistics Panel** - Word count, character count, sentence count, paragraph count, reading/speaking time
- **Sentence Analysis** - Distribution by length (short/medium/long), average words per sentence
- **Word Analysis** - Most common words, average syllables per word, vocabulary richness
- **Writing Issues Detection** - Passive voice, complex words, long sentences, repeated words
- **SEO Analysis** - Keyword density, meta description length, heading structure

#### 💬 Comments & Collaboration

Full-featured commenting system for collaborative editing:

- **Comment Threads** - Add comments to any selected text with Range API anchoring
- **Replies** - Thread-based conversation with nested replies
- **@ Mentions** - Tag team members with autocomplete dropdown
- **Status Management** - Mark threads as open or resolved
- **Visual Highlights** - Color-coded text highlighting (yellow for open, green for resolved)
- **Sidebar UI** - Dedicated sidebar with tabs for open/resolved comments
- **Persistence** - Export/import threads as JSON for storage
- **Auto-restore** - Automatically re-anchor comments after content changes

#### ♿ Accessibility

**Audited with axe-core against WCAG 2.2 A/AA across 14 application states** —
the marketing page in both themes, the editor empty and with a caret, four
open dialogs, an open toolbar menu, the colour popup, a mobile viewport, and
320px reflow. **Zero violations**, and `e2e/accessibility.spec.ts` re-runs the
scan on every CI build so it stays that way.

That audit is automated, and automated scanning catches roughly a third of
real accessibility problems — keyboard order, focus management and screen
reader announcements have their own dedicated tests, but no third-party human
audit has been done, so this is a tested conformance claim rather than a
certified one. What is implemented:

- **Keyboard Navigation** - 80+ keyboard shortcuts, full keyboard operability
- **Screen Reader Support** - ARIA live regions, proper labels, semantic HTML
- **Skip Links** - Skip to main content, toolbar, and footer
- **Focus Management** - Visible focus indicators, focus trap for modals
- **Touch Targets** - 44x44px, which meets the AAA criterion (2.5.5), not just the AA minimum
- **Announcements** - Live region for status updates
- **Landmark Regions** - Proper ARIA landmarks for navigation

### 📦 Bundle Size

Measured from `npm run build` on 2026-09-23, with sizes divided by 1,024. The ES core includes the entry module and its implementation chunk. The heavy parts are split
into chunks your bundler only fetches when the feature is first used, so what
you pay to put an editor on screen is the "core" row:

| What | Raw | Gzipped | When it loads |
| --- | --- | --- | --- |
| **Core (ES)** | 1,396.30 KB | **342.59 KB** | On import |
| **CSS** | 272.29 KB | **44.08 KB** | On import |
| Syntax highlighting (Prism + 22 languages) | 86.0 KB | 25.1 KB | First code block |
| Colour picker | 65.2 KB | 14.6 KB | First colour popup |
| Word export | 165.1 KB | 39.7 KB | First `.docx` export |
| PDF export (renderers + document helpers) | 822.0 KB | 203.7 KB | First PDF export |
| PDF page preview module and worker assets | 1,467.53 KB | 409.50 KB | First page preview (ES and UMD) |
| **UMD** | 3,438.82 KB | 1,106.12 KB | On import (no splitting) |

So a page that never opens a code block, never picks a colour and never
exports pays **386.67 KB gzipped** for the library's JS + CSS. Vue is an external
peer dependency and is not included in these figures. The build also emits
optional chunks for jsPDF's HTML/SVG helpers, outside the default export path.
DOCX conversion, semantic PDF and its fonts, citation formatting, and the
collaborative editing binding also load on demand in the ES build. They account
for the larger UMD build; the original PDF row describes raster export. The PDF.js preview module and worker remain separate assets in both formats. Keep them beside the UMD file when serving it directly; bundlers resolve their module-relative URLs. Their Apache-2.0 license is included in the package.

The UMD build cannot code-split by definition — prefer the ES build (Vite,
webpack, Rollup, and every modern bundler pick it automatically) unless you
need a `<script>` tag.

</details>

<details>
<summary><b>📦 Installation, requirements and browser support</b></summary>

```bash
# npm
npm install next-level-editor

# yarn
yarn add next-level-editor

# pnpm
pnpm add next-level-editor
```

**Requirements:**

- Vue.js 3.3.0 or higher
- Modern browser with ES6+ support

## 🌐 Browser Compatibility

Next Level Editor is built with cross-browser compatibility in mind and thoroughly tested across all major browsers.

| Browser            | Minimum Version | Notes                                  |
| ------------------ | --------------- | -------------------------------------- |
| **Chrome**         | 90+             | ✅ Fully supported                     |
| **Edge**           | 90+             | ✅ Fully supported                     |
| **Firefox**        | 88+             | ✅ Fully supported                     |
| **Safari (macOS)** | 12+             | ✅ Fully supported (15.4+ recommended) |
| **Safari (iOS)**   | 12+             | ✅ Fully supported (15.4+ recommended) |
| **Opera**          | 75+             | ✅ Fully supported (Chromium-based)    |
| **Chrome Android** | 90+             | ✅ Fully supported                     |

### Cross-Browser Features

- ✅ **contenteditable core** - Native `contenteditable` with the Selection/Range APIs plus `document.execCommand` (e.g. for paste insertion), all transpiled to ES2015 for broad reach
- ✅ **Clipboard API with fallbacks** - Copy/paste works on all browsers including Safari iOS
- ✅ **Smooth scroll polyfill** - Automatic fallback for Safari < 15.4
- ✅ **CSS gap fallbacks** - Margin-based fallbacks for Safari < 14.1
- ✅ **ES2015 target** - Transpiled for broad compatibility
- ✅ **Autoprefixer** - CSS vendor prefixes added automatically
- ✅ **Touch-friendly** - Optimized for mobile devices with proper touch targets

### Known Limitations

- **Paste from context menu** is disabled on Safari iOS and Firefox (use Ctrl+V/Cmd+V instead)
- **PDF export** may be slower on older iOS devices (consider using Share > Print > Save as PDF)
- Some advanced features require HTTPS for security (Clipboard API, Service Workers)

### Testing

CI runs the Playwright suite on **2 projects** by default, chosen for fast, stable feedback:

- **Desktop Chrome** (`chromium`)
- **Mobile Safari** (`mobile-safari`, iPhone 13)

Additional projects — Desktop Firefox, Desktop WebKit and Mobile Chrome (Pixel 5) — are pre-configured but commented out in [`playwright.config.ts`](playwright.config.ts); uncomment them for a full cross-browser run.

</details>

<details>
<summary><b>🚀 Quick start recipes — sizing, global registration, advanced features, several editors</b></summary>

### Basic Usage

For a long-form writing workspace, add `writing-mode`:

```vue
<NextLevelEditor v-model="manuscript" writing-mode theme-preset="warm" height="80vh" />
```

This gives the manuscript a readable column, a small formatting toolbar, a chapter outline, and writing notes beside the page. Notes identify repeated words, a few wordy phrases, and long sentences. Review one note at a time, with chapter context and the exact wording highlighted inside an excerpt; previous and next controls reach every note. Feedback starts near the paragraph being written, and its accept/keep actions stay visible on small screens. Jumping to a passage reveals the selected words, including in a long paragraph, and closes an overlay that would cover them. Edits are undoable. These are private, on-device English checks and optional writing prompts, not an AI generation service. Press **Alt+F10** to reach the toolbar and **Escape** to return to the manuscript.

The playground opens in this workspace and saves its draft to the current browser. **Configure → Writing workspace** switches to the library's other toolbar layouts.

```vue
<template>
  <div>
    <NextLevelEditor
      v-model="content"
      placeholder="Start typing..."
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NextLevelEditor } from "next-level-editor";
import "next-level-editor/style.css";

const content = ref("<p>Hello World!</p>");

const handleFocus = () => {
  console.log("Editor focused");
};

const handleBlur = () => {
  console.log("Editor blurred");
};
</script>
```

### Custom Size

You can customize the editor's width and height using the `width` and `height` props:

```vue
<template>
  <NextLevelEditor
    v-model="content"
    width="800px"
    height="500px"
    placeholder="Start typing..."
  />
</template>
```

The props accept any valid CSS size values including:

- **Pixels**: `'800px'`, `'1000px'`
- **Percentages**: `'100%'`, `'80%'`
- **Viewport units**: `'80vh'`, `'50vw'`
- **Relative units**: `'50rem'`, `'30em'`

### Global Registration (Optional)

For apps that use the editor throughout:

```javascript
import { createApp } from "vue";
import App from "./App.vue";
import NextLevelEditor from "next-level-editor";
import "next-level-editor/style.css";

const app = createApp(App);
app.use(NextLevelEditor);
app.mount("#app");
```

Then use it anywhere in your components:

```vue
<template>
  <NextLevelEditor v-model="content" />
</template>
```

### Using Advanced Features

#### Writing Assistant & Analytics

Enable the writing stats panel to get professional text analysis:

```vue
<template>
  <NextLevelEditor v-model="content" :show-writing-stats="true" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NextLevelEditor } from "next-level-editor";

const content = ref("<p>Your content here...</p>");
</script>
```

The Writing Stats Panel will appear and show:

- **Readability scores** (Flesch Reading Ease, Grade Level, etc.)
- **Statistics** (word count, reading time, etc.)
- **Sentence analysis** (short/medium/long distribution)
- **Word analysis** (common words, syllables)
- **Writing issues** (passive voice, complex words)
- **SEO metrics** (keyword density, heading structure)

#### Comments & Collaboration

Enable the comments system for collaborative editing:

```vue
<template>
  <NextLevelEditor v-model="content" :enable-comments="true" />
</template>
```

Users can:

- Select text and add comments
- Reply to comments with @ mentions
- Resolve/reopen comment threads
- View comments in a dedicated sidebar

#### Template Variables

Enable the variables system for dynamic content with `{{ variableName }}` syntax:

```vue
<template>
  <NextLevelEditor v-model="content" :enable-variables="true" />
</template>
```

Features:

- **Smart autocomplete** - Type `{{` to see available variables
- **Visual pills** - Variables appear as styled badges (like CKEditor)
- **Built-in variables** - User info, dates, document data, company info
- **Custom variables** - Supply your own set with the `variables` prop (see below)
- **Print & export ready** - Variables are replaced with their values when printing AND in every export (PDF, Word, HTML, Markdown), so a finished document never ships raw `{{ tokens }}`

Supply your own set with the `variables` prop — it replaces the built-in demo
fixtures, and is reactive, so updating a value flows straight through to the
pills and the `{{` autocomplete:

```vue
<script setup>
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'

const content = ref('')
const variables = ref([
  { id: 'user.name', name: 'userName', label: 'User Name', value: 'Jane Smith', category: 'user' },
  { id: 'custom.project', name: 'project', label: 'Project', value: 'Apollo', category: 'custom' },
])
</script>

<template>
  <NextLevelEditor v-model="content" :enable-variables="true" :variables="variables" />
</template>
```

Omit the prop and the built-in demo set is used: `{{ user.name }}`, `{{ date.today }}`, `{{ doc.title }}`, `{{ company.name }}`, and more.

See [Variables System Documentation](docs/VARIABLES_SYSTEM.md) for complete guide.

#### Using Composables Independently

All advanced features can be used as standalone composables:

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  useWritingAssistant,
  useComments,
  useAccessibility,
} from "next-level-editor";

// Writing Assistant
const assistant = useWritingAssistant();
const htmlContent = ref("<p>Your content...</p>");

// Analyze content
await assistant.analyze(htmlContent.value);
console.log("Stats:", assistant.stats.value);
console.log("Readability:", assistant.readability.value);

// Comments System
const editorElement = ref<HTMLElement>();
const comments = useComments({
  editorElement,
  currentUser: {
    id: "user-1",
    name: "John Doe",
    color: "#3b82f6",
  },
});

// Add a comment thread
comments.addThread("Great point!", ["@jane"]);

// Accessibility
const { announce, setFocus } = useAccessibility();
announce("Document saved", "polite");
</script>
```

### Several Editors on One Page

Mounting more than one editor is supported. A few controls are pinned to the
**viewport** rather than to the editor box — the comments / statistics /
variables buttons in the bottom-right corner, the variables panel that opens
from them, and the auto-save chip in the bottom-left — so they belong to one
editor at a time: the one you are currently reading or writing in. Scroll to a
different editor, or click into it, and those controls follow.

A failed auto-save is the deliberate exception: its chip is always shown, so a
save error can never be hidden by another editor owning the corner.

Everything else — toolbar, selection bubble, panels, modals — is already scoped
to its own instance.

</details>

<details>
<summary><b>📚 API reference — props, events, TypeScript</b></summary>

### Props

| Prop               | Type      | Default             | Description                                                  |
| ------------------ | --------- | ------------------- | ------------------------------------------------------------ |
| `modelValue`       | `string`  | `''`                | The HTML content (v-model)                                   |
| `placeholder`      | `string`  | `'Start typing...'` | Placeholder text when editor is empty                        |
| `width`            | `string`  | `undefined`         | Custom width for the editor (e.g., '800px', '100%', '50rem') |
| `height`           | `string`  | `undefined`         | Custom height for the editor (e.g., '500px', '80vh', '30em') |
| `themePreset`      | `string`  | `'default'`         | Whole-editor theme: `default` \| `classic` \| `minimal` \| `midnight` \| `warm` |
| `writingMode`      | `boolean` | `false`             | Manuscript typography, a focused toolbar, chapter outline and private writing notes. Uses a stable top toolbar and a small mobile formatting dock; takes precedence over toolbar layout, position, mode and adaptive chrome |
| `toolbarLayout`    | `string`  | `'comfortable'`     | Toolbar density: `comfortable` (labelled) \| `compact` (mini bar + expand toggle). Below 640px the toolbar auto-compacts to the mini bar regardless |
| `adaptiveChrome`   | `string`  | `'off'`             | What the toolbar does while you write: `off` (default — a rock-solid static bar that never moves or reshuffles) \| `letterbox` (buttons dissolve into an ambient band — block format, position filament, save pulse, word count) \| `recede` (toolbar fades to a whisper). For `letterbox`/`recede`, returns instantly on pointer/Escape/toolbar focus; desktop-only; honors reduced motion |
| `toolbarPosition`  | `string`  | `'top'`             | Where the toolbar lives: `top` \| `left` (slim margin rail) \| `bottom` (dock, menus open upward) \| `zen` (no persistent toolbar — the ambient band is the only chrome; intent peeks the full bar). All fall back to `top` below 640px |
| `toolbarMode`      | `string`  | `'bar'`             | The toolbar's form: `bar` (docked masthead) \| `pill` (Playhead — one floating glass capsule that contracts while you write, expands on intent and travels to your selection to become the formatting bubble). Falls back to `bar` below 640px |
| `saveHandler`      | `function`| `undefined`         | `(html) => boolean \| Promise<boolean>` — ordered, debounced persistence. Resolve `false`/throw to show an error and Retry. Pending changes guard page exit. Without a handler the indicator says "Updated", meaning content emitted to `v-model`. |
| `readonly`         | `boolean` | `false`             | Content stays selectable; content-changing controls are disabled |
| `locale` | `string` | `'en'` | UI language, plural rules, number and date formatting |
| `messages` | `EditorMessages` | `{}` | Per-instance text/plural catalog overrides |
| `uiDirection` | `'auto' \| 'ltr' \| 'rtl'` | `'auto'` | UI direction, including teleported controls |
| `contentLanguage` | `string` | `'en'` | Document language, independent from UI language |
| `contentDirection` | `'auto' \| 'ltr' \| 'rtl'` | `'auto'` | Document text direction |
| `showToolbar`      | `boolean` | `true`              | Show the main toolbar; set `false` for a headless editor     |
| `defaultViewMode`  | `string`  | `'editor'`          | Initial view: `editor` \| `code` \| `split` \| `preview`     |
| `autofocus`        | `boolean` | `false`             | Focus the editing surface on mount                           |
| `showWritingStats` | `boolean` | `false`             | Enable Writing Assistant & Analytics panel                   |
| `enableComments`   | `boolean` | `false`             | Enable Comments & Collaboration system                       |
| `enableVariables`  | `boolean` | `false`             | Enable `{{ variable }}` template tokens                      |
| `variables`        | `Variable[]` | built-in demo set | Your own variable set (replaces the demo fixtures)        |
| `plugins`          | `EditorPlugin[]` | `[]`          | Editor plugins (slash commands, Tools buttons, palette)   |
| `mentionSearch`    | `fn`      | `undefined`         | Async provider for @mention suggestions                      |

### Events

| Event               | Payload  | Description                            |
| ------------------- | -------- | -------------------------------------- |
| `update:modelValue` | `string` | Emitted when content changes (v-model) |
| `focus`             | -        | Emitted when editor receives focus     |
| `blur`              | -        | Emitted when editor loses focus        |

### TypeScript Support

Full TypeScript definitions included:

```typescript
import { NextLevelEditor } from "next-level-editor";
import type { Ref } from "vue";

// Use with typed refs
const content: Ref<string> = ref("<p>Content</p>");

// Component emits are fully typed
const handleUpdate = (newContent: string) => {
  console.log("Content updated:", newContent);
};
```

</details>

<details>
<summary><b>⌨️ Keyboard shortcuts</b></summary>

| Shortcut       | Action             | Description               |
| -------------- | ------------------ | ------------------------- |
| `Ctrl+B`       | **Bold**           | Make selected text bold   |
| `Ctrl+I`       | **Italic**         | Make selected text italic |
| `Ctrl+U`       | **Underline**      | Underline selected text   |
| `Ctrl+K`       | **Insert Link**    | Add a hyperlink           |
| `Ctrl+F`       | **Find & Replace** | Open search modal         |
| `Ctrl+Z`       | **Undo**           | Undo last action          |
| `Ctrl+Shift+Z` | **Redo**           | Redo last undone action   |
| `Ctrl+Alt+0`   | **Paragraph**      | Convert to paragraph      |
| `Ctrl+Alt+1`   | **Heading 1**      | Convert to H1             |
| `Ctrl+Alt+2`   | **Heading 2**      | Convert to H2             |
| `Ctrl+Alt+3`   | **Heading 3**      | Convert to H3             |
| `Ctrl+Enter`   | **Toggle checkbox** | Check/uncheck the checklist item at the caret |
| `Tab` / `Shift+Tab` | **Indent / Next cell** | Indent list items, or move between table cells (Tab in the last cell adds a row) |
| `/`            | **Slash Commands** | Open quick actions menu   |

</details>

<details>
<summary><b>⚡ Slash commands</b></summary>

Type `/` anywhere in the editor to open the quick actions menu with 14+ commands:

### Structure

- `/heading1` - Large heading (H1)
- `/heading2` - Medium heading (H2)
- `/heading3` - Small heading (H3)
- `/paragraph` - Regular paragraph

### Formatting

- `/bold` - Bold text
- `/italic` - Italic text

### Lists

- `/bullet-list` - Bulleted list
- `/numbered-list` - Numbered list

### Content Blocks

- `/quote` - Block quote
- `/code` - Code block with syntax highlighting
- `/table` - Insert table with custom dimensions

### Media

- `/link` - Insert hyperlink
- `/image` - Upload or insert image with preview

### Elements

- `/divider` - Horizontal rule separator

</details>

<details>
<summary><b>👁️ View modes — code, split, preview</b></summary>

The editor supports three different view modes to suit your workflow:

### 💻 Code View

Switch to code view to see and edit the raw HTML source. Perfect for developers who want full control over the markup. The HTML is formatted with syntax highlighting for better readability.

### ⚏ Split View

Work in split view to see your content and the HTML output side-by-side. Great for learning HTML or debugging formatting issues while maintaining a visual reference.

### 👁️ Preview View

Focus on the visual output with preview view. See exactly how your content will appear without the distraction of editing controls. Ideal for reviewing content before publishing.

Toggle between views using the buttons in the toolbar or use keyboard shortcuts for quick switching.

</details>

<details>
<summary><b>🎨 Theming and customization</b></summary>

The editor uses CSS custom properties (variables) for easy theming and customization:

```css
:root {
  /* Background colors */
  --editor-bg: #ffffff;
  --toolbar-bg: #f8f9fb;

  /* Text colors */
  --toolbar-text: #1f2937;
  --content-color: #1f2937;

  /* Border & accent colors */
  --editor-border: #d8dde6;
  --toolbar-accent: #3b82f6;

  /* Transitions */
  --transition-speed: 150ms;

  /* Border radius */
  --border-radius: 8px;
}

/* Dark mode automatically applies when .theme-dark is present */
.theme-dark {
  --editor-bg: #0f172a;
  --editor-border: #1e293b;
  --toolbar-bg: #111827;
  --toolbar-text: #e2e8f0;
  --toolbar-accent: #60a5fa;
  --content-color: #e2e8f0;
}
```

### Custom Styling Example

```css
/* Override default styles */
.next-level-editor {
  --editor-bg: #fafafa;
  --toolbar-accent: #10b981; /* Green accent */
  --border-radius: 12px; /* More rounded corners */
}
```

</details>

<details>
<summary><b>🧪 Testing and quality assurance</b></summary>

The project maintains high quality standards with comprehensive testing:

```bash
# Run unit tests
npm test

# Run unit tests with interactive UI
npm run test:ui

# Generate coverage report (thresholds enforced in vitest.config.ts)
npm run test:coverage

# Install the independent PDF reader used by export browser tests
python -m pip install -r scripts/pdf-test-requirements.txt

# Run end-to-end tests across Chromium and mobile WebKit
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

### Test Coverage Statistics

| File Type   | Statements | Branches | Functions | Lines   |
| ----------- | ---------- | -------- | --------- | ------- |
| **Overall** | **82.99%** | **74.24%** | **78.12%** | **85.28%** |

Measured on 2026-09-23. The CI coverage artifact includes per-file results.

### Test Suites Overview

Verified on 2026-09-23: 4,882 unit tests passed; 85.28% line coverage.
Browser suites cover Chromium and mobile WebKit; duplicate desktop flows have
explicit mobile exclusions. A separate 18-profile device matrix exercises all
three browser engines. Current run counts and retained reports are available in
[GitHub Actions](https://github.com/andrecj93/Next-Level-Editor/actions).
See the [document workspace](docs/document-workspace.md) for supported features and qualification limits, and the [earlier quality review](docs/reports/QUALITY_REVIEW_2026-09-20.md) for the writing baseline.

#### Unit Tests (4,882 tests across 383 files, with Vitest)

- **ContextMenu** (9 tests) - Component rendering, interactions, disabled states
- **Selection Management** (10 tests) - Font size, text color, background color
- **Commands** (29 tests) - Text alignment, tables, horizontal rules, search/replace
- **Export** (27 tests) - HTML to Markdown conversion, file exports
- **Embed** (23 tests) - YouTube/Vimeo URL detection and embedding
- **Formatting** (27 tests) - Bold, italic, underline, lists, headings, links
- **Coverage** (4 tests) - Edge cases and error handling
- **Format Painter** (7 tests) - Copy/paste formatting functionality
- **Templates** (13 tests) - Template retrieval, categories, content validation
- **Page Management** (11 tests) - Page breaks, table of contents generation
- **Spell Checker** (17 tests) - Enable/disable, suggestions, auto-correct
- **Composables** (20+ tests) - Auto-save, command palette, history timeline, loading states, smart toolbar, virtual scroll
- **File Manager** - Upload, storage, and file management functionality

#### End-to-End Tests (Playwright)

- **Basic Functionality** - Editor loading, typing, word count
- **Text Formatting** - Bold, italic, underline, toggle formatting
- **Headings** - H1, H2, H3 creation and styling
- **Lists** - Bullet lists, numbered lists, nesting
- **Undo/Redo** - History management, button states
- **Context Menu** - Right-click menu, cut/copy/paste operations
- **Floating Toolbar** - Selection-based toolbar appearance
- **Theme Toggle** - Light/dark theme switching with persistence
- **Font Size** - Dynamic font size changes
- **Enter Key** - Paragraph creation, cursor positioning

</details>

<details>
<summary><b>📦 Build output and bundle size</b></summary>

The library is built using Vite with optimized output for multiple formats:

- **ES Module** - `dist/next-level-editor.mjs` (core 1,396.30 KB, 342.59 KB gzipped)
  - Modern ES6+ syntax with code splitting
  - Syntax highlighting, the colour picker and both exporters are separate
    chunks, fetched the first time you use them
  - Recommended for Vite, Webpack 5+, Rollup
- **UMD** - `dist/next-level-editor.umd.js` (3,438.82 KB, 1,106.12 KB gzipped)
  - Universal Module Definition
  - Compatible with AMD, CommonJS, and global variables
  - Editor and feature code is bundled together, including features you may never use.
    The PDF preview additionally loads the packaged browser module and worker assets.
- **CSS** - `dist/next-level-editor.css` (272.29 KB, 44.08 KB gzipped)
  - Minified styles with CSS variables
  - Includes light and dark themes, all four theme presets
  - Responsive design utilities

See the [Bundle Size](#-bundle-size) table above for what loads when.

All bundles are optimized with:

- Tree-shaking support for ES modules
- Minification and compression
- Code splitting for lazy-loaded features
- CSS extraction and optimization

</details>

<details>
<summary><b>🛠️ Development guide and project structure</b></summary>

### Prerequisites

- Node.js 18+ or 20+
- npm, yarn, or pnpm
- Git

### Setup & Development

```bash
# Clone the repository
git clone https://github.com/andrecj93/next-level-editor.git
cd next-level-editor

# Install dependencies
npm install

# Run development server with demo
npm run dev
# Opens at http://localhost:5173

# Build library for production
npm run build

# Build demo site
npm run build:demo

# Lint and fix code
npm run lint

# Type check
npx vue-tsc --noEmit

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Project Structure

```text
next-level-editor/
├── src/
│   ├── components/          # Vue components
│   │   ├── NextLevelEditor.vue      # Main editor with toolbar
│   │   ├── ToolbarDropdown.vue      # Reusable dropdown
│   │   ├── ColorPicker.vue          # Color selection
│   │   ├── FloatingToolbar.vue      # Floating selection toolbar
│   │   ├── ContextMenu.vue          # Right-click context menu
│   │   ├── FontSizeSelector.vue     # Font size dropdown
│   │   ├── TableModal.vue           # Table insertion
│   │   ├── TableDesigner.vue        # Advanced table editing
│   │   ├── TablePropertiesModal.vue # Table customization
│   │   ├── CodeBlockModal.vue       # Syntax highlighting
│   │   ├── FindReplaceModal.vue     # Search and replace
│   │   ├── EmojiPicker.vue          # Emoji selector
│   │   ├── ImageUploadModal.vue     # Image upload
│   │   ├── EmbedModal.vue           # Video embeds
│   │   ├── FileManagerModal.vue     # File management system
│   │   ├── TemplateModal.vue        # Document templates
│   │   ├── HtmlCodeModal.vue        # View/edit HTML source
│   │   ├── CommandPalette.vue       # Command search interface
│   │   ├── HistoryTimeline.vue      # Undo/redo visualization
│   │   ├── SkeletonLoader.vue       # Loading states
│   │   └── VirtualScrollContainer.vue # Performance optimization
│   ├── composables/         # Reusable composition functions
│   │   ├── useTheme.ts              # Theme management
│   │   ├── useAutoSave.ts           # Auto-save logic
│   │   ├── useCommandPalette.ts     # Command interface
│   │   ├── useHistoryTimeline.ts    # History visualization
│   │   ├── useSmartToolbar.ts       # Adaptive toolbar
│   │   ├── useVirtualScroll.ts      # Virtual scrolling
│   │   ├── useLoading.ts            # Loading states
│   │   ├── useMobileGestures.ts     # Touch support
│   │   ├── useScreenReader.ts       # Accessibility
│   │   └── usePlugin.ts             # Plugin system
│   ├── utils/               # Pure utility functions
│   │   ├── formatting.ts            # Text formatting
│   │   ├── commands.ts              # Editor commands
│   │   ├── export.ts                # Export utilities
│   │   ├── embed.ts                 # Video embedding
│   │   ├── formatPainter.ts         # Format copying
│   │   ├── templates.ts             # Document templates
│   │   ├── pageManagement.ts        # TOC and page breaks
│   │   ├── spellChecker.ts          # Spell checking
│   │   ├── fileManager.ts           # File operations
│   │   └── __tests__/               # Unit tests (4,882 tests)
│   ├── styles/              # CSS files
│   │   ├── variables.css            # CSS custom properties
│   │   └── animations.css           # Transitions
│   ├── demo/                # Demo application
│   │   ├── App.vue                  # Demo with tabs
│   │   └── FeatureShowcase.vue      # Feature documentation
│   ├── types/               # TypeScript definitions
│   ├── index.ts             # Main entry point
│   └── index.d.ts           # Type declarations
├── e2e/                     # Playwright E2E tests (32 specs)
├── dist/                    # Build output (generated)
├── vite.config.ts           # Vite build configuration
├── vitest.config.ts         # Vitest test configuration
├── playwright.config.ts     # Playwright E2E configuration
├── tsconfig.json            # TypeScript configuration
├── eslint.config.mjs        # ESLint rules
└── package.json             # Dependencies and scripts
```

### Development Workflow

1. **Feature Development**

   - Create a feature branch: `git checkout -b feature/your-feature`
   - Write tests first (TDD approach recommended)
   - Implement feature following existing patterns
   - Run tests: `npm test`
   - Run linter: `npm run lint`

2. **Before Committing**

   - Ensure all tests pass: `npm test -- --run`
   - Verify linting: `npm run lint`
   - Type check: `npx vue-tsc --noEmit`
   - Build: `npm run build`

3. **Pull Request**
   - Follow conventional commit format
   - Include tests for new features
   - Update documentation if needed
   - Ensure CI/CD passes

</details>

<details>
<summary><b>🌐 Browser support details</b></summary>

Next Level Editor targets current evergreen browsers. Compatibility is checked
against the Chromium, Firefox, and WebKit versions pinned by Playwright; the
device matrix is in `playwright.devices.config.ts`.

### Desktop Browsers

- **Chrome / Edge:** Chromium engine coverage
- **Firefox:** dedicated engine checks
- **Safari:** WebKit engine coverage

### Mobile Browsers

The matrix exercises small and large phones, Android and iPad tablets, touch
laptops, portrait and landscape layouts, and reduced-height windows. It also
checks narrow layouts equivalent to 200% and 400% browser zoom. Device descriptors
emulate viewport and input capabilities; native software keyboards, browser chrome,
assistive technology, and vendor browsers still need device testing. Older
browser versions do not have a verified minimum-version guarantee.

Run the repeatable device checks with:

```bash
npx playwright install --with-deps chromium firefox webkit
npm run test:devices
```

Every profile exercises typing, heading formatting, suggestions and undo,
recovery, links, search, downloads, insert dialogs, source/preview, chapter
navigation, mixed scripts, light/dark accessibility, keyboard access, and resizing
with menus open. The device job gates demo deployment and package publication.

### Requirements

- ES6+ support (native modules, arrow functions, async/await)
- CSS Grid and Flexbox support
- LocalStorage API (for theme persistence)
- Clipboard API (for copy/paste features)

### Feature Detection

The editor gracefully degrades when certain features aren't available:

- Falls back to basic clipboard operations if Clipboard API is unavailable
- Theme defaults to light mode if LocalStorage is disabled
- Works without vendor-specific features

</details>

<details>
<summary><b>🤝 Contributing</b></summary>

We welcome contributions! Here's how you can help improve Next Level Editor:

### Getting Started

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/next-level-editor.git
   cd next-level-editor
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes**

   - Follow the existing code style and project conventions (see [CLAUDE.md](CLAUDE.md))
   - Write tests for new features
   - Update documentation as needed

4. **Test your changes**

   ```bash
   npm test              # Run unit tests
   npm run test:e2e      # Run E2E tests
   npm run test:devices  # Run the responsive/browser matrix
   npm run lint          # Check code style
   npx vue-tsc --noEmit  # Type check
   npm run build         # Build library
   ```

5. **Commit your changes**

   ```bash
   # Use conventional commit format
   git commit -m 'feat: add amazing feature'
   # or
   git commit -m 'fix: resolve XSS vulnerability'
   ```

6. **Push and create Pull Request**

   ```bash
   git push origin feature/amazing-feature
   # Then open a PR on GitHub
   ```

### Contribution Guidelines

**Code Quality Checklist:**

- ✅ All tests pass (`npm test -- --run`)
- ✅ End-to-end tests pass (`npm run test:e2e` — set `E2E_PORT` if 5173 is busy)
- ✅ Device matrix passes (`npm run test:devices`)
- ✅ Code is linted (`npm run lint`)
- ✅ TypeScript compiles without errors (`npx vue-tsc --noEmit`)
- ✅ No known vulnerabilities (`npm audit --omit=dev`)
- ✅ Tests added for new features (coverage thresholds in `vitest.config.ts` must hold)
- ✅ Documentation updated (README, JSDoc comments)
- ✅ Follows existing code patterns and conventions

**Commit Message Format:**

```text
type(scope): subject

- feat: new feature
- fix: bug fix
- docs: documentation changes
- test: test additions/changes
- refactor: code refactoring
- perf: performance improvements
- style: code style changes (formatting)
- chore: maintenance tasks
```

**Areas for Contribution:**

- 🐛 Bug fixes and issue resolution
- ✨ New features and enhancements
- 📝 Documentation improvements
- 🧪 Additional tests and coverage
- ♿ Accessibility improvements
- 🌍 Internationalization (i18n)
- 🎨 UI/UX enhancements
- ⚡ Performance optimizations

### Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together!

### Questions?

- 💬 Open a [Discussion](https://github.com/andrecj93/next-level-editor/discussions)
- 🐛 Report bugs via [Issues](https://github.com/andrecj93/next-level-editor/issues)
- 📧 Contact maintainers for security issues

</details>

---

## 📝 Changelog

See the [GitHub Releases](https://github.com/andrecj93/Next-Level-Editor/releases) page for version history.

## 📄 License

MIT License © [andrecj93](https://github.com/andrecj93)

See [LICENSE](LICENSE) file for details.

**What this means:**

- ✅ Use in commercial projects
- ✅ Modify and distribute
- ✅ Private use
- ✅ Patent use
- ⚠️ No warranty provided
- ⚠️ License and copyright notice must be included

## 🙏 Acknowledgments & Inspiration

Built with inspiration from the best editors in the industry:

- **[CKEditor](https://ckeditor.com)** - Professional horizontal toolbar design with dropdown menus and feature organization
- **[Notion](https://notion.so)** - Slash commands, modern UX patterns, and intuitive interactions
- **[Medium](https://medium.com)** - Floating toolbar on text selection and distraction-free writing experience
- **[TinyMCE](https://www.tiny.cloud)** - Comprehensive feature set and plugin architecture
- **[TipTap](https://tiptap.dev)** - Clean component architecture and Vue.js integration patterns
- **[Quill](https://quilljs.com)** - Modular design principles and content model
- **[Prism.js](https://prismjs.com)** - Beautiful syntax highlighting for code blocks

### Technology Stack

- **[Vue.js 3](https://vuejs.org)** - Progressive JavaScript framework with Composition API
- **[Vite](https://vitejs.dev)** - Next-generation frontend tooling
- **[TypeScript](https://www.typescriptlang.org)** - Typed JavaScript at scale
- **[Vitest](https://vitest.dev)** - Blazing fast unit test framework
- **[Playwright](https://playwright.dev)** - Reliable end-to-end testing
- **[Prism.js](https://prismjs.com)** - Lightweight syntax highlighting

## 🔗 Links & Resources

### Package & Repository

- 📦 [NPM Package](https://www.npmjs.com/package/next-level-editor) - Install via npm
- 🔧 [GitHub Repository](https://github.com/andrecj93/next-level-editor) - Source code
- 🐛 [Issue Tracker](https://github.com/andrecj93/next-level-editor/issues) - Report bugs
- 💬 [Discussions](https://github.com/andrecj93/next-level-editor/discussions) - Ask questions
- 🚀 [Demo Site](https://andrecj93.github.io/next-level-editor/) - Try it live

### Documentation

- ✨ [UX Improvements](docs/UX_IMPROVEMENTS.md) - Recent usability enhancements and fixes
- 📘 [PUBLISHING](docs/PUBLISHING.md) - Publishing workflow

### CI/CD & Quality

- ✅ [GitHub Actions](https://github.com/andrecj93/Next-Level-Editor/actions) - Build status
- 📊 [Codecov](https://codecov.io/gh/andrecj93/next-level-editor) - Code coverage reports

---

<!-- markdownlint-disable MD033 MD036 -->
<div align="center">

**Made with ❤️ and modern web standards**

[![Star on GitHub](https://img.shields.io/github/stars/andrecj93/next-level-editor?style=social)](https://github.com/andrecj93/next-level-editor)
[![Follow on GitHub](https://img.shields.io/github/followers/andrecj93?style=social)](https://github.com/andrecj93)

_If you find this project useful, please consider giving it a ⭐ on GitHub!_

</div>
<!-- markdownlint-enable MD033 MD036 -->
