import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function EuropeanPage() {
  const [comps, setComps]           = useState([]);
  const [selected, setSelected]     = useState(null);
  const [fixtures, setFixtures]     = useState([]);
  const [participants, setParticipants] = useState([]);
  const [tab, setTab]               = useState('fixtures');

  // ====== LOCAL STORAGE PERSISTENCE ======
  // Load saved tab and selected competition on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('europeanTab');
    if (savedTab && ['fixtures', 'groups', 'participants'].includes(savedTab)) {
      setTab(savedTab);
    }
  }, []);

  useEffect(() => {
    const savedCompId = localStorage.getItem('selectedEuropeanComp');
    if (savedCompId && comps.length > 0) {
      const comp = comps.find(c => c.id === savedCompId);
      if (comp) {
        setSelected(comp);
      }
    }
  }, [comps]);

  // Save tab when it changes
  useEffect(() => {
    localStorage.setItem('europeanTab', tab);
  }, [tab]);

  // Save selected competition when it changes
  useEffect(() => {
    if (selected) {
      localStorage.setItem('selectedEuropeanComp', selected.id);
    }
  }, [selected]);

  useEffect(() => {
    apiFetch('GET','european_competitions?is_active=eq.true&select=*').then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setComps(data);
      if (data.length > 0) {
        // Check for saved selection
        const savedCompId = localStorage.getItem('selectedEuropeanComp');
        if (savedCompId) {
          const comp = data.find(c => c.id === savedCompId);
          if (comp) {
            setSelected(comp);
          } else {
            setSelected(data[0]);
          }
        } else {
          setSelected(data[0]);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiFetch('GET',`european_fixtures?competition_id=eq.${selected.id}&select=*,home:home_team_id(name),away:away_team_id(name)&order=round`).then(r => setFixtures(Array.isArray(r.data)?r.data:[]));
    apiFetch('GET',`european_participants?competition_id=eq.${selected.id}&select=*,teams(name,total_points,wins,draws,losses,goals_for,goals_against)`).then(r => setParticipants(Array.isArray(r.data)?r.data:[]));
  }, [selected]);

  const badgeCls = (name='') => name.toLowerCase().includes('champions')?'badge-blue':name.toLowerCase().includes('europa')?'badge-purple':'badge-green';
  const groups = [...new Set(participants.map(p=>p.group_name))].filter(Boolean);

  function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  return (
    <div>
      <h2 className="section-title gradient-text">🇪🇺 European Competitions</h2>
      {comps.length === 0
        ? <div className="card empty-state"><div className="empty-icon">🏆</div><p>European competitions appear here once the season starts.</p></div>
        : <>
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
            {comps.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelected(c)} 
                className={`btn ${selected?.id===c.id?'btn-primary':'btn-secondary'}`} 
                style={{ fontSize: '.875rem' }}
              >
                {c.name}
              </button>
            ))}
          </div>
          {selected && <>
            <div className="card" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontWeight: 700 }}>{selected.name}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${badgeCls(selected.name)}`}>{selected.phase||'Group Stage'}</span>
                <span className="badge badge-yellow">Season {selected.season}</span>
                <span className="badge badge-gray">{participants.length} teams</span>
              </div>
            </div>
            <div className="tabs">
              {['fixtures','groups','participants'].map(t => (
                <button 
                  key={t} 
                  className={`tab ${tab===t?'active':''}`} 
                  onClick={() => setTab(t)}
                >
                  {t.charAt(0).toUpperCase()+t.slice(1)} 
                  {t === 'fixtures' && fixtures.length > 0 && (
                    <span className="badge badge-gray" style={{ fontSize: '0.6rem', marginLeft: '4px' }}>{fixtures.length}</span>
                  )}
                  {t === 'participants' && participants.length > 0 && (
                    <span className="badge badge-gray" style={{ fontSize: '0.6rem', marginLeft: '4px' }}>{participants.length}</span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'fixtures' && (
              fixtures.length === 0
                ? <div className="card empty-state"><div className="empty-icon">📅</div>Fixtures will be generated by admin</div>
                : [...new Set(fixtures.map(f=>f.round))].map(r => {
                    const roundFixtures = fixtures.filter(f => f.round === r);
                    const firstDate = roundFixtures[0]?.scheduled_date;
                    
                    return (
                      <div key={r} className="card" style={{ marginBottom: '.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--muted)' }}>
                            Round {r}
                            {firstDate && (
                              <span style={{ marginLeft: '12px', fontSize: '.75rem', color: 'var(--blue)' }}>
                                📅 {formatDate(firstDate)}
                              </span>
                            )}
                          </div>
                          <span className="badge badge-gray">{roundFixtures.length} matches</span>
                        </div>
                        {roundFixtures.map(f => (
                          <div key={f.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ flex:1, textAlign:'right', fontWeight:600, fontSize:'.875rem' }}>{f.home?.name||'TBD'}</div>
                            <div style={{ padding:'0 16px', fontWeight:700, color:f.status==='approved'?'var(--yellow)':'var(--muted)' }}>
                              {f.status==='approved'?`${f.home_score} – ${f.away_score}`:'vs'}
                            </div>
                            <div style={{ flex:1, fontSize:'.875rem' }}>{f.away?.name||'TBD'}</div>
                            <span className={`badge ${f.status==='approved'?'badge-green':'badge-gray'}`}>
                              {f.status==='approved'?'Final':'Sched.'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })
            )}

            {tab==='groups' && (
              groups.length===0
                ? <div className="card empty-state"><div className="empty-icon">📊</div>Groups not yet assigned</div>
                : groups.map(g=>(
                  <div key={g} className="card" style={{ marginBottom:'1rem' }}>
                    <div style={{ fontWeight:700, marginBottom:'.75rem' }}>Group {g}</div>
                    <div className="table-wrap">
                      <table>
                        <thead><tr>{['Team','W','D','L','Pts'].map(h=><th key={h}>{h}</th>)}</tr></thead>
                        <tbody>
                          {participants.filter(p=>p.group_name===g).map(p=>(
                            <tr key={p.id}>
                              <td style={{ fontWeight:600 }}>{p.teams?.name}</td>
                              <td>{p.teams?.wins||0}</td>
                              <td>{p.teams?.draws||0}</td>
                              <td>{p.teams?.losses||0}</td>
                              <td className="pts">{p.teams?.total_points||0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
            )}

            {tab==='participants' && (
              <div className="card">
                {participants.length===0
                  ? <div className="empty-state">No participants yet</div>
                  : participants.map(p=>(
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontWeight:600 }}>{p.teams?.name}</span>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {p.group_name && <span className="badge badge-blue">Group {p.group_name}</span>}
                        <span className={`badge ${p.is_eliminated?'badge-red':'badge-green'}`}>
                          {p.is_eliminated?'Eliminated':p.phase||'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>}
        </>}
    </div>
  );
}
