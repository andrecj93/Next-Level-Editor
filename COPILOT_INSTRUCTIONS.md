# GitHub Copilot Instructions for Next Level Editor

## Project Overview

**Next Level Editor** is a professional, feature-rich WYSIWYG editor for Vue.js 3 that rivals industry leaders like Notion, CKEditor, and TinyMCE. This plugin is designed to meet the highest standards of modern web development.

## Core Principles

### 1. Code Quality & Standards

#### TypeScript Excellence
- **Strict Mode**: All TypeScript must compile with strict mode enabled (`tsconfig.json`)
- **Type Safety**: No `any` types unless absolutely necessary; prefer explicit interfaces and types
- **Type Exports**: Export all reusable types from `src/types/` directory
- **Documentation**: Use JSDoc comments for complex functions and public APIs

#### Vue.js Best Practices
- **Composition API**: Use `<script setup>` syntax for all new components
- **Reactivity**: Leverage `ref`, `computed`, `watch` appropriately
- **Props & Emits**: Define explicit types for all props and emits
- **Single File Components**: Keep components focused and under 400 lines when possible
- **Template Logic**: Minimize logic in templates; move complex operations to computed properties or methods

#### Modern JavaScript/ES6+
- **Arrow Functions**: Use arrow functions for callbacks and short functions
- **Destructuring**: Destructure props, imports, and objects for cleaner code
- **Optional Chaining**: Use `?.` for safe property access
- **Nullish Coalescing**: Use `??` for default values
- **Template Literals**: Use backticks for string interpolation
- **Async/Await**: Prefer async/await over promise chains

### 2. Architecture & Structure

#### Component Design
```
src/
├── components/          # Vue components
│   ├── NextLevelEditor.vue      # Main editor component
│   ├── [Feature]Modal.vue       # Modal components
│   └── [Feature]Toolbar.vue     # Toolbar components
├── composables/         # Reusable composition functions
│   ├── useTheme.ts
│   └── useAutoSave.ts
├── utils/               # Pure utility functions
│   ├── formatting.ts
│   ├── commands.ts
│   └── export.ts
├── styles/              # CSS files
│   ├── variables.css    # CSS custom properties
│   └── animations.css
└── types/               # TypeScript type definitions
```

#### Component Guidelines
- **Single Responsibility**: Each component should have one clear purpose
- **Composables**: Extract reusable logic into composables (e.g., `useTheme`, `useAutoSave`)
- **Props Validation**: Always validate props with proper types and defaults
- **Event Naming**: Use kebab-case for custom events (e.g., `update:modelValue`)
- **Slots**: Provide slots for customization where appropriate

### 3. Testing Standards

#### Coverage Requirements
- **Minimum Coverage**: 80% overall code coverage
- **Critical Paths**: 100% coverage for security-sensitive code (sanitization, XSS prevention)
- **New Features**: All new features must include comprehensive tests

#### Test Structure
```typescript
describe('Feature Name', () => {
  it('should handle basic functionality', () => {
    // Arrange
    const input = 'test'
    
    // Act
    const result = functionToTest(input)
    
    // Assert
    expect(result).toBe('expected')
  })
})
```

#### Test Types
- **Unit Tests**: Test individual functions and utilities (Vitest)
- **Component Tests**: Test Vue components in isolation (@vue/test-utils)
- **E2E Tests**: Test complete user workflows (Playwright)
- **Accessibility Tests**: Ensure ARIA compliance and keyboard navigation

#### Running Tests
```bash
npm test              # Run unit tests
npm run test:ui       # Interactive test UI
npm run test:coverage # Generate coverage report
npm run test:e2e      # Run end-to-end tests
```

### 4. Security & Accessibility

#### Security First
- **XSS Prevention**: Always sanitize user input before rendering HTML
- **Content Security**: Use DOMPurify or similar for HTML sanitization
- **Safe Defaults**: Escape HTML by default, unescape only when necessary
- **CodeQL**: All code must pass CodeQL security scanning
- **Dependencies**: Keep dependencies updated; audit regularly with `npm audit`

#### Accessibility (A11Y)
- **Semantic HTML**: Use proper HTML5 semantic elements
- **ARIA Attributes**: Add appropriate ARIA labels and roles
- **Keyboard Navigation**: Support full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- **Focus Management**: Clear focus indicators and logical focus order
- **Screen Readers**: Test with screen readers; provide descriptive labels
- **Color Contrast**: Ensure WCAG AA compliance (4.5:1 for normal text)

### 5. Performance Optimization

#### Bundle Size
- **Tree Shaking**: Write code that supports tree shaking
- **Code Splitting**: Lazy load heavy features (e.g., syntax highlighting)
- **Dependencies**: Evaluate bundle size impact before adding dependencies
- **Target**: Keep gzipped bundle under 60KB for core features

#### Runtime Performance
- **Debouncing**: Debounce expensive operations (auto-save, search)
- **Virtual Scrolling**: Consider for large lists
- **Lazy Loading**: Load heavy features on demand (emoji picker, code highlighting)
- **Memoization**: Cache computed values and expensive calculations
- **Event Listeners**: Clean up event listeners in `onUnmounted`

### 6. Styling & UI/UX

#### CSS Architecture
- **CSS Variables**: Use CSS custom properties for theming
- **BEM-like Naming**: Use descriptive class names (e.g., `.editor-toolbar__button`)
- **Scoped Styles**: Use scoped styles in Vue components
- **Dark Mode**: Support dark mode with CSS variables
- **Responsive**: Mobile-first responsive design (320px+)

#### Design System
```css
/* Theme Variables */
:root {
  --editor-bg: #ffffff;
  --editor-border: #d8dde6;
  --toolbar-bg: #f8f9fb;
  --toolbar-text: #1f2937;
  --toolbar-accent: #3b82f6;
  --content-color: #1f2937;
  --transition-speed: 150ms;
  --border-radius: 8px;
}
```

#### Animations
- **Smooth Transitions**: Use CSS transitions (150-300ms)
- **Reduced Motion**: Respect `prefers-reduced-motion`
- **Performance**: Use `transform` and `opacity` for animations
- **Purposeful**: Animations should enhance UX, not distract

### 7. Documentation Standards

#### Code Comments
```typescript
/**
 * Formats text with specified style
 * @param text - The text to format
 * @param style - The formatting style ('bold' | 'italic' | 'underline')
 * @returns The formatted HTML string
 * @example
 * formatText('Hello', 'bold') // returns '<strong>Hello</strong>'
 */
export function formatText(text: string, style: string): string {
  // Implementation
}
```

#### README Updates
- **Keep Current**: Update README when adding/changing features
- **Examples**: Provide clear code examples
- **Screenshots**: Include screenshots for UI changes
- **Version History**: Update CHANGELOG.md for all releases

### 8. Git & Version Control

#### Commit Messages
Follow conventional commits:
```
feat: add emoji picker with search functionality
fix: resolve XSS vulnerability in HTML sanitization
docs: update README with installation instructions
test: add unit tests for formatting utilities
refactor: extract theme logic into composable
perf: optimize auto-save debouncing
style: fix linting issues in editor component
```

#### Branch Strategy
- **main**: Production-ready code
- **feature/**: New features (`feature/emoji-picker`)
- **fix/**: Bug fixes (`fix/xss-vulnerability`)
- **docs/**: Documentation updates (`docs/update-readme`)

#### Pull Requests
- **Description**: Clear description of changes
- **Tests**: Include test results and coverage
- **Screenshots**: For UI changes
- **Breaking Changes**: Highlight any breaking changes
- **Checklist**: Use PR template checklist

### 9. Development Workflow

#### Before Starting
1. Pull latest changes from `main`
2. Create feature branch
3. Run tests to ensure clean baseline: `npm test`
4. Run linter: `npm run lint`

#### During Development
1. Write tests first (TDD when possible)
2. Implement feature with minimal changes
3. Run tests frequently: `npm test`
4. Lint code: `npm run lint`
5. Test in browser: `npm run dev`

#### Before Committing
1. Run full test suite: `npm test -- --run`
2. Run E2E tests (if relevant): `npm run test:e2e`
3. Check coverage: `npm run test:coverage`
4. Lint code: `npm run lint`
5. Type check: `npx vue-tsc --noEmit`
6. Build library: `npm run build`

#### CI/CD Pipeline
- All checks must pass before merging
- CodeQL security scanning
- Automated test execution
- Coverage reporting to Codecov
- Automated deployment to GitHub Pages

### 10. Feature Development Guidelines

#### Adding New Features
1. **Plan**: Document the feature and its API
2. **Test**: Write tests before implementation
3. **Implement**: Follow existing patterns and conventions
4. **Document**: Update README and add JSDoc comments
5. **Review**: Self-review code before submitting PR

#### Modifying Existing Features
1. **Understand**: Review existing code and tests
2. **Tests First**: Update/add tests to cover changes
3. **Minimal Changes**: Make the smallest change possible
4. **Backward Compatibility**: Avoid breaking existing APIs
5. **Deprecation**: If breaking changes needed, deprecate gracefully

### 11. Common Patterns

#### Editor Commands
```typescript
export function executeCommand(
  editor: HTMLElement,
  command: string,
  value?: string
): void {
  // 1. Save selection
  // 2. Execute command
  // 3. Restore focus
  // 4. Emit change event
}
```

#### Modal Components
```vue
<script setup lang="ts">
import { ref, defineEmits } from 'vue'

interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  submit: [value: string]
}>()

// Component logic
</script>
```

#### Composables
```typescript
export function useFeature() {
  const state = ref<State>(initialState)
  
  const action = () => {
    // Logic
  }
  
  return {
    state: readonly(state),
    action
  }
}
```

### 12. Dependencies

#### Adding Dependencies
- **Evaluate**: Is it necessary? Can we implement it ourselves?
- **Size**: Check bundle size impact with `npm install --dry-run`
- **Maintenance**: Is it actively maintained?
- **Security**: Check for known vulnerabilities
- **Alternatives**: Consider lighter alternatives

#### Peer Dependencies
- Vue.js 3.3.0+ (peer dependency)
- Don't add unnecessary peer dependencies

### 13. Browser Support

Target modern browsers with ES6+ support:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari 12+, Chrome Mobile)

Use Vite's built-in transpilation; avoid polyfills unless necessary.

### 14. Error Handling

#### User Errors
```typescript
try {
  // Operation
} catch (error) {
  console.error('Error message:', error)
  // Show user-friendly error message
  // Don't crash the editor
}
```

#### Validation
- Validate all user inputs
- Provide clear error messages
- Use TypeScript for compile-time validation

### 15. Internationalization (Future)

While not currently implemented, keep i18n in mind:
- Use descriptive string constants
- Avoid hardcoded strings in templates
- Keep text separate from logic

## Quick Reference

### Essential Commands
```bash
npm install           # Install dependencies
npm run dev          # Start development server
npm run build        # Build library
npm run lint         # Lint and fix code
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
npm run test:coverage # Generate coverage report
```

### File Locations
- **Components**: `src/components/`
- **Utilities**: `src/utils/`
- **Tests**: `src/**/__tests__/` or `e2e/`
- **Styles**: `src/styles/`
- **Types**: `src/types/`

### Key Files
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `vitest.config.ts` - Test configuration
- `playwright.config.ts` - E2E test configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.cjs` - ESLint rules

## Philosophy

This project aspires to be:
- **Professional**: Enterprise-grade quality
- **Accessible**: Usable by everyone
- **Secure**: No vulnerabilities
- **Performant**: Fast and responsive
- **Maintainable**: Clean, documented code
- **Tested**: High coverage with meaningful tests
- **Modern**: Latest web standards and best practices

Remember: **Quality over speed**. Take the time to do it right.

---

When in doubt, refer to existing code patterns and tests. Consistency is key to maintainability.
