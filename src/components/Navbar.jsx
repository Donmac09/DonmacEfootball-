import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionStore, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

export default function Navbar({ page, setPage }) {
  const { user, profile } = useAuth();
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifs, setShowNotifs]  = useState(false);
  const [notifs, setNotifs]          = useState([]);
  const [menuOpen, setMenuOpen]     = useState(false);

  // All nav items
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
      {/* ── MOBILE HEADER WITH HAMBURGER ─────────────────────────── */}
      <div className="mobile-header">
        <button 
          className="hamburger-btn" 
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div
          onClick={() => setPage('home')}
          className="mobile-brand"
        >
          ⚽ DONMAC
        </div>
        <div style={{ width: 40 }}></div>
      </div>

      {/* ── SIDEBAR MENU ──────────────────────────────────────────── */}
      {menuOpen && (
        <div className="nav-overlay" onClick={() => setMenuOpen(false)} />
      )}
      <div className={`navbar-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
            {profile?.username ? `👋 ${profile.username}` : 'Menu'}
          </div>
          <button 
            className="close-btn" 
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(([id, icon, label]) => (
            <button
              key={id}
              className={`sidebar-link ${page === id ? 'active' : ''}`}
              onClick={() => { setPage(id); setMenuOpen(false); }}
            >
              {icon} {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── TOP NAVBAR (DESKTOP) ──────────────────────────────────── */}
      <nav className="navbar-desktop">
        <div className="nav-inner">
          <div
            onClick={() => setPage('home')}
            className="nav-brand"
          >
            <div className="brand-icon">DE</div>
            <span>DONMAC eFOOTBALL</span>
          </div>

          <div className="nav-links">
            {navItems.map(([id, icon, label]) => (
              <button
                key={id}
                className={`nav-link ${page === id ? 'active' : ''}`}
                onClick={() => setPage(id)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          <div className="nav-right">
            <div
              className="bell-icon"
              onClick={() => { setShowNotifs(v => !v); if (!showNotifs) loadNotifs(); }}
            >
              🔔
              {notifCount > 0 && <span className="bell-dot" />}
            </div>
            <div
              className="avatar"
              onClick={() => setPage('profile')}
            >
              {(profile?.username || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      {/* ── NOTIFICATIONS PANEL ───────────────────────────────────── */}
      {showNotifs && (
        <div onClick={() => setShowNotifs(false)} className="notif-overlay">
          <div
            onClick={e => e.stopPropagation()}
            className="notif-panel"
          >
            <div className="notif-header">
              <span>🔔 Notifications</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={markAllRead}>All read</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNotifs(false)}>✕</button>
              </div>
            </div>
            <div className="notif-list">
              {notifs.length === 0
                ? <div className="notif-empty">No notifications</div>
                : notifs.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? 'read' : 'unread'}`}
                      onClick={() => { setShowNotifs(false); setPage('matchmaking'); }}
                    >
                      <span className="notif-icon">{n.type === 'challenge' ? '⚔️' : '📢'}</span>
                      <div className="notif-body">
                        <div className="notif-message">{n.message}</div>
                        <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read && <div className="notif-unread-dot" />}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
