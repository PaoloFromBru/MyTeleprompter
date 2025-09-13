import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Adaptive Teleprompter",
  description: "Voice-adaptive teleprompter with optional speech-follow",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b">
          <nav className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
            <Link href="/" className="font-semibold">Teleprompter</Link>
            <div className="flex items-center gap-3 text-sm">
              <Link className="hover:underline" href="/settings">Settings</Link>
              <Link className="hover:underline" href="/help">Help</Link>
              <Link className="hover:underline" href="/about">About</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}
