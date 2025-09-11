"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMicSpeechRate } from "@/hooks/useMicSpeechRate";
import { useSpeechSync } from "@/hooks/useSpeechSync";

type Props = {
  text: string;
  baseWpm?: number;
  holdOnSilence?: boolean;
  lang?: string;
};

import { messages, normalizeUILang } from "@/lib/i18n";

export default function Teleprompter({ text, baseWpm = 140, holdOnSilence = true, lang }: Props) {
  const { start, stop, listening, permission, wpm, talking } = useMicSpeechRate({
    smoothingSecs: 1.6, minDbThreshold: -52, ema: 0.25,
  });
  const ANCHOR_RATIO = 0.35; // keep target ~35% from top
  const ui = messages[normalizeUILang(lang)];
  const [asrEnabled, setAsrEnabled] = useState(false);
  const { supported: asrSupported, listening: asrListening, matchedIndex } = useSpeechSync({
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
  const totalWords = words.length;

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
  }, [text, totalWords]);

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

  const reset = () => {
    wordsReadRef.current = 0;
    integratorRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
  };

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

      // If ASR match is ahead, snap forward (never backwards)
      if (speechIdxRef.current != null) {
        const targetIdx = Math.min(totalWords, speechIdxRef.current + 1);
        if (targetIdx > wordsReadRef.current + 2) {
          wordsReadRef.current = targetIdx;
          integratorRef.current = 0;
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
  }, [baseWpm, pxPerWord, holdOnSilence, totalWords]);

  return (
    <div className="w-full mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          {permission !== "granted" ? (
            <button onClick={start} className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-sm text-white">
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
              onClick={() => {
                const cont = containerRef.current;
                const deltaWords = cont ? (cont.clientHeight / Math.max(1, pxPerWord)) * 0.15 : 10;
                wordsReadRef.current = Math.max(0, wordsReadRef.current - deltaWords);
                integratorRef.current = 0;
              }}
              className="px-2 py-0.5 rounded bg-neutral-600 hover:bg-neutral-500 text-white"
              title={ui.nudgeBackTitle}
              type="button"
            >
              ⬆︎
            </button>
            <button
              onClick={() => {
                const cont = containerRef.current;
                const deltaWords = cont ? (cont.clientHeight / Math.max(1, pxPerWord)) * 0.15 : 10;
                wordsReadRef.current = Math.min(totalWords, wordsReadRef.current + deltaWords);
                integratorRef.current = 0;
              }}
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
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[78vh] border rounded-lg overflow-y-hidden bg-black text-white px-10 py-16 leading-relaxed tracking-wide"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Reading anchor guide */}
        <div
          className="pointer-events-none absolute inset-x-0"
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
        <div ref={contentRef} className="text-2xl md:text-3xl whitespace-pre-wrap select-none">
          {text}
        </div>
      </div>
    </div>
  );
}
