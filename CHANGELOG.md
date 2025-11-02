# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 🎨 Color picker for text and background colors with 25 preset colors + custom picker
- 📐 Text alignment controls (left, center, right, justify)
- 💬 Floating toolbar that appears on text selection (like Medium editor)
- 🌓 Enhanced dark mode with localStorage persistence and system preference detection
- ⌨️ 13 slash commands for quick formatting (`/heading1`, `/bold`, `/quote`, etc.)
- 📊 Live word and character count displayed in editor footer
- 📤 Export functionality: download as HTML or Markdown files
- ➖ Horizontal rule insertion
- 🧪 Vitest testing infrastructure with 24+ passing unit tests
- 🎨 CSS variables system for consistent theming
- 📦 Reusable ColorPicker and FloatingToolbar components
- 🔧 useTheme composable for theme management
- 🛠️ Utility functions for text operations, word counting, and exports
- 🔄 GitHub Actions CI/CD workflow with automated testing and deployment

### Enhanced
- Improved slash command menu with more options and better descriptions
- Better toolbar organization with new sections for colors and alignment
- Enhanced keyboard shortcuts with more comprehensive support
- Improved TypeScript types and JSDoc comments throughout
- Better code organization with composables and utility modules
- Enhanced HTML to Markdown conversion
- More comprehensive test coverage

### Technical
- Added Vitest for unit testing with coverage reporting
- Created composables system for reusable logic
- Implemented utility functions for commands and exports
- Set up CSS variable system for theming
- Added GitHub Actions CI/CD workflow
- Improved bundle optimization

### Changed
- Bundle size increased for new features:
  - ES Module: 44.24 KB (10.85 KB gzipped) - up from 26.96 KB
  - UMD: 31.38 KB (9.58 KB gzipped) - up from 18.94 KB
  - CSS: 11.58 KB (2.71 KB gzipped) - up from 7.77 KB
- Still under 50KB gzipped target

## [1.0.0] - 2025-10-30

### Added
- Initial release of Next Level Editor
- WYSIWYG rich text editing with contenteditable
- Text formatting: bold, italic, underline, strikethrough
- Headings support: H1, H2, H3, and paragraph
- List support: ordered and unordered lists
- Link insertion functionality
- Image insertion functionality
- Clear formatting feature
- Beautiful, modern UI design
- Full TypeScript support
- Vue 3 Composition API integration
- v-model support for two-way binding
- Undo/Redo with full history management
- HTML sanitization for security
- Blockquote and code block support
- Basic dark/light theme toggle
- History timeline visualization
- Collapsible toolbar sections
- Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, etc.)
- Comprehensive documentation
- Demo application
- ES Module and UMD builds
- CSS styling included

### Features
- ✨ Beautiful and intuitive toolbar
- 📝 Rich text editing capabilities
- 🎯 TypeScript type definitions
- 📦 Lightweight bundle (~26KB ES module)
- 🚀 Production-ready
- 📱 Responsive design
- ♿ Accessible
- 🎨 Customizable styling

[Unreleased]: https://github.com/andrecj93/next-level-editor-jordan/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/andrecj93/next-level-editor-jordan/releases/tag/v1.0.0
