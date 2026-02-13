"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

interface AnalyticsData {
  totalInstalls: number;
  activeUsers: number;
  todayUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
  inactiveUsers: number;
  avgOpensPerUser: number;
  iosUsers: number;
  androidUsers: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationStats, setLocationStats] = useState<{country: string, count: number}[]>([]);
  const [listeningStats, setListeningStats] = useState<{totalSessions: number, totalMinutes: number, avgMinutes: number, iosSessions: number, androidSessions: number}>({totalSessions: 0, totalMinutes: 0, avgMinutes: 0, iosSessions: 0, androidSessions: 0});
  const [notifStats, setNotifStats] = useState<{total: number, ios: number, android: number}>({total: 0, ios: 0, android: 0});

  useEffect(() => {
    loadAnalytics(); loadLocationStats(); loadListeningStats(); loadNotifStats();
    const interval = setInterval(() => { loadAnalytics(); loadLocationStats(); loadListeningStats(); loadNotifStats(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      const { data: devices } = await supabase.from('app_analytics').select('*').order('last_open', { ascending: false });
      if (!devices) return;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const inactiveThreshold = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
      const totalInstalls = devices.length;
      const todayUsers = devices.filter(d => new Date(d.last_open) >= today).length;
      const weeklyUsers = devices.filter(d => new Date(d.last_open) >= weekAgo).length;
      const monthlyUsers = devices.filter(d => new Date(d.last_open) >= monthAgo).length;
      const inactiveUsers = devices.filter(d => new Date(d.last_open) < inactiveThreshold).length;
      const activeUsers = totalInstalls - inactiveUsers;
      const totalOpens = devices.reduce((sum, d) => sum + (d.total_opens || 1), 0);
      const avgOpensPerUser = totalInstalls > 0 ? Math.round(totalOpens / totalInstalls * 10) / 10 : 0;
      const iosUsers = devices.filter(d => d.platform === 'ios').length;
      const androidUsers = devices.filter(d => d.platform === 'android').length;
      setData({ totalInstalls, activeUsers, todayUsers, weeklyUsers, monthlyUsers, inactiveUsers, avgOpensPerUser, iosUsers, androidUsers });
      setRecentUsers(devices.slice(0, 10));
      setLoading(false);
    } catch (e) { console.error(e); setLoading(false); }
  }

  async function loadLocationStats() {
    try {
      const { data: tokens } = await supabase.from('fcm_tokens').select('country, city');
      if (tokens) {
        const countryMap = new Map<string, number>();
        tokens.forEach(t => { if (t.country) countryMap.set(t.country, (countryMap.get(t.country) || 0) + 1); });
        setLocationStats(Array.from(countryMap.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count));
      }
    } catch (e) { console.error(e); }
  }

  async function loadListeningStats() {
    try {
      const { data: sessions } = await supabase.from('listening_sessions').select('*');
      if (sessions) {
        const totalSessions = sessions.length;
        const totalSeconds = sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
        const totalMinutes = Math.round(totalSeconds / 60);
        const avgMinutes = totalSessions > 0 ? Math.round(totalSeconds / totalSessions / 60) : 0;
        const iosSessions = sessions.filter((s: any) => s.platform === 'ios').length;
        const androidSessions = sessions.filter((s: any) => s.platform === 'android').length;
        setListeningStats({ totalSessions, totalMinutes, avgMinutes, iosSessions, androidSessions });
      }
    } catch (e) { console.error(e); }
  }

  async function loadNotifStats() {
    try {
      const { data: tokens } = await supabase.from('fcm_tokens').select('platform');
      if (tokens) {
        setNotifStats({ total: tokens.length, ios: tokens.filter((t: any) => t.platform === 'ios').length, android: tokens.filter((t: any) => t.platform === 'android').length });
      }
    } catch (e) { console.error(e); }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '20px 32px' }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#1f2937' }}>📊 App Analytics</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Στατιστικά χρήσης της εφαρμογής</p>
        </header>
        <div style={{ padding: 32 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div></div>
          ) : (
            <>
              {/* Row 1 - Main Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
                {[
                  { label: 'Συνολικές Εγκαταστάσεις', value: data?.totalInstalls || 0, color: '#1f2937', icon: '📱', bg: 'rgba(59,130,246,0.1)' },
                  { label: 'Ενεργοί Χρήστες', value: data?.activeUsers || 0, color: '#22c55e', icon: '✅', bg: 'rgba(34,197,94,0.1)', sub: 'Τελευταίες 14 μέρες' },
                  { label: 'Σήμερα', value: data?.todayUsers || 0, color: '#3b82f6', icon: '📅', bg: 'rgba(59,130,246,0.1)', sub: 'Μοναδικοί χρήστες' },
                  { label: 'Ανενεργοί', value: data?.inactiveUsers || 0, color: '#ef4444', icon: '💤', bg: 'rgba(239,68,68,0.1)', sub: 'Πάνω από 14 μέρες' },
                ].map((card, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>{card.label}</p>
                        <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: card.color }}>{card.value}</p>
                        {card.sub && <p style={{ color: '#9ca3af', fontSize: 11, margin: '4px 0 0 0' }}>{card.sub}</p>}
                      </div>
                      <div style={{ width: 52, height: 52, background: card.bg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{card.icon}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Row 2 - Weekly/Monthly/Avg */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
                {[
                  { label: 'Εβδομαδιαίοι Χρήστες', value: data?.weeklyUsers || 0, color: '#8b5cf6', sub: 'Τελευταίες 7 μέρες' },
                  { label: 'Μηνιαίοι Χρήστες', value: data?.monthlyUsers || 0, color: '#f59e0b', sub: 'Τελευταίες 30 μέρες' },
                  { label: 'Μ.Ο. Ανοίγματα/Χρήστη', value: data?.avgOpensPerUser || 0, color: '#ec4899', sub: 'Φορές που άνοιξαν την app' },
                ].map((card, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>{card.label}</p>
                    <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: card.color }}>{card.value}</p>
                    <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0 0' }}>{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Row 3 - Platform + Listening + Notifications */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 16px 0' }}>📱 Platform</h3>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                      <p style={{ fontSize: 28, fontWeight: 700, color: '#166534', margin: 0 }}>{data?.androidUsers || 0}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>🤖 Android</p>
                    </div>
                    <div style={{ flex: 1, background: '#eff6ff', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                      <p style={{ fontSize: 28, fontWeight: 700, color: '#1e40af', margin: 0 }}>{data?.iosUsers || 0}</p>
                      <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>🍎 iOS</p>
                    </div>
                  </div>
                  {(data?.totalInstalls || 0) > 0 && <div style={{ marginTop: 12, height: 8, background: '#eff6ff', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', background: '#22c55e', width: `${((data?.androidUsers || 0) / (data?.totalInstalls || 1)) * 100}%`, borderRadius: 4 }}></div></div>}
                </div>

                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 16px 0' }}>🎧 Ακρόαση</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#fef3c7', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: '#92400e', margin: 0 }}>{listeningStats.totalSessions}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Sessions</p>
                    </div>
                    <div style={{ background: '#fce7f3', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: '#9d174d', margin: 0 }}>{listeningStats.totalMinutes > 60 ? `${Math.round(listeningStats.totalMinutes / 60)}h` : `${listeningStats.totalMinutes}m`}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Συνολικός χρόνος</p>
                    </div>
                    <div style={{ background: '#ede9fe', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: '#5b21b6', margin: 0 }}>{listeningStats.avgMinutes}m</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Μ.Ο./session</p>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#166534', margin: 0 }}>{listeningStats.androidSessions}/{listeningStats.iosSessions}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>🤖/🍎</p>
                    </div>
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', margin: '0 0 16px 0' }}>🔔 Push Notifications</h3>
                  <div style={{ background: '#fef3c7', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 12 }}>
                    <p style={{ fontSize: 28, fontWeight: 700, color: '#92400e', margin: 0 }}>{notifStats.total}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>Εγγεγραμμένοι</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#166534', margin: 0 }}>{notifStats.android}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>🤖 Android</p>
                    </div>
                    <div style={{ flex: 1, background: '#eff6ff', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#1e40af', margin: 0 }}>{notifStats.ios}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>🍎 iOS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Users Table */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 20px 0' }}>🕐 Πρόσφατοι Χρήστες</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Device ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Platform</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Πρώτο Άνοιγμα</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Τελευταίο Άνοιγμα</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Ανοίγματα</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user, i) => {
                      const lastOpen = new Date(user.last_open);
                      const isRecent = (Date.now() - lastOpen.getTime()) < 24 * 60 * 60 * 1000;
                      const isActive = (Date.now() - lastOpen.getTime()) < 14 * 24 * 60 * 60 * 1000;
                      return (
                        <tr key={user.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>{user.device_id?.substring(0, 12)}...</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>{user.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{new Date(user.first_open || user.created_at).toLocaleDateString('el-GR')}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{lastOpen.toLocaleString('el-GR')}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', textAlign: 'center', fontWeight: 600 }}>{user.total_opens || 1}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: isRecent ? '#dcfce7' : isActive ? '#fef3c7' : '#fee2e2', color: isRecent ? '#166534' : isActive ? '#92400e' : '#991b1b' }}>
                              {isRecent ? '🟢 Online' : isActive ? '🟡 Active' : '🔴 Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Location Stats */}
              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6', marginTop: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', margin: '0 0 20px 0' }}>🌍 Συσκευές ανά Χώρα</h2>
                {locationStats.length === 0 ? (
                  <p style={{ color: '#9ca3af', textAlign: 'center', padding: 20 }}>Δεν υπάρχουν δεδομένα τοποθεσίας</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {locationStats.map((loc, i) => (
                      <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                        <p style={{ fontSize: 24, fontWeight: 700, color: '#1f2937', margin: 0 }}>{loc.count}</p>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>{loc.country}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
