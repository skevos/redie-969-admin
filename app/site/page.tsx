"use client";
// Δημόσια ιστοσελίδα σταθμού: δείχνει τη «δημοσιευμένη» έκδοση.
// Με ?preview=1 (μέσα στο dashboard) δείχνει το πρόχειρο και ενημερώνεται live από τον editor.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import SiteView from "./SiteView";
import { DEFAULT_CONTENT, SiteContent, withDefaults } from "./content";

export default function SitePage() {
  const [c, setC] = useState<SiteContent | null>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [producers, setProducers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    (async () => {
      const [p, s, pr, st] = await Promise.all([
        supabase.from("site_pages").select("draft, published").eq("id", "home").maybeSingle(),
        supabase.from("shows").select("*"),
        supabase.from("producers").select("*"),
        supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      const row: any = p.data || {};
      setC(withDefaults(preview ? row.draft || row.published : row.published || row.draft));
      setShows(s.data || []);
      setProducers(pr.data || []);
      setSettings(st.data || null);
    })();
    if (!preview) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === "site-draft") setC(withDefaults(e.data.content));
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "site-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return <SiteView c={c || DEFAULT_CONTENT} shows={shows} producers={producers} settings={settings} />;
}
