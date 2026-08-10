/**
 * Basic Spell Checker Utility
 * Simple spell checking functionality using browser's built-in APIs
 */

/**
 * Enables spell checking on the editor
 * @param editor - The editor element
 */
export function enableSpellCheck(editor: HTMLElement): void {
  editor.setAttribute('spellcheck', 'true')
}

/**
 * Disables spell checking on the editor
 * @param editor - The editor element
 */
export function disableSpellCheck(editor: HTMLElement): void {
  editor.setAttribute('spellcheck', 'false')
}

/**
 * Toggles spell checking on the editor
 * @param editor - The editor element
 * @returns The new spell check state
 */
export function toggleSpellCheck(editor: HTMLElement): boolean {
  const currentState = editor.getAttribute('spellcheck') === 'true'
  const newState = !currentState
  editor.setAttribute('spellcheck', String(newState))
  return newState
}

/**
 * Gets the current spell check state
 * @param editor - The editor element
 * @returns true if spell check is enabled
 */
export function isSpellCheckEnabled(editor: HTMLElement): boolean {
  return editor.getAttribute('spellcheck') === 'true'
}

/**
 * Interface for misspelled word information
 */
export interface MisspelledWord {
  word: string
  startOffset: number
  endOffset: number
  node: Node
}

/**
 * Common misspelling corrections (basic dictionary)
 */
const commonCorrections: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  occured: 'occurred',
  beleive: 'believe',
  seperate: 'separate',
  definately: 'definitely',
  untill: 'until',
  occassion: 'occasion',
  accomodate: 'accommodate',
  publically: 'publicly',
  wierd: 'weird',
  acheive: 'achieve',
  goverment: 'government',
  existance: 'existence',
  succesful: 'successful',
  recomend: 'recommend',
  embarass: 'embarrass',
  collegue: 'colleague',
  neccessary: 'necessary',
  apparantly: 'apparently',
}

/**
 * Gets a suggestion for a misspelled word
 * @param word - The misspelled word
 * @returns A suggested correction or null
 */
export function getSuggestion(word: string): string | null {
  const lowercase = word.toLowerCase()
  return commonCorrections[lowercase] || null
}

/**
 * Auto-corrects common misspellings in the editor
 * @param editor - The editor element
 * @returns The number of corrections made
 */
export function autoCorrectCommonMisspellings(editor: HTMLElement): number {
  let corrections = 0
  const text = editor.textContent || ''
  const words = text.split(/\s+/)

  // Build the set of corrections to apply, keyed by the misspelled word.
  const fixes = new Map<string, string>()
  for (const word of words) {
    const cleanWord = word.replace(/[^\w]/g, '')
    if (!cleanWord || fixes.has(cleanWord.toLowerCase())) continue
    // Respect the user's ignore list — a word they explicitly kept must not be
    // silently auto-corrected (this pass never consulted it before).
    if (isWordIgnored(cleanWord)) continue
    const suggestion = getSuggestion(cleanWord)
    if (suggestion) fixes.set(cleanWord.toLowerCase(), suggestion)
  }
  if (fixes.size === 0) return 0

  // Apply inside TEXT NODES only. A previous `editor.innerHTML.replace(...)`
  // matched inside tag names, attributes and URLs (e.g. a misspelling that
  // also appears in a class or href), corrupting the markup.
  // Re-apply the original token's casing to the (lowercase) dictionary fix, so
  // a sentence-leading "Teh" → "The" (not "the") and an all-caps "RECIEVE" →
  // "RECEIVE". Mixed/lowercase tokens keep the fix as-is.
  const matchCase = (fix: string, token: string): string => {
    const hasLetters = token.toLowerCase() !== token.toUpperCase()
    if (hasLetters && token === token.toUpperCase()) return fix.toUpperCase()
    const first = token.charAt(0)
    if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
      return fix.charAt(0).toUpperCase() + fix.slice(1)
    }
    return fix
  }

  const applyToTextNode = (node: Text) => {
    const original = node.textContent ?? ''
    const replaced = original.replace(/\b[\w']+\b/g, (token) => {
      const fix = fixes.get(token.toLowerCase())
      if (fix && fix.toLowerCase() !== token.toLowerCase()) {
        corrections++
        return matchCase(fix, token)
      }
      return token
    })
    if (replaced !== original) node.textContent = replaced
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      applyToTextNode(node as Text)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of Array.from(node.childNodes)) walk(child)
    }
  }
  walk(editor)

  return corrections
}

/**
 * Counts misspelled words (approximation using common mistakes)
 * @param text - The text to check
 * @returns The count of potential misspellings
 */
export function countMisspellings(text: string): number {
  let count = 0
  const words = text.split(/\s+/)

  words.forEach((word) => {
    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase()
    if (commonCorrections[cleanWord]) {
      count++
    }
  })

  return count
}

/**
 * Adds a custom word to ignore (stored in session)
 */
const ignoredWords = new Set<string>()

/**
 * Adds a word to the ignore list
 * @param word - The word to ignore
 */
export function addToIgnoreList(word: string): void {
  ignoredWords.add(word.toLowerCase())
}

/**
 * Removes a word from the ignore list
 * @param word - The word to remove
 */
export function removeFromIgnoreList(word: string): void {
  ignoredWords.delete(word.toLowerCase())
}

/**
 * Checks if a word is in the ignore list
 * @param word - The word to check
 * @returns true if the word should be ignored
 */
export function isWordIgnored(word: string): boolean {
  return ignoredWords.has(word.toLowerCase())
}

/**
 * Clears the ignore list
 */
export function clearIgnoreList(): void {
  ignoredWords.clear()
}

/**
 * Sets the language for spell checking
 * @param editor - The editor element
 * @param lang - The language code (e.g., 'en-US', 'es-ES')
 */
export function setSpellCheckLanguage(editor: HTMLElement, lang: string): void {
  editor.setAttribute('lang', lang)
}

/**
 * Gets the current spell check language
 * @param editor - The editor element
 * @returns The language code
 */
export function getSpellCheckLanguage(editor: HTMLElement): string {
  return editor.getAttribute('lang') || 'en-US'
}
