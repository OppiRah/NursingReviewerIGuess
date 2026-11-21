/**
 * App updates (AUDIT-001 A-03). The service worker is registered here, not by an auto-injected script,
 * so the app can tell the student when a new version is ready and apply it only when they tap.
 * - A new version downloads in the background and waits.
 * - The app shows "New version available — tap to update" (never during a session or onboarding).
 * - On tap: the waiting worker is told to take over, and the page reloads once it has.
 * - Nothing here ever reloads the page on its own.
 * The browser objects are passed in, so this is unit-tested with fakes.
 */

export interface WorkerLike {
  state: string;
  postMessage(message: unknown): void;
  addEventListener(type: 'statechange', cb: () => void): void;
}
export interface RegistrationLike {
  waiting: WorkerLike | null;
  installing: WorkerLike | null;
  update(): Promise<unknown>;
  addEventListener(type: 'updatefound', cb: () => void): void;
}
export interface SwContainerLike {
  controller: unknown;
  register(url: string, options?: { scope?: string }): Promise<RegistrationLike>;
  addEventListener(type: 'controllerchange', cb: () => void): void;
}

export interface UpdateOptions {
  reload: () => void;
  now?: () => number;
  /** Minimum time between explicit update checks. */
  minCheckMs?: number;
  url?: string;
}

export interface UpdateHandle {
  /** Ask the browser to look for a new version now (rate-limited). Safe to call often. */
  check: () => void;
}

export async function watchForUpdate(sw: SwContainerLike, onReady: (apply: () => void) => void, opts: UpdateOptions): Promise<UpdateHandle> {
  const now = opts.now ?? Date.now;
  const minCheckMs = opts.minCheckMs ?? 60 * 60 * 1000;
  let reg: RegistrationLike | null = null;
  let requested = false;
  let reloaded = false;
  let lastCheck = Number.NEGATIVE_INFINITY;

  sw.addEventListener('controllerchange', () => {
    // Only a tap on the banner in THIS window reloads it. Another tab updating never interrupts this one.
    if (!requested || reloaded) return;
    reloaded = true;
    opts.reload();
  });

  const offer = (): void => {
    onReady(() => {
      requested = true;
      const w = reg?.waiting;
      if (w) w.postMessage({ type: 'SKIP_WAITING' });
      else opts.reload(); // already activated elsewhere: a plain reload picks it up
    });
  };

  try {
    reg = await sw.register(opts.url ?? '/sw.js', { scope: '/' });
  } catch {
    return { check: () => undefined }; // no offline support in this browser/session; the app still works
  }
  // Some environments (blocked or stubbed service workers) resolve without a registration.
  if (!reg) return { check: () => undefined };
  const r = reg;
  // `controller` is null on the very first install: that is not an update.
  if (r.waiting && sw.controller) offer();
  const track = (w: WorkerLike | null): void => {
    if (!w) return;
    w.addEventListener('statechange', () => {
      if (w.state === 'installed' && sw.controller) offer();
    });
  };
  track(r.installing); // a download that started before we were listening
  r.addEventListener('updatefound', () => track(r.installing));

  return {
    check: () => {
      if (now() - lastCheck < minCheckMs) return;
      lastCheck = now();
      void r.update().catch(() => undefined);
    },
  };
}

/** The banner is never shown while a question is on screen or during first-run screens. */
export function shouldOfferUpdate(updateReady: boolean, routeName: string): boolean {
  return updateReady && routeName !== 'session' && routeName !== 'onboarding';
}
