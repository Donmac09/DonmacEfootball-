import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function HomePage({ profile }) {
  const [stats, setStats] = useState({ leagues: 0, teams: 0, matches: 0, players: 0 });

  useEffect(() => {
    Promise.all([
      apiFetch('GET','leagues?select=id'),
      apiFetch('GET','teams?select=id'),
      apiFetch('GET','fixtures?select=id&status=eq.approved'),
      apiFetch('GET','users?select=id'),
    ]).then(([l,t,m,p]) => setStats({
      leagues: Array.isArray(l.data) ? l.data.length : 0,
      teams:   Array.isArray(t.data) ? t.data.length : 0,
      matches: Array.isArray(m.data) ? m.data.length : 0,
      players: Array.isArray(p.data) ? p.data.length : 0,
    }));
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, lineHeight: 1.1, marginBottom: '.5rem' }}>
            <span style={{ color: 'var(--yellow)' }}>DONMAC </span>
            <span style={{ color: 'var(--cyan)' }}>eFOOTBALL</span>
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1.25rem', maxWidth: 560 }}>
            Compete in leagues, cups, and European competitions. Find opponents, play matches, and climb the rankings.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['🏆 Champions League','badge-blue'],['⚽ Europa League','badge-purple'],['🌍 Conference League','badge-green'],['📊 Promotion & Relegation','badge-gray']].map(([l,c]) =>
              <span key={l} className={`badge ${c}`}>{l}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        {[['Leagues', stats.leagues, '🏟️'], ['Teams', stats.teams, '👕'], ['Matches', stats.matches, '⚽'], ['Players', stats.players, '👤']].map(([l,v,e]) => (
          <div key={l} className="stat-card">
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{e}</div>
            <div className="stat-val">{v}</div>
            <div className="stat-label">{l}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* How it works */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>📋 How It Works</div>
          {[['1. Register your team', 'Join a league in your country', 'var(--yellow)'],
            ['2. Play fixtures', 'Find your opponent in Match Search', 'var(--muted)'],
            ['3. Submit results', 'Upload screenshot evidence', 'var(--muted)'],
            ['4. Admin reviews', 'Results approved or rejected', 'var(--muted)'],
            ['5. Qualify for Europe', 'Top teams enter CL, EL, Conference', 'var(--cyan)'],
          ].map(([t, d, c]) => (
            <div key={t} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontWeight: 600, fontSize: '.875rem', color: c }}>{t}</div>
              <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 2 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* European competitions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🇪🇺 European Competitions</div>
          {[['Champions League','Qualification → Groups → Knockouts','badge-blue'],
            ['Europa League','Groups → Knockouts','badge-purple'],
            ['Conference League','Knockout format','badge-green'],
          ].map(([n,d,b]) => (
            <div key={n} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{n}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>{d}</div>
              </div>
              <span className={`badge ${b}`}>Active</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
