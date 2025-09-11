"use client";
import { useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import HelpPanel from "@/components/HelpPanel";
import { messages, normalizeUILang } from "@/lib/i18n";

const SAMPLE_IT = `Signore e Signori,
grazie per essere qui oggi. Questo teleprompter regola automaticamente
la velocità di scorrimento in base alla mia voce. Se accelero, il testo
scorre più velocemente; se rallento o mi fermo, il testo rallenta per
restarmi accanto.`;
const SAMPLE_EN = `Ladies and Gentlemen,
thank you for being here today. This teleprompter automatically adjusts
the scrolling speed based on my voice. If I speed up, the text scrolls
faster; if I slow down or pause, the text slows to stay with me.`;

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  const [settings, setSettings] = useState({
    fontSizePx: 32,
    mirror: false,
    baseWpm: 140,
    holdOnSilence: true,
  });
  useEffect(() => {
    // Initialize from localStorage or browser language on first mount
    try {
      const savedLang = localStorage.getItem("tp:lang");
      const l = savedLang || (typeof navigator !== "undefined" ? navigator.language : "it-IT");
      setLang(l);
    } catch {}
    try {
      const raw = localStorage.getItem("tp:settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch {}
  }, []);
  const ui = messages[normalizeUILang(lang)];
  const [text, setText] = useState(SAMPLE_IT);
  useEffect(() => {
    // Swap sample text when language changes only if current text is exactly one of the samples
    setText((prev) => {
      if (prev === SAMPLE_IT || prev === SAMPLE_EN) {
        return normalizeUILang(lang) === "it" ? SAMPLE_IT : SAMPLE_EN;
      }
      return prev;
    });
  }, [lang]);
  // Persist settings and language
  useEffect(() => {
    try { localStorage.setItem("tp:lang", lang); } catch {}
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem("tp:settings", JSON.stringify(settings)); } catch {}
  }, [settings]);

  // Keyboard shortcuts at page level: m (mirror), +/- (font size)
  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = (el as HTMLElement).tagName;
      const editable = (el as HTMLElement).isContentEditable;
      return editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const clamp = (v: number) => Math.max(20, Math.min(72, v));
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setSettings((s) => ({ ...s, mirror: !s.mirror }));
      } else if (e.key === "+" || (e.key === "=" && e.shiftKey)) {
        e.preventDefault();
        setSettings((s) => ({ ...s, fontSizePx: clamp((s.fontSizePx ?? 32) + 2) }));
      } else if (e.key === "-") {
        e.preventDefault();
        setSettings((s) => ({ ...s, fontSizePx: clamp((s.fontSizePx ?? 32) - 2) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{ui.title}</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            <span>{ui.langLabel}</span>
            <select
              className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1 text-sm"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="it-IT">Italiano (it-IT)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </label>
          <HelpPanel lang={lang} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <FileTextInput onLoadText={setText} lang={lang} />
        <button
          className="px-3 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-sm"
          onClick={() => setText(normalizeUILang(lang) === "it" ? SAMPLE_IT : SAMPLE_EN)}
          type="button"
        >
          {ui.loadDemo}
        </button>
      </div>
      {/* Settings */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="font-medium opacity-80">{ui.settingsTitle}</div>
        <label className="flex items-center gap-2">
          <span>{ui.fontSizeLabel}</span>
          <input
            type="range"
            min={20}
            max={72}
            step={1}
            value={settings.fontSizePx}
            onChange={(e) => setSettings((s) => ({ ...s, fontSizePx: Number(e.target.value) }))}
          />
          <span className="tabular-nums w-10 text-right">{settings.fontSizePx}px</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.mirror}
            onChange={(e) => setSettings((s) => ({ ...s, mirror: e.target.checked }))}
          />
          <span>{ui.mirrorModeLabel}</span>
        </label>
        <label className="flex items-center gap-2">
          <span>{ui.baseWpmLabel}</span>
          <input
            type="number"
            min={60}
            max={260}
            step={5}
            className="w-20 bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
            value={settings.baseWpm}
            onChange={(e) => setSettings((s) => ({ ...s, baseWpm: Number(e.target.value) }))}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.holdOnSilence}
            onChange={(e) => setSettings((s) => ({ ...s, holdOnSilence: e.target.checked }))}
          />
          <span>{ui.holdOnSilenceLabel}</span>
        </label>
      </div>

      <Teleprompter
        text={text}
        baseWpm={settings.baseWpm}
        holdOnSilence={settings.holdOnSilence}
        lang={lang}
        fontSizePx={settings.fontSizePx}
        mirror={settings.mirror}
      />
    </main>
  );
}
