import { describe, it, expect, beforeEach } from 'vitest'
import { getWordCount, getCharacterCount, searchAndReplace } from '../commands'

describe('commands utility', () => {
  describe('getWordCount', () => {
    it('should count words correctly', () => {
      expect(getWordCount('<p>Hello world</p>')).toBe(2)
      expect(getWordCount('<p>One two three</p>')).toBe(3)
      expect(getWordCount('<p></p>')).toBe(0)
    })

    it('should handle HTML tags', () => {
      expect(getWordCount('<p>Hello <strong>world</strong></p>')).toBe(2)
      // Note: Without space between tags, "Title" and "Content" may be concatenated
      expect(getWordCount('<h1>Title</h1> <p>Content here</p>')).toBe(3)
    })

    it('should handle multiple spaces', () => {
      expect(getWordCount('<p>Hello    world</p>')).toBe(2)
      expect(getWordCount('<p>  Trimmed  spaces  </p>')).toBe(2)
    })
  })

  describe('getCharacterCount', () => {
    it('should count characters correctly', () => {
      expect(getCharacterCount('<p>Hello</p>')).toBe(5)
      expect(getCharacterCount('<p>Hello world</p>')).toBe(11)
    })

    it('should handle HTML tags', () => {
      expect(getCharacterCount('<p>Hello <strong>world</strong></p>')).toBe(11)
    })

    it('should handle empty content', () => {
      expect(getCharacterCount('<p></p>')).toBe(0)
      expect(getCharacterCount('')).toBe(0)
    })
  })

  describe('searchAndReplace', () => {
    it('should replace text', () => {
      const html = '<p>Hello world</p>'
      const result = searchAndReplace(html, 'world', 'there')
      expect(result).toContain('Hello there')
    })

    it('should replace multiple occurrences', () => {
      const html = '<p>test test test</p>'
      const result = searchAndReplace(html, 'test', 'word')
      expect(result).toBe('<p>word word word</p>')
    })

    it('should be case insensitive by default', () => {
      const html = '<p>Hello HELLO hello</p>'
      const result = searchAndReplace(html, 'hello', 'hi')
      expect(result).toBe('<p>hi hi hi</p>')
    })

    it('should respect case sensitive option', () => {
      const html = '<p>Hello hello</p>'
      const result = searchAndReplace(html, 'hello', 'hi', { caseSensitive: true })
      expect(result).toBe('<p>Hello hi</p>')
    })

    it('should handle whole word option', () => {
      const html = '<p>test testing tested</p>'
      const result = searchAndReplace(html, 'test', 'word', { wholeWord: true })
      expect(result).toBe('<p>word testing tested</p>')
    })
  })
})
