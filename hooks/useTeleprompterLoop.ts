"use client";
import { MutableRefObject, useCallback, useEffect, useRef, useState } from "react";

export type SnapMode = "gentle" | "aggressive" | "instant" | "sticky";

export function useTeleprompterLoop(opts: {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  wordElsRef: MutableRefObject<Array<HTMLSpanElement | null>>;
  caretRef: MutableRefObject<HTMLDivElement | null>;
  boundaryCaretRef: MutableRefObject<HTMLDivElement | null>;
  totalWords: number;
  pxPerWord: number;
  baseWpm: number;
  holdOnSilence: boolean;
  talking: boolean;
  wpm: number;
  asrEnabled: boolean;
  lockToHighlight: boolean;
  matchedIndex: number | null;
  lastMatchAt: number | null;
  tokenToWordRatio: number;
  asrWindowScreens: 1 | 2 | 4;
  asrSnapMode: SnapMode;
  stickyThresholdPx: number;
  asrLeadWords: number;
  manualPauseMs: number;
  manualScrollUntilRef: MutableRefObject<number>;
  anchorRatio: number;
  useAsrDerivedDrift: boolean;
  manualMode?: boolean;
}) {
  const {
    containerRef, contentRef, wordElsRef, caretRef, boundaryCaretRef,
    totalWords, pxPerWord, baseWpm, holdOnSilence, talking, wpm,
    asrEnabled, lockToHighlight, matchedIndex, lastMatchAt, tokenToWordRatio,
    asrWindowScreens, asrSnapMode, stickyThresholdPx, asrLeadWords,
    manualPauseMs, manualScrollUntilRef, anchorRatio, useAsrDerivedDrift, manualMode = false,
  } = opts;

  // Internal engine state
  const [highlightWords, setHighlightWords] = useState(0);
  const highlightWordsRef = useRef(0);
  const wordsReadRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const integratorRef = useRef(0);
  const wpmRef = useRef(wpm);
  const talkingRef = useRef(talking);
  const speechIdxRef = useRef<number | null>(null);
  const asrDriftWpsRef = useRef(0);
  const lastAsrIdxRef = useRef<number | null>(null);
  const lastAsrTsRef = useRef<number | null>(null);
  const lastCaretWordIdxRef = useRef<number | null>(null);
  const lastBoundaryCaretIdxRef = useRef<number | null>(null);
  const settleUntilRef = useRef(0);
  const lastPxPerWordRef = useRef(pxPerWord);

  // Debug refs
  const lastTargetPxRef = useRef(0);
  const lastErrorPxRef = useRef(0);
  const lastTargetModeRef = useRef<"fallback"|"anchor"|"sticky"|"instant">("fallback");

  // Mirror dynamic inputs into refs to avoid dependency churn
  useEffect(() => { wpmRef.current = wpm; }, [wpm]);
  useEffect(() => { talkingRef.current = talking; }, [talking]);

  // When geometry changes significantly, allow a short settle period to avoid highlight sweeps
  useEffect(() => {
    const prev = lastPxPerWordRef.current;
    const rel = Math.abs(pxPerWord - prev) / Math.max(1e-6, prev);
    if (rel > 0.1) {
      settleUntilRef.current = performance.now() + 200;
    }
    lastPxPerWordRef.current = pxPerWord;
  }, [pxPerWord]);

  // Entering manual mode: short settle to let anchor/caret sync without sweeping highlight
  useEffect(() => {
    if (manualMode) settleUntilRef.current = performance.now() + 200;
  }, [manualMode]);

  // Accept ASR matches within a tolerant window around current anchor
  useEffect(() => {
    if (matchedIndex == null) return;
    const cont = containerRef.current;
    if (!cont) { speechIdxRef.current = matchedIndex; return; }
    const visibleWords = cont.clientHeight / Math.max(1, pxPerWord);
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
  }, [matchedIndex, pxPerWord, asrWindowScreens, tokenToWordRatio, totalWords, containerRef]);

  // ASR-derived drift estimate (words/sec)
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
  }, [matchedIndex, lastMatchAt, tokenToWordRatio]);

  // Keep anchor stable when geometry changes
  useEffect(() => {
    const cont = containerRef.current, content = contentRef.current;
    if (!cont || !content) return;
    const targetWords = (cont.scrollTop + cont.clientHeight * anchorRatio) / Math.max(1, pxPerWord);
    wordsReadRef.current = Math.max(0, Math.min(totalWords, targetWords));
    integratorRef.current = 0;
  }, [pxPerWord, totalWords, containerRef, contentRef, anchorRatio]);

  // Main animation frame loop
  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      if (lastTsRef.current == null) lastTsRef.current = now;
      const dt = (now - lastTsRef.current) / 1000;
      lastTsRef.current = now;

      const wordsPerSec = (asrEnabled && useAsrDerivedDrift && !manualMode) ? asrDriftWpsRef.current : ((wpmRef.current || 0) / 60);
      let next = wordsReadRef.current;
      const allowDrift = !(asrEnabled && lockToHighlight) && !manualMode;
      if (allowDrift) {
        if (talkingRef.current) next += wordsPerSec * dt;
        else if (!holdOnSilence) next += (0.15 * (baseWpm / 60)) * dt;
      } else if (manualMode) {
        // In manual mode, derive wordsRead from DOM geometry (binary search on word spans)
        const cont = containerRef.current;
        if (cont) {
          const anchorY = cont.scrollTop + cont.clientHeight * anchorRatio;
          let lo = 0, hi = Math.max(0, totalWords - 1), ans = 0;
          const arr = wordElsRef.current;
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const el = arr[mid];
            if (!el) { ans = Math.round(wordsReadRef.current); break; }
            const y = el.offsetTop;
            if (y <= anchorY) { ans = mid; lo = mid + 1; }
            else { hi = mid - 1; }
          }
          next = ans + 1; // 1-based word count at/above anchor
        }
      }
      wordsReadRef.current = Math.max(0, Math.min(totalWords, next));

      // Accept current ASR match again (in case of geometry changes during the frame)
      const contA = containerRef.current;
      if (!manualMode && contA && matchedIndex != null) {
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
      let anchorWordsForHighlight: number | null = null;
      let pendingCaretLeft: number | null = null;
      let pendingBoundaryLeft: number | null = null;

      if (!manualMode && speechIdxRef.current != null) {
        const contNode = containerRef.current;
        const contentNode = contentRef.current;
        const approxViewportWords = contNode ? (contNode.clientHeight / Math.max(1, pxPerWord)) : 0;
        const matchedWord = Math.min(totalWords, Math.round((speechIdxRef.current + 1) * tokenToWordRatio));
        const rawTargetWords = Math.min(totalWords, matchedWord + asrLeadWords);
        const currentWords = wordsReadRef.current;
        const maxForwardJump = Math.max(16, approxViewportWords > 0 ? approxViewportWords * 1.2 : 0);
        const targetWords = Math.max(currentWords, Math.min(currentWords + maxForwardJump, rawTargetWords));
        anchorWordsForHighlight = Math.round(targetWords);
        const diff = targetWords - currentWords;
        if (diff > 0.1) {
          if (asrSnapMode === "aggressive") {
            wordsReadRef.current = targetWords;
            integratorRef.current = 0;
            if (contNode && contentNode) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(wordsReadRef.current) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                overrideTarget = Math.max(0,
                  Math.min(
                    contentNode.scrollHeight - contNode.clientHeight,
                    el.offsetTop - contNode.clientHeight * anchorRatio
                  )
                );
              }
            }
          } else if (asrSnapMode === "instant") {
            wordsReadRef.current = targetWords;
            integratorRef.current = 0;
            if (contNode && contentNode) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(targetWords) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                const target = Math.max(0,
                  Math.min(
                    contentNode.scrollHeight - contNode.clientHeight,
                    el.offsetTop - contNode.clientHeight * anchorRatio
                  )
                );
                overrideTarget = target;
              }
            }
          } else {
            wordsReadRef.current += Math.max(0, diff * 0.6);
            if (contNode && contentNode) {
              const idx = Math.max(0, Math.min(totalWords - 1, Math.round(targetWords) - 1));
              const el = wordElsRef.current[idx];
              if (el) {
                overrideTarget = Math.max(0,
                  Math.min(
                    contentNode.scrollHeight - contNode.clientHeight,
                    el.offsetTop - contNode.clientHeight * anchorRatio
                  )
                );
              }
            }
          }
        }
        // Caret positions and pixel anchor for ASR target
        const caret = caretRef.current;
        const boundaryCaret = boundaryCaretRef.current;
        const idxForPx = Math.max(0, Math.min(totalWords - 1, Math.round(targetWords) - 1));
        const elForPx = wordElsRef.current[idxForPx];
        if (contNode && elForPx && caret && lastCaretWordIdxRef.current !== idxForPx) {
          const contRect = contNode.getBoundingClientRect();
          const elRect = elForPx.getBoundingClientRect();
          const left = (elRect.left - contRect.left) + elRect.width / 2;
          pendingCaretLeft = Math.round(left);
        }
        if (contNode && boundaryCaret && highlightWordsRef.current > 0) {
          const bIdx = Math.min(totalWords - 1, Math.max(0, highlightWordsRef.current - 1));
          if (lastBoundaryCaretIdxRef.current !== bIdx) {
            const bel = wordElsRef.current[bIdx];
            if (bel) {
              const contRect = contNode.getBoundingClientRect();
              const bRect = bel.getBoundingClientRect();
              const bLeft = (bRect.left - contRect.left) + bRect.width / 2;
              pendingBoundaryLeft = Math.round(bLeft);
            }
          }
        }
        if (contNode && elForPx) {
          const pixelAnchor = Math.max(0,
            Math.min(
              contNode.scrollHeight - contNode.clientHeight,
              elForPx.offsetTop - contNode.clientHeight * anchorRatio
            )
          );
          if (overrideTarget == null) overrideTarget = pixelAnchor;
        }
      }

      // Align highlight to anchor when ASR drives
      const desiredHighlight = (!manualMode && asrEnabled && anchorWordsForHighlight != null)
        ? anchorWordsForHighlight
        : Math.round(wordsReadRef.current);
      const candidate = Math.max(0, Math.min(totalWords, desiredHighlight));
      const nowTs = performance.now();
      const settle = manualMode && nowTs < settleUntilRef.current && nowTs > 0 && nowTs >= 0 && !(manualScrollUntilRef.current > nowTs);
      const newHighlight = settle ? highlightWordsRef.current : candidate;
      if (newHighlight !== highlightWordsRef.current) {
        highlightWordsRef.current = newHighlight;
        setHighlightWords(newHighlight);
      }

      const cont = containerRef.current, content = contentRef.current;
      if (cont && content) {
        const fallbackTarget = Math.max(0,
          Math.min(
            content.scrollHeight - cont.clientHeight,
            wordsReadRef.current * pxPerWord - cont.clientHeight * anchorRatio
          )
        );
        const target = overrideTarget ?? fallbackTarget;
        const modeLabel = overrideTarget != null ? "anchor" : "fallback";
        lastTargetPxRef.current = target;
        lastErrorPxRef.current = target - cont.scrollTop;
        let modeFinal: "fallback" | "anchor" | "sticky" | "instant" = modeLabel;
        if (asrSnapMode === "sticky") modeFinal = "sticky";
        else if (asrSnapMode === "instant") modeFinal = "instant";
        lastTargetModeRef.current = modeFinal;
        // Sticky snap with threshold
        if (!manualMode && asrSnapMode === "sticky") {
          const err = target - cont.scrollTop;
          if (Math.abs(err) > stickyThresholdPx) {
            cont.scrollTop = Math.max(0, Math.min(content.scrollHeight - cont.clientHeight, target));
          } else {
            const alphaS = Math.min(1, dt * 10);
            cont.scrollTop = cont.scrollTop + err * alphaS;
          }
        } else if (!manualMode) {
          const alpha = Math.min(1, dt * 10);
          const nowMs = performance.now();
          if (nowMs > manualScrollUntilRef.current) {
            cont.scrollTop = cont.scrollTop + (target - cont.scrollTop) * alpha;
          }
        }

        // Apply pending caret/boundary after scroll
        if (pendingCaretLeft != null && caretRef.current) {
          caretRef.current.style.left = `${pendingCaretLeft}px`;
          const idx = Math.max(0, Math.min(totalWords - 1, Math.round(wordsReadRef.current) - 1));
          lastCaretWordIdxRef.current = idx;
        }
        if (pendingBoundaryLeft != null && boundaryCaretRef.current) {
          boundaryCaretRef.current.style.left = `${pendingBoundaryLeft}px`;
          lastBoundaryCaretIdxRef.current = Math.min(totalWords - 1, Math.max(0, highlightWordsRef.current - 1));
        }
        // In manual mode, also position caret at anchor even without ASR
        if (manualMode && caretRef.current) {
          const idx = Math.max(0, Math.min(totalWords - 1, Math.round(wordsReadRef.current) - 1));
          const el = wordElsRef.current[idx];
          if (el) {
            const rectC = cont.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            caretRef.current.style.left = `${Math.round((r.left - rectC.left) + r.width/2)}px`;
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [
    // Stable refs
    containerRef,
    contentRef,
    wordElsRef,
    caretRef,
    boundaryCaretRef,
    manualScrollUntilRef,
    pxPerWord,
    totalWords,
    baseWpm,
    holdOnSilence,
    asrEnabled,
    lockToHighlight,
    matchedIndex,
    tokenToWordRatio,
    asrWindowScreens,
    asrSnapMode,
    stickyThresholdPx,
    asrLeadWords,
    manualPauseMs,
    anchorRatio,
    useAsrDerivedDrift,
    manualMode,
  ]);

  const resetEngine = useCallback(() => {
    wordsReadRef.current = 0;
    integratorRef.current = 0;
    const cont = containerRef.current;
    if (cont) cont.scrollTop = 0;
    highlightWordsRef.current = 0;
    setHighlightWords(0);
    settleUntilRef.current = performance.now() + 250;
  }, [containerRef]);

  return {
    highlightWords,
    resetEngine,
    debug: { lastTargetPxRef, lastErrorPxRef, lastTargetModeRef },
    nudgeByViewport: (sign: 1 | -1) => {
      const cont = containerRef.current;
      const deltaWords = cont ? (cont.clientHeight / Math.max(1, pxPerWord)) * 0.15 : 10;
      wordsReadRef.current = Math.max(0, Math.min(totalWords, wordsReadRef.current + sign * deltaWords));
      integratorRef.current = 0;
      manualScrollUntilRef.current = performance.now() + manualPauseMs;
    },
  };
}
