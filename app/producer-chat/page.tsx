"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export default function ProducerChatPage() {
  const [producer, setProducer] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [listenerCount, setListenerCount] = useState(0);
  const [listenerBase, setListenerBase] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('producer_session');
    if (saved) checkSession(JSON.parse(saved));
  }, []);

  async function checkSession(p: any) {
    const { data } = await supabase.from('producers').select().eq('id', p.id).eq('is_active', true).maybeSingle();
    if (data) { setProducer(data); loadChatConfig(); }
    else localStorage.removeItem('producer_session');
  }

  async function handleLogin() {
    setLoading(true); setError('');
    const { data } = await supabase.from('producers').select().eq('username', username.trim()).eq('password', password).eq('is_active', true).maybeSingle();
    if (data) { setProducer(data); localStorage.setItem('producer_session', JSON.stringify(data)); loadChatConfig(); }
    else setError('Λάθος username ή password');
    setLoading(false);
  }

  function handleLogout() { setProducer(null); localStorage.removeItem('producer_session'); setMessages([]); setUsername(''); setPassword(''); }

  async function loadChatConfig() {
    const { data } = await supabase.from('chat_config').select().eq('id', 1).single();
    if (data) { setChatOpen(data.is_chat_open); setRoomId(data.active_room_id); if (data.is_chat_open && data.active_room_id) { loadMessages(data.active_room_id); subscribeToMessages(data.active_room_id); } }
    
    // Load listeners
    loadListeners();
    
    // Subscribe to listener changes
    supabase.channel('listeners').on('postgres_changes', { event: '*', schema: 'public', table: 'active_listeners' }, () => {
      loadListeners();
    }).subscribe();
    
    // Load settings for base count
    loadSettings();
    
    // Subscribe to settings changes
    supabase.channel('settings_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings', filter: 'id=eq.1' }, () => {
      loadSettings();
    }).subscribe();
    
    // Subscribe to chat config changes
    supabase.channel('chat_config_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_config', filter: 'id=eq.1' }, (payload) => {
      const newData = payload.new as any;
      setChatOpen(newData.is_chat_open);
      setRoomId(newData.active_room_id);
      if (newData.is_chat_open && newData.active_room_id) {
        loadMessages(newData.active_room_id);
      }
    }).subscribe();
  }

  async function loadListeners() {
    const { data } = await supabase.from('active_listeners').select('id');
    setListenerCount(data?.length || 0);
  }

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('listener_count_base').eq('id', 1).single();
    if (data) setListenerBase(data.listener_count_base || 0);
  }

  async function loadMessages(room: string) {
    const { data } = await supabase.from('chat_messages').select('*').eq('room_id', room).order('created_at', { ascending: true }).limit(100);
    if (data) setMessages(data);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }

  function subscribeToMessages(room: string) {
    supabase.channel('chat_' + room).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'room_id=eq.' + room }, (payload) => {
      setMessages(prev => [...prev, payload.new]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).subscribe();
  }

  async function sendMessage() {
    if (!newMessage.trim() || !roomId || !producer) return;
    await supabase.from('chat_messages').insert({ room_id: roomId, nickname_snapshot: producer.name, role_snapshot: 'producer', message: newMessage.trim(), producer_id: producer.id, show_name: producer.show_1 || null, chat_color: producer.chat_color || '#9C27B0', chat_icon: producer.chat_icon || 'headphones', producer_photo: producer.photo_url || null });
    setNewMessage('');
  }

  if (!producer) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: 24, padding: 48, width: 420, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <img src="/logo.png" alt="REDIE 969" style={{ width: 180, height: 180, objectFit: 'contain', margin: '0 auto 24px' }} />
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1f2937' }}>Producer Login</h1>
            <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: 15 }}>Σύνδεση στο Live Chat</p>
          </div>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="off" style={{ width: '100%', padding: 16, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 16, color: '#1f2937', marginBottom: 16, boxSizing: 'border-box', outline: 'none' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} autoComplete="new-password" style={{ width: '100%', padding: 16, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 16, color: '#1f2937', marginBottom: 24, boxSizing: 'border-box', outline: 'none' }} />
          {error && <div style={{ background: 'rgba(229,57,53,0.2)', color: '#E53935', padding: 14, borderRadius: 10, marginBottom: 20, textAlign: 'center', border: '1px solid rgba(229,57,53,0.3)' }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: 16, background: '#E53935', color: 'white', border: 'none', borderRadius: 12, fontSize: 17, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>{loading ? 'Σύνδεση...' : 'Είσοδος'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: 'white', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/logo.png" alt="REDIE 969" style={{ width: 50, height: 50, objectFit: 'contain' }} />
          <div>
            <span style={{ color: '#1f2937', fontWeight: 700, fontSize: 18 }}>REDIE <span style={{ color: '#E53935' }}>969</span></span>
            <span style={{ color: '#6b7280', fontSize: 14, marginLeft: 12 }}>Producer Chat</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {producer.photo_url && <img src={producer.photo_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #E53935' }} />}
          <div>
            <span style={{ color: '#1f2937', fontWeight: 600, display: 'block' }}>{producer.name}</span>
            {producer.show_1 && <span style={{ color: '#E53935', fontSize: 12 }}>{producer.show_1}</span>}
          </div>
          {producer.is_admin && <span style={{ background: '#E53935', color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>ADMIN</span>}
          <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>Έξοδος</button>
        </div>
      </header>
      <div style={{ padding: '12px 24px', background: chatOpen ? 'rgba(34,197,94,0.1)' : 'rgba(229,57,53,0.1)', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: 600, color: chatOpen ? '#22c55e' : '#E53935', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: chatOpen ? '#22c55e' : '#E53935', boxShadow: chatOpen ? '0 0 10px #22c55e' : '0 0 10px #E53935' }}></span>
          {chatOpen ? 'Chat ΑΝΟΙΧΤΟ' : 'Chat ΚΛΕΙΣΤΟ'}
        </span>
        <span style={{ marginLeft: 20, display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280' }}>
          <span style={{ fontSize: 16 }}>🎧</span>
          <span style={{ fontWeight: 600 }}>{listenerBase + listenerCount}</span>
          <span style={{ fontSize: 13 }}>Live Listeners</span>
        </span>
      </div>
      <div style={{ height: 'calc(100vh - 200px)', overflowY: 'auto', padding: 24 }}>
        {messages.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}><span style={{ fontSize: 64 }}>💬</span><p style={{ marginTop: 16, fontSize: 18 }}>Δεν υπάρχουν μηνύματα</p></div> : messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            {msg.producer_photo ? (
              <img src={msg.producer_photo} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: msg.producer_id ? (msg.chat_color || '#E53935') : '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: 'white', fontSize: 14 }}>{msg.producer_id ? (msg.chat_icon === 'mic' ? '🎤' : msg.chat_icon === 'radio' ? '📻' : msg.chat_icon === 'music' ? '🎵' : msg.chat_icon === 'star' ? '⭐' : msg.chat_icon === 'fire' ? '🔥' : '🎧') : '👤'}</span>
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: msg.producer_id ? (msg.chat_color || '#E53935') : '#1f2937' }}>{msg.nickname_snapshot}</span>
                {msg.show_name && <span style={{ background: msg.chat_color || '#E53935', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{msg.show_name}</span>}
                <span style={{ color: '#9ca3af', fontSize: 11 }}>{new Date(msg.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p style={{ margin: 0, color: '#374151', fontSize: 15, lineHeight: 1.5 }}>{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', padding: 20, boxShadow: '0 -2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', gap: 12, maxWidth: 900, margin: '0 auto' }}>
            <input type="text" placeholder="Γράψε μήνυμα..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ flex: 1, padding: 16, background: '#f9fafb', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 16, color: '#1f2937', outline: 'none' }} />
            <button onClick={sendMessage} style={{ padding: '16px 32px', background: '#E53935', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>Αποστολή</button>
          </div>
        </div>
      )}
    </div>
  );
}
