/**
 * Rebuild readable lines from PDF text items (BUILD-005). Pure, so it is unit-tested without pdf.js.
 * PDF text has no lines, only positioned runs. Runs whose baselines are close together form one
 * line; lines are ordered top to bottom, runs left to right. Choices therefore stay on their own lines.
 */

export interface TextRun {
  str: string;
  /** Left edge, PDF units. */
  x: number;
  /** Baseline, PDF units (larger = higher on the page). */
  y: number;
  width: number;
  /** Font height, PDF units; used for tolerances. */
  height: number;
}

export function runsToText(runs: TextRun[]): string {
  const items = runs.filter((r) => r.str.length > 0);
  if (items.length === 0) return '';

  // Group runs into lines by baseline. Tolerance scales with the font size (sub/superscripts stay in line).
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextRun[][] = [];
  for (const run of sorted) {
    const current = lines[lines.length - 1];
    const ref = current?.[0];
    const tolerance = Math.max(2, (ref?.height || run.height || 10) * 0.5);
    if (current && ref && Math.abs(ref.y - run.y) <= tolerance) current.push(run);
    else lines.push([run]);
  }

  return lines
    .map((line) => {
      const ordered = line.sort((a, b) => a.x - b.x);
      let out = '';
      let end = -Infinity;
      for (const r of ordered) {
        const gap = r.x - end;
        const fontSize = r.height || 10;
        // Insert a space when runs are visibly apart and neither side already has one.
        if (out && gap > fontSize * 0.15 && !/\s$/.test(out) && !/^\s/.test(r.str)) out += ' ';
        out += r.str;
        end = r.x + r.width;
      }
      return out.trimEnd();
    })
    .join('\n');
}

/** Characters of real text on a page, ignoring whitespace. */
export function visibleChars(text: string): number {
  return text.replace(/\s+/g, '').length;
}

/** A page with fewer visible characters than this is treated as an image/scan. */
export const MIN_PAGE_CHARS = 20;

// ---------- "Scanned" vs "unreadable" (BUILD-006) ----------

/**
 * Characters pdf.js returns when a font has no usable text mapping (no ToUnicode, CID fonts without
 * cMaps): the replacement character, private-use code points and C0 control characters.
 */
const UNREADABLE = new RegExp(
  `[${String.fromCharCode(0xfffd)}${String.fromCharCode(0xe000)}-${String.fromCharCode(0xf8ff)}\x00-\x08\x0B\x0C\x0E-\x1F]`,
  'g',
);

export interface PageTextStats {
  /** Visible characters that map to real text. */
  readableChars: number;
  /** Characters that came out as replacement/private-use/control characters. */
  unreadableChars: number;
  /** Drawn text runs (non-zero width) that produced no characters at all. */
  emptyGlyphRuns: number;
}

export function removeUnreadable(text: string): string {
  return text.replace(UNREADABLE, '');
}

export function pageStats(runs: Pick<TextRun, 'str' | 'width'>[]): PageTextStats {
  let readableChars = 0;
  let unreadableChars = 0;
  let emptyGlyphRuns = 0;
  for (const r of runs) {
    if (r.str === '') {
      if (r.width > 0) emptyGlyphRuns++;
      continue;
    }
    const bad = r.str.match(UNREADABLE)?.length ?? 0;
    unreadableChars += bad;
    readableChars += visibleChars(removeUnreadable(r.str));
  }
  return { readableChars, unreadableChars, emptyGlyphRuns };
}

export type PdfTextStatus = 'ok' | 'scanned' | 'unreadable';

/**
 * - ok: at least half the pages have readable text.
 * - unreadable: text is there (runs or characters exist) but can't be mapped to letters → try the Word/Google Doc.
 * - scanned: no text at all, only images → scans or slides.
 */
export function classifyPdf(pages: PageTextStats[]): PdfTextStatus {
  if (pages.length === 0) return 'scanned';
  const readablePages = pages.filter((p) => p.readableChars >= MIN_PAGE_CHARS).length;
  if (readablePages * 2 >= pages.length) return 'ok';
  const garbled = pages.reduce((n, p) => n + p.unreadableChars + p.emptyGlyphRuns, 0);
  return garbled >= MIN_PAGE_CHARS ? 'unreadable' : 'scanned';
}
