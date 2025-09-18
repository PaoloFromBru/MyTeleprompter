"use client";
import { useRef } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";
import { extractTextFromFile } from "@/lib/textConverters";
import { toast } from "@/lib/toast";

export default function FileTextInput({ onLoadText, lang }: { onLoadText: (text: string) => void; lang?: string; }) {
  const ui = messages[normalizeUILang(lang)];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleFile = async (file: File) => {
    try {
      onLoadText(await extractTextFromFile(file));
      toast("File loaded", "success");
    } catch (err) {
      console.error("Failed to extract text", err);
      toast("Failed to load file", "error");
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <input
        ref={fileRef}
        id="file-input"
        type="file"
        accept=".txt,.md,.markdown,.rtf,.srt"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="sr-only"
      />
      <button
        className="btn btn-secondary w-full sm:w-auto"
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        {ui.fileLoadLabel}
      </button>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">TXT, MD, RTF, SRT</span>
    </div>
  );
}
