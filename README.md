# Next Level Editor 🚀

[![CI/CD](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml/badge.svg)](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml)
[![Playwright Tests](https://img.shields.io/badge/Playwright-23%20tests-45ba4b?logo=playwright)](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/next-level-editor.svg)](https://www.npmjs.com/package/next-level-editor)
[![codecov](https://codecov.io/gh/andrecj93/next-level-editor-jordan/branch/main/graph/badge.svg)](https://codecov.io/gh/andrecj93/next-level-editor-jordan)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Vue 3](https://img.shields.io/badge/Vue-3.3%2B-4FC08D.svg)](https://vuejs.org/)

> A professional, feature-rich WYSIWYG editor for Vue.js 3 built with modern web standards. Combining the power of CKEditor, the elegance of Notion, and the simplicity of Medium into one beautiful package.

**🎯 Built for developers who demand quality** — TypeScript strict mode, 80%+ test coverage, zero security vulnerabilities, and production-ready performance.

## 📸 Screenshots

<table>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/386bb947-38c3-435b-bd35-6c819f9db4d8" alt="Light Mode" width="100%"/>
      <br />
      <em>Light Mode - Clean and professional</em>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://github.com/user-attachments/assets/868e3112-3eb3-48cf-99c0-4949d771cacd" alt="Dark Mode" width="100%"/>
      <br />
      <em>Dark Mode - Easy on the eyes</em>
    </td>
  </tr>
</table>

## ✨ Features

> **Why Next Level Editor?** Built with modern web standards, best practices, and a focus on developer experience. Every feature is thoroughly tested, accessible, and performant.

### 🎨 Modern UI
- **CKEditor-Inspired Toolbar** - Professional horizontal toolbar with dropdown menus
- **Responsive Design** - Adapts seamlessly from desktop to mobile
- **Dark Mode** - Beautiful dark theme with smooth transitions and localStorage persistence
- **Floating Toolbar** - Medium-style context menu appears on text selection
- **Visual Feedback** - Hover effects, active states, and smooth animations

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
- **Image Upload** - URL input or file upload with live preview and alt text for accessibility
- **Video Embeds** - Auto-detect and embed YouTube and Vimeo videos with responsive iframes
- **Emoji Picker** - 100+ emojis across 7 categories with search functionality
- **Tables** - Create custom tables with header rows and configurable columns

### ⚡ Power Features
- **Slash Commands** - Type `/` to access 14+ quick actions
- **Find & Replace** - Full-featured search with case-sensitive and whole-word options (Ctrl+F)
- **Auto-Save** - 2-second debounced auto-save with visual status indicator
- **Export** - Download as HTML or Markdown with one click
- **Full-Screen Mode** - Distraction-free writing with centered content layout
- **Word & Character Count** - Live statistics in footer
- **Undo/Redo** - Full history management with Ctrl+Z/Ctrl+Shift+Z

### 🔐 Security & Quality

- **HTML Sanitization** - Secure content handling prevents XSS attacks with DOMPurify-level protection
- **TypeScript Strict Mode** - Full type safety throughout the codebase
- **129 Unit Tests** - Comprehensive test coverage with 81%+ code coverage
- **23 E2E Tests** - Full end-to-end testing with Playwright for real-world scenarios
- **0 Security Vulnerabilities** - CodeQL verified and continuously monitored
- **GitHub Actions CI/CD** - Automated testing, linting, and deployment
- **WCAG Compliant** - Keyboard navigation, ARIA labels, and screen reader support

### 📦 Bundle Size

Optimized for production with tree-shaking and code splitting:

- **ES Module** - 231.63 KB (58.73 KB gzipped)
- **UMD** - 147.74 KB (44.15 KB gzipped)
- **CSS** - 41.91 KB (6.89 KB gzipped)

Includes Prism.js (22 languages), emoji data, and all features — fully optimized for modern bundlers like Vite, Webpack, and Rollup.

## 📦 Installation

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

## 🚀 Quick Start

### Basic Usage

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
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/dist/style.css'

const content = ref('<p>Hello World!</p>')

const handleFocus = () => {
  console.log('Editor focused')
}

const handleBlur = () => {
  console.log('Editor blurred')
}
</script>
```

### Global Registration (Optional)

For apps that use the editor throughout:

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import NextLevelEditor from 'next-level-editor'
import 'next-level-editor/dist/style.css'

const app = createApp(App)
app.use(NextLevelEditor)
app.mount('#app')
```

Then use it anywhere in your components:

```vue
<template>
  <NextLevelEditor v-model="content" />
</template>
```

## 📚 API Reference

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | The HTML content (v-model) |
| `placeholder` | `string` | `'Start typing...'` | Placeholder text when editor is empty |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when content changes (v-model) |
| `focus` | - | Emitted when editor receives focus |
| `blur` | - | Emitted when editor loses focus |

### TypeScript Support

Full TypeScript definitions included:

```typescript
import { NextLevelEditor } from 'next-level-editor'
import type { Ref } from 'vue'

// Use with typed refs
const content: Ref<string> = ref('<p>Content</p>')

// Component emits are fully typed
const handleUpdate = (newContent: string) => {
  console.log('Content updated:', newContent)
}
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+B` | **Bold** | Make selected text bold |
| `Ctrl+I` | **Italic** | Make selected text italic |
| `Ctrl+U` | **Underline** | Underline selected text |
| `Ctrl+K` | **Insert Link** | Add a hyperlink |
| `Ctrl+F` | **Find & Replace** | Open search modal |
| `Ctrl+Z` | **Undo** | Undo last action |
| `Ctrl+Shift+Z` | **Redo** | Redo last undone action |
| `Ctrl+Alt+0` | **Paragraph** | Convert to paragraph |
| `Ctrl+Alt+1` | **Heading 1** | Convert to H1 |
| `Ctrl+Alt+2` | **Heading 2** | Convert to H2 |
| `Ctrl+Alt+3` | **Heading 3** | Convert to H3 |
| `/` | **Slash Commands** | Open quick actions menu |

## ⚡ Slash Commands

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

## 🎨 Theming & Customization

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

## 🧪 Testing & Quality Assurance

The project maintains high quality standards with comprehensive testing:

```bash
# Run unit tests (129 tests)
npm test

# Run unit tests with interactive UI
npm run test:ui

# Generate coverage report (81%+ coverage)
npm run test:coverage

# Run end-to-end tests (23 tests)
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Run E2E tests in headed mode (see browser)
npm run test:e2e:headed

# Debug E2E tests
npm run test:e2e:debug
```

### Test Coverage Statistics

| File Type | Statements | Branches | Functions | Lines |
|-----------|-----------|----------|-----------|-------|
| **Overall** | **81%** | **69%** | **84%** | **83%** |
| Components | 65% | 57% | 50% | 67% |
| Utils | 81% | 70% | 88% | 84% |

### Test Suites Overview

**Unit Tests (129 tests with Vitest)**
- **ContextMenu** (9 tests) - Component rendering, interactions, disabled states
- **Selection Management** (10 tests) - Font size, text color, background color
- **Commands** (29 tests) - Text alignment, tables, horizontal rules, search/replace
- **Export** (27 tests) - HTML to Markdown conversion, file exports
- **Embed** (23 tests) - YouTube/Vimeo URL detection and embedding
- **Formatting** (27 tests) - Bold, italic, underline, lists, headings, links
- **Coverage** (4 tests) - Edge cases and error handling

**End-to-End Tests (23 tests with Playwright)**
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

## 📦 Build & Bundle Output

The library is built using Vite with optimized output for multiple formats:

- **ES Module** - `dist/next-level-editor.es.js` (231.63 KB, 58.73 KB gzipped)
  - Modern ES6+ syntax for tree-shaking
  - Recommended for Vite, Webpack 5+, Rollup
  
- **UMD** - `dist/next-level-editor.umd.js` (147.74 KB, 44.15 KB gzipped)
  - Universal Module Definition
  - Compatible with AMD, CommonJS, and global variables
  
- **CSS** - `dist/next-level-editor.css` (41.91 KB, 6.89 KB gzipped)
  - Minified styles with CSS variables
  - Includes light and dark themes

**Bundle Composition:**
- Core editor (~15KB gzipped)
- Prism.js syntax highlighting for 22 languages (~40KB gzipped)
- Features: tables, emojis, modals, toolbar system (~4KB gzipped)

All bundles are optimized with:
- Tree-shaking support for ES modules
- Minification and compression
- Code splitting for lazy-loaded features
- CSS extraction and optimization

## 🛠️ Development Guide

### Prerequisites

- Node.js 18+ or 20+
- npm, yarn, or pnpm
- Git

### Setup & Development

```bash
# Clone the repository
git clone https://github.com/andrecj93/next-level-editor-jordan.git
cd next-level-editor-jordan

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

```
next-level-editor-jordan/
├── src/
│   ├── components/          # Vue components
│   │   ├── NextLevelEditor.vue      # Main editor with toolbar
│   │   ├── ToolbarDropdown.vue      # Reusable dropdown
│   │   ├── ColorPicker.vue          # Color selection
│   │   ├── FloatingToolbar.vue      # Context menu
│   │   ├── FontSizeSelector.vue     # Font size dropdown
│   │   ├── TableModal.vue           # Table insertion
│   │   ├── CodeBlockModal.vue       # Syntax highlighting
│   │   ├── FindReplaceModal.vue     # Search and replace
│   │   ├── EmojiPicker.vue          # Emoji selector
│   │   ├── ImageUploadModal.vue     # Image upload
│   │   └── EmbedModal.vue           # Video embeds
│   ├── composables/         # Reusable composition functions
│   │   ├── useTheme.ts              # Theme management
│   │   └── useAutoSave.ts           # Auto-save logic
│   ├── utils/               # Pure utility functions
│   │   ├── formatting.ts            # Text formatting
│   │   ├── commands.ts              # Editor commands
│   │   ├── export.ts                # Export utilities
│   │   ├── embed.ts                 # Video embedding
│   │   └── __tests__/               # Unit tests (129 tests)
│   ├── styles/              # CSS files
│   │   ├── variables.css            # CSS custom properties
│   │   └── animations.css           # Transitions
│   ├── demo/                # Demo application
│   │   ├── App.vue                  # Demo with tabs
│   │   └── FeatureShowcase.vue      # Feature documentation
│   ├── types/               # TypeScript definitions
│   ├── index.ts             # Main entry point
│   └── index.d.ts           # Type declarations
├── e2e/                     # Playwright E2E tests (23 tests)
├── dist/                    # Build output (generated)
├── vite.config.ts           # Vite build configuration
├── vitest.config.ts         # Vitest test configuration
├── playwright.config.ts     # Playwright E2E configuration
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.cjs            # ESLint rules
├── COPILOT_INSTRUCTIONS.md  # GitHub Copilot guidelines
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

## 🌐 Browser Support & Compatibility

Next Level Editor supports all modern browsers with ES6+ capabilities:

### Desktop Browsers
- ✅ **Chrome** (latest & last 2 major versions)
- ✅ **Firefox** (latest & last 2 major versions)
- ✅ **Safari** (latest & last 2 major versions)
- ✅ **Edge** (Chromium-based, latest & last 2 major versions)

### Mobile Browsers
- ✅ **iOS Safari** 12.0+
- ✅ **Chrome Mobile** (latest)
- ✅ **Samsung Internet** (latest)

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

## 🤝 Contributing

We welcome contributions! Here's how you can help improve Next Level Editor:

### Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/next-level-editor-jordan.git
   cd next-level-editor-jordan
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes**
   - Follow the coding standards in [COPILOT_INSTRUCTIONS.md](COPILOT_INSTRUCTIONS.md)
   - Write tests for new features
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm test              # Run unit tests
   npm run test:e2e      # Run E2E tests
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
- ✅ Code is linted (`npm run lint`)
- ✅ TypeScript compiles without errors (`npx vue-tsc --noEmit`)
- ✅ No security vulnerabilities (CodeQL passes)
- ✅ Tests added for new features (maintain 80%+ coverage)
- ✅ Documentation updated (README, JSDoc comments)
- ✅ Follows existing code patterns and conventions

**Commit Message Format:**
```
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

- 💬 Open a [Discussion](https://github.com/andrecj93/next-level-editor-jordan/discussions)
- 🐛 Report bugs via [Issues](https://github.com/andrecj93/next-level-editor-jordan/issues)
- 📧 Contact maintainers for security issues

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

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
- 🔧 [GitHub Repository](https://github.com/andrecj93/next-level-editor-jordan) - Source code
- 🐛 [Issue Tracker](https://github.com/andrecj93/next-level-editor-jordan/issues) - Report bugs
- 💬 [Discussions](https://github.com/andrecj93/next-level-editor-jordan/discussions) - Ask questions
- 🚀 [Demo Site](https://andrecj93.github.io/next-level-editor-jordan/) - Try it live

### Documentation
- 📖 [CHANGELOG](CHANGELOG.md) - Version history and release notes
- 📋 [COPILOT_INSTRUCTIONS](COPILOT_INSTRUCTIONS.md) - Development standards and guidelines
- 📘 [PUBLISHING](PUBLISHING.md) - Publishing workflow

### CI/CD & Quality
- ✅ [GitHub Actions](https://github.com/andrecj93/next-level-editor-jordan/actions) - Build status
- 📊 [Codecov](https://codecov.io/gh/andrecj93/next-level-editor-jordan) - Code coverage reports

---

<div align="center">

**Made with ❤️ and modern web standards**

[![Star on GitHub](https://img.shields.io/github/stars/andrecj93/next-level-editor-jordan?style=social)](https://github.com/andrecj93/next-level-editor-jordan)
[![Follow on GitHub](https://img.shields.io/github/followers/andrecj93?style=social)](https://github.com/andrecj93)

*If you find this project useful, please consider giving it a ⭐ on GitHub!*

</div>