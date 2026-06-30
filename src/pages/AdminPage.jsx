import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

const SECTIONS = [
  ['dashboard',     '📊 Dashboard'],
  ['results',       '⚠️ Results'],
  ['playerpoints',  '🎮 Player Points'],
  ['leagues',       '🏟️ Leagues'],
  ['fixtures',      '📅 Fixtures'],
  ['cups',          '🏆 Cups'],
  ['european',      '🇪🇺 European'],
  ['points',        '✏️ Team Points'],
  ['relegation',    '📊 Relegation'],
  ['users',         '👥 Users'],
  ['logs',          '📋 Logs'],
];

export default function AdminPage({ user, profile }) {
  const [section, setSection]     = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg]             = useState('');
  const [msgType, setMsgType]     = useState('info');
  const [pending, setPending]     = useState([]);
  const [leagues, setLeagues]     = useState([]);
  const [teams, setTeams]         = useState([]);
  const [cups, setCups]           = useState([]);
  const [euroComps, setEuroComps] = useState([]);
  const [users, setUsers]         = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [logs, setLogs]           = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [genLeague, setGenLeague] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // League form
  const [nlName, setNlName]       = useState('');
  const [nlCountry, setNlCountry] = useState('');
  const [nlTier, setNlTier]       = useState(1);
  const [nlSlots, setNlSlots]     = useState(16);
  const [nlSeason, setNlSeason]   = useState('2024-25');
  // Cup form
  const [ncName, setNcName]       = useState('');
  const [ncLeague, setNcLeague]   = useState('');
  // European form
  const [neName, setNeName]       = useState('Champions League');
  const [neSeason, setNeSeason]   = useState('2024-25');
  // Team points form
  const [adjTeam, setAdjTeam]     = useState('');
  const [adjPts, setAdjPts]       = useState(0);
  const [adjReason, setAdjReason] = useState('');
  // Player points form
  const [ppPlayer, setPpPlayer]   = useState('');
  const [ppChange, setPpChange]   = useState(0);
  const [ppReason, setPpReason]   = useState('');
  const [ppSearch, setPpSearch]   = useState('');

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
      
      if (!r.ok) {
        console.error(`rFetch error ${r.status} on ${path}:`, d);
      }
      
      return { ok: r.ok, status: r.status, data: d };
    } catch (error) {
      console.error('rFetch exception:', error);
      return { ok: false, status: 500, data: null, error: error.message };
    }
  }

  async function logAction(action, details = {}) {
    await rFetch('POST', 'admin_logs',
      { admin_id: user.id, action, details },
      { Prefer: 'return=minimal' }
    ).catch(() => {});
  }

  function showMsg(text, type = 'success') {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }

  const loadAll = useCallback(async () => {
    try {
      const [l, t, c, e, u, lb, pf, pcf, pef, pfp] = await Promise.all([
        apiFetch('GET', 'leagues?select=*&order=country'),
        apiFetch('GET', 'teams?select=*&order=total_points.desc'),
        apiFetch('GET', 'cups?select=*'),
        apiFetch('GET', 'european_competitions?select=*'),
        apiFetch('GET', 'profiles?select=id,username,email,role,is_blocked,created_at,phone&order=created_at.desc'),
        apiFetch('GET', 'free_play_leaderboard?select=*&order=points.desc'),
        apiFetch('GET', 'fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),leagues(name)&order=created_at'),
        apiFetch('GET', 'cup_fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),cups(name)&order=created_at'),
        apiFetch('GET', 'european_fixtures?status=eq.pending_review&select=*,home:home_team_id(name),away:away_team_id(name),european_competitions(name)&order=created_at'),
        apiFetch('GET', 'free_play_matches?status=eq.pending_review&select=*,p1:player1_id(username),p2:player2_id(username)&order=created_at'),
      ]);

      setLeagues(Array.isArray(l.data) ? l.data : []);
      setTeams(Array.isArray(t.data) ? t.data : []);
      setCups(Array.isArray(c.data) ? c.data : []);
      setEuroComps(Array.isArray(e.data) ? e.data : []);
      setUsers(Array.isArray(u.data) ? u.data : []);
      
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
        ...(Array.isArray(pcf.data) ? pcf.data : []).map(f => ({
          ...f, _type: 'cup',
          _label: `${f.home?.name || '?'} vs ${f.away?.name || '?'} — ${f.cups?.name || ''}`,
          _score: `${f.home_score ?? '?'} – ${f.away_score ?? '?'}`,
        })),
        ...(Array.isArray(pef.data) ? pef.data : []).map(f => ({
          ...f, _type: 'european',
          _label: `${f.home?.name || '?'} vs ${f.away?.name || '?'} — ${f.european_competitions?.name || ''}`,
          _score: `${f.home_score ?? '?'} – ${f.away_score ?? '?'}`,
        })),
        ...(Array.isArray(pfp.data) ? pfp.data : []).map(f => ({
          ...f, _type: 'freeplay',
          _label: `${f.p1?.username || '?'} vs ${f.p2?.username || '?'} (Free Play)`,
          _score: `${f.player1_score ?? '?'} – ${f.player2_score ?? '?'}`,
        })),
      ];
      setPending(allPending);
    } catch (error) {
      console.error('loadAll error:', error);
      showMsg('Error loading admin data: ' + error.message, 'danger');
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAll();
    }
  }, [profile, loadAll]);

  async function loadPointsHistory() {
    const r = await apiFetch('GET',
      'player_points_history?select=*,admin:admin_id(username),player:player_id(username)&order=created_at.desc&limit=100'
    );
    setPointsHistory(Array.isArray(r.data) ? r.data : []);
  }

  async function approveResult(item, approve) {
    const table = {
      league:   'fixtures',
      cup:      'cup_fixtures',
      european: 'european_fixtures',
      freeplay: 'free_play_matches',
    }[item._type];

    await rFetch('PATCH', `${table}?id=eq.${item.id}`,
      { status: approve ? 'approved' : 'rejected', verified_by: user.id },
      { Prefer: 'return=minimal' }
    );

    if (approve && item._type === 'league') {
      const hw   = (item.home_score || 0) > (item.away_score || 0);
      const draw = (item.home_score || 0) === (item.away_score || 0);
      const [ht, at] = await Promise.all([
        apiFetch('GET', `teams?id=eq.${item.home_team_id}&select=*`),
        apiFetch('GET', `teams?id=eq.${item.away_team_id}&select=*`),
      ]);
      const h = Array.isArray(ht.data) && ht.data[0] ? ht.data[0] : null;
      const a = Array.isArray(at.data) && at.data[0] ? at.data[0] : null;
      const hs = item.home_score || 0, as_ = item.away_score || 0;
      if (h) await rFetch('PATCH', `teams?id=eq.${item.home_team_id}`, {
        wins:          (h.wins  || 0) + (hw ? 1 : 0),
        draws:         (h.draws || 0) + (draw ? 1 : 0),
        losses:        (h.losses|| 0) + (!hw && !draw ? 1 : 0),
        total_points:  (h.total_points || 0) + (hw ? 3 : draw ? 1 : 0),
        matches_played:(h.matches_played || 0) + 1,
        goals_for:     (h.goals_for || 0) + hs,
        goals_against: (h.goals_against || 0) + as_,
        goal_difference: ((h.goals_for || 0) + hs) - ((h.goals_against || 0) + as_),
      }, { Prefer: 'return=minimal' });
      if (a) await rFetch('PATCH', `teams?id=eq.${item.away_team_id}`, {
        wins:          (a.wins  || 0) + (!hw && !draw ? 1 : 0),
        draws:         (a.draws || 0) + (draw ? 1 : 0),
        losses:        (a.losses|| 0) + (hw ? 1 : 0),
        total_points:  (a.total_points || 0) + (!hw && !draw ? 3 : draw ? 1 : 0),
        matches_played:(a.matches_played || 0) + 1,
        goals_for:     (a.goals_for || 0) + as_,
        goals_against: (a.goals_against || 0) + hs,
        goal_difference: ((a.goals_for || 0) + as_) - ((a.goals_against || 0) + hs),
      }, { Prefer: 'return=minimal' });
    }

    if (approve && item._type === 'freeplay') {
      const p1s = item.player1_score || 0, p2s = item.player2_score || 0;
      const p1w = p1s > p2s, draw = p1s === p2s;
      const getLb = async (uid) => {
        const r = await apiFetch('GET', `free_play_leaderboard?user_id=eq.${uid}&select=*&limit=1`);
        return Array.isArray(r.data) && r.data[0] ? r.data[0] : { user_id: uid, wins:0, draws:0, losses:0, points:0, goals_for:0, goals_against:0, matches_played:0, goal_difference:0 };
      };
      const [lb1, lb2] = await Promise.all([getLb(item.player1_id), getLb(item.player2_id)]);
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${item.player1_id}`, {
        wins: (lb1.wins||0)+(p1w?1:0), draws:(lb1.draws||0)+(draw?1:0), losses:(lb1.losses||0)+(!p1w&&!draw?1:0),
        points:(lb1.points||0)+(p1w?3:draw?1:0), matches_played:(lb1.matches_played||0)+1,
        goals_for:(lb1.goals_for||0)+p1s, goals_against:(lb1.goals_against||0)+p2s,
        goal_difference:((lb1.goals_for||0)+p1s)-((lb1.goals_against||0)+p2s),
      }, { Prefer:'return=minimal' });
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${item.player2_id}`, {
        wins:(lb2.wins||0)+(!p1w&&!draw?1:0), draws:(lb2.draws||0)+(draw?1:0), losses:(lb2.losses||0)+(p1w?1:0),
        points:(lb2.points||0)+(!p1w&&!draw?3:draw?1:0), matches_played:(lb2.matches_played||0)+1,
        goals_for:(lb2.goals_for||0)+p2s, goals_against:(lb2.goals_against||0)+p1s,
        goal_difference:((lb2.goals_for||0)+p2s)-((lb2.goals_against||0)+p1s),
      }, { Prefer:'return=minimal' });
    }

    await logAction(approve ? `approve_${item._type}` : `reject_${item._type}`, { id: item.id });
    showMsg(approve ? '✅ Approved & stats updated' : '❌ Result rejected', approve ? 'success' : 'danger');
    loadAll();
  }

  async function adjustPlayerPoints() {
    if (!ppPlayer) { showMsg('Select a player', 'danger'); return; }
    const change = parseInt(ppChange || 0);
    if (change === 0) { showMsg('Enter a non-zero points change', 'danger'); return; }

    const lbR = await apiFetch('GET', `free_play_leaderboard?user_id=eq.${ppPlayer}&select=*&limit=1`);
    const lb = Array.isArray(lbR.data) && lbR.data[0]
      ? lbR.data[0]
      : { user_id: ppPlayer, points: 0, wins:0, draws:0, losses:0, matches_played:0 };
    const before = lb.points || 0;
    const after  = Math.max(0, before + change);

    if (Array.isArray(lbR.data) && lbR.data[0]) {
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${ppPlayer}`,
        { points: after }, { Prefer: 'return=minimal' });
    } else {
      await rFetch('POST', 'free_play_leaderboard',
        { user_id: ppPlayer, points: after },
        { Prefer: 'return=minimal' });
    }

    await rFetch('POST', 'player_points_history', {
      admin_id: user.id,
      player_id: ppPlayer,
      change,
      reason: ppReason || null,
      points_before: before,
      points_after: after,
    }, { Prefer: 'return=minimal' });

    await logAction('adjust_player_points', { player_id: ppPlayer, change, reason: ppReason });
    showMsg(`✅ Points ${change > 0 ? 'added' : 'deducted'}: ${before} → ${after}`, 'success');
    setPpChange(0); setPpReason('');
    loadAll(); loadPointsHistory();
  }

  async function generateFixtures() {
    if (!genLeague) { showMsg('Select a league', 'danger'); return; }
    const r = await apiFetch('GET', `teams?league_id=eq.${genLeague}&is_active=eq.true&select=id`);
    const ids = Array.isArray(r.data) ? r.data.map(t => t.id) : [];
    if (ids.length < 2) { showMsg('Need at least 2 teams', 'danger'); return; }
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
    const ret = fx.map(f => ({
      league_id: f.league_id, home_team_id: f.away_team_id,
      away_team_id: f.home_team_id, round: f.round + rounds, status: 'pending',
    }));
    await rFetch('POST', 'fixtures', [...fx, ...ret], { Prefer: 'return=minimal' });
    await logAction('generate_fixtures', { league_id: genLeague, count: fx.length * 2 });
    showMsg(`✅ Generated ${fx.length * 2} fixtures (${rounds} rounds × 2 legs)`);
    loadAll();
  }

  async function processRelegation() {
    if (!genLeague) { showMsg('Select a league', 'danger'); return; }
    if (!window.confirm('Process relegation/promotion? This cannot be undone.')) return;
    const lg = leagues.find(l => l.id === genLeague);
    if (!lg) return;
    const r = await apiFetch('GET', `teams?league_id=eq.${genLeague}&select=*&order=total_points.desc`);
    const lt = Array.isArray(r.data) ? r.data : [];
    const rel = lg.relegation_spots || 3, pro = lg.promotion_spots || 3;
    const relegated = lt.slice(lt.length - rel);
    const t2r = await apiFetch('GET', `leagues?country=eq.${encodeURIComponent(lg.country)}&tier=eq.2&select=id&limit=1`);
    const t2 = Array.isArray(t2r.data) && t2r.data[0] ? t2r.data[0] : null;
    const reset = { total_points:0, wins:0, draws:0, losses:0, goals_for:0, goals_against:0, goal_difference:0, matches_played:0 };
    if (t2 && relegated.length > 0) {
      for (const t of relegated)
        await rFetch('PATCH', `teams?id=eq.${t.id}`, { league_id: t2.id, ...reset }, { Prefer: 'return=minimal' });
    }
    if (t2) {
      const t2teams = await apiFetch('GET', `teams?league_id=eq.${t2.id}&select=*&order=total_points.desc&limit=${pro}`);
      for (const t of (Array.isArray(t2teams.data) ? t2teams.data : []))
        await rFetch('PATCH', `teams?id=eq.${t.id}`, { league_id: genLeague, ...reset }, { Prefer: 'return=minimal' });
    }
    await logAction('process_relegation', { league_id: genLeague, relegated: rel });
    showMsg(`✅ ${rel} relegated, ${pro} promoted from Div 2`);
    loadAll();
  }

  async function cupDraw(cupId) {
    const cup = cups.find(c => c.id === cupId);
    if (!cup) return;
    const r = await apiFetch('GET', `teams?league_id=eq.${cup.league_id}&is_active=eq.true&select=id`);
    const ids = Array.isArray(r.data) ? r.data.map(t => t.id) : [];
    if (ids.length < 2) { showMsg('Not enough teams for draw', 'danger'); return; }
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    const pairs = [];
    for (let i = 0; i < shuffled.length - 1; i += 2)
      pairs.push({ cup_id: cupId, home_team_id: shuffled[i], away_team_id: shuffled[i + 1], round: 1, status: 'pending' });
    await rFetch('POST', 'cup_fixtures', pairs, { Prefer: 'return=minimal' });
    await logAction('cup_draw', { cup_id: cupId, pairs: pairs.length });
    showMsg(`✅ Drew ${pairs.length} cup fixtures`);
    loadAll();
  }

  async function blockUser(uid, block) {
    await rFetch('PATCH', `profiles?id=eq.${uid}`, { is_blocked: block }, { Prefer: 'return=minimal' });
    await logAction(block ? 'block_user' : 'unblock_user', { uid });
    showMsg(block ? '🚫 User blocked' : '✅ User unblocked', block ? 'danger' : 'success');
    loadAll();
  }

  async function setRole(uid, role) {
    await rFetch('PATCH', `profiles?id=eq.${uid}`, { role }, { Prefer: 'return=minimal' });
    await logAction('set_role', { uid, role });
    showMsg(`✅ Role set to ${role}`);
    loadAll();
  }

  async function adjustTeamPoints() {
    if (!adjTeam) { showMsg('Select a team', 'danger'); return; }
    const r = await apiFetch('GET', `teams?id=eq.${adjTeam}&select=total_points`);
    const cur = Array.isArray(r.data) && r.data[0] ? r.data[0].total_points || 0 : 0;
    const np = Math.max(0, cur + parseInt(adjPts || 0));
    await rFetch('PATCH', `teams?id=eq.${adjTeam}`, { total_points: np }, { Prefer: 'return=minimal' });
    await logAction('adjust_team_points', { team_id: adjTeam, change: adjPts, reason: adjReason });
    showMsg(`✅ Team points: ${cur} → ${np}`);
    setAdjPts(0); setAdjReason('');
    loadAll();
  }

  if (profile?.role !== 'admin') return (
    <div className="card empty-state"><div className="empty-icon">🔒</div>Admin access required</div>
  );

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLb = leaderboard.filter(r =>
    !ppSearch ||
    (r.users?.username || '').toLowerCase().includes(ppSearch.toLowerCase())
  );
  const uniqueFilteredLb = filteredLb.filter((r, index, self) => 
    index === self.findIndex(t => t.user_id === r.user_id)
  );

  // The rest of your return with all sections...
  // (keep all your existing JSX sections)
