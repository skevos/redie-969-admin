"use client";
import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";

export default function Dashboard() {
  const [stats, setStats] = useState({ shows: 0, producers: 0, messages: 0, listeners: 0 });
  const [chatOpen, setChatOpen] = useState(false);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [nextShow, setNextShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    loadStats(); 
    loadNextShow();
    
    // Subscribe to chat config changes
    supabase.channel('dashboard_chat').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_config', filter: 'id=eq.1' }, (payload) => {
      setChatOpen((payload.new as any).is_chat_open);
    }).subscribe();
  }, []);

  async function loadStats() {
    const [shows, producers, messages, listeners, config] = await Promise.all([
      supabase.from('shows').select('id', { count: 'exact' }),
      supabase.from('producers').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('chat_messages').select('id', { count: 'exact' }),
      supabase.from('active_listeners').select('id', { count: 'exact' }),
      supabase.from('chat_config').select('is_chat_open').eq('id', 1).single()
    ]);
    
    setStats({
      shows: shows.count || 0,
      producers: producers.count || 0,
      messages: messages.count || 0,
      listeners: listeners.count || 0
    });
    setChatOpen(config.data?.is_chat_open || false);
    
    // Load recent messages
    const { data: msgs } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: false }).limit(5);
    setRecentMessages(msgs || []);
    setLoading(false);
  }

  async function loadNextShow() {
    const now = new Date();
    const greekTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Athens' }));
    const currentDay = (greekTime.getDay() + 6) % 7;
    const currentTime = greekTime.toTimeString().slice(0, 5);
    
    const { data } = await supabase
      .from('shows')
      .select('*')
      .eq('day_of_week', currentDay)
      .gte('start_time', currentTime)
      .order('start_time')
      .limit(1)
      .maybeSingle();
    
    setNextShow(data);
  }

  const daysGreek = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

  const statCards = [
    { label: 'Εκπομπές', value: stats.shows, icon: '📻', color: '#E53935', bg: 'rgba(229,57,53,0.1)' },
    { label: 'Παραγωγοί', value: stats.producers, icon: '👥', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
    { label: 'Μηνύματα', value: stats.messages, icon: '💬', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    { label: 'Live Listeners', value: stats.listeners, icon: '🎧', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1f2937' }}>Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Καλωσήρθες στο REDIE 969 Admin Panel</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10, 
              padding: '10px 20px', 
              background: chatOpen ? 'rgba(34,197,94,0.1)' : 'rgba(229,57,53,0.1)', 
              borderRadius: 12,
              border: chatOpen ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(229,57,53,0.3)'
            }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: chatOpen ? '#22c55e' : '#E53935', boxShadow: chatOpen ? '0 0 10px #22c55e' : '0 0 10px #E53935' }} />
              <span style={{ fontWeight: 600, color: chatOpen ? '#22c55e' : '#E53935', fontSize: 14 }}>
                Chat {chatOpen ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </header>

        <div style={{ padding: 32 }}>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
            {statCards.map((stat, i) => (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>{stat.label}</p>
                    <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#1f2937' }}>{loading ? '...' : stat.value}</p>
                  </div>
                  <div style={{ width: 52, height: 52, background: stat.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Next Show */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📻</span> Επόμενη Εκπομπή
              </h3>
              {nextShow ? (
                <div style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.08) 0%, rgba(229,57,53,0.02) 100%)', borderRadius: 12, padding: 20 }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1f2937' }}>{nextShow.title}</p>
                  <p style={{ margin: '8px 0 0', color: '#E53935', fontSize: 14, fontWeight: 600 }}>
                    {daysGreek[nextShow.day_of_week]} {nextShow.start_time?.slice(0,5)} - {nextShow.end_time?.slice(0,5)}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>με {nextShow.producer_name}</p>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                  <span style={{ fontSize: 40 }}>📅</span>
                  <p style={{ marginTop: 12 }}>Δεν υπάρχει προγραμματισμένη εκπομπή</p>
                </div>
              )}
            </div>

            {/* Recent Messages */}
            <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: '#1f2937', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>💬</span> Πρόσφατα Μηνύματα
              </h3>
              {recentMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                  <span style={{ fontSize: 40 }}>💬</span>
                  <p style={{ marginTop: 12 }}>Δεν υπάρχουν μηνύματα</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: 12, background: '#f9fafb', borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.chat_color || '#E53935', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {(msg.nickname_snapshot || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 13 }}>{msg.nickname_snapshot}</span>
                          <span style={{ color: '#9ca3af', fontSize: 11 }}>{new Date(msg.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', color: '#4b5563', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: 32 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#1f2937' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="/studio" style={{ padding: '14px 24px', background: 'linear-gradient(135deg, #E53935 0%, #c62828 100%)', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14, boxShadow: '0 4px 12px rgba(229,57,53,0.3)' }}>
                💬 Open Studio Chat
              </a>
              <a href="/admin" style={{ padding: '14px 24px', background: 'white', color: '#1f2937', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid #e5e7eb' }}>
                📅 Manage Schedule
              </a>
              <a href="/producers" style={{ padding: '14px 24px', background: 'white', color: '#1f2937', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: 14, border: '1px solid #e5e7eb' }}>
                👥 Manage Producers
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
