import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGaia } from '../../store/GaiaProvider';
import { WALK_STEPS, isLastStep, nextIndex, stepAt, type WalkStep } from './walkSteps';

interface WalkValue {
  /** Only ever called because someone asked for it, from the sidebar menu. */
  startWalk: () => void;
  step: WalkStep | null;
  index: number | null;
  total: number;
  last: boolean;
  next: () => void;
  back: () => void;
  end: () => void;
}

const WalkContext = createContext<WalkValue | null>(null);

/**
 * A short walk through Gaia, offered under "your planner" in the sidebar.
 * It never starts by itself, so there is no first-run flag to save and no
 * existing planner that suddenly gets a window over its Tuesday.
 */
export function WalkProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useGaia();
  const step = stepAt(index);

  const startWalk = useCallback(() => setIndex(0), []);
  const end = useCallback(() => setIndex(null), []);
  const next = useCallback(() => setIndex((i) => (i === null ? null : nextIndex(i))), []);
  const back = useCallback(() => setIndex((i) => (i === null || i === 0 ? i : i - 1)), []);

  // Read the current path without making the walk chase it: if you wander off
  // mid-walk that is your business, and only a new stop moves the page.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  useEffect(() => {
    if (step && pathRef.current !== step.path) navigate(step.path);
    // Each stop navigates once, when it becomes the current stop.
  }, [step, navigate]);

  // Two stops invite you to do something. They move on when you do, and the
  // Next button means they never wait for it.
  const taskCount = state.tasks.length;
  const blockCount = useMemo(
    () => state.tasks.reduce((n, task) => n + task.blocks.length, 0),
    [state.tasks],
  );
  const mark = useRef<{ stepId: string; count: number } | null>(null);

  useEffect(() => {
    if (!step?.advanceOn) {
      mark.current = null;
      return;
    }
    const count = step.advanceOn === 'task' ? taskCount : blockCount;
    if (mark.current?.stepId !== step.id) {
      mark.current = { stepId: step.id, count };
      return;
    }
    if (count > mark.current.count) {
      mark.current = null;
      next();
    }
  }, [step, taskCount, blockCount, next]);

  const value = useMemo<WalkValue>(
    () => ({
      startWalk,
      step,
      index,
      total: WALK_STEPS.length,
      last: index !== null && isLastStep(index),
      next,
      back,
      end,
    }),
    [startWalk, step, index, next, back, end],
  );

  return (
    <WalkContext.Provider value={value}>
      {children}
    </WalkContext.Provider>
  );
}

export function useWalk(): WalkValue {
  const ctx = useContext(WalkContext);
  if (!ctx) throw new Error('useWalk must be used inside WalkProvider');
  return ctx;
}
