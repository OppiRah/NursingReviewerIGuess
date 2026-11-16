import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { MascotMoment } from '../components/Mascot';
import { PageTitle } from '../components/PageTitle';
import { streakLine, welcomeBack } from '../copy';
import { getSetting, loadAll } from '../data/repo';
import { needsBackupNudge } from '../domain/backup';
import { daysBetween, localDateStr } from '../domain/dates';
import { buildDailyPlan, daysToExam } from '../domain/plan';
import { deckReadiness, formatPercent } from '../domain/readiness';
import { computeStreak } from '../domain/streak';
import type { Deck } from '../domain/types';

/** Show the welcome-back mascot after this many days without a completed session. */
export const AWAY_DAYS = 3;

export function examLabel(deck: Deck, now: Date): string {
  const d = daysToExam(deck, now);
  if (d === null) return `${deck.title}: no exam date set`;
  if (d > 1) return `${d} days to ${deck.title} exam`;
  if (d === 1) return `1 day to ${deck.title} exam`;
  if (d === 0) return `${deck.title} exam is today. Kaya mo 'to!`;
  return `${deck.title} exam date has passed`;
}

export function TodayScreen() {
  const { db, scheduler, now, go, version, prefs } = useApp();
  const state = useAsync(async () => {
    const { decks, items } = await loadAll(db);
    const lastExportAt = await getSetting<string | null>(db, 'lastExportAt', null);
    const sessionDays = await getSetting<string[]>(db, 'sessionDays', []);
    const lastReview = await db.reviews.orderBy('at').last();
    const t = now();
    const today = localDateStr(t);
    const streak = computeStreak(sessionDays, today);
    // "Away" counts any studying (even a session ended early), not just completed sessions.
    const lastActive = [streak.lastDay, lastReview ? localDateStr(new Date(lastReview.at)) : null].filter((d): d is string => !!d).sort().pop() ?? null;
    const daysAway = lastActive ? daysBetween(lastActive, today) : null;
    return { decks, items, lastExportAt, plan: buildDailyPlan(decks, items, t), streak, daysAway };
  }, [db, version]);

  if (state.status === 'loading') return <p className="muted" aria-busy="true">Loading today's plan…</p>;
  if (state.status === 'error') return <p role="alert">Couldn't load your data: {state.error}</p>;

  const { decks, items, plan, lastExportAt, streak, daysAway } = state.data;
  const t = now();
  const mistakes = items.filter((i) => i.lastGrade === 'again').length;

  if (decks.length === 0) {
    return (
      <section aria-labelledby="page-title">
        <PageTitle>Today</PageTitle>
        <div className="card empty">
          <p className="lead">No reviewers yet.</p>
          <p>Paste a reviewer you already have, or make one with your own chatbot using our prompt.</p>
          <button type="button" className="btn primary" onClick={() => go({ name: 'import' })}>Import a reviewer</button>
        </div>
      </section>
    );
  }

  const showNudge = items.length > 0 && needsBackupNudge(lastExportAt, t);
  const away = daysAway !== null && daysAway >= AWAY_DAYS;

  return (
    <section aria-labelledby="page-title">
      <PageTitle>Today</PageTitle>
      {prefs.mascot && away && <MascotMoment text={welcomeBack(daysAway ?? AWAY_DAYS)} mood="cheer" testId="welcome-back" />}
      <div className="card hero">
        <p className="due-count" data-testid="due-count">
          <span className="big">{plan.dueCount}</span> {plan.dueCount === 1 ? 'item' : 'items'} due today
        </p>
        {plan.dueCount > 0 ? (
          <button type="button" className="btn primary big-btn" onClick={() => go({ name: 'session', mode: 'due' })}>
            Start review
          </button>
        ) : (
          <p className="lead">All done for today. Nice work.</p>
        )}
        <p className="muted streak" data-testid="streak">{streakLine(streak.current, streak.broken, streak.freezeUsedThisWeek)}</p>
      </div>

      {mistakes > 0 && (
        <button type="button" className="btn wide" onClick={() => go({ name: 'session', mode: 'mistakes' })}>
          Review my mistakes ({mistakes})
        </button>
      )}

      <h2>Your exams</h2>
      <ul className="deck-list">
        {decks.map((d) => (
          <li key={d.id} className="card">
            <span data-testid="exam-label">{examLabel(d, t)}</span>
            <span className="readiness">
              Readiness (estimated): <strong data-testid="readiness">{formatPercent(deckReadiness(d, items, scheduler, t))}</strong>
            </span>
          </li>
        ))}
      </ul>

      {showNudge && (
        <div className="card nudge" role="note">
          <p>{lastExportAt ? "It's been a while since your last backup." : "You haven't saved a backup yet."} Your reviewers live only on this phone, so a backup keeps them safe.</p>
          <button type="button" className="btn" onClick={() => go({ name: 'settings' })}>Back up now</button>
        </div>
      )}
    </section>
  );
}
