import type { createPdfController, PdfCapabilities } from './controller';

export type PdfIntent =
  | { kind: 'navigate'; page: number }
  | { kind: 'zoom'; scale: number }
  | { kind: 'view'; mode: 'fit-width' | 'original' };

/** Future verified page controls consume this model; no document/UI replacement. */
export function pdfControlAvailability(capabilities: PdfCapabilities) {
  return { navigate: capabilities.navigation, zoom: capabilities.zoom, view: capabilities.viewing };
}

export function applyPdfIntent(controller: ReturnType<typeof createPdfController>, intent: PdfIntent) {
  switch (intent.kind) {
    case 'navigate': return controller.navigate(intent.page);
    case 'zoom': return controller.zoom(intent.scale);
    case 'view': return controller.view(intent.mode);
  }
}
