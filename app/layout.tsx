import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter with Greek glyphs for a cleaner, consistent dashboard typography
const inter = Inter({ subsets: ["latin", "greek"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "REDIE 969 Admin",
  description: "REDIE 969 Radio Station Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
