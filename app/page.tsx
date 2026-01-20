"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";
import { verifySession, logout, canAccess, type DashboardUser } from "./lib/auth";
import LoginPage from "./components/LoginPage";

export default function Dashboard() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [liveShow, setLiveShow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementUrl, setAnnouncementUrl] = useState("");
  const [announcementUrlActive, setAnnouncementUrlActive] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem("dashboard_token");
    if (token) {
      const verifiedUser = await verifySession(token);
      if (verifiedUser) {
        setUser(verifiedUser);
      } else {
        localStorage.removeItem("dashboard_token");
        localStorage.removeItem("dashboard_user");
      }
    }
    setAuthLoading(false);
  }

  function handleLogin(token: string) {
    const savedUser = localStorage.getItem("dashboard_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem("dashboard_token");
    if (token) {
      await logout(token);
    }
    localStorage.removeItem("dashboard_token");
    localStorage.removeItem("dashboard_user");
    setUser(null);
  }

  useEffect(() => {
    if (user) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

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
      setLiveShow(live || null);
      setIsLive(!!live);

      // Load announcement settings
      const { data: settings } = await supabase.from("settings").select("*").eq("id", 1).single();
      if (settings) {
        setAnnouncement(settings.announcement || "");
        setAnnouncementActive(settings.announcement_active || false);
        setAnnouncementUrl(settings.announcement_url || "");
        setAnnouncementUrlActive(settings.announcement_url_active || false);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function toggleChat() {
    if (!canAccess(user!.role, ['owner', 'admin'])) return;
    
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

  async function saveAnnouncement() {
    await supabase.from("settings").update({
      announcement,
      announcement_active: announcementActive,
      announcement_url: announcementUrl,
      announcement_url_active: announcementUrlActive
    }).eq("id", 1);
    alert("Αποθηκεύτηκε!");
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Producer Panel (limited access)
  if (user.role === 'producer') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Producer Header */}
        <header style={{ 
          padding: '20px 32px', 
          background: 'rgba(0,0,0,0.2)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ 
              width: 44, height: 44, 
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
              borderRadius: 12, 
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
            </div>
            <div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE </span>
              <span style={{ color: '#e53935', fontWeight: 700, fontSize: 18 }}>969</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginLeft: 12 }}>Producer Panel</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              👤 {user.display_name}
            </span>
            <button 
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Αποσύνδεση
            </button>
          </div>
        </header>

        {/* Producer Content */}
        <main style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 600, marginBottom: 24 }}>
            Καλωσήρθες, {user.display_name}!
          </h1>
          
          {/* Status Card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 20,
            padding: 24,
            marginBottom: 24,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ 
                width: 12, height: 12, 
                borderRadius: '50%', 
                background: isLive ? '#00e676' : '#6b7280',
                boxShadow: isLive ? '0 0 12px #00e676' : 'none'
              }}></div>
              <span style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>
                {isLive ? 'ON AIR' : 'OFF AIR'}
              </span>
            </div>
            {liveShow && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
                Τρέχουσα εκπομπή: <strong style={{ color: 'white' }}>{liveShow.title}</strong>
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <Link href="/studio" style={{
              padding: 24,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s'
            }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>💬</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Studio Chat</span>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '8px 0 0 0' }}>
                Δες τα μηνύματα
              </p>
            </Link>
            
            <div style={{
              padding: 24,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>📊</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>Chat Messages</span>
              <p style={{ color: '#e53935', fontSize: 24, fontWeight: 700, margin: '8px 0 0 0' }}>
                {messageCount}
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Full Dashboard (owner/admin)
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <aside style={{ 
        width: 240, 
        background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'fixed', 
        height: '100vh',
        zIndex: 20,
        boxShadow: '4px 0 20px rgba(0,0,0,0.1)'
      }}>
        
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 44, 
              height: 44, 
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
              borderRadius: 12, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)'
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
            </div>
            <div>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>REDIE</span>
              <span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 36, height: 36, 
              background: user.role === 'owner' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: 10, 
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span style={{ color: 'white', fontSize: 14 }}>{user.role === 'owner' ? '👑' : '🛡️'}</span>
            </div>
            <div>
              <p style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0 }}>{user.display_name}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0 0', textTransform: 'uppercase' }}>{user.role}</p>
            </div>
          </div>
        </div>

        {/* On Air Card */}
        <div style={{ padding: 16 }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: 16, 
            padding: 16,
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {/* Status Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  background: isLive ? '#00e676' : '#6b7280',
                  boxShadow: isLive ? '0 0 12px #00e676' : 'none'
                }}></div>
                <span style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>
                  {isLive ? 'On Air' : 'Off Air'}
                </span>
              </div>
              <div style={{ 
                width: 26, 
                height: 26, 
                borderRadius: '50%', 
                background: isLive ? 'rgba(0,230,118,0.15)' : 'rgba(107,114,128,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: isLive ? '#00e676' : '#6b7280', fontSize: 14 }}>✓</span>
              </div>
            </div>
            
            {/* Now Playing Mini */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: 12, 
              padding: 12,
              marginBottom: 14
            }}>
              <div style={{ 
                width: 44, 
                height: 44, 
                background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)', 
                borderRadius: 10, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)'
              }}>
                <span style={{ color: 'white', fontSize: 8, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>REDIE<br/>969</span>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {liveShow?.title || 'No Show'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0 0' }}>
                  {liveShow?.producer_name || 'REDIE 969'}
                </p>
              </div>
            </div>

            {/* Listeners */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)' }}>
                <span style={{ fontSize: 16 }}>👥</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>6 Listeners</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(229, 57, 53, 0.15)', color: 'white', textDecoration: 'none', marginBottom: 4 }}>
            <span>🏠</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Dashboard</span>
          </Link>
          <Link href="/analytics" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
            <span>📊</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Analytics</span>
          </Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
            <span>📅</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Πρόγραμμα</span>
          </Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
            <span>💬</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Studio Chat</span>
          </Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
            <span>🔔</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>
          </Link>
          <Link href="/producers" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
            <span>👥</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Παραγωγοί</span>
          </Link>
          {user.role === 'owner' && (
            <Link href="/users" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', marginBottom: 4 }}>
              <span>🔐</span> <span style={{ fontSize: 14, fontWeight: 500 }}>Users & Roles</span>
            </Link>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button 
            onClick={handleLogout}
            style={{ 
              width: '100%',
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              padding: '12px 14px', 
              borderRadius: 12, 
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444', 
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            <span>🚪</span> Αποσύνδεση
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, marginLeft: 240, padding: 32 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', margin: 0 }}>Dashboard</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: 14 }}>Καλωσήρθες, {user.display_name}!</p>
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

        {/* Stats Grid */}
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

        {/* Announcement Card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6', marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 20px 0' }}>📢 Ανακοίνωση (App Banner)</h2>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Κείμενο Ανακοίνωσης</label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Γράψε την ανακοίνωση..."
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, minHeight: 80, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setAnnouncementActive(!announcementActive)}
              style={{
                padding: '10px 20px',
                background: announcementActive ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : '#e5e7eb',
                color: announcementActive ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {announcementActive ? '✅ Ενεργή' : '❌ Ανενεργή'}
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Εμφάνιση banner στην εφαρμογή</span>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginTop: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>🔗 Σύνδεσμος (URL)</label>
            <input
              type="text"
              value={announcementUrl}
              onChange={(e) => setAnnouncementUrl(e.target.value)}
              placeholder="https://..."
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 14, marginBottom: 12 }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setAnnouncementUrlActive(!announcementUrlActive)}
                style={{
                  padding: '10px 20px',
                  background: announcementUrlActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e5e7eb',
                  color: announcementUrlActive ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                {announcementUrlActive ? '🔗 Link Ενεργό' : '🔗 Link Ανενεργό'}
              </button>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Πατώντας το banner ανοίγει ο σύνδεσμος</span>
            </div>
          </div>

          <button
            onClick={saveAnnouncement}
            style={{
              marginTop: 20,
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)'
            }}
          >
            💾 Αποθήκευση
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 20px 0' }}>⚡ Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <Link href="/admin" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none', transition: 'all 0.2s' }}>
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
            <Link href="/producers" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, textDecoration: 'none' }}>
              <span style={{ fontSize: 28, marginBottom: 8 }}>👥</span>
              <span style={{ color: '#374151', fontWeight: 600, fontSize: 14 }}>Manage Producers</span>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}
