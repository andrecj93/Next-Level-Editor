# Next Level Editor

[![CI/CD](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml/badge.svg)](https://github.com/andrecj93/next-level-editor-jordan/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/next-level-editor.svg)](https://www.npmjs.com/package/next-level-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A beautiful and feature-rich WYSIWYG editor for Vue.js 3 with advanced capabilities rivaling Notion and CKEditor.

![Light Mode](https://github.com/user-attachments/assets/742cb64f-42ef-4428-83e6-73dc88fde5b7)

![Dark Mode](https://github.com/user-attachments/assets/9e7c7361-2df5-4aa8-ab53-a78b8fc28643)

## ✨ Features

### Core Editing
- ✏️ **Rich Text Formatting** - Bold, italic, underline, strikethrough
- 📝 **Headings** - H1, H2, H3, and paragraph styles
- 📋 **Lists** - Ordered and unordered lists
- 🔗 **Links & Images** - Easy media insertion
- 🎨 **Color Pickers** - Text and background colors
- 📐 **Text Alignment** - Left, center, right, justify
- 🧹 **Clear Formatting** - Remove all formatting

### Advanced Features
- 🌓 **Dark Mode** - Beautiful dark theme with localStorage persistence
- 💬 **Floating Toolbar** - Context menu on text selection (like Medium)
- ⌨️ **Slash Commands** - Type `/` for quick actions (13+ commands)
- 📊 **Word & Character Count** - Live statistics in footer
- 📤 **Export** - Download as HTML or Markdown
- ↩️ **Undo/Redo** - Full history with Ctrl+Z/Ctrl+Shift+Z
- 💾 **HTML Sanitization** - Secure content handling
- 📱 **Responsive Design** - Works great on all screen sizes

### Developer Experience
- 🎯 **TypeScript** - Full TypeScript support with strict mode
- 🧪 **Well Tested** - 24+ unit tests with Vitest
- 📦 **Lightweight** - ~44KB ES module (~11KB gzipped)
- 🔌 **Extensible** - Clean component architecture
- 🎨 **Themeable** - CSS variables for easy customization

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

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+K` | Insert Link |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Alt+1` | Heading 1 |
| `Ctrl+Alt+2` | Heading 2 |
| `Ctrl+Alt+3` | Heading 3 |
| `/` | Open slash commands |

## 💬 Slash Commands

Type `/` to open the quick actions menu:

- `/heading1`, `/heading2`, `/heading3` - Insert headings
- `/paragraph` - Convert to paragraph
- `/bold`, `/italic` - Text formatting
- `/bullet-list`, `/numbered-list` - Create lists
- `/quote` - Insert blockquote
- `/code` - Insert code block
- `/link`, `/image` - Insert media
- `/divider` - Insert horizontal rule

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

- **ES Module** - `dist/next-level-editor.es.js` (44.24 KB, 10.85 KB gzipped)
- **UMD** - `dist/next-level-editor.umd.js` (31.38 KB, 9.58 KB gzipped)
- **CSS** - `dist/next-level-editor.css` (11.58 KB, 2.71 KB gzipped)

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Run development server with demo
npm run dev

# Build library
npm run build

# Lint and fix code
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```
src/
├── components/
│   ├── NextLevelEditor.vue      # Main editor component
│   ├── ColorPicker.vue          # Color selection component
│   └── FloatingToolbar.vue      # Selection context menu
├── composables/
│   └── useTheme.ts              # Theme management
├── utils/
│   ├── formatting.ts            # Text formatting utilities
│   ├── commands.ts              # Editor commands & operations
│   ├── export.ts                # Export to HTML/Markdown
│   └── __tests__/               # Unit tests
├── styles/
│   ├── variables.css            # CSS custom properties
│   └── animations.css           # Animation utilities
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

Inspired by:
- [Notion](https://notion.so) - Slash commands
- [Medium](https://medium.com) - Floating toolbar
- [CKEditor](https://ckeditor.com) - Feature set
- [TipTap](https://tiptap.dev) - Architecture
- [Quill](https://quilljs.com) - Modular design

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/next-level-editor)
- [GitHub Repository](https://github.com/andrecj93/next-level-editor-jordan)
- [Issue Tracker](https://github.com/andrecj93/next-level-editor-jordan/issues)
- [Demo Site](https://andrecj93.github.io/next-level-editor-jordan/) (Coming Soon)