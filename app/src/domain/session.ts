/** Pure session-runner rules (what happens after each answer), kept out of React so they're unit-tested. */

/** Mascot recovery moment after this many wrong answers in a row. */
export const RECOVERY_AFTER = 3;

export interface StepInput {
  correct: boolean;
  wrongStreak: number;
  index: number;
  total: number;
  mascot: boolean;
}

export interface StepResult {
  wrongStreak: number;
  next: 'question' | 'recovery' | 'done';
  index: number;
}

export function afterAnswer({ correct, wrongStreak, index, total, mascot }: StepInput): StepResult {
  const streak = correct ? 0 : wrongStreak + 1;
  const hitRecovery = streak >= RECOVERY_AFTER;
  const nextStreak = hitRecovery ? 0 : streak;
  if (index + 1 >= total) return { wrongStreak: nextStreak, next: 'done', index };
  return { wrongStreak: nextStreak, next: mascot && hitRecovery ? 'recovery' : 'question', index: index + 1 };
}
