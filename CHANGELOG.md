# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - CKEditor-Competitive Features 🚀
- 🖌️ **Format Painter** - Copy formatting from one text selection and apply to another
- 📚 **Document Templates** - 8 pre-built templates across 4 categories:
  - Documents: Blank, Meeting Notes, Project Proposal, Technical Documentation
  - Email: Professional Email template
  - Blog: Blog Post structure
  - Marketing: Product Description, Press Release
- 📄 **Page Breaks** - Insert visual page breaks for print/export formatting with print-friendly styling
- 📑 **Table of Contents** - Auto-generate clickable TOC from document headings (H1-H6)
  - Automatic heading ID assignment
  - Smooth scrolling navigation
  - Hierarchical indentation
- ✓ **Spell Checker** - Browser-based spell checking with enable/disable toggle
  - Common misspelling corrections dictionary (20+ words)
  - Auto-correct functionality
  - Ignore list support
- 🛠️ **Tools Dropdown** - New productivity tools menu in toolbar
- 48 new unit tests for all productivity features

### Previous Features
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
- Bundle size increased for new productivity features:
  - ES Module: 234.16 KB (61.23 KB gzipped) - includes all templates and new utilities
  - UMD: 1,068.41 KB (325.65 KB gzipped)
  - CSS: 53.01 KB (8.13 KB gzipped)
- Test suite expanded to 265 tests (was 217 tests)
- Added 4 new utility modules (formatPainter, templates, pageManagement, spellChecker)
- Enhanced toolbar with Tools dropdown for productivity features

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
