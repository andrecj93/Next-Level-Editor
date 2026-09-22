import { beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref } from 'vue';
import { useExportActions } from '../useExportActions';
import { exportAsPdf } from '../../utils/export';

vi.mock('../../utils/export', () => ({
  exportAsPdf: vi.fn(), exportAsHtml: vi.fn(), exportAsMarkdown: vi.fn(), exportAsWord: vi.fn(), formatHtml: vi.fn(),
}));

function setup() {
  const element = document.createElement('div');
  element.innerHTML = '<p>The draft stays here.</p>';
  const showToast = vi.fn();
  const actions = useExportActions({ editorContent: ref(element), codeContent: ref(''), showToast, updateCodeContent: vi.fn() });
  return { ...actions, element, showToast };
}

beforeEach(() => vi.resetAllMocks());

describe('PDF export progress and cancellation', () => {
  it('prevents duplicate exports and reports pages until the file is ready', async () => {
    let finish!: () => void;
    vi.mocked(exportAsPdf).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const actions = setup();
    const first = actions.exportPdf();
    expect(actions.isExportingPdf.value).toBe(true);
    await actions.exportPdf();
    expect(exportAsPdf).toHaveBeenCalledTimes(1);
    vi.mocked(exportAsPdf).mock.calls[0][2]?.onProgress?.(4, 12);
    expect(actions.pdfProgress.value).toEqual({ completed: 4, total: 12, cancelling: false });
    expect(actions.showToast).not.toHaveBeenCalled();
    finish();
    await first;
    expect(actions.pdfProgress.value).toBeNull();
    expect(actions.isExportingPdf.value).toBe(false);
    expect(actions.showToast).toHaveBeenCalledWith(expect.stringContaining('downloaded as PDF'), 'success');
  });

  it('cancels without announcing a download or changing the draft and allows retry', async () => {
    let finish!: () => void;
    vi.mocked(exportAsPdf).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const actions = setup();
    const pending = actions.exportPdf();
    actions.cancelPdfExport();
    expect(vi.mocked(exportAsPdf).mock.calls[0][2]?.signal?.aborted).toBe(true);
    expect(actions.pdfProgress.value?.cancelling).toBe(true);
    await actions.exportPdf();
    expect(exportAsPdf).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    expect(actions.element.innerHTML).toBe('<p>The draft stays here.</p>');
    expect(actions.isExportingPdf.value).toBe(false);
    expect(actions.showToast).toHaveBeenCalledExactlyOnceWith('PDF export cancelled. Your document is unchanged.');
    await actions.exportPdf();
    expect(exportAsPdf).toHaveBeenCalledTimes(2);
  });

  it('stops a detached editor export without a late success or error notification', async () => {
    let finish!: () => void;
    vi.mocked(exportAsPdf).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const scope = effectScope();
    const actions = scope.run(setup)!;
    const pending = actions.exportPdf();
    scope.stop();
    expect(vi.mocked(exportAsPdf).mock.calls[0][2]?.signal?.aborted).toBe(true);
    finish();
    await pending;
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(actions.isExportingPdf.value).toBe(false);
  });

  it('clears a failed export so the writer can retry', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(exportAsPdf).mockRejectedValueOnce(new Error('renderer failed'));
    const actions = setup();
    await actions.exportPdf();
    expect(actions.pdfProgress.value).toBeNull();
    expect(actions.showToast).toHaveBeenCalledWith('✗ Failed to export as PDF', 'error');
    await actions.exportPdf();
    expect(exportAsPdf).toHaveBeenCalledTimes(2);
    errors.mockRestore();
  });
});
