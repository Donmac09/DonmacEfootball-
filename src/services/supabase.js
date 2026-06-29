import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gyjhjkbdkaoitjuemdsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5amhqa2Jka2FvaXRqdWVtZHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDIzODMsImV4cCI6MjA5Nzc3ODM4M30.HupFYUh9pVmYy4KIey2PikbAeFG3xsmLVHSbDuHRVRg';

export { SUPABASE_URL, SUPABASE_KEY };

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: localStorage,
  },
});

export const sessionStore = {
  get session() {
    return null;
  },
  set session(val) {
    // no-op
  }
};

export async function apiFetch(method, path, body, extraHeaders = {}) {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token ?? SUPABASE_KEY;
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let dataJson = null;
  try { dataJson = JSON.parse(text); } catch { dataJson = text; }
  return { ok: res.ok, status: res.status, data: dataJson, headers: res.headers };
}
