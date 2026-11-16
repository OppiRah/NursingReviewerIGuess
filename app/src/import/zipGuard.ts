/**
 * Zip-bomb guard for .docx files (BUILD-006). A .docx is a ZIP; before handing it to mammoth we read
 * the ZIP central directory (DataView only, no dependencies) and refuse files that would expand too far.
 * Pure function, unit-tested with crafted headers.
 *
 * Limitation: sizes in the central directory are self-reported. A crafted file that UNDER-states them
 * passes this check, and the unzip library then inflates the real data. The damage is limited to the
 * student's own tab (a file they chose), but this is a guard against accidents and naive bombs, not a
 * hard bound on memory.
 */

export const MAX_DOCX_UNCOMPRESSED = 50 * 1024 * 1024;
export const MAX_COMPRESSION_RATIO = 100;

const EOCD_SIG = 0x06054b50; // end of central directory
const CDH_SIG = 0x02014b50; // central directory file header
const EOCD_MIN = 22;
const MAX_COMMENT = 0xffff;

export type ZipCheck =
  | { ok: true; entries: number; uncompressed: number }
  | { ok: false; reason: 'not-zip' | 'zip64' | 'too-large' | 'ratio'; uncompressed?: number };

export function checkZip(buf: ArrayBuffer): ZipCheck {
  const n = buf.byteLength;
  if (n < EOCD_MIN) return { ok: false, reason: 'not-zip' };
  const v = new DataView(buf);

  // The end-of-central-directory record sits at the end, after an optional comment of up to 64 KB.
  let eocd = -1;
  for (let i = n - EOCD_MIN; i >= Math.max(0, n - EOCD_MIN - MAX_COMMENT); i--) {
    if (v.getUint32(i, true) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { ok: false, reason: 'not-zip' };

  const entries = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  const cdOffset = v.getUint32(eocd + 16, true);
  // ZIP64 markers: a .docx never needs them; treat as too large to read safely.
  if (entries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) return { ok: false, reason: 'zip64' };
  if (cdOffset + cdSize > n) return { ok: false, reason: 'not-zip' };

  // Walk headers the way the unzip library does (while the signature matches), not just `entries`
  // times: a lying entry count must not hide extra entries from the guard.
  const cdEnd = cdOffset + cdSize;
  let p = cdOffset;
  let found = 0;
  let uncompressed = 0;
  while (p + 4 <= n && v.getUint32(p, true) === CDH_SIG) {
    if (p + 46 > n) return { ok: false, reason: 'not-zip' };
    const size = v.getUint32(p + 24, true);
    if (size === 0xffffffff) return { ok: false, reason: 'zip64' };
    uncompressed += size;
    found++;
    if (uncompressed > MAX_DOCX_UNCOMPRESSED) return { ok: false, reason: 'too-large', uncompressed };
    p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
  }
  if (found !== entries || p !== cdEnd) return { ok: false, reason: 'not-zip' };
  if (uncompressed / n > MAX_COMPRESSION_RATIO) return { ok: false, reason: 'ratio', uncompressed };
  return { ok: true, entries, uncompressed };
}

export function zipProblemMessage(reason: Exclude<ZipCheck, { ok: true }>['reason']): string {
  return reason === 'not-zip'
    ? "That doesn't look like a Word (.docx) file. If it is an older .doc file, save it as .docx first."
    : 'This Word file expands to more than 50 MB inside, which is too big to read on a phone. Split it into smaller files, or copy the text and paste it instead.';
}
