import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFindHighlights } from '../findHighlights';

afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });
const rangeIn = (text: string) => {
  const root = document.createElement('p');
  root.textContent = text;
  document.body.appendChild(root);
  const range = document.createRange();
  range.selectNodeContents(root);
  return { root, range };
};

describe('find highlights', () => {
  it('paints ranges without changing HTML and keeps independent editors intact', () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set<Range> { priority = 0; });
    const one = rangeIn('Celia');
    const two = rangeIn('Mara');
    const first = createFindHighlights();
    const second = createFindHighlights();
    const html = document.body.innerHTML;
    first.update(one.root, [one.range], 0);
    second.update(two.root, [two.range], 0);
    expect(registry.get('nle-find-matches').size).toBe(2);
    expect(registry.get('nle-find-current').priority).toBe(1);
    first.clear();
    expect([...registry.get('nle-find-current')]).toEqual([two.range]);
    second.clear();
    expect(registry.size).toBe(0);
    expect(document.body.innerHTML).toBe(html);
  });

  it('does not delete a registry entry replaced by another owner', () => {
    const registry = new Map();
    vi.stubGlobal('CSS', { highlights: registry });
    vi.stubGlobal('Highlight', class extends Set<Range> { priority = 0; });
    const { root, range } = rangeIn('Celia');
    const highlights = createFindHighlights();
    highlights.update(root, [range], 0);
    const foreign = new Set();
    registry.set('nle-find-current', foreign);
    highlights.clear();
    expect(registry.get('nle-find-current')).toBe(foreign);
  });

  it('does not mutate prose when the painting API is unavailable', () => {
    vi.stubGlobal('CSS', {});
    vi.stubGlobal('Highlight', undefined);
    const { root, range } = rangeIn('Celia');
    const html = root.outerHTML;
    const highlights = createFindHighlights();
    expect(() => highlights.update(root, [range], 0)).not.toThrow();
    highlights.clear();
    expect(root.outerHTML).toBe(html);
  });
});
