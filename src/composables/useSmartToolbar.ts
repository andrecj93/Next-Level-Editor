import { ref, computed } from 'vue'

/**
 * Content context types that the smart toolbar can detect
 */
export type ContentContext = 
  | 'text' 
  | 'heading' 
  | 'list' 
  | 'link' 
  | 'image' 
  | 'table' 
  | 'code'
  | 'empty'

/**
 * Toolbar visibility configuration
 */
export interface ToolbarConfig {
  format: boolean
  textFormatting: boolean
  alignment: boolean
  lists: boolean
  insert: boolean
  colors: boolean
  link: boolean
  tools: boolean
  view: boolean
  export: boolean
}

/**
 * Smart toolbar state
 */
export interface SmartToolbarState {
  context: ContentContext
  config: ToolbarConfig
  isFloating: boolean
  isSticky: boolean
}

/**
 * Default toolbar configurations for different contexts
 */
const contextConfigs: Record<ContentContext, ToolbarConfig> = {
  empty: {
    format: true,
    textFormatting: false,
    alignment: false,
    lists: false,
    insert: true,
    colors: false,
    link: false,
    tools: true,
    view: true,
    export: false
  },
  text: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true
  },
  heading: {
    format: true,
    textFormatting: true,
    alignment: true,
    lists: false,
    insert: false,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true
  },
  list: {
    format: true,
    textFormatting: true,
    alignment: false,
    lists: true,
    insert: true,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true
  },
  link: {
    format: false,
    textFormatting: true,
    alignment: false,
    lists: false,
    insert: false,
    colors: true,
    link: true,
    tools: true,
    view: true,
    export: true
  },
  image: {
    format: false,
    textFormatting: false,
    alignment: true,
    lists: false,
    insert: true,
    colors: false,
    link: true,
    tools: true,
    view: true,
    export: true
  },
  table: {
    format: false,
    textFormatting: true,
    alignment: true,
    lists: false,
    insert: true,
    colors: true,
    link: false,
    tools: true,
    view: true,
    export: true
  },
  code: {
    format: false,
    textFormatting: false,
    alignment: false,
    lists: false,
    insert: false,
    colors: false,
    link: false,
    tools: true,
    view: true,
    export: true
  }
}

/**
 * Composable for smart toolbar context detection and configuration
 */
export function useSmartToolbar() {
  const context = ref<ContentContext>('empty')
  const isFloating = ref(false)
  const isSticky = ref(false)
  const customConfig = ref<Partial<ToolbarConfig> | null>(null)

  /**
   * Get the toolbar configuration for the current context
   */
  const config = computed<ToolbarConfig>(() => {
    const baseConfig = contextConfigs[context.value]
    if (customConfig.value) {
      return { ...baseConfig, ...customConfig.value }
    }
    return baseConfig
  })

  /**
   * Detect content context from the current selection or cursor position
   */
  const detectContext = (editor: HTMLElement | null): ContentContext => {
    if (!editor) return 'empty'

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return 'empty'

    const range = selection.getRangeAt(0)
    let node: Node | null = range.commonAncestorContainer

    // If text node, use parent element
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement
    }

    if (!node || !(node instanceof HTMLElement)) return 'empty'

    // Check if editor is empty
    if (editor.textContent?.trim() === '') return 'empty'

    // Check if selection contains or is an image (higher priority)
    const startContainer = range.startContainer
    const endContainer = range.endContainer
    
    if (startContainer === endContainer && startContainer.nodeType === Node.ELEMENT_NODE) {
      const element = startContainer as HTMLElement
      if (element.tagName?.toLowerCase() === 'img') {
        return 'image'
      }
      // Check if single child is an image
      if (element.children.length === 1 && element.children[0].tagName?.toLowerCase() === 'img') {
        return 'image'
      }
    }

    // Walk up the DOM tree to find context
    let element: HTMLElement | null = node
    while (element && element !== editor) {
      const tagName = element.tagName.toLowerCase()

      // Check for images (higher priority)
      if (tagName === 'img') {
        return 'image'
      }

      // Check for code blocks
      if (tagName === 'code' || tagName === 'pre') {
        return 'code'
      }

      // Check for tables
      if (tagName === 'table' || tagName === 'td' || tagName === 'th') {
        return 'table'
      }

      // Check for links
      if (tagName === 'a') {
        return 'link'
      }

      // Check for headings
      if (/^h[1-6]$/.test(tagName)) {
        return 'heading'
      }

      // Check for lists
      if (tagName === 'ul' || tagName === 'ol' || tagName === 'li') {
        return 'list'
      }

      element = element.parentElement
    }

    // Default to text if we have content
    return 'text'
  }

  /**
   * Update the current context based on the editor state
   */
  const updateContext = (editor: HTMLElement | null) => {
    const newContext = detectContext(editor)
    if (newContext !== context.value) {
      context.value = newContext
    }
  }

  /**
   * Set floating toolbar mode
   */
  const setFloating = (floating: boolean) => {
    isFloating.value = floating
  }

  /**
   * Set sticky toolbar mode
   */
  const setSticky = (sticky: boolean) => {
    isSticky.value = sticky
  }

  /**
   * Apply custom toolbar configuration
   */
  const setCustomConfig = (config: Partial<ToolbarConfig> | null) => {
    customConfig.value = config
  }

  /**
   * Reset to default configuration
   */
  const resetConfig = () => {
    customConfig.value = null
  }

  /**
   * Check if a specific toolbar section should be visible
   */
  const isVisible = (section: keyof ToolbarConfig): boolean => {
    return config.value[section]
  }

  /**
   * Get context-specific suggestions or hints
   */
  const getContextHints = (): string[] => {
    switch (context.value) {
      case 'empty':
        return ['Start typing or use Insert menu to add content']
      case 'heading':
        return ['Headings help structure your document', 'Use for section titles']
      case 'list':
        return ['Press Tab to indent', 'Press Shift+Tab to outdent']
      case 'link':
        return ['Click to edit link URL', 'Cmd/Ctrl+K to edit']
      case 'image':
        return ['Click image to resize or align']
      case 'table':
        return ['Use Tab to navigate cells', 'Right-click for table options']
      case 'code':
        return ['Code block formatting disabled', 'Preserves indentation']
      case 'text':
      default:
        return []
    }
  }

  return {
    context: computed(() => context.value),
    config,
    isFloating: computed(() => isFloating.value),
    isSticky: computed(() => isSticky.value),
    detectContext,
    updateContext,
    setFloating,
    setSticky,
    setCustomConfig,
    resetConfig,
    isVisible,
    getContextHints
  }
}
