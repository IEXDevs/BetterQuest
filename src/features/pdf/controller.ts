import type { PdfDocument } from '../../shared/adapters';
import type { Extraction } from '../../shared/models';
import { sourceUrl } from '../../shared/identity';

export interface PdfCapabilities { navigation: boolean; zoom: boolean; viewing: boolean }
export interface PdfBridge {
  capabilities: PdfCapabilities;
  navigate(page: number): Promise<void>;
  zoom(scale: number): Promise<void>;
  view(mode: 'fit-width' | 'original'): Promise<void>;
  dispose(): void;
}

/** Native PDF plugins cannot be controlled by ordinary DOM scripts. No interception. */
export function createPdfController(document: PdfDocument, bridge: PdfBridge | null = null) {
  sourceUrl(document.url);
  let disposed = false;
  async function perform(capability: keyof PdfCapabilities, operation: (bridge: PdfBridge) => Promise<void>): Promise<Extraction<null>> {
    if (disposed) return { status: 'unavailable', reason: 'PDF integration was disposed.' };
    if (!bridge?.capabilities[capability]) return { status: 'unsupported', reason: `No verified PDF ${capability} bridge is configured.` };
    try { await operation(bridge); return { status: 'ready', value: null }; }
    catch (error) { return { status: 'unavailable', reason: error instanceof Error ? error.message : 'PDF operation failed.' }; }
  }
  return {
    capabilities: bridge?.capabilities || { navigation: false, zoom: false, viewing: false },
    navigate: (page: number) => {
      if (!Number.isInteger(page) || page < 1) return Promise.resolve<Extraction<null>>({ status: 'unavailable', reason: 'Page must be a positive integer.' });
      return perform('navigation', bridge => bridge.navigate(page));
    },
    zoom: (scale: number) => {
      if (!Number.isFinite(scale) || scale < 0.25 || scale > 4) return Promise.resolve<Extraction<null>>({ status: 'unavailable', reason: 'Zoom must be between 0.25 and 4.' });
      return perform('zoom', bridge => bridge.zoom(scale));
    },
    view: (mode: 'fit-width' | 'original') => perform('viewing', bridge => bridge.view(mode)),
    openOriginal: () => { if (disposed) throw new Error('PDF integration was disposed.'); return sourceUrl(document.url); },
    dispose: () => { if (!disposed) { disposed = true; bridge?.dispose(); } },
  };
}
