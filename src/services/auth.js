import { sb, sessionStore, apiFetch, SUPABASE_URL, SUPABASE_KEY } from './supabase';

// ── Get profile by uid via direct fetch ────────────────────────────────
export async function getProfile(uid) {
  if (!uid) return null;
  try {
    const token = sessionStore.session?.access_token ?? SUPABASE_KEY;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&id=eq.${uid}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length > 0 ? rows[0] : null;
  } catch (e) {
    console.error('getProfile error:', e);
    return null;
  }
}

// ── Sign In ─────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data.session) {
    sessionStore.session = data.session;
    await sb.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    }).catch(() => {});
  }

  if (data.user) {
    const existing = await apiFetch('GET', `users?id=eq.${data.user.id}&select=id,role&limit=1`);
    if (!existing.data || existing.data.length === 0) {
      const username = data.user.user_metadata?.username || email.split('@')[0];
      await apiFetch('POST', 'users', {
        id: data.user.id,
        email,
        username,
        whatsapp: data.user.user_metadata?.whatsapp || null,
        role: 'player',
      }, { Prefer: 'resolution=ignore-duplicates,return=minimal' });
    }
    await apiFetch('POST', 'free_play_leaderboard', { user_id: data.user.id },
      { Prefer: 'resolution=ignore-duplicates,return=minimal' }).catch(() => {});
  }

  return data;
}

// ── Sign Up ─────────────────────────────────────────────────────────────────
export async function signUp(email, password, username, whatsapp) {
  if (!email || !password || !username) throw new Error('All fields are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify({ email, password, data: { username, whatsapp: whatsapp || null } }),
  });

  const result = await res.json();
  if (!res.ok) {
    const msg = result?.message || result?.msg || result?.error_description || result?.error || JSON.stringify(result);
    throw new Error(msg);
  }

  const user = result.user || result;
  const session = result.session || null;

  if (session?.access_token) {
    sessionStore.session = session;
    await sb.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }).catch(() => {});
  }

  if (user?.id) {
    await new Promise((r) => setTimeout(r, 600));
    const token = sessionStore.session?.access_token ?? SUPABASE_KEY;
    await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({
        id: user.id,
        email,
        username,
        whatsapp: whatsapp || null,
        role: 'player'
      }),
    }).catch(() => {});
    await fetch(`${SUPABASE_URL}/rest/v1/free_play_leaderboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify({ user_id: user.id }),
    }).catch(() => {});
  }

  return { user, session };
}

// ── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
  sessionStore.session = null;
  await sb.auth.signOut().catch(() => {});
}
