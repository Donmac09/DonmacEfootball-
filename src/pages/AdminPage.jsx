import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';

const SECTIONS = [
  ['dashboard', '📊 Dashboard'],
  ['results', '⚠️ Results'],
  ['playerpoints', '🎮 Player Points'],
  ['leagues', '🏟️ Leagues'],
  ['fixtures', '📅 Fixtures'],
  ['cups', '🏆 Cups'],
  ['european', '🇪🇺 European'],
  ['points', '✏️ Team Points'],
  ['relegation', '📊 Relegation'],
  ['users', '👥 Users'],
  ['logs', '📋 Logs'],
];

export default function AdminPage({ user, profile }) {
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [pending, setPending] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [cups, setCups] = useState([]);
  const [euroComps, setEuroComps] = useState([]);
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

  const [nlName, setNlName] = useState('');
  const [nlCountry, setNlCountry] = useState('');
  const [nlTier, setNlTier] = useState(1);
  const [nlSlots, setNlSlots] = useState(16);
  const [nlSeason, setNlSeason] = useState('2024-25');
  const [ncName, setNcName] = useState('');
  const [ncLeague, setNcLeague] = useState('');
  const [neName, setNeName] = useState('Champions League');
  const [neSeason, setNeSeason] = useState('2024-25');
  const [adjTeam, setAdjTeam] = useState('');
  const [adjPts, setAdjPts] = useState(0);
  const [adjReason, setAdjReason] = useState('');
  const [ppPlayer, setPpPlayer] = useState('');
  const [ppChange, setPpChange] = useState(0);
  const [ppReason, setPpReason] = useState('');
  const [ppSearch, setPpSearch] = useState('');

  // ========== FIXED: Better console logging with clear formatting ==========
  const logWithStyle = (message, data = null, type = 'info') => {
    const styles = {
      info: 'color: #3b82f6; font-weight: bold;',
      success: 'color: #22c55e; font-weight: bold;',
      warning: 'color: #eab308; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;'
    };
    
    const prefix = `[Admin]`;
    console.groupCollapsed(`${prefix} ${message}`);
    if (data) {
      console.log(`%c📊 Data:`, 'color: #6b7280;', data);
    }
    console.groupEnd();
  };

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
        // FIXED: Better error formatting
        logWithStyle(`❌ API Error ${r.status} on ${path}`, {
          status: r.status,
          path: path,
          method: method,
          body: body,
          response: d
        }, 'error');
      } else {
        // FIXED: Success logging with style
        logWithStyle(`✅ ${method} ${path} successful`, { status: r.status }, 'success');
      }
      return { ok: r.ok, status: r.status, data: d };
    } catch (error) {
      // FIXED: Exception logging with stack trace
      logWithStyle(`💥 Exception in rFetch`, {
        error: error.message,
        stack: error.stack,
        path: path,
        method: method
      }, 'error');
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
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 5000);
  }

  const loadAnnouncements = useCallback(async () => {
    try {
      const r = await apiFetch('GET', 'announcements?select=*&order=created_at.desc');
      setAnnouncements(Array.isArray(r.data) ? r.data : []);
      logWithStyle('📢 Announcements loaded', { count: r.data?.length || 0 }, 'info');
    } catch (err) {
      logWithStyle('Error loading announcements', err, 'error');
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      logWithStyle('🔄 Loading all admin data...', null, 'info');
      
      const [l, t, c, e, u, lb, pf, pcf, pef, pfp] = await Promise.all([
        apiFetch('GET', 'leagues?select=*&order=country'),
        apiFetch('GET', 'teams?select=*&order=total_points.desc'),
        apiFetch('GET', 'cups?select=*'),
        apiFetch('GET', 'european_competitions?select=*'),
        apiFetch('GET', 'users?select=id,username,email,role,is_blocked,created_at,phone,phone_number,league_id&order=created_at.desc'),
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
      
      logWithStyle('✅ All data loaded successfully', {
        leagues: l.data?.length || 0,
        teams: t.data?.length || 0,
        users: u.data?.length || 0,
        pending: allPending.length
      }, 'success');
      
    } catch (error) {
      logWithStyle('❌ loadAll error', error, 'error');
      showMsg('Error loading admin data: ' + error.message, 'danger');
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      loadAll();
      loadAnnouncements();
    }
  }, [profile, loadAll, loadAnnouncements]);

  async function loadPointsHistory() {
    const r = await apiFetch('GET',
      'player_points_history?select=*,admin:admin_id(username),player:player_id(username)&order=created_at.desc&limit=100'
    );
    setPointsHistory(Array.isArray(r.data) ? r.data : []);
  }

  // ========== FIXED: Announcement Functions with better error handling ==========
  async function saveAnnouncement() {
    if (!annMessage.trim()) { 
      showMsg('Announcement details cannot be empty', 'danger'); 
      return; 
    }
    
    if (editingAnnId) {
      const r = await rFetch('PATCH', `announcements?id=eq.${editingAnnId}`, { message: annMessage });
      if (r.ok) {
        showMsg('📢 Announcement updated successfully!');
        setEditingAnnId(null);
        setAnnMessage('');
        loadAnnouncements();
        logAction('edit_announcement', { id: editingAnnId });
        logWithStyle('📝 Announcement edited', { id: editingAnnId, message: annMessage }, 'info');
      } else {
        showMsg('Failed to update announcement', 'danger');
        logWithStyle('❌ Failed to update announcement', { error: r.data }, 'error');
      }
    } else {
      const r = await rFetch('POST', 'announcements', { message: annMessage, created_by: user.id });
      if (r.ok) {
        showMsg('📢 Announcement broadcasted successfully!');
        setAnnMessage('');
        loadAnnouncements();
        logAction('create_announcement');
        logWithStyle('📢 New announcement created', { message: annMessage }, 'success');
      } else {
        showMsg('Failed to post announcement', 'danger');
        logWithStyle('❌ Failed to create announcement', { error: r.data }, 'error');
      }
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    const r = await rFetch('DELETE', `announcements?id=eq.${id}`);
    if (r.ok) {
      showMsg('❌ Announcement deleted');
      loadAnnouncements();
      logAction('delete_announcement', { id });
      logWithStyle('🗑️ Announcement deleted', { id }, 'warning');
    } else {
      showMsg('Failed to delete announcement', 'danger');
      logWithStyle('❌ Failed to delete announcement', { error: r.data }, 'error');
    }
  }

  function handleEditAnnouncement(ann) {
    setEditingAnnId(ann.id);
    setAnnMessage(ann.message);
    logWithStyle('✏️ Editing announcement', { id: ann.id, message: ann.message }, 'info');
  }

  async function assignLeagueToUser(uid, leagueId) {
    const targetLeague = leagueId === '' ? null : leagueId;
    
    let r = await rFetch('PATCH', `profiles?id=eq.${uid}`, { league_id: targetLeague }, { Prefer: 'return=minimal' });
    
    if (!r.ok) {
      r = await rFetch('PATCH', `users?id=eq.${uid}`, { league_id: targetLeague }, { Prefer: 'return=minimal' });
    }

    if (r.ok) {
      showMsg('🏟️ User league mapping updated successfully!');
      loadAll();
      logAction('assign_user_league', { uid, leagueId: targetLeague });
      logWithStyle('🏟️ League assigned to user', { uid, leagueId: targetLeague }, 'success');
    } else {
      showMsg('Failed to assign league. Make sure league_id column exists on your profiles/users table.', 'danger');
      logWithStyle('❌ Failed to assign league', { uid, leagueId: targetLeague, error: r.data }, 'error');
    }
  }

  async function approveResult(item, approve) {
    const table = {
      league: 'fixtures',
      cup: 'cup_fixtures',
      european: 'european_fixtures',
      freeplay: 'free_play_matches',
    }[item._type];

    await rFetch('PATCH', `${table}?id=eq.${item.id}`,
      { status: approve ? 'approved' : 'rejected', verified_by: user.id },
      { Prefer: 'return=minimal' }
    );

    if (approve && item._type === 'league') {
      const hw = (item.home_score || 0) > (item.away_score || 0);
      const draw = (item.home_score || 0) === (item.away_score || 0);
      const [ht, at] = await Promise.all([
        apiFetch('GET', `teams?id=eq.${item.home_team_id}&select=*`),
        apiFetch('GET', `teams?id=eq.${item.away_team_id}&select=*`),
      ]);
      const h = Array.isArray(ht.data) && ht.data[0] ? ht.data[0] : null;
      const a = Array.isArray(at.data) && at.data[0] ? at.data[0] : null;
      const hs = item.home_score || 0, as_ = item.away_score || 0;
      if (h) await rFetch('PATCH', `teams?id=eq.${item.home_team_id}`, {
        wins: (h.wins || 0) + (hw ? 1 : 0),
        draws: (h.draws || 0) + (draw ? 1 : 0),
        losses: (h.losses || 0) + (!hw && !draw ? 1 : 0),
        total_points: (h.total_points || 0) + (hw ? 3 : draw ? 1 : 0),
        matches_played: (h.matches_played || 0) + 1,
        goals_for: (h.goals_for || 0) + hs,
        goals_against: (h.goals_against || 0) + as_,
        goal_difference: ((h.goals_for || 0) + hs) - ((h.goals_against || 0) + as_),
      }, { Prefer: 'return=minimal' });
      if (a) await rFetch('PATCH', `teams?id=eq.${item.away_team_id}`, {
        wins: (a.wins || 0) + (!hw && !draw ? 1 : 0),
        draws: (a.draws || 0) + (draw ? 1 : 0),
        losses: (a.losses || 0) + (hw ? 1 : 0),
        total_points: (a.total_points || 0) + (!hw && !draw ? 3 : draw ? 1 : 0),
        matches_played: (a.matches_played || 0) + 1,
        goals_for: (a.goals_for || 0) + as_,
        goals_against: (a.goals_against || 0) + hs,
        goal_difference: ((a.goals_for || 0) + as_) - ((a.goals_against || 0) + hs),
      }, { Prefer: 'return=minimal' });
    }

    if (approve && item._type === 'freeplay') {
      const p1s = item.player1_score || 0, p2s = item.player2_score || 0;
      const p1w = p1s > p2s, draw = p1s === p2s;
      const getLb = async (uid) => {
        const r = await apiFetch('GET', `free_play_leaderboard?user_id=eq.${uid}&select=*&limit=1`);
        return Array.isArray(r.data) && r.data[0] ? r.data[0] : { user_id: uid, wins: 0, draws: 0, losses: 0, points: 0, goals_for: 0, goals_against: 0, matches_played: 0, goal_difference: 0 };
      };
      const [lb1, lb2] = await Promise.all([getLb(item.player1_id), getLb(item.player2_id)]);
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${item.player1_id}`, {
        wins: (lb1.wins || 0) + (p1w ? 1 : 0),
        draws: (lb1.draws || 0) + (draw ? 1 : 0),
        losses: (lb1.losses || 0) + (!p1w && !draw ? 1 : 0),
        points: (lb1.points || 0) + (p1w ? 3 : draw ? 1 : 0),
        matches_played: (lb1.matches_played || 0) + 1,
        goals_for: (lb1.goals_for || 0) + p1s,
        goals_against: (lb1.goals_against || 0) + p2s,
        goal_difference: ((lb1.goals_for || 0) + p1s) - ((lb1.goals_against || 0) + p2s),
      }, { Prefer: 'return=minimal' });
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${item.player2_id}`, {
        wins: (lb2.wins || 0) + (!p1w && !draw ? 1 : 0),
        draws: (lb2.draws || 0) + (draw ? 1 : 0),
        losses: (lb2.losses || 0) + (p1w ? 1 : 0),
        points: (lb2.points || 0) + (!p1w && !draw ? 3 : draw ? 1 : 0),
        matches_played: (lb2.matches_played || 0) + 1,
        goals_for: (lb2.goals_for || 0) + p2s,
        goals_against: (lb2.goals_against || 0) + p1s,
        goal_difference: ((lb2.goals_for || 0) + p2s) - ((lb2.goals_against || 0) + p1s),
      }, { Prefer: 'return=minimal' });
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
    const lb = Array.isArray(lbR.data) && lbR.data[0] ? lbR.data[0] : { user_id: ppPlayer, points: 0, wins: 0, draws: 0, losses: 0, matches_played: 0 };
    const before = lb.points || 0;
    const after = Math.max(0, before + change);

    if (Array.isArray(lbR.data) && lbR.data[0]) {
      await rFetch('PATCH', `free_play_leaderboard?user_id=eq.${ppPlayer}`, { points: after }, { Prefer: 'return=minimal' });
    } else {
      await rFetch('POST', 'free_play_leaderboard', { user_id: ppPlayer, points: after }, { Prefer: 'return=minimal' });
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
    setPpChange(0);
    setPpReason('');
    loadAll();
    loadPointsHistory();
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
      league_id: f.league_id,
      home_team_id: f.away_team_id,
      away_team_id: f.home_team_id,
      round: f.round + rounds,
      status: 'pending',
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
    const reset = { total_points: 0, wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0, goal_difference: 0, matches_played: 0 };
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
    await rFetch('PATCH', `users?id=eq.${uid}`, { is_blocked: block }, { Prefer: 'return=minimal' });
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
    setAdjPts(0);
    setAdjReason('');
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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <h2 className="section-title gradient-text" style={{ margin: 0 }}>⚙️ Admin Panel</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-gold">👑 Admin</span>
          <button className="btn btn-secondary btn-sm admin-sidebar-toggle" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? '✕ Close' : '☰ Menu'}
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className={`alert alert-${msgType === 'success' ? 'success' : msgType === 'danger' ? 'danger' : 'info'}`} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      <div className="admin-layout">
        {/* Sidebar */}
        <div className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''}`}>
          {SECTIONS.map(([id, label]) => (
            <button key={id}
              className={`admin-nav-item ${section === id ? 'active' : ''}`}
              onClick={() => {
                setSection(id);
                setMsg('');
                setSidebarOpen(false);
                if (id === 'logs') apiFetch('GET', 'admin_logs?select=*,admin:admin_id(username)&order=created_at.desc&limit=50').then(r => setLogs(Array.isArray(r.data) ? r.data : []));
                if (id === 'playerpoints') loadPointsHistory();
              }}>
              {label}
              {id === 'results' && pending.length > 0 && (
                <span className="badge badge-red" style={{ marginLeft: 'auto', fontSize: '.7rem' }}>{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="admin-content">
          {/* DASHBOARD */}
          {section === 'dashboard' && (
            <div>
              <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                {[
                  ['Players', users.length, '👤'],
                  ['Leagues', leagues.length, '🏟️'],
                  ['Teams', teams.length, '👕'],
                  ['Pending', pending.length, '⚠️']
                ].map(([l, v, e]) => (
                  <div key={l} className="stat-card">
                    <div style={{ fontSize: '1.5rem' }}>{e}</div>
                    <div className="stat-val">{v}</div>
                    <div className="stat-label">{l}</div>
                  </div>
                ))}
              </div>

              {/* Announcement Dashboard Controls */}
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--blue)' }}>📢 System Announcements Board</div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">{editingAnnId ? '📝 Edit Announcement Message' : '➕ Create New Broadcast Message'}</label>
                  <textarea 
                    className="form-input" 
                    rows={3} 
                    value={annMessage} 
                    onChange={e => setAnnMessage(e.target.value)} 
                    placeholder="Type announcement details here..."
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
                  <button className="btn btn-primary" onClick={saveAnnouncement}>
                    {editingAnnId ? '💾 Update Announcement' : '🚀 Publish Announcement'}
                  </button>
                  {editingAnnId && (
                    <button className="btn btn-secondary" onClick={() => { setEditingAnnId(null); setAnnMessage(''); }}>
                      Cancel
                    </button>
                  )}
                </div>

                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Active Live Announcements ({announcements.length})</div>
                {announcements.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                    No announcements published yet.
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Message</th>
                          <th>Posted Date</th>
                          <th style={{ width: '120px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {announcements.map(ann => (
                          <tr key={ann.id}>
                            <td style={{ fontSize: '0.875rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>{ann.message}</td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(ann.created_at).toLocaleDateString()}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleEditAnnouncement(ann)}>✏️</button>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteAnnouncement(ann.id)}>🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🚀 Quick Actions</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    ['results', '⚠️ Review Results', 'btn-warn'],
                    ['playerpoints', '🎮 Player Points', 'btn-primary'],
                    ['fixtures', '📅 Fixtures', 'btn-cyan'],
                    ['relegation', '📊 Relegate', 'btn-danger'],
                    ['european', '🇪🇺 European', 'btn-purple']
                  ].map(([s, l, c]) => (
                    <button key={s} className={`btn ${c}`} onClick={() => setSection(s)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULTS */}
          {section === 'results' && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
                ⚠️ Pending Results ({pending.length})
              </div>
              {pending.length === 0 ?
                <div className="card empty-state"><div className="empty-icon">✅</div>All clear! No pending results.</div> :
                pending.map(item => (
                  <div key={`${item.id}-${item._type}`} className="card" style={{ marginBottom: '.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '.875rem' }}>{item._label}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 4 }}>
                          Score submitted: <strong style={{ color: 'var(--text)' }}>{item._score}</strong>
                        </div>
                        <span className="badge badge-gray" style={{ marginTop: 6 }}>{item._type}</span>
                      </div>
                      {item.screenshot_url && (
                        <button className="btn btn-secondary btn-sm" onClick={() => setScreenshot(item.screenshot_url)}>🖼 Screenshot</button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-success btn-sm" onClick={() => approveResult(item, true)}>✓ Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => approveResult(item, false)}>✗ Reject</button>
                    </div>
                  </div>
                ))}

              {screenshot && (
                <div className="modal-overlay" onClick={() => setScreenshot(null)}>
                  <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-title">🖼 Match Screenshot Evidence</div>
                    <img src={screenshot} alt="evidence" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setScreenshot(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PLAYER POINTS */}
          {section === 'playerpoints' && (
            <div>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--yellow)' }}>
                  🎮 Add / Deduct Player Points (Free Play / Matchmaking)
                </div>
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                  These points affect the <strong>Match Search leaderboard</strong> — separate from league team points.
                </div>

                <div className="grid-2">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Search & Select Player</label>
                    <input className="form-input" placeholder="Type to search player..." value={ppSearch} onChange={e => setPpSearch(e.target.value)} style={{ marginBottom: 8 }} />
                    <select className="form-select" value={ppPlayer} onChange={e => setPpPlayer(e.target.value)} size={Math.min(6, uniqueFilteredLb.length + 1)} style={{ height: 'auto', minHeight: 44 }}>
                      <option value="">-- Select a player --</option>
                      {uniqueFilteredLb.map(r => (
                        <option key={r.user_id} value={r.user_id}>
                          {r.users?.username || r.users?.email || r.user_id} — {r.points || 0} pts ({r.wins || 0}W {r.draws || 0}D {r.losses || 0}L)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Points Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[-10, -5, -3, -1].map(v => (
                        <button key={v} className="btn btn-danger btn-sm" onClick={() => setPpChange(v)} style={{ flex: 1 }}>{v}</button>
                      ))}
                    </div>
                    <input className="form-input" type="number" value={ppChange} onChange={e => setPpChange(e.target.value)} placeholder="+5 or -3" style={{ marginTop: 6 }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      {[1, 3, 5, 10].map(v => (
                        <button key={v} className="btn btn-success btn-sm" onClick={() => setPpChange(v)} style={{ flex: 1 }}>+{v}</button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reason (Required)</label>
                    <textarea className="form-input" value={ppReason} onChange={e => setPpReason(e.target.value)} placeholder="e.g. Disconnected, rule violation..." rows={4} />
                  </div>
                </div>

                {ppPlayer && ppChange !== 0 && (() => {
                  const row = leaderboard.find(r => r.user_id === ppPlayer);
                  const before = row?.points || 0;
                  const after = Math.max(0, before + parseInt(ppChange || 0));
                  const isAdd = parseInt(ppChange) > 0;
                  return (
                    <div className={`alert ${isAdd ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: '1rem' }}>
                      <strong>{row?.users?.username || 'Player'}</strong>: {before} pts → <strong>{after} pts</strong>
                      {' '}({isAdd ? '+' : ''}{ppChange}) {ppReason && `— "${ppReason}"`}
                    </div>
                  );
                })()}

                <button className="btn btn-primary" onClick={adjustPlayerPoints} style={{ minWidth: 200 }}>
                  ⚡ Apply Points Change
                </button>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, marginBottom: '1rem' }}>🏆 Current Leaderboard</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {['#', 'Player', 'MP', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts', 'Actions'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.length === 0 ?
                        <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No players yet</td></tr> :
                        leaderboard.map((r, i) => (
                          <tr key={r.user_id} style={{ background: ppPlayer === r.user_id ? 'rgba(255,210,0,0.06)' : 'transparent' }}>
                            <td className={`pos ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : ''}`}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{r.users?.username || '—'}</td>
                            <td>{r.matches_played || 0}</td>
                            <td style={{ color: 'var(--green)' }}>{r.wins || 0}</td>
                            <td style={{ color: 'var(--muted)' }}>{r.draws || 0}</td>
                            <td style={{ color: 'var(--red)' }}>{r.losses || 0}</td>
                            <td>{r.goals_for || 0}</td>
                            <td>{r.goals_against || 0}</td>
                            <td>{r.goal_difference || 0}</td>
                            <td className="pts">{r.points || 0}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-success btn-sm" onClick={() => { setPpPlayer(r.user_id); setPpChange(3); }}>+3</button>
                                <button className="btn btn-danger btn-sm" onClick={() => { setPpPlayer(r.user_id); setPpChange(-3); }}>-3</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>📋 Points Adjustment History</div>
                  <button className="btn btn-secondary btn-sm" onClick={loadPointsHistory}>↻ Refresh</button>
                </div>
                {pointsHistory.length === 0 ?
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem', fontSize: '.875rem' }}>No adjustments yet</div> :
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {['Player', 'Change', 'Before', 'After', 'Reason', 'Admin', 'Date'].map(h => <th key={h}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {pointsHistory.map(h => (
                          <tr key={h.id}>
                            <td style={{ fontWeight: 600 }}>{h.player?.username || '—'}</td>
                            <td style={{ fontWeight: 700, color: h.change > 0 ? 'var(--green)' : 'var(--red)' }}>
                              {h.change > 0 ? '+' : ''}{h.change}
                            </td>
                            <td>{h.points_before}</td>
                            <td>{h.points_after}</td>
                            <td>{h.reason || '—'}</td>
                            <td>{h.admin?.username || '—'}</td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {new Date(h.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>}
              </div>
            </div>
          )}

          {/* USERS MANAGEMENT SECTION */}
          {section === 'users' && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1.1rem' }}>👥 System Users Management</div>
              <input 
                className="form-input" 
                placeholder="Search users by name or email..." 
                value={userSearch} 
                onChange={e => setUserSearch(e.target.value)} 
                style={{ marginBottom: '1rem' }}
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Phone Number</th>
                      <th>Role Management</th>
                      <th>Assigned League</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No users matched parameters</td></tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600 }}>{u.username || '—'}</td>
                          <td>{u.email || '—'}</td>
                          <td>{u.phone || u.phone_number || '—'}</td>
                          <td>
                            <select 
                              className="form-select" 
                              value={u.role || 'user'} 
                              onChange={e => setRole(u.id, e.target.value)}
                              style={{ padding: '4px', minHeight: 'auto', fontSize: '0.85rem' }}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>
                            <select 
                              className="form-select" 
                              value={u.league_id || ''} 
                              onChange={e => assignLeagueToUser(u.id, e.target.value)}
                              style={{ padding: '4px', minHeight: 'auto', fontSize: '0.85rem' }}
                            >
                              <option value="">-- No League --</option>
                              {leagues.map(lg => (
                                <option key={lg.id} value={lg.id}>{lg.name} ({lg.country})</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`badge ${u.is_blocked ? 'badge-red' : 'badge-green'}`}>
                              {u.is_blocked ? 'Blocked' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <button 
                              className={`btn btn-sm ${u.is_blocked ? 'btn-success' : 'btn-danger'}`}
                              onClick={() => blockUser(u.id, !u.is_blocked)}
                            >
                              {u.is_blocked ? '🔓 Unblock' : '🚫 Block'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* FALLBACK PLACEHOLDERS FOR REMAINING SECTIONS */}
          {['leagues', 'fixtures', 'cups', 'european', 'points', 'relegation', 'logs'].includes(section) && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '1rem', textTransform: 'uppercase' }}>🏟️ {section} Console</div>
              <div className="alert alert-info">Manage dataset configurations via action menus.</div>
              {section === 'relegation' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="form-select" value={genLeague} onChange={e => setGenLeague(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">-- Select Target League --</option>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
                  </select>
                  <button className="btn btn-danger" onClick={processRelegation}>Execute Season Relegation Engine</button>
                </div>
              )}
              {section === 'fixtures' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select className="form-select" value={genLeague} onChange={e => setGenLeague(e.target.value)} style={{ maxWidth: 300 }}>
                    <option value="">-- Select Target League --</option>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name} ({l.country})</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={generateFixtures}>⚡ Auto-Generate League Round Robin</button>
                </div>
              )}
              {section === 'logs' && (
                <div className="table-wrap" style={{ marginTop: '1rem' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? 
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)' }}>No audit trails fetched</td></tr> :
                        logs.map(log => (
                          <tr key={log.id}>
                            <td>{log.admin?.username || log.admin_id || '—'}</td>
                            <td><code style={{ fontSize: '0.8rem' }}>{log.action}</code></td>
                            <td>
                              <pre style={{ fontSize: '0.75rem', margin: 0, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || '—'}
                              </pre>
                            </td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
