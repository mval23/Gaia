import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Every editor sheet is addressed by its own search param, so the Back button
 * closes it and a link reopens it. Only one may be open at a time: opening one
 * drops the others, which is why nothing has to coordinate stacking.
 */
const SHEET_PARAMS = ['task', 'goal', 'habit'] as const;

export type SheetName = (typeof SHEET_PARAMS)[number];

export function useSheetParam(name: SheetName) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = params.get(name);

  const open = useCallback(
    (nextId: string) => {
      const search = new URLSearchParams(location.search);
      const alreadyOpen = SHEET_PARAMS.some((param) => search.has(param));
      for (const param of SHEET_PARAMS) if (param !== name) search.delete(param);
      search.set(name, nextId);
      navigate(
        { pathname: location.pathname, search: `?${search}` },
        // Push the first time so Back closes the sheet; swap in place afterwards.
        { replace: alreadyOpen, state: { editorOpened: true } },
      );
    },
    [location.pathname, location.search, navigate, name],
  );

  const close = useCallback(() => {
    if ((location.state as { editorOpened?: boolean } | null)?.editorOpened) {
      navigate(-1);
      return;
    }
    const search = new URLSearchParams(location.search);
    search.delete(name);
    const rest = search.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : '' }, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, name]);

  return { id, open, close };
}

export function useGoalEditor() {
  const { id, open, close } = useSheetParam('goal');
  return { goalId: id, openGoal: open, closeGoal: close };
}

export function useHabitEditor() {
  const { id, open, close } = useSheetParam('habit');
  return { habitId: id, openHabit: open, closeHabit: close };
}
