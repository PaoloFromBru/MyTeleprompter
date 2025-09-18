"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";
import { messages, normalizeUILang } from "@/lib/i18n";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<string>("it-IT");
  const ui = messages[normalizeUILang(lang)];
  const toggle = () => setOpen((o) => !o);
  const pathname = usePathname();
  const linkClass = (path: string) => `btn btn-nav text-sm ${pathname === path ? "btn-nav-active" : ""}`;
  const overlayRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const sync = () => { try { const l = localStorage.getItem("tp:lang"); if (l) setLang(l); } catch {} };
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === "tp:lang") sync(); };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("tp:langchange", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tp:langchange", onCustom as EventListener);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const root = overlayRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', trap as unknown as EventListener);
    return () => root.removeEventListener('keydown', trap as unknown as EventListener);
  }, [open]);
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
              <Link className={linkClass("/")} href="/">{ui.navHome}</Link>
              <Link className={linkClass("/settings")} href="/settings">{ui.navSettings}</Link>
              <Link className={linkClass("/help")} href="/help">{ui.navHelp}</Link>
              <Link className={linkClass("/about")} href="/about">{ui.navAbout}</Link>
              <Link className={linkClass("/library")} href="/library">{ui.navLibrary}</Link>
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
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-xl text-white space-y-6"
        >
          <h2 id="mobile-menu-title" className="sr-only">Menu</h2>
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
          <Link className={`hover:underline ${pathname === "/" ? "underline font-medium" : ""}`} href="/" onClick={() => setOpen(false)}>{ui.navHome}</Link>
          <Link className={`hover:underline ${pathname === "/settings" ? "underline font-medium" : ""}`} href="/settings" onClick={() => setOpen(false)}>{ui.navSettings}</Link>
          <Link className={`hover:underline ${pathname === "/help" ? "underline font-medium" : ""}`} href="/help" onClick={() => setOpen(false)}>{ui.navHelp}</Link>
          <Link className={`hover:underline ${pathname === "/about" ? "underline font-medium" : ""}`} href="/about" onClick={() => setOpen(false)}>{ui.navAbout}</Link>
          <Link className={`hover:underline ${pathname === "/library" ? "underline font-medium" : ""}`} href="/library" onClick={() => setOpen(false)}>{ui.navLibrary}</Link>
        </div>
      )}
    </header>
  );
}
