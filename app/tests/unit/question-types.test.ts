import { describe, expect, it } from 'vitest';
import { validateDraft } from '../../src/domain/editItem';
import { parseReviewer } from '../../src/domain/parser';
import { scoreChoices } from '../../src/domain/scoring';

describe('parser: select all that apply', () => {
  it('multiple answer letters make a SATA item', () => {
    const r = parseReviewer(`1. Sample: which are colors? (Select all that apply.)\na. Red\nb. Chair\nc. Blue\nd. Green\nAnswer: a, c, d\nRationale: r`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({ type: 'sata', answer: [0, 2, 3] });
  });

  it('"select all that apply" in the question makes a single-answer SATA', () => {
    const r = parseReviewer(`1. Sample: select all that apply. Which are even?\na. 1\nb. 2\nc. 3\nAnswer: b\nRationale: r`);
    expect(r.items[0]).toMatchObject({ type: 'sata', answer: [1] });
  });

  it('a SATA letter outside the choices is an error', () => {
    const r = parseReviewer(`1. Q?\na. x\nb. y\nc. z\nAnswer: a, f\nRationale: r`);
    expect(r.items).toEqual([]);
    expect(r.errors[0]?.message).toMatch(/"f" is not one of the choices/);
  });
});

describe('parser: priority', () => {
  it('Type: priority before the question sets the type', () => {
    const r = parseReviewer(`Type: priority\n1. Sample: which task comes first?\na. Second task\nb. First task\nAnswer: b\nRationale: Sample priority rationale.`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({ type: 'priority', answer: [1], rationale: 'Sample priority rationale.' });
  });

  it('priority with two answers is an error', () => {
    const r = parseReviewer(`Type: priority\n1. Q?\na. x\nb. y\nAnswer: a, b\nRationale: r`);
    expect(r.items).toEqual([]);
    expect(r.errors[0]?.message).toMatch(/priority question must have exactly one answer/);
  });

  it('unknown types and dangling Type lines are errors', () => {
    expect(parseReviewer(`Type: banana\n1. Q?\na. x\nb. y\nAnswer: a\nRationale: r`).errors[0]?.message).toMatch(/unknown type/);
    expect(parseReviewer(`1. Q?\na. x\nb. y\nAnswer: a\nRationale: r\nType: priority`).errors[0]?.message).toMatch(/not followed by a question/);
  });

  it('Type applies only to the next question', () => {
    const r = parseReviewer(`Type: priority\n1. A?\na. x\nb. y\nAnswer: a\nRationale: r\n2. B?\na. x\nb. y\nAnswer: a\nRationale: r`);
    expect(r.items.map((i) => i.type)).toEqual(['priority', 'mcq']);
  });
});

describe('parser: flashcards', () => {
  it('Q:/A: blocks become flashcards; wrapped lines join; rationale optional without warning', () => {
    const r = parseReviewer(`Q: Sample term one\nA: Sample definition\nthat wraps\n---\nQ: Sample term two\nA: Def two\nRationale: extra`);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.items).toEqual([
      { type: 'flashcard', question: 'Sample term one', choices: [], answer: [], back: 'Sample definition that wraps', rationale: '', line: 1 },
      { type: 'flashcard', question: 'Sample term two', choices: [], answer: [], back: 'Def two', rationale: 'extra', line: 5 },
    ]);
  });

  it('"Type: flashcard" before a numbered question reads its A: line (M2 review #3)', () => {
    const r = parseReviewer(`Type: flashcard\n1. Sample term?\nA: Sample definition`);
    expect(r.errors).toEqual([]);
    expect(r.items[0]).toMatchObject({ type: 'flashcard', question: 'Sample term?', back: 'Sample definition' });
  });

  it('numbered "1. Q:" also works; a flashcard without A: is an error', () => {
    expect(parseReviewer(`1. Q: term\nA: def`).items[0]?.type).toBe('flashcard');
    const r = parseReviewer(`Q: term without answer`);
    expect(r.items).toEqual([]);
    expect(r.errors[0]?.message).toMatch(/no "A:" answer line/);
  });
});

describe('parser: mixed decks and backwards compatibility', () => {
  it('parses MCQ, SATA, priority and flashcards in one deck', () => {
    const text = [
      '# Mixed sample deck',
      '1. Sample MCQ?', 'a. x', 'b. y', 'Answer: a', 'Rationale: r', '---',
      '2. Sample SATA?', 'a. x', 'b. y', 'c. z', 'Answer: a, c', 'Rationale: r', '---',
      'Type: priority', '3. Sample priority?', 'a. x', 'b. y', 'Answer: b', 'Rationale: r', '---',
      'Q: Sample card', 'A: Sample back', '---',
      '5. Broken: no answer', 'a. x', 'b. y',
    ].join('\n');
    const r = parseReviewer(text);
    expect(r.title).toBe('Mixed sample deck');
    expect(r.items.map((i) => i.type)).toEqual(['mcq', 'sata', 'priority', 'flashcard']);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]?.line).toBe(25); // title(1) + 6 + 7 + 7 + 3 lines before it
  });
});

describe('scoreChoices (SATA all-or-nothing)', () => {
  const item = { choices: ['a', 'b', 'c', 'd'], answer: [0, 2, 3] };

  it('exactly the right set is correct', () => {
    expect(scoreChoices(item, [3, 0, 2])).toEqual({ correct: true, marks: ['correct', 'neutral', 'correct', 'correct'] });
  });

  it('a missing correct choice makes it wrong and is marked missed', () => {
    expect(scoreChoices(item, [0, 2])).toEqual({ correct: false, marks: ['correct', 'neutral', 'correct', 'missed'] });
  });

  it('an extra wrong choice makes it wrong and is marked wrong', () => {
    expect(scoreChoices(item, [0, 1, 2, 3])).toEqual({ correct: false, marks: ['correct', 'wrong', 'correct', 'correct'] });
  });

  it('single-answer items', () => {
    expect(scoreChoices({ choices: ['x', 'y'], answer: [1] }, [1]).correct).toBe(true);
    expect(scoreChoices({ choices: ['x', 'y'], answer: [1] }, [0])).toEqual({ correct: false, marks: ['wrong', 'missed'] });
  });
});

describe('validateDraft (edit item)', () => {
  const base = { type: 'mcq' as const, question: 'Q', choices: ['x', 'y', ''], answer: 'b', back: '', rationale: ' r ' };
  it('accepts a valid edit, trimming and dropping blank choices', () => {
    expect(validateDraft(base)).toEqual({ ok: true, patch: { type: 'mcq', question: 'Q', choices: ['x', 'y'], answer: [1], back: '', rationale: 'r' } });
  });
  it('a blank choice in the middle is an error, never a silent re-lettering (M2 review #1)', () => {
    const r = validateDraft({ ...base, choices: ['A', '', 'C', 'D'], answer: 'c' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Choice b is empty/);
  });
  it.each([
    [{ question: ' ' }, /question can’t be empty/],
    [{ choices: ['x'] }, /at least 2 choices/],
    [{ answer: 'c' }, /one of the choices/],
    [{ answer: 'a, b' }, /exactly one answer/],
    [{ answer: 'nope' }, /choice letter/],
  ])('rejects %j', (patch, msg) => {
    const r = validateDraft({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });
  it('flashcards need a back', () => {
    expect(validateDraft({ ...base, type: 'flashcard', back: '' }).ok).toBe(false);
    expect(validateDraft({ ...base, type: 'flashcard', back: 'B' })).toMatchObject({ ok: true, patch: { choices: [], answer: [], back: 'B' } });
  });
});
