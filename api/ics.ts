import { icsResponse } from './_ics.js';
import { createClient } from '@supabase/supabase-js';

/**
 * Reads one calendar feed for the app. Put online, only a signed-in person may
 * ask, so this never becomes something anyone can point anywhere. Run on your
 * own machine with no accounts, there is nobody to check and nothing to
 * protect: see the dev server's own copy in vite.config.ts.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (supabaseUrl && key) {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 });
    const db = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await db.auth.getUser(token);
    if (!data.user) return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  return icsResponse(url.searchParams.get('url'));
}
