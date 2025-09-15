"use client";
import { messages, normalizeUILang } from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function HelpPage() {
  const [lang, setLang] = useState<string>("it-IT");
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => { try { const l = localStorage.getItem("tp:lang"); if (l) setLang(l); } catch {} }, []);
  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{ui.helpTitle}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{ui.helpIntro}</p>
      </div>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            {ui.helpShortcutsTitle}
          </h2>
          <ul className="space-y-1 text-sm">
            <li><span className="inline-block min-w-[110px] font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">Space</span> {ui.start}/{ui.stop}</li>
            <li><span className="inline-block min-w-[110px] font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">F</span> {ui.fullscreenLabel}</li>
            <li><span className="inline-block min-w-[110px] font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">M</span> {ui.mirrorModeLabel}</li>
            <li><span className="inline-block min-w-[110px] font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">+ / −</span> {ui.fontSizeLabel}</li>
            <li><span className="inline-block min-w-[110px] font-mono text-xs px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">H</span> {ui.helpOpenLabel}</li>
          </ul>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h6M7 17h8"/></svg>
            {ui.helpEnvironmentTitle}
          </h2>
          <p className="text-sm opacity-90">{ui.helpSecureContextLabel}, {ui.helpMicSupportLabel}, {ui.helpASRSupportLabel}</p>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {ui.helpFilesTitle}
          </h2>
          <p className="text-sm opacity-90">{ui.helpFilesContent}</p>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            {ui.helpTroubleshootTitle}
          </h2>
          <p className="text-sm opacity-90">{ui.helpTroubleshootContent}</p>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-1 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          {ui.helpPrivacyTitle}
        </h2>
        <p className="text-sm opacity-90">{ui.helpPrivacyNote}</p>
      </section>
    </div>
  );
}
