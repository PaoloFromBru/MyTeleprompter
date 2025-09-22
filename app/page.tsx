"use client";
import { useCallback, useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import SaveScriptDialog from "@/components/SaveScriptDialog";
import { messages, normalizeUILang } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { useSettings } from "@/hooks/useSettings";

type SampleTexts = { it?: string; en?: string; fr?: string; nl?: string };
type ScriptState = { mode: "custom" } | { mode: "sample"; sampleLang: "it"|"en"|"fr"|"nl" };

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  const [loaded, setLoaded] = useState(false);
  const [scriptState, setScriptState] = useState<ScriptState>({ mode: "custom" });
  const { settings, update: updateSettings } = useSettings();
  const [samples, setSamples] = useState<SampleTexts>({});
  const [text, setText] = useState("");
  const setCustomText = (t: string) => {
    setText(t);
    try {
      localStorage.setItem("tp:currentScript", t);
      localStorage.setItem("tp:scriptState", JSON.stringify({ mode: "custom" } satisfies ScriptState));
      localStorage.removeItem("tp:textMode");
    } catch {}
    setScriptState({ mode: "custom" });
  };
  const setSampleText = (l: "it"|"en"|"fr"|"nl", t: string) => {
    setText(t);
    try {
      localStorage.setItem("tp:currentScript", t);
      localStorage.setItem("tp:scriptState", JSON.stringify({ mode: "sample", sampleLang: l } satisfies ScriptState));
      localStorage.removeItem("tp:textMode");
    } catch {}
    setScriptState({ mode: "sample", sampleLang: l });
  };
  const detachSample = () => {
    // Keep current text, just stop following language
    try {
      localStorage.setItem("tp:scriptState", JSON.stringify({ mode: "custom" } satisfies ScriptState));
      localStorage.removeItem("tp:textMode");
    } catch {}
    setScriptState({ mode: "custom" });
  };
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const openSaveDialog = () => setShowSaveDialog(true);
  const closeSaveDialog = () => setShowSaveDialog(false);
  const onConfirmSave = (title: string) => {
    try {
      const raw = localStorage.getItem("tp:scripts");
      const arr = raw ? JSON.parse(raw) : [];
      const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as Crypto).randomUUID()
        : String(Date.now());
      arr.push({ id, title, text });
      localStorage.setItem("tp:scripts", JSON.stringify(arr));
      toast(ui.savedNotice, "success");
      setShowSaveDialog(false);
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
      const cur = localStorage.getItem("tp:currentScript");
      const legacyMode = localStorage.getItem("tp:textMode");
      const stateRaw = localStorage.getItem("tp:scriptState");
      let state: ScriptState | null = null;
      if (stateRaw) {
        try { state = JSON.parse(stateRaw) as ScriptState; } catch {}
      } else if (legacyMode) {
        const m = /^sample:(it|en|fr|nl)$/.exec(legacyMode || "");
        state = m ? { mode: "sample", sampleLang: m[1] as "it"|"en"|"fr"|"nl" } : { mode: "custom" };
      }
      if (cur) setText(cur);
      if (state) setScriptState(state);
      if (!cur) {
        // No current script persisted; fallback to Italian sample
        fetchSample("it").then((txt) => setSampleText("it", txt));
      }
      if (!localStorage.getItem("tp:onboarded")) setShowOnboard(true);
    } catch {
      fetchSample("it").then((txt) => setSampleText("it", txt));
    }
    setLoaded(true);
  }, [fetchSample]);
  // Keep language in sync with Settings changes (including on mobile)
  useEffect(() => {
    const sync = () => {
      try {
        const l = localStorage.getItem("tp:lang");
        if (l) setLang(l);
      } catch {}
    };
    const onStorage = (e: StorageEvent) => { if (e.key === "tp:lang") sync(); };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("tp:langchange", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("tp:langchange", onCustom as EventListener);
    };
  }, [updateSettings]);
  const ui = messages[normalizeUILang(lang)];
  useEffect(() => {
    // If in sample mode, keep sample coupled to the UI language
    const norm = normalizeUILang(lang) as "it" | "en" | "fr" | "nl";
    if (scriptState.mode !== "sample") return;
    if (scriptState.sampleLang !== norm) {
      // Update state and load the new sample text
      const apply = (txt: string) => setSampleText(norm, txt);
      if (samples[norm]) apply(samples[norm]!);
      else fetchSample(norm).then(apply);
    } else {
      // Ensure text present for current sampleLang
      const apply = (txt: string) => setSampleText(norm, txt);
      if (!text && samples[norm]) apply(samples[norm]!);
    }
  }, [lang, scriptState, samples, fetchSample, text]);
  // Persist language
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
    try { localStorage.setItem("tp:currentScript", text); } catch {}
  }, [text, loaded]);


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
        updateSettings((s) => ({ mirror: !s.mirror }));
      } else if (e.key === "+" || (e.key === "=" && e.shiftKey)) {
        e.preventDefault();
        updateSettings((s) => ({ fontSizePx: clamp((s.fontSizePx ?? 32) + 2) }));
      } else if (e.key === "-") {
        e.preventDefault();
        updateSettings((s) => ({ fontSizePx: clamp((s.fontSizePx ?? 32) - 2) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [updateSettings]);
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
        {scriptState.mode === "sample" && (
          <button
            className="btn btn-secondary w-full sm:w-auto"
            onClick={detachSample}
            type="button"
          >
            {ui.detachSampleLabel}
          </button>
        )}
        <button
          className="btn btn-secondary w-full sm:w-auto"
          onClick={openSaveDialog}
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
      {/* Save dialog */}
      <SaveScriptDialog
        lang={lang}
        open={showSaveDialog}
        onClose={closeSaveDialog}
        initialTitle={deriveDefaultTitle(text)}
        onConfirm={onConfirmSave}
      />
    </div>
  );
}

function deriveDefaultTitle(text: string) {
  const firstNonEmpty = text.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0) || "";
  const t = firstNonEmpty || "Untitled";
  return t.length > 80 ? t.slice(0, 77) + "…" : t;
}
