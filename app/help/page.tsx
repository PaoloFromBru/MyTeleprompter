"use client";
import { messages, normalizeUILang } from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function HelpPage() {
  const [lang, setLang] = useState<string>("it-IT");
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => { try { const l = localStorage.getItem("tp:lang"); if (l) setLang(l); } catch {} }, []);
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-semibold">{ui.helpTitle}</h1>
      <section>
        <h2 className="font-medium mb-1">{ui.helpShortcutsTitle}</h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>Space: {ui.start}/{ui.stop}</li>
          <li>F: Fullscreen</li>
          <li>M: {ui.mirrorModeLabel}; +/−: {ui.fontSizeLabel}</li>
          <li>H: Help</li>
        </ul>
      </section>
      <section>
        <h2 className="font-medium mb-1">Environment</h2>
        <p className="text-sm opacity-90">{ui.helpSecureContextLabel}, {ui.helpMicSupportLabel}, {ui.helpASRSupportLabel}</p>
      </section>
      <section>
        <h2 className="font-medium mb-1">{ui.helpFilesTitle}</h2>
        <p className="text-sm opacity-90">{ui.helpFilesContent}</p>
      </section>
      <section>
        <h2 className="font-medium mb-1">{ui.helpTroubleshootTitle}</h2>
        <p className="text-sm opacity-90">{ui.helpTroubleshootContent}</p>
      </section>
      <section>
        <h2 className="font-medium mb-1">Privacy</h2>
        <p className="text-sm opacity-90">{ui.helpPrivacyNote}</p>
      </section>
    </div>
  );
}
