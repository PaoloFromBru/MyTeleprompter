"use client";
import { useRef } from "react";

export default function FileTextInput({ onLoadText }: { onLoadText: (text: string) => void; }) {
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
        Carica testo…
      </button>
    </div>
  );
}
