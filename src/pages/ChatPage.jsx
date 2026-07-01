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

  // ====== LOCAL STORAGE PERSISTENCE ======
  // Load saved selected contact on mount
  useEffect(() => {
    const savedContactId = localStorage.getItem('selectedChatContact');
    if (savedContactId) {
      // Find the contact and select them
      const contact = contacts.find(c => c.id === savedContactId);
      if (contact) {
        selectContact(contact);
      }
    }
  }, [contacts]);

  // Save selected contact when it changes
  useEffect(() => {
    if (selected) {
      localStorage.setItem('selectedChatContact', selected.id);
    }
  }, [selected]);

  // ====== REAL-TIME SUBSCRIPTION ======
  useEffect(() => {
    if (!user) return;
    loadContacts();

    // Subscribe to new messages
    const subscription = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // New message received - update UI
          const newMsg = payload.new;
          
          // If the message is from the selected contact, add to messages
          if (selected && newMsg.sender_id === selected.id) {
            setMessages(prev => [...prev, newMsg]);
            // Mark as read immediately
            markAsRead(newMsg.id);
          }
          
          // Update contacts list
          loadContacts();
        }
      )
      .subscribe();

    // Also listen for messages sent by the user (to update other user's chat)
    const subscription2 = supabase
      .channel('chat-messages-sent')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          // Message sent - update contacts
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      subscription2.unsubscribe();
    };
  }, [user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  // Listen for new messages from selected contact (polling fallback)
  useEffect(() => {
    if (!selected) return;
    
    // Poll for new messages every 3 seconds as fallback
    const interval = setInterval(() => {
      if (selected) {
        refreshMessages(selected.id);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selected]);

  async function loadContacts() {
    const r = await apiFetch('GET',`chat_messages?or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})&select=*,sender:sender_id(id,username),receiver:receiver_id(id,username)&order=created_at.desc&limit=200`);
    const data = Array.isArray(r.data) ? r.data : [];
    const seen = new Set(), contacts = [];
    data.forEach(m => {
      const other = m.sender_id===user.id ? m.receiver : m.sender;
      if (other && !seen.has(other.id)) { 
        seen.add(other.id); 
        contacts.push({ ...other, lastMsg: m.message, lastMsgTime: m.created_at }); 
      }
    });
    setContacts(contacts);
  }

  async function markAsRead(messageId) {
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${messageId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${tok()}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ read: true })
    }).catch(() => {});
  }

  async function refreshMessages(contactId) {
    const r = await apiFetch('GET',`chat_messages?or=(and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id}))&select=*&order=created_at`);
    const newMessages = Array.isArray(r.data) ? r.data : [];
    if (newMessages.length !== messages.length) {
      setMessages(newMessages);
    }
  }

  async function selectContact(c) {
    setSelected(c);
    const r = await apiFetch('GET',`chat_messages?or=(and(sender_id.eq.${user.id},receiver_id.eq.${c.id}),and(sender_id.eq.${c.id},receiver_id.eq.${user.id}))&select=*&order=created_at`);
    setMessages(Array.isArray(r.data) ? r.data : []);
    
    // Mark all messages from this contact as read
    await fetch(`${SUPABASE_URL}/rest/v1/chat_messages?receiver_id=eq.${user.id}&sender_id=eq.${c.id}&read=eq.false`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${tok()}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ read: true })
    }).catch(() => {});
  }

  async function send() {
    if (!text.trim() || !selected) return;
    
    const newMsg = {
      sender_id: user.id,
      receiver_id: selected.id,
      message: text,
      read: false,
      created_at: new Date().toISOString()
    };
    
    // Optimistically add to UI
    setMessages(prev => [...prev, newMsg]);
    setText('');
    
    // Send to server
    const result = await apiFetch('POST', 'chat_messages', newMsg);
    
    if (result.ok) {
      // Update contacts with new message
      loadContacts();
    } else {
      // Rollback if failed
      setMessages(prev => prev.filter(m => m !== newMsg));
    }
  }

  async function startChat(u) {
    setSearch('');
    if (!contacts.find(c=>c.id===u.id)) {
      setContacts(prev => [{ ...u, lastMsg: '', lastMsgTime: null }, ...prev]);
    }
    await selectContact(u);
    localStorage.setItem('selectedChatContact', u.id);
  }

  const filtered = allUsers.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) && 
    !contacts.find(c=>c.id===u.id)
  );

  // Get unread count for a contact
  const getUnreadCount = (contactId) => {
    return messages.filter(m => m.sender_id === contactId && m.receiver_id === user.id && !m.read).length;
  };

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
          {contacts.map(c=>{
            const unread = getUnreadCount(c.id);
            return (
              <div key={c.id} className={`chat-item ${selected?.id===c.id?'active':''}`} onClick={()=>selectContact(c)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight:600, fontSize:'.875rem' }}>{c.username}</div>
                  {unread > 0 && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>{unread}</span>}
                </div>
                <div className="text-xs text-muted" style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', marginTop:2 }}>
                  {c.lastMsg || 'No messages'}
                </div>
                {c.lastMsgTime && (
                  <div className="text-xs text-muted" style={{ fontSize: '0.6rem', marginTop: 1 }}>
                    {new Date(c.lastMsgTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div className="chat-main">
          {selected ? <>
            <div style={{ padding:'.75rem 1rem', borderBottom:'1px solid var(--border)', fontWeight:600 }}>
              {selected.username}
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginLeft: 8, fontWeight: 400 }}>
                {selected.role === 'admin' ? '👑 Admin' : '🎮 Player'}
              </span>
            </div>
            <div className="messages">
              {messages.map((m, i) => (
                <div key={m.id || i} className={`msg ${m.sender_id===user.id ? 'msg-out' : 'msg-in'}`}>
                  {m.message}
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 2 }}>
                    {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="msg-input-row">
              <input 
                className="form-input" 
                placeholder="Type a message..." 
                value={text} 
                onChange={e=>setText(e.target.value)} 
                onKeyDown={e=>e.key==='Enter'&&send()} 
                style={{ flex:1 }} 
              />
              <button className="btn btn-primary" onClick={send}>→</button>
            </div>
          </> : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)' }}>Select a conversation</div>}
        </div>
      </div>
    </div>
  );
}
