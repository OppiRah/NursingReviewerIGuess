// Generates synthetic upload fixtures at test time (BUILD-005). Node built-ins only, no dependencies.
// Used as Playwright's globalSetup. Output: e2e/.generated/ (gitignored). Never uses real reviewers.
//   sample.pdf      text-based PDF, 2 pages, 6 synthetic questions, with PDF-style artifacts
//   scanned.pdf     image-only PDF (a filled shape, no text) for the "scanned" message path
//   sample.docx     Word file, 5 synthetic questions
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'e2e', '.generated');

function question(n, prefix = `${n}. `) {
  const letters = 'abcd';
  return [
    `${prefix}Sample PDF question ${n}: which sample option is right?`,
    ...[0, 1, 2, 3].map((c) => `${letters[c]}. Sample option ${letters[c].toUpperCase()} for question ${n}`),
    `Answer: ${letters[n % 4]}`,
    `Rationale: Sample rationale ${n} (synthetic, not study material).`,
  ];
}

// ---------- PDF ----------
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function buildPdf(pages) {
  const objects = [];
  const add = (body) => objects.push(body) && objects.length;
  const catalog = add('');
  const pagesObj = add('');
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const kids = [];
  for (const page of pages) {
    const content = page.kind === 'text'
      ? `BT /F1 11 Tf 14 TL 50 790 Td ${page.lines.map((l) => `(${esc(l)}) Tj T*`).join(' ')} ET`
      : '0.6 g 60 120 470 600 re f 0.2 g 120 400 200 120 re f';
    const stream = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    const resources = page.kind === 'text' ? `/Resources << /Font << /F1 ${font} 0 R >> >>` : '/Resources << >>';
    kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595 842] ${resources} /Contents ${stream} 0 R >>`));
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// ---------- DOCX (zip, stored entries) ----------
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of files) {
    const data = Buffer.from(content, 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

function buildDocx(lines) {
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body = lines.map((l) => `<w:p><w:r><w:t xml:space="preserve">${xmlEsc(l)}</w:t></w:r></w:p>`).join('');
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body}</w:body></w:document>`],
  ]);
}

export default function globalSetup() {
  mkdirSync(OUT, { recursive: true });

  // Page 1: heading, questions 1–3 with a glued "--N." separator; page 2: questions 4–6.
  const page1 = ['CHAPTER 1: SAMPLE PDF DECK', ...question(1), ...question(2, '--2. '), ...question(3, '--3. ')];
  const page2 = [...question(4, '--4. '), '---', ...question(5), ...question(6, '--6. ')];
  writeFileSync(join(OUT, 'sample.pdf'), buildPdf([{ kind: 'text', lines: page1 }, { kind: 'text', lines: page2 }]));
  writeFileSync(join(OUT, 'scanned.pdf'), buildPdf([{ kind: 'image' }, { kind: 'image' }]));

  const docLines = [1, 2, 3, 4, 5].flatMap((n) => [...question(n).map((l) => l.replace('PDF', 'Word')), '---']);
  writeFileSync(join(OUT, 'sample.docx'), buildDocx(['SECTION 1: Sample Word deck', ...docLines]));
}

// Allow `node scripts/gen-fixtures.mjs` for manual inspection.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) globalSetup();
