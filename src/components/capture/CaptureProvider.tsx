import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CapturePalette } from './CapturePalette';

interface CaptureValue {
  openCapture: () => void;
}

const CaptureContext = createContext<CaptureValue | null>(null);

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
/** Shown next to Capture, the way Search shows Ctrl K. */
export const CAPTURE_KEYS = isMac ? '⌘I' : 'Ctrl I';

/**
 * Capture is reachable from anywhere: Ctrl/⌘ I, the sidebar, and Plan's header
 * all open the same one-line window.
 */
export function CaptureProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCapture = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() !== 'i') return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(() => ({ openCapture }), [openCapture]);

  return (
    <CaptureContext.Provider value={value}>
      {children}
      <CapturePalette open={open} onClose={() => setOpen(false)} />
    </CaptureContext.Provider>
  );
}

export function useCapture(): CaptureValue {
  const ctx = useContext(CaptureContext);
  if (!ctx) throw new Error('useCapture must be used inside CaptureProvider');
  return ctx;
}
