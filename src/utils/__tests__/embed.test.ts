import { describe, it, expect } from 'vitest'
import {
  extractYouTubeId,
  extractVimeoId,
  isYouTubeUrl,
  isVimeoUrl,
  isEmbeddableVideo,
  getYouTubeEmbedHtml,
  getVimeoEmbedHtml,
  getVideoEmbedHtml,
} from '../embed'

describe('embed utilities', () => {
  describe('extractYouTubeId', () => {
    it('should extract ID from youtube.com/watch URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractYouTubeId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract ID from youtu.be URLs', () => {
      expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should extract ID from youtube.com/embed URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID when v= is not the first query parameter', () => {
      expect(
        extractYouTubeId('https://www.youtube.com/watch?list=PLabc&v=dQw4w9WgXcQ')
      ).toBe('dQw4w9WgXcQ')
      expect(
        extractYouTubeId('https://www.youtube.com/watch?a=1&b=2&v=dQw4w9WgXcQ&t=3')
      ).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from mobile (m.) and music. hosts', () => {
      expect(extractYouTubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractYouTubeId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('extracts ID from Shorts URLs', () => {
      expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
      expect(extractYouTubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    })

    it('should return null for invalid URLs', () => {
      expect(extractYouTubeId('https://example.com')).toBeNull()
      expect(extractYouTubeId('not a url')).toBeNull()
    })
  })

  describe('extractVimeoId', () => {
    it('should extract ID from vimeo.com URLs', () => {
      expect(extractVimeoId('https://vimeo.com/123456789')).toBe('123456789')
      expect(extractVimeoId('https://www.vimeo.com/123456789')).toBe('123456789')
    })

    it('should extract ID from player.vimeo.com URLs', () => {
      expect(extractVimeoId('https://player.vimeo.com/video/123456789')).toBe('123456789')
    })

    it('should return null for invalid URLs', () => {
      expect(extractVimeoId('https://example.com')).toBeNull()
      expect(extractVimeoId('not a url')).toBeNull()
    })
  })

  describe('isYouTubeUrl', () => {
    it('should return true for YouTube URLs', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
    })

    it('should return false for non-YouTube URLs', () => {
      expect(isYouTubeUrl('https://example.com')).toBe(false)
      expect(isYouTubeUrl('https://vimeo.com/123456789')).toBe(false)
    })
  })

  describe('isVimeoUrl', () => {
    it('should return true for Vimeo URLs', () => {
      expect(isVimeoUrl('https://vimeo.com/123456789')).toBe(true)
      expect(isVimeoUrl('https://player.vimeo.com/video/123456789')).toBe(true)
    })

    it('should return false for non-Vimeo URLs', () => {
      expect(isVimeoUrl('https://example.com')).toBe(false)
      expect(isVimeoUrl('https://youtube.com/watch?v=test')).toBe(false)
    })
  })

  describe('isEmbeddableVideo', () => {
    it('should return true for YouTube and Vimeo URLs', () => {
      expect(isEmbeddableVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true)
      expect(isEmbeddableVideo('https://vimeo.com/123456789')).toBe(true)
    })

    it('should return false for other URLs', () => {
      expect(isEmbeddableVideo('https://example.com')).toBe(false)
    })
  })

  describe('getYouTubeEmbedHtml', () => {
    it('should generate YouTube embed HTML', () => {
      const html = getYouTubeEmbedHtml('dQw4w9WgXcQ')
      expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ')
      expect(html).toContain('iframe')
      expect(html).toContain('video-embed')
    })
  })

  describe('getVimeoEmbedHtml', () => {
    it('should generate Vimeo embed HTML', () => {
      const html = getVimeoEmbedHtml('123456789')
      expect(html).toContain('player.vimeo.com/video/123456789')
      expect(html).toContain('iframe')
      expect(html).toContain('video-embed')
    })
  })

  describe('getVideoEmbedHtml', () => {
    it('should return YouTube embed for YouTube URLs', () => {
      const html = getVideoEmbedHtml('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ')
    })

    it('should return Vimeo embed for Vimeo URLs', () => {
      const html = getVideoEmbedHtml('https://vimeo.com/123456789')
      expect(html).toContain('player.vimeo.com/video/123456789')
    })

    it('should return null for unsupported URLs', () => {
      expect(getVideoEmbedHtml('https://example.com')).toBeNull()
    })
  })
})
