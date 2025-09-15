"use client";
import { useEffect, useState } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";

export default function SettingsPage() {
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
  const ui = messages[normalizeUILang(lang)];

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("tp:lang");
      if (savedLang) setLang(savedLang);
      const raw = localStorage.getItem("tp:settings");
      if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("tp:lang", lang);
      window.dispatchEvent(new Event("tp:langchange"));
    } catch {}
  }, [lang, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("tp:settings", JSON.stringify(settings)); } catch {} }, [settings, loaded]);
  useEffect(() => {
    const themes = ["theme-light","theme-dark","theme-sepia","theme-contrast"];
    document.body.classList.remove(...themes);
    document.body.classList.add(`theme-${settings.theme}`);
    const fonts = ["font-sans","font-serif"];
    document.body.classList.remove(...fonts);
    document.body.classList.add(`font-${settings.fontFamily}`);
  }, [settings.theme, settings.fontFamily]);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{ui.settingsTitle}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{ui.settingsIntro}</p>
      </div>

      {/* General */}
      <section className="card p-4 md:p-5 space-y-4">
        <h2 className="font-medium">{ui.sectionGeneralTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <span>{ui.langLabel}</span>
            <select className="select" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="it-IT">Italiano (it-IT)</option>
              <option value="en-US">English (en-US)</option>
              <option value="fr-FR">Français (fr-FR)</option>
              <option value="nl-NL">Nederlands (nl-NL)</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>{ui.themeLabel}</span>
            <select className="select" value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value as "light"|"dark"|"sepia"|"contrast" }))}>
              <option value="light">{ui.themeLight}</option>
              <option value="dark">{ui.themeDark}</option>
              <option value="sepia">{ui.themeSepia}</option>
              <option value="contrast">{ui.themeContrast}</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span>{ui.fontLabel}</span>
            <select className="select" value={settings.fontFamily} onChange={(e) => setSettings((s) => ({ ...s, fontFamily: e.target.value as "sans"|"serif" }))}>
              <option value="sans">{ui.fontSans}</option>
              <option value="serif">{ui.fontSerif}</option>
            </select>
          </label>
        </div>
      </section>

      {/* Typography & Display */}
      <section className="card p-4 md:p-5 space-y-4">
        <h2 className="font-medium">{ui.sectionTypographyTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-4 items-center">
          <label className="flex items-center gap-2">
            <span>{ui.fontSizeLabel}</span>
            <input type="range" min={20} max={72} step={1} value={settings.fontSizePx} onChange={(e) => setSettings((s) => ({ ...s, fontSizePx: Number(e.target.value) }))} />
            <span className="tabular-nums w-10 text-right">{settings.fontSizePx}px</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.mirror} onChange={(e) => setSettings((s) => ({ ...s, mirror: e.target.checked }))} />
            <span>{ui.mirrorModeLabel}</span>
          </label>
        </div>
      </section>

      {/* Mic & Scrolling */}
      <section className="card p-4 md:p-5 space-y-4">
        <h2 className="font-medium">{ui.sectionMicScrollingTitle}</h2>
        <div className="grid sm:grid-cols-3 gap-4 items-center">
          <label className="flex items-center gap-2">
            <span>{ui.baseWpmLabel}</span>
            <input type="number" min={60} max={260} step={5} className="w-24 input" value={settings.baseWpm} onChange={(e) => setSettings((s) => ({ ...s, baseWpm: Number(e.target.value) }))} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.holdOnSilence} onChange={(e) => setSettings((s) => ({ ...s, holdOnSilence: e.target.checked }))} />
            <span>{ui.holdOnSilenceLabel}</span>
          </label>
          <label className="flex items-center gap-2">
            <span>{ui.asrResumeDelayLabel}</span>
            <input type="number" min={0} max={3000} step={50} className="w-24 input" value={settings.manualPauseMs} onChange={(e) => setSettings((s) => ({ ...s, manualPauseMs: Number(e.target.value) }))} />
          </label>
        </div>
      </section>

      {/* ASR follow & drift */}
      <section className="card p-4 md:p-5 space-y-3">
        <h2 className="font-medium">{ui.sectionAsrFollowTitle}</h2>
        <div className="flex flex-col gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.useMicWhileASR} onChange={(e) => setSettings((s) => ({ ...s, useMicWhileASR: e.target.checked, useAsrDerivedDrift: e.target.checked ? false : s.useAsrDerivedDrift }))} />
            <span>{ui.micDriftWhileASRLabel}</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.useAsrDerivedDrift} onChange={(e) => setSettings((s) => ({ ...s, useAsrDerivedDrift: e.target.checked, useMicWhileASR: e.target.checked ? false : s.useMicWhileASR }))} />
            <span>{ui.asrDerivedDriftLabel}</span>
          </label>
          <p className="text-neutral-600 dark:text-neutral-400">{ui.asrDriftMutualExclusionHelp}</p>
        </div>
      </section>

      {/* ASR visualization */}
      <section className="card p-4 md:p-5 space-y-4">
        <h2 className="font-medium">{ui.sectionAsrVisualizationTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm items-center">
          <label className="inline-flex items-center gap-2">
            <span>{ui.asrWindowLabel}</span>
            <select className="select" value={settings.asrWindowScreens} onChange={(e) => setSettings((s) => ({ ...s, asrWindowScreens: Number(e.target.value) as 1|2|4 }))}>
              <option value={1}>{ui.asrWindowViewport}</option>
              <option value={2}>{ui.asrWindowViewport2x}</option>
              <option value={4}>{ui.asrWindowWide}</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <span>{ui.asrSnapMode}</span>
            <select className="select" value={settings.asrSnapMode} onChange={(e) => setSettings((s) => ({ ...s, asrSnapMode: (e.target.value as ("gentle"|"aggressive"|"instant"|"sticky")) }))}>
              <option value="gentle">{ui.asrSnapGentle}</option>
              <option value="aggressive">{ui.asrSnapAggressive}</option>
              <option value="instant">{ui.asrSnapInstant}</option>
              <option value="sticky">{ui.asrSnapSticky}</option>
            </select>
          </label>
          {settings.asrSnapMode === "sticky" && (
            <label className="inline-flex items-center gap-2">
              <span>{ui.asrStickyThreshold}</span>
              <input type="number" min={4} max={48} step={2} className="w-20 input" value={settings.stickyThresholdPx} onChange={(e) => setSettings((s) => ({ ...s, stickyThresholdPx: Number(e.target.value) }))} />
            </label>
          )}
          <label className="inline-flex items-center gap-2">
            <span>{ui.asrLeadLabel}</span>
            <select className="select" value={settings.asrLeadWords} onChange={(e) => setSettings((s) => ({ ...s, asrLeadWords: Number(e.target.value) }))}>
              {[0,1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.lockToHighlight} onChange={(e) => setSettings((s) => ({ ...s, lockToHighlight: e.target.checked }))} />
            <span>{ui.lockToHighlightLabel}</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={settings.showDebug} onChange={(e) => setSettings((s) => ({ ...s, showDebug: e.target.checked }))} />
            <span>{ui.debugOverlayLabel}</span>
          </label>
        </div>
      </section>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">{ui.settingsFooterNote}</p>
    </div>
  );
}
