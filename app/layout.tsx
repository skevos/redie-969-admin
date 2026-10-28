import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
