import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function LeaguesPage() {
  const [leagues, setLeagues]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [standings, setStandings] = useState([]);
  const [fixtures, setFixtures]   = useState([]);
  const [tab, setTab]             = useState('standings');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    apiFetch('GET','leagues?select=*&order=country').then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setLeagues(data);
      if (data.length > 0) setSelected(data[0]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiFetch('GET',`teams?league_id=eq.${selected.id}&select=*&order=total_points.desc`).then(r => setStandings(Array.isArray(r.data) ? r.data : []));
    apiFetch('GET',`fixtures?league_id=eq.${selected.id}&select=*,home:home_team_id(name),away:away_team_id(name)&order=round`).then(r => setFixtures(Array.isArray(r.data) ? r.data : []));
  }, [selected]);

  function zoneClass(i, total) {
    const rel = total - (selected?.relegation_spots || 3);
    if (i < 3) return 'zone-cl';
    if (i < 5) return 'zone-el';
    if (i < 6) return 'zone-conf';
    if (i >= rel) return 'zone-rel';
    return '';
  }

  const tier1 = leagues.filter(l => l.tier === 1);
  const tier2 = leagues.filter(l => l.tier === 2);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <h2 className="section-title gradient-text">🏟️ Leagues</h2>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* Sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="card" style={{ padding: '.75rem' }}>
            {tier1.length > 0 && <>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Division 1</div>
              {tier1.map(l => <div key={l.id} onClick={() => setSelected(l)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selected?.id === l.id ? 'rgba(255,210,0,0.1)' : 'transparent', color: selected?.id === l.id ? 'var(--yellow)' : 'var(--text)', marginBottom: 2, fontSize: '.85rem' }}>{l.country} – {l.name}</div>)}
            </>}
            {tier2.length > 0 && <>
              <div style={{ fontSize: '.72rem', color: 'var(--muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '.05em', margin: '8px 0 4px' }}>Division 2</div>
              {tier2.map(l => <div key={l.id} onClick={() => setSelected(l)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selected?.id === l.id ? 'rgba(255,210,0,0.1)' : 'transparent', color: selected?.id === l.id ? 'var(--yellow)' : 'var(--text)', marginBottom: 2, fontSize: '.85rem' }}>▼ {l.country} – {l.name}</div>)}
            </>}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected ? <>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selected.country} {selected.name}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-yellow">Season {selected.current_season}</span>
                  <span className="badge badge-gray">Tier {selected.tier}</span>
                </div>
              </div>
            </div>

            <div className="tabs">
              {['standings','fixtures'].map(t => <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>)}
            </div>

            {tab === 'standings' && (
              <div className="card">
                {/* Zone legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
                  {[['#1d4ed8','Champions League'],['#ea580c','Europa League'],['#7c3aed','Conference'],['var(--red)','Relegation']].map(([c,l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.72rem', color: 'var(--muted)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr>{['#','Team','P','W','D','L','GF','GA','GD','Pts'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {standings.length === 0
                        ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No teams yet</td></tr>
                        : standings.map((t,i) => (
                          <tr key={t.id} className={zoneClass(i, standings.length)}>
                            <td className={`pos ${i===0?'pos-1':i===1?'pos-2':i===2?'pos-3':''}`}>{i+1}</td>
                            <td style={{ fontWeight: 600 }}>{t.name}</td>
                            <td>{t.matches_played||0}</td><td>{t.wins||0}</td><td>{t.draws||0}</td><td>{t.losses||0}</td>
                            <td>{t.goals_for||0}</td><td>{t.goals_against||0}</td><td>{t.goal_difference||0}</td>
                            <td className="pts">{t.total_points||0}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'fixtures' && (
              <div>
                {fixtures.length === 0
                  ? <div className="card empty-state"><div className="empty-icon">📅</div>No fixtures generated yet</div>
                  : [...new Set(fixtures.map(f=>f.round))].map(round => (
                      <div key={round} className="card" style={{ marginBottom: '.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.75rem' }}>Round {round}</div>
                        {fixtures.filter(f=>f.round===round).map(f => (
                          <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ flex: 1, textAlign: 'right', fontWeight: 600, fontSize: '.875rem' }}>{f.home?.name||'TBD'}</div>
                            <div style={{ padding: '0 16px', fontWeight: 700, color: f.status==='approved'?'var(--yellow)':'var(--muted)' }}>{f.status==='approved'?`${f.home_score} – ${f.away_score}`:'vs'}</div>
                            <div style={{ flex: 1, fontSize: '.875rem' }}>{f.away?.name||'TBD'}</div>
                            <span className={`badge ${f.status==='approved'?'badge-green':f.status==='pending_review'?'badge-warn':'badge-gray'}`}>{f.status==='approved'?'Final':f.status==='pending_review'?'Review':'Sched.'}</span>
                          </div>
                        ))}
                      </div>
                    ))}
              </div>
            )}
          </> : <div className="card empty-state"><div className="empty-icon">🏟️</div>Select a league</div>}
        </div>
      </div>
    </div>
  );
}
