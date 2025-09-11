"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Minimal typings for Web Speech API (Chrome)
declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }
  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }
}

interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onspeechstart: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

function normalizeToken(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean);
}

function findSequence(tokens: string[], seq: string[], start: number, end: number) {
  const n = tokens.length, m = seq.length;
  const lo = Math.max(0, start);
  const hi = Math.min(n - m, end - m);
  for (let i = lo; i <= hi; i++) {
    let ok = true;
    for (let j = 0; j < m; j++) {
      if (tokens[i + j] !== seq[j]) { ok = false; break; }
    }
    if (ok) return i + m - 1; // index of last token in the match
  }
  return -1;
}

export function useSpeechSync(opts: { text: string; lang?: string; enabled?: boolean; windowRadius?: number; }) {
  const { text, lang = "it-IT", enabled = false, windowRadius = 400 } = opts;
  const textTokens = useMemo(() => tokenize(text), [text]);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [matchedIndex, setMatchedIndex] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const lastMatchAtRef = useRef<number>(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [restartCount, setRestartCount] = useState(0);

  const recRef = useRef<ISpeechRecognition | null>(null);
  const bufferRef = useRef<string[]>([]);
  const lastMatchRef = useRef<number>(0);
  const restartingRef = useRef(false);
  const lastCountedIdxRef = useRef<number>(-1);
  const hadAnyMatchRef = useRef(false);

  useEffect(() => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    if (!enabled) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    if (recRef.current) return;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const t = res[0]?.transcript ?? "";
        if (!res.isFinal) interim += t + " "; else interim += t + " ";
      }
      interim = interim.trim();
      setLastTranscript(interim);

      const tokens = tokenize(interim);
      // Keep only the most recent tokens (avoid duplication across events)
      bufferRef.current = tokens.slice(-60);

      // Try to align using the last 6..3 tokens within a window around last match
      const windowStart = lastMatchRef.current - windowRadius;
      const windowEnd = lastMatchRef.current + windowRadius;
      let matched = false;
      for (let n = Math.min(6, bufferRef.current.length); n >= 3 && !matched; n--) {
        const seq = bufferRef.current.slice(-n);
        let idx = findSequence(textTokens, seq, windowStart, windowEnd);
        // If we never matched yet, fall back to a global search to acquire lock anywhere
        if (idx < 0 && !hadAnyMatchRef.current) {
          idx = findSequence(textTokens, seq, 0, textTokens.length);
        }
        if (idx >= 0) {
          matched = true;
          hadAnyMatchRef.current = true;
          lastMatchRef.current = idx;
          setMatchedIndex(idx);
          if (idx > lastCountedIdxRef.current) {
            lastCountedIdxRef.current = idx;
            lastMatchAtRef.current = Date.now();
            setMatchCount((c) => c + 1);
          }
        }
      }
    };

    rec.onerror = (ev: unknown) => {
      try {
        const e = ev as { error?: string; message?: string; type?: string } | undefined;
        const err = e?.error || e?.message || String(e?.type || "error");
        setLastError(err);
        console.warn("ASR error:", err);
      } catch {}
      // Swallow errors; try to restart once the engine ends
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      setRestartCount((c) => c + 1);
      if (enabled && !restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => { restartingRef.current = false; start(); }, 400);
      }
    };

    recRef.current = rec;
    setListening(true);
    try { rec.start(); } catch {}
  }, [enabled, lang, textTokens, windowRadius]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    if (!enabled) { stop(); return; }
    start();
    return () => stop();
  }, [enabled, start, stop]);

  const coverage = useMemo(() => {
    if (!textTokens.length || matchedIndex == null) return 0;
    return Math.max(0, Math.min(1, matchedIndex / textTokens.length));
  }, [matchedIndex, textTokens.length]);

  return { supported, listening, start, stop, lastTranscript, matchedIndex, matchCount, lastMatchAt: lastMatchAtRef.current, coverage, lastError, restartCount };
}
