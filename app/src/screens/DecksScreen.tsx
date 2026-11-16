import { useApp } from '../app/context';
import { PageTitle } from '../components/PageTitle';
import { useAsync } from '../app/useAsync';
import { loadAll } from '../data/repo';
import { deckReadiness, formatPercent } from '../domain/readiness';
import { examLabel } from './TodayScreen';

export function DecksScreen() {
  const { db, scheduler, now, go, version } = useApp();
  const state = useAsync(() => loadAll(db), [db, version]);

  if (state.status === 'loading') return <p className="muted" aria-busy="true">Loading decks…</p>;
  if (state.status === 'error') return <p role="alert">Couldn't load decks: {state.error}</p>;
  const { decks, items } = state.data;
  const t = now();

  return (
    <section aria-labelledby="page-title">
      <PageTitle>Decks</PageTitle>
      {decks.length === 0 ? (
        <div className="card empty">
          <p className="lead">No decks yet.</p>
          <button type="button" className="btn primary" onClick={() => go({ name: 'import' })}>Import a reviewer</button>
        </div>
      ) : (
        <ul className="deck-list">
          {decks.map((d) => {
            const own = items.filter((i) => i.deckId === d.id);
            const flagged = own.filter((i) => i.flagged).length;
            return (
              <li key={d.id} className="card">
                <h2 className="deck-title">{d.title}</h2>
                <p className="muted">{examLabel(d, t)}</p>
                <p>
                  {own.length} {own.length === 1 ? 'item' : 'items'} · Readiness (estimated): <strong>{formatPercent(deckReadiness(d, items, scheduler, t))}</strong>
                </p>
                {flagged > 0 && <p className="flag-note">⚑ {flagged} reported wrong: check {flagged === 1 ? 'it' : 'them'} against your source</p>}
                <button type="button" className="btn" onClick={() => go({ name: 'deck', id: d.id })} aria-label={`Open ${d.title}`}>
                  Open
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
