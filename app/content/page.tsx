"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function ContentPage() {
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [nowPlaying, setNowPlaying] = useState('REDIE 969 Live');
  const [announcement, setAnnouncement] = useState('');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementUrl, setAnnouncementUrl] = useState('');
  const [announcementUrlActive, setAnnouncementUrlActive] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    youtube_url: ''
  });

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) {
        setNowPlaying(data.now_playing || 'REDIE 969 Live');
        setAnnouncement(data.announcement || '');
        setAnnouncementActive(data.announcement_active || false);
        setAnnouncementUrl(data.announcement_url || '');
        setAnnouncementUrlActive(data.announcement_url_active || false);
        setSocialLinks({
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || ''
        });
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  async function saveNowPlaying() {
    setSaving('nowplaying');
    try {
      await supabase.from('settings').update({ now_playing: nowPlaying, updated_at: new Date().toISOString() }).eq('id', 1);
    } catch (e) { console.log(e); }
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveAnnouncement() {
    setSaving('announcement');
    try {
      await supabase.from('settings').update({ 
        announcement, 
        announcement_active: announcementActive,
        announcement_url: announcementUrl,
        announcement_url_active: announcementUrlActive,
        updated_at: new Date().toISOString() 
      }).eq('id', 1);
    } catch (e) { console.log(e); }
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveSocialLinks() {
    setSaving('social');
    try {
      await supabase.from('settings').update({ ...socialLinks, updated_at: new Date().toISOString() }).eq('id', 1);
    } catch (e) { console.log(e); }
    setTimeout(() => setSaving(''), 1500);
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width: 52, height: 28, borderRadius: 14, background: checked ? '#22c55e' : '#4b5563', border: 'none', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: 22, height: 22, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: checked ? 27 : 3, transition: 'all 0.2s' }} />
    </button>
  );

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5', alignItems: 'center', justifyContent: 'center' }}><p>Φόρτωση...</p></div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <aside style={{ width: 240, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #e53935, #c62828)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span></div>
            <div><span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE</span><span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>🏠</span><span style={{ fontSize: 14 }}>Dashboard</span></Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>📅</span><span style={{ fontSize: 14 }}>Schedule</span></Link>
          <Link href="/producers" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>🎤</span><span style={{ fontSize: 14 }}>Παραγωγοί</span></Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>💬</span><span style={{ fontSize: 14 }}>Live Chat</span></Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>🔔</span><span style={{ fontSize: 14 }}>Notifications</span></Link>
          <Link href="/content" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229,57,53,0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>📱</span><span style={{ fontSize: 14, fontWeight: 600 }}>App Content</span></Link>
          <Link href="/splash" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span>🚀</span><span style={{ fontSize: 14 }}>Splash Screen</span></Link>
        </nav>
        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}><p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p></div>
      </aside>

      <main style={{ flex: 1, marginLeft: 240 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 28 }}>📱</span><div><span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>App Content</span><p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Οι αλλαγές εμφανίζονται αμέσως στην εφαρμογή!</p></div></div>
        </header>

        <div style={{ padding: 28, maxWidth: 900 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 20, padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>🎵 Now Playing <span style={{ background: '#22c55e', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 20 }}>LIVE</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>Εμφανίζεται στους ακροατές κάτω από το logo</p>
            <input type="text" value={nowPlaying} onChange={e => setNowPlaying(e.target.value)} style={{ width: '100%', padding: '14px 18px', border: '2px solid rgba(229,57,53,0.3)', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: 16, boxSizing: 'border-box' }} />
            <button onClick={saveNowPlaying} style={{ padding: '12px 24px', background: saving === 'nowplaying' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'nowplaying' ? '✓ Saved!' : '🎵 Update Now Playing'}</button>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 24, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>📢 Ανακοίνωση</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Banner στην αρχική οθόνη</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: announcementActive ? 'rgba(34,197,94,0.1)' : '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
              <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>Ενεργή</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{announcementActive ? '✅ Εμφανίζεται' : 'Απενεργοποιημένη'}</p></div>
              <Toggle checked={announcementActive} onChange={() => setAnnouncementActive(!announcementActive)} />
            </div>
            <textarea value={announcement} onChange={e => setAnnouncement(e.target.value)} rows={3} placeholder="π.χ. 🎉 Νέα εκπομπή κάθε Παρασκευή!" style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', resize: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
            
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: announcementUrlActive ? 'rgba(59,130,246,0.1)' : '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
                <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>🔗 Σύνδεσμος</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{announcementUrlActive ? '✅ Πατώντας ανοίγει ο σύνδεσμος' : 'Απενεργοποιημένος'}</p></div>
                <Toggle checked={announcementUrlActive} onChange={() => setAnnouncementUrlActive(!announcementUrlActive)} />
              </div>
              <input type="text" value={announcementUrl} onChange={e => setAnnouncementUrl(e.target.value)} placeholder="https://instagram.com/redie969 ή οποιοδήποτε URL" style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', marginBottom: 16, boxSizing: 'border-box' }} />
            </div>
            
            <button onClick={saveAnnouncement} style={{ padding: '12px 24px', background: saving === 'announcement' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'announcement' ? '✓ Saved!' : '💾 Save'}</button>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 20 }}>🔗 Social Links</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>📘 Facebook</label><input type="text" value={socialLinks.facebook_url} onChange={e => setSocialLinks({...socialLinks, facebook_url: e.target.value})} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>📸 Instagram</label><input type="text" value={socialLinks.instagram_url} onChange={e => setSocialLinks({...socialLinks, instagram_url: e.target.value})} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🎵 TikTok</label><input type="text" value={socialLinks.tiktok_url} onChange={e => setSocialLinks({...socialLinks, tiktok_url: e.target.value})} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} /></div>
              <div><label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>▶️ YouTube</label><input type="text" value={socialLinks.youtube_url} onChange={e => setSocialLinks({...socialLinks, youtube_url: e.target.value})} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} /></div>
            </div>
            <button onClick={saveSocialLinks} style={{ padding: '12px 24px', background: saving === 'social' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'social' ? '✓ Saved!' : '💾 Save'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}
