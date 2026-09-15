import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isValidISODate, todayISO } from '../lib/dates';

/** Reads/writes a single search param while preserving the others (e.g. `task`). */
export function useParam(name: string) {
  const [params, setParams] = useSearchParams();
  const value = params.get(name);
  const set = useCallback(
    (next: string | null) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === null || next === '') p.delete(name);
          else p.set(name, next);
          return p;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [name, setParams],
  );
  return [value, set] as const;
}

/** Updates several search params in a single navigation. */
export function useSetParams() {
  const [, setParams] = useSearchParams();
  return useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '') p.delete(k);
            else p.set(k, v);
          }
          return p;
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  );
}

export function useDateParam() {
  const [raw, set] = useParam('date');
  const today = todayISO();
  const date = isValidISODate(raw) ? raw : today;
  const setDate = useCallback((next: string) => set(next === todayISO() ? null : next), [set]);
  return { date, setDate, isToday: date === today, today };
}
