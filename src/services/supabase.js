import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gyjhjkbdkaoitjuemdsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5amhqa2Jka2FvaXRqdWVtZHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDIzODMsImV4cCI6MjA5Nzc3ODM4M30.HupFYUh9pVmYy4KIey2PikbAeFG3xsmLVHSbDuHRVRg';

export { SUPABASE_URL, SUPABASE_KEY };

// Get the correct storage key from Supabase
const STORAGE_KEY = 'sb-gyjhjkbdkaoitjuemdsl-auth-token';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: localStorage,
  },
});

// Session store that actually reads from localStorage
export const sessionStore = {
  get session() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.access_token) {
          return { access_token: parsed.access_token };
        }
        // Try different format
        if (parsed?.accessToken) {
          return { access_token: parsed.accessToken };
        }
      }
      // Fallback: try to get from Supabase directly
      return null;
    } catch {
      return null;
    }
  },
  set session(val) {
    // Supabase manages this via localStorage
    // But if we need to manually set, we can
    if (val) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
      } catch {}
    }
  }
};

export async function apiFetch(method, path, body, extraHeaders = {}) {
  // Try multiple ways to get token
  let token = SUPABASE_KEY;
  
  // 1. Try Supabase session
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session?.access_token) {
      token = data.session.access_token;
    }
  } catch (e) {
    console.warn('Failed to get session from sb.auth:', e);
  }
  
  // 2. Try localStorage directly
  if (token === SUPABASE_KEY) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.access_token) {
          token = parsed.access_token;
        }
      }
    } catch (e) {
      console.warn('Failed to get token from localStorage:', e);
    }
  }
  
  // 3. Try sessionStore
  if (token === SUPABASE_KEY) {
    const stored = sessionStore.session;
    if (stored?.access_token) {
      token = stored.access_token;
    }
  }

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
  
  if (!res.ok) {
    console.error(`API Error ${res.status} on ${path}:`, dataJson);
  }
  
  return { ok: res.ok, status: res.status, data: dataJson, headers: res.headers };
}
