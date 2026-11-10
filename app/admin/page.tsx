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
  // Multiple sponsors per show (table show_sponsors). The old single sponsor_* fields on shows
  // are kept in sync so older app versions still show the names.
  const [sponsors, setSponsors] = useState<{ name: string; url: string; url_active: boolean; active: boolean }[]>([]);
  // Show photo (shows.image_url). Uploaded to the existing "producers" storage bucket under shows/.
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

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
    const list = sponsors.map(sp => ({ ...sp, name: sp.name.trim(), url: sp.url.trim() })).filter(sp => sp.name);
    const activeList = list.filter(sp => sp.active);
    const single = activeList.length === 1 && activeList[0].url_active && activeList[0].url ? activeList[0] : null;
    const payload = {
      ...form,
      sponsor_name: activeList.map(sp => sp.name).join(' • '),
      sponsor_active: activeList.length > 0,
      sponsor_url: single ? single.url : '',
      sponsor_url_active: !!single,
    } as any;
    // Only send image_url when the column exists (it comes back in select('*')) or a photo was chosen,
    // so saving keeps working even before the SQL for the new column has been run.
    if (imageUrl || (editingShow && 'image_url' in editingShow)) payload.image_url = imageUrl || null;
    const res = editingShow
      ? await supabase.from('shows').update(payload).eq('id', editingShow.id).select('id').single()
      : await supabase.from('shows').insert(payload).select('id').single();
    if (res.error) { alert(res.error.message); return; }
    const showId = res.data?.id;
    if (showId) {
      const del = await supabase.from('show_sponsors').delete().eq('show_id', showId);
      if (del.error) {
        alert('Η εκπομπή αποθηκεύτηκε, αλλά οι χορηγοί όχι: ' + del.error.message);
      } else if (list.length > 0) {
        const ins = await supabase.from('show_sponsors').insert(list.map((sp, idx) => ({
          show_id: showId, name: sp.name, url: sp.url || null, url_active: sp.url_active && !!sp.url, active: sp.active, sort: idx,
        })));
        if (ins.error) alert('Η εκπομπή αποθηκεύτηκε, αλλά οι χορηγοί όχι: ' + ins.error.message);
      }
    }
    setShowModal(false);
    setEditingShow(null);
    setSponsors([]);
    setImageUrl('');
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

  async function uploadShowImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    // Shrink before upload: max 800px JPEG (a 2 MB phone photo becomes ~80 KB), cached by phones for a year
    let body: Blob = file;
    let ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob && blob.size < file.size) { body = blob; ext = 'jpg'; }
    } catch { /* unsupported format: upload as is */ }
    const fileName = `shows/show_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('producers').upload(fileName, body, { cacheControl: '31536000', contentType: ext === 'jpg' ? 'image/jpeg' : (file.type || undefined) });
    if (error) {
      alert('Σφάλμα upload: ' + error.message);
    } else {
      const { data } = supabase.storage.from('producers').getPublicUrl(fileName);
      setImageUrl(data.publicUrl);
    }
    setUploadingImage(false);
    e.target.value = '';
  }

  async function openEdit(show: any) {
    setEditingShow(show);
    setSponsors([]);
    setImageUrl(show.image_url || '');
    const { data: rows, error } = await supabase.from('show_sponsors').select('name, url, url_active, active, sort').eq('show_id', show.id).order('sort');
    if (!error && rows && rows.length > 0) {
      setSponsors(rows.map((r: any) => ({ name: r.name || '', url: r.url || '', url_active: !!r.url_active, active: r.active !== false })));
    } else if (show.sponsor_name) {
      setSponsors([{ name: show.sponsor_name, url: show.sponsor_url || '', url_active: !!show.sponsor_url_active, active: !!show.sponsor_active }]);
    }
    setForm({ title: show.title, producer_name: show.producer_name || '', day_of_week: show.day_of_week, start_time: show.start_time?.slice(0,5) || '09:00', end_time: show.end_time?.slice(0,5) || '10:00', sponsor_name: show.sponsor_name || '', sponsor_active: show.sponsor_active || false, sponsor_url: show.sponsor_url || '', sponsor_url_active: show.sponsor_url_active || false });
    setShowModal(true);
  }

  function openNew() {
    setEditingShow(null);
    setSponsors([]);
    setImageUrl('');
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
                          {show.image_url ? (
                            <img src={show.image_url} alt="" style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: show.is_live ? '2px solid #e53935' : 'none' }} />
                          ) : (
                          <div style={{ width: 50, height: 50, background: show.is_live ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>
                            REDIE<br/>969
                          </div>
                          )}
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 700, color: '#1f2937', margin: '0 0 4px 0', fontSize: 15 }}>{show.title}</p>
                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>{show.producer_name || 'REDIE 969'}</p>
                            {show.sponsor_active && show.sponsor_name && (
                              <p style={{ color: '#f59e0b', fontSize: 11, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>💰</span> Χορηγοί: {show.sponsor_name}
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
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Φωτογραφία εκπομπής</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="" style={{ width: 84, height: 84, borderRadius: 14, objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                  ) : (
                    <div style={{ width: 84, height: 84, borderRadius: 14, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 28 }}>🖼️</div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ padding: '8px 14px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: uploadingImage ? 'wait' : 'pointer', textAlign: 'center' }}>
                      {uploadingImage ? 'Ανέβασμα...' : (imageUrl ? '📷 Αλλαγή' : '📷 Προσθήκη')}
                      <input type="file" accept="image/*" onChange={uploadShowImage} style={{ display: 'none' }} disabled={uploadingImage} />
                    </label>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl('')} style={{ padding: '6px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 10, fontSize: 12, cursor: 'pointer' }}>✕ Αφαίρεση</button>
                    )}
                  </div>
                </div>
                <p style={{ color: '#6b7280', fontSize: 12, margin: '6px 0 0 0' }}>Τετράγωνη εικόνα δείχνει καλύτερα. Εμφανίζεται στο Πρόγραμμα της εφαρμογής.</p>
              </div>
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

              {/* SPONSORS SECTION */}
              <div style={{ borderTop: '2px solid #f59e0b', paddingTop: 16, marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600, color: '#1f2937', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💰</span> Χορηγοί Εκπομπής
                    </p>
                    <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>Εμφανίζονται στην app κάτω από τον παραγωγό, με τη σειρά που είναι εδώ</p>
                  </div>
                  <button type="button" onClick={() => setSponsors([...sponsors, { name: '', url: '', url_active: false, active: true }])} style={{ padding: '8px 14px', background: '#fffbeb', color: '#b45309', border: '1px solid #f59e0b', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Χορηγός</button>
                </div>
                {sponsors.length === 0 && (
                  <p style={{ color: '#9ca3af', fontSize: 13, margin: '4px 0 0 0' }}>Καμία χορηγία. Πάτα «+ Χορηγός» για να προσθέσεις.</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sponsors.map((sp, idx) => {
                    const update = (patch: any) => setSponsors(sponsors.map((x, k) => k === idx ? { ...x, ...patch } : x));
                    const move = (dir: number) => {
                      const k = idx + dir; if (k < 0 || k >= sponsors.length) return;
                      const next = [...sponsors]; [next[idx], next[k]] = [next[k], next[idx]]; setSponsors(next);
                    };
                    return (
                      <div key={idx} style={{ border: '1px solid #fde68a', background: sp.active ? '#fffbeb' : '#f9fafb', borderRadius: 12, padding: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                          <input type="text" value={sp.name} onChange={e => update({ name: e.target.value })} style={{ flex: 1, padding: '10px 12px', border: '2px solid #f59e0b', borderRadius: 10, fontSize: 14, outline: 'none', background: 'white', boxSizing: 'border-box' }} placeholder="Όνομα χορηγού π.χ. Καφετέρια Ο Νίκος" />
                          <button type="button" title="Ενεργός" onClick={() => update({ active: !sp.active })} style={{ width: 44, height: 24, borderRadius: 12, background: sp.active ? '#22c55e' : '#9ca3af', border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: sp.active ? 23 : 3, transition: 'all 0.2s' }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="text" value={sp.url} onChange={e => update({ url: e.target.value, url_active: e.target.value.trim() ? (sp.url_active || !sp.url) : false })} style={{ flex: 1, padding: '8px 12px', border: '2px solid #3b82f6', borderRadius: 10, fontSize: 13, outline: 'none', background: sp.url_active ? '#eff6ff' : 'white', boxSizing: 'border-box' }} placeholder="Link (προαιρετικό) https://..." />
                          <button type="button" title="Link clickable" onClick={() => update({ url_active: !sp.url_active })} disabled={!sp.url.trim()} style={{ padding: '6px 10px', background: sp.url_active ? '#3b82f6' : '#e5e7eb', color: sp.url_active ? 'white' : '#6b7280', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>🔗</button>
                          <button type="button" title="Πάνω" onClick={() => move(-1)} style={{ padding: '6px 8px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>↑</button>
                          <button type="button" title="Κάτω" onClick={() => move(1)} style={{ padding: '6px 8px', background: '#f3f4f6', border: 'none', borderRadius: 8, cursor: 'pointer' }}>↓</button>
                          <button type="button" title="Αφαίρεση" onClick={() => setSponsors(sponsors.filter((_, k) => k !== idx))} style={{ padding: '6px 8px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
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

