# Next Level Editor

[![CI/CD](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml/badge.svg)](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/next-level-editor.svg)](https://www.npmjs.com/package/next-level-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A beautiful and feature-rich WYSIWYG editor for Vue.js 3 with advanced capabilities rivaling Notion and CKEditor.

![Light Mode](https://github.com/user-attachments/assets/742cb64f-42ef-4428-83e6-73dc88fde5b7)

![Dark Mode](https://github.com/user-attachments/assets/9e7c7361-2df5-4aa8-ab53-a78b8fc28643)

## ✨ Features

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
- **HTML Sanitization** - Secure content handling prevents XSS attacks
- **TypeScript Strict Mode** - Full type safety throughout
- **43 Unit Tests** - Comprehensive test coverage with Vitest
- **0 Security Vulnerabilities** - CodeQL verified
- **GitHub Actions CI/CD** - Automated testing and deployment

### 📦 Bundle Size
- **ES Module** - 231.63 KB (58.73 KB gzipped)
- **UMD** - 147.74 KB (44.15 KB gzipped)
- **CSS** - 41.91 KB (6.89 KB gzipped)
- Includes Prism.js (22 languages), emoji data, and all features

## Installation

```bash
npm install next-level-editor
```

## Usage

### Basic Usage

```vue
<template>
  <div>
    <NextLevelEditor
      v-model="content"
      placeholder="Start typing..."
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/dist/style.css'

const content = ref('<p>Hello World!</p>')
</script>
```

### Global Registration

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import NextLevelEditor from 'next-level-editor'
import 'next-level-editor/dist/style.css'

const app = createApp(App)
app.use(NextLevelEditor)
app.mount('#app')
```

Then use it in your components:

```vue
<template>
  <NextLevelEditor v-model="content" />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | The HTML content (v-model) |
| `placeholder` | `string` | `'Start typing...'` | Placeholder text when editor is empty |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when content changes |
| `focus` | - | Emitted when editor receives focus |
| `blur` | - | Emitted when editor loses focus |

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

## 🎨 Theming

The editor uses CSS variables for easy customization:

```css
:root {
  --editor-bg: #ffffff;
  --editor-border: #d8dde6;
  --toolbar-bg: #f8f9fb;
  --toolbar-text: #1f2937;
  --toolbar-accent: #3b82f6;
  --content-color: #1f2937;
}

/* Dark mode automatically applies dark theme variables */
.theme-dark {
  --editor-bg: #0f172a;
  --editor-border: #1e293b;
  --toolbar-bg: #111827;
  --toolbar-text: #e2e8f0;
  --toolbar-accent: #60a5fa;
  --content-color: #e2e8f0;
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## 📦 Build Output

The library is built in multiple formats:

- **ES Module** - `dist/next-level-editor.es.js` (231.63 KB, 58.73 KB gzipped)
- **UMD** - `dist/next-level-editor.umd.js` (147.74 KB, 44.15 KB gzipped)
- **CSS** - `dist/next-level-editor.css` (41.91 KB, 6.89 KB gzipped)

The bundle includes:
- Core editor (~15KB gzipped)
- Prism.js syntax highlighting for 22 languages (~40KB gzipped)
- All features: tables, emojis, modals, toolbar system (~4KB gzipped)

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Run development server with enhanced demo
npm run dev

# Build library
npm run build

# Lint and fix code
npm run lint

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```
src/
├── components/
│   ├── NextLevelEditor.vue      # Main editor with modern toolbar
│   ├── ToolbarDropdown.vue      # Reusable dropdown component
│   ├── ColorPicker.vue          # Color selection with palette
│   ├── FloatingToolbar.vue      # Selection context menu
│   ├── FontSizeSelector.vue     # Font size dropdown
│   ├── TableModal.vue           # Table insertion modal
│   ├── CodeBlockModal.vue       # Code block with syntax highlighting
│   ├── FindReplaceModal.vue     # Search and replace
│   ├── EmojiPicker.vue          # Emoji selector
│   ├── ImageUploadModal.vue     # Image upload with preview
│   └── EmbedModal.vue           # Video embed (YouTube/Vimeo)
├── composables/
│   ├── useTheme.ts              # Theme management with localStorage
│   └── useAutoSave.ts           # Auto-save with debouncing
├── utils/
│   ├── formatting.ts            # Text formatting utilities
│   ├── commands.ts              # Editor commands & operations
│   ├── export.ts                # Export to HTML/Markdown
│   ├── embed.ts                 # Video URL detection and embedding
│   └── __tests__/               # 43 unit tests
├── styles/
│   ├── variables.css            # CSS custom properties
│   └── animations.css           # Smooth animations
├── demo/
│   ├── App.vue                  # Enhanced demo with tabs
│   └── FeatureShowcase.vue      # Feature cards and documentation
└── types/                       # TypeScript definitions
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is linted (`npm run lint`)
- TypeScript compiles without errors
- Add tests for new features

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## 📄 License

MIT © [andrecj93](https://github.com/andrecj93)

## 🙏 Acknowledgments

Inspired by industry-leading editors:
- [CKEditor](https://ckeditor.com) - Modern horizontal toolbar design with dropdown menus
- [Notion](https://notion.so) - Slash commands and modern UX patterns
- [Medium](https://medium.com) - Floating toolbar on text selection
- [TinyMCE](https://www.tiny.cloud) - Professional feature organization
- [TipTap](https://tiptap.dev) - Clean component architecture
- [Quill](https://quilljs.com) - Modular design principles
- [Prism.js](https://prismjs.com) - Beautiful syntax highlighting

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/next-level-editor)
- [GitHub Repository](https://github.com/andrecj93/next-level-editor-jordan)
- [Issue Tracker](https://github.com/andrecj93/next-level-editor-jordan/issues)
- [Demo Site](https://andrecj93.github.io/next-level-editor-jordan/) (Coming Soon)