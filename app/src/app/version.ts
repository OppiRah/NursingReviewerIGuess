/** App version and build date, injected by Vite at build time from package.json (vite.config.ts `define`). */
declare const __APP_VERSION__: string | undefined;
declare const __BUILD_DATE__: string | undefined;

export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const BUILD_DATE: string = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : 'dev';

const KEY = 'lastError';

/** Remember the most recent unexpected error on this device only, for "Copy feedback info". */
export function installErrorLog(): void {
  const save = (message: string): void => {
    try {
      localStorage.setItem(KEY, `${new Date().toISOString().slice(0, 16)} ${message}`.slice(0, 300));
    } catch {
      /* storage unavailable */
    }
  };
  window.addEventListener('error', (e) => save(e.message || 'error'));
  window.addEventListener('unhandledrejection', (e) => save(e.reason instanceof Error ? `${e.reason.name}: ${e.reason.message}` : 'unhandled rejection'));
}

export function readLastError(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}
