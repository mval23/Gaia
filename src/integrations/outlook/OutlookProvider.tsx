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
import type { AccountInfo } from '@azure/msal-browser';
import type { GaiaState, Task, TimeBlock } from '../../types';
import { useGaia } from '../../store/GaiaProvider';
import { GROUP_ALL, sortedGroups } from '../../store/selectors';
import { fromISODate, todayISO } from '../../lib/dates';
import {
  ConsentNeededError,
  currentAccount,
  getToken,
  microsoftConfigured,
  signIn as msSignIn,
  signOut as msSignOut,
} from '../../auth/microsoft';
import {
  GraphError,
  calendarView,
  createEvent,
  deleteEvent,
  listCalendars,
  updateEvent,
  type OutlookCalendar,
} from './graph';
import { blockSignature, eventSegments, rangeOf, toGraphEvent, type GraphEvent, type OutlookEvent } from './events';

/**
 * - unconfigured: no app registration in .env.local
 * - signed-out / needs-consent: nothing is read or written until the person acts
 * - ready: events are fetched and linked groups' time blocks are mirrored
 */
export type OutlookAccess = 'loading' | 'unconfigured' | 'signed-out' | 'needs-consent' | 'ready';

/** What Gaia has put in Outlook, keyed by time block id. */
interface LedgerEntry {
  eventId: string;
  calendarId: string;
  sig: string;
}
type Ledger = Record<string, LedgerEntry>;

interface CachedView {
  events: GraphEvent[];
  at: number;
}

interface OutlookValue {
  access: OutlookAccess;
  account: AccountInfo | null;
  calendars: OutlookCalendar[] | null;
  syncError: string | null;
  signIn: () => Promise<AccountInfo>;
  signOut: () => Promise<void>;
  /** Asks Microsoft for calendar access. Call only from a click. */
  allowAccess: () => Promise<void>;
  loadCalendars: () => void;
  // Internal, for useOutlookEvents.
  cache: Map<string, CachedView>;
  ensureView: (calendarId: string, from: string, to: string) => void;
  ownEventIds: Set<string>;
  epoch: number;
}

const OutlookContext = createContext<OutlookValue | null>(null);

const STALE_MS = 2 * 60_000;
const REFRESH_MS = 5 * 60_000;

const viewKey = (calendarId: string, from: string, to: string) => `${calendarId}|${from}|${to}`;
const ledgerKey = (account: AccountInfo) => `gaia:outlook:${account.homeAccountId}`;

function readLedger(account: AccountInfo): Ledger {
  try {
    return JSON.parse(localStorage.getItem(ledgerKey(account)) ?? '{}') as Ledger;
  } catch {
    return {};
  }
}

function writeLedger(account: AccountInfo, ledger: Ledger) {
  try {
    localStorage.setItem(ledgerKey(account), JSON.stringify(ledger));
  } catch {
    // Without storage the ledger lives in memory for this visit only.
  }
}

const isMissing = (err: unknown) => err instanceof GraphError && (err.status === 404 || err.status === 410);

function describe(err: unknown): string {
  if (err instanceof GraphError && err.status === 403) return "Outlook refused the change. The calendar may be read-only.";
  if (err instanceof TypeError) return "Couldn't reach Outlook. Check your connection.";
  return 'Outlook sync hit a problem. It will try again with your next change.';
}

export function OutlookProvider({ children }: { children: ReactNode }) {
  const { state } = useGaia();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [access, setAccess] = useState<OutlookAccess>(microsoftConfigured ? 'loading' : 'unconfigured');
  const [calendars, setCalendars] = useState<OutlookCalendar[] | null>(null);
  const [cache, setCache] = useState<Map<string, CachedView>>(() => new Map());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [ledgerVersion, setLedgerVersion] = useState(0);

  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const inflight = useRef(new Set<string>());
  const ledgerRef = useRef<Ledger>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ConsentNeededError || (err instanceof GraphError && err.status === 401)) {
      setAccess('needs-consent');
    } else {
      setSyncError(describe(err));
    }
  }, []);

  const adopt = useCallback(async (next: AccountInfo | null) => {
    setAccount(next);
    setCalendars(null);
    setCache(new Map());
    if (!next) {
      ledgerRef.current = {};
      setAccess(microsoftConfigured ? 'signed-out' : 'unconfigured');
      return;
    }
    ledgerRef.current = readLedger(next);
    setLedgerVersion((v) => v + 1);
    try {
      await getToken();
      setAccess('ready');
    } catch (err) {
      setAccess(err instanceof ConsentNeededError ? 'needs-consent' : 'ready');
    }
  }, []);

  useEffect(() => {
    if (!microsoftConfigured) return;
    currentAccount().then(adopt, () => adopt(null));
  }, [adopt]);

  // Keep what's on screen fresh: on return to the tab, and every few minutes.
  useEffect(() => {
    if (access !== 'ready') return;
    const bump = () => setEpoch((e) => e + 1);
    const id = window.setInterval(bump, REFRESH_MS);
    window.addEventListener('focus', bump);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', bump);
    };
  }, [access]);

  const signIn = useCallback(async () => {
    const next = await msSignIn();
    await adopt(next);
    return next;
  }, [adopt]);

  const signOut = useCallback(async () => {
    await msSignOut();
    await adopt(null);
  }, [adopt]);

  const allowAccess = useCallback(async () => {
    await getToken(true);
    setSyncError(null);
    setAccess('ready');
  }, []);

  const loadCalendars = useCallback(() => {
    if (access !== 'ready') return;
    listCalendars().then(setCalendars, handleError);
  }, [access, handleError]);

  // The group menu lists calendars, so have them ready once access is.
  useEffect(() => {
    if (access === 'ready' && calendars === null) loadCalendars();
  }, [access, calendars, loadCalendars]);

  const ensureView = useCallback(
    (calendarId: string, from: string, to: string) => {
      const key = viewKey(calendarId, from, to);
      const hit = cacheRef.current.get(key);
      if ((hit && Date.now() - hit.at < STALE_MS) || inflight.current.has(key)) return;
      inflight.current.add(key);
      calendarView(calendarId, fromISODate(from), fromISODate(to))
        .then((events) => setCache((m) => new Map(m).set(key, { events, at: Date.now() })))
        .catch(handleError)
        .finally(() => inflight.current.delete(key));
    },
    [handleError],
  );

  /* ---------- Gaia → Outlook ---------- */

  const syncing = useRef(false);
  const again = useRef(false);

  const syncOnce = useCallback(async (snapshot: GaiaState, who: AccountInfo) => {
    const ledger = ledgerRef.current;
    const save = () => {
      writeLedger(who, ledger);
      setLedgerVersion((v) => v + 1);
    };
    const calendarOfCategory = new Map(
      snapshot.categories.map((c) => [c.id, snapshot.groups.find((g) => g.id === c.groupId)?.calendar?.id]),
    );
    const desired = new Map<string, { calendarId: string; task: Task; block: TimeBlock }>();
    for (const task of snapshot.tasks) {
      const calendarId = calendarOfCategory.get(task.categoryId);
      if (!calendarId || task.status === 'let-go') continue;
      for (const block of task.blocks) desired.set(block.id, { calendarId, task, block });
    }

    // Removed blocks, unlinked groups and moved tasks first, so nothing is left behind.
    for (const [blockId, entry] of Object.entries(ledger)) {
      if (desired.get(blockId)?.calendarId === entry.calendarId) continue;
      try {
        await deleteEvent(entry.eventId);
      } catch (err) {
        if (!isMissing(err)) throw err;
      }
      delete ledger[blockId];
      save();
    }

    const today = todayISO();
    for (const [blockId, { calendarId, task, block }] of desired) {
      const sig = blockSignature(task, block);
      const entry = ledger[blockId];
      if (entry?.sig === sig) continue;
      const payload = toGraphEvent(task, block);
      if (entry) {
        try {
          await updateEvent(entry.eventId, payload);
          ledger[blockId] = { ...entry, sig };
          save();
          continue;
        } catch (err) {
          // Deleted in Outlook: put it back, since the block still exists here.
          if (!isMissing(err)) throw err;
        }
      } else if (block.date < today) {
        // Linking a group doesn't copy its past into Outlook.
        continue;
      }
      const eventId = await createEvent(calendarId, payload);
      ledger[blockId] = { eventId, calendarId, sig };
      save();
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!account) return;
    if (syncing.current) {
      again.current = true;
      return;
    }
    syncing.current = true;
    try {
      do {
        again.current = false;
        await syncOnce(stateRef.current, account);
      } while (again.current);
      setSyncError(null);
    } catch (err) {
      handleError(err);
    } finally {
      syncing.current = false;
    }
  }, [account, syncOnce, handleError]);

  useEffect(() => {
    if (access !== 'ready') return;
    const id = window.setTimeout(runSync, 800);
    return () => window.clearTimeout(id);
  }, [access, runSync, state.tasks, state.groups, state.categories]);

  const ownEventIds = useMemo(
    () => new Set(Object.values(ledgerRef.current).map((e) => e.eventId)),
    // ledgerRef is mutated in place; the version says when to look again.
    [ledgerVersion],
  );

  const value = useMemo<OutlookValue>(
    () => ({
      access,
      account,
      calendars,
      syncError,
      signIn,
      signOut,
      allowAccess,
      loadCalendars,
      cache,
      ensureView,
      ownEventIds,
      epoch,
    }),
    [access, account, calendars, syncError, signIn, signOut, allowAccess, loadCalendars, cache, ensureView, ownEventIds, epoch],
  );

  return <OutlookContext.Provider value={value}>{children}</OutlookContext.Provider>;
}

export function useOutlook(): OutlookValue {
  const ctx = useContext(OutlookContext);
  if (!ctx) throw new Error('useOutlook must be used inside OutlookProvider');
  return ctx;
}

/**
 * Outlook events for the given days, from the calendars linked to groups (or to
 * one group). Events Gaia created from its own time blocks are left out, since
 * those blocks are already on screen.
 */
export function useOutlookEvents(dates: string[], groupFilter: string = GROUP_ALL): Map<string, OutlookEvent[]> {
  const { access, cache, ensureView, ownEventIds, epoch } = useOutlook();
  const { state } = useGaia();
  const { from, to } = rangeOf(dates);

  const links = useMemo(() => {
    const byCalendar = new Map<string, string>();
    for (const g of sortedGroups(state)) {
      if (!g.calendar || (groupFilter !== GROUP_ALL && g.id !== groupFilter)) continue;
      if (!byCalendar.has(g.calendar.id)) byCalendar.set(g.calendar.id, g.id);
    }
    return byCalendar;
  }, [state, groupFilter]);
  const linkKey = [...links].join(',');

  useEffect(() => {
    if (access !== 'ready') return;
    for (const calendarId of links.keys()) ensureView(calendarId, from, to);
    // linkKey stands in for `links`, which is rebuilt on every state change.
  }, [access, ensureView, from, to, linkKey, epoch]);

  return useMemo(() => {
    const map = new Map<string, OutlookEvent[]>();
    if (access !== 'ready') return map;
    for (const [calendarId, groupId] of links) {
      const view = cache.get(viewKey(calendarId, from, to));
      for (const event of view?.events ?? []) {
        if (ownEventIds.has(event.id)) continue;
        for (const seg of eventSegments(event, calendarId, groupId)) {
          if (seg.date < from || seg.date >= to) continue;
          const list = map.get(seg.date) ?? [];
          list.push(seg);
          map.set(seg.date, list);
        }
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.startMin - b.startMin);
    return map;
    // linkKey stands in for `links` here too.
  }, [access, cache, from, to, linkKey, ownEventIds]);
}
