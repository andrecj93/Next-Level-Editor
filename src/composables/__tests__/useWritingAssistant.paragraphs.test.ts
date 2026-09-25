import { describe, expect, it } from 'vitest';
import { effectScope } from 'vue';
import { useWritingAssistant } from '../useWritingAssistant';

describe('manuscript paragraph statistics', () => {
  it.each([
    ['chapters', '<h1>A book</h1><h2>Chapter one</h2><p>First paragraph.</p><p>Second paragraph.</p>', 2],
    ['only headings', '<h1>A book</h1><h2>Chapter one</h2>', 0],
    ['soft breaks', '<p>First line.<br><br>Another line.</p><p><br></p>', 1],
    ['bare first line', 'First line.<div>Second <em>paragraph</em>.</div>', 2],
    ['nested prose', '<blockquote><p>First.</p><p>Second.</p></blockquote><ul><li>Third.</li><li>Fourth.</li></ul>', 4],
    ['generated content and code', '<p>Actual prose.</p><nav class="table-of-contents"><p>Generated title</p></nav><div class="page-break">Page Break</div><pre>const x = 1;</pre>', 1],
  ])('counts %s consistently in immediate and lazy analysis', async (_name, html, paragraphs) => {
    const scope = effectScope();
    const assistant = scope.run(() => useWritingAssistant())!;
    const immediate = await assistant.analyze(html);
    expect(immediate.stats.paragraphs).toBe(paragraphs);
    assistant.updateContent(html);
    expect(assistant.stats.value?.paragraphs).toBe(paragraphs);
    expect(assistant.stats.value?.words).toBe(assistant.calculateStats(assistant.extractPlainText(html)).words);
    scope.stop();
  });
});
