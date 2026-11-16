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
    answer: it.answer.map((i) => String.fromCharCode(97 + i)).join(', '),
    back: it.back,
    rationale: it.rationale,
  };
}

export function validateDraft(d: ItemDraft): EditResult {
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
  const answer = letters.map((l) => l.charCodeAt(0) - 97);
  if (answer.some((i) => i >= choices.length)) return { ok: false, error: `The answer must be one of the choices (a–${String.fromCharCode(96 + choices.length)}).` };
  if (d.type !== 'sata' && answer.length !== 1) return { ok: false, error: 'This question type has exactly one answer. Change the type to "Select all that apply" for more.' };
  return { ok: true, patch: { type: d.type, question, choices, answer, back: '', rationale } };
}
