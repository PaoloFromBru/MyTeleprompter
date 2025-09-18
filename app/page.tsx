"use client";
import { useCallback, useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import { messages, normalizeUILang } from "@/lib/i18n";
import { toast } from "@/lib/toast";

type SampleTexts = { it?: string; en?: string; fr?: string; nl?: string };

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  const [loaded, setLoaded] = useState(false);
  const [textMode, setTextMode] = useState<string>("");
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
  const setCustomText = (t: string) => {
    setText(t);
    try {
      localStorage.setItem("tp:currentScript", t);
      localStorage.setItem("tp:textMode", "custom");
    } catch {}
    setTextMode("custom");
  };
  const setSampleText = (l: "it"|"en"|"fr"|"nl", t: string) => {
    setText(t);
    try {
      localStorage.setItem("tp:currentScript", t);
      localStorage.setItem("tp:textMode", `sample:${l}`);
    } catch {}
    setTextMode(`sample:${l}`);
  };
  const saveScript = () => {
    const title = prompt("Title for this script?");
    if (!title) return;
    try {
      const raw = localStorage.getItem("tp:scripts");
      const arr = raw ? JSON.parse(raw) : [];
      arr.push({ id: Date.now(), title, text });
      localStorage.setItem("tp:scripts", JSON.stringify(arr));
      toast(ui.savedNotice, "success");
    } catch (err) {
      console.error("Failed to save script", err);
      toast("Failed to save script", "error");
    }
  };
  const [showOnboard, setShowOnboard] = useState(false);
  const stripBlankLines = (s: string) => s.split(/\r?\n/).filter((ln) => ln.trim() !== "").join("\n");
  const fetchSample = useCallback(async (l: "it" | "en" | "fr" | "nl") => {
    try {
      const res = await fetch(`/samples/${l}.txt`);
      const raw = await res.text();
      const txt = stripBlankLines(raw);
      setSamples((s) => ({ ...s, [l]: txt }));
      return txt;
    } catch (err) {
      console.error("Failed to load sample", err);
      toast("Failed to load demo text", "error");
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
      const mode = localStorage.getItem("tp:textMode");
      if (cur) {
        setText(cur);
        if (!mode) {
          try { localStorage.setItem("tp:textMode", "custom"); } catch {}
          setTextMode("custom");
        } else {
          // If mode says sample:X but current text differs from that sample, correct to custom
          const m = /^sample:(it|en|fr|nl)$/.exec(mode || "");
          if (m) {
            const smLang = m[1] as "it"|"en"|"fr"|"nl";
            const applyComparison = (sampleTxt: string) => {
              if (sampleTxt && sampleTxt !== cur) {
                try { localStorage.setItem("tp:textMode", "custom"); } catch {}
                setTextMode("custom");
              } else {
                setTextMode(mode);
              }
            };
            if (samples[smLang]) applyComparison(samples[smLang]!);
            else fetchSample(smLang).then(applyComparison);
          } else {
            setTextMode(mode);
          }
        }
      } else {
        // No current script persisted; fallback to Italian sample
        fetchSample("it").then((txt) => setSampleText("it", txt));
      }
      if (!localStorage.getItem("tp:onboarded")) setShowOnboard(true);
    } catch {
      fetchSample("it").then((txt) => setSampleText("it", txt));
    }
    setLoaded(true);
  }, [fetchSample]);
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => {
    const norm = normalizeUILang(lang) as "it" | "en" | "fr" | "nl";
    if (!textMode.startsWith("sample")) return;
    const apply = (txt: string) => setSampleText(norm, txt);
    if (samples[norm]) apply(samples[norm]!);
    else fetchSample(norm).then(apply);
  }, [lang, textMode, samples, fetchSample]);
  // Persist settings and language
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("tp:lang", lang);
      window.dispatchEvent(new Event("tp:langchange"));
    } catch (err) {
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
    if (!loaded) return;
    try { localStorage.setItem("tp:currentScript", text); } catch {}
  }, [text, loaded]);

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
    <div className="space-y-5">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-indigo-500">
          {ui.title}
        </span>
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-auto">
          <FileTextInput onLoadText={setCustomText} lang={lang} />
        </div>
        <button
          className="btn btn-primary w-full sm:w-auto"
          onClick={() => {
            const norm = normalizeUILang(lang) as "it" | "en" | "fr" | "nl";
            const existing = samples[norm];
            if (existing) setSampleText(norm, existing);
            else fetchSample(norm).then((txt) => setSampleText(norm, txt));
          }}
          type="button"
        >
          {ui.loadDemo}
        </button>
        <button
          className="btn btn-secondary w-full sm:w-auto"
          onClick={saveScript}
          type="button"
        >
          {ui.saveLabel}
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
            <p className="mb-4">{ui.onboardText}</p>
            <button
              className="px-3 py-1 rounded bg-emerald-600"
              onClick={() => {
                setShowOnboard(false);
                try { localStorage.setItem("tp:onboarded", "1"); } catch {}
              }}
            >
              {ui.gotItLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
