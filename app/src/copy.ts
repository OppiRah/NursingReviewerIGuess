/**
 * All mascot copy lives here (PRODUCT_SPEC §7–8): encouraging, light Taglish allowed,
 * never guilt, never mocks a mistake, never a medical authority.
 */

/** Shown wherever questions are imported or answered (AUDIT-001 A-07). */
export const CONTENT_NOTICE =
  'Questions come from your own files or your chatbot, so they can contain mistakes. Check answers against your source. This app is a study aid, not medical advice.';

/** Today's workload in sessions (AUDIT-001 A-05). `sessionSize` is the app's real SESSION_SIZE. */
export const workloadLine = (dueCount: number, sessionSize: number): string => {
  if (dueCount <= 0 || sessionSize <= 0) return '';
  const sessions = Math.ceil(dueCount / sessionSize);
  const head = `About ${sessions} ${sessions === 1 ? 'session' : 'sessions'} today (${sessionSize} items each).`;
  return sessions === 1 ? head : `${head} Do what you can: the weakest reviews come first, with some new items in every session.`;
};

/**
 * One deck's plan until the exam (AUDIT-001 A-05), from deckOutlook(). Describes the plan's arithmetic
 * only; it never predicts an exam result or says the student is behind.
 */
export const outlookLine = (o: { status: string; unseen: number; newPerDay: number }, sessionSize: number): string => {
  const n = `${o.unseen} not seen yet`;
  const sessions = (count: number): string => {
    const s = Math.ceil(count / sessionSize);
    return `about ${s} ${s === 1 ? 'session' : 'sessions'}`;
  };
  switch (o.status) {
    case 'fits':
      return `${n}: about ${o.newPerDay} new a day until the exam, plus reviews.`;
    case 'heavy':
      return `${n}. Seeing them all before the exam takes about ${o.newPerDay} new items a day (${sessions(o.newPerDay)} of new items), plus reviews. You may need more sessions to see every item.`;
    case 'last-day':
      return `${n}, and today is the last day to see them before the exam (${sessions(o.unseen)}). This deck may not be finishable before your exam at this point; every session still helps.`;
    case 'passed':
      return `${n}. The exam date has passed: set a new date in the deck to plan again.`;
    case 'no-date':
      return `${n}. Set an exam date to plan backward from it.`;
    default:
      return '';
  }
};

/** The same readiness explanation on every screen that shows the number (AUDIT-001 A-06). */
export const READINESS_HINT =
  'A rough study estimate, not a prediction of your exam result. Items you have not seen, or last answered wrong, count as 0.';

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
