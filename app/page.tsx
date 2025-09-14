"use client";
import { useCallback, useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import { messages, normalizeUILang } from "@/lib/i18n";

type SampleTexts = { it?: string; en?: string };

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    fontSizePx: 32,
    mirror: false,
    baseWpm: 140,
    holdOnSilence: true,
    manualPauseMs: 500,
    useMicWhileASR: true,
    useAsrDerivedDrift: false,
    asrWindowScreens: 1 as 1|2|4,
    asrSnapMode: "aggressive" as "gentle"|"aggressive"|"instant"|"sticky",
    stickyThresholdPx: 16,
    asrLeadWords: 2,
    lockToHighlight: false,
    showDebug: false,
    theme: "light" as "light"|"dark"|"sepia"|"contrast",
    fontFamily: "sans" as "sans"|"serif",
  });
  const [samples, setSamples] = useState<SampleTexts>({});
  const [text, setText] = useState("");
  const saveScript = () => {
    const title = prompt("Title for this script?");
    if (!title) return;
    try {
      const raw = localStorage.getItem("tp:scripts");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: Date.now(), title, text });
      localStorage.setItem("tp:scripts", JSON.stringify(arr));
      alert("Saved");
    } catch (err) {
      console.error("Failed to save script", err);
    }
  };
  const [showOnboard, setShowOnboard] = useState(false);
  const stripBlankLines = (s: string) => s.split(/\r?\n/).filter((ln) => ln.trim() !== "").join("\n");
  const fetchSample = useCallback(async (l: "it" | "en") => {
    try {
      const res = await fetch(`/samples/${l}.txt`);
      const raw = await res.text();
      const txt = stripBlankLines(raw);
      setSamples((s) => ({ ...s, [l]: txt }));
      return txt;
    } catch (err) {
      console.error("Failed to load sample", err);
      return "";
    }
  }, []);
  useEffect(() => {
    // Initialize from localStorage or browser language on first mount
    try {
      const savedLang = localStorage.getItem("tp:lang");
      const l = savedLang || (typeof navigator !== "undefined" ? navigator.language : "it-IT");
      setLang(l);
    } catch (err) {
      console.error("Failed to load language", err);
    }
    try {
      const raw = localStorage.getItem("tp:settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
    try {
      const cur = localStorage.getItem("tp:currentScript");
      if (cur) setText(cur);
      else fetchSample("it").then(setText);
      if (!localStorage.getItem("tp:onboarded")) setShowOnboard(true);
    } catch {
      fetchSample("it").then(setText);
    }
    setLoaded(true);
  }, [fetchSample]);
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => {
    const norm = normalizeUILang(lang) as "it" | "en";
    const swap = (txt: string) =>
      setText((prev) => (prev === samples.it || prev === samples.en ? txt : prev));
    if (samples[norm]) swap(samples[norm]!);
    else fetchSample(norm).then(swap);
  }, [lang, samples, fetchSample]);
  // Persist settings and language
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("tp:lang", lang); } catch (err) {
      console.error("Failed to save language", err);
    }
  }, [lang, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem("tp:settings", JSON.stringify(settings)); } catch (err) {
      console.error("Failed to save settings", err);
    }
  }, [settings, loaded]);
  useEffect(() => {
    try { localStorage.setItem("tp:currentScript", text); } catch {}
  }, [text]);

  useEffect(() => {
    const themes = ["theme-light","theme-dark","theme-sepia","theme-contrast"];
    document.body.classList.remove(...themes);
    document.body.classList.add(`theme-${settings.theme}`);
    const fonts = ["font-sans","font-serif"];
    document.body.classList.remove(...fonts);
    document.body.classList.add(`font-${settings.fontFamily}`);
  }, [settings.theme, settings.fontFamily]);

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
    <main className="p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{ui.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto">
          <FileTextInput onLoadText={setText} lang={lang} />
        </div>
        <button
          className="px-3 py-2 rounded bg-neutral-200 hover:bg-neutral-300 text-sm w-full sm:w-auto"
          onClick={() => {
            const norm = normalizeUILang(lang) as "it" | "en";
            const existing = samples[norm];
            if (existing) setText(existing);
            else fetchSample(norm).then(setText);
          }}
          type="button"
        >
          {ui.loadDemo}
        </button>
        <button
          className="px-3 py-2 rounded bg-neutral-200 hover:bg-neutral-300 text-sm w-full sm:w-auto"
          onClick={saveScript}
          type="button"
        >
          Save
        </button>
      </div>
      {/* Minimal header controls moved to Settings page */}

      <Teleprompter
        text={text}
        baseWpm={settings.baseWpm}
        holdOnSilence={settings.holdOnSilence}
        lang={lang}
        fontSizePx={settings.fontSizePx}
        mirror={settings.mirror}
        manualPauseMs={settings.manualPauseMs}
        useMicWhileASR={settings.useMicWhileASR}
        useAsrDerivedDrift={settings.useAsrDerivedDrift}
        asrWindowScreens={settings.asrWindowScreens}
        asrSnapMode={settings.asrSnapMode}
        stickyThresholdPx={settings.stickyThresholdPx}
        asrLeadWords={settings.asrLeadWords}
        lockToHighlight={settings.lockToHighlight}
        showDebug={settings.showDebug}
      />
      {showOnboard && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6 text-white text-center">
          <div className="bg-neutral-800 p-6 rounded max-w-md">
            <p className="mb-4">Allow microphone access and use the controls below to start or stop the teleprompter.</p>
            <button
              className="px-3 py-1 rounded bg-emerald-600"
              onClick={() => {
                setShowOnboard(false);
                try { localStorage.setItem("tp:onboarded", "1"); } catch {}
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
