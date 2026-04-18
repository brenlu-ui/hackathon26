import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Water Tracker",
  description: "Track daily home appliance water usage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="site-shell">
            <div className="site-title">
              <h1>Water Tracker 💧</h1>
              <p>Single household water dashboard 🏠🚰</p>
            </div>
            <nav className="site-nav">
              <Link href="/">Dashboard 📊</Link>
              <Link href="/#log-usage">Log Usage ✍️</Link>
            </nav>
          </div>
        </header>
        <main className="site-shell">{children}</main>
      </body>
    </html>
  );
}
