"use client";
import React from "react";

type UIStrings = {
  micEnable: string;
  start: string;
  stop: string;
  reset: string;
  fullscreenLabel: string;
  nudgeBackTitle: string;
  nudgeForwardTitle: string;
  asrFollowTitle: string;
  asrUnsupportedTitle: string;
  settingsTitle: string;
};

type Props = {
  ui: UIStrings;
  permission?: string;
  start: () => void;
  stop: () => void;
  listening: boolean;
  isClient: boolean;
  micSupported: boolean | null;
  reset: () => void;
  toggleFullscreen: () => void;
  nudgeBack: () => void;
  nudgeForward: () => void;
  asrSupported: boolean;
  asrEnabled: boolean;
  setAsrEnabled: (v: boolean) => void;
  recentAsr: boolean;
  wpm: number;
  onOpenSettings: () => void;
  manualMode: boolean;
  setManualMode: (v: boolean) => void;
};

export default function ToolbarMobile({ ui, permission, start, stop, listening, isClient, micSupported, reset, toggleFullscreen, nudgeBack, nudgeForward, asrSupported, asrEnabled, setAsrEnabled, recentAsr, wpm, onOpenSettings, manualMode, setManualMode }: Props) {
  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/90 backdrop-blur border-t border-white/10 text-white flex items-center justify-between gap-2 p-2">
      <div className="flex items-center gap-1">
        <button
          onClick={permission !== "granted" ? start : (listening ? stop : start)}
          className={`btn ${listening ? "btn-primary" : "btn-primary"}`}
          aria-label={permission !== "granted" ? ui.micEnable : (listening ? ui.stop : ui.start)}
          title={permission !== "granted" ? ui.micEnable : (listening ? ui.stop : ui.start)}
          disabled={isClient ? micSupported === false : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10a7 7 0 0 1-14 0"/>
            <path d="M12 17v5"/>
          </svg>
        </button>
        <button onClick={reset} className="btn btn-secondary" aria-label={ui.reset} title={ui.reset} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </button>
        <button onClick={toggleFullscreen} className="btn btn-secondary" aria-label={ui.fullscreenLabel} title={ui.fullscreenLabel} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 4 20 4 20 8"/>
            <polyline points="8 20 4 20 4 16"/>
            <polyline points="20 16 20 20 16 20"/>
            <polyline points="4 8 4 4 8 4"/>
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={nudgeBack} className="btn btn-secondary" aria-label={ui.nudgeBackTitle} title={ui.nudgeBackTitle} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <button onClick={nudgeForward} className="btn btn-secondary" aria-label={ui.nudgeForwardTitle} title={ui.nudgeForwardTitle} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setManualMode(!manualMode)}
          className={`btn ${manualMode ? 'btn-primary' : 'btn-secondary'}`}
          aria-label="Manual mode"
          title="Manual mode"
          type="button"
        >
          M
        </button>
        <button
          onClick={() => setAsrEnabled(!asrEnabled)}
          className={`btn ${asrEnabled ? "btn-primary" : "btn-secondary"}`}
          aria-label={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle}
          title={asrSupported ? ui.asrFollowTitle : ui.asrUnsupportedTitle}
          type="button"
          disabled={!asrSupported}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h2M7 12h2M11 12h2M15 12h2M19 12h2"/>
            <path d="M7 8v8M11 6v12M15 8v8"/>
          </svg>
        </button>
        <span className="text-xs tabular-nums px-1">{Math.round(wpm)} WPM</span>
        {asrEnabled && (
          <span className={`inline-block w-2 h-2 rounded-full ${recentAsr ? "bg-emerald-400" : "bg-neutral-400"}`} title="Recent ASR match" />
        )}
        <button onClick={onOpenSettings} className="btn btn-secondary" aria-label={ui.settingsTitle} title={ui.settingsTitle} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6a1.65 1.65 0 0 0 1-1.51V2a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 16 3.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 8c.36.31.59.76.59 1.25S20.76 10.69 20.4 11a1.65 1.65 0 0 0-.33 1.82z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
