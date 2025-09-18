"use client";
import { useEffect, useState } from "react";

type ToastItem = { id: number; msg: string; variant?: "success" | "error" | "info" };

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (e: Event) => {
      const ce = e as CustomEvent<Omit<ToastItem, 'id'>>;
      const detail = ce.detail || { msg: "", variant: "info" };
      const item: ToastItem = { id: Date.now() + Math.random(), ...detail };
      setItems((arr) => [...arr, item]);
      const ttl = setTimeout(() => {
        setItems((arr) => arr.filter((t) => t.id !== item.id));
      }, 2600);
      return () => clearTimeout(ttl);
    };
    window.addEventListener("app:toast", onToast as EventListener);
    return () => window.removeEventListener("app:toast", onToast as EventListener);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`card px-3 py-2 text-sm min-w-[200px] ${
            t.variant === "success" ? "border-emerald-400/30" :
            t.variant === "error" ? "border-red-400/30" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            {t.variant === "success" && (
              <span className="text-emerald-400">✓</span>
            )}
            {t.variant === "error" && (
              <span className="text-red-400">⚠︎</span>
            )}
            <span>{t.msg}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
