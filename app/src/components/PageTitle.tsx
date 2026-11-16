import { useCallback, useEffect, useRef, type ReactNode, type Ref } from 'react';

/**
 * Focus management for screen changes. Navigation calls requestTitleFocus(); the next
 * PageTitle to mount takes focus. This works for screens that render their heading only
 * after async data loads, and never steals focus on the first page load.
 */
let pending = false;
export function requestTitleFocus(): void {
  pending = true;
}

export function PageTitle({ children, className, ref }: { children: ReactNode; className?: string; ref?: Ref<HTMLHeadingElement> }) {
  const inner = useRef<HTMLHeadingElement | null>(null);
  const setRef = useCallback(
    (el: HTMLHeadingElement | null) => {
      inner.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useEffect(() => {
    if (pending) {
      pending = false;
      inner.current?.focus();
    }
  }, []);
  return (
    <h1 id="page-title" tabIndex={-1} className={className} ref={setRef}>
      {children}
    </h1>
  );
}
