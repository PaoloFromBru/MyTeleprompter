"use client";
import { useMemo } from "react";
import { normalizeToken, tokenize } from "@/lib/text";

export function useAsrMapping(text: string, matchedIndex: number | null, totalWords: number) {
  const tokensLen = useMemo(() => tokenize(text).length, [text]);
  const tokenToWordRatio = useMemo(() => totalWords / Math.max(1, tokensLen), [totalWords, tokensLen]);

  // Cumulative token count per word, following the same split used for rendering
  const tokenCumulativePerWord = useMemo(() => {
    const parts = text.split(/(\s+)/);
    const cum: number[] = [];
    let acc = 0;
    for (const part of parts) {
      const isWs = /^\s+$/.test(part);
      if (isWs) continue;
      const tok = normalizeToken(part);
      const inc = tok ? 1 : 0;
      acc += inc;
      cum.push(acc);
    }
    return cum;
  }, [text]);

  const recognizedWords = useMemo(() => {
    if (matchedIndex == null) return 0;
    const t = matchedIndex + 1; // last token in the match, 1-based count
    const idx = tokenCumulativePerWord.findIndex((c) => c >= t);
    if (idx < 0) return tokenCumulativePerWord.length;
    return idx + 1; // convert to 1-based word count
  }, [matchedIndex, tokenCumulativePerWord]);

  return { tokensLen, tokenToWordRatio, recognizedWords, tokenCumulativePerWord };
}

