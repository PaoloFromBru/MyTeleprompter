"use client";
import { useRef } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";

export default function FileTextInput({ onLoadText, lang }: { onLoadText: (text: string) => void; lang?: string; }) {
  const ui = messages[normalizeUILang(lang)];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleFile = async (file: File) => onLoadText(await file.text());
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,.rtf,.srt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="block text-sm"
      />
      <button
        className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-sm"
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        {ui.fileLoadLabel}
      </button>
    </div>
  );
}
