"use client";
import { useEffect, useRef, useState } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";

export default function HelpPanel({ lang }: { lang?: string }) {
  const ui = messages[normalizeUILang(lang)];
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [env, setEnv] = useState<{ secure: boolean | null; mic: boolean | null; asr: boolean | null }>({ secure: null, mic: null, asr: null });
  useEffect(() => {
    try {
      const secure = location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname);
      const nav = typeof navigator !== "undefined" ? navigator : undefined;
      const mic = !!(
        (nav && nav.mediaDevices && nav.mediaDevices.getUserMedia) ||
        (nav ? ("webkitGetUserMedia" in nav || "mozGetUserMedia" in nav || "getUserMedia" in nav) : false)
      );
      const w = typeof window !== "undefined" ? window : undefined;
      const asr = !!(w && ("SpeechRecognition" in w || "webkitSpeechRecognition" in w));
      setEnv({ secure, mic, asr });
    } catch (err) {
      console.error("Failed to detect environment features", err);
      setEnv({ secure: false, mic: false, asr: false });
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "?" && e.shiftKey) || e.key.toLowerCase() === "h") {
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Focus trap and initial focus when open
  useEffect(() => {
    if (!open) return;
    const root = panelRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', trap as unknown as EventListener);
    return () => root.removeEventListener('keydown', trap as unknown as EventListener);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded border bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm"
        title={ui.helpTitle}
      >
        ❔ {ui.helpOpenLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="help-panel-title">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div ref={panelRef} className="absolute inset-x-4 top-10 md:inset-x-auto md:right-10 md:w-[560px] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-lg shadow-xl border max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 id="help-panel-title" className="text-base font-semibold">{ui.helpTitle}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2 py-1 text-sm rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700"
              >
                {ui.helpCloseLabel}
              </button>
            </div>
            <div className="p-4 space-y-4 text-sm leading-relaxed">
              <div>
                <div className="font-medium mb-1">{ui.helpShortcutsTitle}</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Space: {ui.start}/{ui.stop}</li>
                  <li>↑/↓: {ui.nudgeBackTitle} / {ui.nudgeForwardTitle}</li>
                  <li>F: {ui.fullscreenLabel}</li>
                  <li>M: {ui.mirrorModeLabel}</li>
                  <li>+ / -: {ui.fontSizeLabel}</li>
                  <li>H or ?: {ui.helpOpenLabel}</li>
                </ul>
              </div>

              <div>
                <div className="font-medium mb-1">{ui.helpEnvironmentTitle}</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    {ui.helpSecureContextLabel}: {env.secure == null ? "…" : env.secure ? "✅" : "⚠️"}
                  </li>
                  <li>
                    {ui.helpMicSupportLabel}: {env.mic == null ? "…" : env.mic ? "✅" : "⚠️"}
                  </li>
                  <li>
                    {ui.helpASRSupportLabel}: {env.asr == null ? "…" : env.asr ? "✅" : "⚠️"}
                  </li>
                </ul>
              </div>

              <div>
                <div className="font-medium mb-1">{ui.helpFilesTitle}</div>
                <p>{ui.helpFilesContent}</p>
              </div>

              <div>
                <div className="font-medium mb-1">{ui.helpTroubleshootTitle}</div>
                <p>{ui.helpTroubleshootContent}</p>
              </div>

              <div>
                <div className="font-medium mb-1">{ui.helpPrivacyTitle}</div>
                <p>{ui.helpPrivacyNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
