import { afterEach, describe, expect, it, vi } from 'vitest';
import { countWords, splitWords } from '../wordSegmentation';
import { getWordCount, getTextStatistics } from '../commands';
import { useWritingAssistant } from '../../composables/useWritingAssistant';

afterEach(() => vi.restoreAllMocks());
describe('consistent manuscript word boundaries', () => {
  for (const text of ['Chapter One — The Last Bus', 'Don’t stop. Café, nai\u0308ve, co-author.', '日本語の文章です。中文测试。', 'می\u200cروم 👩‍💻 & …', 'foo_bar 3.14']) {
    it(`agrees between the footer and analysis for ${text}`, async () => {
      const html = `<h2>${text}</h2><p>un<strong>believ</strong>able.</p>`;
      const assistant = useWritingAssistant();
      const analysis = (await assistant.analyze(html)).stats;
      expect(getTextStatistics(html)).toEqual({ wordCount: analysis.words, characterCount: analysis.characters });
      expect(countWords(text)).toBe(splitWords(text).length);
    });
  }
  it('does not count punctuation or emoji as words', () => {
    expect(countWords('Chapter One — The Last Bus')).toBe(5);
    expect(countWords('… & — 👩‍💻')).toBe(0);
  });
  it('preserves Unicode words in browsers without Segmenter', () => {
    vi.spyOn(Intl as unknown as { Segmenter: unknown }, 'Segmenter', 'get').mockReturnValue(undefined);
    expect(splitWords('Café nai\u0308ve don’t co-author foo_bar می\u200cروم 👩‍💻')).toEqual(['café', 'nai\u0308ve', 'don’t', 'co', 'author', 'foo_bar', 'می\u200cروم']);
  });
  it('ignores generated and executable text in both surfaces', async () => {
    const html = '<article>One</article><section>Two</section><script>ignored text</script><style>hidden text</style><div class="page-break">Page break</div>';
    expect(getWordCount(html)).toBe(2);
    expect((await useWritingAssistant().analyze(html)).stats.words).toBe(2);
  });
});
