import { describe, expect, it } from 'vitest';
import { useHtmlSanitizer } from '../useHtmlSanitizer';

describe('paragraph continuity in inline clipboard fragments', () => {
  const { sanitizeHtml } = useHtmlSanitizer();

  it('keeps words, inline emphasis and punctuation in one paragraph', () => {
    expect(sanitizeHtml('That evening, she wrote <em>back</em>.')).toBe('<p>That evening, she wrote <em>back</em>.</p>');
  });

  it('keeps spaces between formatted phrases and explicit line breaks', () => {
    expect(sanitizeHtml('<strong>Stay</strong> <em>close</em><br>to the shore.')).toBe('<p><strong>Stay</strong> <em>close</em><br>to the shore.</p>');
  });

  it('never joins inline runs across an existing block', () => {
    expect(sanitizeHtml('First <em>thought</em>.<h2>Next</h2>Another <strong>thought</strong>.'))
      .toBe('<p>First <em>thought</em>.</p><h2>Next</h2><p>Another <strong>thought</strong>.</p>');
  });

  it('keeps filtering unsafe markup and stays stable when sanitized again', () => {
    const result = sanitizeHtml('Keep <em onclick="alert(1)">this</em> <script>alert(1)</script>sentence.');
    expect(result).toBe('<p>Keep <em>this</em> sentence.</p>');
    expect(sanitizeHtml(result)).toBe(result);
  });

  it('keeps inline paste fragments and their boundary spaces in the current paragraph', () => {
    expect(sanitizeHtml(' a <em>quieter</em> ending ', { fragment: true }))
      .toBe(' a <em>quieter</em> ending ');
  });

  it('sanitizes fragments without flattening intentional block structure', () => {
    expect(sanitizeHtml('<p>First <em onclick="alert(1)">thought</em>.</p><p>Next.</p><script>alert(1)</script>', { fragment: true }))
      .toBe('<p>First <em>thought</em>.</p><p>Next.</p>');
  });
});
