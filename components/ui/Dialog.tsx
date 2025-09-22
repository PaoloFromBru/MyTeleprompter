"use client";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledById?: string;
  overlayClassName?: string;
  panelClassName?: string;
  closeOnBackdrop?: boolean;
};

export default function Dialog({ open, onClose, children, labelledById, overlayClassName, panelClassName, closeOnBackdrop = true }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = panelRef.current?.parentElement ?? null;
    if (!root) return;
    const focusables = panelRef.current!.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    root.addEventListener('keydown', onKey as unknown as EventListener);
    return () => root.removeEventListener('keydown', onKey as unknown as EventListener);
  }, [open, onClose]);

  if (!open) return null;

  const overlayCls = overlayClassName ?? "fixed inset-0 z-50 bg-black/75 flex items-center justify-center";
  const panelCls = panelClassName ?? "card p-4 bg-white text-neutral-900";

  return (
    <div className={overlayCls} role="dialog" aria-modal="true" aria-labelledby={labelledById} onClick={() => { if (closeOnBackdrop) onClose(); }}>
      <div ref={panelRef} className={panelCls} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

