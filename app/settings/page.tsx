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
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("tp:lang", lang); } catch {} }, [lang, loaded]);
  useEffect(() => { if (!loaded) return; try { localStorage.setItem("tp:settings", JSON.stringify(settings)); } catch {} }, [settings, loaded]);

  return (
    <div className="py-6 space-y-6">
      <h1 className="text-xl font-semibold">{ui.settingsTitle}</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2">
          <span>{ui.langLabel}</span>
          <select
            className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="it-IT">Italiano (it-IT)</option>
            <option value="en-US">English (en-US)</option>
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span>{ui.fontSizeLabel}</span>
          <input type="range" min={20} max={72} step={1} value={settings.fontSizePx}
            onChange={(e) => setSettings((s) => ({ ...s, fontSizePx: Number(e.target.value) }))} />
          <span className="tabular-nums w-10 text-right">{settings.fontSizePx}px</span>
        </label>

        <label className="flex items-center gap-2">
          <span>ASR resume delay (ms)</span>
          <input type="number" min={0} max={3000} step={50}
            className="w-24 bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
            value={settings.manualPauseMs}
            onChange={(e) => setSettings((s) => ({ ...s, manualPauseMs: Number(e.target.value) }))} />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.mirror}
            onChange={(e) => setSettings((s) => ({ ...s, mirror: e.target.checked }))} />
          <span>{ui.mirrorModeLabel}</span>
        </label>

        <label className="flex items-center gap-2">
          <span>{ui.baseWpmLabel}</span>
          <input type="number" min={60} max={260} step={5}
            className="w-24 bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
            value={settings.baseWpm}
            onChange={(e) => setSettings((s) => ({ ...s, baseWpm: Number(e.target.value) }))} />
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.holdOnSilence}
            onChange={(e) => setSettings((s) => ({ ...s, holdOnSilence: e.target.checked }))} />
          <span>{ui.holdOnSilenceLabel}</span>
        </label>

        <div className="col-span-full border-t pt-3 mt-1">
          <div className="font-medium mb-2">Scrolling between ASR matches</div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.useMicWhileASR}
                onChange={(e) => setSettings((s) => ({ ...s, useMicWhileASR: e.target.checked, useAsrDerivedDrift: e.target.checked ? false : s.useAsrDerivedDrift }))}
              />
              <span>Mic drift while ASR</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.useAsrDerivedDrift}
                onChange={(e) => setSettings((s) => ({ ...s, useAsrDerivedDrift: e.target.checked, useMicWhileASR: e.target.checked ? false : s.useMicWhileASR }))}
              />
              <span>ASR-derived drift (between matches)</span>
            </label>
            <p className="opacity-80">Only one can be active at a time. If both are off, the text advances only on ASR matches (or when unlocked, by base WPM during silence).</p>
          </div>
        </div>

        <div className="col-span-full border-t pt-3 mt-1">
          <div className="font-medium mb-2">ASR visualization and snap</div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <span>{ui.asrWindowLabel}</span>
              <select
                className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
                value={settings.asrWindowScreens}
                onChange={(e) => setSettings((s) => ({ ...s, asrWindowScreens: Number(e.target.value) as 1|2|4 }))}
              >
                <option value={1}>{ui.asrWindowViewport}</option>
                <option value={2}>{ui.asrWindowViewport2x}</option>
                <option value={4}>{ui.asrWindowWide}</option>
              </select>
            </label>

            <label className="inline-flex items-center gap-2">
              <span>{ui.asrSnapMode}</span>
              <select
                className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
                value={settings.asrSnapMode}
                onChange={(e) => setSettings((s) => ({ ...s, asrSnapMode: (e.target.value as ("gentle"|"aggressive"|"instant"|"sticky")) }))}
              >
                <option value="gentle">{ui.asrSnapGentle}</option>
                <option value="aggressive">{ui.asrSnapAggressive}</option>
                <option value="instant">Instant</option>
                <option value="sticky">Sticky</option>
              </select>
            </label>

            {settings.asrSnapMode === "sticky" && (
              <label className="inline-flex items-center gap-2">
                <span>Threshold (px)</span>
                <input type="number" min={4} max={48} step={2}
                  className="w-20 bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
                  value={settings.stickyThresholdPx}
                  onChange={(e) => setSettings((s) => ({ ...s, stickyThresholdPx: Number(e.target.value) }))}
                />
              </label>
            )}

            <label className="inline-flex items-center gap-2">
              <span>ASR lead</span>
              <select
                className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
                value={settings.asrLeadWords}
                onChange={(e) => setSettings((s) => ({ ...s, asrLeadWords: Number(e.target.value) }))}
              >
                {[0,1,2,3,4].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>

            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={settings.lockToHighlight}
                onChange={(e) => setSettings((s) => ({ ...s, lockToHighlight: e.target.checked }))} />
              <span>{ui.lockToHighlightLabel}</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={settings.showDebug}
                onChange={(e) => setSettings((s) => ({ ...s, showDebug: e.target.checked }))} />
              <span>{ui.debugOverlayLabel}</span>
            </label>
          </div>
        </div>
      </div>
      <p className="text-sm opacity-80">These settings are saved locally and used by the teleprompter on the home page.</p>
    </div>
  );
}
