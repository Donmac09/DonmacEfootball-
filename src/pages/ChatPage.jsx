/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, SUPABASE_URL, SUPABASE_KEY, sessionStore } from '../services/supabase';

export default function ChatPage({ user }) {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch]     = useState('');
  const [text, setText]         = useState('');
  const endRef = useRef(null);
  const tok = () => sessionStore.session?.access_token ?? SUPABASE_KEY;

  useEffect(() => {
    if (!user) return;
    loadContacts(); // eslint-disable-line react-hooks/exhaustive-deps
    apiFetch('GET',`users?id=neq.${user.id}&select=id,username&is_blocked=eq.false`).then(r => setAllUsers(Array.isArray(r.data)?r.data:[]));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  async function loadContacts() {
    const r = await apiFetch('GET',`chat_messages?or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})&select=*,sender:sender_id(id,username),receiver:receiver_id(id,username)&order=created_at.desc&limit=200`);
    const data = Array.isArray(r.data) ? r.data : [];
    const seen = new Set(), contacts = [];
    data.forEach(m => {
      const other = m.sender_id===user.id ? m.receiver : m.sender;
      if (other && !seen.has(other.id)) { seen.add(other.id); contacts.push({ ...other, lastMsg: m.message }); }
    });
    setContacts(contacts);
  }

  async function selectContact(c) {
    setSelected(c);
    const r = await apiFetch('GET',`chat_messages?or=(and(sender_id.eq.${user.id},receiver_id.eq.${c.id}),and(sender_id.eq.${c.id},receiver_id.eq.${user.id}))&select=*&order=created_at`);
    setMessages(Array.isArray(r.data)?r.data:[]);
    // Mark as read
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?receiver_id=eq.${user.id}&sender_id=eq.${c.id}`, { method:'PATCH', headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${tok()}`, 'Content-Type':'application/json', Prefer:'return=minimal' }, body: JSON.stringify({ read: true }) });
  }

  async function send() {
    if (!text.trim() || !selected) return;
    await apiFetch('POST','chat_messages', { sender_id: user.id, receiver_id: selected.id, message: text });
    setText('');
    selectContact(selected);
    loadContacts();
  }

  async function startChat(u) {
    setSearch('');
    if (!contacts.find(c=>c.id===u.id)) setContacts(prev=>[{ ...u, lastMsg:'' }, ...prev]);
    await selectContact(u);
  }

  const filtered = allUsers.filter(u => u.username?.toLowerCase().includes(search.toLowerCase()) && !contacts.find(c=>c.id===u.id));

  return (
    <div>
      <h2 className="section-title gradient-text">💬 Messages</h2>
      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div style={{ padding:'.75rem' }}>
            <input className="form-input" placeholder="Start new chat..." value={search} onChange={e=>setSearch(e.target.value)} style={{ marginBottom:4 }} />
            {search && filtered.slice(0,5).map(u=>(
              <div key={u.id} className="chat-item" onClick={()=>startChat(u)}>
                <div style={{ fontWeight:600, fontSize:'.875rem' }}>{u.username}</div>
                <div className="text-xs text-muted">Click to message</div>
              </div>
            ))}
          </div>
          {contacts.map(c=>(
            <div key={c.id} className={`chat-item ${selected?.id===c.id?'active':''}`} onClick={()=>selectContact(c)}>
              <div style={{ fontWeight:600, fontSize:'.875rem' }}>{c.username}</div>
              <div className="text-xs text-muted" style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginTop:2 }}>{c.lastMsg||'No messages'}</div>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="chat-main">
          {selected ? <>
            <div style={{ padding:'.75rem 1rem', borderBottom:'1px solid var(--border)', fontWeight:600 }}>{selected.username}</div>
            <div className="messages">
              {messages.map(m=>(
                <div key={m.id} className={`msg ${m.sender_id===user.id?'msg-out':'msg-in'}`}>{m.message}</div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="msg-input-row">
              <input className="form-input" placeholder="Type a message..." value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} style={{ flex:1 }} />
              <button className="btn btn-primary" onClick={send}>→</button>
            </div>
          </> : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Select a conversation</div>}
        </div>
      </div>
    </div>
  );
}
