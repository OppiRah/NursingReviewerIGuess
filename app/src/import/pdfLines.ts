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
