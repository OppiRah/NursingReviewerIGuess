import { describe, expect, it } from 'vitest';
import { classifyPdf, pageStats, removeUnreadable, type PageTextStats } from '../../src/import/pdfLines';
import { MAX_DOCX_UNCOMPRESSED, checkZip, zipProblemMessage } from '../../src/import/zipGuard';

/**
 * Craft a synthetic ZIP: `entries` central-directory headers with the given uncompressed sizes,
 * `padding` filler bytes standing in for file data, then the end-of-central-directory record.
 * No real compressed data is needed: the guard only reads the directory.
 */
function craftZip(sizes: number[], padding = 1000, opts: { zip64?: boolean; badSig?: boolean } = {}): ArrayBuffer {
  const name = new TextEncoder().encode('word/document.xml');
  const cdLen = sizes.length * (46 + name.length);
  const buf = new ArrayBuffer(padding + cdLen + 22);
  const v = new DataView(buf);
  const bytes = new Uint8Array(buf);
  let p = padding;
  for (const size of sizes) {
    v.setUint32(p, opts.badSig ? 0xdeadbeef : 0x02014b50, true);
    v.setUint32(p + 20, Math.min(size, 0xfffffffe), true); // compressed size (unused by the guard)
    v.setUint32(p + 24, opts.zip64 ? 0xffffffff : size, true);
    v.setUint16(p + 28, name.length, true);
    bytes.set(name, p + 46);
    p += 46 + name.length;
  }
  v.setUint32(p, 0x06054b50, true);
  v.setUint16(p + 8, sizes.length, true);
  v.setUint16(p + 10, sizes.length, true);
  v.setUint32(p + 12, cdLen, true);
  v.setUint32(p + 16, padding, true);
  return buf;
}

describe('checkZip (DOCX zip-bomb guard)', () => {
  it('accepts a normal-looking docx directory', () => {
    const r = checkZip(craftZip([20_000, 3_000, 500], 10_000));
    expect(r).toEqual({ ok: true, entries: 3, uncompressed: 23_500 });
  });

  it('rejects a total uncompressed size over 50 MB', () => {
    const r = checkZip(craftZip([30 * 1024 * 1024, 30 * 1024 * 1024], 2_000_000));
    expect(r).toMatchObject({ ok: false, reason: 'too-large' });
    expect(MAX_DOCX_UNCOMPRESSED).toBe(50 * 1024 * 1024);
  });

  it('rejects a compression ratio over 100:1 even under 50 MB', () => {
    // 40 MB claimed from a ~100 KB file = ~400:1
    expect(checkZip(craftZip([40 * 1024 * 1024], 100_000))).toMatchObject({ ok: false, reason: 'ratio' });
  });

  it('rejects ZIP64 markers and files that are not ZIPs', () => {
    expect(checkZip(craftZip([100], 1000, { zip64: true }))).toMatchObject({ ok: false, reason: 'zip64' });
    expect(checkZip(craftZip([100], 1000, { badSig: true }))).toMatchObject({ ok: false, reason: 'not-zip' });
    expect(checkZip(new TextEncoder().encode('just some text, not a zip file at all').buffer as ArrayBuffer)).toMatchObject({ ok: false, reason: 'not-zip' });
    expect(checkZip(new ArrayBuffer(5))).toMatchObject({ ok: false, reason: 'not-zip' });
  });

  it('gives friendly messages', () => {
    expect(zipProblemMessage('too-large')).toMatch(/more than 50 MB/);
    expect(zipProblemMessage('not-zip')).toMatch(/\.docx/);
  });
});

describe('classifyPdf ("scanned" vs "unreadable")', () => {
  const page = (readableChars: number, unreadableChars = 0, emptyGlyphRuns = 0): PageTextStats => ({ readableChars, unreadableChars, emptyGlyphRuns });

  it('ok when at least half the pages have readable text', () => {
    expect(classifyPdf([page(500), page(0)])).toBe('ok');
  });

  it('scanned only when there is no text at all', () => {
    expect(classifyPdf([page(0), page(3)])).toBe('scanned');
    expect(classifyPdf([])).toBe('scanned');
  });

  it('unreadable when text runs exist but their characters cannot be mapped', () => {
    expect(classifyPdf([page(0, 400), page(2, 300)])).toBe('unreadable');
    expect(classifyPdf([page(0, 0, 120)])).toBe('unreadable');
  });

  it('pageStats counts replacement/private-use characters and empty drawn runs separately', () => {
    const stats = pageStats([
      { str: 'Sample text', width: 50 },
      { str: '�', width: 20 },
      { str: '', width: 12 }, // a drawn glyph run with no characters
      { str: '', width: 0 }, // an end-of-line marker: ignored
      { str: ' ', width: 3 },
    ]);
    expect(stats).toEqual({ readableChars: 10, unreadableChars: 3, emptyGlyphRuns: 1 });
    expect(removeUnreadable('ab�c')).toBe('abc');
  });
});

describe('checkZip review fixes', () => {
  it('#2 an EOCD that under-counts entries cannot hide extra directory entries', () => {
    const buf = craftZip([1000, 40 * 1024 * 1024], 5_000_000);
    const v = new DataView(buf);
    const eocd = buf.byteLength - 22;
    v.setUint16(eocd + 8, 1, true);
    v.setUint16(eocd + 10, 1, true);
    expect(checkZip(buf).ok).toBe(false);
  });

  it('a fake EOCD signature inside the archive comment area is not trusted blindly', () => {
    // EOCD scan picks the LAST signature; a bogus one past the real EOCD with bad offsets fails closed.
    const good = new Uint8Array(craftZip([100], 1000));
    const buf = new ArrayBuffer(good.byteLength + 22);
    new Uint8Array(buf).set(good);
    new DataView(buf).setUint32(good.byteLength, 0x06054b50, true);
    new DataView(buf).setUint32(good.byteLength + 16, 0xfffffff0, true);
    expect(checkZip(buf).ok).toBe(false);
  });
});
