/**
 * On-device text extraction from PDF and DOCX files (BUILD-005).
 * Both libraries are loaded lazily (only when a student picks such a file) and run entirely in the
 * browser: no upload, no server, no remote workers or fonts. The pdf.js worker is bundled locally.
 * Output is plain text only; mammoth's HTML output is never used.
 */
import { MAX_PDF_PAGES } from './kinds';
import { MIN_PAGE_CHARS, runsToText, visibleChars, type TextRun } from './pdfLines';

export interface PdfExtract {
  text: string;
  pages: number;
  pagesRead: number;
  /** Pages with almost no text (likely images or slides). */
  emptyPages: number;
  /** Most of the document has no readable text: probably a scan. */
  scanned: boolean;
}

export async function extractPdf(data: ArrayBuffer, onProgress?: (page: number, total: number) => void): Promise<PdfExtract> {
  // Legacy build: supports older iOS Safari versions than the modern build.
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true, // text only; never load fonts into the page
    useSystemFonts: false,
    useWasm: false, // no WebAssembly fetches (text extraction doesn't need image decoders)
    useWorkerFetch: false, // the worker never fetches anything (no cMaps or standard fonts from a URL)
    enableXfa: false,
    stopAtErrors: false,
  });
  const doc = await task.promise;

  try {
    const total = doc.numPages;
    const pagesRead = Math.min(total, MAX_PDF_PAGES);
    const pageTexts: string[] = [];
    let emptyPages = 0;
    for (let p = 1; p <= pagesRead; p++) {
      onProgress?.(p, pagesRead);
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const runs: TextRun[] = [];
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const t = item.transform as number[];
        runs.push({ str: item.str, x: t[4] ?? 0, y: t[5] ?? 0, width: item.width, height: item.height || Math.abs(t[3] ?? 0) });
      }
      const text = runsToText(runs);
      if (visibleChars(text) < MIN_PAGE_CHARS) emptyPages++;
      pageTexts.push(text);
      page.cleanup();
    }
    const text = pageTexts.join('\n');
    return { text, pages: total, pagesRead, emptyPages, scanned: pagesRead > 0 && emptyPages / pagesRead > 0.5 };
  } finally {
    await task.destroy();
  }
}

export async function extractDocx(data: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  const lib = (mammoth as unknown as { default?: typeof mammoth }).default ?? mammoth;
  const result = await lib.extractRawText({ arrayBuffer: data });
  return result.value;
}
