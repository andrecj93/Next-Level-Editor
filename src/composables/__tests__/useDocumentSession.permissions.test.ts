import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, shallowRef, type EffectScope } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useDocumentSession } from '../useDocumentSession';
import { createMemoryVersionStore } from '../../utils/versionStore';
import type { DocumentOptions } from '../../types/document';

const scopes: EffectScope[] = [];
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()));

async function fixture() {
  const scope = effectScope();
  scopes.push(scope);
  const store = createMemoryVersionStore();
  const onDiagnostic = vi.fn();
  const options = shallowRef<DocumentOptions>({ id: 'permission-test', store, role: 'author', onDiagnostic });
  const html = ref('<p>Keep this draft.</p>');
  const session = scope.run(() => useDocumentSession({ options, html, apply: value => { html.value = value; }, sanitize: value => value }))!;
  await flushPromises();
  const resume: (() => void)[] = [];
  const persist = store.create.bind(store);
  const create = vi.spyOn(store, 'create').mockImplementation(async (...args) => {
    await new Promise<void>(resolve => resume.push(resolve));
    return persist(...args);
  });
  return { scope, store, options, html, session, resume, create, onDiagnostic };
}

describe('checkpoint authorization and serialization', () => {
  it('serializes three queued checkpoints against successive durable revisions', async () => {
    const f = await fixture();
    const saving = Promise.all(['one', 'two', 'three'].map(label => f.session.checkpoint(label)));
    expect(f.create).toHaveBeenCalledOnce();
    f.resume.shift()!();
    await flushPromises();
    expect(f.create).toHaveBeenCalledTimes(2);
    f.resume.shift()!();
    await flushPromises();
    expect(f.create).toHaveBeenCalledTimes(3);
    f.resume.shift()!();
    await saving;
    expect((await f.store.list('permission-test')).map(v => [v.label, v.revision])).toEqual([['one', 1], ['two', 2], ['three', 3]]);
    expect(f.session.status.value).toBe('saved');
  });

  it('refuses a queued save after its author becomes a viewer', async () => {
    const f = await fixture();
    const saving = Promise.allSettled([f.session.checkpoint('already sent'), f.session.checkpoint('queued')]);
    f.options.value = { ...f.options.value, role: 'viewer' };
    f.resume.shift()!();
    const result = await saving;
    expect(result[0].status).toBe('fulfilled');
    expect(result[1]).toMatchObject({ status: 'rejected', reason: new Error('This document is read-only.') });
    expect(f.create).toHaveBeenCalledOnce();
    expect((await f.store.list('permission-test')).map(v => v.label)).toEqual(['already sent']);
    expect(f.html.value).toBe('<p>Keep this draft.</p>');
    expect(f.onDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      event: 'version.create_denied', documentId: 'permission-test', detail: { reason: 'read_only' },
    }));
    expect(JSON.stringify(f.onDiagnostic.mock.calls)).not.toContain('Keep this draft.');
  });

  it('does not send queued work after unmounting', async () => {
    const f = await fixture();
    const saving = Promise.all([f.session.checkpoint('already sent'), f.session.checkpoint('queued')]);
    f.scope.stop();
    f.resume.shift()!();
    await saving;
    expect(f.create).toHaveBeenCalledOnce();
  });

  it('checks permission before invoking a transaction callback', async () => {
    const f = await fixture();
    f.options.value = { ...f.options.value, role: 'viewer' };
    const change = vi.fn();
    expect(() => f.session.transact(change)).toThrow('read-only');
    expect(change).not.toHaveBeenCalled();
    await expect(f.session.checkpoint()).rejects.toThrow('read-only');
    expect(f.create).not.toHaveBeenCalled();
  });
});
