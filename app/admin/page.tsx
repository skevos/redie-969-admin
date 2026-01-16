"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function SchedulePage() {
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShow, setEditingShow] = useState<any>(null);
  const [form, setForm] = useState({ title: '', producer_name: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysGreek: Record<string, string> = { Monday: 'Δευτέρα', Tuesday: 'Τρίτη', Wednesday: 'Τετάρτη', Thursday: 'Πέμπτη', Friday: 'Παρασκευή', Saturday: 'Σάββατο', Sunday: 'Κυριακή' };

  useEffect(() => { loadShows(); }, []);

  async function loadShows() {
    const { data } = await supabase.from('shows').select('*').order('day_of_week').order('start_time');
    setShows(data || []);
    setLoading(false);
  }

  async function saveShow() {
    if (editingShow) {
      await supabase.from('shows').update(form).eq('id', editingShow.id);
    } else {
      await supabase.from('shows').insert(form);
    }
    setShowModal(false);
    setEditingShow(null);
    setForm({ title: '', producer_name: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' });
    loadShows();
  }

  async function deleteShow(id: number) {
    if (confirm('Διαγραφή εκπομπής;')) {
      await supabase.from('shows').delete().eq('id', id);
      loadShows();
    }
  }

  async function toggleLive(show: any) {
    if (show.is_live) {
      await supabase.from('shows').update({ is_live: false }).eq('id', show.id);
    } else {
      await supabase.from('shows').update({ is_live: false }).neq('id', show.id);
      await supabase.from('shows').update({ is_live: true }).eq('id', show.id);
    }
    loadShows();
  }

  function openEdit(show: any) {
    setEditingShow(show);
    setForm({ title: show.title, producer_name: show.producer_name || '', day_of_week: show.day_of_week, start_time: show.start_time, end_time: show.end_time });
    setShowModal(true);
  }

  function openNew() {
    setEditingShow(null);
    setForm({ title: '', producer_name: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' });
    setShowModal(true);
  }

  const groupedShows = days.map(day => ({ day, shows: shows.filter(s => s.day_of_week === day) }));

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
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229, 57, 53, 0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6, border: '1px solid rgba(229, 57, 53, 0.2)' }}>
            <span style={{ fontSize: 18 }}>📅</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Schedule</span>
          </Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>💬</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Live Chat</span>
          </Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Notifications</span>
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
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📅</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>Πρόγραμμα Εκπομπών</span>
          </div>
          <button onClick={openNew} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)' }}>
            <span>+</span> Νέα Εκπομπή
          </button>
        </header>

        <div style={{ padding: 28 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ width: 50, height: 50, border: '4px solid #e53935', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24 }}>
              {groupedShows.map(({ day, shows: dayShows }) => (
                <div key={day} style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>
                      {daysGreek[day]?.charAt(0)}
                    </span>
                    {daysGreek[day]}
                  </h3>
                  
                  {dayShows.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>Δεν υπάρχουν εκπομπές</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {dayShows.map(show => (
                        <div key={show.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: show.is_live ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : '#f9fafb', borderRadius: 14, border: show.is_live ? '2px solid #e53935' : '1px solid #f3f4f6' }}>
                          <div style={{ width: 50, height: 50, background: show.is_live ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                            REDIE<br/>969
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0', fontSize: 15 }}>{show.title}</p>
                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{show.producer_name || 'REDIE 969'}</p>
                          </div>
                          <div style={{ textAlign: 'right', marginRight: 16 }}>
                            <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 14 }}>{show.start_time} - {show.end_time}</p>
                            {show.is_live && <span style={{ background: '#e53935', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🔴 LIVE</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => toggleLive(show)} style={{ padding: '8px 14px', background: show.is_live ? '#fef2f2' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: show.is_live ? '#e53935' : 'white', border: show.is_live ? '1px solid #fecaca' : 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              {show.is_live ? 'Stop' : 'Go Live'}
                            </button>
                            <button onClick={() => openEdit(show)} style={{ padding: '8px 14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => deleteShow(show.id)} style={{ padding: '8px 14px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: 480, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1f2937' }}>{editingShow ? 'Επεξεργασία Εκπομπής' : 'Νέα Εκπομπή'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Τίτλος</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }} placeholder="Όνομα εκπομπής" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Παραγωγός</label>
                <input type="text" value={form.producer_name} onChange={e => setForm({...form, producer_name: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }} placeholder="Όνομα παραγωγού" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ημέρα</label>
                <select value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', background: 'white' }}>
                  {days.map(d => <option key={d} value={d}>{daysGreek[d]}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Έναρξη</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Λήξη</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ακύρωση</button>
              <button onClick={saveShow} style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', color: 'white', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(229, 57, 53, 0.4)' }}>Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
