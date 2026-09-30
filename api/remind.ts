import type { GaiaState } from '../src/types';
import { dueNudges, localClock } from '../src/lib/reminders.js';
import { admin, sendPush, type PushRow } from './_push.js';

/** How long a sent nudge is remembered. Its key holds its date, so a few days is plenty. */
const KEEP_SENT_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Sends whatever is due right now, on each phone's own clock. Supabase calls
 * this every five minutes (supabase/reminders.sql). Each nudge is claimed in
 * push_sent before it goes, so a slow or repeated run never sends one twice.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Not allowed', { status: 401 });
  }

  const db = admin();
  const { data: rows, error } = await db.from('push_subscriptions').select('endpoint, user_id, p256dh, auth, time_zone');
  if (error) return new Response(error.message, { status: 500 });
  const phones = (rows ?? []) as PushRow[];

  const userIds = [...new Set(phones.map((p) => p.user_id))];
  const { data: planners, error: plannerError } = userIds.length
    ? await db.from('planners').select('user_id, data').in('user_id', userIds)
    : { data: [], error: null };
  if (plannerError) return new Response(plannerError.message, { status: 500 });
  const plannerOf = new Map((planners ?? []).map((p) => [p.user_id as string, p.data as GaiaState]));

  let sent = 0;
  for (const phone of phones) {
    const state = plannerOf.get(phone.user_id);
    // Only planners saved since reminders existed have them, and those have every list.
    if (!state?.settings?.reminders) continue;

    let clock: ReturnType<typeof localClock>;
    try {
      clock = localClock(phone.time_zone);
    } catch {
      clock = localClock('UTC');
    }

    for (const nudge of dueNudges(state, clock.date, clock.min)) {
      const { data: claimed } = await db
        .from('push_sent')
        .upsert({ endpoint: phone.endpoint, key: nudge.key }, { onConflict: 'endpoint,key', ignoreDuplicates: true })
        .select('key');
      if (!claimed?.length) continue;

      const result = await sendPush(phone, { title: nudge.title, body: nudge.body, url: nudge.url, tag: nudge.key });
      if (result === 'sent') sent++;
      if (result === 'failed') {
        // Let the next run try again, while it's still within the window.
        await db.from('push_sent').delete().match({ endpoint: phone.endpoint, key: nudge.key });
      }
      if (result === 'gone') {
        await db.from('push_subscriptions').delete().eq('endpoint', phone.endpoint);
        break;
      }
    }
  }

  await db
    .from('push_sent')
    .delete()
    .lt('sent_at', new Date(Date.now() - KEEP_SENT_MS).toISOString());
  return Response.json({ phones: phones.length, sent });
}
