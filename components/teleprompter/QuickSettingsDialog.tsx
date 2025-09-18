"use client";
import React, { useEffect, useRef } from "react";

type UIStrings = {
  settingsTitle: string;
  fontSizeLabel: string;
  mirrorModeLabel: string;
  baseWpmLabel: string;
  asrFollowTitle: string;
  helpCloseLabel: string;
};

type Props = {
  ui: UIStrings;
  open: boolean;
  onClose: () => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  mirrorState: boolean;
  setMirrorState: (v: boolean) => void;
  baseWpmState: number;
  setBaseWpmState: (n: number) => void;
  asrEnabled: boolean;
  setAsrEnabled: (v: boolean) => void;
};

export default function QuickSettingsDialog({ ui, open, onClose, fontSize, setFontSize, mirrorState, setMirrorState, baseWpmState, setBaseWpmState, asrEnabled, setAsrEnabled }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = panelRef.current?.parentElement ?? null;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>('button:not([disabled]), input, select');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', trap as unknown as EventListener);
    return () => root.removeEventListener('keydown', trap as unknown as EventListener);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="mobile-quick-settings-title">
      <div ref={panelRef} className="card text-white p-4 w-11/12 max-w-sm space-y-3 bg-neutral-900/80">
        <h2 id="mobile-quick-settings-title" className="text-base font-medium">{ui.settingsTitle}</h2>
        <label className="flex items-center gap-2">
          <span className="whitespace-nowrap">{ui.fontSizeLabel}</span>
          <input type="range" min={20} max={72} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
          <span className="w-10 text-right tabular-nums">{fontSize}px</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={mirrorState} onChange={(e) => setMirrorState(e.target.checked)} />
          <span>{ui.mirrorModeLabel}</span>
        </label>
        <label className="flex items-center justify-between">
          <span>{ui.baseWpmLabel}</span>
          <input type="number" className="w-20 input" value={baseWpmState} onChange={(e) => setBaseWpmState(Number(e.target.value))} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={asrEnabled} onChange={(e) => setAsrEnabled(e.target.checked)} />
          <span>{ui.asrFollowTitle}</span>
        </label>
        <div className="text-right pt-2">
          <button className="btn btn-primary" onClick={onClose}>{ui.helpCloseLabel}</button>
        </div>
      </div>
    </div>
  );
}
