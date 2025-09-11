"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const { supported: asrSupported, matchedIndex, matchCount, lastMatchAt, coverage, lastError: asrError, restartCount, lastTranscript } = useSpeechSync({
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
  const Kp = 0.22, Ki = 0.08;
  const integratorRef = useRef(0);

  // Mirror hook values into refs for the rAF loop (avoid effect deps churn)
  const wpmRef = useRef(wpm);
  const talkingRef = useRef(talking);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { talkingRef.current = talking; }, [talking]);
  const speechIdxRef = useRef<number | null>(null);
  useEffect(() => { if (matchedIndex != null) speechIdxRef.current = matchedIndex; }, [matchedIndex]);
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

      // If ASR provides a match, gently correct towards it (both directions)
      if (speechIdxRef.current != null) {
        const targetIdxWords = Math.min(
          totalWords,
          Math.round((speechIdxRef.current + 1) * tokenToWordRatio)
        );
        const diff = targetIdxWords - wordsReadRef.current;
        if (Math.abs(diff) >= 3) {
          // Large discrepancy: snap to ASR to avoid drift
          wordsReadRef.current = targetIdxWords;
          integratorRef.current = 0;
        } else {
          // Small discrepancy: nudge towards ASR
          wordsReadRef.current += diff * 0.15;
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
        const error = target - cont.scrollTop;
        integratorRef.current += error * dt;
        const speed = Kp * error + Ki * integratorRef.current;
        cont.scrollTop = cont.scrollTop + speed * dt;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [baseWpm, pxPerWord, holdOnSilence, totalWords, tokenToWordRatio]);

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
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span>WPM: <b>{Math.round(wpm)}</b> • {talking ? ui.statusSpeaking : ui.statusPaused} • {ui.pxWord}: {pxPerWord.toFixed(1)}</span>
          <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
          <div className="flex items-center gap-1">
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
            {/* ASR diagnostics */}
            {asrEnabled && (
              <span className="ml-1 opacity-90">
                {ui.asrMatchesLabel}: {matchCount} • {ui.asrCoverageLabel}: {(coverage * 100).toFixed(0)}% • restarts: {restartCount}{asrError ? ` • err: ${asrError}` : ""}
              </span>
            )}
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
