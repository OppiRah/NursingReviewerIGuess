/** FIX-001: regression tests for AUDIT-001 findings (moved from tests/audit/ reproductions). */
import { describe, expect, it } from 'vitest';
import { isModuleLoadError } from '../../src/import/kinds';
import { CONTENT_NOTICE, workloadLine } from '../../src/copy';
import { draftFromItem, validateDraft } from '../../src/domain/editItem';
import { parseReviewer } from '../../src/domain/parser';
import { buildDailyPlan, newQuota } from '../../src/domain/plan';
import { seenCount } from '../../src/domain/readiness';
import type { CardState, Deck, Item } from '../../src/domain/types';

const NOW = new Date(2026, 10, 16, 9, 0, 0);
const card = (reps: number, dueAt: Date, stability = 3): CardState => ({ stability: reps ? stability : 0, difficulty: 5, state: reps ? 2 : 0, reps, lapses: 0, scheduledDays: 0, learningStep: 0, dueAt: dueAt.toISOString(), lastReviewAt: reps ? NOW.toISOString() : null });
const mk = (id: string, reps: number, dueAt: Date, stability = 3): Item => ({ id, deckId: 'd', type: 'mcq', question: id, choices: ['Alpha', 'Beta', 'Gamma', 'Delta'], answer: [2], back: '', rationale: '', card: card(reps, dueAt, stability), dueAt: dueAt.toISOString(), position: 0, firstReviewedAt: null, lastGrade: null, flagged: false, createdAt: NOW.toISOString() });

describe('A-01 editing choices never silently re-points the correct answer', () => {
  const item = mk('x', 0, NOW);

  it('deleting a wrong choice above the answer keeps the same choice correct', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Alpha', 'Gamma', 'Delta'] }, item);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.patch.choices[r.patch.answer[0] ?? -1]).toBe('Gamma');
  });

  it('reordering choices keeps the same choice correct', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Gamma', 'Delta', 'Alpha', 'Beta'] }, item);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.patch.answer).toEqual([0]);
  });

  it('deleting the correct choice without choosing a new answer is refused', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Alpha', 'Beta', 'Delta'] }, item);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/correct choice/i);
  });

  it('fixing a typo in the correct choice (same number of choices) keeps its letter', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Alpha', 'Beta', 'Gamma fixed', 'Delta'] }, item);
    expect(r.ok && r.patch.answer).toEqual([2]);
  });

  it('a letter the student typed is always used as typed', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Alpha', 'Gamma', 'Delta'], answer: 'c' }, { ...item, answer: [0] });
    expect(r.ok && r.patch.answer).toEqual([2]);
  });

  it('select-all answers follow their choices too', () => {
    const sata = { ...item, type: 'sata' as const, answer: [0, 3] };
    const r = validateDraft({ ...draftFromItem(sata), choices: ['Alpha', 'Gamma', 'Delta'] }, sata);
    expect(r.ok && r.patch.answer).toEqual([0, 2]);
  });
});

describe('A-02 numbered flashcards are never swallowed into the previous rationale', () => {
  const MCQ = '1. Sample stem one?\na. Alpha\nb. Beta\nAnswer: a\nRationale: Because alpha.';
  it.each([['blank line', '\n\n'], ['nothing', '\n'], ['page break', '\f']])('separator: %s', (_n, sep) => {
    const r = parseReviewer(`${MCQ}${sep}Q2: Sample front?\nA: Sample back\nRationale: Because back.`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.rationale).toBe('Because alpha.');
    expect(r.items[1]).toMatchObject({ type: 'flashcard', question: 'Sample front?', back: 'Sample back', rationale: 'Because back.' });
  });

  it('"Question 2: compare…" with no A: line still stays in the rationale (BUILD-006 #9 kept)', () => {
    const r = parseReviewer(`${MCQ}\nQuestion 2: compare this with the next topic.`);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]?.rationale).toContain('Question 2: compare');
  });
});

describe('A-04 a passed exam date does not make the whole deck due at once', () => {
  const deck = (examDate: string | null): Deck => ({ id: 'd', title: 'T', examDate, createdAt: NOW.toISOString() });
  it('uses the no-date spread once the exam has passed', () => {
    expect(newQuota(deck('2026-11-10'), 300, 0, NOW)).toBe(newQuota(deck(null), 300, 0, NOW));
  });
  it('exam today still brings everything (last chance)', () => {
    expect(newQuota(deck('2026-11-16'), 300, 0, NOW)).toBe(300);
  });
});

describe('A-05 weakest items first when many are due the same day', () => {
  it('orders same-day reviews by lowest stability', () => {
    const midnight = new Date(2026, 10, 16, 0, 0, 0);
    const deck: Deck = { id: 'd', title: 'T', examDate: '2026-11-17', createdAt: NOW.toISOString() };
    const items = [mk('strong', 2, midnight, 40), mk('weak', 2, midnight, 0.4), mk('mid', 2, midnight, 5), mk('overdue', 2, new Date(2026, 10, 14, 9), 30)];
    expect(buildDailyPlan([deck], items, NOW).queue.map((i) => i.id)).toEqual(['overdue', 'weak', 'mid', 'strong']);
  });

  it('says how many sessions the day needs, and nothing for a single session', () => {
    expect(workloadLine(300)).toMatch(/30 sessions/);
    expect(workloadLine(300)).toMatch(/weakest/i);
    expect(workloadLine(10)).toBe('');
  });
});

describe('A-06 readiness shows how much of the deck was ever seen', () => {
  it('counts reviewed items per deck', () => {
    const items = [mk('a', 1, NOW), mk('b', 0, NOW), { ...mk('c', 3, NOW), deckId: 'other' }];
    expect(seenCount(items, 'd')).toEqual({ seen: 1, total: 2 });
  });
});

describe('A-07 content notice', () => {
  it('tells students to check their source and is not medical advice', () => {
    expect(CONTENT_NOTICE).toMatch(/mistakes/i);
    expect(CONTENT_NOTICE).toMatch(/check/i);
    expect(CONTENT_NOTICE).toMatch(/not medical advice/i);
  });
});

describe('A-09 a reader that fails to download is reported as such', () => {
  it('recognizes dynamic-import failures across browsers', () => {
    expect(isModuleLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/pdf-abc.js'))).toBe(true);
    expect(isModuleLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isModuleLoadError(new TypeError('error loading dynamically imported module'))).toBe(true);
    expect(isModuleLoadError(new Error('Invalid PDF structure'))).toBe(false);
  });
});

describe('FIX-001 verification follow-ups', () => {
  const MCQ = '1. Sample stem one?\na. Alpha\nb. Beta\nAnswer: a\nRationale: Because alpha.';
  const item = mk('x', 0, NOW);

  it('A-02: a wrapped numbered flashcard after a rationale is still its own item', () => {
    const r = parseReviewer(`${MCQ}\nQ2: Front that wraps\nonto a second line?\nA: Back`);
    expect(r.errors).toEqual([]);
    expect(r.items).toHaveLength(2);
    expect(r.items[0]?.rationale).toBe('Because alpha.');
    expect(r.items[1]).toMatchObject({ type: 'flashcard', question: 'Front that wraps onto a second line?', back: 'Back' });
  });

  it('A-02: a bare "Question 2" line, then the front, then A:, is a flashcard', () => {
    const r = parseReviewer(`${MCQ}\nQuestion 2\nFront?\nA: Back`);
    expect(r.items).toHaveLength(2);
    expect(r.items[1]).toMatchObject({ type: 'flashcard', question: 'Front?', back: 'Back' });
  });

  it('A-02: a numbered multiple-choice question is not mistaken for a flashcard by a later A: line', () => {
    const r = parseReviewer('Q1: Stem?\na. Alpha\nb. Beta\nAnswer: b\nRationale: r\nQ: Front?\nA: Back');
    expect(r.items.map((i) => i.type)).toEqual(['mcq', 'flashcard']);
  });

  it('A-01: duplicate choice texts in a select-all keep every correct choice', () => {
    const sata = { ...item, type: 'sata' as const, choices: ['Yes', 'No', 'Yes', 'Maybe'], answer: [0, 2] };
    const r = validateDraft({ ...draftFromItem(sata), choices: ['No', 'Yes', 'Yes', 'Maybe'] }, sata);
    expect(r.ok && r.patch.answer).toEqual([1, 2]);
  });

  it('A-01: rewording the correct choice AND moving things in one save is refused, not guessed', () => {
    const r = validateDraft({ ...draftFromItem(item), choices: ['Alpha', 'Gamma (corrected)', 'Epsilon', 'Delta'] }, item);
    expect(r.ok).toBe(false);
  });

  it('A-09: a PDF worker that fails to load is a load problem; an unrelated "failed to fetch" is not', () => {
    expect(isModuleLoadError(new Error('Setting up fake worker failed: "Cannot load script at: https://x/assets/pdf.worker.min-abc.mjs".'))).toBe(true);
    expect(isModuleLoadError(new Error('Failed to fetch'))).toBe(false);
  });

  it('A-05: the workload line does not overclaim', () => {
    expect(workloadLine(300)).toMatch(/overdue and weakest reviews come first/i);
  });
});
