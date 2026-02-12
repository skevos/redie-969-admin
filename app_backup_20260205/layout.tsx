import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REDIE 969 - Dashboard",
  description: "Admin & Studio Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body className="bg-background min-h-screen">{children}</body>
    </html>
  );
}
