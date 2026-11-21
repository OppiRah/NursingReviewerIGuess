/** AUDIT-001: minimal reproductions of the parser counterexamples found by roundtrip.audit.test.ts. */
import { describe, expect, it } from 'vitest';
import { parseReviewer } from '../../src/domain/parser';

const MCQ = '1. Sample stem one?\na. Alpha\nb. Beta\nAnswer: a\nRationale: Because alpha.';

describe('AUDIT-001 parser reproductions', () => {
  it('A-02: a numbered flashcard after a question (no --- line) is not swallowed into that question\'s rationale', () => {
    const r = parseReviewer(`${MCQ}\n\nQ2: Sample front?\nA: Sample back\nRationale: Because back.`);
    console.log(`A-02 items=${r.items.length} errors=${r.errors.length} rationale[0]="${r.items[0]?.rationale}"`);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.rationale).toBe('Because alpha.');
  });

  it('A-09: a "___" separator after a flashcard is not added to its answer', () => {
    const r = parseReviewer('Q: Front?\nA: Back\n___\nQ: Front two?\nA: Back two');
    console.log(`A-09 back[0]="${r.items[0]?.back}"`);
    expect(r.items[0]?.back).toBe('Back');
  });

  it('A-10: a chatbot sign-off after a last flashcard without a rationale is not added to its answer', () => {
    const r = parseReviewer('Q: Front?\nA: Back\n\nLet me know if you want more questions!');
    console.log(`A-10 back[0]="${r.items[0]?.back}"`);
    expect(r.items[0]?.back).toBe('Back');
  });

  it('A-11: "Q1:" with a question wrapped over two lines, then "A:", is still a flashcard', () => {
    const r = parseReviewer('Q1: Sample front that is long enough\nto wrap onto a second line?\nA: Sample back');
    console.log(`A-11 items=${r.items.length} first error="${r.errors[0]?.message ?? ''}"`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]?.type).toBe('flashcard');
  });

  it('A-12: a wrapped line starting with "Reason:" inside a flashcard question does not cut the question', () => {
    const r = parseReviewer('Q: What is the most likely\nreason: low oxygen or low fluid?\nA: Sample back');
    console.log(`A-12 question="${r.items[0]?.question}" rationale="${r.items[0]?.rationale}"`);
    expect(r.items[0]?.question).toContain('low oxygen');
  });
});
