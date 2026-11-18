/**
 * Fetching a calendar feed on the app's behalf.
 *
 * A browser won't fetch someone else's .ics address itself: the calendar
 * services don't allow it from a web page. So the server asks, and hands back
 * the text.
 *
 * It fetches an address a person typed, which is a thing to be careful with: a
 * server that will fetch anything can be pointed at machines only it can see.
 * Hence the rules below — public web addresses only, nothing that resolves to
 * this machine or a private network, and a limit on how much is read.
 */
import { lookup } from 'node:dns/promises';

/** Plenty for years of a busy calendar; a refusal to read something endless. */
const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

export interface IcsFetch {
  status: number;
  body: string;
  /** Set when it didn't work, in words worth showing someone. */
  error?: string;
}

/** Private, loopback, link-local and carrier ranges: nothing on the open web. */
function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;
    // Unique-local and link-local, plus anything mapping a v4 address.
    if (/^f[cd]/.test(v6) || v6.startsWith('fe80')) return true;
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  if (p[0] === 10 || p[0] === 127 || p[0] === 0) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  if (p[0] === 169 && p[1] === 254) return true; // includes the cloud metadata address
  if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
  return false;
}

/**
 * Whether this address may be fetched. `allowLocal` is for the dev server on
 * someone's own machine, where a feed served from localhost is a fair thing to
 * be testing against.
 */
async function check(raw: string, allowLocal: boolean): Promise<{ url: URL } | { error: string }> {
  let url: URL;
  try {
    // webcal: is how calendars hand these out; it is https underneath.
    url = new URL(raw.trim().replace(/^webcal:/i, 'https:'));
  } catch {
    return { error: "That doesn't look like a web address." };
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { error: 'A calendar address has to start with https.' };
  }
  if (allowLocal) return { url };
  try {
    const found = await lookup(url.hostname, { all: true });
    if (!found.length || found.some((a) => isPrivateAddress(a.address))) {
      return { error: 'That address is on a private network, so Gaia will not fetch it.' };
    }
  } catch {
    return { error: "Gaia couldn't find that address." };
  }
  return { url };
}

/** Reads at most `MAX_BYTES`, so an endless response can't fill the server. */
async function readCapped(response: Response): Promise<string | null> {
  const body = response.body;
  if (!body) return await response.text();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8').decode(
    chunks.reduce<Uint8Array>((all, c) => {
      const next = new Uint8Array(all.length + c.length);
      next.set(all);
      next.set(c, all.length);
      return next;
    }, new Uint8Array()),
  );
}

export async function fetchIcs(raw: string, { allowLocal = false } = {}): Promise<IcsFetch> {
  const checked = await check(raw, allowLocal);
  if ('error' in checked) return { status: 400, body: '', error: checked.error };

  const stop = AbortSignal.timeout(TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(checked.url, {
      signal: stop,
      redirect: 'follow',
      // No cookies, no credentials: only what the secret address itself gives.
      headers: { Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1', 'User-Agent': 'Gaia calendar reader' },
    });
  } catch {
    return { status: 502, body: '', error: "Gaia couldn't reach that calendar. Check the address and try again." };
  }

  if (!response.ok) {
    const error =
      response.status === 401 || response.status === 403
        ? 'That calendar refused Gaia. The address may have been reset, or it may not be the secret one.'
        : response.status === 404
          ? 'There is no calendar at that address any more.'
          : `That calendar answered with ${response.status}.`;
    return { status: response.status === 404 ? 404 : 502, body: '', error };
  }

  const text = await readCapped(response).catch(() => null);
  if (text === null) return { status: 502, body: '', error: 'That calendar is larger than Gaia will read.' };
  if (!text.includes('BEGIN:VCALENDAR')) {
    return {
      status: 422,
      body: '',
      error: 'That address gave back a web page rather than a calendar. Look for the secret iCal or ICS address.',
    };
  }
  return { status: 200, body: text };
}

/** The request both the Vercel function and the dev server answer. */
export async function icsResponse(raw: string | null, options: { allowLocal?: boolean } = {}): Promise<Response> {
  if (!raw) return Response.json({ error: 'No calendar address given.' }, { status: 400 });
  const result = await fetchIcs(raw, options);
  if (result.error) return Response.json({ error: result.error }, { status: result.status });
  return new Response(result.body, {
    status: 200,
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
