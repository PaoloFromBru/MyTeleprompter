"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type Theme = "light" | "dark" | "sepia" | "contrast";
export type FontFamily = "sans" | "serif";
export type SnapMode = "gentle" | "aggressive" | "instant" | "sticky";

export type Settings = {
  fontSizePx: number;
  mirror: boolean;
  baseWpm: number;
  holdOnSilence: boolean;
  manualPauseMs: number;
  useMicWhileASR: boolean;
  useAsrDerivedDrift: boolean;
  asrWindowScreens: 1 | 2 | 4;
  asrSnapMode: SnapMode;
  stickyThresholdPx: number;
  asrLeadWords: number;
  lockToHighlight: boolean;
  showDebug: boolean;
  theme: Theme;
  fontFamily: FontFamily;
};

export const defaultSettings: Settings = {
  fontSizePx: 32,
  mirror: false,
  baseWpm: 140,
  holdOnSilence: true,
  manualPauseMs: 500,
  useMicWhileASR: true,
  useAsrDerivedDrift: false,
  asrWindowScreens: 1,
  asrSnapMode: "aggressive",
  stickyThresholdPx: 16,
  asrLeadWords: 2,
  lockToHighlight: false,
  showDebug: false,
  theme: "light",
  fontFamily: "sans",
};

function applyBodyTheme(theme: Theme, font: FontFamily) {
  try {
    const themes = ["theme-light","theme-dark","theme-sepia","theme-contrast"];
    document.body.classList.remove(...themes);
    document.body.classList.add(`theme-${theme}`);
    const fonts = ["font-sans","font-serif"];
    document.body.classList.remove(...fonts);
    document.body.classList.add(`font-${font}`);
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const loadedRef = useRef(false);

  // Load settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tp:settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((s) => ({ ...s, ...parsed }));
        const th = parsed?.theme ?? defaultSettings.theme;
        const ff = parsed?.fontFamily ?? defaultSettings.fontFamily;
        applyBodyTheme(th, ff);
      } else {
        applyBodyTheme(defaultSettings.theme, defaultSettings.fontFamily);
      }
    } finally {
      loadedRef.current = true;
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem("tp:settings", JSON.stringify(settings));
      window.dispatchEvent(new Event("tp:settingschange"));
    } catch {}
  }, [settings]);

  // Apply theme/font when they change
  useEffect(() => {
    applyBodyTheme(settings.theme, settings.fontFamily);
  }, [settings.theme, settings.fontFamily]);

  type Patch = Partial<Settings> | ((prev: Settings) => Partial<Settings>);
  const update = useCallback((patch: Patch) => {
    setSettings((prev) => {
      const next = typeof patch === "function" ? { ...prev, ...(patch as (p: Settings) => Partial<Settings>)(prev) } : { ...prev, ...patch };
      // mutual exclusion helpers if needed could be applied here later
      return next;
    });
  }, []);

  return { settings, update } as const;
}

