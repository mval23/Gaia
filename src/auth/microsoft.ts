import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';

/**
 * Microsoft (work or school) sign-in. The app registration lives in Microsoft
 * Entra; its IDs come from .env.local so they never end up in the repo.
 */
const clientId = import.meta.env.VITE_MS_CLIENT_ID?.trim() ?? '';
const tenantId = import.meta.env.VITE_MS_TENANT_ID?.trim() || 'organizations';

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
