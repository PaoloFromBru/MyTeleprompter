"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokenize } from "@/lib/text";

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

// tokenization helpers imported from lib/text

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

// Legacy positional fuzzy match: same-length alignment, ratio of exact token matches
function findFuzzySequencePositional(tokens: string[], seq: string[], start: number, end: number, minRatio: number) {
  const n = tokens.length, m = seq.length;
  if (m === 0) return -1;
  const lo = Math.max(0, start);
  const hi = Math.min(n - m, end - m);
  let bestIdx = -1;
  let bestRatio = 0;
  for (let i = lo; i <= hi; i++) {
    let matches = 0;
    for (let j = 0; j < m; j++) {
      if (tokens[i + j] === seq[j]) matches++;
    }
    const ratio = matches / m;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestIdx = i + m - 1;
    }
  }
  return bestRatio >= minRatio ? bestIdx : -1;
}

// Dice coefficient over token bigrams for better tolerance to insertions/deletions
function findFuzzySequenceDice(tokens: string[], textBigrams: string[], seq: string[], start: number, end: number, minDice: number) {
  const n = tokens.length, m = seq.length;
  if (m < 2) return -1; // need at least one bigram
  const lo = Math.max(0, start);
  const hi = Math.min(n - m, end - m);
  // Seq bigrams set
  const seqBigrams: string[] = [];
  for (let i = 0; i < m - 1; i++) seqBigrams.push(seq[i] + "|" + seq[i + 1]);
  const seqSet = new Set(seqBigrams);
  const seqLen = seqSet.size;
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = lo; i <= hi; i++) {
    const candStart = i; // bigrams from i..i+m-2 correspond to tokens slice
    const candEnd = i + m - 2;
    if (candStart < 0 || candEnd >= textBigrams.length + 1) {
      // guard though bounds are already clamped by hi
    }
    let inter = 0;
    let candCount = 0;
    for (let k = candStart; k <= candEnd - 1; k++) {
      const bg = textBigrams[k];
      if (!bg) continue;
      candCount++;
      if (seqSet.has(bg)) inter++;
    }
    const denom = seqLen + candCount;
    const dice = denom > 0 ? (2 * inter) / denom : 0;
    if (dice > bestScore) {
      bestScore = dice;
      bestIdx = i + m - 1;
      if (dice >= 1) break;
    }
  }
  return bestScore >= minDice ? bestIdx : -1;
}

export function useSpeechSync(opts: { text: string; lang?: string; enabled?: boolean; windowRadius?: number; fuzzyMethod?: "dice" | "pos"; fuzzyMinScore?: number; }) {
  const { text, lang = "it-IT", enabled = false, windowRadius = 400, fuzzyMethod = "dice", fuzzyMinScore = 0.6 } = opts;
  const textTokens = useMemo(() => tokenize(text), [text]);
  const textBigrams = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < textTokens.length - 1; i++) arr.push(textTokens[i] + "|" + textTokens[i + 1]);
    return arr;
  }, [textTokens]);
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

      // Try to align using the last 6..2 tokens within a window around last match
      const windowStart = lastMatchRef.current - windowRadius;
      const windowEnd = lastMatchRef.current + windowRadius;
      let matched = false;
      for (let n = Math.min(6, bufferRef.current.length); n >= 2 && !matched; n--) {
        const seq = bufferRef.current.slice(-n);
        // Prefer exact match; otherwise fuzzy with 0.6 similarity
        let idx = findSequence(textTokens, seq, windowStart, windowEnd);
        if (idx < 0) {
          if (fuzzyMethod === "dice") idx = findFuzzySequenceDice(textTokens, textBigrams, seq, windowStart, windowEnd, fuzzyMinScore);
          else idx = findFuzzySequencePositional(textTokens, seq, windowStart, windowEnd, fuzzyMinScore);
        }
        // If we never matched yet, fall back to a global search to acquire lock anywhere
        if (idx < 0 && !hadAnyMatchRef.current) {
          idx = findSequence(textTokens, seq, 0, textTokens.length);
          if (idx < 0) {
            if (fuzzyMethod === "dice") idx = findFuzzySequenceDice(textTokens, textBigrams, seq, 0, textTokens.length, fuzzyMinScore);
            else idx = findFuzzySequencePositional(textTokens, seq, 0, textTokens.length, fuzzyMinScore);
          }
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
      } catch (error) {
        console.error("Failed to handle ASR error", error);
      }
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
    try { rec.start(); } catch (err) {
      console.error("Failed to start speech recognition", err);
    }
  }, [enabled, lang, textTokens, textBigrams, windowRadius, fuzzyMethod, fuzzyMinScore]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      try { rec.stop(); } catch (err) {
        console.error("Failed to stop speech recognition", err);
      }
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    bufferRef.current = [];
    lastMatchRef.current = 0;
    lastCountedIdxRef.current = -1;
    hadAnyMatchRef.current = false;
    setMatchedIndex(null);
    setMatchCount(0);
    setLastTranscript("");
    setLastError(null);
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

  return { supported, listening, start, stop, reset, lastTranscript, matchedIndex, matchCount, lastMatchAt: lastMatchAtRef.current, coverage, lastError, restartCount };
}
