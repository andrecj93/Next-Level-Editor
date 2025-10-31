import { ref, watch, onMounted } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'next-level-editor-theme'

/**
 * Composable for managing theme state with localStorage persistence
 * @returns theme state and toggle function
 */
export function useTheme() {
  const theme = ref<Theme>('light')

  const loadTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light'
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') {
        return stored
      }
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error)
    }
    
    // Default to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'light'
  }

  const saveTheme = (value: Theme) => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error)
    }
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  const setTheme = (value: Theme) => {
    theme.value = value
  }

  // Watch for changes and persist
  watch(theme, (newTheme) => {
    saveTheme(newTheme)
  })

  // Load theme on mount
  onMounted(() => {
    theme.value = loadTheme()
  })

  return {
    theme,
    toggleTheme,
    setTheme
  }
}
