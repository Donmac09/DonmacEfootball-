/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY, sessionStore } from '../services/supabase';

function Leaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    apiFetch('GET','free_play_leaderboard?select=*,users(username)&order=points.desc&limit=20').then(r => setRows(Array.isArray(r.data)?r.data:[]));
  }, []);
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{['#','Player','W','D','L','Pts'].map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length===0
            ? <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--muted)', padding:'2rem' }}>No data yet</td></tr>
            : rows.map((r,i)=>(
              <tr key={r.id}>
                <td className={`pos ${i===0?'pos-1':i===1?'pos-2':i===2?'pos-3':''}`}>{i+1}</td>
                <td style={{ fontWeight:600 }}>{r.users?.username||'Unknown'}</td>
                <td>{r.wins||0}</td><td>{r.draws||0}</td><td>{r.losses||0}</td>
                <td className="pts">{r.points||0}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchSearchPage({ user, profile }) {
  const [inQueue, setInQueue]       = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [matches, setMatches]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [searching, setSearching]   = useState(false);
  const [msg, setMsg]               = useState('');
  const [submitModal, setSubmitModal] = useState(null);
  const [scoreHome, setScoreHome]   = useState(0);
  const [scoreAway, setScoreAway]   = useState(0);
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const inQueueRef  = useRef(false);
  const matchingRef = useRef(false);
  const pollRef     = useRef(null);

  const tok = () => sessionStore.session?.access_token ?? SUPABASE_KEY;
  const hdr = (extra={}) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json', ...extra });

  async function qGet(path) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: hdr() });
    return r.json().catch(()=>[]);
  }
  async function qPost(path, body) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method:'POST', headers: hdr({ Prefer:'return=minimal' }), body: JSON.stringify(body) });
  }
  async function qPatch(path, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method:'PATCH', headers: hdr({ Prefer:'return=representation', Accept:'application/json' }), body: JSON.stringify(body) });
    return r.json().catch(()=>[]);
  }
  async function qDel(path) {
    return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method:'DELETE', headers: hdr() });
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return;
    loadMatches();
    checkQueue();
    pollRef.current = setInterval(() => { checkQueue(); if (inQueueRef.current) tryMatch(); }, 4000);
    return () => clearInterval(pollRef.current);
  }, [user]);

  useEffect(() => { inQueueRef.current = inQueue; }, [inQueue]);

  async function checkQueue() {
    const data = await qGet('matchmaking_queue?status=eq.waiting&select=id');
    setQueueCount(Array.isArray(data) ? data.length : 0);
    if (user) {
      const mine = await qGet(`matchmaking_queue?user_id=eq.${user.id}&status=eq.waiting&select=id&limit=1`);
      const amIn = Array.isArray(mine) && mine.length > 0;
      setInQueue(amIn); inQueueRef.current = amIn;
      if (amIn) setSearching(true);
    }
  }

  async function loadMatches() {
    const data = await qGet(`free_play_matches?or=(player1_id.eq.${user.id},player2_id.eq.${user.id})&select=*,p1:player1_id(username),p2:player2_id(username)&order=created_at.desc&limit=15`);
    setMatches(Array.isArray(data) ? data : []);
  }

  async function joinQueue() {
    setLoading(true);
    try {
      await qDel(`matchmaking_queue?user_id=eq.${user.id}`);
      const r = await fetch(`${SUPABASE_URL}/rest/v1/matchmaking_queue`, { method:'POST', headers: hdr({ Prefer:'return=minimal' }), body: JSON.stringify({ user_id: user.id, status:'waiting' }) });
      if (!r.ok) { const t = await r.json().catch(()=>{}); throw new Error(t?.message||'Failed to join'); }
      setInQueue(true); inQueueRef.current = true; setSearching(true);
      setMsg('🔍 Searching for an opponent...');
      checkQueue(); setTimeout(tryMatch, 800);
    } catch(e) { setMsg('❌ ' + e.message); }
    setLoading(false);
  }

  async function leaveQueue() {
    await qDel(`matchmaking_queue?user_id=eq.${user.id}`);
    setInQueue(false); inQueueRef.current = false; setSearching(false);
    setMsg('Left the queue.'); checkQueue();
  }

  async function tryMatch() {
    if (matchingRef.current) return;
    matchingRef.current = true;
    try {
      const mine = await qGet(`matchmaking_queue?user_id=eq.${user.id}&status=eq.waiting&select=id&limit=1`);
      if (!Array.isArray(mine)||mine.length===0) { setInQueue(false); inQueueRef.current=false; setSearching(false); return; }
      const others = await qGet(`matchmaking_queue?status=eq.waiting&user_id=neq.${user.id}&select=id,user_id,users(username)&order=created_at.asc&limit=1`);
      if (!Array.isArray(others)||others.length===0) return;
      const opp = others[0];
      const cl1 = await qPatch(`matchmaking_queue?id=eq.${opp.id}&status=eq.waiting`, { status:'matched' });
      if (!Array.isArray(cl1)||cl1.length===0) return;
      const cl2 = await qPatch(`matchmaking_queue?user_id=eq.${user.id}&status=eq.waiting`, { status:'matched' });
      if (!Array.isArray(cl2)||cl2.length===0) { await qPatch(`matchmaking_queue?id=eq.${opp.id}`, { status:'waiting' }); return; }
      await qPost('free_play_matches', { player1_id: user.id, player2_id: opp.user_id, status:'accepted' });
      const oppName = opp.users?.username || 'a player';
      await qPost('notifications', [
        { user_id: user.id,    type:'challenge', read:false, message:`✅ Matched with ${oppName}! Play then submit result.` },
        { user_id: opp.user_id, type:'challenge', read:false, message:`✅ Matched with ${profile?.username||'a player'}! Play then submit result.` },
      ]).catch(()=>{});
      setSearching(false); setInQueue(false); inQueueRef.current=false;
      setMsg(`✅ Matched with ${oppName}! Play, then submit your result below.`);
      loadMatches(); checkQueue();
    } catch(e) { console.error('tryMatch error', e); }
    finally { matchingRef.current = false; }
  }

  async function submitResult() {
    if (!screenshot) { setMsg('Screenshot is required'); return; }
    setSubmitting(true);
    const ext = screenshot.name.split('.').pop();
    const fname = `match_${submitModal.id}_${Date.now()}.${ext}`;
    let screenshotUrl = null;
    try {
      const up = await fetch(`${SUPABASE_URL}/storage/v1/object/screenshots/${fname}`, { method:'POST', headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${tok()}`, 'Content-Type': screenshot.type }, body: screenshot });
      if (up.ok) screenshotUrl = `${SUPABASE_URL}/storage/v1/object/public/screenshots/${fname}`;
    } catch(e) {}
    const r = await qPatch(`free_play_matches?id=eq.${submitModal.id}`, { player1_score: scoreHome, player2_score: scoreAway, status:'pending_review', submitted_by: user.id, screenshot_url: screenshotUrl });
    setMsg(Array.isArray(r)&&r.length>0?'✅ Result submitted! Awaiting admin review.':'Error submitting');
    setSubmitModal(null); loadMatches(); setSubmitting(false);
  }

  const statusBadge = s => ({ pending:['Pending','badge-gray'], accepted:['🎮 Play Now!','badge-warn'], pending_review:['Under Review','badge-blue'], approved:['✓ Approved','badge-green'], rejected:['✗ Rejected','badge-red'] }[s]||[s,'badge-gray']);

  return (
    <div>
      <h2 className="section-title gradient-text">⚽ Match Search</h2>
      {msg && <div className={`alert ${msg.startsWith('✅')?'alert-success':msg.startsWith('❌')?'alert-danger':'alert-info'}`} style={{ marginBottom:'1rem' }}>{msg} <button onClick={()=>setMsg('')} style={{ float:'right', background:'none', border:'none', cursor:'pointer', color:'inherit' }}>✕</button></div>}

      {/* Queue Card */}
      <div className={`queue-card ${searching?'searching':''}`} style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontSize:'3rem', marginBottom:'.75rem' }}>{searching?'🔍':'⚽'}</div>
        <h3 style={{ fontWeight:800, fontSize:'1.3rem', marginBottom:'.5rem', color:searching?'var(--yellow)':'var(--text)' }}>{searching?'Searching for opponent...':'Find a Random Opponent'}</h3>
        <p className="text-muted text-sm" style={{ marginBottom:'1.5rem', maxWidth:360, margin:'0 auto 1.5rem' }}>{searching?"You're in the queue. You'll be matched automatically.":'Join the queue and get paired with another player instantly.'}</p>

        <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,210,0,0.08)', border:'1px solid rgba(255,210,0,0.2)', borderRadius:30, padding:'6px 16px', marginBottom:'1.5rem' }}>
          <div className={`pulse-dot ${queueCount>0?'yellow':'gray'}`} />
          <span style={{ fontSize:'.9rem', fontWeight:600, color:queueCount>1?'var(--yellow)':'var(--muted)' }}>
            {queueCount===0?'No players in queue':queueCount===1&&searching?'You are the only one — waiting...':queueCount===1?'1 player in queue':`${queueCount} players in queue 🔥`}
          </span>
          <button onClick={checkQueue} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', paddingLeft:4 }} title="Refresh">↻</button>
        </div>

        {searching && <div style={{ display:'flex', justifyContent:'center', gap:6, marginBottom:'1.5rem' }}>{[0,1,2].map(i=><div key={i} className="bounce-dot" />)}</div>}

        {!searching
          ? <button className="btn btn-primary btn-lg" onClick={joinQueue} disabled={loading}>{loading?'⏳ Joining...':'🔍 Find Match'}</button>
          : <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-danger" onClick={leaveQueue}>✕ Leave Queue</button>
              <button className="btn btn-secondary" onClick={tryMatch}>⚡ Try Now</button>
            </div>}
      </div>

      {/* My Matches */}
      <div className="card" style={{ marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <span style={{ fontWeight:700 }}>📋 My Matches</span>
          <button className="btn btn-secondary btn-sm" onClick={loadMatches}>↻ Refresh</button>
        </div>
        {matches.length===0
          ? <div className="empty-state"><div className="empty-icon" style={{ fontSize:'2rem' }}>🎮</div>No matches yet. Join the queue!</div>
          : matches.map(m => {
              const isP1 = m.player1_id===user.id;
              const [label, cls] = statusBadge(m.status);
              return (
                <div key={m.id} style={{ padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:'.875rem' }}><strong>{isP1?m.p1?.username:m.p2?.username}</strong> <span className="text-muted">vs</span> <strong>{isP1?m.p2?.username:m.p1?.username}</strong></div>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  {m.status==='approved' && <div style={{ fontSize:'.875rem', color:'var(--yellow)', fontWeight:700 }}>Score: {isP1?m.player1_score:m.player2_score} – {isP1?m.player2_score:m.player1_score} {isP1?(m.player1_score>m.player2_score?'🏆 Won':m.player1_score<m.player2_score?'😔 Lost':'🤝 Draw'):(m.player2_score>m.player1_score?'🏆 Won':m.player2_score<m.player1_score?'😔 Lost':'🤝 Draw')}</div>}
                  {m.status==='accepted' && <button className="btn btn-primary btn-sm" style={{ marginTop:6 }} onClick={()=>{ setSubmitModal(m); setScoreHome(0); setScoreAway(0); setScreenshot(null); }}>📤 Submit Result</button>}
                </div>
              );
            })}
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div style={{ fontWeight:700, marginBottom:'1rem' }}>🏆 Free Play Leaderboard</div>
        <Leaderboard />
      </div>

      {/* Submit Modal */}
      {submitModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">📤 Submit Match Result</div>
            <div className="alert alert-info">{submitModal.p1?.username} vs {submitModal.p2?.username}</div>
            <div className="grid-2">
              <div className="form-group"><label className="form-label">{submitModal.p1?.username} Score</label><input className="form-input" type="number" min={0} max={20} value={scoreHome} onChange={e=>setScoreHome(+e.target.value)} /></div>
              <div className="form-group"><label className="form-label">{submitModal.p2?.username} Score</label><input className="form-input" type="number" min={0} max={20} value={scoreAway} onChange={e=>setScoreAway(+e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">📸 Screenshot Evidence (Required)</label><input type="file" accept="image/*" onChange={e=>setScreenshot(e.target.files[0])} /></div>
            <div style={{ display:'flex', gap:8, marginTop:'1rem' }}>
              <button className="btn btn-primary" onClick={submitResult} disabled={submitting}>{submitting?'Submitting...':'📤 Submit'}</button>
              <button className="btn btn-secondary" onClick={()=>setSubmitModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
