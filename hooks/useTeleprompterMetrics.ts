"use client";
import { MutableRefObject, useEffect, useMemo, useState } from "react";

export function useTeleprompterMetrics(
  containerRef: MutableRefObject<HTMLDivElement | null>,
  contentRef: MutableRefObject<HTMLDivElement | null>,
  totalWords: number,
  fontSize: number | undefined,
  anchorRatio: number
) {
  const [pxPerWord, setPxPerWord] = useState(2);
  const [bottomPadPx, setBottomPadPx] = useState(0);

  useEffect(() => {
    const calc = () => {
      const cont = containerRef.current, content = contentRef.current;
      if (!cont || !content || totalWords === 0) return;
      const usable = content.scrollHeight - cont.clientHeight;
      setPxPerWord(Math.max(1, usable / Math.max(1, totalWords)));
      setBottomPadPx(Math.max(0, Math.ceil(cont.clientHeight * (1 - anchorRatio))));
    };
    const id = setTimeout(calc, 50);
    window.addEventListener("resize", calc);
    return () => {
      clearTimeout(id);
      window.removeEventListener("resize", calc);
    };
  }, [containerRef, contentRef, totalWords, fontSize, anchorRatio]);

  const viewportWords = useMemo(() => {
    const cont = containerRef.current;
    return cont ? cont.clientHeight / Math.max(1, pxPerWord) : 0;
  }, [pxPerWord, containerRef]);

  const trailingBufferWords = useMemo(() => {
    const cont = containerRef.current;
    if (!cont) return 0;
    return Math.max(0, Math.ceil((cont.clientHeight * (1 - anchorRatio)) / Math.max(1, pxPerWord)));
  }, [pxPerWord, containerRef, anchorRatio]);

  return { pxPerWord, bottomPadPx, viewportWords, trailingBufferWords };
}

