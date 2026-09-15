export const SNAP_MIN = 15;
export const MIN_DURATION = 15;
export const DAY_MIN = 24 * 60;

export function snap(min: number, step = SNAP_MIN): number {
  return Math.round(min / step) * step;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatClock(min: number, format: '24h' | '12h' = '24h'): string {
  const total = ((Math.round(min) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  // 24:00 is a valid end time and should not wrap to 00:00
  const h = min >= DAY_MIN ? 24 : Math.floor(total / 60);
  const m = min >= DAY_MIN ? 0 : total % 60;
  if (format === '24h') return `${pad(h)}:${pad(m)}`;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 || h === 24 ? 'AM' : 'PM';
  return `${h12}:${pad(m)} ${suffix}`;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function formatRange(startMin: number, durationMin: number, format: '24h' | '12h' = '24h'): string {
  return `${formatClock(startMin, format)} – ${formatClock(startMin + durationMin, format)}`;
}

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes();
}

export interface DaySummary {
  tasks: number;
  plannedMin: number;
  freeMin: number;
}

/**
 * Planned time is the sum of block durations; free time is what remains of the
 * waking window (never negative).
 */
export function summarizeDay(durations: number[], windowMin: number): DaySummary {
  const plannedMin = durations.reduce((a, b) => a + b, 0);
  return { tasks: durations.length, plannedMin, freeMin: Math.max(0, windowMin - plannedMin) };
}

/** Parse "HH:MM" into minutes; returns null when invalid. */
export function parseClock(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

export function toClockValue(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
