import type { PageContext, PdfAdapter, PdfDocument } from '../../shared/adapters';
import { notConfigured } from '../../shared/adapters';
import type { Extraction } from '../../shared/models';

/** PDFs may be dynamic/non-.pdf URLs. Supply verified selectors and URL extraction. */
export const pdfAdapter: PdfAdapter | null = null;

export function readDocuments(document: Document, context: PageContext, adapter = pdfAdapter): Extraction<PdfDocument[]> {
  if (!adapter) return notConfigured('PDF enhancement');
  const root = adapter.locate(document);
  return root ? adapter.read(root, context) : { status: 'unavailable', reason: 'Verified document container is absent.' };
}
