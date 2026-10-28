"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

const CHUNK_SIZE = 300;

// Fetch all rows past the 1000-row PostgREST cap
async function fetchAll<T = any>(buildQuery: () => any): Promise<{ data: T[]; error: any }> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) return { data: all, error };
    all.push(...((data || []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return { data: all, error: null };
}

export default function StudioChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [pinnedMessage, setPinnedMessage] = useState<string>('');
  const [nextShow, setNextShow] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toggleBusyRef = useRef(false);
  const replyBusyRef = useRef(false);

  useEffect(() => { 
    loadChat(); 
    loadNextShow();
  }, []);

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
    setAutoMode(config?.auto_mode ?? true);
    setRoomId(config?.active_room_id || null);
    
    
    if (config?.active_room_id) {
      const { data: msgs } = await supabase.from('chat_messages').select('*').eq('room_id', config.active_room_id).order('created_at', { ascending: true });
      setMessages(msgs || []);
      
      // Find pinned message
      const pinned = msgs?.find(m => m.is_pinned);
      if (pinned) setPinnedMessage(pinned.message);
    }
    setLoading(false);
  }

  async function loadNextShow() {
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7;
    const currentTime = now.toTimeString().slice(0, 5);
    
    const { data: todayShows } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', currentDay)
      .gte('start_time', currentTime)
      .order('start_time')
      .limit(1);
    
    if (todayShows && todayShows.length > 0) {
      setNextShow(todayShows[0]);
    } else {
      const tomorrow = (currentDay + 1) % 7;
      const { data: tomorrowShows } = await supabase
        .from('shows')
        .select('*')
        .eq('day_of_week', tomorrow)
        .order('start_time')
        .limit(1);
      
      if (tomorrowShows && tomorrowShows.length > 0) {
        setNextShow(tomorrowShows[0]);
      }
    }
  }

  // Send push notification to all users (batch)
  async function sendPushToAll(title: string, body: string) {
    if (sendingNotification) return;
    setSendingNotification(true);
    
    try {
      const { data: tokens } = await fetchAll<{ token: string }>(() => supabase.from('fcm_tokens').select('token'));
      if (tokens && tokens.length > 0) {
        const allTokens = tokens.map(t => t.token);
        const invalidTokens: string[] = [];
        // Send in chunks of CHUNK_SIZE tokens
        for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
          try {
            const res = await fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                tokens: allTokens.slice(i, i + CHUNK_SIZE), 
                title, 
                body 
              })
            });
            const isJson = (res.headers.get('content-type') || '').includes('application/json');
            const data = isJson ? await res.json() : null;
            if (data && Array.isArray(data.invalidTokens)) invalidTokens.push(...data.invalidTokens);
          } catch (e) {
            console.log('Push chunk error:', e);
          }
        }
        // Remove dead tokens (ignore errors)
        if (invalidTokens.length > 0) {
          try { await supabase.from('fcm_tokens').delete().in('token', invalidTokens); } catch (e) { console.log(e); }
        }
      }
    } catch (e) { 
      console.log('Push error:', e); 
    } finally {
      setSendingNotification(false);
    }
  }

  async function openChat() {
    const title = "Live Chat - " + new Date().toLocaleDateString('el-GR');
    const { data: room, error } = await supabase.from('chat_rooms').insert({ 
      title, 
      is_closed: false, 
      starts_at: new Date().toISOString() 
    }).select().single();
    
    if (room && !error) {
      await supabase.from('chat_config').update({ 
        active_room_id: room.id, 
        is_chat_open: true 
      }).eq('id', 1);
      setRoomId(room.id);
      setChatOpen(true);
      setMessages([]);
      
      // Save notification to app_notifications table
      await supabase.from('app_notifications').insert({
        title: '💬 Το Chat Άνοιξε!',
        body: 'Έλα να μιλήσεις μαζί μας live!',
        type: 'chat'
      });
      
      // Send push notification
      await sendPushToAll('💬 Το Chat Άνοιξε!', 'Έλα να μιλήσεις μαζί μας live!');
    }
  }

  async function closeChat() {
    // Archive messages before closing
    if (roomId && messages.length > 0) {
      const { data: roomRow } = await supabase.from('chat_rooms').select('show_name, title').eq('id', roomId).maybeSingle();
      await supabase.from('chat_archives').insert({
        room_id: roomId,
        messages: messages,
        total_messages: messages.length,
        show_name: roomRow?.show_name || roomRow?.title || null
      });
    }
    
    await supabase.from('chat_config').update({ is_chat_open: false }).eq('id', 1);
    if (roomId) {
      await supabase.from('chat_rooms').update({ 
        is_closed: true,
        closed_at: new Date().toISOString()
      }).eq('id', roomId);
    }
    setChatOpen(false);
    
    // Save notification to app_notifications table
    await supabase.from('app_notifications').insert({
      title: '📴 Το Chat Έκλεισε',
      body: 'Ευχαριστούμε για τη συμμετοχή σας! Τα λέμε σύντομα.',
      type: 'chat'
    });
    
    // Send push notification when chat closes
    await sendPushToAll('📴 Το Chat Έκλεισε', 'Ευχαριστούμε για τη συμμετοχή σας! Τα λέμε σύντομα.');
  }

  async function toggleChat() {
    if (toggleBusyRef.current) return;
    toggleBusyRef.current = true;
    try {
      if (chatOpen) {
        await closeChat();
      } else {
        await openChat();
      }
    } finally {
      toggleBusyRef.current = false;
    }
  }

  async function toggleAutoMode() {
    const newMode = !autoMode;
    setAutoMode(newMode);
    await supabase.from('chat_config').update({ auto_mode: newMode }).eq('id', 1);
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  async function pinMessage(msg: any) {
    // Unpin all first
    await supabase.from('chat_messages').update({ is_pinned: false }).eq('room_id', roomId);
    // Pin this one
    await supabase.from('chat_messages').update({ is_pinned: true }).eq('id', msg.id);
    setPinnedMessage(msg.message);
    setMessages(prev => prev.map(m => ({ ...m, is_pinned: m.id === msg.id })));
  }

  async function clearPin() {
    await supabase.from('chat_messages').update({ is_pinned: false }).eq('room_id', roomId);
    setPinnedMessage('');
    setMessages(prev => prev.map(m => ({ ...m, is_pinned: false })));
  }

  async function clearAllMessages() {
    if (!confirm('Διαγραφή όλων των μηνυμάτων;')) return;
    await supabase.from('chat_messages').delete().eq('room_id', roomId);
    setMessages([]);
    setPinnedMessage('');
  }

  async function sendReply() {
    if (!replyText.trim() || !roomId) return;
    if (replyBusyRef.current) return;
    replyBusyRef.current = true;
    
    try {
      const { error } = await supabase.from('chat_messages').insert({
        room_id: roomId,
        message: replyText,
        nickname_snapshot: 'REDIE 969',
        role_snapshot: 'admin'
      });
      if (error) { alert(error.message); return; }
      setReplyText('');
    } finally {
      replyBusyRef.current = false;
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
  }

  const daysGreek = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <Sidebar />
      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 260, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Live Chat Studio</span>
            <div style={{ 
              width: 12, height: 12, borderRadius: '50%', 
              background: chatOpen ? '#22c55e' : '#d1d5db',
              boxShadow: chatOpen ? '0 0 8px #22c55e' : 'none'
            }}></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleAutoMode}
              style={{
                padding: '10px 16px',
                background: autoMode ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#e5e7eb',
                color: autoMode ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⏰ Auto Mode {autoMode ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={toggleChat}
              disabled={sendingNotification}
              style={{
                padding: '10px 20px',
                background: chatOpen ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: sendingNotification ? 'wait' : 'pointer',
                opacity: sendingNotification ? 0.7 : 1,
              }}
            >
              {sendingNotification ? '⏳ Αποστολή...' : (chatOpen ? '🔴 Close Chat' : '🟢 Open Chat')}
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Chat Messages */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
            
            {/* Pinned Message */}
            {pinnedMessage && (
              <div style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>📌</span>
                <p style={{ margin: 0, flex: 1, fontWeight: 500, color: '#92400e' }}>{pinnedMessage}</p>
                <button onClick={clearPin} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#92400e' }}>×</button>
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
                  {autoMode && nextShow && (
                    <p style={{ color: '#e53935', fontSize: 13, marginTop: 12 }}>
                      ⏰ Θα ανοίξει αυτόματα 15' πριν: {nextShow.title}
                    </p>
                  )}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <span style={{ fontSize: 60 }}>👋</span>
                  <p style={{ color: '#6b7280', fontSize: 18, marginTop: 16 }}>Το chat είναι ανοιχτό!</p>
                  <p style={{ color: '#9ca3af', fontSize: 14 }}>Περιμένοντας μηνύματα από τους ακροατές...</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {messages.filter(m => !m.is_hidden).map(msg => (
                    <div key={msg.id} style={{ 
                      display: 'flex', gap: 12, padding: 16, 
                      background: msg.role_snapshot === 'admin' ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'white', 
                      borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
                      border: msg.role_snapshot === 'admin' ? '2px solid #e53935' : msg.is_pinned ? '2px solid #f59e0b' : '1px solid #f3f4f6' 
                    }}>
                      {msg.producer_photo ? (
                        <img src={msg.producer_photo} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div style={{ 
                          width: 44, height: 44, 
                          background: msg.role_snapshot === 'admin' ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)' : msg.role_snapshot === 'producer' ? (msg.chat_color || '#9C27B0') : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          color: 'white', fontWeight: 600, fontSize: msg.role_snapshot === 'admin' ? 10 : 14, flexShrink: 0 
                        }}>
                          {msg.role_snapshot === 'admin' ? '📻' : msg.role_snapshot === 'producer' ? '🎧' : (msg.nickname_snapshot || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: msg.role_snapshot === 'admin' ? '#e53935' : '#1f2937', fontSize: 14 }}>
                            {msg.nickname_snapshot || 'Anonymous'}
                          </span>
                          {msg.role_snapshot === 'admin' && <span style={{ background: '#e53935', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>ADMIN</span>}
                          {msg.role_snapshot === 'producer' && <span style={{ background: msg.chat_color || '#9C27B0', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{msg.show_name || 'PRODUCER'}</span>}
                          {msg.is_pinned && <span style={{ background: '#f59e0b', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>📌 PINNED</span>}
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>{formatTime(msg.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => pinMessage(msg)} style={{ width: 32, height: 32, background: msg.is_pinned ? '#fef3c7' : '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }} title="Pin">📌</button>
                        <button onClick={() => deleteMessage(msg.id)} style={{ width: 32, height: 32, background: '#fef2f2', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#dc2626' }} title="Delete">🗑</button>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Admin Reply Box */}
            {chatOpen && (
              <div style={{ padding: 16, background: 'white', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                  placeholder="Απάντησε ως REDIE 969..."
                  style={{ flex: 1, padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }}
                />
                <button 
                  onClick={sendReply}
                  style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                >
                  📤 Αποστολή
                </button>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div style={{ width: 300, background: 'white', borderLeft: '1px solid #e5e7eb', padding: 24, overflowY: 'auto' }}>
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

            <div style={{ background: '#f9fafb', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>Auto Mode</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: autoMode ? '#22c55e' : '#d1d5db' }}></div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#1f2937', margin: 0 }}>{autoMode ? 'Ενεργό' : 'Ανενεργό'}</p>
              </div>
            </div>

            {nextShow && (
              <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 16, padding: 20, marginBottom: 16, border: '1px solid #bfdbfe' }}>
                <p style={{ color: '#1e40af', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📻 Επόμενη Εκπομπή</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0' }}>{nextShow.title}</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  {daysGreek[nextShow.day_of_week]} {nextShow.start_time?.slice(0,5)} - {nextShow.end_time?.slice(0,5)}
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0 0' }}>με {nextShow.producer_name}</p>
                {autoMode && (
                  <p style={{ fontSize: 11, color: '#e53935', margin: '8px 0 0 0' }}>
                    ⏰ Chat θα ανοίξει 15' πριν
                  </p>
                )}
              </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', borderRadius: 16, padding: 20 }}>
              <p style={{ color: '#991b1b', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>⚠️ Quick Actions</p>
              <button 
                onClick={clearAllMessages} 
                style={{ width: '100%', padding: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
              >
                🗑 Διαγραφή Όλων
              </button>
              {pinnedMessage && (
                <button 
                  onClick={clearPin} 
                  style={{ width: '100%', padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  📌 Αφαίρεση Pin
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
