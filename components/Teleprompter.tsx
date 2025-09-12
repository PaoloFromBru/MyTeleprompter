"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicSpeechRate } from "@/hooks/useMicSpeechRate";
import { useSpeechSync } from "@/hooks/useSpeechSync";

type Props = {
  text: string;
  baseWpm?: number;
  holdOnSilence?: boolean;
  lang?: string;
  fontSizePx?: number;
  mirror?: boolean;
};

import { messages, normalizeUILang } from "@/lib/i18n";

export default function Teleprompter({ text, baseWpm = 140, holdOnSilence = true, lang, fontSizePx, mirror = false }: Props) {
  const { start, stop, listening, permission, wpm, talking } = useMicSpeechRate({
    smoothingSecs: 1.6, minDbThreshold: -52, ema: 0.25,
  });
  const ANCHOR_RATIO = 0.35; // keep target ~35% from top
  const ui = messages[normalizeUILang(lang)];
  const [asrEnabled, setAsrEnabled] = useState(false);
  const [asrWindowScreens, setAsrWindowScreens] = useState<1 | 2 | 4>(1);
  const [asrSnapMode, setAsrSnapMode] = useState<"gentle" | "aggressive">("aggressive");
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const { supported: asrSupported, matchedIndex, lastMatchAt, lastTranscript, reset: resetASR } = useSpeechSync({
    text,
    lang: lang || "it-IT",
    enabled: asrEnabled,
    windowRadius: 500,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef   = useRef<HTMLDivElement | null>(null);

  const words = useMemo(() =>
    text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean), [text]
  );
  // Tokenization similar to ASR side for mapping ASR index -> word index
  function normalizeTokenLocal(s: string) {
    return s
      .toLowerCase()
      // Remove diacritics
      .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
      // Keep only letters/numbers
      .replace(/[^\p{L}\p{N}]+/gu, "")
      .trim();
  }
  const tokensLen = useMemo(() =>
    text.split(/\s+/).map(normalizeTokenLocal).filter(Boolean).length
  , [text]);
  const totalWords = words.length;
  const tokenToWordRatio = useMemo(() => totalWords / Math.max(1, tokensLen), [totalWords, tokensLen]);

  const [pxPerWord, setPxPerWord] = useState(2);
  useEffect(() => {
    const calc = () => {
      const cont = containerRef.current, content = contentRef.current;
      if (!cont || !content || totalWords === 0) return;
      const usable = content.scrollHeight - cont.clientHeight;
      setPxPerWord(Math.max(1, usable / Math.max(1, totalWords)));
    };
    const id = setTimeout(calc, 50);
    // On mobile, orientation changes trigger a resize; listening to resize is enough
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", calc);
    };
  }, [text, totalWords, fontSizePx]);

  const wordsReadRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const integratorRef = useRef(0);

  // Mirror hook values into refs for the rAF loop (avoid effect deps churn)
  const wpmRef = useRef(wpm);
  const talkingRef = useRef(talking);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { talkingRef.current = talking; }, [talking]);
  const speechIdxRef = useRef<number | null>(null);
  // Accept ASR matches only if they are within the allowed visible window and forward-only
  useEffect(() => {
    if (matchedIndex == null) return;
    const cont = containerRef.current;
    if (!cont) { speechIdxRef.current = matchedIndex; return; }
    const visibleWords = cont.clientHeight / Math.max(1, pxPerWord);
    const currentWords = wordsReadRef.current;
    const above = ANCHOR_RATIO * visibleWords * asrWindowScreens;
    const below = (1 - ANCHOR_RATIO) * visibleWords * asrWindowScreens;
    const minWord = Math.max(0, currentWords - above);
    const maxWord = Math.min(totalWords, currentWords + below);
    const currentTok = Math.round(currentWords / Math.max(1e-6, tokenToWordRatio));
    const minTok = Math.floor(minWord / Math.max(1e-6, tokenToWordRatio));
    const maxTok = Math.ceil(maxWord / Math.max(1e-6, tokenToWordRatio));
    if (matchedIndex >= Math.max(currentTok, minTok) && matchedIndex <= maxTok) {
      speechIdxRef.current = matchedIndex;
    }
  }, [matchedIndex, pxPerWord, asrWindowScreens, tokenToWordRatio, totalWords]);
  // On Android Chrome, ASR and WebAudio may contend for the mic.
  // If ASR is enabled while mic listening, stop the mic to avoid conflicts.
  useEffect(() => {
    if (asrEnabled && listening) stop();
  }, [asrEnabled, listening, stop]);
  const [recentAsr, setRecentAsr] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setRecentAsr(!!lastMatchAt && Date.now() - lastMatchAt < 2000);
    }, 400);
    return () => clearInterval(id);
  }, [lastMatchAt]);

  const reset = () => {
    wordsReadRef.current = 0;
    integratorRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    try { resetASR(); } catch {}
  };

  // Avoid hydration mismatch: detect client and feature support after mount
  const [isClient, setIsClient] = useState(false);
  const [micSupported, setMicSupported] = useState<boolean | null>(null);
  useEffect(() => {
    setIsClient(true);
    try {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      const supported = !!(
        nav && ((nav.mediaDevices && nav.mediaDevices.getUserMedia) ||
        ("webkitGetUserMedia" in nav) || ("mozGetUserMedia" in nav) || ("getUserMedia" in nav))
      );
      setMicSupported(supported);
    } catch {
      setMicSupported(false);
    }
  }, []);

  const nudgeByViewport = useCallback((sign: 1 | -1) => {
    const cont = containerRef.current;
    const deltaWords = cont ? (cont.clientHeight / Math.max(1, pxPerWord)) * 0.15 : 10;
    wordsReadRef.current = Math.max(0, Math.min(totalWords, wordsReadRef.current + sign * deltaWords));
    integratorRef.current = 0;
  }, [pxPerWord, totalWords]);

  // Re-anchor when geometry changes: keep current scroll aligned to anchor
  useEffect(() => {
    const cont = containerRef.current, content = contentRef.current;
    if (!cont || !content) return;
    const targetWords = (cont.scrollTop + cont.clientHeight * ANCHOR_RATIO) / Math.max(1, pxPerWord);
    wordsReadRef.current = Math.max(0, Math.min(totalWords, targetWords));
    integratorRef.current = 0; // avoid windup after jumps
  }, [pxPerWord, totalWords]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      const now = performance.now();
      if (lastTsRef.current == null) lastTsRef.current = now;
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      const wordsPerSec = (wpmRef.current || 0) / 60;
      let next = wordsReadRef.current;
      if (talkingRef.current) next += wordsPerSec * dt;
      else if (!holdOnSilence) next += (0.15 * (baseWpm / 60)) * dt;
      wordsReadRef.current = Math.max(0, Math.min(totalWords, next));

      // If ASR provides a match ahead (within window), apply correction per snap mode
      if (speechIdxRef.current != null) {
        const targetIdxWords = Math.min(totalWords, Math.round((speechIdxRef.current + 1) * tokenToWordRatio));
        if (targetIdxWords > wordsReadRef.current + 0.25) {
          if (asrSnapMode === "aggressive") {
            wordsReadRef.current = targetIdxWords;
            integratorRef.current = 0;
            const cont2 = containerRef.current, content2 = contentRef.current;
            if (cont2 && content2) {
              const target = Math.max(0,
                Math.min(
                  content2.scrollHeight - cont2.clientHeight,
                  wordsReadRef.current * pxPerWord - cont2.clientHeight * ANCHOR_RATIO
                )
              );
              cont2.scrollTop = target;
            }
          } else {
            // Gentle: move toward target gradually (forward only)
            const diff = targetIdxWords - wordsReadRef.current;
            wordsReadRef.current += Math.max(0, diff * 0.25);
          }
        }
      }

      const cont = containerRef.current, content = contentRef.current;
      if (cont && content) {
        const target = Math.max(0,
          Math.min(
            content.scrollHeight - cont.clientHeight,
            wordsReadRef.current * pxPerWord - cont.clientHeight * ANCHOR_RATIO
          )
        );
        // Follow target quickly with easing to avoid lag and oscillation
        const alpha = Math.min(1, dt * 10); // ~100ms time constant
        cont.scrollTop = cont.scrollTop + (target - cont.scrollTop) * alpha;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [baseWpm, pxPerWord, holdOnSilence, totalWords, tokenToWordRatio, asrSnapMode]);

  // Keyboard shortcuts: space(start/stop), up/down(nudge), f(fullscreen)
  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = (el as HTMLElement).tagName;
      const editable = (el as HTMLElement).isContentEditable;
      return editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (permission !== "granted") start();
        else {
          if (listening) stop(); else start();
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeByViewport(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeByViewport(1);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        const cont = containerRef.current;
        if (!cont) return;
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          try { cont.requestFullscreen(); } catch {}
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, permission, start, stop, pxPerWord, totalWords, nudgeByViewport]);

  return (
    <div className="w-full mx-auto max-w-3xl">
      {/* Mobile compact toolbar */}
      <div className="flex sm:hidden items-center justify-between mb-2 gap-2 h-[44px]">
        <div className="flex items-center gap-1">
          <button
            onClick={permission !== "granted" ? start : (listening ? stop : start)}
            className={`p-2 rounded ${listening ? "bg-sky-600 hover:bg-sky-500" : "bg-emerald-600 hover:bg-emerald-500"} text-white`}
            aria-label={permission !== "granted" ? ui.micEnable : (listening ? ui.stop : ui.start)}
            title={permission !== "granted" ? ui.micEnable : (listening ? ui.stop : ui.start)}
            disabled={isClient ? micSupported === false : undefined}
          >
            {/* mic icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10a7 7 0 0 1-14 0"/>
              <path d="M12 17v5"/>
            </svg>
          </button>
          <button
            onClick={reset}
            className="p-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            aria-label={ui.reset}
            title={ui.reset}
            type="button"
          >
            {/* reset icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => nudgeByViewport(-1)}
            className="p-2 rounded bg-neutral-600 hover:bg-neutral-500 text-white"
            aria-label={ui.nudgeBackTitle}
            title={ui.nudgeBackTitle}
            type="button"
          >
            {/* up icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button
            onClick={() => nudgeByViewport(1)}
            className="p-2 rounded bg-neutral-600 hover:bg-neutral-500 text-white"
            aria-label={ui.nudgeForwardTitle}
            title={ui.nudgeForwardTitle}
            type="button"
          >
            {/* down icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAsrEnabled((v) => !v)}
            className={`p-2 rounded text-white ${asrEnabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-neutral-600 hover:bg-neutral-500"}`}
            aria-label={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle}
            title={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle}
            type="button"
            disabled={!asrSupported}
          >
            {/* waveform icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h2M7 12h2M11 12h2M15 12h2M19 12h2"/>
              <path d="M7 8v8M11 6v12M15 8v8"/>
            </svg>
          </button>
          <span className="text-xs tabular-nums px-1">{Math.round(wpm)} WPM</span>
          {asrEnabled && (
            <span className={`inline-block w-2 h-2 rounded-full ${recentAsr ? "bg-emerald-400" : "bg-neutral-400"}`} title="Recent ASR match" />
          )}
          <button
            onClick={() => setShowMobileSettings((v) => !v)}
            className="p-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            aria-label={ui.settingsTitle}
            title={ui.settingsTitle}
            type="button"
          >
            {/* gear icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 8c.36.31.59.76.59 1.25S20.76 10.69 20.4 11a1.65 1.65 0 0 0-.33 1.82z"/>
            </svg>
          </button>
        </div>
      </div>

      {showMobileSettings && (
        <div className="sm:hidden mb-3 text-xs flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1">
            <span>{ui.asrWindowLabel}</span>
            <select
              className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
              value={asrWindowScreens}
              onChange={(e) => setAsrWindowScreens(Number(e.target.value) as 1 | 2 | 4)}
            >
              <option value={1}>{ui.asrWindowViewport}</option>
              <option value={2}>{ui.asrWindowViewport2x}</option>
              <option value={4}>{ui.asrWindowWide}</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-1">
            <span>{ui.asrSnapMode}</span>
            <select
              className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
              value={asrSnapMode}
              onChange={(e) => setAsrSnapMode((e.target.value as "gentle" | "aggressive"))}
            >
              <option value="gentle">{ui.asrSnapGentle}</option>
              <option value="aggressive">{ui.asrSnapAggressive}</option>
            </select>
          </label>
        </div>
      )}

      {/* Desktop toolbar */}
      <div className="hidden sm:flex items-center justify-between mb-3 gap-2 h-[44px] min-h-[44px] overflow-hidden">
        <div className="flex items-center gap-2 whitespace-nowrap">
          {permission !== "granted" ? (
            <button
              onClick={start}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isClient ? micSupported === false : undefined}
              title={isClient && micSupported === false ? "Microphone API not supported" : undefined}
            >
              🎤 {ui.micEnable}
            </button>
          ) : (
            <button onClick={listening ? stop : start} className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-sm text-white">
              {listening ? `⏹ ${ui.stop}` : `▶️ ${ui.start}`}
            </button>
          )}
          <button onClick={reset} className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm text-white">⟲ {ui.reset}</button>
        </div>
        <div className="flex items-center gap-2 text-xs tabular-nums whitespace-nowrap overflow-x-auto">
          <span className="inline-block max-w-[60vw] truncate">WPM: <b>{Math.round(wpm)}</b> • {talking ? ui.statusSpeaking : ui.statusPaused} • {ui.pxWord}: {pxPerWord.toFixed(1)}</span>
          <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
          <div className="flex items-center gap-1 whitespace-nowrap">
            <button
              onClick={() => nudgeByViewport(-1)}
              className="px-2 py-0.5 rounded bg-neutral-600 hover:bg-neutral-500 text-white"
              title={ui.nudgeBackTitle}
              type="button"
            >
              ⬆︎
            </button>
            <button
              onClick={() => nudgeByViewport(1)}
              className="px-2 py-0.5 rounded bg-neutral-600 hover:bg-neutral-500 text-white"
              title={ui.nudgeForwardTitle}
              type="button"
            >
              ⬇︎
            </button>
            <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
            <button
              onClick={() => setAsrEnabled((v) => !v)}
              className={`px-2 py-0.5 rounded text-white ${asrEnabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-neutral-600 hover:bg-neutral-500"}`}
              title={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle}
              type="button"
              disabled={!asrSupported}
            >
              {asrEnabled ? ui.asrOnLabel : ui.asrOffLabel}
            </button>
            {asrEnabled && (
              <span className="inline-flex items-center gap-1 ml-1">
                <span className={`inline-block w-2 h-2 rounded-full ${recentAsr ? "bg-emerald-400" : "bg-neutral-400"}`} title="Recent ASR match" />
              </span>
            )}
            {/* ASR window and snap mode controls (desktop) */}
            <label className="ml-2 inline-flex items-center gap-1">
              <span>{ui.asrWindowLabel}</span>
              <select
                className="bg-neutral-100 dark:bg-neutral-800 border rounded px-1 py-0.5"
                value={asrWindowScreens}
                onChange={(e) => setAsrWindowScreens(Number(e.target.value) as 1 | 2 | 4)}
              >
                <option value={1}>{ui.asrWindowViewport}</option>
                <option value={2}>{ui.asrWindowViewport2x}</option>
                <option value={4}>{ui.asrWindowWide}</option>
              </select>
            </label>
            <label className="ml-2 inline-flex items-center gap-1">
              <span>{ui.asrSnapMode}</span>
              <select
                className="bg-neutral-100 dark:bg-neutral-800 border rounded px-1 py-0.5"
                value={asrSnapMode}
                onChange={(e) => setAsrSnapMode((e.target.value as "gentle" | "aggressive"))}
              >
                <option value="gentle">{ui.asrSnapGentle}</option>
                <option value="aggressive">{ui.asrSnapAggressive}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="h-[78vh] border rounded-lg overflow-y-hidden bg-black text-white px-10 py-16 leading-relaxed tracking-wide"
          style={{ scrollBehavior: "auto" }}
        >
        <div
          ref={contentRef}
          className="text-2xl md:text-3xl whitespace-pre-wrap select-none"
          style={{ fontSize: fontSizePx, transform: mirror ? "scaleX(-1)" : undefined }}
        >
          {text}
        </div>
        </div>
        {/* Reading anchor guide (fixed over scroller) */}
        <div
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ top: `${ANCHOR_RATIO * 100}%` }}
        >
          <div className="relative">
            {/* left chevron */}
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden sm:block">
              <div className="w-2.5 h-2.5 rotate-45 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            </div>
            {/* horizontal line */}
            <div className="h-0.5 bg-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          </div>
        </div>
      </div>
      {asrEnabled && (
        <div className="mt-2 text-xs opacity-80">
          <div className="font-medium">ASR transcript (last):</div>
          <div className="truncate" title={lastTranscript}>{lastTranscript || "(no audio recognized yet)"}</div>
        </div>
      )}
    </div>
  );
}
