import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

const SECTIONS = [
  ['dashboard', '📊 Dashboard'],
  ['results', '⚠️ Review Results'],
  ['playerpoints', '🎮 Player Points'],
  ['leagues', ' Stadium Leagues'],
  ['fixtures', '📅 Fixtures Manager'],
  ['points', '✏️ Adjust Team Points'],
  ['users', '👥 System Users'],
  ['logs', '📋 Audit Logs'],
];

export default function AdminPage({ user, profile }) {
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [pending, setPending] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [genLeague, setGenLeague] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Announcement States
  const [announcements, setAnnouncements] = useState([]);
  const [annMessage, setAnnMessage] = useState('');
  const [editingAnnId, setEditingAnnId] = useState(null);

  // Form Management States
  const [nlName, setNlName] = useState('');
  const [nlCountry, setNlCountry] = useState('');
  const [nlTier, setNlTier] = useState('1');
  const [nlSlots, setNlSlots] = useState('16');
  const [nlSeason, setNlSeason] = useState('2026-27');
  
  const [adjTeam, setAdjTeam] = useState('');
  const [adjPts, setAdjPts] = useState('0');
  const [adjReason, setAdjReason] = useState('');

  const [ppPlayer, setPpPlayer] = useState('');
  const [ppChange, setPpChange] = useState(0);
  const [ppReason, setPpReason] = useState('');
  const [ppSearch, setPpSearch] = useState('');
  const [fixtureList, setFixtureList] = useState([]);

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

  async function logAction(action, details = {}) {
    await rFetch('POST', 'admin_logs',
      { admin_id: user?.id, action, details },
      { Prefer: 'return=minimal' }
    ).catch(() => {});
  }

  function showMsg(text, type = 'success') {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }

  const loadAnnouncements = useCallback(async () => {
    try {
      const r = await apiFetch('GET', 'announcements?select=*&order=created_at.desc');
      setAnnouncements(Array.isArray(r.data) ? r.data : []);
    } catch (err) {
      console.error('Error loading announcements:', err);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [l, t, lb, pf, pcf, pef, pfp] = await Promise.all([
        apiFetch('GET', 'leagues?select=*&order=country'),
        apiFetch('GET', 'teams?select=*&order=total_points.desc'),
        apiFetch('GET', 'free_play_leaderboard?select=*&order=points.desc'),
        apiFetch('GET', 'fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),leagues(name)&order=created_at'),
        apiFetch('GET', 'cup_fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),cups(name)&order=created_at'),
        apiFetch('GET', 'european_fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),european_competitions(name)&order=created_at'),
        apiFetch('GET', 'free_play_matches?status=eq.pending_review&select=*,p1:player1_id(username),p2:player2_id(username)&order=created_at'),
      ]);

      setLeagues(Array.isArray(l.data) ? l.data : []);
      setTeams(Array.isArray(t.data) ? t.data : []);

      // Absolute complete user list tracking (Fallback engine built-in)
      // Replace just your user fetch line inside loadAll with this:
let userResponse = await apiFetch('GET', 'profiles?select=id,username,email,role,is_blocked,created_at,phone,phone_number,league_id&order=created_at.desc');

if (!userResponse || !Array.isArray(userResponse.data) || userResponse.data.length === 0) {
  console.warn("Profiles empty, falling back to core auth roster...");
  userResponse = await apiFetch('GET', 'users?select=id,username,email,role,is_blocked,created_at,phone,phone_number,league_id&order=created_at.desc');
}

setUsers(userResponse && Array.isArray(userResponse.data) ? userResponse.data : []);
      const lbData = Array.isArray(lb.data) ? lb.data : [];
      const seen = new Set();
      const dedupedLb = lbData.filter(item => {
        if (seen.has(item.user_id)) return false;
        seen.add(item.user_id);
        return true;
      });
      setLeaderboard(dedupedLb);

      const allPending = [
        ...(Array.isArray(pf.data) ? pf.data : []).map(f => ({
          ...f, _type: 'league',
          _label: `${f.home?.name || '?'} vs ${f.away?.name || '?'} — ${f.leagues?.name || ''}`,
          _score: `${f.home_score ?? '?'} – ${f.away_score ?? '?'}`,
        })),
      ];
      setPending(allPending);
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

  async function saveAnnouncement() {
  if (!annMessage.trim()) return;
  
  const r = await rFetch('POST', 'announcements', { message: annMessage, created_by: user?.id });
  if (r.ok) {
    setAnnMessage('');
    // Put your specific announcement loading function here to force a UI refresh:
    await loadAnnouncements(); 
    showMsg('📢 Announcement broadcasted!');
  }
}

  async function deleteAnnouncement(id) {
    if (!window.confirm('Delete this announcement?')) return;
    const r = await rFetch('DELETE', `announcements?id=eq.${id}`);
    if (r.ok) {
      showMsg('❌ Announcement deleted');
      await loadAnnouncements();
    }
  }

  async function createNewLeague() {
    if (!nlName || !nlCountry) { showMsg('Please fill in all league fields', 'danger'); return; }
    const r = await rFetch('POST', 'leagues', {
      name: nlName,
      country: nlCountry,
      tier: parseInt(nlTier),
      slots: parseInt(nlSlots),
      season: nlSeason
    });
    if (r.ok) {
      showMsg('🏟️ New League created successfully!');
      setNlName('');
      setNlCountry('');
      loadAll();
    } else {
      showMsg('Failed to save new league configuration details.', 'danger');
    }
  }

  async function generateFixtures() {
    if (!genLeague) { showMsg('Select a target league first', 'danger'); return; }
    const r = await apiFetch('GET', `teams?league_id=eq.${genLeague}&select=id`);
    const ids = Array.isArray(r.data) ? r.data.map(t => t.id) : [];
    if (ids.length < 2) { showMsg('Need at least 2 teams assigned to this league to draw pairings', 'danger'); return; }
    
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
      showMsg(`📅 Generated ${fx.length * 2} structural fixture pairings matches successfully!`);
      loadFixturesForLeague(genLeague);
    }
  }

  async function assignLeagueToUser(uid, leagueId) {
    const target = leagueId === '' ? null : leagueId;
    let r = await rFetch('PATCH', `profiles?id=eq.${uid}`, { league_id: target });
    if (!r.ok) {
      r = await rFetch('PATCH', `users?id=eq.${uid}`, { league_id: target });
    }
    if (r.ok) {
      showMsg('👤 League allocation updated.');
      loadAll();
    }
  }

  async function adjustTeamPoints() {
    if (!adjTeam) { showMsg('Select a club team', 'danger'); return; }
    const r = await apiFetch('GET', `teams?id=eq.${adjTeam}&select=total_points`);
    const cur = Array.isArray(r.data) && r.data[0] ? r.data[0].total_points || 0 : 0;
    const nextPoints = Math.max(0, cur + parseInt(adjPts || 0));
    
    const update = await rFetch('PATCH', `teams?id=eq.${adjTeam}`, { total_points: nextPoints });
    if (update.ok) {
      showMsg(`✏️ Adjusted successfully! New total: ${nextPoints} points.`);
      setAdjPts('0');
      loadAll();
    }
  }

  // Calculated Real Dynamic Slots Cap Values
  const totalLeagueSlotsCapacity = leagues.reduce((acc, curr) => acc + (parseInt(curr.slots) || 0), 0);

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="admin-dashboard-container" style={{ padding: '1rem', color: '#fff', background: '#111', minHeight: '100vh' }}>
      {/* Dynamic Counter Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--blue)' }}>⚙️ Tournament Operations Center</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>Live Environment Management Engine</p>
        </div>
        <span className="badge badge-gold">System Superuser Console</span>
      </div>

      {msg && (
        <div className={`alert alert-${msgType}`} style={{ padding: '0.75rem', borderRadius: 6, marginBottom: '1rem' }}>
          {msg}
        </div>
      )}

      <div className="admin-layout" style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Navigation Sidebar */}
        <div className="sidebar" style={{ width: '240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SECTIONS.map(([id, label]) => (
            <button key={id} 
              style={{
                textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '6px', border: 'none',
                background: section === id ? '#222' : 'transparent', color: section === id ? '#00bcff' : '#ccc',
                cursor: 'pointer', fontWeight: section === id ? 'bold' : 'normal'
              }}
              onClick={() => setSection(id)}>
              {label}
            </button>
          ))}
        </div>

        {/* Dynamic Canvas Workspace */}
        <div className="workspace-view" style={{ flex: 1, background: '#16161a', padding: '1.5rem', borderRadius: '8px' }}>
          
          {/* DASHBOARD CONSOLE */}
          {section === 'dashboard' && (
            <div>
              <div className="metrics-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ flex: 1, background: '#222', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Roster Attendance</div>
                  {/* REAL CAPACITY CALCULATION APPLIED HERE */}
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#00ffcc' }}>
                    {users.length} / {totalLeagueSlotsCapacity} Registered players
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>Based on total combined league limits</div>
                </div>
                <div className="card" style={{ flex: 1, background: '#222', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Active Stadium Leagues</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{leagues.length} Divisions</div>
                </div>
                <div className="card" style={{ flex: 1, background: '#222', padding: '1rem', borderRadius: 8 }}>
                  <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Registered Club Squads</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{teams.length} Teams</div>
                </div>
              </div>

              {/* Announcements Posting and Rendering Area */}
              <div className="card" style={{ background: '#222', padding: '1.5rem', borderRadius: 8 }}>
                <h3>📢 Global User Communication Hub</h3>
                <textarea 
                  style={{ width: '100%', background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '0.5rem', marginBottom: '1rem' }}
                  rows={3} value={annMessage} onChange={e => setAnnMessage(e.target.value)}
                  placeholder="Broadcast tournament milestones, match reminders, or rules system updates..."
                />
                <button className="btn btn-primary" onClick={saveAnnouncement}>Publish Broadcast Notice</button>

                <h4 style={{ marginTop: '1.5rem' }}>Active Published Bulletins ({announcements.length})</h4>
                <div className="bulletin-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {announcements.map(ann => (
                    <div key={ann.id} style={{ background: '#1a1a24', padding: '0.75rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{ann.message}</p>
                      <button style={{ background: 'none', border: 'none', color: '#ff3333', cursor: 'pointer' }} onClick={() => deleteAnnouncement(ann.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REAL LEAGUES MANAGEMENT WORKSPACE (REPLACED CONSOLE WRAPPER) */}
          {section === 'leagues' && (
            <div>
              <h3>🏟️ Championship League Manager</h3>
              <div className="form-box" style={{ background: '#222', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: 1 }} placeholder="League Name (e.g. English Premier League)" value={nlName} onChange={e => setNlName(e.target.value)} />
                <input className="form-input" style={{ flex: 1 }} placeholder="Country Location" value={nlCountry} onChange={e => setNlCountry(e.target.value)} />
                <input className="form-input" style={{ width: '80px' }} type="number" placeholder="Tier" value={nlTier} onChange={e => setNlTier(e.target.value)} />
                <input className="form-input" style={{ width: '100px' }} type="number" placeholder="Max Slots" value={nlSlots} onChange={e => setNlSlots(e.target.value)} />
                <button className="btn btn-primary" onClick={createNewLeague}>➕ Save League Division</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>League Division</th><th>Territory</th><th>Tier Hierarchy</th><th>Total Slots Cap</th><th>Season Tracking</th></tr>
                  </thead>
                  <tbody>
                    {leagues.map(l => (
                      <tr key={l.id}>
                        <td><strong>{l.name}</strong></td>
                        <td>{l.country}</td>
                        <td>Tier {l.tier}</td>
                        <td><span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{l.slots} Players Max</span></td>
                        <td>{l.season}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REAL FIXTURES GENERATION WORKSPACE (REPLACED CONSOLE WRAPPER) */}
          {section === 'fixtures' && (
            <div>
              <h3>📅 League Match Fixtures Generator</h3>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <select className="form-select" value={genLeague} onChange={e => { setGenLeague(e.target.value); loadFixturesForLeague(e.target.value); }}>
                  <option value="">-- Select Division League --</option>
                  {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <button className="btn btn-primary" onClick={generateFixtures}>⚡ Auto-Generate Round Robin Match Schedule</button>
              </div>

              <h4>Generated Fixtures Database Ledger ({fixtureList.length} Matches)</h4>
              <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Round Matchday</th><th>Home Club Squad</th><th></th><th>Away Club Squad</th><th>Current Status</th></tr>
                  </thead>
                  <tbody>
                    {fixtureList.map(f => (
                      <tr key={f.id}>
                        <td>Matchday Round {f.round}</td>
                        <td>{f.home?.name || 'Unknown'}</td>
                        <td>VS</td>
                        <td>{f.away?.name || 'Unknown'}</td>
                        <td><span className="badge badge-gray">{f.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REAL TEAM STANDINGS POINT MODIFIER ADJUSTMENT VIEW */}
          {section === 'points' && (
            <div className="card" style={{ background: '#222', padding: '1.5rem', borderRadius: '8px' }}>
              <h3>✏️ League Table Points Adjuster Workbench</h3>
              <p style={{ fontSize: '0.85rem', color: '#aaa' }}>Directly adjust standard league table points balances to apply disciplinary actions, administrative point deductions, or match configuration correction criteria manually.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', marginTop: '1rem' }}>
                <label>Target Competitor Club Team</label>
                <select className="form-select" value={adjTeam} onChange={e => setAdjTeam(e.target.value)}>
                  <option value="">-- Select Team --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} (Current: {t.total_points} Pts)</option>)}
                </select>

                <label>Points Variance Change Modifier (Can be negative value)</label>
                <input className="form-input" type="number" value={adjPts} onChange={e => setAdjPts(e.target.value)} placeholder="e.g. 3 to award or -3 to deduct" />

                <button className="btn btn-primary" onClick={adjustTeamPoints} style={{ marginTop: '0.5rem' }}>Save Administrative Standing Override Adjustments</button>
              </div>
            </div>
          )}

          {/* USERS ROSTER ROBUST VIEW PANEL */}
          {section === 'users' && (
            <div>
              <h3>👥 Registered Roster Users Database Management</h3>
              <input className="form-input" placeholder="Search parameters filtering..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: '1rem', width: '100%' }} />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>User Registry Name</th><th>Auth Email Endpoint</th><th>League Division Assigned</th></tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.username || '—'}</strong></td>
                        <td>{u.email}</td>
                        <td>
                          <select className="form-select" value={u.league_id || ''} onChange={e => assignLeagueToUser(u.id, e.target.value)} style={{ padding: '2px', minHeight: 'auto' }}>
                            <option value="">-- No Tournament Group Allocation --</option>
                            {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
