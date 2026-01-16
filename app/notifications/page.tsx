"use client";
import { useState } from "react";
import Link from "next/link";

export default function NotificationsPage() {
  const [form, setForm] = useState({ title: '', body: '', type: 'general' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<any[]>([
    { id: 1, title: 'Νέα Εκπομπή!', body: 'Ξεκινάει η εκπομπή "Morning Show" σε 10 λεπτά!', type: 'show', sent_at: new Date().toISOString() },
    { id: 2, title: 'Ειδική Προσφορά', body: 'Κέρδισε δώρα με την εφαρμογή REDIE 969!', type: 'promo', sent_at: new Date(Date.now() - 86400000).toISOString() },
  ]);

  const notificationTypes = [
    { id: 'general', label: 'Γενικό', icon: '📢', color: '#3b82f6' },
    { id: 'show', label: 'Εκπομπή', icon: '🎙️', color: '#e53935' },
    { id: 'promo', label: 'Προσφορά', icon: '🎁', color: '#f59e0b' },
    { id: 'news', label: 'Νέα', icon: '📰', color: '#22c55e' },
  ];

  async function sendNotification() {
    if (!form.title || !form.body) return alert('Συμπλήρωσε τίτλο και μήνυμα!');
    
    setSending(true);
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    setHistory(prev => [{ id: Date.now(), ...form, sent_at: new Date().toISOString() }, ...prev]);
    setSending(false);
    setSent(true);
    setForm({ title: '', body: '', type: 'general' });
    
    setTimeout(() => setSent(false), 3000);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  const selectedType = notificationTypes.find(t => t.id === form.type);

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

        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            
            {/* Send Notification Form */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📤</span> Αποστολή Notification
              </h2>

              {sent && (
                <div style={{ padding: 16, background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', borderRadius: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>✅</span>
                  <p style={{ margin: 0, color: '#166534', fontWeight: 600 }}>Το notification στάλθηκε επιτυχώς!</p>
                </div>
              )}

              {/* Type Selection */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Τύπος</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {notificationTypes.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setForm({...form, type: type.id})}
                      style={{
                        padding: '14px 10px',
                        background: form.type === type.id ? `${type.color}15` : '#f9fafb',
                        border: form.type === type.id ? `2px solid ${type.color}` : '2px solid transparent',
                        borderRadius: 14,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>{type.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: form.type === type.id ? type.color : '#6b7280' }}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Τίτλος</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="π.χ. Νέα Εκπομπή Τώρα!"
                  style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 14, fontSize: 15, outline: 'none', transition: 'border-color 0.2s' }}
                />
              </div>

              {/* Body */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Μήνυμα</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm({...form, body: e.target.value})}
                  placeholder="Γράψε το μήνυμα που θα λάβουν οι χρήστες..."
                  rows={4}
                  style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 14, fontSize: 15, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Preview */}
              <div style={{ background: '#1f2937', borderRadius: 20, padding: 20, marginBottom: 24 }}>
                <p style={{ color: '#9ca3af', fontSize: 11, marginBottom: 12, fontWeight: 500 }}>📱 PREVIEW</p>
                <div style={{ background: 'white', borderRadius: 14, padding: 14, display: 'flex', gap: 12 }}>
                  <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${selectedType?.color || '#3b82f6'} 0%, ${selectedType?.color || '#3b82f6'}dd 100%)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>{selectedType?.icon}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0', fontSize: 14 }}>{form.title || 'Τίτλος notification'}</p>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: 13, lineHeight: 1.4 }}>{form.body || 'Το μήνυμα θα εμφανιστεί εδώ...'}</p>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={sendNotification}
                disabled={sending}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: sending ? '#9ca3af' : 'linear-gradient(135deg, #e53935 0%, #c62828 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  boxShadow: sending ? 'none' : '0 4px 20px rgba(229, 57, 53, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                {sending ? (
                  <>
                    <div style={{ width: 20, height: 20, border: '3px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Αποστολή...
                  </>
                ) : (
                  <>🚀 Αποστολή σε Όλους</>
                )}
              </button>
            </div>

            {/* History */}
            <div style={{ background: 'white', borderRadius: 24, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>📋</span> Ιστορικό
              </h2>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span style={{ fontSize: 50 }}>📭</span>
                  <p style={{ color: '#6b7280', marginTop: 16 }}>Δεν έχουν σταλεί notifications</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {history.map(item => {
                    const type = notificationTypes.find(t => t.id === item.type);
                    return (
                      <div key={item.id} style={{ padding: 16, background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ width: 40, height: 40, background: `${type?.color || '#3b82f6'}20`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: 18 }}>{type?.icon || '📢'}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <p style={{ fontWeight: 700, color: '#1f2937', margin: 0, fontSize: 14 }}>{item.title}</p>
                              <span style={{ color: '#9ca3af', fontSize: 11 }}>{formatDate(item.sent_at)}</span>
                            </div>
                            <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>{item.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
