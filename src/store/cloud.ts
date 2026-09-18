import type { GaiaState } from '../types';
import { supabase } from '../auth/supabase';
import { createSeed } from '../data/seed';
import { parseState, readState, saveState } from './persist';

/** One row per person: their whole planner as JSON. See supabase/schema.sql. */
const TABLE = 'planners';

/** A copy kept in this browser, so Gaia opens even when the network doesn't. */
const cacheKey = (userId: string) => `gaia:v1:${userId}`;
/** Set while this browser holds changes the cloud hasn't received yet. */
const unsyncedKey = (userId: string) => `gaia:unsynced:${userId}`;

interface Row {
  data: unknown;
  updated_at: string;
}

async function fetchRow(userId: string): Promise<Row | null> {
  const { data, error } = await supabase.from(TABLE).select('data, updated_at').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function hasUnsynced(userId: string): boolean {
  try {
    return localStorage.getItem(unsyncedKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markUnsynced(userId: string, unsynced: boolean) {
  try {
    if (unsynced) localStorage.setItem(unsyncedKey(userId), '1');
    else localStorage.removeItem(unsyncedKey(userId));
  } catch {
    // The cloud copy is what matters; this flag only protects offline edits.
  }
}

/**
 * Keeps one person's planner in the cloud. Saves are debounced and retried,
 * and a save identical to what the cloud already holds is skipped, so loading
 * a planner (or pulling in a newer one) never writes it straight back.
 */
export class CloudSync {
  private savedJSON: string;
  private stamp: number;
  private queued: GaiaState | null = null;
  private saving = false;
  private timer: number | undefined;

  constructor(
    private readonly userId: string,
    saved: GaiaState | null,
    stamp: string | null,
  ) {
    this.savedJSON = saved ? JSON.stringify(saved) : '';
    this.stamp = stamp ? Date.parse(stamp) : 0;
  }

  /** True while a change hasn't reached the cloud yet. */
  get pending(): boolean {
    return this.saving || this.queued !== null;
  }

  save = (state: GaiaState) => {
    saveState(state, cacheKey(this.userId));
    if (JSON.stringify(state) === this.savedJSON) {
      if (!this.pending) markUnsynced(this.userId, false);
      return;
    }
    markUnsynced(this.userId, true);
    this.queued = state;
    this.schedule(800);
  };

  /** Sends any waiting change right away, e.g. when the tab is being hidden. */
  flush = (): Promise<void> => {
    window.clearTimeout(this.timer);
    return this.push();
  };

  private schedule(ms: number) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.push(), ms);
  }

  private async push() {
    if (this.saving || !this.queued) return;
    const state = this.queued;
    this.queued = null;
    this.saving = true;
    let failed = false;
    try {
      const updatedAt = new Date().toISOString();
      const { error } = await supabase.from(TABLE).upsert({ user_id: this.userId, data: state, updated_at: updatedAt });
      if (error) throw error;
      this.savedJSON = JSON.stringify(state);
      this.stamp = Date.parse(updatedAt);
      if (!this.queued) markUnsynced(this.userId, false);
    } catch {
      failed = true;
      this.queued ??= state;
    } finally {
      this.saving = false;
    }
    // A newer change may have arrived mid-save; a failed one waits a little before trying again.
    if (this.queued) this.schedule(failed ? 10_000 : 0);
  }

  /**
   * The cloud's planner, if another device has saved a newer one since this
   * one last looked. Never replaces changes of its own that are still pending.
   */
  async newer(): Promise<GaiaState | null> {
    if (this.pending) return null;
    const row = await fetchRow(this.userId).catch(() => null);
    if (!row || this.pending || Date.parse(row.updated_at) <= this.stamp) return null;
    const state = parseState(row.data);
    if (!state) return null;
    this.savedJSON = JSON.stringify(state);
    this.stamp = Date.parse(row.updated_at);
    saveState(state, cacheKey(this.userId));
    return state;
  }
}

/**
 * Opens someone's planner: the cloud copy, unless this browser holds edits it
 * never managed to send (or the cloud can't be reached), and sample data the
 * very first time. On that first time, `browserPlanner` is the planner Gaia
 * saved in this browser before accounts existed, if there is one, so the
 * person can choose to carry it over.
 */
export async function openPlanner(
  userId: string,
): Promise<{ state: GaiaState; sync: CloudSync; browserPlanner?: GaiaState }> {
  const cached = readState(cacheKey(userId));
  let row: Row | null;
  try {
    row = await fetchRow(userId);
  } catch (err) {
    if (!cached) throw err;
    // Offline: work from this browser's copy. Unless it holds unsent edits, a newer cloud save wins later.
    return { state: cached, sync: new CloudSync(userId, hasUnsynced(userId) ? null : cached, null) };
  }

  const remote = row ? parseState(row.data) : null;
  // Never start over on top of a cloud save that exists but couldn't be read.
  if (row && !remote) throw new Error('The saved planner could not be read');

  const sync = new CloudSync(userId, remote, row?.updated_at ?? null);
  const unsent = hasUnsynced(userId) && cached;
  if (unsent) return { state: unsent, sync };
  if (remote) return { state: remote, sync };
  return { state: createSeed(), sync, browserPlanner: readState() ?? undefined };
}

/** Removes this person's copy from the browser when they sign out. */
export function forgetLocalCopy(userId: string) {
  try {
    localStorage.removeItem(cacheKey(userId));
    localStorage.removeItem(unsyncedKey(userId));
  } catch {
    // Nothing to remove.
  }
}
