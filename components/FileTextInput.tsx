"use client";
import { useRef } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";
import { extractTextFromFile } from "@/lib/textConverters";

export default function FileTextInput({ onLoadText, lang }: { onLoadText: (text: string) => void; lang?: string; }) {
  const ui = messages[normalizeUILang(lang)];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleFile = async (file: File) => onLoadText(await extractTextFromFile(file));
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.markdown,.rtf,.srt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="block text-sm max-w-full"
      />
      <button
        className="px-3 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-sm w-full sm:w-auto"
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        {ui.fileLoadLabel}
      </button>
    </div>
  );
}
