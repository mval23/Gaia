import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

/** One phone (or browser) that asked for notifications. See supabase/schema.sql. */
export interface PushRow {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  time_zone: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url: string;
  /** A phone shows one notification per tag, so a repeat replaces rather than stacks. */
  tag: string;
}

/**
 * The server's own view of the database. It reads every planner that asked
 * for notifications, so it uses the secret key, which never reaches the app.
 */
export function admin() {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  // Supabase now calls it the secret key; either name works.
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

let vapidSet = false;

function useVapid() {
  if (vapidSet) return;
  const publicKey = process.env.VITE_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) throw new Error('VITE_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set');
  // Push services want a way to reach whoever runs the server: an email, or the site itself.
  const subject =
    process.env.VAPID_SUBJECT?.trim() || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? 'localhost'}`;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidSet = true;
}

/** `gone` means the phone has turned notifications off, so its row can go too. */
export async function sendPush(row: PushRow, message: PushMessage): Promise<'sent' | 'gone' | 'failed'> {
  useVapid();
  try {
    await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(message),
      // A reminder that arrives hours late is no help, so the push service may drop it after an hour.
      { TTL: 60 * 60 },
    );
    return 'sent';
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? 'gone' : 'failed';
  }
}
