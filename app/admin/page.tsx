"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";

export default function SchedulePage() {
  const [shows, setShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShow, setEditingShow] = useState<any>(null);
  const [form, setForm] = useState({ title: '', producer_name: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', sponsor_name: '', sponsor_active: false, sponsor_url: '', sponsor_url_active: false });
  const [reminderCounts, setReminderCounts] = useState<Record<string, number>>({});

  const daysGreek = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];

  useEffect(() => { loadShows(); loadReminderCounts(); }, []);

  async function loadShows() {
    const { data } = await supabase.from('shows').select('*').order('day_of_week').order('start_time');
    setShows(data || []);
    setLoading(false);
  }

  async function loadReminderCounts() {
    const { data } = await supabase.from('show_reminders').select('show_id');
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
        const key = String(item.show_id);
        counts[key] = (counts[key] || 0) + 1;
      });
      setReminderCounts(counts);
    }
  }

  async function saveShow() {
    const { error } = editingShow
      ? await supabase.from('shows').update(form).eq('id', editingShow.id)
      : await supabase.from('shows').insert(form);
    if (error) { alert(error.message); return; }
    setShowModal(false);
    setEditingShow(null);
    setForm({ title: '', producer_name: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', sponsor_name: '', sponsor_active: false, sponsor_url: '', sponsor_url_active: false });
    loadShows();
  }

  async function deleteShow(id: number) {
    if (confirm('Διαγραφή εκπομπής;')) {
      const { error } = await supabase.from('shows').delete().eq('id', id);
      if (error) alert(error.message);
      loadShows();
    }
  }

  async function toggleLive(show: any) {
    if (show.is_live) {
      const { error } = await supabase.from('shows').update({ is_live: false }).eq('id', show.id);
      if (error) alert(error.message);
    } else {
      await supabase.from('shows').update({ is_live: false }).neq('id', show.id);
      const { error } = await supabase.from('shows').update({ is_live: true }).eq('id', show.id);
      if (error) alert(error.message);
    }
    loadShows();
  }

  function openEdit(show: any) {
    setEditingShow(show);
    setForm({ title: show.title, producer_name: show.producer_name || '', day_of_week: show.day_of_week, start_time: show.start_time?.slice(0,5) || '09:00', end_time: show.end_time?.slice(0,5) || '10:00', sponsor_name: show.sponsor_name || '', sponsor_active: show.sponsor_active || false, sponsor_url: show.sponsor_url || '', sponsor_url_active: show.sponsor_url_active || false });
    setShowModal(true);
  }

  function openNew() {
    setEditingShow(null);
    setForm({ title: '', producer_name: '', day_of_week: 0, start_time: '09:00', end_time: '10:00', sponsor_name: '', sponsor_active: false, sponsor_url: '', sponsor_url_active: false });
    setShowModal(true);
  }

  const groupedShows = daysGreek.map((dayName, index) => ({ dayIndex: index, dayName, shows: shows.filter(s => s.day_of_week === index) }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* SIDEBAR */}
      <Sidebar />
      {/* MAIN */}
      <main style={{ flex: 1, marginLeft: 260 }}>
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
              {groupedShows.map(({ dayIndex, dayName, shows: dayShows }) => (
                <div key={dayIndex} style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>
                      {dayName.charAt(0)}
                    </span>
                    {dayName}
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
                            {show.sponsor_active && show.sponsor_name && (
                              <p style={{ color: '#f59e0b', fontSize: 11, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>💰</span> Χορηγός: {show.sponsor_name}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', marginRight: 8 }}>
                            <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 14 }}>{show.start_time?.slice(0,5)} - {show.end_time?.slice(0,5)}</p>
                            {show.is_live && <span style={{ background: '#e53935', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🔴 LIVE</span>}
                          </div>
                          {(reminderCounts[String(show.id)] || 0) > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg, #fefce8 0%, #fef08a 100%)', padding: '6px 12px', borderRadius: 20, border: '1px solid #fde047' }}>
                              <span style={{ fontSize: 14 }}>⏰</span>
                              <span style={{ color: '#a16207', fontSize: 14, fontWeight: 700 }}>{reminderCounts[String(show.id)]}</span>
                            </div>
                          )}
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
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: 480, maxWidth: '90%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: '#1f2937' }}>{editingShow ? 'Επεξεργασία Εκπομπής' : 'Νέα Εκπομπή'}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Τίτλος</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="Όνομα εκπομπής" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Παραγωγός</label>
                <input type="text" value={form.producer_name} onChange={e => setForm({...form, producer_name: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="Όνομα παραγωγού" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Ημέρα</label>
                <select value={form.day_of_week} onChange={e => setForm({...form, day_of_week: parseInt(e.target.value)})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', background: 'white', boxSizing: 'border-box' }}>
                  {daysGreek.map((day, index) => <option key={index} value={index}>{day}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Έναρξη</label>
                  <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Λήξη</label>
                  <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* SPONSOR SECTION */}
              <div style={{ borderTop: '2px solid #f59e0b', paddingTop: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💰</span> Χορηγία Εκπομπής
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>Εμφανίζεται στην app κάτω από τον παραγωγό</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, sponsor_active: !form.sponsor_active})} 
                    style={{ width: 52, height: 28, borderRadius: 14, background: form.sponsor_active ? '#22c55e' : '#4b5563', border: 'none', cursor: 'pointer', position: 'relative' }}
                  >
                    <div style={{ width: 22, height: 22, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: form.sponsor_active ? 27 : 3, transition: 'all 0.2s' }} />
                  </button>
                </div>
                <input 
                  type="text" 
                  value={form.sponsor_name} 
                  onChange={e => setForm({...form, sponsor_name: e.target.value})} 
                  style={{ width: '100%', padding: '12px 16px', border: '2px solid #f59e0b', borderRadius: 12, fontSize: 14, outline: 'none', background: form.sponsor_active ? '#fffbeb' : '#f9fafb', boxSizing: 'border-box' }} 
                  placeholder="Όνομα χορηγού π.χ. Καφετέρια Ο Νίκος" 
                  disabled={!form.sponsor_active}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: '10px 14px', background: form.sponsor_url_active ? 'rgba(59,130,246,0.1)' : '#f9fafb', borderRadius: 10 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, fontSize: 13 }}>🔗 Link χορηγού</p>
                    <p style={{ color: '#6b7280', fontSize: 11, margin: 0 }}>{form.sponsor_url_active ? '✅ Clickable' : 'Απενεργοποιημένο'}</p>
                  </div>
                  <button type="button" onClick={() => setForm({...form, sponsor_url_active: !form.sponsor_url_active})} style={{ width: 44, height: 24, borderRadius: 12, background: form.sponsor_url_active ? '#3b82f6' : '#9ca3af', border: 'none', cursor: 'pointer', position: 'relative' }} disabled={!form.sponsor_active}>
                    <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: form.sponsor_url_active ? 23 : 3, transition: 'all 0.2s' }} />
                  </button>
                </div>
                <input 
                  type="text" 
                  value={form.sponsor_url} 
                  onChange={e => setForm({...form, sponsor_url: e.target.value})} 
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #3b82f6', borderRadius: 10, fontSize: 13, outline: 'none', background: form.sponsor_url_active ? '#eff6ff' : '#f9fafb', marginTop: 8, boxSizing: 'border-box' }} 
                  placeholder="https://example.com" 
                  disabled={!form.sponsor_active || !form.sponsor_url_active}
                />
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

