"use client";
import { useEffect, useRef, useState } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";
import Dialog from "@/components/ui/Dialog";

export default function SaveScriptDialog({
  lang,
  open,
  onClose,
  onConfirm,
  initialTitle,
}: {
  lang?: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
  initialTitle?: string;
}) {
  const ui = messages[normalizeUILang(lang)];
  const [title, setTitle] = useState(initialTitle || "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setTitle(initialTitle || ""); }, [initialTitle, open]);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} labelledById="save-dialog-title" overlayClassName="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" panelClassName="card bg-neutral-900/85 text-white p-4 w-11/12 max-w-sm space-y-3">
      <h2 id="save-dialog-title" className="text-base font-medium">{ui.saveLabel}</h2>
      <label className="text-sm flex flex-col gap-1">
        <span>{ui.saveTitleLabel}</span>
        <input
          ref={inputRef}
          className="input w-full bg-white/10 text-white"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={ui.saveTitleLabel}
        />
      </label>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button className="btn btn-secondary" onClick={onClose} type="button">{ui.helpCloseLabel}</button>
        <button
          className="btn btn-primary"
          onClick={() => { if (title.trim()) onConfirm(title.trim()); }}
          type="button"
          disabled={!title.trim()}
        >
          {ui.saveLabel}
        </button>
      </div>
    </Dialog>
  );
}
