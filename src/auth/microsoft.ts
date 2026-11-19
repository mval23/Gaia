import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';

/**
 * Microsoft sign-in, for the Outlook calendar link. The app registration lives
 * in Microsoft Entra; its IDs come from .env.local so they never end up in the
 * repo. Which accounts are allowed is the registration's decision and the
 * tenant's: see `tenantId` below.
 */
const clientId = import.meta.env.VITE_MS_CLIENT_ID?.trim() ?? '';
// `common` accepts work, school and personal accounts. A directory id in
// .env.local narrows it to that one directory, which is what refuses every
// other kind of account.
const tenantId = import.meta.env.VITE_MS_TENANT_ID?.trim() || 'common';

/** True when sign-in is pinned to one directory, so every other account is turned away. */
export const singleTenant = !['common', 'organizations', 'consumers'].includes(tenantId.toLowerCase());

/** Calendar access is asked for at sign-in, so linking a group needs no second prompt. */
const SCOPES = ['User.Read', 'Calendars.ReadWrite'];

export const microsoftConfigured = clientId.length > 0;

/** Thrown when a token needs the person to click through a Microsoft prompt first. */
export class ConsentNeededError extends Error {}

let instance: Promise<IPublicClientApplication> | null = null;

function msal(): Promise<IPublicClientApplication> {
  if (!microsoftConfigured) return Promise.reject(new Error('Microsoft sign-in is not set up'));
  // Loaded on demand, so the sign-in library doesn't weigh down every page.
  instance ??= import('@azure/msal-browser').then(({ createStandardPublicClientApplication }) =>
    createStandardPublicClientApplication({
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        // A small page that only hands the sign-in result back to this window.
        redirectUri: `${window.location.origin}/auth-redirect.html`,
      },
      cache: { cacheLocation: 'localStorage' },
    }),
  );
  return instance;
}

export async function currentAccount(): Promise<AccountInfo | null> {
  if (!microsoftConfigured) return null;
  const app = await msal();
  return app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
}

export async function signIn(): Promise<AccountInfo> {
  const app = await msal();
  const result = await app.loginPopup({ scopes: SCOPES, prompt: 'select_account' });
  app.setActiveAccount(result.account);
  return result.account;
}

export async function signOut(): Promise<void> {
  const app = await msal();
  const account = await currentAccount();
  if (!account) return;
  await app.logoutPopup({ account, postLogoutRedirectUri: `${window.location.origin}/auth-redirect.html` });
}

/**
 * An access token for Microsoft Graph. Only pass `interactive` from a click:
 * browsers block popups that don't come straight from one.
 */
export async function getToken(interactive = false): Promise<string> {
  const app = await msal();
  const account = await currentAccount();
  if (!account) throw new ConsentNeededError('Not signed in');
  const { InteractionRequiredAuthError } = await import('@azure/msal-browser');
  try {
    return (await app.acquireTokenSilent({ scopes: SCOPES, account })).accessToken;
  } catch (err) {
    if (!(err instanceof InteractionRequiredAuthError)) throw err;
    if (!interactive) throw new ConsentNeededError('Calendar access needs approval');
    return (await app.acquireTokenPopup({ scopes: SCOPES, account })).accessToken;
  }
}

/**
 * Microsoft reports a failure as a code buried in a wall of text. These are the
 * ones worth naming, each with the thing to do about it, because "sign-in did
 * not finish" sends someone looking in the wrong place. `null` means it needs
 * no telling: closing the window is a choice, not a fault.
 */
export function describeAuthError(err: unknown): string | null {
  const e = (err ?? {}) as { errorCode?: string; errorMessage?: string; message?: string };
  const code = e.errorCode ?? '';
  const text = `${e.errorMessage ?? ''} ${e.message ?? ''}`;

  // Microsoft's own code comes first: coming back from a consent screen looks
  // like a cancelled sign-in, and saying nothing would leave someone stuck.
  switch (text.match(/AADSTS\d+/)?.[0]) {
    case 'AADSTS50020':
    case 'AADSTS50128':
    case 'AADSTS50129':
      return singleTenant
        ? 'That account isn’t in the directory Gaia is registered to, so Microsoft turned it away. Either sign in with an account from that directory, or allow every kind of account: set the registration’s “Supported account types” to include personal Microsoft accounts, and put VITE_MS_TENANT_ID=common in .env.local.'
        : 'Microsoft didn’t recognise that account. Try another, or check the registration allows personal accounts.';
    case 'AADSTS65001':
    case 'AADSTS90094':
    case 'AADSTS65004':
      return 'This organisation keeps app permissions for administrators to grant, so Gaia is waiting on one. Ask an administrator to open the Gaia registration in Entra ▸ API permissions and choose “Grant admin consent”. The permissions are the ordinary delegated ones, User.Read and Calendars.ReadWrite, and they reach only your own calendar.';
    case 'AADSTS700016':
    case 'AADSTS70001':
      return 'Microsoft has no app with this client id in that directory. Check VITE_MS_CLIENT_ID and VITE_MS_TENANT_ID in .env.local against the registration in Entra, then restart Gaia.';
    case 'AADSTS50011':
      return `Microsoft refused the address Gaia came back to. Add ${window.location.origin}/auth-redirect.html as a Single-page application redirect URI in the Entra registration.`;
    case 'AADSTS900144':
    case 'AADSTS7000218':
      return 'The registration isn’t set up as a Single-page application. In Entra, under Authentication, add a Single-page application platform with Gaia’s redirect address.';
    case 'AADSTS50105':
      return 'That account isn’t assigned to this app in Entra. Assign it under Enterprise applications ▸ Users and groups.';
  }

  // Closing the window is a choice, not something to report.
  if (code === 'user_cancelled' || code === 'access_denied') return null;

  switch (code) {
    case 'popup_window_error':
    case 'empty_window_error':
      return 'This browser blocked the Microsoft window. Allow pop-ups for Gaia, then try again.';
    case 'monitor_window_timeout':
      return 'The Microsoft window never came back. It returns through /auth-redirect.html, so check that address is a redirect URI in Entra and that the page loads.';
    case 'interaction_in_progress':
      return 'A Microsoft window is already open. Finish or close it, then try again.';
    case 'no_network_connectivity':
      return 'Gaia couldn’t reach Microsoft. Check your connection and try again.';
  }

  // Nothing recognised: Microsoft's own words beat a shrug.
  const detail = (e.errorMessage || e.message || '').split(/[\r\n]/)[0].trim();
  return detail ? `Microsoft said: ${detail}` : 'Microsoft sign-in did not finish. Please try again.';
}
