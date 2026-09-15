import { useEffect, useState } from 'react';

/** A number remembered in localStorage (a per-device UI preference). */
export function useStoredNumber(key: string, fallback: number) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        // Non-essential preference.
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [key, value]);

  return [value, setValue] as const;
}
