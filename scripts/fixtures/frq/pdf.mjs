// Small, valid PDF with synthetic text/vector content; no real Quest data.
export function assignmentPdf(layout = 'roomy') {
  const pages = [];
  const text = (value, x, y, size = 14) => `BT /F1 ${size} Tf 1 0 0 1 ${x} ${800 - y} Tm (${value.replace(/[\\()]/g, '\\$&')}) Tj ET`;
  for (let first = 1; first <= 21; first += 3) {
    const lines = [];
    for (let q = first; q < first + 3; q++) {
      const top = 50 + (q - first) * 245;
      lines.push(text(`${String(q).padStart(3, '0')} 10.0 points`, 50, top));
      lines.push(text(`Synthetic multiple-choice question ${q}`, 50, top + 35));
      for (let n = 1; n <= 3; n++) lines.push(text(`${n}. Synthetic option ${n}`, 65, top + 70 + n * 35));
    }
    pages.push(lines.join('\n'));
  }
  const lines = [text('022 10.0 points', 50, 50), text('One more synthetic multiple-choice question', 50, 85)];
  for (let n = 1; n <= 3; n++) lines.push(text(`${n}. Synthetic option ${n}`, 65, 100 + n * 35));
  if (layout !== 'no-boundary') lines.push(text('023 10.0 points', 50, 300));
  lines.push(text('Explain the area bounded by these synthetic curves.', 50, 345));
  lines.push(text('f\(x\) = x^3 - x^2 - 2x,   g\(x\) = 4x.', 50, 390, 17));
  if (layout === 'tight' || layout === 'next') {
    const top = layout === 'tight' ? 445 : 600;
    lines.push(`50 ${800 - top + 18} m 550 ${800 - top + 18} l S`);
    lines.push(text('024 10.0 points', 50, top), text('Following question: this content must remain uncovered.', 50, top + 35));
  }
  pages.push(lines.join('\n'));
  const objects = ['', '<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const kids = [];
  for (const stream of pages) {
    const page = objects.length, content = page + 1;
    kids.push(`${page} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids.join(' ')}] >>`;
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  return Buffer.from(`${pdf}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
}
