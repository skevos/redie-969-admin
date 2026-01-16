"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function ContentPage() {
  const [saving, setSaving] = useState('');
  const [homeSettings, setHomeSettings] = useState({ welcome_text: 'Welcome to REDIE 969', tagline: 'Your favorite radio station', show_live_indicator: true });
  const [socialLinks, setSocialLinks] = useState({ facebook: '', instagram: '', twitter: '', youtube: '', tiktok: '' });
  const [announcements, setAnnouncements] = useState({ enabled: true, text: '' });

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      if (data) {
        setHomeSettings({ welcome_text: data.welcome_text || 'Welcome to REDIE 969', tagline: data.tagline || 'Your favorite radio station', show_live_indicator: data.show_live_indicator ?? true });
        setSocialLinks(data.social_links || socialLinks);
        setAnnouncements({ enabled: data.announcements_enabled ?? true, text: data.announcement_text || '' });
      }
    } catch (e) { console.log(e); }
  }

  async function saveSection(section: string, data: any) {
    setSaving(section);
    try { await supabase.from('app_settings').upsert({ id: 1, ...data }); } catch (e) { console.log(e); }
    setTimeout(() => setSaving(''), 1500);
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange} style={{ width: 52, height: 28, borderRadius: 14, background: checked ? '#22c55e' : '#4b5563', border: 'none', cursor: 'pointer', position: 'relative' }}>
      <div style={{ width: 22, height: 22, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: checked ? 27 : 3, transition: 'all 0.2s' }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <aside style={{ width: 240, background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #e53935, #c62828)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>R</span>
            </div>
            <div><span style={{ color: 'white', fontWeight: 700, fontSize: 18 }}>REDIE</span><span style={{ color: '#e53935', fontWeight: 700, fontSize: 18, marginLeft: 4 }}>969</span></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span style={{ fontSize: 18 }}>🏠</span><span style={{ fontSize: 14 }}>Dashboard</span></Link>
          <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span style={{ fontSize: 18 }}>📅</span><span style={{ fontSize: 14 }}>Schedule</span></Link>
          <Link href="/studio" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span style={{ fontSize: 18 }}>💬</span><span style={{ fontSize: 14 }}>Live Chat</span></Link>
          <Link href="/notifications" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', color: 'rgba(255,255,255,0.7)', borderRadius: 12, textDecoration: 'none', marginBottom: 6 }}><span style={{ fontSize: 18 }}>🔔</span><span style={{ fontSize: 14 }}>Notifications</span></Link>
          <Link href="/content" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'rgba(229,57,53,0.15)', color: '#e53935', borderRadius: 12, textDecoration: 'none', marginBottom: 6, border: '1px solid rgba(229,57,53,0.2)' }}><span style={{ fontSize: 18 }}>📱</span><span style={{ fontSize: 14, fontWeight: 600 }}>App Content</span></Link>
        </nav>
        <div style={{ padding: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}><p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>REDIE 969 Admin v1.0</p></div>
      </aside>

      <main style={{ flex: 1, marginLeft: 240 }}>
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '16px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>📱</span>
            <div><span style={{ fontSize: 22, fontWeight: 700, color: '#1f2937' }}>App Content</span><p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Manage what users see in the mobile app</p></div>
          </div>
        </header>

        <div style={{ padding: 28, maxWidth: 900 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 24, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>🏠 Home Screen Settings</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Configure the main welcome screen</p>
            <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Welcome Text</label><input type="text" value={homeSettings.welcome_text} onChange={e => setHomeSettings({...homeSettings, welcome_text: e.target.value})} style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb' }} /></div>
            <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Tagline</label><input type="text" value={homeSettings.tagline} onChange={e => setHomeSettings({...homeSettings, tagline: e.target.value})} style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb' }} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f9fafb', borderRadius: 12, marginBottom: 20 }}><div><p style={{ fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' }}>Show Live Indicator</p><p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Display red dot when streaming</p></div><Toggle checked={homeSettings.show_live_indicator} onChange={() => setHomeSettings({...homeSettings, show_live_indicator: !homeSettings.show_live_indicator})} /></div>
            <button onClick={() => saveSection('home', homeSettings)} style={{ padding: '14px 28px', background: saving === 'home' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{saving === 'home' ? '✓ Saved!' : '💾 Save Home Settings'}</button>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 28, marginBottom: 24, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>🔗 Social Links</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Connect your social media profiles</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              {Object.entries(socialLinks).map(([key, val]) => (<div key={key}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'capitalize' }}>{key}</label><input type="text" value={val} onChange={e => setSocialLinks({...socialLinks, [key]: e.target.value})} placeholder={`https://${key}.com/redie969`} style={{ width: '100%', padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 14, background: '#f9fafb' }} /></div>))}
            </div>
            <button onClick={() => saveSection('social', { social_links: socialLinks })} style={{ padding: '14px 28px', background: saving === 'social' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{saving === 'social' ? '✓ Saved!' : '💾 Save Social Links'}</button>
          </div>

          <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>📢 Announcements</h2>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>Display important messages to your listeners</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#f9fafb', borderRadius: 12, marginBottom: 16 }}><div><p style={{ fontWeight: 600, color: '#1f2937', margin: '0 0 4px 0' }}>Enable Announcements</p><p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Show announcement banner in app</p></div><Toggle checked={announcements.enabled} onChange={() => setAnnouncements({...announcements, enabled: !announcements.enabled})} /></div>
            <div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Announcement Text</label><textarea value={announcements.text} onChange={e => setAnnouncements({...announcements, text: e.target.value})} rows={3} placeholder="Enter your announcement..." style={{ width: '100%', padding: '14px 18px', border: '2px solid #e5e7eb', borderRadius: 12, fontSize: 15, background: '#f9fafb', resize: 'none', fontFamily: 'inherit' }} /></div>
            <button onClick={() => saveSection('announcements', { announcements_enabled: announcements.enabled, announcement_text: announcements.text })} style={{ padding: '14px 28px', background: saving === 'announcements' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{saving === 'announcements' ? '✓ Saved!' : '💾 Save Announcements'}</button>
          </div>
        </div>
      </main>
    </div>
  );
}