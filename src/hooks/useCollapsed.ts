import { useCallback, useEffect, useState } from 'react';

const KEY = 'gaia:ui:collapsed';
const listeners = new Set<(s: Set<string>) => void>();
let current: Set<string> = read();

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function write(next: Set<string>) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // Non-essential UI preference.
  }
  listeners.forEach((l) => l(next));
}

/** Remembers which groups/categories are collapsed, shared across views. */
export function useCollapsed() {
  const [set, setSet] = useState(current);
  useEffect(() => {
    listeners.add(setSet);
    return () => {
      listeners.delete(setSet);
    };
  }, []);

  const isCollapsed = useCallback((key: string) => set.has(key), [set]);
  const toggle = useCallback((key: string, value?: boolean) => {
    const next = new Set(current);
    const collapse = value ?? !next.has(key);
    if (collapse) next.add(key);
    else next.delete(key);
    write(next);
  }, []);
  const setMany = useCallback((keys: string[], collapse: boolean) => {
    const next = new Set(current);
    keys.forEach((k) => (collapse ? next.add(k) : next.delete(k)));
    write(next);
  }, []);

  return { isCollapsed, toggle, setMany };
}
