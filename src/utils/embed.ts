/**
 * Utilities for detecting and embedding media URLs (YouTube, Vimeo, etc.)
 */

/**
 * YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  // watch URLs — `v=` may sit anywhere in the query (e.g. `?list=…&v=…`), and
  // the host may be www., m. (mobile) or music.
  /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Shorts share the same 11-char id space as regular videos.
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Live streams: youtube.com/live/<id> — same 11-char id, embeds via /embed/.
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
]

/**
 * Vimeo URL patterns
 */
const VIMEO_PATTERNS = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/,
  /^https?:\/\/player\.vimeo\.com\/video\/(\d+)/,
]

/**
 * The privacy hash of an unlisted Vimeo video — required by the embed or the
 * player shows "this video is private". Carried as `vimeo.com/<id>/<hash>` in
 * the share URL and `?h=<hash>` in the player URL.
 */
const VIMEO_HASH_PATTERNS = [
  /^https?:\/\/(?:www\.)?vimeo\.com\/\d+\/([a-zA-Z0-9]+)/,
  /[?&]h=([a-zA-Z0-9]+)/,
]

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = new RegExp(pattern).exec(url)
    if (match?.[1]) {
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
    const match = new RegExp(pattern).exec(url)
    if (match?.[1]) {
      return match[1]
    }
  }
  return null
}

/**
 * Extract the unlisted-video privacy hash from a Vimeo URL, or null.
 */
export function extractVimeoHash(url: string): string | null {
  for (const pattern of VIMEO_HASH_PATTERNS) {
    const match = new RegExp(pattern).exec(url)
    if (match?.[1]) {
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
 * The player iframe's trusted inline presentation, and the per-host chrome that
 * goes with it. Shared with the HTML sanitizer, which REGENERATES both on every
 * round-trip rather than trusting what is on the element: `position`, the
 * offsets and `border` are deliberately outside the sanitizer's style
 * allowlist — an attacker-supplied `position: fixed` box is an overlay surface
 * — so rebuilding from constants we own is the only way the player can stay
 * borderless and filling its box. #R23-62
 */
export const EMBED_IFRAME_STYLE =
  'position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;'

const YOUTUBE_PLAYER_CHROME = {
  allow:
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  title: 'YouTube video player',
} as const

const VIMEO_PLAYER_CHROME = {
  allow: 'autoplay; fullscreen; picture-in-picture',
  title: 'Vimeo video player',
} as const

/** The permissions and accessible name a player src should carry. */
export function getEmbedPlayerChrome(src: string): {
  allow: string
  title: string
} {
  return /^https:\/\/player\.vimeo\.com\//i.test(src)
    ? VIMEO_PLAYER_CHROME
    : YOUTUBE_PLAYER_CHROME
}

/**
 * The canonical human-facing URL for a PLAYER src. Embed URLs exist for
 * iframes; when a static export degrades the player to a link (Word and PDF
 * cannot render one — #R29-1), the link should open the page a person would
 * actually visit: youtube.com/watch for both YouTube hosts (the nocookie
 * domain has no watch pages), vimeo.com/<id> — with the unlisted-video hash
 * carried as the path segment Vimeo expects. Null when the src is not a
 * recognized player.
 */
export function embedSrcToWatchUrl(src: string): string | null {
  const youtube = src.match(
    /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/i
  )
  if (youtube) {
    return `https://www.youtube.com/watch?v=${youtube[1]}`
  }
  const vimeo = src.match(
    /^https:\/\/player\.vimeo\.com\/video\/(\d+)(?:\?h=([a-zA-Z0-9]+))?/i
  )
  if (vimeo) {
    return vimeo[2]
      ? `https://vimeo.com/${vimeo[1]}/${vimeo[2]}`
      : `https://vimeo.com/${vimeo[1]}`
  }
  return null
}

/**
 * The responsive 16:9 box the player sits in. Only the modal PREVIEW relies on
 * it — inside the editor the embed container is already a sized, positioned
 * box, and the sanitizer drops this wrapper.
 */
function wrapInAspectRatioBox(iframeHtml: string): string {
  return `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; margin: 20px 0;">
  ${iframeHtml}
</div>`
}

/** The bare player, styled to fill whatever positioned box holds it. */
function buildPlayerIframe(
  src: string,
  chrome: { allow: string; title: string }
): string {
  return `<iframe
    src="${src}"
    style="${EMBED_IFRAME_STYLE}"
    allow="${chrome.allow}"
    allowfullscreen
    title="${chrome.title}"
  ></iframe>`
}

/**
 * Get embed HTML for YouTube video
 */
export function getYouTubeEmbedHtml(videoId: string): string {
  return wrapInAspectRatioBox(
    buildPlayerIframe(
      `https://www.youtube.com/embed/${videoId}`,
      YOUTUBE_PLAYER_CHROME
    )
  )
}

/**
 * Get embed HTML for Vimeo video
 */
export function getVimeoEmbedHtml(videoId: string, hash?: string | null): string {
  return wrapInAspectRatioBox(
    buildPlayerIframe(buildVimeoSrc(videoId, hash), VIMEO_PLAYER_CHROME)
  )
}

// Carry the unlisted-video privacy hash (?h=…) so private embeds actually play
// instead of showing Vimeo's "this video is private" error.
function buildVimeoSrc(videoId: string, hash?: string | null): string {
  return hash
    ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
    : `https://player.vimeo.com/video/${videoId}`
}

/**
 * The player ALONE, for insertion into the editor's embed container — which is
 * already a sized, `position: relative` box. The aspect-ratio wrapper is for
 * the modal preview only: its `margin: 20px 0` pushed the player down inside
 * the fixed-height container, so a freshly inserted video sat 20px low with its
 * bottom clipped (measured) until a reload rebuilt it. Inserting the bare
 * player makes what you see on insert identical to what persists. #R23-62
 *
 * Returns null if URL is not supported.
 */
export function getVideoPlayerHtml(url: string): string | null {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) {
    return buildPlayerIframe(
      `https://www.youtube.com/embed/${youtubeId}`,
      YOUTUBE_PLAYER_CHROME
    )
  }

  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    return buildPlayerIframe(
      buildVimeoSrc(vimeoId, extractVimeoHash(url)),
      VIMEO_PLAYER_CHROME
    )
  }

  return null
}

/**
 * Get embed HTML for any supported video URL, inside the responsive 16:9 box.
 * Returns null if URL is not supported.
 */
export function getVideoEmbedHtml(url: string): string | null {
  const player = getVideoPlayerHtml(url)
  return player ? wrapInAspectRatioBox(player) : null
}

/**
 * Auto-detect and convert video URLs to embeds in HTML content
 */
export function autoEmbedVideos(html: string): string {
  let result = html

  // Find all link tags with video URLs
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi
  result = result.replace(linkPattern, (match, url) => {
    const embedHtml = getVideoEmbedHtml(url)
    if (embedHtml) {
      return embedHtml
    }
    return match
  })

  // Find standalone video URLs (not in links)
  const youtubePattern = /(?:^|\s)(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11}))(?:\s|$)/g
  result = result.replace(youtubePattern, (_match, _url, videoId) => {
    return getYouTubeEmbedHtml(videoId)
  })

  const vimeoPattern = /(?:^|\s)(https?:\/\/(?:www\.)?vimeo\.com\/(\d+))(?:\s|$)/g
  result = result.replace(vimeoPattern, (_match, _url, videoId) => {
    return getVimeoEmbedHtml(videoId)
  })

  return result
}
