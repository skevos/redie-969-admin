"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";
import Sidebar from "./components/Sidebar";

export default function Dashboard() {
  const [isLive, setIsLive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const { data: config } = await supabase.from("chat_config").select("*").eq("id", 1).single();
      setChatOpen(config?.is_chat_open || false);
      
      if (config?.active_room_id) {
        const { count } = await supabase.from("chat_messages").select("*", { count: "exact" }).eq("room_id", config.active_room_id);
        setMessageCount(count || 0);
      }

      const { data: shows, count: totalShows } = await supabase.from("shows").select("*", { count: "exact" });
      setShowCount(totalShows || 0);
      
      const live = shows?.find((s: any) => s.is_live);
      setIsLive(!!live);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function toggleChat() {
    if (chatOpen) {
      await supabase.from("chat_config").update({ is_chat_open: false }).eq("id", 1);
      setChatOpen(false);
    } else {
      const title = "Live Chat - " + new Date().toLocaleDateString("el-GR");
      const { data: room } = await supabase.from("chat_rooms").insert({ title, is_closed: false, starts_at: new Date().toISOString() }).select().single();
      if (room) {
        await supabase.from("chat_config").update({ active_room_id: room.id, is_chat_open: true }).eq("id", 1);
        setChatOpen(true);
      }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 240, padding: 32 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', margin: 0 }}>Dashboard</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: 14 }}>REDIE 969 Admin Panel</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={toggleChat}
              style={{ 
                padding: '12px 24px', 
                background: chatOpen ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: 12, 
                fontWeight: 600, 
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: chatOpen ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(34, 197, 94, 0.3)'
              }}
            >
              {chatOpen ? '🔴 Close Chat' : '🟢 Open Chat'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 32 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Total Shows</p>
                <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#1f2937' }}>{showCount}</p>
              </div>
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>📻</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Chat Messages</p>
                <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#1f2937' }}>{messageCount}</p>
              </div>
              <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>💬</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Chat Status</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 0 0', color: chatOpen ? '#22c55e' : '#6b7280' }}>{chatOpen ? 'OPEN' : 'CLOSED'}</p>
              </div>
              <div style={{ width: 48, height: 48, background: chatOpen ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>{chatOpen ? '🟢' : '⚪'}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Live Status</p>
                <p style={{ fontSize: 24, fontWeight: 700, margin: '8px 0 0 0', color: isLive ? '#22c55e' : '#6b7280' }}>{isLive ? 'ON AIR' : 'OFF AIR'}</p>
              </div>
              <div style={{ width: 48, height: 48, background: isLive ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22 }}>{isLive ? '🎙️' : '📴'}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 20px 0' }}>⚡ Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <Link href="/admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none' }}>
              <span style={{ fontSize: 28, marginBottom: 8 }}>📅</span>
              <span style={{ color: '#374151', fontWeight: 600, fontSize: 14 }}>Manage Shows</span>
            </Link>
            <Link href="/studio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none' }}>
              <span style={{ fontSize: 28, marginBottom: 8 }}>💬</span>
              <span style={{ color: '#374151', fontWeight: 600, fontSize: 14 }}>Studio Chat</span>
            </Link>
            <Link href="/notifications" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none' }}>
              <span style={{ fontSize: 28, marginBottom: 8 }}>🔔</span>
              <span style={{ color: '#374151', fontWeight: 600, fontSize: 14 }}>Send Notification</span>
            </Link>
            <Link href="/content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none' }}>
              <span style={{ fontSize: 28, marginBottom: 8 }}>📱</span>
              <span style={{ color: '#374151', fontWeight: 600, fontSize: 14 }}>App Content</span>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
