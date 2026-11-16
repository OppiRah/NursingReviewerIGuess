/** Scoring for choice items. SATA is all-or-nothing for scheduling, with per-choice feedback. */
import type { Item } from './types';

export type ChoiceMark = 'correct' | 'wrong' | 'missed' | 'neutral';

export interface ScoreResult {
  correct: boolean;
  /** Per choice: picked & right = correct; picked & not right = wrong; not picked but right = missed. */
  marks: ChoiceMark[];
}

export function scoreChoices(item: Pick<Item, 'choices' | 'answer'>, selected: number[]): ScoreResult {
  const right = new Set(item.answer);
  const picked = new Set(selected);
  const marks = item.choices.map<ChoiceMark>((_, i) => {
    if (picked.has(i) && right.has(i)) return 'correct';
    if (picked.has(i)) return 'wrong';
    if (right.has(i)) return 'missed';
    return 'neutral';
  });
  const correct = right.size === picked.size && [...right].every((i) => picked.has(i));
  return { correct, marks };
}

export const letter = (i: number): string => String.fromCharCode(97 + i);
