import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestTitleFocus } from '../components/PageTitle';
import { getDb } from '../data/db';
import { getSetting, setSetting } from '../data/repo';
import { getScheduler, type Scheduler } from '../domain/scheduler';
import { DeckScreen } from '../screens/DeckScreen';
import { DecksScreen } from '../screens/DecksScreen';
import { ImportScreen } from '../screens/ImportScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { SessionScreen } from '../screens/SessionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { Ctx, type AppCtx, type Prefs, type Route } from './context';
import { shouldOfferUpdate, watchForUpdate, type SwContainerLike } from './update';

const NAV: { route: Route; label: string }[] = [
  { route: { name: 'today' }, label: 'Today' },
  { route: { name: 'decks' }, label: 'Decks' },
  { route: { name: 'import' }, label: 'Import' },
  { route: { name: 'settings' }, label: 'Settings' },
];

/**
 * Browser history integration (BUILD-005), so the Android back button moves between screens.
 * Today (or onboarding) is the base entry at depth 0; every other screen pushes one entry.
 * Going to Today pops back to the base, so back on Today leaves the app as usual.
 */
interface NavState {
  nr: 1;
  route: Route;
  depth: number;
  /** The screen this entry was opened from, so "← All decks" goes back instead of piling up entries. */
  prev?: Route;
}

function readNav(state: unknown): NavState | null {
  return state && typeof state === 'object' && (state as NavState).nr === 1 ? (state as NavState) : null;
}

const sameRoute = (a: Route, b: Route): boolean =>
  a.name === b.name && (a.name !== 'deck' || (b.name === 'deck' && a.id === b.id)) && (a.name !== 'session' || (b.name === 'session' && a.mode === b.mode));

function LeaveSessionDialog({ onLeave, onStay }: { onLeave: () => void; onStay: () => void }) {
  const stayRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    stayRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onStay();
      if (e.key !== 'Tab') return;
      // Keep keyboard focus inside the dialog.
      const buttons = boxRef.current ? [...boxRef.current.querySelectorAll<HTMLButtonElement>('button')] : [];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Return focus to where it was (Stay), if that element is still on the page.
      if (before?.isConnected) before.focus();
    };
  }, [onStay]);
  return (
    <div className="modal-backdrop">
      <div ref={boxRef} className="modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-desc">
        <h2 id="leave-title">Leave this session?</h2>
        <p id="leave-desc">Your answers so far are saved.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onLeave}>Leave session</button>
          <button type="button" className="btn primary" ref={stayRef} onClick={onStay}>Stay</button>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [scheduler, setScheduler] = useState<Scheduler | null>(null);
  const [prefs, setPrefsState] = useState<Prefs | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'today' });
  const [version, setVersion] = useState(0);
  const [leaveAsk, setLeaveAsk] = useState(false);
  /** Set when a new version has downloaded and is waiting; calling it applies the update and reloads. */
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null);
  const [updating, setUpdating] = useState(false);
  const routeRef = useRef<Route>(route);
  /** Set when the app itself moves back in history, so leaving a session needs no confirmation. */
  const silentPopRef = useRef(false);

  const show = useCallback((r: Route) => {
    // Move focus to the new screen's heading for keyboard and screen-reader users.
    requestTitleFocus();
    routeRef.current = r;
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const db = getDb();
    Promise.all([getScheduler(), getSetting<boolean>(db, 'onboarded', false), getSetting<boolean>(db, 'mascot', true)]).then(
      ([s, onboarded, mascot]) => {
        setScheduler(s);
        setPrefsState({ mascot });
        const base: Route = onboarded ? { name: 'today' } : { name: 'onboarding' };
        // A launch always opens Today (BUILD-001 decision 5). After a reload deep in the app
        // (BUILD-006), the older entries are still in history, so first move back to the base entry:
        // then back on Today leaves the app, as on a fresh start.
        const cur = readNav(history.state);
        if (cur && cur.depth > 0) {
          // history.go() is asynchronous: don't replaceState now (it would rewrite the deep entry).
          // The popstate handler shows the base entry once the move lands.
          silentPop(() => history.go(-cur.depth));
          // If the move never lands (history shorter than expected), make this entry the base instead.
          window.setTimeout(() => {
            if ((readNav(history.state)?.depth ?? 0) > 0) history.replaceState({ nr: 1, route: base, depth: 0 } satisfies NavState, '');
          }, 300);
          routeRef.current = base;
          setRoute(base);
          return;
        }
        history.replaceState({ nr: 1, route: base, depth: 0 } satisfies NavState, '');
        routeRef.current = base;
        setRoute(base);
      },
      (e: unknown) => setFailed(e instanceof Error ? e.message : String(e)),
    );
    // Ask the browser to keep our data (best effort; mostly helps installed PWAs).
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  // Service worker: registered by the app (production builds only) so updates are offered, never forced.
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let check: (() => void) | null = null;
    void watchForUpdate(navigator.serviceWorker as unknown as SwContainerLike, (apply) => setApplyUpdate(() => apply), { reload: () => window.location.reload() }).then((h) => {
      check = h.check;
    });
    // Installed apps are often resumed, not restarted: look for a new version when the app comes back.
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') check?.();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  /** The app's own history move; cleared by the popstate it causes (or a timer, if none ever comes). */
  const silentTimerRef = useRef<number | undefined>(undefined);
  const silentPop = useCallback((move: () => void) => {
    silentPopRef.current = true;
    window.clearTimeout(silentTimerRef.current);
    silentTimerRef.current = window.setTimeout(() => (silentPopRef.current = false), 1000);
    move();
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent): void => {
      const target = readNav(e.state)?.route ?? { name: 'today' };
      // Forward into an old session entry: don't silently restart a session; step back instead.
      if (target.name === 'session' && routeRef.current.name !== 'session') {
        silentPop(() => history.back());
        return;
      }
      if (routeRef.current.name === 'session' && !silentPopRef.current) {
        // Back during a session: stay on the session entry and ask first.
        history.pushState({ nr: 1, route: routeRef.current, depth: (readNav(e.state)?.depth ?? 0) + 1 } satisfies NavState, '');
        setLeaveAsk(true);
        return;
      }
      silentPopRef.current = false;
      setLeaveAsk(false);
      show(target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [show, silentPop]);

  const go = useCallback(
    (r: Route) => {
      // A history move is in flight: history.state is stale until its popstate arrives. Ignore the tap.
      if (silentPopRef.current) return;
      const cur = readNav(history.state);
      const depth = cur?.depth ?? 0;
      if (r.name === 'today') {
        if (depth > 0) {
          // Pop back to the base entry; the popstate handler shows Today.
          silentPop(() => history.go(-depth));
          return;
        }
        history.replaceState({ nr: 1, route: r, depth: 0 } satisfies NavState, '');
        show(r);
        return;
      }
      if (sameRoute(r, routeRef.current)) {
        show(r);
        return;
      }
      // Going to the screen this one was opened from ("← All decks", after deleting a deck): go back.
      if (depth > 0 && cur?.prev && sameRoute(r, cur.prev)) {
        silentPop(() => history.back());
        return;
      }
      // Leaving onboarding: Today becomes the base entry, so back never shows onboarding again.
      if (routeRef.current.name === 'onboarding') {
        history.replaceState({ nr: 1, route: { name: 'today' }, depth: 0 } satisfies NavState, '');
        history.pushState({ nr: 1, route: r, depth: 1, prev: { name: 'today' } } satisfies NavState, '');
      } else {
        history.pushState({ nr: 1, route: r, depth: depth + 1, prev: routeRef.current } satisfies NavState, '');
      }
      show(r);
    },
    [show, silentPop],
  );

  const leaveSession = useCallback(() => {
    setLeaveAsk(false);
    silentPop(() => history.back());
  }, [silentPop]);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const setPrefs = useCallback(async (p: Prefs) => {
    setPrefsState(p); // optimistic: the control reflects the click immediately
    await setSetting(getDb(), 'mascot', p.mascot);
  }, []);
  const reloadPrefs = useCallback(async () => {
    setPrefsState({ mascot: await getSetting<boolean>(getDb(), 'mascot', true) });
  }, []);

  const ctx = useMemo<AppCtx | null>(
    () => (scheduler && prefs ? { db: getDb(), scheduler, now: () => new Date(), go, version, bump, prefs, setPrefs, reloadPrefs } : null),
    [scheduler, prefs, go, version, bump, setPrefs, reloadPrefs],
  );

  if (failed) {
    return (
      <main className="screen">
        <h1>Something went wrong</h1>
        <p>The app couldn't open its storage on this device. If you're in a private window, try a normal one.</p>
        <p className="muted">{failed}</p>
      </main>
    );
  }
  if (!ctx) return <main className="screen" aria-busy="true"><p className="muted">Loading…</p></main>;

  const hideNav = route.name === 'session' || route.name === 'onboarding';
  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        <main className="screen" id="main">
          {route.name === 'onboarding' && <OnboardingScreen />}
          {route.name === 'today' && <TodayScreen />}
          {route.name === 'session' && <SessionScreen mode={route.mode} />}
          {route.name === 'import' && <ImportScreen />}
          {route.name === 'decks' && <DecksScreen />}
          {route.name === 'deck' && <DeckScreen deckId={route.id} />}
          {route.name === 'settings' && <SettingsScreen />}
        </main>
        {shouldOfferUpdate(applyUpdate !== null, route.name) && (
          <div className="update-banner" role="status" data-testid="update-banner">
            <button
              type="button"
              className="btn primary"
              disabled={updating}
              onClick={() => {
                setUpdating(true);
                applyUpdate?.();
                // If the new version never takes over, a plain reload still picks it up.
                // Never while a session is open (the student may have started one meanwhile).
                window.setTimeout(() => {
                  if (routeRef.current.name !== 'session') window.location.reload();
                  else setUpdating(false);
                }, 4000);
              }}
            >
              {updating ? 'Updating…' : 'New version available — tap to update'}
            </button>
          </div>
        )}
        {leaveAsk && <LeaveSessionDialog onLeave={leaveSession} onStay={() => setLeaveAsk(false)} />}
        {!hideNav && (
          <nav className="tabbar" aria-label="Main">
            {NAV.map((n) => (
              <button
                key={n.label}
                type="button"
                className="tab"
                aria-current={route.name === n.route.name || (route.name === 'deck' && n.route.name === 'decks') ? 'page' : undefined}
                onClick={() => go(n.route)}
              >
                {n.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </Ctx.Provider>
  );
}
