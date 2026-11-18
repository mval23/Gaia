import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CalendarFeed } from '../../types';
import { useGaia } from '../../store/GaiaProvider';
import { GROUP_ALL } from '../../store/selectors';
import { addDays, fromISODate } from '../../lib/dates';
import { icsEventsBetween } from '../../lib/ics';
import { mergeEventDays, splitIntoDays, type DayEvent } from '../../lib/calendar';
import { cloudConfigured, supabase } from '../../auth/supabase';

/**
 * Calendars kept somewhere else, read through their own secret address.
 *
 * Gaia asks the server for the feed (a browser isn't allowed to fetch one
 * directly), keeps the text, and works out what falls on the days on screen.
 * Nothing is written back: these events belong to the calendar they came from.
 */

/** How one feed is doing, so Settings can say so plainly. */
export interface FeedState {
  status: 'loading' | 'ready' | 'error';
  /** Why the last read didn't work, in words worth showing. */
  error?: string;
  fetchedAt?: number;
}

interface Cached {
  text: string;
  at: number;
}

interface FeedsValue {
  states: Map<string, FeedState>;
  /** Reads every feed again now. */
  refresh: () => void;
}

/** What the provider holds: the public value, plus the text it has fetched. */
interface FeedsInternal extends FeedsValue {
  cache: Map<string, Cached>;
}

const FeedsContext = createContext<FeedsInternal | null>(null);

/** A calendar is not a live thing; a quarter of an hour late is nobody's problem. */
const REFRESH_MS = 15 * 60_000;

async function fetchFeed(url: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (cloudConfigured) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`/api/ics?url=${encodeURIComponent(url)}`, { headers }).catch(() => null);
  if (!response) throw new Error("Gaia couldn't reach the server to read that calendar.");
  if (!response.ok) {
    const said = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(said?.error ?? 'That calendar could not be read.');
  }
  return response.text();
}

export function FeedsProvider({ children }: { children: ReactNode }) {
  const { state } = useGaia();
  const feeds = state.calendarFeeds;
  const [cache, setCache] = useState<Map<string, Cached>>(() => new Map());
  const [states, setStates] = useState<Map<string, FeedState>>(() => new Map());
  const [epoch, setEpoch] = useState(0);
  const inflight = useRef(new Set<string>());

  const read = useCallback((feed: CalendarFeed) => {
    if (inflight.current.has(feed.id)) return;
    inflight.current.add(feed.id);
    setStates((m) => new Map(m).set(feed.id, { ...m.get(feed.id), status: 'loading' }));
    fetchFeed(feed.url)
      .then((text) => {
        setCache((m) => new Map(m).set(feed.id, { text, at: Date.now() }));
        setStates((m) => new Map(m).set(feed.id, { status: 'ready', fetchedAt: Date.now() }));
      })
      .catch((err: Error) => {
        setStates((m) => new Map(m).set(feed.id, { status: 'error', error: err.message }));
      })
      .finally(() => inflight.current.delete(feed.id));
  }, []);

  // Each feed is read when it appears, when its address changes, and now and then.
  const signature = feeds.map((f) => `${f.id}:${f.url}`).join(',');
  useEffect(() => {
    for (const feed of feeds) read(feed);
    // `signature` stands in for `feeds`, which is rebuilt on every state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, epoch, read]);

  useEffect(() => {
    if (!feeds.length) return;
    const bump = () => setEpoch((e) => e + 1);
    const id = window.setInterval(bump, REFRESH_MS);
    window.addEventListener('focus', bump);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', bump);
    };
  }, [feeds.length]);

  // A feed that has been removed leaves nothing behind.
  useEffect(() => {
    const live = new Set(feeds.map((f) => f.id));
    setCache((m) => (([...m.keys()].every((id) => live.has(id)) ? m : new Map([...m].filter(([id]) => live.has(id))))));
    setStates((m) => (([...m.keys()].every((id) => live.has(id)) ? m : new Map([...m].filter(([id]) => live.has(id))))));
  }, [signature]);

  const value = useMemo<FeedsInternal>(() => ({ states, cache, refresh: () => setEpoch((e) => e + 1) }), [states, cache]);

  return <FeedsContext.Provider value={value}>{children}</FeedsContext.Provider>;
}

export function useFeeds(): FeedsValue {
  const ctx = useContext(FeedsContext);
  if (!ctx) throw new Error('useFeeds must be used inside FeedsProvider');
  return ctx;
}

/**
 * Events from subscribed calendars for the given days, by date. A feed linked
 * to a group shows in that group's colour and is hidden when another group is
 * being looked at on its own.
 */
export function useFeedEvents(dates: string[], groupFilter: string = GROUP_ALL): Map<string, DayEvent[]> {
  const ctx = useContext(FeedsContext);
  const { state } = useGaia();
  const feeds = state.calendarFeeds;

  const sorted = [...dates].sort();
  const from = sorted[0];
  const to = addDays(sorted[sorted.length - 1] ?? from, 1);
  const cache = ctx?.cache;

  const signature = feeds.map((f) => `${f.id}:${f.groupId ?? ''}`).join(',');

  return useMemo(() => {
    if (!cache || !from) return new Map<string, DayEvent[]>();
    const windowFrom = fromISODate(from);
    const windowTo = fromISODate(to);
    const maps: Map<string, DayEvent[]>[] = [];

    for (const feed of feeds) {
      if (groupFilter !== GROUP_ALL && feed.groupId !== groupFilter) continue;
      const held = cache.get(feed.id);
      if (!held) continue;
      const byDate = new Map<string, DayEvent[]>();
      for (const event of icsEventsBetween(held.text, windowFrom, windowTo)) {
        const segments = splitIntoDays(event.start, event.end, {
          eventId: `${feed.id}:${event.uid}:${event.start.getTime()}`,
          calendarId: feed.id,
          groupId: feed.groupId ?? '',
          subject: event.summary,
          source: feed.name,
        });
        for (const seg of segments) {
          if (seg.date < from || seg.date >= to) continue;
          const list = byDate.get(seg.date) ?? [];
          list.push(seg);
          byDate.set(seg.date, list);
        }
      }
      maps.push(byDate);
    }
    return mergeEventDays(...maps);
    // `signature` stands in for `feeds`; `cache` changes whenever a feed is read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cache, from, to, signature, groupFilter]);
}
