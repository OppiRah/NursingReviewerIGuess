import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../app/context';
import { PageTitle } from '../components/PageTitle';
import { useAsync } from '../app/useAsync';
import { describeError } from '../app/errors';
import { ITEM_TYPE_LABEL, READINESS_HINT } from '../copy';
import { deleteDeck, deleteItem, updateDeck, updateItem } from '../data/repo';
import { isDateStr, localDateStr } from '../domain/dates';
import { answerKeyChanged, draftFromItem, validateDraft, type ItemDraft } from '../domain/editItem';
import { deckReadiness, formatPercent, seenCount } from '../domain/readiness';
import { letter } from '../domain/scoring';
import type { Item, ItemType } from '../domain/types';
import { examLabel } from './TodayScreen';

const MAX_LIST = 100;

export function DeckScreen({ deckId }: { deckId: string }) {
  const { db, scheduler, now, go, version, bump } = useApp();
  const state = useAsync(async () => {
    const deck = await db.decks.get(deckId);
    const items = deck ? await db.items.where('deckId').equals(deckId).toArray() : [];
    items.sort((a, b) => a.position - b.position);
    return { deck, items };
  }, [db, deckId, version]);

  const [query, setQuery] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeck, setConfirmDeck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    const q = query.trim().toLowerCase();
    return state.data.items.filter(
      (it) =>
        (!flaggedOnly || it.flagged) &&
        (!q || [it.question, it.back, it.rationale, ...it.choices].some((s) => s.toLowerCase().includes(q))),
    );
  }, [state, query, flaggedOnly]);

  if (state.status === 'loading') return <p className="muted" aria-busy="true">Loading deck…</p>;
  if (state.status === 'error') return <p role="alert">Couldn't load this deck: {state.error}</p>;
  const { deck, items } = state.data;
  if (!deck) {
    return (
      <section>
        <PageTitle>Deck not found</PageTitle>
        <button type="button" className="btn" onClick={() => go({ name: 'decks' })}>Back to decks</button>
      </section>
    );
  }

  /** Runs a change; shows a failure at the top of the screen. Returns whether it worked, so callers never confirm a failed save. */
  const run = async (fn: () => Promise<void>): Promise<boolean> => {
    setError(null);
    try {
      await fn();
      bump();
      return true;
    } catch (e) {
      setError(describeError(e));
      return false;
    }
  };

  const shown = filtered.slice(0, MAX_LIST);
  const flaggedCount = items.filter((i) => i.flagged).length;

  return (
    <section aria-labelledby="page-title">
      <button type="button" className="btn ghost back" onClick={() => go({ name: 'decks' })}>← All decks</button>
      <PageTitle>{deck.title}</PageTitle>
      <p className="muted">{examLabel(deck, now())}</p>
      <p>
        Readiness (estimated): <strong data-testid="deck-readiness">{formatPercent(deckReadiness(deck, items, scheduler, now()))}</strong>
        {' · '}
        <span data-testid="deck-seen">seen {seenCount(items, deck.id).seen} of {items.length}</span>
        <span className="hint" data-testid="readiness-hint"> · {READINESS_HINT}</span>
      </p>
      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="muted" data-testid="deck-notice">{notice}</p>}

      <details className="card">
        <summary>Deck details</summary>
        <DeckDetailsForm
          title={deck.title}
          examDate={deck.examDate ?? ''}
          onSave={(title, examDate) => run(() => updateDeck(db, deck.id, { title, examDate: examDate || null }, now()))}
        />
        {!confirmDeck ? (
          <button type="button" className="btn danger" onClick={() => setConfirmDeck(true)}>Delete this deck</button>
        ) : (
          <div className="confirm" role="group" aria-label="Confirm deck delete">
            <p><strong>Delete “{deck.title}” and its {items.length} items and review history?</strong> This can't be undone.</p>
            <div className="row">
              <button type="button" className="btn danger" onClick={() => run(async () => { await deleteDeck(db, deck.id); go({ name: 'decks' }); })}>Yes, delete deck</button>
              <button type="button" className="btn" onClick={() => setConfirmDeck(false)}>Cancel</button>
            </div>
          </div>
        )}
      </details>

      <div className="card search">
        <label htmlFor="item-search">Search items</label>
        <input id="item-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words in a question, choice or rationale" />
        <label className="inline-check">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Only items reported wrong ({flaggedCount})
        </label>
      </div>

      <p className="muted" role="status">
        {filtered.length === items.length ? `${items.length} items` : `${filtered.length} of ${items.length} items match`}
        {filtered.length > MAX_LIST && ` (showing the first ${MAX_LIST}; search to narrow)`}
      </p>

      {items.length === 0 && <p className="card empty">This deck has no items left.</p>}
      <ul className="item-list">
        {shown.map((it) => (
          <li key={it.id} className="card item-row" data-testid="item-row">
            {editing === it.id ? (
              <ItemEditor
                item={it}
                onCancel={() => setEditing(null)}
                onSave={(patch) =>
                  run(async () => {
                    await updateItem(db, it.id, patch, now());
                    setEditing(null);
                    // Same rule as updateItem (A-17): tell the student what a fixed answer key does.
                    setNotice(it.card.reps > 0 && answerKeyChanged(it, { ...it, ...patch }) ? 'Answer changed. This question will come back today, and an earlier "wrong" no longer counts as a mistake.' : null);
                  })
                }
              />
            ) : (
              <>
                <p className="item-meta">
                  <span className={`badge badge-${it.type}`}>{ITEM_TYPE_LABEL[it.type]}</span>
                  {it.flagged && <span className="badge badge-flag">⚑ Reported wrong</span>}
                </p>
                <p className="item-q">{it.question}</p>
                {it.type === 'flashcard' ? (
                  <p className="muted">A: {it.back}</p>
                ) : (
                  <p className="muted">Answer: {it.answer.map((i) => `${letter(i)}. ${it.choices[i] ?? ''}`).join('; ')}</p>
                )}
                <div className="row">
                  <button type="button" className="btn" onClick={() => setEditing(it.id)} aria-label={`Edit: ${it.question.slice(0, 60)}`}>Edit</button>
                  <button
                    type="button"
                    className="btn"
                    aria-pressed={it.flagged}
                    onClick={() => run(() => updateItem(db, it.id, { flagged: !it.flagged }))}
                  >
                    {it.flagged ? 'Clear report' : 'Report wrong'}
                  </button>
                  {confirmDelete === it.id ? (
                    <>
                      <button type="button" className="btn danger" onClick={() => run(async () => { await deleteItem(db, it.id); setConfirmDelete(null); })}>Confirm delete</button>
                      <button type="button" className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="btn danger" onClick={() => setConfirmDelete(it.id)}>Delete</button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeckDetailsForm({ title, examDate, onSave }: { title: string; examDate: string; onSave: (title: string, examDate: string) => Promise<boolean> }) {
  const { now } = useApp();
  const [t, setT] = useState(title);
  const [d, setD] = useState(examDate);
  const [saved, setSaved] = useState(false);
  const today = localDateStr(now());
  // A new exam date can't be in the past; an existing (now past) date may be kept while renaming.
  const datePast = d !== '' && d !== examDate && isDateStr(d) && d < today;
  const valid = t.trim().length > 0 && (d === '' || d === examDate || (isDateStr(d) && d >= today));
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!valid) return;
    setSaved(await onSave(t.trim(), d));
  };
  return (
    <form className="form" onSubmit={submit}>
      <label htmlFor="deck-edit-title">Deck title</label>
      <input id="deck-edit-title" type="text" maxLength={120} value={t} onChange={(e) => { setT(e.target.value); setSaved(false); }} />
      <label htmlFor="deck-edit-exam">Exam date</label>
      <input id="deck-edit-exam" type="date" value={d} onChange={(e) => { setD(e.target.value); setSaved(false); }} aria-describedby="deck-edit-exam-hint" />
      {datePast ? (
        <p id="deck-edit-exam-hint" role="alert" className="error">That date has already passed. Pick today or a later date, or leave it empty.</p>
      ) : (
        <p id="deck-edit-exam-hint" className="hint">A new date re-plans this deck: questions you have already seen come back before it.</p>
      )}
      <button type="submit" className="btn primary" disabled={!valid}>Save deck details</button>
      {saved && <p role="status" className="muted">Saved.</p>}
    </form>
  );
}

function ItemEditor({ item, onSave, onCancel }: { item: Item; onSave: (patch: Parameters<typeof updateItem>[2]) => Promise<boolean>; onCancel: () => void }) {
  const [draft, setDraft] = useState<ItemDraft>(() => draftFromItem(item));
  const [choicesText, setChoicesText] = useState(item.choices.join('\n'));
  const [error, setError] = useState<string | null>(null);
  // Once the student types in the answer box, their letters are used exactly as typed.
  const [answerTouched, setAnswerTouched] = useState(false);
  const original = answerTouched ? undefined : item;
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]): void => setDraft((d) => ({ ...d, [k]: v }));
  const id = (s: string): string => `edit-${item.id}-${s}`;
  // Show which choice will be saved as correct, so a changed list can never surprise the student.
  const preview = draft.type === 'flashcard' ? null : validateDraft({ ...draft, choices: choicesText.split('\n') }, original);
  const resolved = !preview ? '' : preview.ok ? `Will be saved as correct: ${preview.patch.answer.map((i) => `${letter(i)}. ${preview.patch.choices[i] ?? ''}`).join('; ')}` : 'Correct answer: not set yet (see the message when you save).';

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const r = validateDraft({ ...draft, choices: choicesText.split('\n') }, original);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    await onSave(r.patch);
  };

  return (
    <form className="form editor" onSubmit={submit} aria-label="Edit item">
      <label htmlFor={id('type')}>Type</label>
      <select id={id('type')} value={draft.type} onChange={(e) => set('type', e.target.value as ItemType)}>
        {(Object.keys(ITEM_TYPE_LABEL) as ItemType[]).map((t) => <option key={t} value={t}>{ITEM_TYPE_LABEL[t]}</option>)}
      </select>
      <label htmlFor={id('q')}>Question</label>
      <textarea id={id('q')} rows={3} value={draft.question} onChange={(e) => set('question', e.target.value)} />
      {draft.type === 'flashcard' ? (
        <>
          <label htmlFor={id('back')}>Answer (back of card)</label>
          <textarea id={id('back')} rows={2} value={draft.back} onChange={(e) => set('back', e.target.value)} />
        </>
      ) : (
        <>
          <label htmlFor={id('choices')}>Choices (one per line, in order a, b, c…)</label>
          <textarea id={id('choices')} rows={5} value={choicesText} onChange={(e) => setChoicesText(e.target.value)} />
          <label htmlFor={id('answer')}>Correct letter(s)</label>
          <input id={id('answer')} type="text" value={draft.answer} onChange={(e) => { setAnswerTouched(true); set('answer', e.target.value); }} placeholder="b   or   a, c" aria-describedby={id('resolved')} />
          <p id={id('resolved')} className="hint" data-testid="resolved-answer">{resolved}</p>
        </>
      )}
      <label htmlFor={id('rat')}>Rationale</label>
      <textarea id={id('rat')} rows={3} value={draft.rationale} onChange={(e) => set('rationale', e.target.value)} />
      {error && <p role="alert" className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="btn primary">Save changes</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
