import React, { useState, useEffect } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY, sessionStore } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage({ user, profile, onProfileUpdate }) {
  const { handleSignOut } = useAuth();
  const [username, setUsername] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [bio, setBio]           = useState('');
  const [country, setCountry]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');
  const [team, setTeam]         = useState(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setWhatsapp(profile.whatsapp || '');
      setBio(profile.bio || '');
      setCountry(profile.country || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    apiFetch('GET', `teams?user_id=eq.${user.id}&select=*,leagues(name,country,tier)&limit=1`)
      .then(r => setTeam(Array.isArray(r.data) && r.data.length > 0 ? r.data[0] : null));
  }, [user]);

  async function save() {
    setSaving(true); setMsg('');
    const tok = sessionStore.session?.access_token ?? SUPABASE_KEY;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ username, whatsapp, bio, country }),
    });
    if (r.ok) { setMsg('✅ Profile saved!'); await onProfileUpdate(); }
    else setMsg('❌ Failed to save.');
    setSaving(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    const form = e.target;
    const pw = form.newPw.value;
    const confirm = form.confirmPw.value;
    if (pw !== confirm) { setMsg('❌ Passwords do not match'); return; }
    if (pw.length < 6) { setMsg('❌ Password must be at least 6 characters'); return; }
    const { error } = await import('../services/supabase').then(m => m.sb.auth.updateUser({ password: pw }));
    setMsg(error ? '❌ ' + error.message : '✅ Password changed!');
    form.reset();
  }

  return (
    <div>
      <h2 className="section-title gradient-text">👤 My Profile</h2>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

      <div className="grid-2">
        {/* Left column */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Profile Info</div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="Ghana" />
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+233..." />
            </div>
            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-input" value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell the community about yourself..." />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Change Password</div>
            <form onSubmit={changePassword}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" name="newPw" placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" name="confirmPw" placeholder="••••••••" required />
              </div>
              <button className="btn btn-secondary" type="submit">Update Password</button>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Account Info</div>
            <div className="text-sm text-muted" style={{ marginBottom: 8 }}>Email: {user?.email}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={`badge ${profile?.role === 'admin' ? 'badge-gold' : 'badge-blue'}`}>{profile?.role || 'player'}</span>
              <span className="badge badge-green">Active</span>
            </div>
            <hr className="divider" />
            <button className="btn btn-danger" onClick={handleSignOut}>🚪 Sign Out</button>
          </div>

          {team && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🏟️ My Team</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--yellow)', marginBottom: 4 }}>{team.name}</div>
              <div className="text-sm text-muted">{team.leagues?.country} – {team.leagues?.name} (Tier {team.leagues?.tier})</div>
              <div className="grid-3" style={{ gap: 8, marginTop: '1rem' }}>
                {[['Pts', team.total_points], ['W', team.wins], ['D', team.draws], ['L', team.losses], ['GF', team.goals_for], ['GA', team.goals_against]].map(([l, v]) => (
                  <div key={l} className="stat-card">
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--yellow)' }}>{v || 0}</div>
                    <div className="stat-label">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
