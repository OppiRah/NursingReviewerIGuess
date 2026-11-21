import { useEffect, useState } from 'react';
import { describeError } from './errors';

export type AsyncState<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ready'; data: T };

/** Run an async loader when deps change; ignores stale results. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ status: 'ready', data }),
      (e: unknown) => live && setState({ status: 'error', error: describeError(e) }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
