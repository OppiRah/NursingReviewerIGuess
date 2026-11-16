import { describe, expect, it } from 'vitest';
import { isHeading, normalizeLines } from '../../src/domain/normalize';
import { parseReviewer } from '../../src/domain/parser';
import artifacts from '../../e2e/fixtures/pdf-artifacts.txt?raw';

const texts = (s: string): string[] => normalizeLines(s).map((l) => l.text);

describe('normalizeLines: character clean-up', () => {
  it('strips form feeds, zero-width characters, BOM and soft hyphens', () => {
    expect(texts('\fd. Loss of sample')).toEqual(['', 'd. Loss of sample']);
    expect(texts('﻿a​b‌c‍d⁠e­f')).toEqual(['abcdef']);
  });

  it('a form feed in the middle of a line splits it, both halves keep the original line number', () => {
    expect(normalizeLines('one\nend of page\fnext page')).toEqual([
      { text: 'one', line: 1 },
      { text: 'end of page', line: 2 },
      { text: 'next page', line: 2 },
    ]);
  });

  it('converts NBSP to a space and trims trailing whitespace', () => {
    expect(texts('a. Sample choice   \t')).toEqual(['a. Sample choice']);
  });

  it('normalizes CRLF and CR line endings', () => {
    expect(texts('one\r\ntwo\rthree')).toEqual(['one', 'two', 'three']);
  });

  it('removes bullet glyphs at line starts', () => {
    expect(texts('• a. first\n● b. second\n◦ c. third\nnot • inside')).toEqual(['a. first', 'b. second', 'c. third', 'not • inside']);
  });
});

describe('normalizeLines: separators', () => {
  it('splits a separator glued to the next question number', () => {
    expect(normalizeLines('--2. A sample nurse question?')).toEqual([
      { text: '---', line: 1, glued: '--2. A sample nurse question?' },
      { text: '2. A sample nurse question?', line: 1 },
    ]);
    expect(texts('---12) Which sample?')).toEqual(['---', '12) Which sample?']);
    expect(texts('-- 7. Spaced sample?')).toEqual(['---', '7. Spaced sample?']);
  });

  it('does not treat a lone "--" or prose dashes as a separator', () => {
    expect(texts('--')).toEqual(['--']);
    expect(texts('--not a question')).toEqual(['--not a question']);
  });

  it('treats lines of — or – (3 or more) as separators; underscore lines are left for the parser', () => {
    expect(texts('———\n–––\n____\n——')).toEqual(['---', '---', '____', '——']);
  });

  it('keeps separators that sit on their own line with surrounding whitespace', () => {
    expect(texts('   ---   ')).toEqual(['---']);
  });
});

describe('isHeading', () => {
  it.each(['CHAPTER 3', 'Chapter IV: Sample', 'SECTION 1: Sample Fundamentals', 'Unit 2 – Sample', 'Topic: Sample care', 'PART II'])(
    '%s is a heading',
    (s) => expect(isHeading(s)).toBe(true),
  );
  it.each(['Part 2 of the sample cell is affected', 'section of the sample heart', 'Chapters are long', 'Unit dose sample'])(
    '%s is prose',
    (s) => expect(isHeading(s)).toBe(false),
  );
});

const block = (n: number, sep = '---'): string =>
  `${n}. Sample question ${n}?\na. Sample a\nb. Sample b\nc. Sample c\nAnswer: ${'abc'[n % 3]}\nRationale: Sample rationale ${n}.\n${sep}\n`;

describe('parseReviewer: PDF-extraction artifacts', () => {
  it('reads separators glued to the next question (the real-world failure)', () => {
    const glued = [1, 2, 3, 4, 5].map((n) => `${n === 1 ? '' : '--'}${n}. Sample question ${n}?\na. x\nb. y\nAnswer: a\nRationale: r${n}`).join('\n');
    const r = parseReviewer(glued);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(5);
    expect(r.items.map((i) => i.rationale)).toEqual(['r1', 'r2', 'r3', 'r4', 'r5']);
    expect(r.items[1]?.line).toBe(6); // the glued line keeps its original line number
  });

  it('recognizes a choice line that starts with a form feed', () => {
    const r = parseReviewer('1. Sample?\na. x\nb. y\nc. z\n\fd. Loss of sample\nAnswer: d\nRationale: r');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.choices).toEqual(['x', 'y', 'z', 'Loss of sample']);
  });

  it('parses the synthetic artifacts fixture: 30 items, 0 errors, one heading summary', () => {
    const r = parseReviewer(artifacts);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(30);
    expect(r.title).toBe('CHAPTER 1: SAMPLE FUNDAMENTALS');
    expect(r.warnings.filter((w) => /heading/.test(w.message)).map((w) => w.message)).toEqual(['3 heading lines ignored (lines 1, 74, 145).']);
    expect(r.items[4]?.question).toBe('Sample question 5: a sample infection with E. coli was found. Which sample action is first?');
    expect(r.items[8]?.choices[1]).toBe('Sample option B caused by C. diff toxin in the sample');
    expect(r.items[8]?.choices).toHaveLength(4);
  });
});

describe('parseReviewer: recovery and error isolation', () => {
  it('recovers questions from a merged block instead of rejecting it', () => {
    // "2.A …" has no space after the number, so it is not seen as a question until recovery.
    const text = '1. Sample one?\na. x\nb. y\nAnswer: a\nRationale: r1\n2.A sample nurse question two?\na. x\nb. y\nAnswer: b\nRationale: r2';
    const r = parseReviewer(text);
    expect(r.errors).toEqual([]);
    expect(r.items.map((i) => i.question)).toEqual(['Sample one?', 'A sample nurse question two?']);
    expect(r.items[1]).toMatchObject({ answer: [1], line: 6 });
    expect(r.warnings.map((w) => w.message)).toContain('Recovered 1 question from a merged block near line 1.');
  });

  it('recovers several merged questions in one block', () => {
    const merged = [1, 2, 3, 4].map((n) => `${n === 1 ? '' : 'x'}${n}.Sample q${n}?\na. x\nb. y\nAnswer: b\nRationale: r${n}`).join('\n').replace(/x(\d)\./g, '$1.');
    const r = parseReviewer(`1. ${merged.slice(3)}`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(4);
    expect(r.warnings.map((w) => w.message)).toContain('Recovered 3 questions from a merged block near line 1.');
  });

  it('reports "more than one Answer:" when no question line can be found to split at', () => {
    const r = parseReviewer('1. Sample?\na. x\nb. y\nAnswer: a\nRationale: r\nAnswer: b');
    expect(r.items).toHaveLength(0);
    expect(r.errors.map((e) => e.message).join(' ')).toMatch(/more than one "Answer:"/);
  });

  it('one broken block in the middle of 50 valid ones gives 49 items and 1 error', () => {
    const parts = Array.from({ length: 50 }, (_, i) => block(i + 1));
    parts[24] = parts[24]!.replace(/Answer: .\n/, ''); // question 25 loses its Answer: line
    const r = parseReviewer(parts.join(''));
    expect(r.items).toHaveLength(49);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.message).toMatch(/Question at line 169: missing "Answer:"/);
  });

  it('a broken glued block does not take the blocks after it down', () => {
    const r = parseReviewer('1. Good?\na. x\nb. y\nAnswer: a\nRationale: r\n--2. Broken, no choices\nAnswer: a\nRationale: r\n--3. Good too?\na. x\nb. y\nAnswer: b\nRationale: r');
    expect(r.items.map((i) => i.question)).toEqual(['Good?', 'Good too?']);
    // Every problem is attributed to the broken question (line 6), none to the one after it.
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.every((e) => e.message.startsWith('Question at line 6'))).toBe(true);
  });
});

describe('parseReviewer: review findings (BUILD-005 fresh-eyes review)', () => {
  it('#1 a wrapped decimal ("1.5 units") is never taken as a recovered question start', () => {
    const r = parseReviewer('1. Q?\na. x\nb. y\nAnswer: a\nRationale: r1\n2.A client receiving heparin at\n1.5 units per kg. What?\na. p\nb. q\nAnswer: b');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.rationale).toBe('r1');
    expect(r.items[1]).toMatchObject({ question: 'A client receiving heparin at 1.5 units per kg. What?', line: 6 });
  });

  it('#2 recovery is linear: 40,000 junk lines inside one merged block parse quickly', () => {
    const junk = Array.from({ length: 40_000 }, () => '1.x').join('\n');
    const t0 = performance.now();
    parseReviewer(`1. Q\na. x\nb. y\nAnswer: a\n${junk}\nAnswer: b`);
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it('#5 "2.A nurse…" (space lost) starts a question after a separator when choices follow', () => {
    for (const sep of ['---\n2.A nurse asks?', '--2.A nurse asks?']) {
      const r = parseReviewer(`1. Q?\na. x\nb. y\nAnswer: a\nRationale: r\n${sep}\na. p\nb. q\nAnswer: b\nRationale: r2`);
      expect(r.errors).toEqual([]);
      expect(r.items.map((i) => i.question)).toEqual(['Q?', 'A nurse asks?']);
    }
  });

  it('#6 "--5. mg is too high" inside a rationale stays rationale text', () => {
    const r = parseReviewer('1. Sample dose?\na. x\nb. y\nAnswer: a\nRationale: a dose of\n--5. mg is too high\n--2. Next sample?\na. p\nb. q\nAnswer: b\nRationale: r2');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.rationale).toBe('a dose of --5. mg is too high');
    expect(r.items[1]?.question).toBe('Next sample?');
  });

  it('#7 an underscore line inside an unanswered question is a blank; between questions a separator', () => {
    const r = parseReviewer('1. The sample organ is the\n______\nof the body?\na. x\nb. y\nAnswer: a\nRationale: r\n______\n2. Next?\na. p\nb. q\nAnswer: b\nRationale: r2');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.question).toBe('The sample organ is the ______ of the body?');
    expect(r.items).toHaveLength(2);
  });
});

describe('parseReviewer: headings', () => {
  it('ignores chapter/section headings with a single summary warning and suggests the first as title', () => {
    const heads = Array.from({ length: 12 }, (_, i) => (i % 2 ? `SECTION ${i}: Sample` : `CHAPTER ${i}`));
    const text = heads.map((h, i) => `${h}\n${block(i + 1)}`).join('');
    const r = parseReviewer(text);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(12);
    expect(r.warnings.map((w) => w.message)).toEqual(['12 heading lines ignored (lines 1, 9, 17, 25, 33, 41, 49, 57, 65, 73, …).']);
    expect(r.title).toBe('CHAPTER 0');
  });

  it('inside a question, only ALL-CAPS headings are dropped; wrapped prose is kept (review #4)', () => {
    const r = parseReviewer('1. Sample?\na. x\nb. y\nAnswer: a\nRationale: transfer to\nUnit 2 ICU is required.');
    expect(r.items[0]?.rationale).toBe('transfer to Unit 2 ICU is required.');
    const q = parseReviewer('1. A sample\ntopic: insulin. Which first?\na. x\nb. y\nAnswer: a\nRationale: r');
    expect(q.items[0]?.question).toBe('A sample topic: insulin. Which first?');
    expect(q.warnings).toEqual([]);
  });

  it('a heading after a rationale is not glued into the rationale', () => {
    const r = parseReviewer(`${block(1, '')}CHAPTER 2: Sample\n${block(2)}`);
    expect(r.items[0]?.rationale).toBe('Sample rationale 1.');
  });

  it('a "#" title still wins over chapter headings', () => {
    expect(parseReviewer(`# My deck\nCHAPTER 1\n${block(1)}`).title).toBe('My deck');
  });
});

describe('parseReviewer: wrapped abbreviations (C. diff / E. coli)', () => {
  it('"C. diff" exactly where choice c would go stays part of choice b (lowercase style)', () => {
    const r = parseReviewer('1. Sample?\na. Sample one\nb. Infection with\nC. diff toxin\nc. Sample three\nAnswer: b\nRationale: r');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.choices).toEqual(['Sample one', 'Infection with C. diff toxin', 'Sample three']);
  });

  it('"C. diff" at choice c stays text even when choices use capital letters', () => {
    const r = parseReviewer('1. Sample?\nA. Sample one\nB. Infection with\nC. diff toxin\nC. Sample three\nAnswer: B\nRationale: r');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.choices).toEqual(['Sample one', 'Infection with C. diff toxin', 'Sample three']);
  });

  it('"E. coli" wrapped in the question is never the first choice', () => {
    const r = parseReviewer('1. A sample culture grew\nE. coli. What is first?\na. x\nb. y\nAnswer: a\nRationale: r');
    expect(r.items[0]?.question).toBe('A sample culture grew E. coli. What is first?');
    expect(r.items[0]?.choices).toEqual(['x', 'y']);
  });

  it('a capital letter after Answer: is never read as a choice', () => {
    const r = parseReviewer('1. Sample?\nA. x\nB. y\nAnswer: A\nRationale: Sample text that mentions\nC. Sample word at a line start');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.choices).toEqual(['x', 'y']);
    expect(r.items[0]?.rationale).toBe('Sample text that mentions C. Sample word at a line start');
  });

  it('capital choices in sequence still parse as choices', () => {
    const r = parseReviewer('1. Sample?\nA. one\nB. two\nC. three\nD. four\nAnswer: D\nRationale: r');
    expect(r.items[0]?.choices).toEqual(['one', 'two', 'three', 'four']);
    expect(r.items[0]?.answer).toEqual([3]);
  });
});
