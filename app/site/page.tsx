// Δημόσια ιστοσελίδα σταθμού (/site).
// Φτιάχνεται στον server και κρατιέται έτοιμη για 60″: όσοι κι αν τη δουν, η βάση της εφαρμογής
// διαβάζεται το πολύ μία φορά το λεπτό. Η μουσική και το «Παίζει τώρα» έρχονται απευθείας από το Radio.co.
import SiteView from "./SiteView";
import { withDefaults } from "./content";

export const revalidate = 60;

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vbfedezlshgmrevabyeh.supabase.co";
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiZmVkZXpsc2hnbXJldmFieWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDU2MTYsImV4cCI6MjA4MzgyMTYxNn0.2OVY8gcHnKAltiPB4OaO8EJ8mA7lmPJN6feAJa0dkts";

async function get(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, next: { revalidate: 60 } });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  } catch { return []; }
}

export default async function SitePage() {
  const [page, shows, producers, settings] = await Promise.all([
    get("site_pages?id=eq.home&select=published,draft"),
    get("shows?select=id,title,producer_name,day_of_week,start_time,end_time,image_url,is_active,description&is_active=eq.true"),
    get("producers?select=id,name,photo_url,bio,show_1,show_2,is_active,hidden_in_app,sort_order&is_active=eq.true"),
    get("settings?id=eq.1&select=stream_url,facebook_url,instagram_url,tiktok_url,youtube_url,ios_store_url,android_store_url"),
  ]);
  const row = page[0] || {};
  return <SiteView c={withDefaults(row.published || row.draft)} shows={shows} producers={producers} settings={settings[0] || null} />;
}
