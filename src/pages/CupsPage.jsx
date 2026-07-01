import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/supabase';

export default function CupsPage() {
  const [cups, setCups]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [fixtures, setFixtures] = useState([]);

  // ====== LOCAL STORAGE PERSISTENCE ======
  // Load saved selected cup on mount
  useEffect(() => {
    const savedCupId = localStorage.getItem('selectedCup');
    if (savedCupId && cups.length > 0) {
      const cup = cups.find(c => c.id === savedCupId);
      if (cup) {
        setSelected(cup);
      }
    }
  }, [cups]);

  // Save selected cup when it changes
  useEffect(() => {
    if (selected) {
      localStorage.setItem('selectedCup', selected.id);
    }
  }, [selected]);

  useEffect(() => {
    apiFetch('GET','cups?is_active=eq.true&select=*,leagues(name,country)').then(r => {
      const data = Array.isArray(r.data) ? r.data : [];
      setCups(data);
      if (data.length > 0) {
        // Check if there's a saved selection
        const savedCupId = localStorage.getItem('selectedCup');
        if (savedCupId) {
          const cup = data.find(c => c.id === savedCupId);
          if (cup) {
            setSelected(cup);
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
    apiFetch('GET',`cup_fixtures?cup_id=eq.${selected.id}&select=*,home:home_team_id(name),away:away_team_id(name)&order=round`).then(r => setFixtures(Array.isArray(r.data)?r.data:[]));
  }, [selected]);

  const roundName = r => ({ 1:'Final',2:'Semi-Final',4:'Quarter-Final',8:'Round of 16',16:'Round of 32' }[r]||`Round of ${r*2}`);

  return (
    <div>
      <h2 className="section-title gradient-text">🏆 Cups</h2>
      {cups.length===0
        ? <div className="card empty-state"><div className="empty-icon">🏆</div>No active cup competitions</div>
        : <>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
            {cups.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelected(c)} 
                className={`btn ${selected?.id===c.id?'btn-primary':'btn-secondary'}`}
              >
                {c.name} – {c.leagues?.country||''}
              </button>
            ))}
          </div>
          {selected && <>
            <div className="card" style={{ marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px' }}>
              <h3 style={{ fontWeight:700 }}>{selected.name}</h3>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span className="badge badge-yellow">{selected.format||'Knockout'}</span>
                {selected.leagues?.country && <span className="badge badge-blue">{selected.leagues.country}</span>}
                <span className="badge badge-gray">{fixtures.length} matches</span>
              </div>
            </div>
            {fixtures.length===0
              ? <div className="card empty-state"><div className="empty-icon">📅</div>No fixtures yet</div>
              : [...new Set(fixtures.map(f=>f.round))].sort((a,b)=>a-b).map(r => {
                  const roundFixtures = fixtures.filter(f => f.round === r);
                  const firstDate = roundFixtures[0]?.scheduled_date;
                  
                  return (
                    <div key={r} className="card" style={{ marginBottom:'.75rem' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.75rem', flexWrap:'wrap', gap:'8px' }}>
                        <div style={{ fontWeight:600, fontSize:'.85rem', color:'var(--muted)' }}>
                          {roundName(r)}
                          {firstDate && (
                            <span style={{ marginLeft:'12px', fontSize:'.75rem', color:'var(--blue)' }}>
                              📅 {new Date(firstDate).toLocaleDateString()}
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
                            {f.status==='approved'?'Final':'Scheduled'}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
          </>}
        </>}
    </div>
  );
}
