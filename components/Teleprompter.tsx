"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMicSpeechRate } from "@/hooks/useMicSpeechRate";

type Props = {
  text: string;
  baseWpm?: number;
  holdOnSilence?: boolean;
};

export default function Teleprompter({ text, baseWpm = 140, holdOnSilence = true }: Props) {
  const { start, stop, listening, permission, wpm, talking } = useMicSpeechRate({
    smoothingSecs: 1.6, minDbThreshold: -52, ema: 0.25,
  });
  const ANCHOR_RATIO = 0.35; // keep target ~35% from top

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
    window.addEventListener("resize", calc);
    window.addEventListener("orientationchange", calc as any);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", calc);
      window.removeEventListener("orientationchange", calc as any);
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
              🎤 Attiva microfono
            </button>
          ) : (
            <button onClick={listening ? stop : start} className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-sm text-white">
              {listening ? "⏹ Stop" : "▶️ Start"}
            </button>
          )}
          <button onClick={reset} className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm text-white">⟲ Reset</button>
        </div>
        <div className="flex items-center gap-2 text-xs tabular-nums">
          <span>WPM: <b>{Math.round(wpm)}</b> • {talking ? "parlando" : "pausa"} • px/word: {pxPerWord.toFixed(1)}</span>
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
              title="Sposta indietro"
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
              title="Sposta avanti"
              type="button"
            >
              ⬇︎
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
