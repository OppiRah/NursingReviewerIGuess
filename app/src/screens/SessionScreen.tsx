import { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/context';
import { useAsync } from '../app/useAsync';
import { createAnswerSaver, type AnswerSaver } from '../app/answerSaver';
import { MascotMoment, type Mood } from '../components/Mascot';
import { PageTitle } from '../components/PageTitle';
import { CONTENT_NOTICE, recovery, sessionEnd, sessionStart } from '../copy';
import { getSetting, loadAll, loadMistakes, recordReview, setSetting, updateItem } from '../data/repo';
import { localDateStr } from '../domain/dates';
import { buildDailyPlan, SESSION_SIZE } from '../domain/plan';
import { afterAnswer } from '../domain/session';
import { addSessionDay } from '../domain/streak';
import { letter, scoreChoices, type ScoreResult } from '../domain/scoring';
import type { Grade, Item } from '../domain/types';

type Mode = 'due' | 'mistakes';

export function SessionScreen({ mode }: { mode: Mode }) {
  const { db, now, scheduler } = useApp();
  // Snapshot the queue once, at session start.
  const state = useAsync(async () => {
    if (mode === 'mistakes') return (await loadMistakes(db)).slice(0, SESSION_SIZE);
    const { decks, items } = await loadAll(db);
    return buildDailyPlan(decks, items, now(), (c, at) => scheduler.retrievability(c, at)).queue.slice(0, SESSION_SIZE);
  }, [db, mode]);

  if (state.status === 'loading') return <p className="muted" aria-busy="true">Preparing your session…</p>;
  if (state.status === 'error') return <p role="alert">Couldn't start the session: {state.error}</p>;
  if (state.data.length === 0) return <EmptySession />;
  return <Runner queue={state.data} />;
}

function EmptySession() {
  const { go } = useApp();
  return (
    <section>
      <PageTitle>Nothing to review</PageTitle>
      <p>You're all caught up.</p>
      <button type="button" className="btn primary" onClick={() => go({ name: 'today' })}>Back to Today</button>
    </section>
  );
}

interface Stats {
  done: number;
  correct: number;
}

type Phase = 'intro' | 'question' | 'recovery' | 'done';

function Runner({ queue }: { queue: Item[] }) {
  const { db, scheduler, now, bump, prefs, setLeaveGuard, leaveSession } = useApp();
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ done: 0, correct: 0 });
  const [phase, setPhase] = useState<Phase>(prefs.mascot ? 'intro' : 'question');
  const [wrongStreak, setWrongStreak] = useState(0);
  /** A failed save, tied to its answer so a later success clears only its own error (C-2). */
  const [error, setError] = useState<{ key: string; message: string; leaveFailed: boolean } | null>(null);
  /** Re-render when the saver's saving/saved state changes ("Saving…", no re-grade once saved). */
  const [, setSaverTick] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const item = queue[index];

  // New question → focus its heading, so keyboard users start from the top of the card.
  useEffect(() => {
    if (phase === 'question' && index > 0) titleRef.current?.focus();
  }, [index, phase]);

  const finishSession = async (): Promise<void> => {
    try {
      const days = await getSetting<string[]>(db, 'sessionDays', []);
      await setSetting(db, 'sessionDays', addSessionDay(days, localDateStr(now())));
    } catch {
      /* the streak is a nicety; never block the summary on it */
    }
    bump();
    setPhase('done');
  };

  /**
   * Answer persistence (R-3/R-4, app/answerSaver.ts). Each question on screen is written exactly once.
   * A checked choice answer is pending until saved; it is saved by Next, or when the student leaves
   * (End session, back → Leave, app sent to the background, page closing). A write that is already
   * running is joined, never skipped, and nothing advances or counts in the summary until it succeeded.
   * A failure keeps the student on the question with the error, so they can retry or choose to leave.
   */
  const mountedRef = useRef(true);
  const advancedRef = useRef(new Set<string>());
  const saverRef = useRef<AnswerSaver | null>(null);
  saverRef.current ??= createAnswerSaver(
    async (a) => {
      await recordReview(db, a.itemId, a.grade, a.correct, scheduler, now());
    },
    {
      // Only this session's screen is updated; a write finishing after it closed changes nothing here.
      onError: (message, a) => {
        if (mountedRef.current) setError({ key: a.key, message, leaveFailed: false });
      },
      onSaved: (a) => {
        if (mountedRef.current) setError((e) => (e && e.key === a.key ? null : e));
      },
      onChange: () => {
        if (mountedRef.current) setSaverTick((t) => t + 1);
      },
    },
  );
  const saver = saverRef.current;
  const keyFor = (i: number, id: string): string => `${i}:${id}`;
  const [leaving, setLeaving] = useState(false);
  /** A save failed while leaving: offer "Leave anyway" next to the error. */
  const markLeaveFailed = (): void => setError((e) => (e ? { ...e, leaveFailed: true } : e));

  useEffect(() => {
    mountedRef.current = true;
    const flushInBackground = (): void => {
      void saver.flush().then((r) => {
        if (r.ok) bump();
      });
    };
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') flushInBackground();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushInBackground);
    // back → "Leave session": save the last answer first; stay here if that fails.
    setLeaveGuard(async () => {
      const r = await saver.flush();
      if (r.ok) return true;
      if (mountedRef.current) markLeaveFailed();
      return false;
    });
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushInBackground);
      setLeaveGuard(null);
      flushInBackground(); // last chance (e.g. "Leave anyway" or a reload); failures are already shown
    };
  }, [saver, bump, setLeaveGuard]);

  const onAnswered = (grade: Grade, correct: boolean): void => {
    if (item) saver.setPending({ key: keyFor(index, item.id), itemId: item.id, grade, correct });
  };

  /** End session / "Leave anyway": the app serializes leaving (T-1) and runs the save guard above. */
  const endSession = async (force = false): Promise<void> => {
    if (leaving) return;
    setLeaving(true);
    await leaveSession({ force });
    if (mountedRef.current) setLeaving(false); // still here: the save failed (error and "Leave anyway" shown)
  };

  const submit = async (grade: Grade, correct: boolean): Promise<void> => {
    if (!item) return;
    const key = keyFor(index, item.id);
    const answer = { key, itemId: item.id, grade, correct };
    // Pending while it saves, so End session / Leave wait for this same write instead of skipping it.
    // If a background save already wrote it, "Easy" cannot re-grade it (the first grade wins).
    saver.setPending(answer);
    const r = await saver.save(answer);
    if (!r.ok) return; // error shown; the student can tap again to retry
    if (advancedRef.current.has(key)) return; // a second tap joined the same save: advance only once
    advancedRef.current.add(key);
    setError(null);
    setStats((s) => ({ done: s.done + 1, correct: s.correct + (correct ? 1 : 0) }));
    bump();
    const step = afterAnswer({ correct, wrongStreak, index, total: queue.length, mascot: prefs.mascot });
    setWrongStreak(step.wrongStreak);
    if (step.next === 'done') {
      await finishSession();
      return;
    }
    setIndex(step.index);
    if (step.next === 'recovery') setPhase('recovery');
  };

  if (phase === 'done') return <Summary stats={stats} />;
  if (phase === 'intro') {
    return (
      <Interstitial
        title={`${queue.length} ${queue.length === 1 ? 'question' : 'questions'} today`}
        text={sessionStart(now().getDate() + queue.length)}
        mood="cheer"
        button="Begin"
        onContinue={() => setPhase('question')}
        testId="mascot-start"
      />
    );
  }
  if (phase === 'recovery') {
    return <Interstitial title="Quick breather" text={recovery} mood="calm" button="Continue" onContinue={() => setPhase('question')} testId="mascot-recovery" />;
  }
  if (!item) return null;

  return (
    <section aria-labelledby="page-title" className="session">
      <div className="session-top">
        <PageTitle className="progress-title" ref={titleRef}>
          Question {index + 1} of {queue.length}
        </PageTitle>
        <button type="button" className="btn ghost" onClick={() => void endSession()} disabled={leaving}>End session</button>
      </div>
      <progress max={queue.length} value={index} aria-label="Session progress" />
      {error && (
        <div role="alert" className="error" data-testid="save-error">
          <p>Couldn&apos;t save that answer: {error.message}</p>
          <p>It was not counted yet. Tap Next (or Got it / Missed it) again to retry{error.leaveFailed ? ', or leave without it' : ''}.</p>
          {error.leaveFailed && (
            <button type="button" className="btn" onClick={() => void endSession(true)}>Leave anyway (this answer may not be saved)</button>
          )}
        </div>
      )}
      <QuestionCard
        key={keyFor(index, item.id)}
        item={item}
        onDone={submit}
        onAnswered={onAnswered}
        saving={saver.isSaving(keyFor(index, item.id))}
        saved={saver.isSaved(keyFor(index, item.id))}
      />
    </section>
  );
}

function QuestionCard({
  item,
  onDone,
  onAnswered,
  saving,
  saved,
}: {
  item: Item;
  onDone: (g: Grade, correct: boolean) => Promise<void>;
  /** A choice answer was checked: remembered so it is saved even if the student leaves before Next. */
  onAnswered: (g: Grade, correct: boolean) => void;
  /** This answer is being written right now (e.g. the app was just in the background). */
  saving: boolean;
  /** This answer is already saved, so its grade can no longer change. */
  saved: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const feedbackRef = useRef<HTMLHeadingElement>(null);

  const answered = result !== null || revealed;
  useEffect(() => {
    if (answered) feedbackRef.current?.focus();
  }, [answered]);

  const finish = async (g: Grade, correct: boolean): Promise<void> => {
    if (busy) return;
    setBusy(true);
    await onDone(g, correct);
    setBusy(false);
  };

  const badge = item.type === 'priority' ? 'Priority' : item.type === 'sata' ? 'Select all that apply' : item.type === 'flashcard' ? 'Flashcard' : null;

  return (
    <article className="card question-card">
      {badge && <p className={`badge badge-${item.type}`}>{badge}</p>}
      <h2 className="question-text">{item.question}</h2>

      {item.type === 'flashcard' ? (
        !revealed && (
          <button type="button" className="btn primary" onClick={() => setRevealed(true)}>Show answer</button>
        )
      ) : (
        <ChoiceList
          item={item}
          selected={selected}
          setSelected={setSelected}
          result={result}
          onSubmit={(sel) => {
            const r = scoreChoices(item, sel);
            setResult(r);
            onAnswered(r.correct ? 'good' : 'again', r.correct);
          }}
        />
      )}

      {answered && (
        <div className="feedback" aria-live="polite">
          {item.type === 'flashcard' ? (
            <>
              <h3 ref={feedbackRef} tabIndex={-1}>Answer</h3>
              <p className="back-text">{item.back}</p>
              {item.rationale && <p className="rationale"><strong>Rationale: </strong>{item.rationale}</p>}
              <p className="muted">Did you remember it?</p>
              <div className="row">
                <button type="button" className="btn" disabled={busy || saving} onClick={() => finish('again', false)}>Missed it</button>
                <button type="button" className="btn primary" disabled={busy || saving} onClick={() => finish('good', true)}>Got it</button>
              </div>
            </>
          ) : (
            result && (
              <>
                <h3 ref={feedbackRef} tabIndex={-1} className={result.correct ? 'ok' : 'bad'}>
                  {result.correct ? 'Correct' : 'Not quite'}
                </h3>
                {!result.correct && (
                  <p>
                    Answer: {item.answer.map((i) => `${letter(i)}. ${item.choices[i] ?? ''}`).join('; ')}
                  </p>
                )}
                {item.rationale && item.type === 'priority' && <p className="rationale-label">Why this comes first</p>}
                {item.rationale ? (
                  <p className={`rationale${item.type === 'priority' ? ' rationale-strong' : ''}`}><strong>Rationale: </strong>{item.rationale}</p>
                ) : (
                  <p className="muted">No rationale was included for this item.</p>
                )}
                <div className="row">
                  <button type="button" className="btn primary" disabled={busy || saving} onClick={() => finish(result.correct ? 'good' : 'again', result.correct)}>
                    {saving ? 'Saving…' : 'Next'}
                  </button>
                  {/* "Easy" changes the grade, which is only possible before this answer is written (C-1). */}
                  {result.correct && !saving && !saved && (
                    <button type="button" className="btn" disabled={busy} onClick={() => finish('easy', true)}>Easy, show less often</button>
                  )}
                </div>
                {saved && !busy && <p className="hint" data-testid="answer-saved">Answer saved.</p>}
              </>
            )
          )}
          <ReportWrong item={item} />
          <p className="hint small" data-testid="content-notice">{CONTENT_NOTICE}</p>
        </div>
      )}
    </article>
  );
}

/** "Report wrong": a local flag so the student remembers to check this item against their source. */
function ReportWrong({ item }: { item: Item }) {
  const { db, bump } = useApp();
  const [flagged, setFlagged] = useState(item.flagged);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const toggle = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const next = !flagged;
    try {
      await updateItem(db, item.id, { flagged: next });
      setFlagged(next);
      bump();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <p className="report-wrong">
      <button type="button" className="btn ghost" aria-pressed={flagged} onClick={toggle} disabled={busy}>
        {flagged ? '⚑ Reported. Tap to clear' : 'Report wrong'}
      </button>
      {flagged && <span className="hint"> Check this one against your source. It's listed in Decks.</span>}
      {failed && <span role="alert" className="error"> Couldn't save that. Try again.</span>}
    </p>
  );
}

function ChoiceList({
  item,
  selected,
  setSelected,
  result,
  onSubmit,
}: {
  item: Item;
  selected: number[];
  setSelected: (s: number[]) => void;
  result: ScoreResult | null;
  onSubmit: (sel: number[]) => void;
}) {
  const multi = item.type === 'sata';
  const markLabel = { correct: '(correct)', wrong: '(wrong)', missed: '(missed: this was correct)', neutral: '' } as const;

  if (multi) {
    return (
      <fieldset className="choices" disabled={result !== null}>
        <legend className="sr-only">Choices</legend>
        {item.choices.map((c, i) => {
          const mark = result?.marks[i];
          return (
            <label key={i} className={`choice check ${mark ? `mark-${mark}` : ''}`}>
              <input
                type="checkbox"
                checked={selected.includes(i)}
                onChange={(e) => setSelected(e.target.checked ? [...selected, i] : selected.filter((x) => x !== i))}
              />
              <span>{letter(i)}. {c}</span>
              {mark && mark !== 'neutral' && <span className="mark">{markLabel[mark]}</span>}
            </label>
          );
        })}
        {result === null && (
          <button type="button" className="btn primary" disabled={selected.length === 0} onClick={() => onSubmit(selected)}>
            Check answer
          </button>
        )}
      </fieldset>
    );
  }

  return (
    <ul className="choices" role="list">
      {item.choices.map((c, i) => {
        const mark = result?.marks[i];
        return (
          <li key={i}>
            <button
              type="button"
              className={`choice ${mark ? `mark-${mark}` : ''}`}
              disabled={result !== null}
              onClick={() => {
                setSelected([i]);
                onSubmit([i]);
              }}
            >
              <span>{letter(i)}. {c}</span>
              {mark && mark !== 'neutral' && <span className="mark">{markLabel[mark]}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A between-questions mascot moment (never shown while a question is on screen). */
function Interstitial({ title, text, mood, button, onContinue, testId }: { title: string; text: string; mood: Mood; button: string; onContinue: () => void; testId: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);
  return (
    <section aria-labelledby="page-title" className="session-intro">
      <h1 id="page-title" tabIndex={-1}>{title}</h1>
      <MascotMoment text={text} mood={mood} testId={testId} />
      <button type="button" className="btn primary big-btn" onClick={onContinue} ref={btnRef}>{button}</button>
    </section>
  );
}

function Summary({ stats }: { stats: Stats }) {
  const { go, prefs } = useApp();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section aria-labelledby="page-title" className="summary">
      <h1 id="page-title" tabIndex={-1} ref={headingRef}>Session complete</h1>
      {prefs.mascot && <MascotMoment text={sessionEnd(stats.correct, stats.done)} mood="cheer" testId="mascot-end" />}
      <div className="card">
        <p className="lead" data-testid="summary">
          You answered {stats.done} {stats.done === 1 ? 'item' : 'items'}; {stats.correct} correct.
        </p>
        <p>Missed items come back sooner, so every mistake is a chance to lock it in.</p>
      </div>
      <button type="button" className="btn primary" onClick={() => go({ name: 'today' })}>Back to Today</button>
    </section>
  );
}
