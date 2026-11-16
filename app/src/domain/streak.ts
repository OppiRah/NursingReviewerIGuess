/**
 * Gentle streak: consecutive local days with at least one completed session.
 * One free "freeze" per calendar week (Mon–Sun) bridges a single missed day.
 * Today not done yet never breaks the streak.
 */
import { addDays, daysBetween, parseLocalDate } from './dates';

export interface StreakInfo {
  current: number;
  /** True if this week's freeze has been spent on a gap in the current streak. */
  freezeUsedThisWeek: boolean;
  /** Had a streak before, but it's 0 now. UI shows neutral copy, never shame. */
  broken: boolean;
  doneToday: boolean;
  lastDay: string | null;
  /** Whole days since the last completed session (null if never). */
  daysAway: number | null;
}

/** Monday of the week containing `day`, as YYYY-MM-DD. */
export function weekKey(day: string): string {
  const d = parseLocalDate(day);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(day, -offset);
}

export function computeStreak(sessionDays: string[], today: string): StreakInfo {
  const days = new Set(sessionDays.filter((d) => d <= today));
  const sorted = [...days].sort();
  const lastDay = sorted[sorted.length - 1] ?? null;
  const doneToday = days.has(today);

  let count = 0;
  const frozenWeeks = new Set<string>();
  let cursor = doneToday ? today : addDays(today, -1);
  // Walk back while days are present, bridging at most one gap per week.
  for (let guard = 0; guard < 4000; guard++) {
    if (days.has(cursor)) {
      count++;
      cursor = addDays(cursor, -1);
      continue;
    }
    const prev = addDays(cursor, -1);
    const wk = weekKey(cursor);
    if (!frozenWeeks.has(wk) && days.has(prev)) {
      frozenWeeks.add(wk);
      cursor = prev;
      continue;
    }
    break;
  }

  return {
    current: count,
    freezeUsedThisWeek: frozenWeeks.has(weekKey(today)),
    broken: count === 0 && days.size > 0,
    doneToday,
    lastDay,
    daysAway: lastDay ? daysBetween(lastDay, today) : null,
  };
}

export function addSessionDay(sessionDays: string[], day: string): string[] {
  return sessionDays.includes(day) ? sessionDays : [...sessionDays, day].sort().slice(-400);
}
