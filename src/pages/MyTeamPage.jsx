import React, { useState, useEffect } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY, sessionStore } from '../services/supabase';

function SubmitResultModal({ fixture, user, onClose, onDone }) {
  const [hs, setHs] = useState(0);
  const [as_, setAs] = useState(0);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const tok = () => sessionStore.session?.access_token ?? SUPABASE_KEY;

  async function submit() {
    if (!file) { setErr('Screenshot is required'); return; }
    setSubmitting(true);
    let screenshotUrl = null;
    try {
      const fname = `league_${fixture.id}_${Date.now()}.${file.name.split('.').pop()}`;
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/screenshots/${fname}`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok()}`, 'Content-Type': file.type },
        body: file,
      });
      if (up.ok) screenshotUrl = `${SUPABASE_URL}/storage/v1/object/public/screenshots/${fname}`;
    } catch (e) {}

    const r = await fetch(`${SUPABASE_URL}/rest/v1/fixtures?id=eq.${fixture.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ home_score: hs, away_score: as_, status: 'pending_review', submitted_by: user.id, screenshot_url: screenshotUrl }),
    });
    if (r.ok) { onDone('✅ Result submitted for admin review!'); onClose(); }
    else setErr('Failed to submit. Try again.');
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-title">📤 Submit League Result</div>
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <strong>{fixture.home?.name}</strong> vs <strong>{fixture.away?.name}</strong>
        </div>
        {err && <div className="alert alert-danger">{err}</div>}
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">{fixture.home?.name} Score</label>
            <input className="form-input" type="number" min={0} max={20} value={hs} onChange={e => setHs(+e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{fixture.away?.name} Score</label>
            <input className="form-input" type="number" min={0} max={20} value={as_} onChange={e => setAs(+e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">📸 Screenshot Evidence (Required)</label>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : '📤 Submit'}</button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function MyTeamPage({ user, profile }) {
  const [team, setTeam]         = useState(null);
  const [leagues, setLeagues]   = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [creating, setCreating] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [msg, setMsg]           = useState('');
  const [tab, setTab]           = useState('upcoming');
  const [submitTarget, setSubmitTarget] = useState(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('GET', `teams?user_id=eq.${user.id}&select=*,leagues(name,country,tier,current_season)&limit=1`)
      .then(r => {
        const data = Array.isArray(r.data) && r.data.length > 0 ? r.data[0] : null;
        setTeam(data);
        if (data) loadFixtures(data.id);
      });
    apiFetch('GET', 'leagues?select=id,name,country,tier,current_season,max_slots&order=country')
      .then(r => setLeagues(Array.isArray(r.data) ? r.data : []));
  }, [user]);

  async function loadFixtures(teamId) {
    const r = await apiFetch('GET', `fixtures?or=(home_team_id.eq.${teamId},away_team_id.eq.${teamId})&select=*,home:home_team_id(name,user_id),away:away_team_id(name,user_id)&order=scheduled_date`);
    const data = Array.isArray(r.data) ? r.data : [];
    setFixtures(data.map(f => ({
      ...f,
      _isHome: f.home_team_id === teamId,
      _homeUserId: f.home?.user_id,
      _awayUserId: f.away?.user_id,
    })));
  }

  async function createTeam() {
    if (!teamName.trim() || !leagueId) { setMsg('Fill all fields'); return; }
    const r = await apiFetch('POST', 'teams', { user_id: user.id, name: teamName, league_id: leagueId }, { Prefer: 'return=representation' });
    if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
      setTeam(r.data[0]); setCreating(false); setMsg('✅ Team registered!');
    } else setMsg('Error: ' + (r.data?.message || 'Could not create team'));
  }

  function formatDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }

  const canSubmit = f => f.status === 'pending' && (f._homeUserId === user.id || f._awayUserId === user.id);
  const upcoming    = fixtures.filter(f => f.status === 'pending');
  const underReview = fixtures.filter(f => f.status === 'pending_review');
  const results     = fixtures.filter(f => f.status === 'approved');

  function FixtureRow({ f }) {
    return (
      <div className="card" style={{ marginBottom: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: '200px' }}>
          <div style={{ textAlign: 'right', flex: 1, fontWeight: f._isHome ? 700 : 400, fontSize: '.875rem' }}>{f.home?.name || 'TBD'}</div>
          <div style={{ padding: '0 12px', fontWeight: 700, color: f.status === 'approved' ? 'var(--yellow)' : 'var(--muted)', whiteSpace: 'nowrap' }}>
            {f.status === 'approved' ? `${f.home_score} – ${f.away_score}` : f.status === 'pending_review' ? '? – ?' : 'vs'}
          </div>
          <div style={{ flex: 1, fontWeight: !f._isHome ? 700 : 400, fontSize: '.875rem' }}>{f.away?.name || 'TBD'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {f.scheduled_date && (
            <div style={{ fontSize: '0.7rem', color: 'var(--blue)' }}>
              📅 {formatDate(f.scheduled_date)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={`badge ${f.status === 'approved' ? 'badge-green' : f.status === 'pending_review' ? 'badge-warn' : 'badge-gray'}`}>
              {f.status === 'approved' ? '✓' : f.status === 'pending_review' ? '⏳' : `R${f.round}`}
            </span>
            {canSubmit(f) && <button className="btn btn-primary btn-sm" onClick={() => setSubmitTarget(f)}>📤 Submit</button>}
          </div>
        </div>
      </div>
    );
  }

  if (!team && !creating) return (
    <div>
      <h2 className="section-title gradient-text">👕 My Team</h2>
      {msg && <div className="alert alert-info">{msg}</div>}
      <div className="card empty-state">
        <div className="empty-icon">⚽</div>
        <p style={{ marginBottom: '1.5rem' }}>You haven't registered a team yet.</p>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Register Team</button>
      </div>
    </div>
  );

  if (creating) return (
    <div>
      <h2 className="section-title gradient-text">👕 Register Team</h2>
      <div className="card" style={{ maxWidth: 480 }}>
        {msg && <div className="alert alert-danger">{msg}</div>}
        <div className="form-group">
          <label className="form-label">Team Name</label>
          <input className="form-input" value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. FC Barcelona" />
        </div>
        <div className="form-group">
          <label className="form-label">Select League</label>
          <select className="form-select" value={leagueId} onChange={e => setLeagueId(e.target.value)}>
            <option value="">-- Choose a league --</option>
            {leagues.map(l => <option key={l.id} value={l.id}>{l.country} – {l.name} (Tier {l.tier})</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={createTeam}>Register</button>
          <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="section-title gradient-text">👕 My Team</h2>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-info'}`}>{msg}</div>}

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="text-xs text-muted" style={{ marginBottom: 4 }}>TEAM</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--yellow)' }}>{team?.name}</div>
          <div className="text-sm text-muted mt-2">{team?.leagues?.country} – {team?.leagues?.name} (Tier {team?.leagues?.tier})</div>
          <div className="text-xs text-muted mt-2">Season {team?.leagues?.current_season || '–'}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {underReview.length > 0 && <span className="badge badge-warn">{underReview.length} under review</span>}
            {upcoming.length > 0 && <span className="badge badge-blue">{upcoming.length} upcoming</span>}
          </div>
        </div>
        <div className="card">
          <div className="grid-3" style={{ gap: 8 }}>
            {[['Pts', team?.total_points, 'var(--yellow)'], ['W', team?.wins, 'var(--green)'], ['D', team?.draws, 'var(--muted)'], ['L', team?.losses, 'var(--red)'], ['GF', team?.goals_for, 'var(--muted)'], ['GA', team?.goals_against, 'var(--muted)']].map(([l, v, c]) => (
              <div key={l} className="stat-card">
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: c }}>{v || 0}</div>
                <div className="stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        {[['upcoming', `📅 Upcoming (${upcoming.length})`], ['review', `⏳ Review (${underReview.length})`], ['results', `✓ Results (${results.length})`]].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'upcoming' && (upcoming.length === 0 ? <div className="card empty-state"><div className="empty-icon">📅</div>No upcoming fixtures. Admin will generate the schedule.</div> : upcoming.map(f => <FixtureRow key={f.id} f={f} />))}
      {tab === 'review'   && (underReview.length === 0 ? <div className="card empty-state"><div className="empty-icon">⏳</div>No results under review.</div> : underReview.map(f => <FixtureRow key={f.id} f={f} />))}
      {tab === 'results'  && (results.length === 0 ? <div className="card empty-state"><div className="empty-icon">✓</div>No confirmed results yet.</div> : results.map(f => <FixtureRow key={f.id} f={f} />))}

      {submitTarget && <SubmitResultModal fixture={submitTarget} user={user} onClose={() => setSubmitTarget(null)} onDone={m => { setMsg(m); loadFixtures(team.id); }} />}
    </div>
  );
}
