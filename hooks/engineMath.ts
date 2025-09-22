export function computeFallbackTarget(wordsRead: number, pxPerWord: number, clientHeight: number, anchorRatio: number) {
  return wordsRead * Math.max(0, pxPerWord) - clientHeight * anchorRatio;
}

export function clampScrollTarget(target: number, scrollHeight: number, clientHeight: number) {
  const max = Math.max(0, scrollHeight - clientHeight);
  return Math.max(0, Math.min(max, target));
}

export function computeAsrInstantWps(
  lastIdx: number,
  nowIdx: number,
  lastTsMs: number,
  nowTsMs: number,
  tokenToWordRatio: number
) {
  const dt = (nowTsMs - lastTsMs) / 1000;
  const dTokens = nowIdx - lastIdx;
  const dWords = dTokens * tokenToWordRatio;
  if (!(dt > 1e-3) || dWords < 0) return 0;
  return Math.min(6, Math.max(0, dWords / dt));
}

