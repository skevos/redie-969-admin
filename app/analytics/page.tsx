"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

interface AnalyticsData {
  totalInstalls: number;
  activeUsers: number;
  todayUsers: number;
  weeklyUsers: number;
  monthlyUsers: number;
  inactiveUsers: number;
  avgOpensPerUser: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      // Get all devices
      const { data: devices } = await supabase
        .from('app_analytics')
        .select('*')
        .order('last_open', { ascending: false });

      if (!devices) return;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const inactiveThreshold = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      const totalInstalls = devices.length;
      
      const todayUsers = devices.filter(d => 
        new Date(d.last_open) >= today
      ).length;

      const weeklyUsers = devices.filter(d => 
        new Date(d.last_open) >= weekAgo
      ).length;

      const monthlyUsers = devices.filter(d => 
        new Date(d.last_open) >= monthAgo
      ).length;

      const inactiveUsers = devices.filter(d => 
        new Date(d.last_open) < inactiveThreshold
      ).length;

      const activeUsers = totalInstalls - inactiveUsers;

      const totalOpens = devices.reduce((sum, d) => sum + (d.total_opens || 1), 0);
      const avgOpensPerUser = totalInstalls > 0 ? Math.round(totalOpens / totalInstalls * 10) / 10 : 0;

      setData({
        totalInstalls,
        activeUsers,
        todayUsers,
        weeklyUsers,
        monthlyUsers,
        inactiveUsers,
        avgOpensPerUser
      });

      setRecentUsers(devices.slice(0, 10));
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'white', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>← Dashboard</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>📊 App Analytics</h1>
      </header>

      <main style={{ padding: 32, maxWidth: 1400, margin: '0 auto' }}>
        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
          
          {/* Total Installs */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Συνολικές Εγκαταστάσεις</p>
                <p style={{ fontSize: 36, fontWeight: 700, margin: '8px 0 0 0', color: '#1f2937' }}>{data?.totalInstalls || 0}</p>
              </div>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>📱</span>
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Ενεργοί Χρήστες</p>
                <p style={{ fontSize: 36, fontWeight: 700, margin: '8px 0 0 0', color: '#22c55e' }}>{data?.activeUsers || 0}</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0 0' }}>Τελευταίες 14 μέρες</p>
              </div>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>✅</span>
              </div>
            </div>
          </div>

          {/* Today */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Σήμερα</p>
                <p style={{ fontSize: 36, fontWeight: 700, margin: '8px 0 0 0', color: '#3b82f6' }}>{data?.todayUsers || 0}</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0 0' }}>Μοναδικοί χρήστες</p>
              </div>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>📅</span>
              </div>
            </div>
          </div>

          {/* Inactive */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Ανενεργοί</p>
                <p style={{ fontSize: 36, fontWeight: 700, margin: '8px 0 0 0', color: '#ef4444' }}>{data?.inactiveUsers || 0}</p>
                <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0 0' }}>Πάνω από 14 μέρες</p>
              </div>
              <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 28 }}>💤</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
          
          {/* Weekly */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Εβδομαδιαίοι Χρήστες</p>
            <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#8b5cf6' }}>{data?.weeklyUsers || 0}</p>
            <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>Τελευταίες 7 μέρες</p>
          </div>

          {/* Monthly */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Μηνιαίοι Χρήστες</p>
            <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#f59e0b' }}>{data?.monthlyUsers || 0}</p>
            <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>Τελευταίες 30 μέρες</p>
          </div>

          {/* Avg Opens */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, fontWeight: 500 }}>Μ.Ο. Ανοίγματα/Χρήστη</p>
            <p style={{ fontSize: 32, fontWeight: 700, margin: '8px 0 0 0', color: '#ec4899' }}>{data?.avgOpensPerUser || 0}</p>
            <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>Φορές που άνοιξαν την app</p>
          </div>
        </div>

        {/* Recent Users Table */}
        <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
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
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>
                      {user.device_id?.substring(0, 12)}...
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                      {user.platform === 'ios' ? '🍎 iOS' : '🤖 Android'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                      {new Date(user.first_open || user.created_at).toLocaleDateString('el-GR')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>
                      {lastOpen.toLocaleString('el-GR')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', textAlign: 'center', fontWeight: 600 }}>
                      {user.total_opens || 1}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isRecent ? '#dcfce7' : isActive ? '#fef3c7' : '#fee2e2',
                        color: isRecent ? '#166534' : isActive ? '#92400e' : '#991b1b'
                      }}>
                        {isRecent ? '🟢 Online' : isActive ? '🟡 Active' : '🔴 Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
