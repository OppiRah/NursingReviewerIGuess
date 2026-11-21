/**
 * All mascot copy lives here (PRODUCT_SPEC §7–8): encouraging, light Taglish allowed,
 * never guilt, never mocks a mistake, never a medical authority.
 */

/** Shown wherever questions are imported or answered (AUDIT-001 A-07). */
export const CONTENT_NOTICE =
  'Questions come from your own files or your chatbot, so they can contain mistakes. Check answers against your source. This app is a study aid, not medical advice.';

/** Honest workload for Today when more than one session is due (AUDIT-001 A-05). */
export const workloadLine = (dueCount: number, sessionSize = 10): string => {
  if (dueCount <= sessionSize) return '';
  const sessions = Math.ceil(dueCount / sessionSize);
  return `That's about ${sessions} sessions of ${sessionSize}. Do what you can: overdue and weakest reviews come first, then new items.`;
};

const pick = (list: readonly string[], seed: number): string => list[Math.abs(seed) % list.length] ?? list[0] ?? '';

export const MASCOT_NAME = 'Momentum';

export const sessionStart = (seed: number): string =>
  pick(
    [
      "Kaya mo 'to! A few questions, one at a time.",
      'Short and steady. Let’s warm up.',
      'Recall first, then the rationale. Tara!',
      'Small sessions add up. Let’s go.',
    ],
    seed,
  );

export const sessionEnd = (correct: number, total: number): string => {
  if (total === 0) return 'Done for now. See you next time!';
  const ratio = correct / total;
  if (ratio === 1) return 'Perfect set! Galing! Your future self says thanks.';
  if (ratio >= 0.7) return 'Solid session. The ones you missed will come back sooner, para sure ka na.';
  return 'Done! The tricky ones will come back sooner. That’s how they stick.';
};

/** Shown after 3 wrong answers in a row (exact phrase from the build brief). */
export const recovery = 'Mistakes are information — let’s go again.';

export const welcomeBack = (daysAway: number): string =>
  daysAway >= 7
    ? 'Welcome back! No need to catch up on everything. Let’s just do today’s set.'
    : 'Welcome back! Let’s pick up where you left off, one small session at a time.';

export const streakLine = (current: number, broken: boolean, freezeUsedThisWeek: boolean): string => {
  if (broken) return 'A fresh streak can start today.';
  if (current === 0) return 'Finish a session to start a streak.';
  const days = `${current} ${current === 1 ? 'day' : 'days'}`;
  return freezeUsedThisWeek ? `${days} in a row (this week’s free pass covered a missed day)` : `${days} in a row`;
};
