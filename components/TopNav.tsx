"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((o) => !o);
  const pathname = usePathname();
  const linkClass = (path: string) => `btn btn-nav text-sm ${pathname === path ? "btn-nav-active" : ""}`;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-white/70 dark:bg-neutral-950/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 border-b">
        <nav className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="14" rx="2" />
                <path d="M7 8h10M7 12h10M7 16h6" />
              </svg>
            </span>
            <span>Teleprompter</span>
          </Link>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="hidden md:flex items-center gap-1">
              <Link className={linkClass("/")} href="/">Home</Link>
              <Link className={linkClass("/settings")} href="/settings">Settings</Link>
              <Link className={linkClass("/help")} href="/help">Help</Link>
              <Link className={linkClass("/about")} href="/about">About</Link>
              <Link className={linkClass("/library")} href="/library">Library</Link>
            </div>
            <ThemeToggle />
            <button
              aria-label="Menu"
              onClick={toggle}
              className="p-2 rounded md:hidden hover:bg-black/5 dark:hover:bg-white/10"
              type="button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </nav>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-xl text-white space-y-6">
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
          <Link className={`hover:underline ${pathname === "/" ? "underline font-medium" : ""}`} href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link className={`hover:underline ${pathname === "/settings" ? "underline font-medium" : ""}`} href="/settings" onClick={() => setOpen(false)}>Settings</Link>
          <Link className={`hover:underline ${pathname === "/help" ? "underline font-medium" : ""}`} href="/help" onClick={() => setOpen(false)}>Help</Link>
          <Link className={`hover:underline ${pathname === "/about" ? "underline font-medium" : ""}`} href="/about" onClick={() => setOpen(false)}>About</Link>
          <Link className={`hover:underline ${pathname === "/library" ? "underline font-medium" : ""}`} href="/library" onClick={() => setOpen(false)}>Library</Link>
        </div>
      )}
    </header>
  );
}
