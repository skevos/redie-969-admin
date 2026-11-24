// Περιεχόμενο της ιστοσελίδας του σταθμού. Αποθηκεύεται στο Supabase (site_pages: draft / published).
export type SiteContent = {
  accent: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  ctaText: string;
  aboutTitle: string;
  aboutText: string;
  scheduleTitle: string;
  producersTitle: string;
  appsTitle: string;
  appsText: string;
  contactTitle: string;
  email: string;
  phone: string;
  address: string;
  footerText: string;
  show: { about: boolean; schedule: boolean; producers: boolean; apps: boolean; contact: boolean };
};

export const DEFAULT_CONTENT: SiteContent = {
  accent: "#e11d2a",
  heroTitle: "REDIE 969",
  heroSubtitle: "Το web radio της Καλύμνου. Μουσική, εκπομπές και παρέα, 24 ώρες τη μέρα.",
  heroImage: "",
  ctaText: "▶ Άκου live",
  aboutTitle: "Ποιοι είμαστε",
  aboutText: "Το REDIE 969 είναι το ραδιόφωνο της Καλύμνου στο ίντερνετ. Παίζουμε την καλύτερη μουσική, φιλοξενούμε τους παραγωγούς του νησιού και είμαστε μαζί σου όπου κι αν βρίσκεσαι.",
  scheduleTitle: "Πρόγραμμα εκπομπών",
  producersTitle: "Οι παραγωγοί μας",
  appsTitle: "Κατέβασε την εφαρμογή",
  appsText: "Άκου το REDIE 969 από το κινητό σου, μίλα μαζί μας στο chat, ψήφισε στα polls και στείλε αφιερώσεις.",
  contactTitle: "Επικοινωνία",
  email: "info@kokkinidis.tech",
  phone: "",
  address: "Κάλυμνος",
  footerText: "© REDIE 969 Web Radio · Kokkinidis Group",
  show: { about: true, schedule: true, producers: true, apps: true, contact: true },
};

export function withDefaults(c: any): SiteContent {
  const x = c && typeof c === "object" ? c : {};
  return { ...DEFAULT_CONTENT, ...x, show: { ...DEFAULT_CONTENT.show, ...(x.show || {}) } };
}
