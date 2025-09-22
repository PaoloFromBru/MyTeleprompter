import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampScrollTarget, computeFallbackTarget, computeAsrInstantWps } from './engineMath';

test('computeFallbackTarget positions anchor correctly', () => {
  const pxPerWord = 10; // 10px per word
  const clientHeight = 400; // viewport height
  const anchor = 0.35; // 35% from top
  const wordsRead = 100; // should be 100*10 - 400*0.35 = 1000 - 140 = 860
  assert.equal(computeFallbackTarget(wordsRead, pxPerWord, clientHeight, anchor), 860);
});

test('clampScrollTarget clamps within scrollable range', () => {
  const scrollHeight = 2000;
  const clientHeight = 500;
  assert.equal(clampScrollTarget(-50, scrollHeight, clientHeight), 0);
  assert.equal(clampScrollTarget(100, scrollHeight, clientHeight), 100);
  assert.equal(clampScrollTarget(1800, scrollHeight, clientHeight), 1500);
});

test('computeAsrInstantWps computes bounded words/sec', () => {
  const lastIdx = 100;
  const nowIdx = 160; // +60 tokens
  const lastTs = 0;
  const nowTs = 10_000; // 10s
  const t2w = 0.5; // 2 tokens per word -> 0.5 ratio
  // dWords = 60 * 0.5 = 30 words in 10s => 3 wps
  assert.equal(computeAsrInstantWps(lastIdx, nowIdx, lastTs, nowTs, t2w), 3);
  // Negative or zero dt yields 0
  assert.equal(computeAsrInstantWps(lastIdx, nowIdx, nowTs, lastTs, t2w), 0);
  // Cap at 6
  assert.equal(computeAsrInstantWps(0, 1000, 0, 10, 1), 6);
});

