import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_BYTES, parseAnswerLetters, parseReviewer } from '../../src/domain/parser';

const VALID = `# Sample deck
1. Sample question 1: which color is the sky on a clear day?
a. Green
b. Blue
c. Red
d. Yellow
Answer: b
Rationale: Sample rationale one.
---
2. Sample question 2: which shape has three sides?
a) Square
b) Circle
c) Triangle
Answer: c
Rationale: Sample rationale two.
`;

describe('parseReviewer: valid input', () => {
  it('parses title, items, choices, answer and rationale', () => {
    const r = parseReviewer(VALID);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.title).toBe('Sample deck');
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({
      type: 'mcq',
      question: 'Sample question 1: which color is the sky on a clear day?',
      choices: ['Green', 'Blue', 'Red', 'Yellow'],
      answer: [1],
      rationale: 'Sample rationale one.',
      line: 2,
    });
    expect(r.items[1]).toMatchObject({ choices: ['Square', 'Circle', 'Triangle'], answer: [2], line: 10 });
  });

  it('accepts a. / a) / A. / A) choice markers and blocks without separators', () => {
    const r = parseReviewer(`1. Q one?\nA. x\nB) y\nAnswer: B\nRationale: r\n2) Q two?\na) x\nb. y\nAnswer: a\nRationale: r`);
    expect(r.errors).toEqual([]);
    expect(r.items.map((i) => i.answer)).toEqual([[1], [0]]);
    expect(r.items[0]?.choices).toEqual(['x', 'y']);
  });

  it('joins wrapped question, choice and rationale lines', () => {
    const r = parseReviewer(`1. Sample question that is long\nand wraps onto a second line?\na. first choice\n   continues here\nb. second\nAnswer: a\nRationale: line one\nline two`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({
      question: 'Sample question that is long and wraps onto a second line?',
      choices: ['first choice continues here', 'second'],
      rationale: 'line one line two',
    });
  });

  it('handles CRLF input and a BOM identically to LF', () => {
    const lf = parseReviewer(VALID);
    const crlf = parseReviewer('﻿' + VALID.replace(/\n/g, '\r\n'));
    expect(crlf).toEqual(lf);
  });
});

describe('parseReviewer: malformed input is reported, never dropped', () => {
  it('missing answer is an error with the block line', () => {
    const r = parseReviewer(`1. Q?\na. x\nb. y\nRationale: r`);
    expect(r.items).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ line: 1 });
    expect(r.errors[0]?.message).toMatch(/missing "Answer:"/);
  });

  it('answer outside the choices is an error on the answer line', () => {
    const r = parseReviewer(`1. Q?\na. x\nb. y\nc. z\nAnswer: e\nRationale: r`);
    expect(r.items).toHaveLength(0);
    expect(r.errors[0]).toMatchObject({ line: 5 });
    expect(r.errors[0]?.message).toMatch(/"e" is not one of the choices \(a–c\)/);
  });

  it('fewer than 2 choices is an error', () => {
    const r = parseReviewer(`1. Q?\na. only one\nAnswer: a\nRationale: r`);
    expect(r.items).toHaveLength(0);
    expect(r.errors[0]?.message).toMatch(/at least 2 lettered choices \(found 1\)/);
  });

  it('missing rationale is a warning and the item is kept', () => {
    const r = parseReviewer(`1. Q?\na. x\nb. y\nAnswer: a`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ line: 1 });
    expect(r.warnings[0]?.message).toMatch(/no rationale/);
  });

  it('keeps good blocks and reports the bad one between them', () => {
    const r = parseReviewer(`1. Good?\na. x\nb. y\nAnswer: a\nRationale: r\n2. Bad?\na. x\nb. y\nRationale: r\n3. Good too?\na. x\nb. y\nAnswer: b\nRationale: r`);
    expect(r.items.map((i) => i.line)).toEqual([1, 10]);
    expect(r.errors.map((e) => e.line)).toEqual([6]);
  });

  it('a non-letter answer is an error', () => {
    const r = parseReviewer(`1. Q?\na. x\nb. y\nAnswer: A nurse would do x\nRationale: r`);
    expect(r.items).toHaveLength(0);
    expect(r.errors[0]?.message).toMatch(/should be a choice letter/);
  });

  it('out-of-order choice letters are an error', () => {
    const r = parseReviewer(`1. Q?\na. x\nc. y\nAnswer: a\nRationale: r`);
    expect(r.errors[0]?.message).toMatch(/lettered a, b, c/);
    expect(r.errors[0]?.line).toBe(3);
  });

  it('a choice outside any question is an error', () => {
    const r = parseReviewer(`a. orphan\n1. Q?\na. x\nb. y\nAnswer: a\nRationale: r`);
    expect(r.items).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ line: 1 });
  });

  it('empty input yields no items and one friendly error', () => {
    for (const input of ['', '   \n\n  ', '\r\n']) {
      const r = parseReviewer(input);
      expect(r.items).toEqual([]);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]?.message).toMatch(/No questions found/);
    }
  });

  it('rejects input over 2 MB with a friendly error', () => {
    const r = parseReviewer('x'.repeat(MAX_IMPORT_BYTES + 1));
    expect(r.items).toEqual([]);
    expect(r.errors[0]?.message).toMatch(/larger than 2 MB/);
  });
});

describe('parseReviewer: wrapped-text edge cases (M1 review findings)', () => {
  it('a "#" line inside a question is text, not a heading', () => {
    const r = parseReviewer(`1. Which is the\n#1 sample priority?\na. x\nb. y\nAnswer: a\nRationale: r`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.question).toBe('Which is the #1 sample priority?');
  });

  it('a numbered list inside a rationale stays in the rationale (with a warning)', () => {
    const r = parseReviewer(`1. Sample Q?\na. x\nb. y\nAnswer: a\nRationale: Sample order:\n1. First step\n2. Second step\n3. Next real question?\na. x\nb. y\nAnswer: b\nRationale: r`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.rationale).toBe('Sample order: 1. First step 2. Second step');
    expect(r.items[1]).toMatchObject({ question: 'Next real question?', line: 8 });
    expect(r.warnings.map((w) => w.line)).toEqual([6, 7]);
  });

  it('a wrapped line starting with a capital letter + period stays in the sentence', () => {
    const r = parseReviewer(`1. Sample question about\nE. sample organism, which is right?\na. x\nb. y\nD. sample continuation of b\nAnswer: a\nRationale: r`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.question).toBe('Sample question about E. sample organism, which is right?');
    expect(r.items[0]?.choices).toEqual(['x', 'y D. sample continuation of b']);
    expect(r.warnings).toHaveLength(1);
  });
});

describe('parseReviewer: title length (security review #7)', () => {
  it('caps the deck title at 120 characters', () => {
    expect(parseReviewer(`# ${'x'.repeat(5000)}\n1. Q?\na. x\nb. y\nAnswer: a\nRationale: r`).title).toHaveLength(120);
  });
});

describe('parseAnswerLetters', () => {
  it.each([
    ['b', ['b']],
    ['B.', ['b']],
    ['(c)', ['c']],
    ['b. Some text', ['b']],
    ['a, c, d', ['a', 'c', 'd']],
    ['A C', ['a', 'c']],
    ['a and c', ['a', 'c']],
    ['c, a, c', ['a', 'c']],
  ])('%s → %j', (raw, expected) => {
    expect(parseAnswerLetters(raw)).toEqual(expected);
  });

  it.each(['', 'A nurse', 'blue', 'z'])('%s → null', (raw) => {
    expect(parseAnswerLetters(raw)).toBeNull();
  });
});
