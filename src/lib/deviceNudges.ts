import type { GaiaState } from '../types';
import { todayISO } from './dates';
import { nowMinutes } from './time';
import { dueNudges, type Nudge } from './reminders';

/**
 * Reminders this computer gives itself, while Gaia is open in front of you.
 *
 * The same nudges a phone would be sent (`src/lib/reminders.ts` decides what
 * and when), raised by the page instead of by a server. Nothing arrives when
 * the tab is closed or the computer is asleep, and that is the whole of the
 * difference: this needs no account, no server and no deploy.
 *
 * It is turned on per device, because whether a computer should speak up is
 * about that computer, not about the planner.
 */

const ON_KEY = 'gaia:device-nudges';
const SENT_KEY = 'gaia:device-nudges:sent';

/** How late a nudge may still be raised. Short, so opening Gaia isn't a pile-up. */
export const DEVICE_WINDOW_MIN = 3;

/** A sent nudge is remembered this long, then forgotten. Its key holds its date. */
const KEEP_SENT_MS = 2 * 24 * 60 * 60 * 1000;

export type DeviceStatus = 'unsupported' | 'blocked' | 'off' | 'on';

const supported = () => typeof window !== 'undefined' && 'Notification' in window;

export function deviceNudgesOn(): boolean {
  try {
    return localStorage.getItem(ON_KEY) === 'yes';
  } catch {
    return false;
  }
}

function setOn(on: boolean) {
  try {
    if (on) localStorage.setItem(ON_KEY, 'yes');
    else localStorage.removeItem(ON_KEY);
  } catch {
    // Without storage this lasts for the visit only.
  }
}

export function deviceStatus(): DeviceStatus {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && deviceNudgesOn() ? 'on' : 'off';
}

/** Asks this computer for permission. Call it straight from a click. */
export async function turnOnThisDevice(): Promise<DeviceStatus> {
  if (!supported()) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  setOn(true);
  return 'on';
}

export function turnOffThisDevice(): void {
  setOn(false);
}

type Sent = Record<string, number>;

function readSent(): Sent {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as Sent;
  } catch {
    return {};
  }
}

function writeSent(sent: Sent) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // Without storage a nudge may be said twice; it will not be said wrongly.
  }
}

/**
 * What this computer should raise right now: everything due that it hasn't
 * already said. Pure, so the deciding can be tested without a browser.
 */
export function dueOnDevice(
  state: GaiaState,
  date: string,
  nowMin: number,
  sent: Sent,
  windowMin = DEVICE_WINDOW_MIN,
): Nudge[] {
  return dueNudges(state, date, nowMin, windowMin).filter((n) => !(n.key in sent));
}

/** Drops what's old enough that it could never come round again. */
export function pruneSent(sent: Sent, now = Date.now()): Sent {
  return Object.fromEntries(Object.entries(sent).filter(([, at]) => now - at < KEEP_SENT_MS));
}

/**
 * Raises whatever is due, and remembers it so it is said once. Returns how
 * many went, which is what the tests and the "Say one now" button read.
 */
export function raiseDueNudges(state: GaiaState, now = new Date()): number {
  if (!supported() || Notification.permission !== 'granted' || !deviceNudgesOn()) return 0;
  const sent = pruneSent(readSent());
  const due = dueOnDevice(state, todayISO(), nowMinutes(now), sent);
  for (const nudge of due) {
    show(nudge);
    sent[nudge.key] = Date.now();
  }
  if (due.length) writeSent(sent);
  return due.length;
}

function show(nudge: Nudge) {
  try {
    const note = new Notification(nudge.title, {
      body: nudge.body,
      tag: nudge.key,
      icon: '/icon-192.png',
      badge: '/favicon-64.png',
    });
    note.onclick = () => {
      window.focus();
      // Same-origin, and built by Gaia itself: safe to follow.
      if (location.pathname + location.search !== nudge.url) location.assign(nudge.url);
      note.close();
    };
  } catch {
    // A browser that refuses to show one is not worth stopping the day for.
  }
}
