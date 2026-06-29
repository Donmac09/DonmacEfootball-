import React, { useState } from 'react';
import { signIn, signUp, getProfile } from '../services/auth';

export default function AuthPage({ onAuth }) {
  const [mode, setMode]       = useState('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [username, setUser]   = useState('');
  const [whatsapp, setWa]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [showPw, setShowPw]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'login') {
        const d = await signIn(email, password);
        const profile = await getProfile(d.user.id);
        onAuth(d.user, profile);
      } else {
        if (!username.trim()) throw new Error('Username is required');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        let wa = whatsapp.trim();
        if (wa && !wa.startsWith('+')) wa = '+' + wa;
        const d = await signUp(email, password, username, wa);
        if (d.session) {
          const profile = await getProfile(d.user?.id);
          onAuth(d.user, profile);
        } else {
          setSuccess('✅ Account created! Check your email to confirm, then sign in.');
          setMode('login');
          setPass('');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid rgba(255,210,0,0.2)', borderRadius: 20, padding: '2.25rem', width: '100%', maxWidth: 430, boxShadow: '0 8px 48px rgba(255,210,0,0.08)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: 'linear-gradient(135deg,#ffd200,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 12px', boxShadow: '0 4px 24px rgba(255,210,0,0.35)', animation: 'logopulse 3s ease-in-out infinite' }}>⚽</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, background: 'linear-gradient(90deg,#ffd200,#00d4ff,#ffd200)', backgroundSize: '200%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 4s linear infinite' }}>DONMAC eFOOTBALL</div>
          <div style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 4 }}>The Ultimate eFootball Platform</div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>Sign In</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Sign Up</button>
        </div>

        {error   && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={username} onChange={e => setUser(e.target.value)} placeholder="Your display name" required />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp (optional)</label>
                <input className="form-input" value={whatsapp} onChange={e => setWa(e.target.value)} placeholder="+233..." />
              </div>
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPass(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem' }}>{showPw ? '🙈' : '👁'}</button>
            </div>
          </div>
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ width: '100%', padding: '11px', fontSize: '1rem', marginTop: 4 }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
