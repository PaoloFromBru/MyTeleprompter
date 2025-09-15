import Link from "next/link";
import { useEffect, useState } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";

export default function Footer() {
  const [lang, setLang] = useState<string>("it-IT");
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => { try { const l = localStorage.getItem("tp:lang"); if (l) setLang(l); } catch {} }, []);
  return (
    <footer className="mt-10 border-t">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-2">
        <div>&copy; {new Date().getFullYear()} Adaptive Teleprompter</div>
        <nav className="flex items-center gap-3">
          <Link className="hover:underline" href="/about">{ui.navAbout}</Link>
          <Link className="hover:underline" href="/help">{ui.navHelp}</Link>
          <Link className="hover:underline" href="/settings">{ui.navSettings}</Link>
          <Link className="hover:underline" href="/library">{ui.navLibrary}</Link>
        </nav>
      </div>
    </footer>
  );
}
