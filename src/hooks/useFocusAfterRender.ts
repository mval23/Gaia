import { useCallback, useLayoutEffect, useRef } from 'react';

type Finder = () => HTMLElement | null | undefined;

/**
 * Moves focus once the next render has reached the page: after a change removes or
 * disables the control that had it, so keyboard users are not dropped back at the top.
 */
export function useFocusAfterRender() {
  const pending = useRef<Finder | null>(null);
  useLayoutEffect(() => {
    const find = pending.current;
    if (!find) return;
    pending.current = null;
    find()?.focus();
  });
  return useCallback((find: Finder) => {
    pending.current = find;
  }, []);
}
