"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const NOTIFICATION_TYPES = [
  { value: 'general', label: '📢 Γενική', color: '#e53935' },
  { value: 'show', label: '🎙️ Εκπομπή', color: '#9333ea' },
  { value: 'offer', label: '🎁 Προσφορά', color: '#f97316' },
  { value: 'news', label: '📰 Νέα', color: '#3b82f6' },
];

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const { data } = await supabase
        .from('app_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setHistory(data || []);
    } catch (e) { console.log(e); }
    setLoadingHistory(false);
  }

  async function sendNotification() {
    if (!title.trim() || !body.trim()) {
      setResult({ success: false, message: 'Συμπλήρωσε τίτλο και μήνυμα!' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // 1. Save to app_notifications table
      await supabase.from('app_notifications').insert({
        title,
        body,
        type
      });

      // 2. Get all FCM tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('token');

      if (tokensError) throw tokensError;

      if (!tokens || tokens.length === 0) {
        setResult({ success: false, message: 'Δεν υπάρχουν εγγεγραμμένες συσκευές!' });
        setSending(false);
        loadHistory();
        return;
      }

      // 3. Send to all tokens
      let successCount = 0;
      let failCount = 0;

      for (const t of tokens) {
        try {
          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: t.token, title, body })
          });
          
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      setResult({
        success: true,
        message: `✅ Στάλθηκε σε ${successCount} συσκευές${failCount > 0 ? ` (${failCount} απέτυχαν)` : ''}`
      });

      setTitle('');
      setBody('');
      loadHistory();
    } catch (error: any) {
      setResult({ success: false, message: error.message || 'Σφάλμα αποστολής!' });
    }

    setSending(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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
          <Link href="/producers" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🎤</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Παραγωγοί</span>
          </Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Live Chat</span>
          </Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229, 57, 53, 0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6, border: '1px solid rgba(229, 57, 53, 0.2)' }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Notifications</span>
          </Link>
          <Link href="/content" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>App Content</span>
          </Link>
          <Link href="/splash" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🚀</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Splash Screen</span>
          </Link>
        </nav>

        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 240 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🔔</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Push Notifications</span>
          </div>
        </header>

        <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
          
          {/* Send Form */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 700, color: '#1f2937' }}>📤 Νέα Ειδοποίηση</h2>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Τύπος</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {NOTIFICATION_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    style={{
                      padding: '10px 16px',
                      background: type === t.value ? t.color : '#f3f4f6',
                      color: type === t.value ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Τίτλος</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="π.χ. 🎉 Νέα Εκπομπή!"
                style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Μήνυμα</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Γράψε το μήνυμά σου..."
                rows={4}
                style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {result && (
              <div style={{
                padding: '12px 16px',
                background: result.success ? '#dcfce7' : '#fee2e2',
                color: result.success ? '#166534' : '#dc2626',
                borderRadius: 10,
                marginBottom: 20,
                fontSize: 14,
                fontWeight: 500
              }}>
                {result.message}
              </div>
            )}

            <button
              onClick={sendNotification}
              disabled={sending}
              style={{
                width: '100%',
                padding: '14px',
                background: sending ? '#9ca3af' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
                boxShadow: sending ? 'none' : '0 4px 15px rgba(229, 57, 53, 0.3)',
              }}
            >
              {sending ? '⏳ Αποστολή...' : '🚀 Αποστολή σε Όλους'}
            </button>
          </div>

          {/* History */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1f2937' }}>📋 Ιστορικό</h2>
              {history.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm('Διαγραφή όλων των ειδοποιήσεων;')) {
                      await supabase.from('app_notifications').delete().neq('id', 0);
                      loadHistory();
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  🗑️ Καθαρισμός
                </button>
              )}
            </div>
            
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#e53935', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
              </div>
            ) : history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <span style={{ fontSize: 48 }}>📭</span>
                <p style={{ marginTop: 12 }}>Δεν υπάρχουν ειδοποιήσεις</p>
              </div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {history.map((item, i) => {
                  const typeConfig = NOTIFICATION_TYPES.find(t => t.value === item.type) || { color: '#e53935', label: '📢' };
                  const emoji = item.type === 'chat' ? '💬' : typeConfig.label.split(' ')[0];
                  const color = item.type === 'chat' ? '#22c55e' : typeConfig.color;
                  
                  return (
                    <div key={i} style={{
                      padding: '14px 16px',
                      background: '#f9fafb',
                      borderRadius: 12,
                      marginBottom: 10,
                      borderLeft: `4px solid ${color}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{emoji} {item.title}</span>
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatTime(item.created_at)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{item.body}</p>
                      </div>
                      <button
                        onClick={async () => {
                          await supabase.from('app_notifications').delete().eq('id', item.id);
                          loadHistory();
                        }}
                        style={{
                          marginLeft: 12,
                          padding: '4px 8px',
                          background: 'transparent',
                          color: '#9ca3af',
                          border: 'none',
                          fontSize: 16,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
