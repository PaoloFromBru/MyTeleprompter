"use client";
import React from "react";
import Dialog from "@/components/ui/Dialog";

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
  return (
    <Dialog open={open} onClose={onClose} labelledById="mobile-quick-settings-title" overlayClassName="fixed inset-0 z-50 bg-black/75 flex items-center justify-center" panelClassName="card text-white p-4 w-11/12 max-w-sm space-y-3 bg-neutral-900/80">
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
    </Dialog>
  );
}
