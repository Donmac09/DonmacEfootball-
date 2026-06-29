import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionStore, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

export default function Navbar({ page, setPage }) {
  const { user, profile } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs]  = useState(false);
  const [notifs, setNotifs]          = useState([]);

  // Desktop nav items
  const navItems = [
    ['home',        '🏠', 'Home'],
    ['leagues',     '🏟️', 'Leagues'],
    ['europe',      '🇪🇺', 'Europe'],
    ['cups',        '🏆', 'Cups'],
    ['matchmaking', '⚽', 'Matches'],
    ['chat',        '💬', 'Chat'],
    ['team',        '👕', 'My Team'],
    ['profile',     '👤', 'Profile'],
  ];
  if (profile?.role === 'admin') navItems.push(['admin', '⚙️', 'Admin']);

  // Bottom nav shows most important 5 items
  const bottomNav = [
    ['home',        '🏠', 'Home'],
    ['leagues',     '🏟️', 'Leagues'],
    ['matchmaking', '⚽', 'Matches'],
    ['chat',        '💬', 'Chat'],
    ['team',        '👕', 'Team'],
  ];

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const tok = sessionStore.session?.access_token ?? SUPABASE_KEY;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&read=eq.false&select=id`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok}` } }
      );
      const data = await res.json().catch(() => []);
      setNotifCount(Array.isArray(data) ? data.length : 0);
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [user, page]);

  async function loadNotifs() {
    const tok = sessionStore.session?.access_token ?? SUPABASE_KEY;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}&select=*&order=created_at.desc&limit=20`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok}` } }
    );
    const data = await res.json().catch(() => []);
    setNotifs(Array.isArray(data) ? data : []);
  }

  async function markAllRead() {
    const tok = sessionStore.session?.access_token ?? SUPABASE_KEY;
    await fetch(`${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ read: true }),
    });
    setNotifCount(0);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <>
      {/* ── TOP NAVBAR ────────────────────────────────────────────── */}
      <nav style={{
        background: 'rgba(8,12,20,0.97)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,210,0,0.18)',
        padding: '0 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 62,
        position: 'sticky',
        top: 0,
        zIndex: 200,
        boxShadow: '0 2px 24px rgba(255,210,0,0.06)',
      }}>
        {/* Brand */}
        <div
          onClick={() => setPage('home')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap', flexShrink: 0,
            background: 'linear-gradient(90deg,#ffd200,#00d4ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'linear-gradient(135deg,#ffd200,#00d4ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: '.78rem', color: '#000',
            boxShadow: '0 0 12px rgba(255,210,0,0.4)', flexShrink: 0,
          }}>DE</div>
          <span>DONMAC eFOOTBALL</span>
        </div>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: 'flex', gap: 2, flex: 1, margin: '0 .75rem', overflowX: 'auto' }}>
          {navItems.map(([id, icon, label]) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                padding: '6px 9px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: '.78rem', fontWeight: 500, whiteSpace: 'nowrap', fontFamily: 'inherit',
                background: page === id ? 'rgba(255,210,0,0.12)' : 'transparent',
                color: page === id ? '#ffd200' : '#8896ae',
                boxShadow: page === id ? 'inset 0 -2px 0 #ffd200' : 'none',
                transition: 'all .15s',
              }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Right: bell + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div
            style={{ position: 'relative', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', lineHeight: 1 }}
            onClick={() => { setShowNotifs(v => !v); if (!showNotifs) loadNotifs(); }}>
            🔔
            {notifCount > 0 && (
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 9, height: 9,
                borderRadius: '50%', background: '#ef4444',
                animation: 'notifpop .3s ease',
              }} />
            )}
          </div>
          <div
            onClick={() => setPage('profile')}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg,#ffd200,#00d4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '.85rem', color: '#000',
              cursor: 'pointer', boxShadow: '0 0 10px rgba(255,210,0,0.3)',
              flexShrink: 0,
            }}>
            {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* ── NOTIFICATIONS PANEL ───────────────────────────────────── */}
      {showNotifs && (
        <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: 68, right: 12, width: 320,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, zIndex: 200, maxHeight: 440,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,.5)',
            }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '.9rem' }}>🔔 Notifications</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={markAllRead}>All read</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNotifs(false)}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifs.length === 0
                ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.875rem' }}>No notifications</div>
                : notifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { setShowNotifs(false); setPage('matchmaking'); }}
                      style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--border)',
                        background: n.read ? 'transparent' : 'rgba(255,210,0,0.04)',
                        cursor: 'pointer', display: 'flex', gap: 10,
                      }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                        {n.type === 'challenge' ? '⚔️' : '📢'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.875rem', color: n.read ? 'var(--muted)' : 'var(--text)' }}>{n.message}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0, marginTop: 4 }} />}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────────── */}
      <div className="mobile-bottom-nav">
        {bottomNav.map(([id, icon, label]) => (
          <button
            key={id}
            className={`mobile-bottom-nav-item ${page === id ? 'active' : ''}`}
            onClick={() => setPage(id)}>
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
        {/* More button → show profile/admin */}
        <button
          className={`mobile-bottom-nav-item ${['profile','admin','europe','cups'].includes(page) ? 'active' : ''}`}
          onClick={() => setPage(profile?.role === 'admin' ? 'admin' : 'profile')}>
          <span>⋯</span>
          <span>More</span>
        </button>
      </div>
    </>
  );
}
