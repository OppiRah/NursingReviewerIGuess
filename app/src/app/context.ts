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
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
}
