import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GaiaState } from '../types';
import { reducer, type Action } from './reducer';
import { loadState, saveState } from './persist';
import { Toast } from '../components/ui/Toast';

interface StoreValue {
  state: GaiaState;
  dispatch: (action: Action) => void;
}

interface FeedbackValue {
  /** Shows a toast. When `undo` is set, the toast offers to restore that snapshot. */
  notify: (message: string, undo?: GaiaState) => void;
  /** Politely announces a change to screen readers without a visible toast. */
  announce: (message: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);
const FeedbackContext = createContext<FeedbackValue | null>(null);

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function GaiaProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toast, setToast] = useState<{ id: number; message: string; undo?: GaiaState } | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const toastSeq = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(() => saveState(state), 150);
    return () => window.clearTimeout(handle);
  }, [state]);

  const notify = useCallback((message: string, undo?: GaiaState) => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, undo });
  }, []);

  const announce = useCallback((message: string) => {
    setLiveMessage('');
    window.setTimeout(() => setLiveMessage(message), 50);
  }, []);

  const store = useMemo(() => ({ state, dispatch }), [state]);
  const feedback = useMemo(() => ({ notify, announce }), [notify, announce]);

  return (
    <StoreContext.Provider value={store}>
      <FeedbackContext.Provider value={feedback}>
        {children}
        <div className="visually-hidden" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            onUndo={
              toast.undo
                ? () => {
                    dispatch({ type: 'state/replace', state: toast.undo! });
                    setToast(null);
                    announce('Change undone');
                  }
                : undefined
            }
            onDismiss={() => setToast(null)}
          />
        )}
      </FeedbackContext.Provider>
    </StoreContext.Provider>
  );
}

export function useGaia(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useGaia must be used inside GaiaProvider');
  return ctx;
}

export function useFeedback(): FeedbackValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside GaiaProvider');
  return ctx;
}
