import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

const SECTIONS = [
  ['dashboard', '📊 Dashboard Summary'],
  ['leagues', '🏟️ Stadium Divisions'],
  ['fixtures', '📅 Fixtures Engine'],
  ['points', '✏️ Adjust Team Points'],
  ['users', '👥 Registered Users'],
];

export default function AdminPage({ user, profile }) {
  const [section, setSection] = useState('dashboard');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('success');
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [fixtureList, setFixtureList] = useState([]);
  const [genLeague, setGenLeague] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Announcement States
  const [announcements, setAnnouncements] = useState([]);
  const [annMessage, setAnnMessage] = useState('');

  // Form Management States
  const [nlName, setNlName] = useState('');
  const [nlCountry, setNlCountry] = useState('');
  const [nlTier, setNlTier] = useState('1');
  const [nlSlots, setNlSlots] = useState('16');
  const [nlSeason, setNlSeason] = useState('2026-27');
  
  const [adjTeam, setAdjTeam] = useState('');
  const [adjPts, setAdjPts] = useState('0');

  // Custom HTTP fetch wrapper targeting Supabase Rest API Engine
  async function rFetch(method, path, body, ex = {}) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          ...ex,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      let d = null;
      const text = await r.text();
      try { d = JSON.parse(text); } catch { d = text; }
      return { ok: r.ok, status: r.status, data: d };
    } catch (error) {
      console.error('rFetch exception:', error);
      return { ok: false, status: 500, data: null };
    }
  }

  function showMsg(text, type = 'success') {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  }

  // Fetch announcements ledger records
  const loadAnnouncements = useCallback(async () => {
    try {
      const r = await apiFetch('GET', 'announcements?select=*&order=created_at.desc');
      setAnnouncements(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      console.error('Error loading announcements:', err);
    }
  }, []);

  // Main system data pre-load matrix
  const loadAll = useCallback(async () => {
    try {
      const [l, t] = await Promise.all([
        apiFetch('GET', 'leagues?select=*&order=country'),
        apiFetch('GET', 'teams?select=*&order=total_points.desc'),
      ]);

      setLeagues(Array.isArray(l.data) ? l.data : []);
      setTeams(Array.isArray(t.data) ? t.data : []);

      // BULLETPROOF USER FALLBACK ENGINE (Ensures all 20/20 players pull cleanly)
      let userResponse = await apiFetch('GET', 'profiles?select=id,username,email,role,is_blocked,created_at,phone,phone_number,league_id&order=created_at.desc');
      if (!userResponse || !Array.isArray(userResponse.data) || userResponse.data.length === 0) {
        console.warn("Profiles table empty, falling back to core auth collection engine...");
        userResponse = await apiFetch('GET', 'users?select=id,username,email,role,is_blocked,created_at,phone,phone_number,league_id&order=created_at.desc');
      }
      setUsers(userResponse && Array.isArray(userResponse.data) ? userResponse.data : []);

    } catch (error) {
      console.error('loadAll error:', error);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadAnnouncements();
  }, [loadAll, loadAnnouncements]);

  async function loadFixturesForLeague(leagueId) {
    if (!leagueId) return;
    const r = await apiFetch('GET', `fixtures?league_id=eq.${leagueId}&select=*,home:home_team_id(name),away:away_team_id(name)&order=round.asc`);
    setFixtureList(Array.isArray(r.data) ? r.data : []);
  }

  // Announcement push execution with explicit view cascade recall hooks
  async function saveAnnouncement() {
    if (!annMessage.trim()) { showMsg('Broadcast notice content message cannot be empty!', 'danger'); return; }
    
    const r = await rFetch('POST', 'announcements', { message: annMessage, created_by: user?.id });
    if (r.ok) {
      showMsg('📢 Tournament broadcast statement published successfully!');
      setAnnMessage('');
      await loadAnnouncements(); // Forces UI to re-render records cleanly
    } else {
      showMsg('Error writing broadcast data stream to table schema rules.', 'danger');
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm('Permanently purge this operational bulletin?')) return;
    const r = await rFetch('DELETE', `announcements?id=eq.${id}`);
    if (r.ok) {
      showMsg('❌ Bulletin item successfully dropped.');
      await loadAnnouncements();
    }
  }

  async function createNewLeague() {
    if (!nlName || !nlCountry) { showMsg('Please complete all structural division parameters.', 'danger'); return; }
    const r = await rFetch('POST', 'leagues', {
      name: nlName,
      country: nlCountry,
      tier: parseInt(nlTier),
      slots: parseInt(nlSlots),
      season: nlSeason
    });
    if (r.ok) {
      showMsg('🏟️ New Championship League deployed into registry framework!');
      setNlName('');
      setNlCountry('');
      loadAll();
    }
  }

  async function generateFixtures() {
    if (!genLeague) { showMsg('Select a target division league segment first.', 'danger'); return; }
    const r = await apiFetch('GET', `teams?league_id=eq.${genLeague}&select=id`);
    const ids = Array.isArray(r.data) ? r.data.map(t => t.id) : [];
    if (ids.length < 2) { showMsg('Insufficient competitors grouped inside division to compile schedule.', 'danger'); return; }
    
    const arr = [...ids];
    if (arr.length % 2 !== 0) arr.push(null);
    const n = arr.length, rounds = n - 1, fx = [];
    const rot = [...arr];

    for (let rv = 0; rv < rounds; rv++) {
      for (let i = 0; i < n / 2; i++) {
        const h = rot[i], a = rot[n - 1 - i];
        if (h && a) fx.push({ league_id: genLeague, home_team_id: h, away_team_id: a, round: rv + 1, status: 'pending' });
      }
      rot.splice(1, 0, rot.pop());
    }
    
    const doubleRound = fx.map(f => ({
      league_id: f.league_id,
      home_team_id: f.away_team_id,
      away_team_id: f.home_team_id,
      round: f.round + rounds,
      status: 'pending',
    }));

    const saveResult = await rFetch('POST', 'fixtures', [...fx, ...doubleRound]);
    if (saveResult.ok) {
      showMsg(`📅 Generated ${fx.length * 2} symmetric fixture matches safely into database!`);
      loadFixturesForLeague(genLeague);
    }
  }

  async function assignLeagueToUser(uid, leagueId) {
    const target = leagueId === '' ? null : leagueId;
    let r = await rFetch('PATCH', `profiles?id=eq.${uid}`, { league_id: target });
    if (!r.ok) r = await rFetch('PATCH', `users?id=eq.${uid}`, { league_id: target });
    if (r.ok) {
      showMsg('👤 Competitor operational workspace alignment modified.');
      loadAll();
    }
  }

  async function adjustTeamPoints() {
    if (!adjTeam) { showMsg('Select an active competitor club squad first.', 'danger'); return; }
    const r = await apiFetch('GET', `teams?id=eq.${adjTeam}&select=total_points`);
    const cur = Array.isArray(r.data) && r.data[0] ? r.data[0].total_points || 0 : 0;
    const nextPoints = Math.max(0, cur + parseInt(adjPts || 0));
    
    const update = await rFetch('PATCH', `teams?id=eq.${adjTeam}`, { total_points: nextPoints });
    if (update.ok) {
      showMsg(`✏️ Standard table standing forced adjustments saved! Current: ${nextPoints} Pts.`);
      setAdjPts('0');
      loadAll();
    }
  }

  // DYNAMIC SLOTS CALCULATION ENGINE
  const totalLeagueSlotsCapacity = leagues.reduce((acc, curr) => acc + (parseInt(curr.slots) || 0), 0);

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // INLINE BRANDING GRADIENT ARCHITECTURE (eFootball Pro Tech Aesthetic Theme)
  const styles = {
    container: { background: '#0a0a10', color: '#f1f1f7', minHeight: '100vh', fontFamily: '"Rajdhani", "Segoe UI", sans-serif', padding: '2rem' },
    header: { background: 'linear-gradient(135deg, #121225 0%, #1a0b36 100%)', borderBottom: '2px solid #9d4edd', padding: '1.5rem 2rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(157, 78, 221, 0.15)' },
    titleGlow: { textTransform: 'uppercase', letterSpacing: '2px', background: 'linear-gradient(90deg, #00bcff, #9d4edd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, fontWeight: 800, fontSize: '1.75rem' },
    badgeNeon: { background: 'rgba(0, 188, 255, 0.1)', border: '1px solid #00bcff', color: '#00bcff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', boxShadow: '0 0 10px rgba(0, 188, 255, 0.2)' },
    layout: { display: 'flex', gap: '2rem' },
    sidebar: { width: '260px', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
    navBtn: (active) => ({
      textAlign: 'left', padding: '1rem', borderRadius: '8px', border: 'none',
      background: active ? 'linear-gradient(90deg, #9d4edd 0%, #00bcff 100%)' : '#141424',
      color: '#fff', cursor: 'pointer', fontWeight: 600, transition: 'all 0.3s ease',
      boxShadow: active ? '0 0 15px rgba(157, 78, 221, 0.4)' : 'none',
      borderLeft: active ? '4px solid #fff' : '4px solid transparent'
    }),
    cardWorkspace: { flex: 1, background: '#111122', border: '1px solid #23233d', padding: '2rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    metricCard: { background: '#161630', borderLeft: '4px solid #00bcff', padding: '1.5rem', borderRadius: '8px', flex: 1, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
    neonInput: { background: '#090914', border: '1px solid #323254', color: '#fff', padding: '0.75rem 1rem', borderRadius: '6px', width: '100%', outline: 'none', transition: 'border 0.3s' },
    neonBtn: { background: 'linear-gradient(135deg, #00bcff 0%, #4361ee 100%)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '1rem', background: '#131326' },
    th: { background: '#1c1c3a', color: '#00bcff', padding: '1rem', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '2px solid #2d2d54' },
    td: { padding: '1rem', borderBottom: '1px solid #232342', color: '#e2e2ee', fontSize: '0.95rem' }
  };

  return (
    <div style={styles.container}>
      {/* Top Gaming HUD Header Row */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.titleGlow}>🎮 eFootball HQ Ops Deck</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#8282a0' }}>Live Tournament Management Ecosystem</p>
        </div>
        <span style={styles.badgeNeon}>Server Administrator Status</span>
      </div>

      {msg && (
        <div style={{ background: msgType === 'danger' ? '#781d1d' : '#1b5e3a', color: '#fff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: msgType === 'danger' ? '5px solid #ff3333' : '5px solid #00ffcc' }}>
          {msg}
        </div>
      )}

      <div style={styles.layout}>
        {/* Navigation Deck */}
        <div style={styles.sidebar}>
          {SECTIONS.map(([id, label]) => (
            <button key={id} style={styles.navBtn(section === id)} onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Dynamic Display Canvas Grid */}
        <div style={styles.cardWorkspace}>
          
          {/* DASHBOARD SUMMARY VIEW */}
          {section === 'dashboard' && (
            <div>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={styles.metricCard}>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0c0', textTransform: 'uppercase', fontWeight: 'bold' }}>Roster Attendance Matrix</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#00ffcc', marginTop: '0.5rem' }}>
                    {users.length} / {totalLeagueSlotsCapacity} Players
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#686888', marginTop: '4px' }}>Real calculated dynamic limits applied</div>
                </div>
                <div style={{ ...styles.metricCard, borderLeftColor: '#9d4edd' }}>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0c0', textTransform: 'uppercase', fontWeight: 'bold' }}>Active Divisions</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{leagues.length} Arenas</div>
                </div>
                <div style={{ ...styles.metricCard, borderLeftColor: '#ffb703' }}>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0c0', textTransform: 'uppercase', fontWeight: 'bold' }}>Squad Registries</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>{teams.length} Clubs</div>
                </div>
              </div>

              {/* Announcements Section */}
              <div style={{ background: '#161630', padding: '1.5rem', borderRadius: '8px', border: '1px solid #2d2d54' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#00bcff' }}>📢 Global User Notification Broadcast</h3>
                <textarea 
                  style={{ ...styles.neonInput, minHeight: '80px', marginBottom: '1rem', fontFamily: 'inherit' }}
                  rows={3} value={annMessage} onChange={e => setAnnMessage(e.target.value)}
                  placeholder="Push updates regarding league rules, server adjustments, or schedule extensions..."
                />
                <button style={styles.neonBtn} onClick={saveAnnouncement}>Transmit Broadcast Notice</button>

                <h4 style={{ marginTop: '2rem', borderBottom: '1px solid #2d2d54', paddingBottom: '0.5rem', color: '#9d4edd' }}>Active Published Bulletins ({announcements.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {announcements.map(ann => (
                    <div key={ann.id} style={{ background: '#090914', padding: '1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #1f1f3a' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#d2d2e0' }}>{ann.message}</p>
                      <button style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '1.1rem' }} onClick={() => deleteAnnouncement(ann.id)}>🗑️</button>
                    </div>
                  ))}
                  {announcements.length === 0 && <p style={{ color: '#686888', fontStyle: 'italic' }}>No broadcast statements pushed to the live client grid yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* STADIUM DIVISION LEAGUES MANAGER */}
          {section === 'leagues' && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#00bcff' }}>🏟️ Championship League Infrastructure Setup</h3>
              <div style={{ background: '#161630', padding: '1.5rem', borderRadius: '8px', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <input style={{ ...styles.neonInput, flex: 2 }} placeholder="League Division Name (e.g. English Premier League)" value={nlName} onChange={e => setNlName(e.target.value)} />
                <input style={{ ...styles.neonInput, flex: 1 }} placeholder="Country Location" value={nlCountry} onChange={e => setNlCountry(e.target.value)} />
                <input style={{ ...styles.neonInput, width: '90px' }} type="number" placeholder="Tier" value={nlTier} onChange={e => setNlTier(e.target.value)} />
                <input style={{ ...styles.neonInput, width: '110px' }} type="number" placeholder="Max Slots" value={nlSlots} onChange={e => setNlSlots(e.target.value)} />
                <button style={styles.neonBtn} onClick={createNewLeague}>➕ Save Division</button>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>League Arena</th>
                    <th style={styles.th}>Territory</th>
                    <th style={styles.th}>Hierarchy Level</th>
                    <th style={styles.th}>Total Capacity Cap</th>
                    <th style={styles.th}>Active Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map(l => (
                    <tr key={l.id}>
                      <td style={styles.td}><strong>{l.name}</strong></td>
                      <td style={styles.td}>{l.country}</td>
                      <td style={styles.td}>Tier {l.tier}</td>
                      <td style={styles.td}><span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{l.slots} Slots</span></td>
                      <td style={styles.td}><span style={{ color: '#9d4edd' }}>{l.season}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FIXTURES GENERATION PLATFORM */}
          {section === 'fixtures' && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#00bcff' }}>📅 Automatic Round Robin Pairing System</h3>
              <div style={{ background: '#161630', padding: '1.5rem', borderRadius: '8px', display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <select style={{ ...styles.neonInput, flex: 1 }} value={genLeague} onChange={e => { setGenLeague(e.target.value); loadFixturesForLeague(e.target.value); }}>
                  <option value="" style={{ background: '#111' }}>-- Choose Target Arena Sector --</option>
                  {leagues.map(l => <option key={l.id} value={l.id} style={{ background: '#111' }}>{l.name}</option>)}
                </select>
                <button style={{ ...styles.neonBtn, background: 'linear-gradient(135deg, #9d4edd 0%, #6f2dbd 100%)' }} onClick={generateFixtures}>⚡ Draw Match Combinations</button>
              </div>

              <h4 style={{ color: '#00ffcc', marginBottom: '0.5rem' }}>Fixtures Ledger Index ({fixtureList.length} Matchups)</h4>
              <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #232342', borderRadius: '6px' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Round Index</th>
                      <th style={styles.th}>Home Club Squad</th>
                      <th style={styles.th} style={{ textAlign: 'center' }}>vs</th>
                      <th style={styles.th}>Away Club Squad</th>
                      <th style={styles.th}>Match Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixtureList.map(f => (
                      <tr key={f.id}>
                        <td style={styles.td}>Matchday Week {f.round}</td>
                        <td style={styles.td} style={{ color: '#00bcff' }}>{f.home?.name || 'Unknown'}</td>
                        <td style={styles.td} style={{ textAlign: 'center', fontWeight: 'bold', color: '#888' }}>VS</td>
                        <td style={styles.td} style={{ color: '#9d4edd' }}>{f.away?.name || 'Unknown'}</td>
                        <td style={styles.td}><span style={{ color: '#ffb703', textTransform: 'uppercase', fontSize: '0.8rem' }}>{f.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OVERRIDE TEAM LEAGUE STANDINGS POINTS */}
          {section === 'points' && (
            <div style={{ background: '#161630', padding: '2rem', borderRadius: '8px', border: '1px solid #2d2d54' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#00bcff' }}>✏️ Disciplinary & Standings Override Interface</h3>
              <p style={{ color: '#8282a0', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Directly adjust active competitor club point metrics to fix score recording conflicts or enforce deductions.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '480px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0c0', marginBottom: '0.5rem' }}>Target Club Entity</label>
                  <select style={styles.neonInput} value={adjTeam} onChange={e => setAdjTeam(e.target.value)}>
                    <option value="" style={{ background: '#111' }}>-- Select Target Team Roster --</option>
                    {teams.map(t => <option key={t.id} value={t.id} style={{ background: '#111' }}>{t.name} (Current Base: {t.total_points} Pts)</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#a0a0c0', marginBottom: '0.5rem' }}>Points Variance Delta (Supports Negative Shifts)</label>
                  <input style={styles.neonInput} type="number" value={adjPts} onChange={e => setAdjPts(e.target.value)} placeholder="e.g. 3 to award, or -3 to deduct" />
                </div>

                <button style={styles.neonBtn} onClick={adjustTeamPoints}>Commit Points Adjustment Alteration</button>
              </div>
            </div>
          )}

          {/* USER RETRIEVAL MATRIX ROSTER REGISTER */}
          {section === 'users' && (
            <div>
              <h3 style={{ margin: '0 0 1rem 0', color: '#00bcff' }}>👥 Registered Operational Competitor Database</h3>
              <input style={{ ...styles.neonInput, marginBottom: '1.5rem' }} placeholder="Search through user indexes via email or registered username strings..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>User Persona Name</th>
                    <th style={styles.th}>Auth Core Email Account</th>
                    <th style={styles.th}>Division Sector Group Alignment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td style={styles.td} style={{ color: '#00ffcc', fontWeight: 'bold' }}>{u.username || '—'}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <select style={{ ...styles.neonInput, padding: '0.4rem', width: 'auto' }} value={u.league_id || ''} onChange={e => assignLeagueToUser(u.id, e.target.value)}>
                          <option value="" style={{ background: '#111' }}>-- Unallocated / Free Agent Status --</option>
                          {leagues.map(l => <option key={l.id} value={l.id} style={{ background: '#111' }}>{l.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
