"use client";
// 🎨 Χρώματα εφαρμογής — every app colour from here (settings.app_theme) + saved combinations (app_theme_presets)
import { useEffect, useMemo, useState } from "react";
import { adminDb } from "../lib/adminDb";
import Sidebar from "../components/Sidebar";

type Theme = Record<string, string>; // key -> "#AARRGGBB"

// Today's REDIE 969 colours (must match AppColors.defaults in the app)
const DEFAULTS: Theme = {
  background: "#FF050508",
  surface: "#15FFFFFF",
  accent: "#FFFF2D2D",
  text: "#FFFFFFFF",
  textMuted: "#99FFFFFF",
  border: "#10FFFFFF",
  glass: "#08FFFFFF",
  card: "#FF121216",
};

const FIELDS: { key: string; label: string; help: string }[] = [
  { key: "accent", label: "Κύριο χρώμα", help: "Το κόκκινο: τίτλοι, LIVE, εικονίδια, κουμπιά, βελάκια" },
  { key: "background", label: "Φόντο", help: "Το φόντο όλων των σελίδων" },
  { key: "text", label: "Κείμενο", help: "Τα κύρια γράμματα" },
  { key: "textMuted", label: "Αχνό κείμενο", help: "Δευτερεύοντα γράμματα (ώρες, υπότιτλοι)" },
  { key: "surface", label: "Κουτάκια", help: "Κάρτες, κουμπιά, κυκλάκια social (συνήθως διάφανο)" },
  { key: "card", label: "Παράθυρα", help: "Κάρτα παραγωγού, αιτήματα, «τι έπαιξε πριν»" },
  { key: "border", label: "Περιγράμματα", help: "Οι λεπτές γραμμές γύρω από κουτάκια" },
  { key: "glass", label: "Πολύ αχνά πάνελ", help: "Σχεδόν αόρατα φόντα" },
];

// Ready-made combinations (only the main colours change; transparent ones stay)
const BUILT_IN: { name: string; colors: Theme }[] = [
  { name: "REDIE 969 (αρχικό)", colors: DEFAULTS },
  { name: "Μπλε νύχτα", colors: { ...DEFAULTS, accent: "#FF2D8CFF", background: "#FF04070F", card: "#FF0E1424" } },
  { name: "Μωβ", colors: { ...DEFAULTS, accent: "#FFB14DFF", background: "#FF07040C", card: "#FF15101E" } },
  { name: "Πράσινο", colors: { ...DEFAULTS, accent: "#FF22D36B", background: "#FF040806", card: "#FF0E1712" } },
  { name: "Χρυσό", colors: { ...DEFAULTS, accent: "#FFFFB020", background: "#FF080604", card: "#FF18140C" } },
  { name: "Ροζ", colors: { ...DEFAULTS, accent: "#FFFF3D9A", background: "#FF0A0408", card: "#FF1C0E16" } },
];
// The same combinations, with the logo in the theme's colour too (the originals above keep the original logo)
const BUILT_IN_LOGO = BUILT_IN.slice(1).map(p => ({ name: p.name + " + λογότυπο", colors: { ...p.colors, logo: "accent" } }));

function norm(t: any): Theme {
  const out: Theme = { ...DEFAULTS };
  const lg = t && typeof t === "object" ? String(t.logo ?? "") : "";
  if (lg === "accent") out.logo = "accent";
  else if (/^#?[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(lg)) { let v = lg.replace("#", "").toUpperCase(); if (v.length === 6) v = "FF" + v; out.logo = "#" + v; }
  if (t && typeof t === "object") for (const k of Object.keys(DEFAULTS)) {
    let v = String(t[k] ?? "").replace("#", "").toUpperCase();
    if (/^[0-9A-F]{6}$/.test(v)) v = "FF" + v;
    if (/^[0-9A-F]{8}$/.test(v)) out[k] = "#" + v;
  }
  return out;
}
const alphaOf = (v: string) => parseInt(v.slice(1, 3), 16);
const rgbOf = (v: string) => "#" + v.slice(3);
const css = (v: string) => {
  const a = alphaOf(v) / 255, r = parseInt(v.slice(3, 5), 16), g = parseInt(v.slice(5, 7), 16), b = parseInt(v.slice(7, 9), 16);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};
const withAlpha = (v: string, a: number) => css("#" + Math.round(a * 255).toString(16).padStart(2, "0").toUpperCase() + v.slice(3));
const same = (a: Theme, b: Theme) => Object.keys(DEFAULTS).every(k => a[k] === b[k]) && (a.logo || "") === (b.logo || "");

export default function ThemePage() {
  const [theme, setTheme] = useState<Theme>(DEFAULTS);
  const [saved, setSaved] = useState<Theme>(DEFAULTS);
  const [presets, setPresets] = useState<{ id: number; name: string; colors: Theme }[]>([]);
  const [presetName, setPresetName] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [season, setSeason] = useState<string>("none");
  const [seasonReady, setSeasonReady] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data, error } = await adminDb.from("settings").select("app_theme").eq("id", 1).maybeSingle();
    if (error && /app_theme/.test(error.message || "")) setSetupNeeded(true);
    const t = norm((data as any)?.app_theme);
    const ss = await adminDb.from("settings").select("seasonal_theme").eq("id", 1).maybeSingle();
    if (ss.error) setSeasonReady(false); else setSeason(((ss.data as any)?.seasonal_theme as string) || "none");
    setTheme(t); setSaved(t);
    const p = await adminDb.from("app_theme_presets").select("id, name, colors").order("created_at", { ascending: false });
    if (p.error) { if (/app_theme_presets/.test(p.error.message || "")) setSetupNeeded(true); }
    else setPresets(((p.data as any[]) || []).map(r => ({ ...r, colors: norm(r.colors) })));
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3500); }

  async function save(t: Theme = theme) {
    setBusy("save");
    const value = same(t, DEFAULTS) ? null : t; // the original colours = nothing stored
    const { error } = await adminDb.from("settings").update({ app_theme: value }).eq("id", 1);
    setBusy("");
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setTheme(t); setSaved(t);
    flash("✅ Αποθηκεύτηκε — η εφαρμογή παίρνει τα χρώματα μόλις ανοίξει ή ξαναγυρίσει σε αυτήν");
  }

  async function resetToOriginal() {
    if (!confirm("Επαναφορά στα αρχικά χρώματα του REDIE 969 και αποθήκευση;")) return;
    await save(DEFAULTS);
  }

  async function saveSeason(v: string) {
    setSeason(v);
    const { error } = await adminDb.from("settings").update({ seasonal_theme: v === "none" ? null : v }).eq("id", 1);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    flash(v === "christmas" ? "🎄 Το χριστουγεννιάτικο θέμα άναψε στην εφαρμογή" : "Τα στολίδια αφαιρέθηκαν από την εφαρμογή");
  }

  async function savePreset() {
    const name = presetName.trim();
    if (!name) { alert("Γράψε ένα όνομα για τον συνδυασμό"); return; }
    setBusy("preset");
    const { error } = await adminDb.from("app_theme_presets").insert({ name, colors: theme });
    setBusy("");
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setPresetName("");
    flash("💾 Ο συνδυασμός «" + name + "» αποθηκεύτηκε");
    load();
  }

  async function deletePreset(id: number, name: string) {
    if (!confirm("Διαγραφή του συνδυασμού «" + name + "»;")) return;
    const { error } = await adminDb.from("app_theme_presets").delete().eq("id", id);
    if (error) { alert("Σφάλμα: " + error.message); return; }
    setPresets(ps => ps.filter(p => p.id !== id));
  }

  const dirty = !same(theme, saved);
  const c = useMemo(() => Object.fromEntries(Object.entries(theme).map(([k, v]) => [k, css(v)])), [theme]);

  const card: React.CSSProperties = { background: "white", borderRadius: 16, border: "1px solid #e5e7eb", padding: 20, marginBottom: 20 };
  const btn = (bg: string, color = "white"): React.CSSProperties => ({ background: bg, color, border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 260, padding: "24px 28px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>🎨 Χρώματα εφαρμογής</h1>
        <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: 14 }}>Άλλαξε τα χρώματα, δες τα δεξιά στο κινητό και πάτα <b>Αποθήκευση</b>. Η εφαρμογή τα παίρνει χωρίς νέα έκδοση (από την 1.0.9).</p>

        {setupNeeded && <div style={{ ...card, background: "#fef3c7", borderColor: "#fcd34d", color: "#92400e" }}>⚠️ Λείπει το SQL για τα χρώματα (redie_app_theme.sql). Μέχρι να τρέξει, η αποθήκευση δεν δουλεύει.</div>}
        {msg && <div style={{ ...card, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46", padding: 14 }}>{msg}</div>}

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 460px", minWidth: 380 }}>
            {/* Colours */}
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>Χρώματα</h2>
              {FIELDS.map(f => {
                const v = theme[f.key];
                const a = Math.round(alphaOf(v) / 255 * 100);
                return (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: "1px solid #f3f4f6" }}>
                    <input type="color" value={rgbOf(v)} onChange={e => setTheme(t => ({ ...t, [f.key]: "#" + v.slice(1, 3) + e.target.value.slice(1).toUpperCase() }))}
                      style={{ width: 44, height: 44, border: "1px solid #e5e7eb", borderRadius: 10, padding: 2, background: "white", cursor: "pointer" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{f.label} {theme[f.key] !== DEFAULTS[f.key] && <span style={{ fontSize: 11, color: "#d97706" }}>• αλλαγμένο</span>}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{f.help}</div>
                    </div>
                    <div style={{ width: 150 }}>
                      <div style={{ fontSize: 11, color: "#6b7280", display: "flex", justifyContent: "space-between" }}><span>Ορατότητα</span><span>{a}%</span></div>
                      <input type="range" min={0} max={100} value={a} style={{ width: "100%" }}
                        onChange={e => setTheme(t => ({ ...t, [f.key]: "#" + Math.round(Number(e.target.value) / 100 * 255).toString(16).padStart(2, "0").toUpperCase() + v.slice(3) }))} />
                    </div>
                    <button title="Αρχικό χρώμα" onClick={() => setTheme(t => ({ ...t, [f.key]: DEFAULTS[f.key] }))} style={{ ...btn("#f3f4f6", "#374151"), padding: "6px 10px", fontSize: 13 }}>↩︎</button>
                  </div>
                );
              })}
              {/* Logo colour: only the red of the logo changes, the picture stays the same */}
              <div style={{ padding: "14px 0 4px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 44, height: 44, borderRadius: 10, background: "#050508", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/app-logo.png" alt="" style={{ height: 34, ...(theme.logo ? { opacity: 0 } : {}) }} />
                  {theme.logo && <div style={{ position: "absolute", width: 23, height: 34, background: theme.logo === "accent" ? c.accent : css(theme.logo), WebkitMaskImage: "url(/app-logo.png)", maskImage: "url(/app-logo.png)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" } as React.CSSProperties} />}
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>Λογότυπο</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>Αλλάζει μόνο το κόκκινο του λογότυπου· η εικόνα μένει ίδια</div>
                </div>
                {[["original", "Original"], ["accent", "Κύριο χρώμα"], ["custom", "Δικό μου"]].map(([k, label]) => {
                  const cur = !theme.logo ? "original" : theme.logo === "accent" ? "accent" : "custom";
                  return <button key={k} onClick={() => setTheme(t => { const n = { ...t }; if (k === "original") delete n.logo; else if (k === "accent") n.logo = "accent"; else n.logo = t.logo && t.logo !== "accent" ? t.logo : t.accent; return n; })}
                    style={{ ...btn(cur === k ? "#dc2626" : "#f3f4f6", cur === k ? "white" : "#374151"), padding: "8px 12px", fontSize: 13 }}>{label}</button>;
                })}
                {theme.logo && theme.logo !== "accent" && (
                  <input type="color" value={rgbOf(theme.logo)} onChange={e => setTheme(t => ({ ...t, logo: "#FF" + e.target.value.slice(1).toUpperCase() }))}
                    style={{ width: 40, height: 36, border: "1px solid #e5e7eb", borderRadius: 8, padding: 2, background: "white", cursor: "pointer" }} />
                )}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                <button onClick={() => save()} disabled={busy === "save"} style={btn(dirty ? "#dc2626" : "#9ca3af")}>{busy === "save" ? "Αποθήκευση…" : "💾 Αποθήκευση στην εφαρμογή"}</button>
                {dirty && <button onClick={() => setTheme(saved)} style={btn("#f3f4f6", "#374151")}>Ακύρωση αλλαγών</button>}
                <button onClick={resetToOriginal} style={btn("#111827")}>↩︎ Επαναφορά στα αρχικά REDIE 969</button>
              </div>
              {dirty && <p style={{ margin: "10px 0 0", fontSize: 12, color: "#d97706" }}>Έχεις αλλαγές που δεν έχουν αποθηκευτεί.</p>}
            </div>

            {/* Season */}
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Εποχιακό θέμα</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>Στολίδια σε κάθε σελίδα της εφαρμογής: λαμπάκια και χιόνι στην αρχική, σκουφάκι στο λογότυπο και στους τίτλους, δωράκι, ταρανδάκι και χιονάνθρωπος. Δεν ενοχλούν τα κουμπιά. Αλλάζει αμέσως, χωρίς Αποθήκευση.</p>
              {!seasonReady && <p style={{ fontSize: 12, color: "#b45309", margin: "0 0 10px" }}>⚠️ Λείπει το SQL για το εποχιακό θέμα.</p>}
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => saveSeason("none")} style={btn(season === "none" ? "#111827" : "#f3f4f6", season === "none" ? "white" : "#374151")}>Κανένα</button>
                <button onClick={() => saveSeason("christmas")} style={btn(season === "christmas" ? "#15803d" : "#f3f4f6", season === "christmas" ? "white" : "#374151")}>🎄 Χριστούγεννα</button>
              </div>
            </div>

            {/* Presets */}
            <div style={card}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Συνδυασμοί</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px" }}>Πάτα έναν για να αλλάξουν όλα τα χρώματα μαζί (τα βλέπεις δεξιά). Μετά πάτα Αποθήκευση για να πάνε στην εφαρμογή.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {[...presets.map(p => ({ ...p, mine: true })), ...BUILT_IN.map((p, i) => ({ id: -1 - i, name: p.name, colors: p.colors, mine: false })), ...BUILT_IN_LOGO.map((p, i) => ({ id: -100 - i, name: p.name, colors: norm(p.colors), mine: false }))].map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", border: "1px solid " + (same(p.colors, theme) ? "#dc2626" : "#e5e7eb"), borderRadius: 12, overflow: "hidden", background: "white" }}>
                    <button onClick={() => setTheme(p.colors)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                      <span style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                        <span style={{ width: 16, height: 16, background: css(p.colors.background) }} />
                        <span style={{ width: 16, height: 16, background: css(p.colors.accent) }} />
                        <span style={{ width: 16, height: 16, background: css(p.colors.card) }} />
                      </span>
                      {p.name}{p.mine ? "" : ""}
                    </button>
                    {p.mine && <button title="Διαγραφή" onClick={() => deletePreset(p.id, p.name)} style={{ border: "none", borderLeft: "1px solid #e5e7eb", background: "#fafafa", padding: "8px 10px", cursor: "pointer", color: "#9ca3af" }}>✕</button>}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Όνομα, π.χ. Χριστούγεννα" maxLength={40}
                  style={{ flex: 1, padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 14 }} />
                <button onClick={savePreset} disabled={busy === "preset"} style={btn("#2563eb")}>➕ Αποθήκευση ως συνδυασμός</button>
              </div>
            </div>
          </div>

          {/* Phone preview */}
          <div style={{ flex: "0 0 300px", position: "sticky", top: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", margin: "0 0 8px" }}>ΠΡΟΕΠΙΣΚΟΠΗΣΗ</div>
            <div style={{ width: 300, height: 600, borderRadius: 36, border: "10px solid #111", background: c.background, overflow: "hidden", position: "relative", fontFamily: "system-ui, sans-serif" }}>
              {/* home */}
              <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center" }}>
                <div style={{ width: 170, height: 170, borderRadius: "50%", background: `radial-gradient(circle, ${withAlpha(theme.accent, 0.35)}, transparent 70%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 120, height: 120, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {theme.logo
                      ? <div style={{ width: 70, height: 104, background: theme.logo === "accent" ? c.accent : css(theme.logo), WebkitMaskImage: "url(/app-logo.png)", maskImage: "url(/app-logo.png)", WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } as React.CSSProperties} />
                      : <img src="/app-logo.png" alt="" style={{ height: 104 }} />}
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", top: 145, left: 8, color: c.accent, fontSize: 18 }}>‹</div>
              <div style={{ position: "absolute", top: 145, right: 8, color: c.accent, fontSize: 13, fontWeight: 800 }}>3 ›</div>
              <div style={{ position: "absolute", top: 262, left: 0, right: 0, textAlign: "center" }}>
                <div style={{ color: c.text, fontWeight: 700, fontSize: 15 }}>69 Ρίχτερ Καψούρας</div>
                <div style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>Skevos Kokkinidis</div>
                <div style={{ color: c.accent, fontSize: 11, fontWeight: 700, marginTop: 10 }}>● LIVE - Πάτα για παύση</div>
              </div>
              <div style={{ position: "absolute", top: 352, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 10 }}>
                {["f", "◎", "♪", "▶"].map(i => <div key={i} style={{ width: 38, height: 38, borderRadius: "50%", background: c.surface, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: c.accent, fontWeight: 800, fontSize: 14 }}>{i}</div>)}
              </div>
              {/* a page title + list */}
              <div style={{ position: "absolute", top: 410, left: 16, right: 16, background: c.glass, borderRadius: 14, padding: 12, border: `1px solid ${c.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: withAlpha(theme.accent, 0.1), color: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>📅</div>
                  <div style={{ color: c.accent, fontSize: 18, fontWeight: 300 }}>Πρόγραμμα</div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {["Δευ", "Τρι", "Τετ"].map((d, i) => <span key={d} style={{ padding: "4px 10px", borderRadius: 12, fontSize: 11, background: i === 2 ? c.accent : c.surface, color: i === 2 ? "#fff" : c.textMuted }}>{d}</span>)}
                </div>
                <div style={{ marginTop: 10, background: c.surface, borderRadius: 10, padding: "8px 10px", border: `1px solid ${c.border}` }}>
                  <div style={{ color: c.text, fontSize: 12, fontWeight: 600 }}>21:00 · 69 Ρίχτερ Καψούρας</div>
                  <div style={{ color: c.textMuted, fontSize: 11 }}>🎧 Skevos Kokkinidis</div>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, width: 300 }}>Η προεπισκόπηση είναι πρόχειρη· στο κινητό τα χρώματα μπαίνουν σε όλες τις σελίδες.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
