import { describe, it, expect } from 'vitest'
import { autoEmbedVideos } from '../embed'

describe('Embed Coverage Tests', () => {
  describe('autoEmbedVideos', () => {
    it('converts YouTube links to embeds', () => {
      const html = '<p><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Video</a></p>'
      const result = autoEmbedVideos(html)
      
      expect(result).toContain('iframe')
      expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
    })

    it('converts Vimeo links to embeds', () => {
      const html = '<p><a href="https://vimeo.com/123456789">Video</a></p>'
      const result = autoEmbedVideos(html)
      
      expect(result).toContain('iframe')
      expect(result).toContain('player.vimeo.com/video/123456789')
    })

    it('converts standalone YouTube URLs', () => {
      const html = '<p>Check this out: https://www.youtube.com/watch?v=dQw4w9WgXcQ </p>'
      const result = autoEmbedVideos(html)
      
      expect(result).toContain('iframe')
      expect(result).toContain('youtube.com/embed/dQw4w9WgXcQ')
    })

    it('converts standalone Vimeo URLs', () => {
      const html = '<p>Watch: https://vimeo.com/123456789 </p>'
      const result = autoEmbedVideos(html)
      
      expect(result).toContain('iframe')
      expect(result).toContain('player.vimeo.com/video/123456789')
    })

    it('leaves non-video links unchanged', () => {
      const html = '<p><a href="https://example.com">Regular link</a></p>'
      const result = autoEmbedVideos(html)
      
      expect(result).toBe(html)
    })
  })
})
