import { describe, expect, it } from 'vitest';
import { fileKind } from '../../src/import/kinds';
import { runsToText, visibleChars, type TextRun } from '../../src/import/pdfLines';

const run = (str: string, x: number, y: number, width = str.length * 5, height = 10): TextRun => ({ str, x, y, width, height });

describe('runsToText (PDF text runs → lines)', () => {
  it('orders lines top to bottom and runs left to right', () => {
    const text = runsToText([run('b. second', 50, 680), run('1. Sample?', 50, 700), run('a. first', 50, 690)]);
    expect(text).toBe('1. Sample?\na. first\nb. second');
  });

  it('joins runs on the same baseline, adding a space only for visible gaps', () => {
    const text = runsToText([run('Answer:', 50, 700, 35), run('b', 90, 700, 5), run('Sam', 50, 680, 15), run('ple', 65, 680, 15)]);
    expect(text).toBe('Answer: b\nSample');
  });

  it('keeps runs with a slightly different baseline (superscripts) on one line', () => {
    expect(runsToText([run('x', 50, 700, 5), run('2', 56, 703, 5, 6)])).toBe('x 2');
  });

  it('ignores empty runs and returns "" for an empty page', () => {
    expect(runsToText([])).toBe('');
    expect(runsToText([run('', 0, 0)])).toBe('');
  });

  it('counts visible characters for scanned-page detection', () => {
    expect(visibleChars('  a b\n c  ')).toBe(3);
  });
});

describe('fileKind', () => {
  it.each([
    [{ name: 'Reviewer.PDF', type: '' }, 'pdf'],
    [{ name: 'x', type: 'application/pdf' }, 'pdf'],
    [{ name: 'notes.docx', type: '' }, 'docx'],
    [{ name: 'notes.txt', type: '' }, 'text'],
    [{ name: 'notes.md', type: '' }, 'text'],
    [{ name: 'old.doc', type: 'application/msword' }, 'unsupported'],
    [{ name: 'slides.pptx', type: '' }, 'unsupported'],
  ])('%j → %s', (f, kind) => expect(fileKind(f)).toBe(kind));
});
