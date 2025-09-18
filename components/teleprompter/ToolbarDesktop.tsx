"use client";
import React from "react";

type Props = {
  ui: any;
  permission?: string;
  start: () => void;
  stop: () => void;
  listening: boolean;
  reset: () => void;
  wpm: number;
  talking: boolean;
  pxPerWord: number;
  nudgeBack: () => void;
  nudgeForward: () => void;
  asrSupported: boolean;
  asrEnabled: boolean;
  setAsrEnabled: (v: boolean) => void;
  recentAsr: boolean;
  manualMode: boolean;
  setManualMode: (v: boolean) => void;
};

export default function ToolbarDesktop({ ui, permission, start, stop, listening, reset, wpm, talking, pxPerWord, nudgeBack, nudgeForward, asrSupported, asrEnabled, setAsrEnabled, recentAsr, manualMode, setManualMode }: Props) {
  return (
    <div className="hidden sm:flex flex-wrap items-start justify-between mb-3 gap-2 min-h-[44px]">
      <div className="flex items-center gap-2 whitespace-nowrap">
        {permission !== "granted" ? (
          <button onClick={start} className="btn btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed" title={ui.micEnable}>
            🎤 {ui.micEnable}
          </button>
        ) : (
          <button onClick={listening ? stop : start} className="btn btn-primary text-sm">
            {listening ? `⏹ ${ui.stop}` : `▶️ ${ui.start}`}
          </button>
        )}
        <button onClick={reset} className="btn btn-secondary text-sm">⟲ {ui.reset}</button>
      </div>
      <div className="flex items-center gap-2 text-xs tabular-nums flex-wrap">
        <span className="inline-block max-w-[60vw] truncate">WPM: <b>{Math.round(wpm)}</b> • {talking ? ui.statusSpeaking : ui.statusPaused} • {ui.pxWord}: {pxPerWord.toFixed(1)}</span>
        <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
        <div className="flex items-center gap-1 whitespace-nowrap">
          <button onClick={nudgeBack} className="btn btn-secondary" title={ui.nudgeBackTitle} type="button" aria-label={ui.nudgeBackTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button onClick={nudgeForward} className="btn btn-secondary" title={ui.nudgeForwardTitle} type="button" aria-label={ui.nudgeForwardTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
          <button onClick={() => setManualMode(!manualMode)} className={`btn text-xs ${manualMode ? 'btn-primary' : 'btn-secondary'}`} title="Manual mode" type="button">
            {manualMode ? 'Manual: ON' : 'Manual: OFF'}
          </button>
          <div className="hidden sm:block h-3 w-px bg-white/20 mx-1" />
          <button onClick={() => setAsrEnabled(!asrEnabled)} className={`btn text-xs ${asrEnabled ? "btn-primary" : "btn-secondary"}`} title={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle} type="button" disabled={!asrSupported}>
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
  );
}
