"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function ArchivesPage() {
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArchive, setSelectedArchive] = useState<any>(null);

  useEffect(() => { loadArchives(); }, []);

  async function loadArchives() {
    const { data } = await supabase.from('chat_archives').select('*').order('archived_at', { ascending: false });
    setArchives(data || []);
    setLoading(false);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📁</span>
            <div>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Chat Archives</span>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Ιστορικό συνομιλιών</p>
            </div>
          </div>
        </header>

        <div style={{ padding: 28, display: 'flex', gap: 24 }}>
          {/* Archives List */}
          <div style={{ width: 350 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>ΑΡΧΕΙΑ ({archives.length})</h3>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Φόρτωση...</div>
            ) : archives.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Δεν υπάρχουν archives</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {archives.map(archive => (
                  <div 
                    key={archive.id} 
                    onClick={() => setSelectedArchive(archive)}
                    style={{ 
                      background: selectedArchive?.id === archive.id ? '#e53935' : 'white', 
                      color: selectedArchive?.id === archive.id ? 'white' : '#1f2937',
                      borderRadius: 12, 
                      padding: 16, 
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{archive.show_name || 'Chat Session'}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDate(archive.archived_at)}</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>💬 {archive.total_messages} μηνύματα</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Messages View */}
          <div style={{ flex: 1, background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {selectedArchive ? (
              <>
                <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedArchive.show_name || 'Chat Session'}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{formatDate(selectedArchive.archived_at)} • {selectedArchive.total_messages} μηνύματα</p>
                </div>
                <div style={{ padding: 20, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {selectedArchive.messages.map((msg: any, i: number) => (
                    <div key={i} style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                      {msg.producer_photo ? (
                        <img src={msg.producer_photo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: msg.chat_color || '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: 'white', fontSize: 14 }}>{msg.role_snapshot === 'producer' ? '🎧' : '👤'}</span>
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: msg.chat_color || '#1f2937' }}>{msg.nickname_snapshot}</span>
                          {msg.show_name && <span style={{ background: msg.chat_color || '#e53935', color: 'white', padding: '2px 6px', borderRadius: 6, fontSize: 10 }}>{msg.show_name}</span>}
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(msg.created_at).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p style={{ margin: 0, color: '#374151', fontSize: 14 }}>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#9ca3af' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 48 }}>📁</span>
                  <p style={{ marginTop: 12 }}>Επέλεξε ένα archive για να δεις τα μηνύματα</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
