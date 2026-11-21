/** A-03 / BETA-PREP: update prompt logic, tested with fake service-worker objects. */
import { describe, expect, it, vi } from 'vitest';
import { shouldOfferUpdate, watchForUpdate, type RegistrationLike, type SwContainerLike, type WorkerLike } from '../../src/app/update';

type Listener = () => void;
function fakeWorker(state: string): WorkerLike & { fire: (s: string) => void; posted: unknown[] } {
  const ls: Listener[] = [];
  const w = {
    state,
    posted: [] as unknown[],
    postMessage: (m: unknown) => void w.posted.push(m),
    addEventListener: (_t: 'statechange', cb: Listener) => void ls.push(cb),
    fire: (s: string) => {
      w.state = s;
      ls.forEach((l) => l());
    },
  };
  return w;
}
function fakeReg(waiting: WorkerLike | null = null): RegistrationLike & { found: (w: WorkerLike) => void; updates: number } {
  const ls: Listener[] = [];
  const reg = {
    waiting,
    installing: null as WorkerLike | null,
    updates: 0,
    update: () => {
      reg.updates++;
      return Promise.resolve();
    },
    addEventListener: (_t: 'updatefound', cb: Listener) => void ls.push(cb),
    found: (w: WorkerLike) => {
      reg.installing = w;
      ls.forEach((l) => l());
    },
  };
  return reg;
}
function fakeSw(reg: RegistrationLike, controlled: boolean): SwContainerLike & { change: () => void } {
  const ls: Listener[] = [];
  return { controller: controlled ? {} : null, register: () => Promise.resolve(reg), addEventListener: (_t: 'controllerchange', cb: Listener) => void ls.push(cb), change: () => ls.forEach((l) => l()) };
}

describe('watchForUpdate', () => {
  it('offers an update when a new version is already waiting, and reloads only after the student taps', async () => {
    const waiting = fakeWorker('installed');
    const sw = fakeSw(fakeReg(waiting), true);
    const reload = vi.fn();
    let apply: (() => void) | null = null;
    await watchForUpdate(sw, (a) => (apply = a), { reload });
    expect(apply).not.toBeNull();
    sw.change(); // another tab activated it: this tab must not reload by itself
    expect(reload).not.toHaveBeenCalled();
    (apply as unknown as () => void)();
    expect(waiting.posted).toEqual([{ type: 'SKIP_WAITING' }]);
    sw.change();
    sw.change();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('first install (no controller yet) is not an update', async () => {
    const reg = fakeReg();
    const sw = fakeSw(reg, false);
    const onReady = vi.fn();
    await watchForUpdate(sw, onReady, { reload: vi.fn() });
    const w = fakeWorker('installing');
    reg.found(w);
    w.fire('installed');
    expect(onReady).not.toHaveBeenCalled();
  });

  it('offers an update when a new worker finishes installing later', async () => {
    const reg = fakeReg();
    const sw = fakeSw(reg, true);
    const onReady = vi.fn();
    await watchForUpdate(sw, onReady, { reload: vi.fn() });
    const w = fakeWorker('installing');
    reg.found(w);
    expect(onReady).not.toHaveBeenCalled();
    reg.waiting = w;
    w.fire('installed');
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('offers an update when a new worker was already installing at registration', async () => {
    const reg = fakeReg();
    const w = fakeWorker('installing');
    reg.installing = w;
    const onReady = vi.fn();
    await watchForUpdate(fakeSw(reg, true), onReady, { reload: vi.fn() });
    reg.waiting = w;
    w.fire('installed');
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('checks for a new version when asked, at most once per interval', async () => {
    const reg = fakeReg();
    let t = 1_000_000;
    const handle = await watchForUpdate(fakeSw(reg, true), vi.fn(), { reload: vi.fn(), now: () => t, minCheckMs: 60_000 });
    handle.check();
    handle.check();
    expect(reg.updates).toBe(1);
    t += 61_000;
    handle.check();
    expect(reg.updates).toBe(2);
  });

  it('a failed registration never throws into the app', async () => {
    const sw: SwContainerLike = { controller: null, register: () => Promise.reject(new Error('nope')), addEventListener: () => undefined };
    await expect(watchForUpdate(sw, vi.fn(), { reload: vi.fn() })).resolves.toBeTruthy();
  });
});

describe('shouldOfferUpdate', () => {
  it('never during a session or onboarding', () => {
    expect(shouldOfferUpdate(true, 'session')).toBe(false);
    expect(shouldOfferUpdate(true, 'onboarding')).toBe(false);
    expect(shouldOfferUpdate(true, 'today')).toBe(true);
    expect(shouldOfferUpdate(false, 'today')).toBe(false);
  });
});
