import { describe, it, expect, beforeEach } from 'vitest'
import {
  enableSpellCheck,
  disableSpellCheck,
  toggleSpellCheck,
  isSpellCheckEnabled,
  getSuggestion,
  autoCorrectCommonMisspellings,
  countMisspellings,
  addToIgnoreList,
  removeFromIgnoreList,
  isWordIgnored,
  clearIgnoreList,
  setSpellCheckLanguage,
  getSpellCheckLanguage,
} from '../spellChecker'

describe('Spell Checker', () => {
  let editor: HTMLElement

  beforeEach(() => {
    editor = document.createElement('div')
    editor.contentEditable = 'true'
    clearIgnoreList()
  })

  describe('Enable/Disable Spell Check', () => {
    it('should enable spell check', () => {
      enableSpellCheck(editor)
      expect(editor.getAttribute('spellcheck')).toBe('true')
      expect(isSpellCheckEnabled(editor)).toBe(true)
    })

    it('should disable spell check', () => {
      disableSpellCheck(editor)
      expect(editor.getAttribute('spellcheck')).toBe('false')
      expect(isSpellCheckEnabled(editor)).toBe(false)
    })

    it('should toggle spell check', () => {
      disableSpellCheck(editor)
      const state1 = toggleSpellCheck(editor)
      expect(state1).toBe(true)
      expect(isSpellCheckEnabled(editor)).toBe(true)

      const state2 = toggleSpellCheck(editor)
      expect(state2).toBe(false)
      expect(isSpellCheckEnabled(editor)).toBe(false)
    })
  })

  describe('Spell Check Suggestions', () => {
    it('should provide suggestions for common misspellings', () => {
      expect(getSuggestion('teh')).toBe('the')
      expect(getSuggestion('recieve')).toBe('receive')
      expect(getSuggestion('occured')).toBe('occurred')
      expect(getSuggestion('beleive')).toBe('believe')
      expect(getSuggestion('definately')).toBe('definitely')
    })

    it('should handle case-insensitive suggestions', () => {
      expect(getSuggestion('TEH')).toBe('the')
      expect(getSuggestion('Teh')).toBe('the')
    })

    it('should return null for correctly spelled words', () => {
      expect(getSuggestion('correct')).toBeNull()
      expect(getSuggestion('hello')).toBeNull()
    })
  })

  describe('Auto-Correct Misspellings', () => {
    it('should auto-correct common misspellings', () => {
      editor.innerHTML = '<p>I beleive teh answer is correct.</p>'
      const corrections = autoCorrectCommonMisspellings(editor)
      expect(corrections).toBeGreaterThan(0)
      expect(editor.innerHTML).toContain('believe')
      expect(editor.innerHTML).toContain('the')
    })

    it('should count misspellings', () => {
      const text = 'I beleive teh answer is definately correct.'
      const count = countMisspellings(text)
      expect(count).toBe(3) // beleive, teh, definately
    })

    it('should handle text with no misspellings', () => {
      const text = 'This sentence is correct.'
      const count = countMisspellings(text)
      expect(count).toBe(0)
    })

    it('preserves the original casing of the corrected word', () => {
      // Sentence-leading capital: "Teh" -> "The", not "the".
      editor.innerHTML = '<p>Teh cat sat.</p>'
      autoCorrectCommonMisspellings(editor)
      expect(editor.innerHTML).toContain('The cat')
      expect(editor.innerHTML).not.toContain('the cat')

      // All-caps stays all-caps.
      editor.innerHTML = '<p>RECIEVE THIS</p>'
      autoCorrectCommonMisspellings(editor)
      expect(editor.innerHTML).toContain('RECEIVE')

      // Lowercase stays lowercase.
      editor.innerHTML = '<p>please recieve it</p>'
      autoCorrectCommonMisspellings(editor)
      expect(editor.innerHTML).toContain('receive')
    })

    it('does not auto-correct a word the user added to the ignore list', () => {
      addToIgnoreList('teh')
      editor.innerHTML = '<p>teh answer</p>'

      const corrections = autoCorrectCommonMisspellings(editor)

      // "teh" was explicitly kept, so it must survive auto-correct.
      expect(editor.innerHTML).toContain('teh answer')
      expect(editor.innerHTML).not.toContain('the answer')
      expect(corrections).toBe(0)
    })
  })

  describe('Ignore List', () => {
    it('should add word to ignore list', () => {
      addToIgnoreList('customword')
      expect(isWordIgnored('customword')).toBe(true)
    })

    it('should handle case-insensitive ignore list', () => {
      addToIgnoreList('CustomWord')
      expect(isWordIgnored('customword')).toBe(true)
      expect(isWordIgnored('CUSTOMWORD')).toBe(true)
    })

    it('should remove word from ignore list', () => {
      addToIgnoreList('testword')
      expect(isWordIgnored('testword')).toBe(true)
      removeFromIgnoreList('testword')
      expect(isWordIgnored('testword')).toBe(false)
    })

    it('should clear ignore list', () => {
      addToIgnoreList('word1')
      addToIgnoreList('word2')
      expect(isWordIgnored('word1')).toBe(true)
      expect(isWordIgnored('word2')).toBe(true)
      
      clearIgnoreList()
      expect(isWordIgnored('word1')).toBe(false)
      expect(isWordIgnored('word2')).toBe(false)
    })
  })

  describe('Language Settings', () => {
    it('should set spell check language', () => {
      setSpellCheckLanguage(editor, 'es-ES')
      expect(editor.getAttribute('lang')).toBe('es-ES')
    })

    it('should get spell check language', () => {
      setSpellCheckLanguage(editor, 'fr-FR')
      expect(getSpellCheckLanguage(editor)).toBe('fr-FR')
    })

    it('should return default language when not set', () => {
      expect(getSpellCheckLanguage(editor)).toBe('en-US')
    })
  })

  describe('Common Corrections Dictionary', () => {
    it('should have corrections for common misspellings', () => {
      const commonWords = [
        'teh',
        'recieve',
        'occured',
        'beleive',
        'seperate',
        'definately',
        'untill',
        'wierd',
      ]

      commonWords.forEach((word) => {
        const suggestion = getSuggestion(word)
        expect(suggestion).not.toBeNull()
        expect(suggestion).toBeDefined()
      })
    })
  })
})
