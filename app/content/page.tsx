"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Sidebar from "../components/Sidebar";

export default function ContentPage() {
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [nowPlaying, setNowPlaying] = useState('REDIE 969 Live');
  const [announcement, setAnnouncement] = useState('');
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [announcementUrl, setAnnouncementUrl] = useState('');
  const [announcementUrlActive, setAnnouncementUrlActive] = useState(false);
  const [showListenerCount, setShowListenerCount] = useState(false);
  const [listenerCountBase, setListenerCountBase] = useState(0);
  const [chatSponsorMessage, setChatSponsorMessage] = useState('');
  const [chatSponsorName, setChatSponsorName] = useState('');
  const [chatSponsorActive, setChatSponsorActive] = useState(false);
  const [chatSponsorUrl, setChatSponsorUrl] = useState('');
  const [chatSponsorUrlActive, setChatSponsorUrlActive] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    youtube_url: ''
  });
  const [shareMessage, setShareMessage] = useState('Άκου REDIE 969 Web Radio! 🎶📻');
  const [androidStoreUrl, setAndroidStoreUrl] = useState('https://play.google.com/store/apps/details?id=gr.redie969.redie_969_app');
  const [iosStoreUrl, setIosStoreUrl] = useState('https://apps.apple.com/app/id6758665312');
  const [liveUrl, setLiveUrl] = useState('');
  const [liveActive, setLiveActive] = useState(false);

  useEffect(() => { loadSettings(); loadChatSponsor(); }, []);

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
        setShowListenerCount(data.show_listener_count || false);
        setListenerCountBase(data.listener_count_base || 0);
        setSocialLinks({
          facebook_url: data.facebook_url || '',
          instagram_url: data.instagram_url || '',
          tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || ''
        });
        setShareMessage(data.share_message || 'Άκου REDIE 969 Web Radio! 🎶📻');
        setAndroidStoreUrl(data.android_store_url || 'https://play.google.com/store/apps/details?id=gr.redie969.redie_969_app');
        setIosStoreUrl(data.ios_store_url || 'https://apps.apple.com/app/id6758665312');
        setLiveUrl(data.live_url || '');
        setLiveActive(data.live_active || false);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
  }

  async function loadChatSponsor() {
    try {
      const { data } = await supabase.from('chat_sponsored_messages').select('*').limit(1).single();
      if (data) {
        setChatSponsorMessage(data.message || '');
        setChatSponsorName(data.sponsor_name || '');
        setChatSponsorActive(data.is_active || false);
        setChatSponsorUrl(data.sponsor_url || '');
        setChatSponsorUrlActive(data.sponsor_url_active || false);
      }
    } catch (e) { console.log(e); }
  }

  async function saveNowPlaying() {
    setSaving('nowplaying');
    await supabase.from('settings').update({ now_playing: nowPlaying, updated_at: new Date().toISOString() }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveAnnouncement() {
    setSaving('announcement');
    await supabase.from('settings').update({ 
      announcement, announcement_active: announcementActive, announcement_url: announcementUrl, announcement_url_active: announcementUrlActive,
      updated_at: new Date().toISOString() 
    }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveListenerCount() {
    setSaving('listener');
    await supabase.from('settings').update({ show_listener_count: showListenerCount, listener_count_base: listenerCountBase, updated_at: new Date().toISOString() }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveChatSponsor() {
    setSaving('chatsponsor');
    const { data } = await supabase.from('chat_sponsored_messages').select('id').limit(1).single();
    if (data) {
      await supabase.from('chat_sponsored_messages').update({ message: chatSponsorMessage, sponsor_name: chatSponsorName, is_active: chatSponsorActive, sponsor_url: chatSponsorUrl, sponsor_url_active: chatSponsorUrlActive }).eq('id', data.id);
    } else {
      await supabase.from('chat_sponsored_messages').insert({ message: chatSponsorMessage, sponsor_name: chatSponsorName, is_active: chatSponsorActive, sponsor_url: chatSponsorUrl, sponsor_url_active: chatSponsorUrlActive });
    }
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveSocialLinks() {
    setSaving('social');
    await supabase.from('settings').update({ ...socialLinks, updated_at: new Date().toISOString() }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveShareSettings() {
    setSaving('share');
    await supabase.from('settings').update({ share_message: shareMessage, android_store_url: androidStoreUrl, ios_store_url: iosStoreUrl, updated_at: new Date().toISOString() }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveLiveUrl() {
    setSaving('live');
    await supabase.from('settings').update({ live_url: liveUrl, live_active: liveActive, updated_at: new Date().toISOString() }).eq('id', 1);
    setTimeout(() => setSaving(''), 1500);
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width: 52, height: 28, borderRadius: 14, background: checked ? '#22c55e' : '#4b5563', border: 'none', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: 22, height: 22, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: checked ? 27 : 3, transition: 'all 0.2s' }} />
    </button>
  );

  if (loading) return <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}><p>Φόρτωση...</p></div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 28 }}>📱</span><div><span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>App Content</span><p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Οι αλλαγές εμφανίζονται αμέσως στην εφαρμογή!</p></div></div>
        </header>

        <div style={{ padding: 28, maxWidth: 900 }}>
          {/* Now Playing */}
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 20, padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>🎵 Now Playing <span style={{ background: '#22c55e', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 20 }}>LIVE</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>Εμφανίζεται στους ακροατές κάτω από το logo</p>
            <input type="text" value={nowPlaying} onChange={e => setNowPlaying(e.target.value)} style={{ width: '100%', padding: '14px 18px', border: '2px solid rgba(229,57,53,0.3)', borderRadius: 12, fontSize: 15, background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: 16, boxSizing: 'border-box' }} />
            <button onClick={saveNowPlaying} style={{ padding: '12px 24px', background: saving === 'nowplaying' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'nowplaying' ? '✓ Saved!' : '🎵 Update'}</button>
          </div>

          {/* Listener Count */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 24, border: '2px solid #e53935' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>🎧 Listener Count</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Εμφανίζει αριθμό ακροατών δίπλα στο LIVE badge</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: showListenerCount ? 'rgba(34,197,94,0.1)' : '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
              <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>Εμφάνιση</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{showListenerCount ? '✅ LIVE 🎧 123' : 'Απενεργοποιημένο'}</p></div>
              <Toggle checked={showListenerCount} onChange={() => setShowListenerCount(!showListenerCount)} />
            </div>
            <div style={{ padding: '14px 18px', background: '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
              <p style={{ fontWeight: 600, color: '#1f2937', margin: '0 0 8px 0' }}>Base Value</p>
              <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 12px 0' }}>0 = πραγματικοί, 100+ = bonus</p>
              <input type="number" min="0" value={listenerCountBase} onChange={e => setListenerCountBase(parseInt(e.target.value) || 0)} style={{ width: 120, padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 18, fontWeight: 600, textAlign: 'center' }} />
            </div>
            <button onClick={saveListenerCount} style={{ padding: '12px 24px', background: saving === 'listener' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'listener' ? '✓ Saved!' : '💾 Save'}</button>
          </div>

          {/* Chat Sponsor */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 24, border: '2px solid #f59e0b' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>💬 Chat Sponsor</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>Sponsored μήνυμα στο Live Chat</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: chatSponsorActive ? 'rgba(245,158,11,0.1)' : '#f9fafb', borderRadius: 12, marginBottom: 16 }}>
              <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>Ενεργό</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{chatSponsorActive ? '✅ Εμφανίζεται' : 'Απενεργοποιημένο'}</p></div>
              <Toggle checked={chatSponsorActive} onChange={() => setChatSponsorActive(!chatSponsorActive)} />
            </div>
            <input type="text" value={chatSponsorName} onChange={e => setChatSponsorName(e.target.value)} placeholder="Όνομα χορηγού" style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', marginBottom: 12, boxSizing: 'border-box' }} />
            <textarea value={chatSponsorMessage} onChange={e => setChatSponsorMessage(e.target.value)} rows={2} placeholder="Μήνυμα χορηγού..." style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', resize: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: chatSponsorUrlActive ? 'rgba(59,130,246,0.1)' : '#f9fafb', borderRadius: 12, marginBottom: 12 }}>
              <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>🔗 Link χορηγού</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{chatSponsorUrlActive ? '✅ Clickable' : 'Απενεργοποιημένο'}</p></div>
              <Toggle checked={chatSponsorUrlActive} onChange={() => setChatSponsorUrlActive(!chatSponsorUrlActive)} />
            </div>
            <input type="text" value={chatSponsorUrl} onChange={e => setChatSponsorUrl(e.target.value)} placeholder="https://example.com" style={{ width: '100%', padding: '14px 18px', border: '2px solid #3b82f6', borderRadius: 12, fontSize: 15, background: chatSponsorUrlActive ? '#eff6ff' : '#f9fafb', marginBottom: 16, boxSizing: 'border-box' }} disabled={!chatSponsorUrlActive} />
            <button onClick={saveChatSponsor} style={{ padding: '12px 24px', background: saving === 'chatsponsor' ? '#22c55e' : 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'chatsponsor' ? '✓ Saved!' : '💾 Save'}</button>
          </div>

          {/* Announcement */}
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
                <div><p style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>🔗 Σύνδεσμος</p><p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{announcementUrlActive ? '✅ Πατώντας ανοίγει' : 'Απενεργοποιημένος'}</p></div>
                <Toggle checked={announcementUrlActive} onChange={() => setAnnouncementUrlActive(!announcementUrlActive)} />
              </div>
              <input type="text" value={announcementUrl} onChange={e => setAnnouncementUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', marginBottom: 16, boxSizing: 'border-box' }} />
            </div>
            <button onClick={saveAnnouncement} style={{ padding: '12px 24px', background: saving === 'announcement' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'announcement' ? '✓ Saved!' : '💾 Save'}</button>
          </div>

          {/* Social Links */}
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

          {/* Share App Settings */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 20 }}>📤 Κοινοποίηση Εφαρμογής</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Το μήνυμα που στέλνεται όταν ο χρήστης πατάει το κουμπί κοινοποίησης στην εφαρμογή</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>💬 Μήνυμα Κοινοποίησης</label>
                <textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} rows={3} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14, resize: 'vertical' }} placeholder="Άκου REDIE 969 Web Radio!" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🤖 Android (Google Play) Link</label>
                <input type="text" value={androidStoreUrl} onChange={e => setAndroidStoreUrl(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="https://play.google.com/store/apps/..." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🍎 iOS (App Store) Link</label>
                <input type="text" value={iosStoreUrl} onChange={e => setIosStoreUrl(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="https://apps.apple.com/app/..." />
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>👁️ Προεπισκόπηση μηνύματος:</p>
                <p style={{ fontSize: 14, color: '#1f2937', margin: 0, whiteSpace: 'pre-wrap' }}>{shareMessage}{'\n\n'}📱 Android: {androidStoreUrl}{'\n'}🍎 iOS: {iosStoreUrl}</p>
              </div>
            </div>
            <button onClick={saveShareSettings} style={{ padding: '12px 24px', background: saving === 'share' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'share' ? '✓ Saved!' : '💾 Save'}</button>
          </div>

          {/* Live Button URL */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 }}>🔴 Live Button</h2>
                <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0 0' }}>Όταν ενεργό, το LIVE κουμπί στην εφαρμογή ανοίγει το URL</p>
              </div>
              <Toggle checked={liveActive} onChange={() => setLiveActive(!liveActive)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🔗 Live URL</label>
              <input type="text" value={liveUrl} onChange={e => setLiveUrl(e.target.value)} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="https://..." />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveLiveUrl} style={{ padding: '12px 24px', background: saving === 'live' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'live' ? '✓ Saved!' : '💾 Save'}</button>
              <span style={{ fontSize: 13, color: liveActive ? '#22c55e' : '#9ca3af' }}>{liveActive ? '✅ Ενεργό — το LIVE κουμπί είναι clickable' : '⬜ Ανενεργό — το LIVE κουμπί δεν κάνει τίποτα'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

