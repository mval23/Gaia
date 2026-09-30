import { cloudConfigured, supabase } from '../auth/supabase';
import { isAppleMobile, isStandalone } from './device';

/**
 * Phone notifications, one device at a time. The phone signs up here, the
 * sign-up is kept in Supabase (push_subscriptions), and api/remind.ts sends
 * what's due. What to send is chosen in settings.reminders, shared by every
 * device on the account.
 */
const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() ?? '';

/** Notifications need accounts, since the server has to know whose planner to read. */
export const pushConfigured = cloudConfigured && vapidKey.length > 0;

/** `install-first`: an iPhone in a Safari tab, which only allows notifications from the home screen. */
export type PushStatus = 'unsupported' | 'install-first' | 'blocked' | 'off' | 'on';

const TABLE = 'push_subscriptions';

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

async function saveSubscription(subscription: PushSubscription) {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not signed in');
  const { keys } = subscription.toJSON();
  const { error } = await supabase.from(TABLE).upsert({
    endpoint: subscription.endpoint,
    user_id: userId,
    p256dh: keys?.p256dh,
    auth: keys?.auth,
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  if (error) throw error;
}

/** The public key, in the form PushManager wants it. */
function applicationServerKey(): Uint8Array {
  const base64 = (vapidKey + '='.repeat((4 - (vapidKey.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function pushStatus(): Promise<PushStatus> {
  if (!supported()) return isAppleMobile() && !isStandalone() ? 'install-first' : 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  if (Notification.permission !== 'granted') return 'off';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** Asks the phone for permission and signs it up. Call it straight from a tap: iPhones insist. */
export async function turnOnHere(): Promise<PushStatus> {
  if (!supported()) return pushStatus();
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  await navigator.serviceWorker.register('/sw.js');
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey() }));
  await saveSubscription(subscription);
  return 'on';
}

/** Stops notifications on this device only. Other devices keep theirs. */
export async function turnOffHere(): Promise<void> {
  if (!supported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;
  await supabase.from(TABLE).delete().eq('endpoint', subscription.endpoint);
  await subscription.unsubscribe();
}

/** Asks the server for one notification to this device. True when it went. */
export async function sendTest(): Promise<boolean> {
  const subscription = supported() ? await currentSubscription() : null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!subscription || !token) return false;
  const response = await fetch('/api/push-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => null);
  return !!response?.ok;
}

/**
 * Registers the worker that shows notifications, and refreshes this device's
 * sign-up, so a phone that has travelled is reminded on its new clock.
 */
export function startPush() {
  if (!pushConfigured || !supported()) return;
  void (async () => {
    await navigator.serviceWorker.register('/sw.js');
    const subscription = await currentSubscription();
    if (subscription && Notification.permission === 'granted') await saveSubscription(subscription);
  })().catch(() => undefined);
}
