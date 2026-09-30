import { NUDGE } from '../src/lib/copy.js';
import { admin, sendPush, type PushRow } from './_push.js';

/**
 * Settings' "Send a test": one notification to the phone that asked, so
 * turning notifications on can be checked right away. Only the signed-in
 * person can reach their own phones.
 */
export async function POST(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('Not signed in', { status: 401 });

  const db = admin();
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return new Response('Not signed in', { status: 401 });

  const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: string };
  if (!endpoint) return new Response('No phone given', { status: 400 });

  const { data: row } = await db
    .from('push_subscriptions')
    .select('endpoint, user_id, p256dh, auth, time_zone')
    .eq('endpoint', endpoint)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (!row) return new Response('This phone is not signed up', { status: 404 });

  const result = await sendPush(row as PushRow, {
    title: NUDGE.testTitle,
    body: NUDGE.testBody,
    url: '/settings',
    tag: 'test',
  });
  if (result === 'gone') await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return Response.json({ result }, { status: result === 'sent' ? 200 : 502 });
}
