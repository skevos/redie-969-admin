"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { adminDb, adminUpload } from '../lib/adminDb';
import Sidebar from "../components/Sidebar";
import { AUTO_MESSAGE_DEFAULTS, resolveAutoMessages } from "../lib/autoMessages";

export default function ContentPage() {
  const [saving, setSaving] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [nowPlaying, setNowPlaying] = useState('REDIE 969 Live');
  const [metadataEnabled, setMetadataEnabled] = useState(false);
  const [adKeywords, setAdKeywords] = useState('');
  const [showInNowPlaying, setShowInNowPlaying] = useState(true);
  // App feature switches (settings.*, missing / null = on)
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [onAirShow, setOnAirShow] = useState<{ title: string; producer_name: string | null } | null>(null);
  const [adText, setAdText] = useState('📢 Διαφημίσεις · Μένετε συντονισμένοι στον REDIE 969');
  const [radioNow, setRadioNow] = useState<{ title: string; artwork: string; history: string[]; error?: string } | null>(null);
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
  const [autoMsgs, setAutoMsgs] = useState<Record<string, string>>({ ...AUTO_MESSAGE_DEFAULTS });

  useEffect(() => { loadSettings(); loadChatSponsor(); }, []);

  // Live preview of the Radio.co track (refreshes every 20s, like the app)
  useEffect(() => {
    let alive = true;
    async function loadRadio() {
      try {
        const r = await fetch('/api/now-playing', { credentials: 'same-origin', cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;
        setRadioNow(r.ok ? { title: d.title || '', artwork: d.artwork || '', history: d.history || [] } : { title: '', artwork: '', history: [], error: d?.error || `HTTP ${r.status}` });
      } catch (e: any) {
        if (alive) setRadioNow({ title: '', artwork: '', history: [], error: e.message });
      }
    }
    loadRadio();
    const t = setInterval(loadRadio, 20000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Same rule as the app: lower-case, Greek accents removed, "contains"
  const plain = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const adWords = adKeywords.split(',').map(w => plain(w.trim())).filter(Boolean);
  const isAdNow = !!radioNow?.title && adWords.some(w => plain(radioNow!.title).includes(w));
  const appShowsTrack = !metadataEnabled || !radioNow?.title ? nowPlaying : isAdNow ? (adText.trim() || nowPlaying) : radioNow.title;

  async function saveAdSettings() {
    setSaving('ads');
    const { error } = await adminDb.from('settings').update({ metadata_ad_keywords: adKeywords, metadata_ad_text: adText, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  // Show on air now (Greek time, same rule as the app: day_of_week 0 = Monday, slots may cross midnight)
  useEffect(() => {
    let alive = true;
    async function loadOnAir() {
      const { data } = await supabase.from('shows').select('title, producer_name, day_of_week, start_time, end_time, is_live');
      if (!alive || !data) return;
      const live = data.find((r: any) => r.is_live);
      if (live) { setOnAirShow(live); return; }
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      const get = (t: string) => parts.find(p => p.type === t)?.value || '';
      const today = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'));
      const now = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
      const mins = (t: string) => { const [h, m] = String(t || '').split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
      let found: any = null;
      for (const r of data as any[]) {
        const start = mins(r.start_time); let end = mins(r.end_time);
        if (start == null || end == null) continue;
        if (end <= start) end += 1440;
        if (r.day_of_week === today && now >= start && now < end) { found = r; break; }
        if (end > 1440 && r.day_of_week === (today + 6) % 7 && now + 1440 < end) { found = r; break; }
      }
      setOnAirShow(found);
    }
    loadOnAir();
    const t = setInterval(loadOnAir, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const showText = showInNowPlaying && onAirShow?.title ? `🎙️ ${onAirShow.title.trim()}${onAirShow.producer_name?.trim() ? ' · ' + onAirShow.producer_name.trim() : ''}` : null;

  async function toggleShowInNowPlaying() {
    const next = !showInNowPlaying;
    setSaving('showplaying');
    const { error } = await adminDb.from('settings').update({ show_in_now_playing: next, updated_at: new Date().toISOString() }).eq('id', 1);
    if (!error) setShowInNowPlaying(next);
    finishSave(error);
  }

  async function toggleFeature(key: string, defaultOn = true) {
    const current = features[key] ?? defaultOn;
    const next = !current;
    setSaving('f_' + key);
    const { error } = await adminDb.from('settings').update({ [key]: next, updated_at: new Date().toISOString() }).eq('id', 1);
    if (!error) setFeatures(f => ({ ...f, [key]: next }));
    finishSave(error);
  }

  async function toggleMetadata() {
    const next = !metadataEnabled;
    setSaving('metadata');
    const { error } = await adminDb.from('settings').update({ metadata_enabled: next, updated_at: new Date().toISOString() }).eq('id', 1);
    if (!error) setMetadataEnabled(next);
    finishSave(error);
  }

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (data) {
        setNowPlaying(data.now_playing || 'REDIE 969 Live');
        setMetadataEnabled(data.metadata_enabled === true);
        setShowInNowPlaying(data.show_in_now_playing !== false);
        setFeatures({
          requests_open: data.requests_open !== false,
          likes_enabled: data.likes_enabled !== false,
          history_enabled: data.history_enabled !== false,
          lock_screen_artwork: data.lock_screen_artwork !== false,
          lock_screen_like: data.lock_screen_like !== false,
          swipe_hints_enabled: data.swipe_hints_enabled !== false,
        });
        if (typeof data.metadata_ad_keywords === 'string') setAdKeywords(data.metadata_ad_keywords);
        if (typeof data.metadata_ad_text === 'string' && data.metadata_ad_text.trim()) setAdText(data.metadata_ad_text);
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
        setAutoMsgs(resolveAutoMessages(data));
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

  // Only allow empty or http(s) URLs
  function isValidUrl(v: string) {
    return !v || /^https?:\/\//i.test(v.trim());
  }

  function checkUrls(...urls: string[]) {
    if (urls.every(isValidUrl)) return true;
    alert('Μη έγκυρο URL: πρέπει να ξεκινά με http:// ή https://');
    return false;
  }

  function finishSave(error: any) {
    if (error) {
      alert(error.message);
      setSaving('');
      return;
    }
    setTimeout(() => setSaving(''), 1500);
  }

  async function saveNowPlaying() {
    setSaving('nowplaying');
    const { error } = await adminDb.from('settings').update({ now_playing: nowPlaying, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  async function saveAnnouncement() {
    if (!checkUrls(announcementUrl)) return;
    setSaving('announcement');
    const { error } = await adminDb.from('settings').update({ 
      announcement, announcement_active: announcementActive, announcement_url: announcementUrl, announcement_url_active: announcementUrlActive,
      updated_at: new Date().toISOString() 
    }).eq('id', 1);
    finishSave(error);
  }

  async function saveListenerCount() {
    setSaving('listener');
    const { error } = await adminDb.from('settings').update({ show_listener_count: showListenerCount, listener_count_base: listenerCountBase, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  async function saveChatSponsor() {
    if (!checkUrls(chatSponsorUrl)) return;
    setSaving('chatsponsor');
    const { data } = await supabase.from('chat_sponsored_messages').select('id').limit(1).single();
    let error: any = null;
    if (data) {
      ({ error } = await adminDb.from('chat_sponsored_messages').update({ message: chatSponsorMessage, sponsor_name: chatSponsorName, is_active: chatSponsorActive, sponsor_url: chatSponsorUrl, sponsor_url_active: chatSponsorUrlActive }).eq('id', data.id));
    } else {
      ({ error } = await adminDb.from('chat_sponsored_messages').insert({ message: chatSponsorMessage, sponsor_name: chatSponsorName, is_active: chatSponsorActive, sponsor_url: chatSponsorUrl, sponsor_url_active: chatSponsorUrlActive }));
    }
    finishSave(error);
  }

  async function saveSocialLinks() {
    if (!checkUrls(socialLinks.facebook_url, socialLinks.instagram_url, socialLinks.tiktok_url, socialLinks.youtube_url)) return;
    setSaving('social');
    const { error } = await adminDb.from('settings').update({ ...socialLinks, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  async function saveShareSettings() {
    if (!checkUrls(androidStoreUrl, iosStoreUrl)) return;
    setSaving('share');
    const { error } = await adminDb.from('settings').update({ share_message: shareMessage, android_store_url: androidStoreUrl, ios_store_url: iosStoreUrl, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  async function saveAutoMessages() {
    setSaving('automsgs');
    const { error } = await adminDb.from('settings').update({ ...autoMsgs, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
  }

  async function saveLiveUrl() {
    if (!checkUrls(liveUrl)) return;
    setSaving('live');
    const { error } = await adminDb.from('settings').update({ live_url: liveUrl, live_active: liveActive, updated_at: new Date().toISOString() }).eq('id', 1);
    finishSave(error);
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
          {/* App features on / off */}
          <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 24, border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: '0 0 4px' }}>⚙️ Λειτουργίες εφαρμογής</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>Ενεργοποίηση / απενεργοποίηση. Ισχύει αμέσως στην έκδοση 1.0.9 και μετά.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {([
                { key: 'requests_open', icon: '🎵', title: 'Αιτήματα & αφιερώσεις', desc: 'Κουμπί αιτήματος στην αρχική' },
                { key: 'likes_enabled', icon: '❤️', title: '«Μου αρέσει» στα τραγούδια', desc: 'Καρδούλα δίπλα στον τίτλο και στη λίστα' },
                { key: 'history_enabled', icon: '🕘', title: '«Τι έπαιξε πριν»', desc: 'Λίστα με τα προηγούμενα τραγούδια' },
                { key: 'lock_screen_artwork', icon: '🖼️', title: 'Εξώφυλλα στην οθόνη κλειδώματος', desc: 'Εξώφυλλο τραγουδιού / φωτογραφία εκπομπής αντί για το logo' },
                { key: 'lock_screen_like', icon: '🔒', title: '❤️ στην οθόνη κλειδώματος', desc: 'Κουμπί «Μου αρέσει» δίπλα στο pause (Android)' },
                { key: 'swipe_hints_enabled', icon: '↔️', title: 'Σημάδια swipe', desc: 'Βελάκια στις άκρες για τις άλλες σελίδες' },
              ] as const).map(f => {
                const on = features[f.key] ?? true;
                return (
                  <button key={f.key} onClick={() => toggleFeature(f.key)} disabled={saving === 'f_' + f.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer', background: on ? '#fef2f2' : '#f9fafb', border: `1.5px solid ${on ? '#fca5a5' : '#e5e7eb'}`, transition: 'all .15s' }}>
                    <span style={{ fontSize: 22, flexShrink: 0, opacity: on ? 1 : 0.45 }}>{f.icon}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: on ? '#1f2937' : '#6b7280' }}>{f.title}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{f.desc}</span>
                    </span>
                    <span style={{ width: 40, height: 22, borderRadius: 22, background: on ? '#ef4444' : '#d1d5db', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: 16, background: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.25)', transition: 'left .15s' }} />
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ color: '#9ca3af', fontSize: 11.5, margin: '12px 0 0' }}>Ο τίτλος από Radio.co και η εκπομπή στο «τώρα παίζει» ρυθμίζονται στην κάρτα Now Playing πιο κάτω.</p>
          </div>

          {/* Now Playing */}
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: 20, padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 8 }}>🎵 Now Playing <span style={{ background: '#22c55e', color: 'white', fontSize: 10, padding: '4px 8px', borderRadius: 20 }}>LIVE</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>Εμφανίζεται στους ακροατές κάτω από το logo</p>

            {/* Show on air in Now Playing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: showInNowPlaying ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showInNowPlaying ? 'rgba(59,130,246,0.45)' : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎙️</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>🎙️ Εκπομπή στο Now Playing</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {onAirShow?.title ? `Τώρα στον αέρα: ${onAirShow.title}${onAirShow.producer_name ? ' · ' + onAirShow.producer_name : ''}` : 'Καμία εκπομπή αυτή τη στιγμή (ώρα Ελλάδας)'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '3px 0 0' }}>
                  {showInNowPlaying ? 'ΕΝΕΡΓΟ: όσο παίζει εκπομπή του προγράμματος, η εφαρμογή γράφει «🎙️ Εκπομπή · Παραγωγός» (από 1.0.9). Μετά γυρνάει στον τίτλο τραγουδιού.' : 'ΑΝΕΝΕΡΓΟ: δείχνει πάντα τον τίτλο τραγουδιού / το κείμενο.'}
                </p>
              </div>
              <button onClick={toggleShowInNowPlaying} disabled={saving === 'showplaying'} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'white', background: showInNowPlaying ? '#3b82f6' : '#6b7280', flexShrink: 0 }}>
                {showInNowPlaying ? '🔵 ΕΝΕΡΓΟ' : '⚪ ΑΝΕΝΕΡΓΟ'}
              </button>
            </div>

            {/* Automatic title from Radio.co */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, marginBottom: 18, background: metadataEnabled ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${metadataEnabled ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.1)'}` }}>
              {radioNow?.artwork ? <img src={radioNow.artwork} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📡</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>📡 Αυτόματος τίτλος από Radio.co</p>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '3px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {radioNow == null ? 'Φόρτωση...' : radioNow.error ? `Δεν απαντά το Radio.co (${radioNow.error})` : radioNow.title ? `Τώρα: ${radioNow.title}` : 'Το Radio.co δεν στέλνει τίτλο αυτή τη στιγμή'}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '3px 0 0' }}>
                  {metadataEnabled ? 'ΕΝΕΡΓΟ: η εφαρμογή δείχνει τον τίτλο του τραγουδιού (από 1.0.9). Αν δεν υπάρχει τίτλος, δείχνει το κείμενο από κάτω.' : 'ΑΝΕΝΕΡΓΟ: η εφαρμογή δείχνει το κείμενο από κάτω.'}
                </p>
              </div>
              <button onClick={toggleMetadata} disabled={saving === 'metadata'} style={{ padding: '10px 16px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'white', background: metadataEnabled ? '#22c55e' : '#6b7280', flexShrink: 0 }}>
                {metadataEnabled ? '🟢 ΕΝΕΡΓΟ' : '⚪ ΑΝΕΝΕΡΓΟ'}
              </button>
            </div>

            {/* Ads: show a message instead of the ad's title */}
            <div style={{ padding: '14px 16px', borderRadius: 14, marginBottom: 18, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>📢 Όταν παίζουν διαφημίσεις</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '0 0 12px' }}>Αν ο τίτλος στο Radio.co περιέχει μία από αυτές τις λέξεις, η εφαρμογή δείχνει το μήνυμα αντί για τον τίτλο (χωρίς εξώφυλλο). Δεν μετράνε κεφαλαία και τόνοι.</p>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'block', marginBottom: 6 }}>Λέξεις διαφήμισης (με κόμμα)</label>
              <input type="text" value={adKeywords} onChange={e => setAdKeywords(e.target.value)} placeholder="π.χ. SPOT, ΔΙΑΦΗΜΙΣΗ, ADV" style={{ width: '100%', padding: '11px 14px', border: '2px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: 12, boxSizing: 'border-box' }} />
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: 'block', marginBottom: 6 }}>Μήνυμα που βλέπουν οι ακροατές</label>
              <input type="text" value={adText} onChange={e => setAdText(e.target.value)} style={{ width: '100%', padding: '11px 14px', border: '2px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', color: 'white', marginBottom: 12, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button onClick={saveAdSettings} style={{ padding: '10px 20px', background: saving === 'ads' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>{saving === 'ads' ? '✓ Saved!' : '💾 Αποθήκευση'}</button>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Τώρα η εφαρμογή δείχνει: <b style={{ color: showText ? '#93c5fd' : isAdNow ? '#fbbf24' : 'white' }}>{showText || appShowsTrack}</b>{showText ? ' (εκπομπή)' : isAdNow ? ' (διαφήμιση)' : ''}</span>
              </div>
            </div>
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

          {/* Automatic chat notifications */}
          <div style={{ background: 'white', borderRadius: 20, padding: 28, border: '1px solid #f3f4f6' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>🤖 Αυτόματα Μηνύματα</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>Οι ειδοποιήσεις που φεύγουν μόνες τους όταν ανοίγει ή κλείνει το chat. Γράψε <b>{'{εκπομπή}'}</b> για το όνομα της εκπομπής. Άφησε τον τίτλο κενό για να μη στέλνεται.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>💬 Άνοιγμα chat (Studio)</label>
                <input type="text" value={autoMsgs.msg_chat_open_title} onChange={e => setAutoMsgs({ ...autoMsgs, msg_chat_open_title: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', marginBottom: 8 }} placeholder="Τίτλος (κενό = δεν στέλνεται)" />
                <input type="text" value={autoMsgs.msg_chat_open_body} onChange={e => setAutoMsgs({ ...autoMsgs, msg_chat_open_body: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="Κείμενο" />
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>📴 Κλείσιμο chat (Studio)</label>
                <input type="text" value={autoMsgs.msg_chat_close_title} onChange={e => setAutoMsgs({ ...autoMsgs, msg_chat_close_title: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', marginBottom: 8 }} placeholder="Τίτλος (κενό = δεν στέλνεται)" />
                <input type="text" value={autoMsgs.msg_chat_close_body} onChange={e => setAutoMsgs({ ...autoMsgs, msg_chat_close_body: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="Κείμενο" />
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⏰ Auto Mode: 15 λεπτά πριν την εκπομπή</label>
                <input type="text" value={autoMsgs.msg_auto_soon_title} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_soon_title: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', marginBottom: 8 }} placeholder="Τίτλος (κενό = δεν στέλνεται)" />
                <input type="text" value={autoMsgs.msg_auto_soon_body} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_soon_body: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="Κείμενο" />
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🎙️ Auto Mode: η εκπομπή ήδη παίζει</label>
                <input type="text" value={autoMsgs.msg_auto_live_title} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_live_title: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', marginBottom: 8 }} placeholder="Τίτλος (κενό = δεν στέλνεται)" />
                <input type="text" value={autoMsgs.msg_auto_live_body} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_live_body: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="Κείμενο" />
              </div>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🔕 Auto Mode: κλείσιμο chat</label>
                <input type="text" value={autoMsgs.msg_auto_close_title} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_close_title: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box', marginBottom: 8 }} placeholder="Τίτλος (κενό = δεν στέλνεται)" />
                <input type="text" value={autoMsgs.msg_auto_close_body} onChange={e => setAutoMsgs({ ...autoMsgs, msg_auto_close_body: e.target.value })} style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: 12, background: '#f9fafb', boxSizing: 'border-box' }} placeholder="Κείμενο" />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={saveAutoMessages} style={{ padding: '12px 24px', background: saving === 'automsgs' ? '#22c55e' : 'linear-gradient(135deg, #e53935, #c62828)', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>{saving === 'automsgs' ? '✓ Saved!' : '💾 Save'}</button>
              <button onClick={() => setAutoMsgs({ ...AUTO_MESSAGE_DEFAULTS })} style={{ padding: '12px 18px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 12, fontWeight: 500, cursor: 'pointer' }}>↩️ Αρχικά κείμενα</button>
            </div>
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

