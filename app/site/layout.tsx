import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "REDIE 969 Web Radio · Κάλυμνος",
  description: "Το web radio της Καλύμνου. Άκου live, δες το πρόγραμμα και τους παραγωγούς.",
  robots: { index: true, follow: true },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
