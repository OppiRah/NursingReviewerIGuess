/**
 * On-device text extraction from PDF and DOCX files (BUILD-005).
 * Both libraries are loaded lazily (only when a student picks such a file) and run entirely in the
 * browser: no upload, no server, no remote workers or fonts. The pdf.js worker is bundled locally.
 * Output is plain text only; mammoth's HTML output is never used.
 */
import { FriendlyImportError, MAX_PDF_PAGES } from './kinds';
import { MIN_PAGE_CHARS, classifyPdf, pageStats, removeUnreadable, runsToText, visibleChars, type PageTextStats, type PdfTextStatus, type TextRun } from './pdfLines';
import { checkZip, zipProblemMessage } from './zipGuard';

export interface PdfExtract {
  text: string;
  pages: number;
  pagesRead: number;
  /** Pages with almost no text (likely images or slides). */
  emptyPages: number;
  /** ok, or why the text can't be used: no text at all (scanned) vs text that can't be mapped (unreadable). */
  status: PdfTextStatus;
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
    const stats: PageTextStats[] = [];
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
      stats.push(pageStats(runs));
      const text = removeUnreadable(runsToText(runs));
      if (visibleChars(text) < MIN_PAGE_CHARS) emptyPages++;
      pageTexts.push(text);
      page.cleanup();
    }
    const text = pageTexts.join('\n');
    return { text, pages: total, pagesRead, emptyPages, status: classifyPdf(stats) };
  } finally {
    await task.destroy();
  }
}

export async function extractDocx(data: ArrayBuffer): Promise<string> {
  // Zip-bomb guard: check the ZIP directory before mammoth inflates anything.
  const zip = checkZip(data);
  if (!zip.ok) throw new FriendlyImportError(zipProblemMessage(zip.reason));
  const mammoth = await import('mammoth');
  const lib = (mammoth as unknown as { default?: typeof mammoth }).default ?? mammoth;
  const result = await lib.extractRawText({ arrayBuffer: data });
  return result.value;
}
