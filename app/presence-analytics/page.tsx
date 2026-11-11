"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar from "../components/Sidebar";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PresenceAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      loadStats();
      setLastUpdate(new Date());
    }, 10000); // Refresh κάθε 10 δευτερόλεπτα
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await fetch('/api/admin/rpc?name=get_presence_dashboard_stats', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ data: null, error: { message: 'network' } }));
      if (!error && data) {
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 260, padding: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#64748b", fontSize: 18 }}>Φόρτωση...</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: "white", margin: 0 }}>📊 Presence Analytics</h1>
              <p style={{ color: "#64748b", margin: "4px 0 0" }}>Real-time listener tracking</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", animation: "pulse 2s infinite" }}></div>
                <span style={{ color: "#22c55e", fontSize: 14 }}>LIVE</span>
              </div>
              <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>Updated: {formatTime(lastUpdate)}</p>
            </div>
          </div>

          {/* Live Now - Big Card */}
          <div style={{ 
            background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)", 
            borderRadius: 20, 
            padding: 32, 
            marginBottom: 24,
            border: "1px solid #1e40af"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>🎧 ΑΚΟΥΝΕ ΤΩΡΑ</p>
                <p style={{ color: "white", fontSize: 72, fontWeight: 700, margin: "8px 0 0" }}>{stats?.live_now || 0}</p>
              </div>
              <div style={{ fontSize: 100, opacity: 0.2 }}>📻</div>
            </div>
          </div>

          {/* Today Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon="📱" label="Sessions" value={stats?.today?.sessions || 0} color="#3b82f6" />
            <StatCard icon="👥" label="Μοναδικοί" value={stats?.today?.unique_listeners || 0} color="#8b5cf6" />
            <StatCard icon="⏱️" label="Ώρες" value={stats?.today?.listen_hours || 0} color="#22c55e" />
            <StatCard icon="🆕" label="Νέοι" value={stats?.today?.new_users || 0} color="#f59e0b" />
            <StatCard icon="💬" label="Μηνύματα" value={stats?.today?.chat_messages || 0} color="#ec4899" />
          </div>

          {/* Two Column Layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            
            {/* Listener Breakdown */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 16, margin: "0 0 20px 0" }}>👥 Listener Types</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ListenerBar label="🔥 Power Users" count={stats?.listener_breakdown?.power_users || 0} color="#ef4444" total={getTotalListeners(stats)} />
                <ListenerBar label="🎧 Regular" count={stats?.listener_breakdown?.regular || 0} color="#f59e0b" total={getTotalListeners(stats)} />
                <ListenerBar label="👂 Casual" count={stats?.listener_breakdown?.casual || 0} color="#3b82f6" total={getTotalListeners(stats)} />
                <ListenerBar label="🐣 New Users" count={stats?.listener_breakdown?.new_users || 0} color="#22c55e" total={getTotalListeners(stats)} />
                <ListenerBar label="😴 Dormant" count={stats?.listener_breakdown?.dormant || 0} color="#64748b" total={getTotalListeners(stats)} />
              </div>
            </div>

            {/* Peak Hours */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 16, margin: "0 0 20px 0" }}>🕐 Peak Hours Today</h3>
              {stats?.peak_hours && stats.peak_hours.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {stats.peak_hours.map((h: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "#64748b", width: 50 }}>{h.hour}:00</span>
                      <div style={{ flex: 1, background: "#0f172a", borderRadius: 8, height: 24, overflow: "hidden" }}>
                        <div style={{ 
                          width: `${Math.min(100, (h.listeners_count / (stats.peak_hours[0]?.listeners_count || 1)) * 100)}%`,
                          height: "100%",
                          background: i === 0 ? "#22c55e" : "#3b82f6",
                          borderRadius: 8,
                          transition: "width 0.5s"
                        }}></div>
                      </div>
                      <span style={{ color: "white", width: 60, textAlign: "right" }}>{h.listeners_count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#64748b", textAlign: "center", padding: 20 }}>Δεν υπάρχουν δεδομένα</p>
              )}
            </div>
          </div>

          {/* Install & Notification Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            
            {/* Installs */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 16, margin: "0 0 20px 0" }}>📲 Εγκαταστάσεις</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                <MiniStat label="Συνολικά" value={stats?.installs?.total_installs || 0} color="#22c55e" />
                <MiniStat label="Σήμερα" value={stats?.installs?.today_installs || 0} color="#3b82f6" />
                <MiniStat label="Ενεργά" value={stats?.installs?.active_installs || 0} color="#8b5cf6" />
                <MiniStat label="Διαγραφές" value={stats?.installs?.total_uninstalls || 0} color="#ef4444" />
                <MiniStat label="Σήμερα ❌" value={stats?.installs?.today_uninstalls || 0} color="#f59e0b" />
                <MiniStat label="Επανεγκ." value={stats?.installs?.reinstalls || 0} color="#06b6d4" />
              </div>
            </div>

            {/* Notifications */}
            <div style={{ background: "#1e293b", borderRadius: 16, padding: 24 }}>
              <h3 style={{ color: "white", fontSize: 16, margin: "0 0 20px 0" }}>🔔 Ειδοποιήσεις</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
                <div style={{ background: "#0f172a", borderRadius: 12, padding: 16 }}>
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>Ενεργοποιημένες</p>
                  <p style={{ color: "#22c55e", fontSize: 28, fontWeight: 700, margin: "4px 0 0" }}>
                    {stats?.notifications?.granted || 0}
                    <span style={{ fontSize: 14, color: "#64748b", marginLeft: 8 }}>
                      ({stats?.notifications?.granted_percentage || 0}%)
                    </span>
                  </p>
                </div>
                <div style={{ background: "#0f172a", borderRadius: 12, padding: 16 }}>
                  <p style={{ color: "#64748b", fontSize: 12, margin: 0 }}>Μπλοκαρισμένες</p>
                  <p style={{ color: "#ef4444", fontSize: 28, fontWeight: 700, margin: "4px 0 0" }}>
                    {stats?.notifications?.denied || 0}
                    <span style={{ fontSize: 14, color: "#64748b", marginLeft: 8 }}>
                      ({stats?.notifications?.denied_percentage || 0}%)
                    </span>
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>Μπλόκ τελευταίες 7 μέρες</p>
                  <p style={{ color: "#f59e0b", fontSize: 18, fontWeight: 600, margin: "4px 0 0" }}>{stats?.notifications?.blocked_last_7_days || 0}</p>
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>Ενεργ. τελευταίες 7 μέρες</p>
                  <p style={{ color: "#22c55e", fontSize: 18, fontWeight: 600, margin: "4px 0 0" }}>{stats?.notifications?.enabled_last_7_days || 0}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function getTotalListeners(stats: any) {
  if (!stats?.listener_breakdown) return 1;
  const b = stats.listener_breakdown;
  return (b.power_users || 0) + (b.regular || 0) + (b.casual || 0) + (b.new_users || 0) + (b.dormant || 0) || 1;
}

function StatCard({ icon, label, value, color }: { icon: string, label: string, value: number, color: string }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 16, padding: 20 }}>
      <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>{icon} {label}</p>
      <p style={{ color: color, fontSize: 32, fontWeight: 700, margin: "8px 0 0" }}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#64748b", fontSize: 11, margin: 0 }}>{label}</p>
      <p style={{ color: color, fontSize: 22, fontWeight: 700, margin: "4px 0 0" }}>{value}</p>
    </div>
  );
}

function ListenerBar({ label, count, color, total }: { label: string, count: number, color: string, total: number }) {
  const percentage = Math.round((count / total) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#94a3b8", fontSize: 13 }}>{label}</span>
        <span style={{ color: "white", fontSize: 13 }}>{count} ({percentage}%)</span>
      </div>
      <div style={{ background: "#0f172a", borderRadius: 6, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${percentage}%`, height: "100%", background: color, borderRadius: 6 }}></div>
      </div>
    </div>
  );
}
