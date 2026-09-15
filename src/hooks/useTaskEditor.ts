import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** The task editor sheet is addressed by `?task=<id>` on any route. */
export function useTaskEditor() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const taskId = params.get('task');

  const openTask = useCallback(
    (id: string) => {
      const next = new URLSearchParams(location.search);
      const alreadyOpen = next.has('task');
      next.set('task', id);
      navigate(
        { pathname: location.pathname, search: `?${next}` },
        { replace: alreadyOpen, state: { editorOpened: true } },
      );
    },
    [location.pathname, location.search, navigate],
  );

  const closeTask = useCallback(() => {
    if ((location.state as { editorOpened?: boolean } | null)?.editorOpened) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(location.search);
    next.delete('task');
    const search = next.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true });
  }, [location.pathname, location.search, location.state, navigate]);

  return { taskId, openTask, closeTask };
}
