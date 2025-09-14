"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-neutral-950/80 backdrop-blur border-b">
      <nav className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
        <Link href="/" className="font-semibold">Teleprompter</Link>
        <button
          aria-label="Menu"
          onClick={toggle}
          className="p-2 rounded md:hidden hover:bg-neutral-200 dark:hover:bg-neutral-800"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="hidden md:flex items-center gap-3 text-sm">
          <Link className="hover:underline" href="/settings">Settings</Link>
          <Link className="hover:underline" href="/help">Help</Link>
          <Link className="hover:underline" href="/about">About</Link>
          <Link className="hover:underline" href="/library">Library</Link>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex flex-col items-center justify-center text-xl text-white space-y-6">
          <button
            onClick={toggle}
            aria-label="Close menu"
            className="absolute top-5 right-5 p-2 rounded hover:bg-white/10"
            type="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <Link className="hover:underline" href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link className="hover:underline" href="/settings" onClick={() => setOpen(false)}>Settings</Link>
          <Link className="hover:underline" href="/help" onClick={() => setOpen(false)}>Help</Link>
          <Link className="hover:underline" href="/about" onClick={() => setOpen(false)}>About</Link>
          <Link className="hover:underline" href="/library" onClick={() => setOpen(false)}>Library</Link>
        </div>
      )}
    </header>
  );
}
