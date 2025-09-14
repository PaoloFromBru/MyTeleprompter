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
  manualPauseMs?: number;
  useMicWhileASR?: boolean;
  useAsrDerivedDrift?: boolean;
  asrWindowScreens?: 1 | 2 | 4;
  asrSnapMode?: "gentle" | "aggressive" | "instant" | "sticky";
  stickyThresholdPx?: number;
  asrLeadWords?: number;
  lockToHighlight?: boolean;
  showDebug?: boolean;
};

import { messages, normalizeUILang } from "@/lib/i18n";

export default function Teleprompter({ text, baseWpm = 140, holdOnSilence = true, lang, fontSizePx, mirror = false, manualPauseMs = 500, useMicWhileASR = true, useAsrDerivedDrift = false, asrWindowScreens: pAsrWindowScreens, asrSnapMode: pAsrSnapMode, stickyThresholdPx: pStickyThresholdPx, asrLeadWords: pAsrLeadWords, lockToHighlight: pLockToHighlight, showDebug: pShowDebug }: Props) {
  const { start, stop, listening, permission, wpm, talking } = useMicSpeechRate({
    smoothingSecs: 1.6, minDbThreshold: -52, ema: 0.25,
  });
  const ANCHOR_RATIO = 0.35; // keep target ~35% from top
  const ui = messages[normalizeUILang(lang)];
  const [asrEnabled, setAsrEnabled] = useState(false);
  const [asrWindowScreens, setAsrWindowScreens] = useState<1 | 2 | 4>(pAsrWindowScreens ?? 1);
  const [asrSnapMode, setAsrSnapMode] = useState<"gentle" | "aggressive" | "instant" | "sticky">(pAsrSnapMode ?? "aggressive");
  const [stickyThresholdPx, setStickyThresholdPx] = useState<number>(pStickyThresholdPx ?? 16);
  const [asrLeadWords, setAsrLeadWords] = useState<number>(pAsrLeadWords ?? 2);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [lockToHighlight, setLockToHighlight] = useState<boolean>(pLockToHighlight ?? false);
  const [showDebug, setShowDebug] = useState<boolean>(pShowDebug ?? false);
  const [useMicWhileASRState, setUseMicWhileASR] = useState(useMicWhileASR);
  const [useAsrDerivedDriftState, setUseAsrDerivedDrift] = useState(useAsrDerivedDrift);
  const [fontSize, setFontSize] = useState(fontSizePx ?? 32);
  const [mirrorState, setMirrorState] = useState(mirror);
  const [baseWpmState, setBaseWpmState] = useState(baseWpm);
  useEffect(() => setUseMicWhileASR(useMicWhileASR), [useMicWhileASR]);
  useEffect(() => setUseAsrDerivedDrift(useAsrDerivedDrift), [useAsrDerivedDrift]);
  useEffect(() => setAsrWindowScreens(pAsrWindowScreens ?? 1), [pAsrWindowScreens]);
  useEffect(() => setAsrSnapMode(pAsrSnapMode ?? "aggressive"), [pAsrSnapMode]);
  useEffect(() => setStickyThresholdPx(pStickyThresholdPx ?? 16), [pStickyThresholdPx]);
  useEffect(() => setAsrLeadWords(pAsrLeadWords ?? 2), [pAsrLeadWords]);
  useEffect(() => setLockToHighlight(pLockToHighlight ?? false), [pLockToHighlight]);
  useEffect(() => setShowDebug(pShowDebug ?? false), [pShowDebug]);
  useEffect(() => setFontSize(fontSizePx ?? 32), [fontSizePx]);
  useEffect(() => setMirrorState(mirror), [mirror]);
  useEffect(() => setBaseWpmState(baseWpm), [baseWpm]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const contentRef   = useRef<HTMLDivElement | null>(null);
  const wordElsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const caretRef = useRef<HTMLDivElement | null>(null);
  const boundaryCaretRef = useRef<HTMLDivElement | null>(null);
  const manualScrollUntilRef = useRef<number>(0);
  const lastManualBumpRef = useRef<number>(0);
  // Debug: last target info and recent events
  const lastTargetPxRef = useRef(0);
  const lastErrorPxRef = useRef(0);
  const lastTargetModeRef = useRef<"fallback"|"anchor"|"sticky"|"instant">("fallback");
  const debugEventsRef = useRef<string[]>([]);
  const pushDebug = (msg: string) => {
    const arr = debugEventsRef.current;
    const ts = Math.round(performance.now());
    arr.push(`${ts}ms ${msg}`);
    if (arr.length > 30) arr.splice(0, arr.length - 30);
  };

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
    }
    const id = setTimeout(calc, 50);
    // On mobile, orientation changes trigger a resize; listening to resize is enough
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", calc);
    };
  }, [text, totalWords, fontSize]);

  // Compute ASR search window based on viewport size and setting (in tokens)
  const viewportWords = useMemo(() => {
    const cont = containerRef.current;
    return cont ? (cont.clientHeight / Math.max(1, pxPerWord)) : 0;
  }, [pxPerWord]);
  const dynamicWindowTokens = useMemo(() => {
    if (tokenToWordRatio <= 0) return 400; // fallback
    const tokens = Math.round((viewportWords * asrWindowScreens) / tokenToWordRatio);
    // Wider bounds so portrait mobile has enough context to stay locked
    return Math.max(150, Math.min(4000, tokens));
  }, [viewportWords, asrWindowScreens, tokenToWordRatio]);

  const { supported: asrSupported, matchedIndex, lastMatchAt, lastTranscript, reset: resetASR } = useSpeechSync({
    text,
    lang: lang || "it-IT",
    enabled: asrEnabled,
    windowRadius: dynamicWindowTokens,
  });

  // Map ASR token index -> word index using the same whitespace split used for rendering.
  const tokenCumulativePerWord = useMemo(() => {
    const parts = text.split(/(\s+)/);
    const cum: number[] = [];
    let acc = 0;
    for (const part of parts) {
      const isWs = /^\s+$/.test(part);
      if (isWs) continue;
      const tok = normalizeTokenLocal(part);
      const inc = tok ? 1 : 0;
      acc += inc;
      cum.push(acc);
    }
    return cum;
  }, [text]);

  const recognizedWords = useMemo(() => {
    if (matchedIndex == null) return 0;
    const t = matchedIndex + 1; // last token in the match, 1-based count
    // first word whose cumulative token count >= t
    const idx = tokenCumulativePerWord.findIndex((c) => c >= t);
    if (idx < 0) return tokenCumulativePerWord.length;
    return idx + 1; // convert to 1-based word count
  }, [matchedIndex, tokenCumulativePerWord]);

  const [highlightWords, setHighlightWords] = useState(0);
  const highlightWordsRef = useRef(0);

  // Debug overlay renders live values; no extra state needed.

  const wordsReadRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const integratorRef = useRef(0);

  // Mirror hook values into refs for the rAF loop (avoid effect deps churn)
  const wpmRef = useRef(wpm);
  const talkingRef = useRef(talking);
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { talkingRef.current = talking; }, [talking]);
  const speechIdxRef = useRef<number | null>(null);
  // Accept ASR matches generously behind, but limit far-ahead jumps
  useEffect(() => {
    if (matchedIndex == null) return;
    const cont = containerRef.current;
    if (!cont) { speechIdxRef.current = matchedIndex; return; }
    const visibleWords = cont.clientHeight / Math.max(1, pxPerWord);
    const currentWords = wordsReadRef.current;
    const currentTok = Math.round(currentWords / Math.max(1e-6, tokenToWordRatio));
    const viewportTokens = visibleWords / Math.max(1e-6, tokenToWordRatio);
    const aheadTok = Math.ceil(viewportTokens * asrWindowScreens);
    const behindTok = Math.ceil(viewportTokens * 3); // allow far behind so ASR can catch up
    const minTok = Math.max(0, currentTok - behindTok);
    const maxTok = currentTok + aheadTok;
    if (matchedIndex >= minTok && matchedIndex <= maxTok) {
      speechIdxRef.current = matchedIndex;
    }
  }, [matchedIndex, pxPerWord, asrWindowScreens, tokenToWordRatio, totalWords]);
  // Optionally stop mic when ASR is on (if the user disables concurrent mic)
  useEffect(() => {
    if (asrEnabled && listening && !useMicWhileASRState) stop();
  }, [asrEnabled, listening, stop, useMicWhileASRState]);
  const [recentAsr, setRecentAsr] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      setRecentAsr(!!lastMatchAt && Date.now() - lastMatchAt < 2000);
    }, 400);
    return () => clearInterval(id);
  }, [lastMatchAt]);

  // ASR-derived drift (words/sec estimated from recent ASR matches)
  const asrDriftWpsRef = useRef(0);
  const lastAsrIdxRef = useRef<number | null>(null);
  const lastAsrTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (matchedIndex == null || !lastMatchAt) return;
    const now = lastMatchAt;
    const lastIdx = lastAsrIdxRef.current;
    const lastTs = lastAsrTsRef.current;
    if (lastIdx != null && lastTs != null && now > lastTs && matchedIndex >= lastIdx) {
      const dt = (now - lastTs) / 1000;
      const dTokens = matchedIndex - lastIdx;
      const dWords = dTokens * tokenToWordRatio;
      const inst = Math.max(0, Math.min(6, dWords / Math.max(1e-3, dt)));
      asrDriftWpsRef.current = 0.6 * inst + 0.4 * asrDriftWpsRef.current;
    }
    lastAsrIdxRef.current = matchedIndex;
    lastAsrTsRef.current = now;
  }, [matchedIndex, lastMatchAt, tokenToWordRatio, useAsrDerivedDriftState]);

  // no-op effect for debug now

  const reset = () => {
    wordsReadRef.current = 0;
    integratorRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;
    highlightWordsRef.current = 0;
    setHighlightWords(0);
    try { resetASR(); } catch (err) {
      console.error("Failed to reset ASR", err);
    }
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
    } catch (err) {
      console.error("Failed to detect mic support", err);
      setMicSupported(false);
    }
  }, []);

  // Detect manual user scrolling (wheel/touch) and pause auto-follow briefly
  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const bumpWheel = (ev: WheelEvent) => {
      const dy = Math.abs(ev.deltaY);
      const now = performance.now();
      // Ignore very tiny momentum and throttle debug noise
      if (dy < 0.5) return;
      manualScrollUntilRef.current = now + manualPauseMs;
      if (now - lastManualBumpRef.current > 150) {
        pushDebug(`manual wheel dy=${ev.deltaY.toFixed(1)}`);
        lastManualBumpRef.current = now;
      }
    };
    const bumpTouch = (ev: TouchEvent) => {
      const now = performance.now();
      manualScrollUntilRef.current = now + manualPauseMs;
      if (now - lastManualBumpRef.current > 150) {
        pushDebug(`manual ${ev.type}`);
        lastManualBumpRef.current = now;
      }
    };
    cont.addEventListener('wheel', bumpWheel, { passive: true });
    cont.addEventListener('touchstart', bumpTouch, { passive: true });
    cont.addEventListener('touchmove', bumpTouch, { passive: true });
    return () => {
      cont.removeEventListener('wheel', bumpWheel);
      cont.removeEventListener('touchstart', bumpTouch);
      cont.removeEventListener('touchmove', bumpTouch);
    };
  }, [manualPauseMs]);

  const nudgeByViewport = useCallback((sign: 1 | -1) => {
    const cont = containerRef.current;
    const deltaWords = cont ? (cont.clientHeight / Math.max(1, pxPerWord)) * 0.15 : 10;
    wordsReadRef.current = Math.max(0, Math.min(totalWords, wordsReadRef.current + sign * deltaWords));
    integratorRef.current = 0;
    manualScrollUntilRef.current = performance.now() + manualPauseMs;
    pushDebug(`manual nudge ${sign}`);
  }, [pxPerWord, totalWords, manualPauseMs]);
  // Keep lockToHighlight consistent with ASR state
  useEffect(() => {
    if (!asrEnabled && lockToHighlight) setLockToHighlight(false);
  }, [asrEnabled, lockToHighlight]);

  // Re-anchor when geometry changes: keep current scroll aligned to anchor
  useEffect(() => {
    const cont = containerRef.current, content = contentRef.current;
    if (!cont || !content) return;
    const targetWords = (cont.scrollTop + cont.clientHeight * ANCHOR_RATIO) / Math.max(1, pxPerWord);
    wordsReadRef.current = Math.max(0, Math.min(totalWords, targetWords));
    integratorRef.current = 0; // avoid windup after jumps
  }, [pxPerWord, totalWords]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      if (lastTsRef.current == null) lastTsRef.current = now;
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      const wordsPerSec = (asrEnabled && useAsrDerivedDriftState) ? asrDriftWpsRef.current : ((wpmRef.current || 0) / 60);
      let next = wordsReadRef.current;
      const allowDrift = !(asrEnabled && lockToHighlight);
      if (allowDrift) {
        if (talkingRef.current) next += wordsPerSec * dt;
        else if (!holdOnSilence) next += (0.15 * (baseWpmState / 60)) * dt;
      }
      wordsReadRef.current = Math.max(0, Math.min(totalWords, next));

      // Accept current ASR match within a generous window around current anchor
      const contA = containerRef.current;
      if (contA && matchedIndex != null) {
        const visibleWords = contA.clientHeight / Math.max(1, pxPerWord);
        const currentWords = wordsReadRef.current;
        const currentTok = Math.round(currentWords / Math.max(1e-6, tokenToWordRatio));
        const viewportTokens = visibleWords / Math.max(1e-6, tokenToWordRatio);
        const aheadTok = Math.ceil(viewportTokens * asrWindowScreens);
        const behindTok = Math.ceil(viewportTokens * 3);
        const minTok = Math.max(0, currentTok - behindTok);
        const maxTok = currentTok + aheadTok;
        if (matchedIndex >= minTok && matchedIndex <= maxTok) {
          speechIdxRef.current = matchedIndex;
        }
      }

      let overrideTarget: number | null = null;
      if (speechIdxRef.current != null) {
        const matchedWord = Math.min(totalWords, Math.round((speechIdxRef.current + 1) * tokenToWordRatio));
        const asrTargetWords = Math.min(totalWords, matchedWord + asrLeadWords);
        const diff = asrTargetWords - wordsReadRef.current;
        if (diff > 0.1) {
          if (asrSnapMode === "aggressive") {
            wordsReadRef.current = asrTargetWords;
            integratorRef.current = 0;
            const cont2 = containerRef.current, content2 = contentRef.current;
            if (cont2 && content2) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(wordsReadRef.current) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                overrideTarget = Math.max(0,
                  Math.min(
                    content2.scrollHeight - cont2.clientHeight,
                    el.offsetTop - cont2.clientHeight * ANCHOR_RATIO
                  )
                );
              }
            }
          } else if (asrSnapMode === "instant") {
            // Jump immediately with no easing; set exact pixel target
            wordsReadRef.current = asrTargetWords;
            integratorRef.current = 0;
            const cont2 = containerRef.current, content2 = contentRef.current;
            if (cont2 && content2) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(asrTargetWords) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                const target = Math.max(0,
                  Math.min(
                    content2.scrollHeight - cont2.clientHeight,
                    el.offsetTop - cont2.clientHeight * ANCHOR_RATIO
                  )
                );
                cont2.scrollTop = target;
                overrideTarget = target;
              }
            }
          } else {
            // Gentle but stronger correction to avoid lag; prefer forward.
            wordsReadRef.current += Math.max(0, diff * 0.6);
            const cont2 = containerRef.current, content2 = contentRef.current;
            if (cont2 && content2) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(asrTargetWords) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                overrideTarget = Math.max(0,
                  Math.min(
                    content2.scrollHeight - cont2.clientHeight,
                    el.offsetTop - cont2.clientHeight * ANCHOR_RATIO
                  )
                );
              }
            }
          }
        } else if (diff < -1.0) {
          const backStep = Math.min(2, Math.abs(diff)) * 0.7;
          wordsReadRef.current = Math.max(0, asrTargetWords + backStep);
          overrideTarget = null;
        }
        // Always compute pixel anchor for target word so minor drift cannot accumulate
        const cont3 = containerRef.current;
        const caret = caretRef.current;
        const boundaryCaret = boundaryCaretRef.current;
        const idxForPx = Math.max(0, Math.min(totalWords - 1, Math.round(asrTargetWords) - 1));
        const elForPx = wordElsRef.current[idxForPx];
        if (cont3 && elForPx) {
          const contRect = cont3.getBoundingClientRect();
          const elRect = elForPx.getBoundingClientRect();
          const left = (elRect.left - contRect.left) + elRect.width / 2;
          if (caret) caret.style.left = `${Math.round(left)}px`;
          // Boundary caret at end of green text (last highlighted word)
          if (boundaryCaret && highlightWordsRef.current > 0) {
            const bIdx = Math.min(totalWords - 1, Math.max(0, highlightWordsRef.current - 1));
            const bel = wordElsRef.current[bIdx];
            if (bel) {
              const bRect = bel.getBoundingClientRect();
              const bLeft = (bRect.left - contRect.left) + bRect.width / 2;
              boundaryCaret.style.left = `${Math.round(bLeft)}px`;
            }
          }
          const pixelAnchor = Math.max(0,
            Math.min(
              cont3.scrollHeight - cont3.clientHeight,
              elForPx.offsetTop - cont3.clientHeight * ANCHOR_RATIO
            )
          );
          if (overrideTarget == null) overrideTarget = pixelAnchor;
        }
      }

      const newHighlight = Math.min(recognizedWords, Math.round(wordsReadRef.current));
      if (newHighlight !== highlightWordsRef.current) {
        highlightWordsRef.current = newHighlight;
        setHighlightWords(newHighlight);
      }

      const cont = containerRef.current, content = contentRef.current;
      if (cont && content) {
        const fallbackTarget = Math.max(0,
          Math.min(
            content.scrollHeight - cont.clientHeight,
            wordsReadRef.current * pxPerWord - cont.clientHeight * ANCHOR_RATIO
          )
        );
        const target = overrideTarget ?? fallbackTarget;
        // Update debug metrics and decide mode label
        const modeLabel: "anchor" | "fallback" = overrideTarget != null ? "anchor" : "fallback";
        lastTargetPxRef.current = target;
        lastErrorPxRef.current = target - cont.scrollTop;
        let modeFinal: "fallback"|"anchor"|"sticky"|"instant" = modeLabel;
        if (asrSnapMode === "sticky") modeFinal = "sticky";
        else if (asrSnapMode === "instant") modeFinal = "instant";
        lastTargetModeRef.current = modeFinal;
        // Sticky snap: if drift from target exceeds threshold, snap instantly
        if (asrSnapMode === "sticky") {
          const err = target - cont.scrollTop;
          if (Math.abs(err) > stickyThresholdPx) {
            cont.scrollTop = Math.max(0, Math.min(content.scrollHeight - cont.clientHeight, target));
          } else {
            const alphaS = Math.min(1, dt * 10);
            cont.scrollTop = cont.scrollTop + err * alphaS;
          }
          raf = requestAnimationFrame(tick);
          return;
        }
        const alpha = Math.min(1, dt * 10);
        const nowMs = performance.now();
        if (nowMs > manualScrollUntilRef.current) {
          cont.scrollTop = cont.scrollTop + (target - cont.scrollTop) * alpha;
        } else {
          const targetWords = (cont.scrollTop + cont.clientHeight * ANCHOR_RATIO) / Math.max(1, pxPerWord);
          wordsReadRef.current = Math.max(0, Math.min(totalWords, targetWords));
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [baseWpmState, pxPerWord, holdOnSilence, totalWords, tokenToWordRatio, asrSnapMode, asrLeadWords, asrEnabled, lockToHighlight, asrWindowScreens, matchedIndex, stickyThresholdPx, recognizedWords, useAsrDerivedDriftState]);

  // Periodically refresh overlay
  const [, setOverlayTick] = useState(0);
  useEffect(() => {
    if (!showDebug) return;
    const id = setInterval(() => setOverlayTick((v) => v + 1), 300);
    return () => clearInterval(id);
  }, [showDebug]);

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
          document.exitFullscreen().catch((err) => console.error("Failed to exit fullscreen", err));
        } else {
          try { cont.requestFullscreen(); } catch (err) {
            console.error("Failed to request fullscreen", err);
          }
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening, permission, start, stop, pxPerWord, totalWords, nudgeByViewport]);

  return (
    <div className="w-full mx-auto max-w-3xl pb-16">
      {/* Mobile compact toolbar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-800 text-white flex items-center justify-between gap-2 p-2">
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
          <button
            onClick={() => {
              const cont = containerRef.current;
              if (!cont) return;
              if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => console.error("Failed to exit fullscreen", err));
              } else {
                try { cont.requestFullscreen(); } catch (err) {
                  console.error("Failed to request fullscreen", err);
                }
              }
            }}
            className="p-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            aria-label="Fullscreen"
            title="Fullscreen"
            type="button"
          >
            {/* fullscreen icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 4 20 4 20 8"/>
              <polyline points="8 20 4 20 4 16"/>
              <polyline points="20 16 20 20 16 20"/>
              <polyline points="4 8 4 4 8 4"/>
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-neutral-800 text-white p-4 rounded w-11/12 max-w-sm space-y-3">
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap">Font size</span>
              <input
                type="range"
                min={20}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="w-10 text-right tabular-nums">{fontSize}px</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={mirrorState} onChange={(e) => setMirrorState(e.target.checked)} />
              <span>Mirror</span>
            </label>
            <label className="flex items-center justify-between">
              <span>Base WPM</span>
              <input
                type="number"
                className="w-20 text-black rounded px-1"
                value={baseWpmState}
                onChange={(e) => setBaseWpmState(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={asrEnabled} onChange={(e) => setAsrEnabled(e.target.checked)} />
              <span>ASR follow</span>
            </label>
            <div className="text-right pt-2">
              <button
                className="px-3 py-1 rounded bg-emerald-600 text-white"
                onClick={() => setShowMobileSettings(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop toolbar */}
      <div className="hidden sm:flex flex-wrap items-start justify-between mb-3 gap-2 min-h-[44px]">
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
        <div className="flex items-center gap-2 text-xs tabular-nums flex-wrap">
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
          </div>
        </div>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="h-[68vh] sm:h-[78vh] border rounded-lg overflow-y-auto touch-pan-y overscroll-contain bg-black text-white px-6 sm:px-10 py-10 sm:py-16 leading-relaxed tracking-wide"
          style={{ scrollBehavior: "auto" }}
        >
        <div
          ref={contentRef}
          className="text-2xl md:text-3xl whitespace-pre-wrap select-none"
          style={{ fontSize, transform: mirrorState ? "scaleX(-1)" : undefined }}
        >
          {useMemo(() => {
            // Render text preserving whitespace, wrapping word-like chunks for highlighting and anchoring
            const parts = text.split(/(\s+)/);
            let wordIdx = 0;
            // Reset word element refs array size on render
            wordElsRef.current = new Array(totalWords).fill(null);
            return parts.map((part, i) => {
              const isWs = /^\s+$/.test(part);
              if (isWs) return <span key={i}>{part}</span>;
              wordIdx += 1;
              const seen = wordIdx <= highlightWords;
              return (
                <span
                  key={i}
                  ref={(el) => { wordElsRef.current[wordIdx - 1] = el; }}
                  className={seen ? "text-emerald-300" : undefined}
                >
                  {part}
                </span>
              );
            });
          }, [text, highlightWords, totalWords])}
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
        {/* Caret over anchored word (inside relative container so positioning matches scroller) */}
        <div
          ref={caretRef}
          className="pointer-events-none absolute z-20"
          style={{ top: `${ANCHOR_RATIO * 100}%`, transform: "translate(-50%, -8px)" }}
        >
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
        </div>
        {/* Orange caret at end of highlighted text */}
        <div
          ref={boundaryCaretRef}
          className="pointer-events-none absolute z-20"
          style={{ top: `${ANCHOR_RATIO * 100}%`, transform: "translate(-50%, 6px)" }}
        >
          <div className="w-0 h-0 border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]" />
        </div>
      </div>
      {asrEnabled && (
        <div className="mt-2 text-xs opacity-80">
          <div className="font-medium">ASR transcript (last):</div>
          <div className="truncate" title={lastTranscript}>{lastTranscript || "(no audio recognized yet)"}</div>
        </div>
      )}
      {showDebug && (
        <div className="fixed right-4 bottom-4 z-50 text-xs bg-black/60 text-white border border-white/20 rounded p-3 space-y-1 max-w-[46vw]">
          <div><b>lock</b>: {String(lockToHighlight)} • <b>ASR</b>: {String(asrEnabled)}</div>
          <div><b>idx</b>: {matchedIndex ?? "-"} • <b>seen</b>: {highlightWords}</div>
          <div><b>wordsRead</b>: {Math.round(wordsReadRef.current)}</div>
          <div><b>windowTokens</b>: {dynamicWindowTokens} • <b>viewportWords</b>: {Math.round(viewportWords)}</div>
          <div><b>px/word</b>: {pxPerWord.toFixed(2)} • <b>recentASR</b>: {String(recentAsr)}</div>
          <div>
            <b>target</b>: {Math.round(lastTargetPxRef.current)} • <b>errorPx</b>: {Math.round(lastErrorPxRef.current)} • <b>mode</b>: {lastTargetModeRef.current}
          </div>
          <div>
            <b>drift</b>: {asrEnabled ? (useAsrDerivedDriftState ? "asr" : (useMicWhileASRState ? "mic" : "none")) : "none"}
            {asrEnabled && useAsrDerivedDriftState ? <> • <b>asrWps</b>: {asrDriftWpsRef.current.toFixed(2)}</> : null}
            {!useAsrDerivedDriftState ? <> • <b>WPM</b>: {Math.round(wpm)}</> : null}
          </div>
          <div><b>manualPause</b>: {Math.max(0, Math.round(manualScrollUntilRef.current - performance.now()))} ms</div>
          <div className="mt-1 border-t border-white/20 pt-1 font-mono leading-snug whitespace-pre-wrap break-words max-h-[30vh] overflow-auto">
            {debugEventsRef.current.slice(-20).map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
