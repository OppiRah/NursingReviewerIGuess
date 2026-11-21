/** Validation for editing an item in the Deck screen (fix a typo or a wrong answer). */
import { parseAnswerLetters } from './parser';
import type { Item, ItemType } from './types';

export interface ItemDraft {
  type: ItemType;
  question: string;
  /** One choice per entry; blank entries are dropped. */
  choices: string[];
  /** Letters, e.g. "b" or "a, c". Ignored for flashcards. */
  answer: string;
  back: string;
  rationale: string;
}

export type EditResult = { ok: true; patch: Pick<Item, 'type' | 'question' | 'choices' | 'answer' | 'back' | 'rationale'> } | { ok: false; error: string };

export function draftFromItem(it: Item): ItemDraft {
  return {
    type: it.type,
    question: it.question,
    choices: [...it.choices],
    answer: lettersOf(it.answer),
    back: it.back,
    rationale: it.rationale,
  };
}

const lettersOf = (answer: number[]): string => answer.map((i) => String.fromCharCode(97 + i)).join(', ');

/**
 * The answer follows its choice (AUDIT-001 A-01). When the student changed the choice list but left
 * the letters as they were, the letters still mean the ORIGINAL choices: find those choices in the new
 * list. Returns the new indexes, or null when a correct choice is gone (the caller refuses to save).
 * Letters the student typed themselves are never reinterpreted.
 */
function followAnswer(original: Pick<Item, 'choices' | 'answer'>, choices: string[]): number[] | null {
  const before = original.choices.map((c) => c.trim());
  const sameList = before.length === choices.length && before.every((c, i) => c === choices[i]);
  if (sameList) return original.answer;
  const used = new Set<number>();
  for (const i of original.answer) {
    const text = before[i] ?? '';
    // Same place first, then the first unused match (so duplicate texts each keep their own slot).
    let at = choices[i] === text && !used.has(i) ? i : choices.findIndex((c, k) => c === text && !used.has(k));
    if (at < 0) {
      // The correct choice's text is gone. Only a pure in-place rewording (every other choice exactly
      // where it was) keeps the letter; anything else is refused rather than guessed.
      const onlyThisChanged = before.length === choices.length && before.every((c, j) => j === i || c === choices[j]);
      if (!onlyThisChanged || used.has(i)) return null;
      at = i;
    }
    used.add(at);
  }
  return [...used].sort((a, b) => a - b);
}

/** `original` is the item being edited; pass it so a changed choice list can't silently move the answer. */
export function validateDraft(d: ItemDraft, original?: Pick<Item, 'choices' | 'answer'>): EditResult {
  const question = d.question.trim();
  const rationale = d.rationale.trim();
  if (!question) return { ok: false, error: 'The question can’t be empty.' };
  if (d.type === 'flashcard') {
    const back = d.back.trim();
    if (!back) return { ok: false, error: 'The flashcard answer can’t be empty.' };
    return { ok: true, patch: { type: 'flashcard', question, choices: [], answer: [], back, rationale } };
  }
  // Only trailing blank lines are dropped. A blank line in the middle would shift every later
  // letter (and silently change which choice the answer points to), so it is an error.
  const choices = d.choices.map((c) => c.trim());
  while (choices.length > 0 && choices[choices.length - 1] === '') choices.pop();
  const blank = choices.indexOf('');
  if (blank >= 0) return { ok: false, error: `Choice ${String.fromCharCode(97 + blank)} is empty. Fill it in or remove it and update the answer letters.` };
  if (choices.length < 2) return { ok: false, error: 'Add at least 2 choices.' };
  if (choices.length > 8) return { ok: false, error: 'Use at most 8 choices.' };
  const letters = parseAnswerLetters(d.answer);
  if (!letters) return { ok: false, error: 'The answer should be a choice letter, like "b" or "a, c".' };
  let answer = letters.map((l) => l.charCodeAt(0) - 97);
  const untouched = !!original && original.answer.length > 0 && letters.join(', ') === lettersOf(original.answer);
  if (original && untouched) {
    const followed = followAnswer(original, choices);
    if (!followed) return { ok: false, error: 'You removed or replaced the correct choice. Type the correct letter(s) again for the new list.' };
    answer = followed;
  }
  if (answer.some((i) => i >= choices.length)) return { ok: false, error: `The answer must be one of the choices (a–${String.fromCharCode(96 + choices.length)}).` };
  if (d.type !== 'sata' && answer.length !== 1) return { ok: false, error: 'This question type has exactly one answer. Change the type to "Select all that apply" for more.' };
  return { ok: true, patch: { type: d.type, question, choices, answer, back: '', rationale } };
}

type AnswerKey = Pick<Item, 'type' | 'choices' | 'answer' | 'back'>;
const normKey = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * The answer a student is judged against, as text: the correct choices' texts (order-free) or the
 * flashcard's back. Reordering choices or fixing the question/rationale does not change it.
 */
function keyText(k: AnswerKey): string {
  if (k.type === 'flashcard') return `card:${normKey(k.back)}`;
  return `choice:${k.answer.map((i) => normKey(k.choices[i] ?? '')).sort().join('\u0000')}`;
}

/** AUDIT-001 A-17: did an edit change what counts as the correct answer? */
export function answerKeyChanged(before: AnswerKey, after: AnswerKey): boolean {
  return keyText(before) !== keyText(after);
}
