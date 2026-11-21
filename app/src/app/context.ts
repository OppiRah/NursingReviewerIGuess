import { createContext, useContext } from 'react';
import type { ReviewerDB } from '../data/db';
import type { Scheduler } from '../domain/scheduler';

export type Route =
  | { name: 'onboarding' }
  | { name: 'today' }
  | { name: 'session'; mode: 'due' | 'mistakes' }
  | { name: 'import' }
  | { name: 'decks' }
  | { name: 'deck'; id: string }
  | { name: 'settings' };

export interface Prefs {
  /** Mascot moments on/off (the learning loop works without it). */
  mascot: boolean;
}

export interface AppCtx {
  db: ReviewerDB;
  scheduler: Scheduler;
  /** Clock seam: code reads time only through here. */
  now: () => Date;
  go: (r: Route) => void;
  /** Bumped after any write so screens reload their data. */
  version: number;
  bump: () => void;
  prefs: Prefs;
  setPrefs: (p: Prefs) => Promise<void>;
  /** Re-read preferences from storage (after a restore or wipe). */
  reloadPrefs: () => Promise<void>;
  /**
   * The session registers a guard that saves its last answer before back → "Leave session" leaves.
   * If the guard reports failure the app stays on the session (which shows the error). null = none.
   */
  setLeaveGuard: (guard: (() => Promise<boolean>) | null) => void;
  /**
   * Leave the session for Today (End session, back → "Leave session", "Leave anyway"). One leave at a
   * time (T-1): repeated taps or back presses while one is in progress do nothing. Unless `force`, the
   * session's guard must save its last answer first; if that fails the app stays on the session.
   */
  leaveSession: (opts?: { force?: boolean }) => Promise<void>;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
