import { describe, it, expect } from "vitest";
import {
  extractYouTubeId,
  isYouTubeUrl,
  getVideoEmbedHtml,
} from "../embed";

/**
 * Two provider-URL gaps found by the round-12 audit:
 *  - YouTube live-stream URLs (/live/<id>) were rejected as invalid.
 *  - Unlisted/private Vimeo URLs carry a required privacy hash
 *    (vimeo.com/<id>/<hash> or ?h=<hash>); it was dropped, so the embed
 *    rendered Vimeo's "private video" error instead of the video.
 */
describe("YouTube live-stream URLs are embeddable", () => {
  it("extracts the id from a /live/ URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ"
    );
    expect(isYouTubeUrl("https://youtube.com/live/dQw4w9WgXcQ")).toBe(true);
  });

  it("embeds a /live/ URL via the normal /embed/ player", () => {
    const html = getVideoEmbedHtml(
      "https://www.youtube.com/live/dQw4w9WgXcQ?feature=share"
    );
    expect(html).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });
});

describe("Vimeo unlisted/private hash is carried into the embed", () => {
  it("appends ?h=<hash> from the /<id>/<hash> URL form", () => {
    const html = getVideoEmbedHtml("https://vimeo.com/76979871/a1b2c3d4e5");
    expect(html).toContain("player.vimeo.com/video/76979871?h=a1b2c3d4e5");
  });

  it("appends ?h=<hash> from the player ?h= URL form", () => {
    const html = getVideoEmbedHtml(
      "https://player.vimeo.com/video/76979871?h=a1b2c3d4e5"
    );
    expect(html).toContain("player.vimeo.com/video/76979871?h=a1b2c3d4e5");
  });

  it("leaves a public Vimeo URL without a stray ?h=", () => {
    const html = getVideoEmbedHtml("https://vimeo.com/76979871");
    expect(html).toContain("player.vimeo.com/video/76979871");
    expect(html).not.toContain("?h=");
  });
});
