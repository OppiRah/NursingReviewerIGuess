/**
 * Sprint: flashcard endings and wrapped "reason:" lines (AUDIT-001 A-10, A-11, A-13 and the T3 round-trip
 * "reason:" mismatches). Synthetic text only.
 */
import { describe, expect, it } from 'vitest';
import { parseReviewer } from '../../src/domain/parser';

describe('flashcards: what ends an answer', () => {
  it('a "___" line after a flashcard answer separates it from the next card (A-10)', () => {
    const r = parseReviewer('Q: Front one?\nA: Back one\n___\nQ: Front two?\nA: Back two');
    expect(r.errors).toEqual([]);
    expect(r.items.map((i) => i.back)).toEqual(['Back one', 'Back two']);
  });

  it('a chatbot sign-off after the last flashcard (no rationale) is dropped, not glued to the answer (A-11)', () => {
    const r = parseReviewer('Q: Front?\nA: Back\n\nLet me know if you want more questions!');
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.back).toBe('Back');
  });

  it('a "___" fill-in-the-blank inside an unanswered flashcard question is still kept (unchanged)', () => {
    const r = parseReviewer('Q: The normal sample value is\n___\nA: Sample');
    expect(r.items[0]?.question).toContain('___');
    expect(r.items[0]?.back).toBe('Sample');
  });

  it('a sign-off without a blank line before it stays part of the answer text (unchanged, conservative)', () => {
    const r = parseReviewer('Q: Front?\nA: Back\nLet me know if you want more questions!');
    expect(r.items[0]?.back).toContain('Back');
  });
});

describe('wrapped lines that start with lowercase "reason:"', () => {
  it('inside a flashcard question they stay question text (A-13)', () => {
    const r = parseReviewer('Q: What is the most likely\nreason: low oxygen or low fluid?\nA: Sample back');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.question).toBe('What is the most likely reason: low oxygen or low fluid?');
    expect(r.items[0]?.rationale).toBe('');
  });

  it('inside a rationale they are kept word for word, not read as a second label', () => {
    const r = parseReviewer('1. Sample question?\na. One\nb. Two\nAnswer: a\nRationale: The sample shows the\nreason: low oxygen in the client.');
    expect(r.items[0]?.rationale).toBe('The sample shows the reason: low oxygen in the client.');
  });

  it('inside a choice they stay part of that choice', () => {
    const r = parseReviewer('1. Sample question?\na. A choice that gives the\nreason: low oxygen\nb. Two\nAnswer: a');
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.choices).toEqual(['A choice that gives the reason: low oxygen', 'Two']);
  });

  it('right after "Answer:" or "A:" a lowercase "reason:" is still a rationale label (unchanged)', () => {
    const mcq = parseReviewer('1. Sample question?\na. One\nb. Two\nAnswer: a\nreason: because one.');
    expect(mcq.items[0]?.rationale).toBe('because one.');
    const card = parseReviewer('Q: Front?\nA: Back\nreason: because.');
    expect(card.items[0]?.back).toBe('Back');
    expect(card.items[0]?.rationale).toBe('because.');
  });

  it('capitalized "Reason:" and "Rationale:" labels keep their meaning', () => {
    const r = parseReviewer('1. Sample question?\na. One\nb. Two\nAnswer: b\nReason: Two is right.\nRationale: More detail.');
    expect(r.items[0]?.answer).toEqual([1]);
    expect(r.items[0]?.rationale).toContain('Two is right.');
    expect(r.items[0]?.rationale).toContain('More detail.');
  });
});

describe('text outside any question is reported, never dropped silently', () => {
  it('lists the line numbers of stray text', () => {
    const r = parseReviewer('Stray sample note before the questions\n1. Sample?\na. One\nb. Two\nAnswer: a');
    expect(r.items).toHaveLength(1);
    expect(r.warnings.map((w) => w.message)).toContain('1 line outside any question will not be imported (line 1).');
  });

  it('does not list chatbot greetings and sign-offs, which are skipped on purpose', () => {
    const r = parseReviewer('Sure! Here are your practice questions:\n\n1. Sample?\na. One\nb. Two\nAnswer: a\n\nLet me know if you want more!');
    expect(r.items).toHaveLength(1);
    expect(r.warnings.some((w) => w.message.includes('outside any question'))).toBe(false);
  });
});

describe('repeated questions in one import', () => {
  it('are kept but pointed out with both line numbers', () => {
    const q = '1. Sample repeated question?\na. One\nb. Two\nAnswer: a\n---\n';
    const r = parseReviewer(q + q.replace('1.', '2.') + '3. Sample different question?\na. One\nb. Two\nAnswer: b');
    expect(r.items).toHaveLength(3);
    expect(r.warnings.map((w) => w.message)).toContain('Line 6: this question looks the same as the one at line 1. Both were kept; delete one in Decks if it is a repeat.');
    expect(r.warnings.filter((w) => w.message.includes('looks the same'))).toHaveLength(1);
  });

  it('same question text with different choices is not called a repeat', () => {
    const r = parseReviewer('1. Sample?\na. One\nb. Two\nAnswer: a\n---\n2. Sample?\na. Three\nb. Four\nAnswer: a');
    expect(r.warnings.some((w) => w.message.includes('looks the same'))).toBe(false);
  });
});

describe('repeated flashcards', () => {
  it('same front with different answers is not called a repeat; same front and answer is', () => {
    const r = parseReviewer('Q: Sample normal value?\nA: 3.5 to 5.0\n---\nQ: Sample normal value?\nA: 135 to 145\n---\nQ: Sample normal value?\nA: 3.5  to 5.0');
    const repeats = r.warnings.filter((w) => w.message.includes('looks the same'));
    expect(r.items).toHaveLength(3);
    expect(repeats).toHaveLength(1);
    expect(repeats[0]?.message).toContain('as the one at line 1');
  });
});
