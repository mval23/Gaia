/**
 * Google sign-in, for writing Gaia's time blocks into a Google calendar.
 *
 * Google's browser library hands out an access token that lasts about an hour
 * and keeps no refresh token on this side, which is the point: nothing
 * long-lived is kept anywhere. The token is held for the life of the tab, so a
 * reload doesn't cost another approval.
 *
 * There is no quiet way to renew it here. Google's token client always opens a
 * window, even asked not to prompt, and a browser only allows that straight
 * from a click. So when the hour is up Gaia says so and waits to be asked,
 * rather than firing off a request that is certain to be blocked. Renewing it
 * without anyone clicking would need a server holding a refresh token.
 */

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';

export const googleConfigured = clientId.length > 0;

/** Listing the calendars, and adding events to the one chosen. Nothing else. */
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

/** That permission was given once, so a token can be asked for quietly. */
const CONNECTED_KEY = 'gaia:google:connected';

/**
 * The hour-long token, kept for this tab only: sessionStorage is emptied when
 * the tab closes, so nothing outlives the visit, and a reload in the meantime
 * costs nobody another approval.
 */
const TOKEN_KEY = 'gaia:google:token';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/** Thrown when Google needs the person to click through its own window first. */
export class GoogleConsentError extends Error {}

export class GoogleAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface Gis {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: Gis;
  }
}

export const isConnected = () => {
  try {
    return localStorage.getItem(CONNECTED_KEY) === 'yes';
  } catch {
    return false;
  }
};

function remember(connected: boolean) {
  try {
    if (connected) localStorage.setItem(CONNECTED_KEY, 'yes');
    else localStorage.removeItem(CONNECTED_KEY);
  } catch {
    // Without storage the connection lasts for this visit only.
  }
}

let gis: Promise<Gis> | null = null;

function loadGis(): Promise<Gis> {
  if (!googleConfigured) return Promise.reject(new Error('Google sign-in is not set up'));
  gis ??= new Promise<Gis>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement('script');
    const done = () =>
      window.google?.accounts?.oauth2
        ? resolve(window.google)
        : reject(new Error("Google's sign-in library didn't load."));
    script.addEventListener('load', done);
    script.addEventListener('error', () => reject(new Error("Gaia couldn't load Google's sign-in library.")));
    if (!existing) {
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.oauth2) done();
  });
  return gis;
}

interface Token {
  value: string;
  expiresAt: number;
}

function recallToken(): Token | null {
  try {
    const held = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? 'null') as Token | null;
    return held && held.expiresAt > Date.now() ? held : null;
  } catch {
    return null;
  }
}

function holdToken(next: Token | null) {
  token = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Without storage the token lasts until the page is left.
  }
}

let token: Token | null = recallToken();
let waiting: { ok: (value: string) => void; fail: (err: Error) => void } | null = null;
let client: TokenClient | null = null;
let inflight: Promise<string> | null = null;

async function tokenClient(): Promise<TokenClient> {
  if (client) return client;
  const g = await loadGis();
  client = g.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (response) => {
      const held = waiting;
      waiting = null;
      if (response.error || !response.access_token) {
        held?.fail(new GoogleAuthError(response.error ?? 'unknown', response.error_description ?? 'Google said no.'));
        return;
      }
      holdToken({ value: response.access_token, expiresAt: Date.now() + ((response.expires_in ?? 3600) - 60) * 1000 });
      remember(true);
      held?.ok(response.access_token);
    },
    error_callback: (error) => {
      const held = waiting;
      waiting = null;
      held?.fail(new GoogleAuthError(error.type ?? 'popup_failed_to_open', error.message ?? 'Google said no.'));
    },
  });
  return client;
}

/**
 * An access token for the Calendar API. `interactive` shows Google's own
 * window, so only pass it straight from a click. Without it, a token is only
 * asked for quietly, and a refusal means the person has to approve again.
 */
export async function getGoogleToken(interactive = false): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  // Away from a click there is nothing to try: see the note at the top.
  if (!interactive) {
    throw new GoogleConsentError(isConnected() ? 'Google needs approving again' : 'Google is not connected');
  }
  if (inflight) return inflight;

  inflight = (async () => {
    const c = await tokenClient();
    return new Promise<string>((resolve, reject) => {
      waiting = { ok: resolve, fail: reject };
      // 'none' is the quiet one: Google answers through a hidden frame and
      // never opens a window, which is the only thing that can work away from
      // a click. An empty prompt would try for a pop-up and be blocked.
      c.requestAccessToken({ prompt: 'consent' });
    });
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Forgets the token here and tells Google the permission is no longer wanted. */
export async function disconnectGoogle(): Promise<void> {
  const held = token?.value;
  holdToken(null);
  remember(false);
  if (!held) return;
  const g = await loadGis().catch(() => null);
  if (!g) return;
  await new Promise<void>((resolve) => g.accounts.oauth2.revoke(held, resolve));
}

/** Google's wording, turned into something worth reading. */
export function describeGoogleError(err: unknown): string | null {
  if (err instanceof GoogleConsentError) return null;
  const e = (err ?? {}) as { code?: string; message?: string };
  switch (e.code) {
    case 'access_denied':
      return null; // Saying no is a choice, not a fault.
    case 'popup_failed_to_open':
    case 'popup_closed':
      return 'The Google window did not open. Allow pop-ups for Gaia, then try again.';
    case 'invalid_client':
      return 'Google has no app with this client id. Check VITE_GOOGLE_CLIENT_ID in .env.local, then restart Gaia.';
    case 'idpiframe_initialization_failed':
      return 'Google would not start here. Check that this address is listed under Authorised JavaScript origins.';
  }
  const detail = (e.message ?? '').trim();
  return detail ? `Google said: ${detail}` : 'Google sign-in did not finish. Please try again.';
}
