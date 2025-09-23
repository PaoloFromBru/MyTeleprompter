"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicSpeechRate } from "@/hooks/useMicSpeechRate";
import { useSpeechSync } from "@/hooks/useSpeechSync";
// tokenization handled via hooks
import { useTeleprompterMetrics } from "@/hooks/useTeleprompterMetrics";
import { useAsrMapping } from "@/hooks/useAsrMapping";

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
import ToolbarMobile from "./teleprompter/ToolbarMobile";
import ToolbarDesktop from "./teleprompter/ToolbarDesktop";
import QuickSettingsDialog from "./teleprompter/QuickSettingsDialog";
import { useTeleprompterLoop } from "@/hooks/useTeleprompterLoop";

const isPromiseLike = (value: unknown): value is Promise<void> => {
  if (typeof value !== "object" || value === null) return false;
  const maybeCatch = (value as { catch?: unknown }).catch;
  return typeof maybeCatch === "function";
};

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
  const [manualMode, setManualMode] = useState(false);
  // If Manual mode is enabled, ensure ASR is off to avoid confusion
  useEffect(() => { if (manualMode && asrEnabled) setAsrEnabled(false); }, [manualMode, asrEnabled]);
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
  // Debug values returned from the engine hook
  let lastTargetPxRef = useRef(0);
  let lastErrorPxRef = useRef(0);
  let lastTargetModeRef = useRef<"fallback"|"anchor"|"sticky"|"instant">("fallback");
  const debugEventsRef = useRef<string[]>([]);
  const pushDebug = (msg: string) => {
    const arr = debugEventsRef.current;
    const ts = Math.round(performance.now());
    arr.push(`${ts}ms ${msg}`);
    if (arr.length > 30) arr.splice(0, arr.length - 30);
  };

  const words = useMemo(() => text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean), [text]);
  const totalWords = words.length;
  const { pxPerWord, bottomPadPx, viewportWords, trailingBufferWords } = useTeleprompterMetrics(
    containerRef, contentRef, totalWords, fontSize, ANCHOR_RATIO
  );
  const { tokenToWordRatio } = useAsrMapping(text, null, totalWords);
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

  // Mapping with matchedIndex handled in engine; no recognizedWords needed here

  const [recentAsr, setRecentAsr] = useState(false);
  const engine = useTeleprompterLoop({
    containerRef,
    contentRef,
    wordElsRef,
    caretRef,
    boundaryCaretRef,
    totalWords,
    pxPerWord,
    baseWpm: baseWpmState,
    holdOnSilence,
    talking,
    wpm,
    asrEnabled,
    lockToHighlight,
    matchedIndex,
    lastMatchAt,
    tokenToWordRatio,
    asrWindowScreens,
    asrSnapMode,
    stickyThresholdPx,
    asrLeadWords,
    manualPauseMs,
    manualScrollUntilRef,
    anchorRatio: ANCHOR_RATIO,
    useAsrDerivedDrift: useAsrDerivedDriftState,
    manualMode,
  });
  const highlightWords = engine.highlightWords;
  lastTargetPxRef = engine.debug.lastTargetPxRef;
  lastErrorPxRef = engine.debug.lastErrorPxRef;
  lastTargetModeRef = engine.debug.lastTargetModeRef;

  // Debug overlay renders live values; no extra state needed.
  // Optionally stop mic when ASR is on (if the user disables concurrent mic)
  useEffect(() => {
    if (asrEnabled && listening && !useMicWhileASRState) stop();
  }, [asrEnabled, listening, stop, useMicWhileASRState]);
  useEffect(() => {
    const id = setInterval(() => {
      setRecentAsr(!!lastMatchAt && Date.now() - lastMatchAt < 2000);
    }, 400);
    return () => clearInterval(id);
  }, [lastMatchAt]);

  // Engine handles ASR mapping and drift

  const reset = () => {
    engine.resetEngine();
    try { resetASR(); } catch (err) {
      console.error("Failed to reset ASR", err);
    }
  };

  // Avoid hydration mismatch: detect client and feature support after mount
  const [isClient, setIsClient] = useState(false);
  const [micSupported, setMicSupported] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
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

  const toggleFullscreen = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;

    if (document.fullscreenElement || focusMode) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => console.error("Failed to exit fullscreen", err));
      }
      setFocusMode(false);
      return;
    }

    if (supportsFullscreen && typeof cont.requestFullscreen === "function") {
      try {
        const maybePromise = cont.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
        if (isPromiseLike(maybePromise)) {
          maybePromise.catch((err) => {
            console.error("Failed to enter fullscreen", err);
            setFocusMode(true);
          });
        } else {
          // Older Safari on iOS reports support but never enters fullscreen; fall back to focus mode.
          window.setTimeout(() => {
            if (!document.fullscreenElement) setFocusMode(true);
          }, 200);
        }
      } catch (err) {
        console.error("Failed to request fullscreen", err);
        setFocusMode(true);
      }
    } else {
      setFocusMode(true);
    }
  }, [focusMode, supportsFullscreen]);

  // Track fullscreen state to adapt UI on mobile
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Detect fullscreen support (iOS Safari lacks it)
  useEffect(() => {
    try {
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      const ua = nav?.userAgent ?? "";
      const isiOS = /\b(iPad|iPhone|iPod)\b/i.test(ua);
      if (isiOS) {
        setSupportsFullscreen(false);
        return;
      }
      const el = document.documentElement as unknown as { requestFullscreen?: unknown };
      const docWithFlag = document as Document & { fullscreenEnabled?: boolean };
      const webkitFlag = (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled;
      const supported = Boolean(docWithFlag.fullscreenEnabled || webkitFlag) || typeof el.requestFullscreen === "function";
      setSupportsFullscreen(supported);
    } catch {
      setSupportsFullscreen(false);
    }
  }, []);

  // Lock scroll when in focus mode (CSS fallback for iOS)
  useEffect(() => {
    if (!focusMode) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [focusMode]);

  // Quick settings dialog focus trap handled inside the dialog component

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

  // Keyboard shortcuts: Space (start/stop), F (fullscreen)
  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false;
      const he = el as HTMLElement;
      return he.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(he.tagName);
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      const k = e.key;
      if (k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        if (permission !== 'granted') start();
        else if (listening) stop(); else start();
      } else if (k.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [permission, listening, start, stop, toggleFullscreen]);

  const nudgeByViewport = useCallback((sign: 1 | -1) => {
    engine.nudgeByViewport(sign);
    pushDebug(`manual nudge ${sign}`);
  }, [engine]);
  // Keep lockToHighlight consistent with ASR state
  useEffect(() => {
    if (!asrEnabled && lockToHighlight) setLockToHighlight(false);
  }, [asrEnabled, lockToHighlight]);

  /* Engine loop handled by hook */
  /*
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
      // Allow reaching the very end; visual buffer is handled by anchor positioning
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
      let anchorWordsForHighlight: number | null = null; // align green highlight to anchor when ASR drives
      let pendingCaretLeft: number | null = null;
      let pendingBoundaryLeft: number | null = null;
      // (reserved) helper to map anchor Y to word index (not used currently)
      if (speechIdxRef.current != null) {
        const matchedWord = Math.min(totalWords, Math.round((speechIdxRef.current + 1) * tokenToWordRatio));
        const asrTargetWords = Math.min(totalWords, matchedWord + asrLeadWords);
        anchorWordsForHighlight = Math.round(asrTargetWords);
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
        if (cont3 && elForPx && caret && lastCaretWordIdxRef.current !== idxForPx) {
          const contRect = cont3.getBoundingClientRect();
          const elRect = elForPx.getBoundingClientRect();
          const left = (elRect.left - contRect.left) + elRect.width / 2;
          pendingCaretLeft = Math.round(left);
        }
        // Boundary caret at end of green text (last highlighted word)
        if (cont3 && boundaryCaret && highlightWordsRef.current > 0) {
          const bIdx = Math.min(totalWords - 1, Math.max(0, highlightWordsRef.current - 1));
          if (lastBoundaryCaretIdxRef.current !== bIdx) {
            const bel = wordElsRef.current[bIdx];
            if (bel) {
              const contRect = cont3.getBoundingClientRect();
              const bRect = bel.getBoundingClientRect();
              const bLeft = (bRect.left - contRect.left) + bRect.width / 2;
              pendingBoundaryLeft = Math.round(bLeft);
            }
          }
        }
        // Compute pixel anchor for the ASR target word (used when not snapping instantly)
        if (cont3 && elForPx) {
          const pixelAnchor = Math.max(0,
            Math.min(
              cont3.scrollHeight - cont3.clientHeight,
              elForPx.offsetTop - cont3.clientHeight * ANCHOR_RATIO
            )
          );
          if (overrideTarget == null) overrideTarget = pixelAnchor;
        }
      }

      // Align highlight to the anchor line when ASR is driving the scroll
      // When ASR is off, derive highlight directly from DOM at the anchor line
      const desiredHighlight = (asrEnabled && anchorWordsForHighlight != null)
        ? anchorWordsForHighlight
        : Math.round(wordsReadRef.current);
      const newHighlight = Math.max(0, Math.min(totalWords, desiredHighlight));
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
        const modeLabel = overrideTarget != null ? "anchor" : "fallback";
        lastTargetPxRef.current = target;
        lastErrorPxRef.current = target - cont.scrollTop;
        let modeFinal = modeLabel;
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
          // fall through to caret/style writes
        }
        else {
          const alpha = Math.min(1, dt * 10);
          const nowMs = performance.now();
          if (nowMs > manualScrollUntilRef.current) {
            cont.scrollTop = cont.scrollTop + (target - cont.scrollTop) * alpha;
          } else {
            // User is manually scrolling; do not change reading progress/highlight here.
          }
        }

        // Apply pending caret/boundary writes after scroll
        if (pendingCaretLeft != null && caretRef.current) {
          caretRef.current.style.left = `${pendingCaretLeft}px`;
          const idx = Math.max(0, Math.min(totalWords - 1, Math.round(wordsReadRef.current) - 1));
          lastCaretWordIdxRef.current = idx;
        }
        if (pendingBoundaryLeft != null && boundaryCaretRef.current) {
          boundaryCaretRef.current.style.left = `${pendingBoundaryLeft}px`;
          lastBoundaryCaretIdxRef.current = Math.min(totalWords - 1, Math.max(0, highlightWordsRef.current - 1));
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  */

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
      {!isFullscreen && !focusMode && (
      <ToolbarMobile
        ui={ui}
        permission={permission}
        start={start}
        stop={stop}
        listening={listening}
        isClient={isClient}
        micSupported={micSupported}
        reset={reset}
        toggleFullscreen={toggleFullscreen}
        nudgeBack={() => nudgeByViewport(-1)}
        nudgeForward={() => nudgeByViewport(1)}
        asrSupported={asrSupported}
        asrEnabled={asrEnabled}
        setAsrEnabled={setAsrEnabled}
        recentAsr={recentAsr}
        wpm={wpm}
        onOpenSettings={() => setShowMobileSettings(true)}
        manualMode={manualMode}
        setManualMode={setManualMode}
      />)}

      <QuickSettingsDialog
        ui={ui}
        open={showMobileSettings}
        onClose={() => setShowMobileSettings(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        mirrorState={mirrorState}
        setMirrorState={setMirrorState}
        baseWpmState={baseWpmState}
        setBaseWpmState={setBaseWpmState}
        asrEnabled={asrEnabled}
        setAsrEnabled={setAsrEnabled}
      />

      {/* Desktop toolbar */}
      <ToolbarDesktop
        ui={ui}
        permission={permission}
        start={start}
        stop={stop}
        listening={listening}
        reset={reset}
        wpm={wpm}
        talking={talking}
        pxPerWord={pxPerWord}
        nudgeBack={() => nudgeByViewport(-1)}
        nudgeForward={() => nudgeByViewport(1)}
        asrSupported={asrSupported}
        asrEnabled={asrEnabled}
        setAsrEnabled={setAsrEnabled}
        recentAsr={recentAsr}
        manualMode={manualMode}
        setManualMode={setManualMode}
      />

      <div className={`relative ${focusMode || isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}
           style={focusMode || isFullscreen ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        <div
          ref={containerRef}
          className="h-[68vh] sm:h-[78vh] border rounded-lg overflow-y-auto touch-pan-y overscroll-contain bg-black text-white px-6 sm:px-10 py-10 sm:py-16 leading-relaxed tracking-wide"
          style={{ scrollBehavior: "auto", height: (isFullscreen || focusMode) ? "100vh" : undefined }}
        >
        <div
          ref={contentRef}
          className="text-2xl md:text-3xl whitespace-pre-wrap select-none"
          style={{ fontSize, transform: mirrorState ? "scaleX(-1)" : undefined, paddingBottom: bottomPadPx }}
        >
          {useMemo(() => {
            // Windowed rendering: render the whole string, but only wrap spans
            // (with refs and highlight styles) around the words near the anchor.
            const parts = text.split(/(\s+)/);
            // Compute dynamic window around current highlight
            const aheadWords = Math.max(0, totalWords - highlightWords);
            const baseWindow = Math.max(20, Math.round((viewportWords || 0) * 0.5));
            const shrinkNearEnd = Math.max(0, Math.round(aheadWords * 0.5));
            const windowSpan = Math.max(10, Math.min(baseWindow, shrinkNearEnd));
            const startWord = Math.max(0, highlightWords - windowSpan);
            const endWord = Math.min(totalWords, highlightWords + windowSpan);

            // Determine character boundaries for the mid window [startWord, endWord)
            let wordCounter = 0;
            let charLo = 0;
            let charHi = text.length;
            let acc = 0;
            for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              const isWs = /^\s+$/.test(part);
              if (!isWs) {
                const nextWordIdx = wordCounter;
                if (nextWordIdx === startWord) charLo = acc;
                wordCounter++;
                if (wordCounter === endWord) { charHi = acc + part.length; break; }
              }
              acc += part.length;
            }
            // Reset refs array for this render
            wordElsRef.current = new Array(totalWords).fill(null);

            const topStr = text.slice(0, charLo);
            const midStr = text.slice(charLo, charHi);
            const botStr = text.slice(charHi);

            // Render mid window with spans for words to enable refs and highlight
            const midNodes = (() => {
              const chunks = midStr.split(/(\s+)/);
              let gWordIdx = startWord; // global word index for this window
              const nodes: React.ReactNode[] = [];
              for (let i = 0; i < chunks.length; i++) {
                const part = chunks[i];
                const isWs = /^\s+$/.test(part);
                if (isWs) {
                  nodes.push(<span key={`ws-${i}`}>{part}</span>);
                } else if (part.length > 0) {
                  const idx = gWordIdx; // 0-based global word index
                  gWordIdx += 1;
                  const seen = idx > startWord && idx < highlightWords;
                  nodes.push(
                    <span
                      key={`w-${i}`}
                      ref={(el) => { wordElsRef.current[idx] = el; }}
                      className={seen ? "text-emerald-300" : undefined}
                    >
                      {part}
                    </span>
                  );
                }
              }
              return nodes;
            })();

            return (
              <>
                {topStr}
                {midNodes}
                {botStr}
              </>
            );
          }, [text, highlightWords, totalWords, viewportWords])}
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
        {/* Exit affordance in full view */}
        {(isFullscreen || focusMode) && (
          <button
            onClick={toggleFullscreen}
            type="button"
            className="absolute top-2 right-2 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/20 z-50"
            title={ui.fullscreenLabel}
            aria-label={ui.fullscreenLabel}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            ✕
          </button>
        )}
      </div>
      {asrEnabled && (
        <div className="mt-2 text-xs opacity-80">
          <div className="font-medium">ASR transcript (last):</div>
          <div className="truncate" title={lastTranscript}>{lastTranscript || "(no audio recognized yet)"}</div>
        </div>
      )}
      {showDebug && (
        <div className="fixed right-4 bottom-4 z-50 text-xs bg-black/60 text-white border border-white/20 rounded p-3 space-y-1 max-w-[46vw]">
          <div><b>manual</b>: {String(manualMode)} • <b>lock</b>: {String(lockToHighlight)} • <b>ASR</b>: {String(asrEnabled)}</div>
          <div><b>idx</b>: {matchedIndex ?? "-"} • <b>seen</b>: {highlightWords}</div>
          <div><b>reading</b>: {highlightWords} • <b>highlight</b>: {highlightWords}</div>
          <div><b>viewportWords</b>: {Math.round(viewportWords)} • <b>tailBuf</b>: {trailingBufferWords}</div>
          <div><b>windowTokens</b>: {dynamicWindowTokens}</div>
          <div><b>px/word</b>: {pxPerWord.toFixed(2)} • <b>recentASR</b>: {String(recentAsr)}</div>
          <div>
            <b>target</b>: {Math.round(lastTargetPxRef.current)} • <b>errorPx</b>: {Math.round(lastErrorPxRef.current)} • <b>mode</b>: {lastTargetModeRef.current}
          </div>
          <div>
            <b>drift</b>: {asrEnabled ? (useAsrDerivedDriftState ? "asr" : (useMicWhileASRState ? "mic" : "none")) : "none"}
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
