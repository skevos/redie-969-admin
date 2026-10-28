"use client";
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
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

const CHUNK_SIZE = 300;

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{success: boolean; message: string} | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [tokenCount, setTokenCount] = useState(0);
  const [targetLocation, setTargetLocation] = useState('all');
  const [locations, setLocations] = useState<{country: string, city: string, count: number}[]>([]);

  useEffect(() => {
    loadHistory();
    loadTokenCount();
    loadLocations();
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

  async function loadTokenCount() {
    const { count } = await supabase.from('fcm_tokens').select('*', { count: 'exact', head: true });
    setTokenCount(count || 0);
  }

  async function loadLocations() {
    const { data } = await fetchAll<{ country: string | null; city: string | null }>(() => supabase.from('fcm_tokens').select('country, city'));
    if (data) {
      const locationMap = new Map<string, number>();
      data.forEach(d => {
        if (d.country) {
          // Country option targets every token of that country, so count them all under the country key
          locationMap.set(d.country, (locationMap.get(d.country) || 0) + 1);
          if (d.city) {
            const key = `${d.country}|${d.city}`;
            locationMap.set(key, (locationMap.get(key) || 0) + 1);
          }
        }
      });
      const locs = Array.from(locationMap.entries()).map(([key, count]) => {
        const [country, city] = key.split('|');
        return { country, city: city || '', count };
      }).sort((a, b) => b.count - a.count);
      setLocations(locs);
    }
  }

  async function sendNotification() {
    if (!title.trim() || !body.trim()) {
      setResult({ success: false, message: 'Συμπλήρωσε τίτλο και μήνυμα!' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // 1. Get FCM tokens (filtered by location if needed), paged past the 1000-row cap
      const { data: tokens, error: tokensError } = await fetchAll<{ token: string }>(() => {
        let query = supabase.from('fcm_tokens').select('token');
        if (targetLocation !== 'all') {
          const [country, city] = targetLocation.split('|');
          query = query.eq('country', country);
          if (city) query = query.eq('city', city);
        }
        return query;
      });

      if (tokensError) throw tokensError;

      if (!tokens || tokens.length === 0) {
        setResult({ success: false, message: 'Δεν υπάρχουν εγγεγραμμένες συσκευές!' });
        setSending(false);
        loadHistory();
        return;
      }

      // 3. Send batch request (all tokens at once)
      const typeEmojis: Record<string, string> = {
        'general': '📢',
        'show': '🎙️',
        'offer': '🎁',
        'news': '📰',
        'chat': '💬',
      };
      const emoji = typeEmojis[type] || '📢';
      const titleWithEmoji = title.startsWith(emoji) ? title : `${emoji} ${title}`;
      
      // 2. Send in chunks of CHUNK_SIZE tokens
      const allTokens = tokens.map(t => t.token);
      let sent = 0;
      let failed = 0;
      let anyChunkOk = false;
      let lastError = '';
      const invalidTokens: string[] = [];
      for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
        const chunk = allTokens.slice(i, i + CHUNK_SIZE);
        try {
          const res = await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              tokens: chunk, 
              title: titleWithEmoji, 
              body 
            })
          });
          const isJson = (res.headers.get('content-type') || '').includes('application/json');
          const data = isJson ? await res.json() : null;
          if (res.ok && data) {
            anyChunkOk = true;
            sent += data.sent || 0;
            failed += data.failed || 0;
            if (Array.isArray(data.invalidTokens)) invalidTokens.push(...data.invalidTokens);
          } else {
            failed += chunk.length;
            lastError = (data && data.error) || 'Σφάλμα αποστολής!';
          }
        } catch (e: any) {
          failed += chunk.length;
          lastError = e?.message || 'Σφάλμα αποστολής!';
        }
      }

      // 3. Remove dead tokens (ignore errors)
      if (invalidTokens.length > 0) {
        try { await supabase.from('fcm_tokens').delete().in('token', invalidTokens); } catch (e) { console.log(e); }
        loadTokenCount();
        loadLocations();
      }

      if (anyChunkOk) {
        // 4. Save to app_notifications table only after a successful send
        await supabase.from('app_notifications').insert({
          title,
          body,
          type
        });
        setResult({
          success: true,
          message: `✅ Στάλθηκε σε ${sent} συσκευές${failed > 0 ? ` (${failed} απέτυχαν)` : ''}`
        });
      } else {
        setResult({ success: false, message: lastError || 'Σφάλμα αποστολής!' });
      }

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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <Sidebar />
      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🔔</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Push Notifications</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f3f4f6', borderRadius: 10 }}>
            <span style={{ fontSize: 16 }}>📱</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{tokenCount} συσκευές</span>
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
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 }}>📍 Περιοχή</label>
              <select
                value={targetLocation}
                onChange={e => setTargetLocation(e.target.value)}
                style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: 'white' }}
              >
                <option value="all">🌍 Όλοι ({tokenCount} συσκευές)</option>
                {locations.map((loc, i) => {
                  const val = loc.city ? loc.country + "|" + loc.city : loc.country;
                  const label = loc.city ? loc.city + ", " + loc.country : loc.country;
                  return (
                    <option key={i} value={val}>
                      {label} ({loc.count})
                    </option>
                  );
                })}              </select>
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
