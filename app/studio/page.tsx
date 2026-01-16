"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function StudioChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinnedMessage, setPinnedMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChat(); }, []);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel('chat-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadChat() {
    const { data: config } = await supabase.from('chat_config').select('*').eq('id', 1).single();
    setChatOpen(config?.is_chat_open || false);
    setRoomId(config?.active_room_id || null);
    
    if (config?.active_room_id) {
      const { data: msgs } = await supabase.from('chat_messages').select('*').eq('room_id', config.active_room_id).order('created_at', { ascending: true });
      setMessages(msgs || []);
    }
    setLoading(false);
  }

  async function toggleChat() {
    if (chatOpen) {
      await supabase.from('chat_config').update({ is_chat_open: false }).eq('id', 1);
      setChatOpen(false);
    } else {
      const title = "Live Chat - " + new Date().toLocaleDateString('el-GR');
      const { data: room } = await supabase.from('chat_rooms').insert({ title, is_closed: false, starts_at: new Date().toISOString() }).select().single();
      if (room) {
        await supabase.from('chat_config').update({ active_room_id: room.id, is_chat_open: true }).eq('id', 1);
        setRoomId(room.id);
        setChatOpen(true);
        setMessages([]);
      }
    }
  }

  async function deleteMessage(id: number) {
    await supabase.from('chat_messages').delete().eq('id', id);
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  async function pinMessage(text: string) {
    setPinnedMessage(text);
    await supabase.from('chat_config').update({ pinned_message: text }).eq('id', 1);
  }

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: 240, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20, boxShadow: '4px 0 20px rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
            </div>
            <div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE</span>
              <span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🏠</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Dashboard</span>
          </Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Schedule</span>
          </Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229, 57, 53, 0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6, border: '1px solid rgba(229, 57, 53, 0.2)' }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Live Chat</span>
          </Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>
          </Link>
          <Link href="/content" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>App Content</span>
          </Link>
        </nav>

        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Studio Chat</span>
            <span style={{ padding: '6px 12px', background: chatOpen ? '#dcfce7' : '#f3f4f6', color: chatOpen ? '#16a34a' : '#6b7280', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {chatOpen ? '🟢 OPEN' : '⚫ CLOSED'}
            </span>
          </div>
          <button onClick={toggleChat} style={{ padding: '12px 24px', background: chatOpen ? '#fef2f2' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: chatOpen ? '#dc2626' : 'white', border: chatOpen ? '1px solid #fecaca' : 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', boxShadow: chatOpen ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)' }}>
            {chatOpen ? '🔴 Close Chat' : '🟢 Open Chat'}
          </button>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Chat Messages */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
            
            {/* Pinned Message */}
            {pinnedMessage && (
              <div style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>📌</span>
                <p style={{ margin: 0, flex: 1, fontWeight: 500, color: '#92400e' }}>{pinnedMessage}</p>
                <button onClick={() => setPinnedMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e' }}>×</button>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
                </div>
              ) : !chatOpen ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <span style={{ fontSize: 60 }}>💬</span>
                  <p style={{ color: '#6b7280', fontSize: 18, marginTop: 16 }}>Το chat είναι κλειστό</p>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Πάτα "Open Chat" για να ξεκινήσεις νέα συνομιλία</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <span style={{ fontSize: 60 }}>👋</span>
                  <p style={{ color: '#6b7280', fontSize: 18, marginTop: 16 }}>Το chat είναι ανοιχτό!</p>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Περιμένοντας μηνύματα από τους ακροατές...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: 12, padding: 16, background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                      <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                        {(msg.user_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 14 }}>{msg.user_name || 'Anonymous'}</span>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>{formatTime(msg.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => pinMessage(msg.message)} style={{ width: 32, height: 32, background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }} title="Pin">📌</button>
                        <button onClick={() => deleteMessage(msg.id)} style={{ width: 32, height: 32, background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#dc2626' }} title="Delete">🗑</button>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div style={{ width: 280, background: 'white', borderLeft: '1px solid #e5e7eb', padding: 24, overflowY: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 20 }}>📊 Στατιστικά Chat</h3>
            
            <div style={{ background: '#f9fafb', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>Μηνύματα</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: '#1f2937', margin: 0 }}>{messages.length}</p>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>Status</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: chatOpen ? '#22c55e' : '#d1d5db' }}></div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: 0 }}>{chatOpen ? 'Online' : 'Offline'}</p>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', borderRadius: 16, padding: 20 }}>
              <p style={{ color: '#991b1b', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>⚠️ Quick Actions</p>
              <button onClick={() => { if(confirm('Διαγραφή όλων;')) setMessages([]); }} style={{ width: '100%', padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                🗑 Διαγραφή Όλων
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
