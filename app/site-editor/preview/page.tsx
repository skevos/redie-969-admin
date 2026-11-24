"use client";
// Προεπισκόπηση για τον editor (μόνο με σύνδεση στο dashboard): δείχνει το πρόχειρο και αλλάζει live.
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { adminDb } from "../../lib/adminDb";
import SiteView from "../../site/SiteView";
import { DEFAULT_CONTENT, SiteContent, withDefaults } from "../../site/content";

export default function SitePreview() {
  const [c, setC] = useState<SiteContent | null>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [p, s, pr, st] = await Promise.all([
        adminDb.from("site_pages").select("draft, published").eq("id", "home").maybeSingle(),
        supabase.from("shows").select("*").eq("is_active", true),
        supabase.from("producers").select("*").eq("is_active", true),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      const row: any = p.data || {};
      setC(prev => prev || withDefaults(row.draft || row.published));
      setShows(s.data || []);
      setProducers(pr.data || []);
      setSettings(st.data || null);
    })();
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "site-draft") setC(withDefaults(e.data.content));
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "site-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return <SiteView c={c || DEFAULT_CONTENT} shows={shows} producers={producers} settings={settings} />;
}
