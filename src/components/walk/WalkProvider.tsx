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
import { WALK_STEPS, anchorFor, isLastStep, nextIndex, stepAt, type Made, type WalkStep } from './walkSteps';

interface WalkValue {
  /** Only ever called because someone asked for it, from the sidebar menu. */
  startWalk: () => void;
  step: WalkStep | null;
  /** What the current stop points at, which can follow what you just made. */
  anchorId: string | null;
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

  // What you make along the way, so the last stops can point at your own
  // group, category and task rather than at the sample's.
  const [made, setMade] = useState<Made>({});
  const seen = useRef<Record<keyof Made, Set<string>>>({ group: new Set(), category: new Set(), task: new Set() });

  const startWalk = useCallback(() => {
    seen.current = {
      group: new Set(state.groups.map((g) => g.id)),
      category: new Set(state.categories.map((c) => c.id)),
      task: new Set(state.tasks.map((t) => t.id)),
    };
    setMade({});
    setIndex(0);
  }, [state.groups, state.categories, state.tasks]);

  useEffect(() => {
    if (index === null) return;
    const lists: [keyof Made, { id: string }[]][] = [
      ['group', state.groups],
      ['category', state.categories],
      ['task', state.tasks],
    ];
    const found: Made = {};
    for (const [kind, items] of lists) {
      for (const { id } of items) {
        if (seen.current[kind].has(id)) continue;
        seen.current[kind].add(id);
        found[kind] = id;
      }
    }
    if (Object.keys(found).length) setMade((m) => ({ ...m, ...found }));
  }, [index, state.groups, state.categories, state.tasks]);

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

  // Some stops invite you to do something. They move on when you do, and the
  // Next button means they never wait for it.
  const taskCount = state.tasks.length;
  const categoryCount = state.categories.length;
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
    const count = step.advanceOn === 'task' ? taskCount : step.advanceOn === 'category' ? categoryCount : blockCount;
    if (mark.current?.stepId !== step.id) {
      mark.current = { stepId: step.id, count };
      return;
    }
    if (count > mark.current.count) {
      mark.current = null;
      next();
    }
  }, [step, taskCount, categoryCount, blockCount, next]);

  const value = useMemo<WalkValue>(
    () => ({
      startWalk,
      step,
      anchorId: step ? anchorFor(step, made) : null,
      index,
      total: WALK_STEPS.length,
      last: index !== null && isLastStep(index),
      next,
      back,
      end,
    }),
    [startWalk, step, made, index, next, back, end],
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
