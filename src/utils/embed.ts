/**
 * Utilities for detecting and embedding media URLs (YouTube, Vimeo, etc.)
 */

/**
 * YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

/**
 * Vimeo URL patterns
 */
const VIMEO_PATTERNS = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
]

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Extract Vimeo video ID from URL
 */
export function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Detect if URL is a YouTube video
 */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null
}

/**
 * Detect if URL is a Vimeo video
 */
export function isVimeoUrl(url: string): boolean {
  return extractVimeoId(url) !== null
}

/**
 * Detect if URL is an embeddable video
 */
export function isEmbeddableVideo(url: string): boolean {
  return isYouTubeUrl(url) || isVimeoUrl(url)
}

/**
 * Get embed HTML for YouTube video
 */
export function getYouTubeEmbedHtml(videoId: string): string {
  return `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe 
    src="https://www.youtube.com/embed/${videoId}" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen
    title="YouTube video player"
  ></iframe>
</div>`
}

/**
 * Get embed HTML for Vimeo video
 */
export function getVimeoEmbedHtml(videoId: string): string {
  return `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  <iframe 
    src="https://player.vimeo.com/video/${videoId}" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="autoplay; fullscreen; picture-in-picture" 
    allowfullscreen
    title="Vimeo video player"
  ></iframe>
</div>`
}

/**
 * Get embed HTML for any supported video URL
 * Returns null if URL is not supported
 */
export function getVideoEmbedHtml(url: string): string | null {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return getYouTubeEmbedHtml(youtubeId)
  }

  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return getVimeoEmbedHtml(vimeoId)
  }

  return null
}

/**
 * Auto-detect and convert video URLs to embeds in HTML content
 */
export function autoEmbedVideos(html: string): string {
  let result = html

  // Find all link tags with video URLs
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi
  result = result.replace(linkPattern, (match, url, text) => {
    const embedHtml = getVideoEmbedHtml(url)
    if (embedHtml) {
      return embedHtml
    }
    return match
  })

  // Find standalone video URLs (not in links)
  const youtubePattern = /(?:^|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11}))(?:\s|$)/g
  result = result.replace(youtubePattern, (match, url, videoId) => {
    return getYouTubeEmbedHtml(videoId)
  })

  const vimeoPattern = /(?:^|\s)(https?:\/\/(?:www\.)?vimeo\.com\/(\d+))(?:\s|$)/g
  result = result.replace(vimeoPattern, (match, url, videoId) => {
    return getVimeoEmbedHtml(videoId)
  })

  return result
}
