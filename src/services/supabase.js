import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gyjhjkbdkaoitjuemdsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5amhqa2Jka2FvaXRqdWVtZHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDIzODMsImV4cCI6MjA5Nzc3ODM4M30.HupFYUh9pVmYy4KIey2PikbAeFG3xsmLVHSbDuHRVRg';

export { SUPABASE_URL, SUPABASE_KEY };

// In-memory storage — avoids Edge Tracking Prevention blocking localStorage from file://
const memoryStorage = (() => {
  const s = {};
  return {
    getItem:    (k) => s[k] ?? null,
    setItem:    (k, v) => { s[k] = v; },
    removeItem: (k) => { delete s[k]; },
    clear:      () => { Object.keys(s).forEach((k) => delete s[k]); },
  };
})();

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage:            memoryStorage,
    autoRefreshToken:   false,
    persistSession:     false,
    detectSessionInUrl: false,
    flowType:           'implicit',
  },
});

// ── In-memory session store ─────────────────────────────────────────────────
// We keep the token here and inject it into every REST call manually,
// because the Supabase JS client cannot persist it from file://
export const sessionStore = { session: null };

// ── Authenticated REST fetch ────────────────────────────────────────────────
export async function apiFetch(method, path, body, extraHeaders = {}) {
  const token = sessionStore.session?.access_token ?? SUPABASE_KEY;
  const url   = `${SUPABASE_URL}/rest/v1/${path}`;
  const res   = await fetch(url, {
    method,
    headers: {
      apikey:        SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data, headers: res.headers };
}
