import { describe, it, expect } from "vitest";
import { useWritingAssistant } from "../useWritingAssistant";

/**
 * The Speaking Time tooltip states "~130 words per minute", but the default
 * speakingSpeed was 150 — so the displayed time contradicted its own label
 * (150 wpm is a brisk reading pace, not a read-aloud pace). 130 wpm is the
 * standard speaking rate and what the label promises.
 */
describe("useWritingAssistant speaking time uses the advertised 130 wpm", () => {
  const { analyze } = useWritingAssistant();

  it("computes speaking time at 130 wpm, not 150", async () => {
    // 140 words: ceil(140/130)=2, but ceil(140/150)=1 — a discriminating count.
    const content = `<p>${Array.from({ length: 140 }, () => "word").join(" ")}</p>`;
    const result = await analyze(content);
    expect(result.stats.words).toBe(140);
    expect(result.stats.speakingTime).toBe(2);
  });
});
