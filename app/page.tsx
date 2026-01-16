"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "./lib/supabase";

export default function Dashboard() {
  const [isLive, setIsLive] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [liveShow, setLiveShow] = useState<any>(null);
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
      setLiveShow(live || null);
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
                  {liveShow?.title || 'Unknown'}
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
              <button style={{ 
                width: 32, 
                height: 32, 
                background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
                border: 'none', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(229, 57, 53, 0.4)'
              }}>
                <span style={{ color: 'white', fontSize: 12, marginLeft: 2 }}>▶</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px' }}>
          <Link href="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 14, 
            padding: '12px 14px', 
            background: 'rgba(229, 57, 53, 0.15)', 
            color: '#e53935', 
            borderRadius: 12,
            textDecoration: 'none',
            marginBottom: 6,
            border: '1px solid rgba(229, 57, 53, 0.2)'
          }}>
            <span style={{ fontSize: 18 }}>🏠</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Dashboard</span>
          </Link>
          
          <Link href="/admin" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 14, 
            padding: '12px 14px', 
            color: 'rgba(255,255,255,0.7)', 
            borderRadius: 12,
            textDecoration: 'none',
            marginBottom: 6,
            transition: 'all 0.2s'
          }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Schedule</span>
          </Link>

          <Link href="/studio" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 14, 
            padding: '12px 14px', 
            color: 'rgba(255,255,255,0.7)', 
            borderRadius: 12,
            textDecoration: 'none',
            marginBottom: 6
          }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Live Chat</span>
          </Link>

          <Link href="/notifications" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 14, 
            padding: '12px 14px', 
            color: 'rgba(255,255,255,0.7)', 
            borderRadius: 12,
            textDecoration: 'none',
            marginBottom: 6
          }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>
          </Link>

          <Link href="/content" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 14, 
            padding: '12px 14px', 
            color: 'rgba(255,255,255,0.7)', 
            borderRadius: 12,
            textDecoration: 'none',
            marginBottom: 6
          }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>App Content</span>
          </Link>
        </nav>

        {/* Footer */}
        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0, fontWeight: 500 }}>REDIE 969 Admin v1.0</p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, marginLeft: 240 }}>
        
        {/* Header */}
        <header style={{ 
          background: 'white', 
          borderBottom: '1px solid #e5e7eb', 
          padding: '16px 28px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 38, 
              height: 38, 
              background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(229, 57, 53, 0.3)'
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 12 }}>R</span>
            </div>
            <div>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1f2937' }}>REDIE</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#e53935', marginLeft: 4 }}>969</span>
              <span style={{ fontSize: 20, fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>Studio</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button 
              onClick={toggleChat}
              style={{ 
                padding: '10px 20px', 
                background: chatOpen ? '#fef2f2' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
                color: chatOpen ? '#dc2626' : 'white', 
                border: chatOpen ? '1px solid #fecaca' : 'none', 
                borderRadius: 25, 
                fontWeight: 600, 
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: chatOpen ? 'none' : '0 4px 15px rgba(229, 57, 53, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: chatOpen ? '#dc2626' : '#4ade80' }}></span>
              {chatOpen ? 'Close Chat' : 'Open Chat'}
            </button>
            <div style={{ 
              width: 42, 
              height: 42, 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}>SK</div>
          </div>
        </header>

        {/* Content */}
        <div style={{ padding: 28 }}>
          
          {/* Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
            
            {/* Connection Status */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 24, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', 
                  borderRadius: 14, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: 22 }}>🔄</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>Connection Status</p>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 14px', 
                    background: isLive ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : '#f3f4f6', 
                    borderRadius: 25
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isLive ? '#f59e0b' : '#9ca3af' }}></div>
                    <span style={{ color: isLive ? '#b45309' : '#6b7280', fontSize: 13, fontWeight: 600 }}>
                      {isLive ? 'On Air: You' : 'Offline'}
                    </span>
                  </div>
                  <p style={{ margin: '12px 0 0 0' }}>
                    <a href="#" style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>How to connect? →</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Status */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 24, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                  borderRadius: 14, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: 22 }}>💬</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>Chat Status</p>
                  <p style={{ color: '#1f2937', fontSize: 18, fontWeight: 700, margin: 0 }}>
                    {chatOpen ? 'Chat is Open' : 'Chat is Closed'}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 13, margin: '8px 0 0 0' }}>
                    {messageCount} messages today
                  </p>
                </div>
              </div>
            </div>

            {/* Stream Server */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 24, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ 
                  width: 48, 
                  height: 48, 
                  background: 'linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 100%)', 
                  borderRadius: 14, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: 22 }}>📡</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>Stream Server</p>
                  <p style={{ color: '#1f2937', fontSize: 13, margin: '0 0 4px 0', fontFamily: 'monospace' }}>
                    s11d4ceafa.radio.co
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                    Port: <span style={{ color: '#1f2937', fontWeight: 600 }}>80</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards with Beautiful Circles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 28 }}>
            
            {/* Εκπομπές */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 32, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6',
              textAlign: 'center'
            }}>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, fontWeight: 600 }}>Εκπομπές</p>
              <div style={{ 
                width: 120, 
                height: 120, 
                margin: '0 auto 20px', 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="120" height="120" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#60a5fa" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="52" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                  <circle cx="60" cy="60" r="52" stroke="url(#blueGrad)" strokeWidth="10" fill="none" 
                    strokeDasharray="327" strokeDashoffset="250" strokeLinecap="round" />
                </svg>
                <div style={{ 
                  width: 70, 
                  height: 70, 
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: 28 }}>📅</span>
                </div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#1f2937', margin: 0 }}>{showCount}</p>
            </div>

            {/* Μηνύματα */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 32, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6',
              textAlign: 'center'
            }}>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, fontWeight: 600 }}>Μηνύματα Chat</p>
              <div style={{ 
                width: 120, 
                height: 120, 
                margin: '0 auto 20px', 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="120" height="120" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="52" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                  <circle cx="60" cy="60" r="52" stroke="url(#purpleGrad)" strokeWidth="10" fill="none" 
                    strokeDasharray="327" strokeDashoffset="300" strokeLinecap="round" />
                </svg>
                <div style={{ 
                  width: 70, 
                  height: 70, 
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <span style={{ fontSize: 28 }}>💬</span>
                </div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#1f2937', margin: 0 }}>{messageCount}</p>
            </div>

            {/* Live Status */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 32, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6',
              textAlign: 'center'
            }}>
              <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, fontWeight: 600 }}>Live Status</p>
              <div style={{ 
                width: 120, 
                height: 120, 
                margin: '0 auto 20px', 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="120" height="120" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                  <defs>
                    <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4ade80" />
                      <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    <linearGradient id="grayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#d1d5db" />
                      <stop offset="100%" stopColor="#9ca3af" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="52" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                  <circle cx="60" cy="60" r="52" stroke={isLive ? "url(#greenGrad)" : "url(#grayGrad)"} strokeWidth="10" fill="none" 
                    strokeDasharray="327" strokeDashoffset={isLive ? "0" : "327"} strokeLinecap="round" />
                </svg>
                <div style={{ 
                  width: 70, 
                  height: 70, 
                  background: isLive ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    background: isLive ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)' : '#d1d5db',
                    boxShadow: isLive ? '0 0 20px rgba(74, 222, 128, 0.5)' : 'none'
                  }}></div>
                </div>
              </div>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#1f2937', margin: 0 }}>{isLive ? 'LIVE' : 'OFF'}</p>
            </div>
          </div>

          {/* Bottom Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            
            {/* Now Playing */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 24, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(229, 57, 53, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: 14 }}>▶</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 16 }}>Now Playing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  background: 'linear-gradient(135deg, #e53935 0%, #b71c1c 100%)', 
                  borderRadius: 14, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(229, 57, 53, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: 9, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>REDIE<br/>969</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0', fontSize: 16 }}>{liveShow?.title || 'Unknown'}</p>
                  <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>{liveShow?.producer_name || 'REDIE 969'}</p>
                </div>
                <button style={{ 
                  padding: '10px 20px', 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: 10, 
                  fontWeight: 600, 
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                }}>Skip</button>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ 
              background: 'white', 
              borderRadius: 20, 
              padding: 24, 
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              border: '1px solid #f3f4f6'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ 
                  width: 40, 
                  height: 40, 
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: 14 }}>⚡</span>
                </div>
                <span style={{ fontWeight: 700, color: '#1f2937', fontSize: 16 }}>Quick Actions</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link href="/admin" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: '#f9fafb', 
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}>
                  <span>📅 Manage Shows</span>
                  <span style={{ color: '#9ca3af', fontSize: 18 }}>→</span>
                </Link>
                <Link href="/studio" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: '#f9fafb', 
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  <span>💬 Open Studio Chat</span>
                  <span style={{ color: '#9ca3af', fontSize: 18 }}>→</span>
                </Link>
                <Link href="/notifications" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: '#f9fafb', 
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500
                }}>
                  <span>🔔 Send Notification</span>
                  <span style={{ color: '#9ca3af', fontSize: 18 }}>→</span>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
