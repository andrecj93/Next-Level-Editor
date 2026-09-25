import { afterEach, describe, expect, it, vi } from 'vitest';
import { readClipboardData } from '../clipboard';

const clipboard = (value: unknown) => Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
const item = (entries: Record<string, string | Blob>) => ({
  types: Object.keys(entries),
  getType: vi.fn(async (type: string) => typeof entries[type] === 'string' ? new Blob([entries[type]], { type }) : entries[type]),
});
afterEach(() => {
  delete (navigator as unknown as { clipboard?: unknown }).clipboard;
  vi.restoreAllMocks();
});

describe('rich clipboard reads', () => {
  it('retains HTML and plain text from the same clipboard item', async () => {
    clipboard({ read: vi.fn(async () => [item({ 'text/html': '<p>Keep <em>this</em>.</p>', 'text/plain': 'Keep this.' })]) });
    const data = (await readClipboardData())!;
    expect(data.getData('text/html')).toBe('<p>Keep <em>this</em>.</p>');
    expect(data.getData('text/plain')).toBe('Keep this.');
  });

  it('preserves the image fallback beside rich HTML', async () => {
    clipboard({ read: vi.fn(async () => [item({ 'text/html': '<img src="file://clipboard">', 'image/png': new Blob(['image'], { type: 'image/png' }) })]) });
    const data = (await readClipboardData())!;
    expect(data.files).toHaveLength(1);
    expect(data.files[0].type).toBe('image/png');
    expect(await data.files[0].text()).toBe('image');
    expect(data.getData('text/html')).toContain('<img');
  });

  it('uses plain text only when the rich read API is absent', async () => {
    clipboard({ readText: vi.fn(async () => '<strong>literal</strong>') });
    const data = (await readClipboardData())!;
    expect(data.getData('text/plain')).toBe('<strong>literal</strong>');
    expect(data.getData('text/html')).toBe('');
  });

  it('does not prompt again for a lossy fallback after a denied read', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const readText = vi.fn();
    clipboard({ read: vi.fn(async () => { throw new DOMException('Denied', 'NotAllowedError'); }), readText });
    expect(await readClipboardData()).toBeNull();
    expect(readText).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[NextLevelEditor] Clipboard read unavailable', { reason: 'NotAllowedError' });
  });

  it('skips unsupported items without mixing independent clipboard entries', async () => {
    clipboard({ read: vi.fn(async () => [item({ 'application/custom': 'ignored' }), item({ 'text/plain': 'First' }), item({ 'text/plain': 'Second' })]) });
    expect((await readClipboardData())!.getData('text/plain')).toBe('First');
  });

  it('returns an empty transfer for an empty clipboard and null for missing APIs', async () => {
    clipboard({ read: vi.fn(async () => []) });
    expect((await readClipboardData())!.types).toHaveLength(0);
    clipboard(undefined);
    expect(await readClipboardData()).toBeNull();
  });
});
