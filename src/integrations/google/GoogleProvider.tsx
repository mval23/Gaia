import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GaiaState, Task, TimeBlock } from '../../types';
import { useGaia } from '../../store/GaiaProvider';
import { todayISO } from '../../lib/dates';
import { blockSignature } from '../../lib/calendar';
import {
  GoogleConsentError,
  describeGoogleError,
  disconnectGoogle,
  getGoogleToken,
  googleConfigured,
  isConnected,
} from '../../auth/google';
import {
  GoogleApiError,
  createGoogleEvent,
  deleteGoogleEvent,
  listGoogleCalendars,
  toGoogleEvent,
  updateGoogleEvent,
  type GoogleCalendar,
} from './calendar';

/**
 * Gaia's time blocks, written into one Google calendar.
 *
 * One direction only: what you plan here appears there, and is kept in step
 * when it moves, is renamed, is finished or is let go. Nothing comes back —
 * for that, subscribe to the same calendar in Settings ▸ Calendars, which is
 * what shows its events on the timeline.
 */

export type GoogleAccess = 'unconfigured' | 'disconnected' | 'needs-consent' | 'ready';

/** What Gaia has put in Google, keyed by time block id. */
interface LedgerEntry {
  eventId: string;
  calendarId: string;
  sig: string;
}
type Ledger = Record<string, LedgerEntry>;

interface GoogleValue {
  access: GoogleAccess;
  calendars: GoogleCalendar[] | null;
  /** True while blocks are being written. */
  syncing: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  loadCalendars: () => void;
}

const GoogleContext = createContext<GoogleValue | null>(null);

const LEDGER_KEY = 'gaia:google:events';

function readLedger(): Ledger {
  try {
    return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? '{}') as Ledger;
  } catch {
    return {};
  }
}

function writeLedger(ledger: Ledger) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    // Without storage the ledger lives in memory for this visit only.
  }
}

const isMissing = (err: unknown) =>
  err instanceof GoogleApiError && (err.status === 404 || err.status === 410 || err.status === 403);

function describe(err: unknown): string {
  if (err instanceof GoogleApiError) {
    if (err.status === 403) return 'Google refused the change. That calendar may be read-only.';
    if (err.status === 429) return 'Google asked Gaia to slow down. It will pick up again shortly.';
    return `Google Calendar said: ${err.message}`;
  }
  if (err instanceof TypeError) return "Couldn't reach Google. Check your connection.";
  return describeGoogleError(err) ?? 'That didn’t finish. Gaia will try again with your next change.';
}

export function GoogleProvider({ children }: { children: ReactNode }) {
  const { state } = useGaia();
  const linked = state.settings.googleCalendar;
  const [access, setAccess] = useState<GoogleAccess>(
    !googleConfigured ? 'unconfigured' : isConnected() ? 'ready' : 'disconnected',
  );
  const [calendars, setCalendars] = useState<GoogleCalendar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const ledgerRef = useRef<Ledger>(readLedger());
  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef(false);
  const again = useRef(false);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof GoogleConsentError || (err instanceof GoogleApiError && err.status === 401)) {
      setAccess('needs-consent');
    } else {
      setError(describe(err));
    }
  }, []);

  const connect = useCallback(async () => {
    await getGoogleToken(true);
    setAccess('ready');
    setError(null);
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectGoogle().catch(() => undefined);
    ledgerRef.current = {};
    writeLedger({});
    setCalendars(null);
    setError(null);
    setAccess('disconnected');
  }, []);

  const loadCalendars = useCallback(() => {
    if (access !== 'ready') return;
    listGoogleCalendars().then(setCalendars, handleError);
  }, [access, handleError]);

  useEffect(() => {
    if (access === 'ready' && calendars === null) loadCalendars();
  }, [access, calendars, loadCalendars]);

  /* ---------- Gaia → Google ---------- */

  const syncOnce = useCallback(async (snapshot: GaiaState) => {
    const calendarId = snapshot.settings.googleCalendar?.id;
    const ledger = ledgerRef.current;
    const save = () => writeLedger(ledger);

    // Every block that should be there: scheduled, still wanted, from today on.
    const desired = new Map<string, { task: Task; block: TimeBlock }>();
    if (calendarId) {
      for (const task of snapshot.tasks) {
        if (task.status === 'let-go') continue;
        for (const block of task.blocks) desired.set(block.id, { task, block });
      }
    }

    // What no longer belongs there goes first, so nothing is left behind.
    for (const [blockId, entry] of Object.entries(ledger)) {
      if (calendarId && entry.calendarId === calendarId && desired.has(blockId)) continue;
      try {
        await deleteGoogleEvent(entry.calendarId, entry.eventId);
      } catch (err) {
        if (!isMissing(err)) throw err;
      }
      delete ledger[blockId];
      save();
    }
    if (!calendarId) return;

    const today = todayISO();
    for (const [blockId, { task, block }] of desired) {
      const sig = blockSignature(task, block);
      const entry = ledger[blockId];
      if (entry?.sig === sig) continue;
      const payload = toGoogleEvent(task, block);
      if (entry) {
        try {
          await updateGoogleEvent(entry.calendarId, entry.eventId, payload);
          ledger[blockId] = { ...entry, sig };
          save();
          continue;
        } catch (err) {
          // Deleted in Google: put it back, since the block still exists here.
          if (!isMissing(err)) throw err;
        }
      } else if (block.date < today) {
        // Choosing a calendar doesn't copy your past into it.
        continue;
      }
      const eventId = await createGoogleEvent(calendarId, payload);
      ledger[blockId] = { eventId, calendarId, sig };
      save();
    }
  }, []);

  const runSync = useCallback(async () => {
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    setSyncing(true);
    try {
      do {
        again.current = false;
        await syncOnce(stateRef.current);
      } while (again.current);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      running.current = false;
      setSyncing(false);
    }
  }, [syncOnce, handleError]);

  // A moment's pause, so a drag that moves a block writes once, not every frame.
  useEffect(() => {
    if (access !== 'ready') return;
    const id = window.setTimeout(runSync, 800);
    return () => window.clearTimeout(id);
  }, [access, runSync, linked, state.tasks]);

  const value = useMemo<GoogleValue>(
    () => ({ access, calendars, syncing, error, connect, disconnect, loadCalendars }),
    [access, calendars, syncing, error, connect, disconnect, loadCalendars],
  );

  return <GoogleContext.Provider value={value}>{children}</GoogleContext.Provider>;
}

export function useGoogle(): GoogleValue {
  const ctx = useContext(GoogleContext);
  if (!ctx) throw new Error('useGoogle must be used inside GoogleProvider');
  return ctx;
}
