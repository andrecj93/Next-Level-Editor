# Next Level Editor

A beautiful and feature-rich WYSIWYG editor for Vue.js 3, inspired by CKEditor.

## Features

- 🎨 **Beautiful Design** - Modern, clean interface with smooth interactions
- ✏️ **Rich Text Editing** - Bold, italic, underline, strikethrough formatting
- 📝 **Headings** - Support for H1, H2, H3, and paragraph styles
- 📋 **Lists** - Ordered and unordered lists
- 🔗 **Links** - Easy link insertion
- 🖼️ **Images** - Image embedding with URL
- 🧹 **Clear Formatting** - Remove all formatting with one click
- 📱 **Responsive** - Works great on all screen sizes
- 🎯 **TypeScript** - Full TypeScript support
- 🚀 **Lightweight** - Small bundle size (~5.5KB ES module)

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

## Toolbar Features

### Text Formatting
- **Bold** (Ctrl+B)
- **Italic** (Ctrl+I)
- **Underline** (Ctrl+U)
- **Strikethrough**

### Headings
- Heading 1 (H1)
- Heading 2 (H2)
- Heading 3 (H3)
- Paragraph (P)

### Lists
- Bullet List
- Numbered List

### Media
- Insert Link
- Insert Image

### Utilities
- Clear Formatting

## Development

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build library
npm run build

# Lint code
npm run lint
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.