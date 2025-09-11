"use client";
import { useRef } from "react";
import { messages, normalizeUILang } from "@/lib/i18n";

function hexToChar(_: string, h: string) {
  try { return String.fromCharCode(parseInt(h, 16)); } catch { return ""; }
}

function rtfToText(rtf: string) {
  // Decode hex escapes first (\'hh)
  let s = rtf.replace(/\\'([0-9a-fA-F]{2})/g, hexToChar);
  // Map structural controls to whitespace before stripping
  s = s
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\line\b/g, "\n")
    .replace(/\\tab\b/g, "\t");
  // Unescape special chars
  s = s.replace(/\\\\/g, "\\").replace(/\\\{/g, "{").replace(/\\\}/g, "}");
  // Drop remaining control words (e.g., \b, \fs24, \cf1)
  s = s.replace(/\\[a-zA-Z]+-?\d* ?/g, "");
  // Remove groups braces
  s = s.replace(/[{}]/g, "");
  // Normalize whitespace
  s = s.replace(/\r\n?|\r/g, "\n");
  s = s.replace(/[\t ]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function srtToText(srt: string) {
  const lines = srt.split(/\r?\n/);
  const out: string[] = [];
  const timeRe = /^\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/;
  for (const line of lines) {
    if (/^\s*\d+\s*$/.test(line)) continue; // index line
    if (timeRe.test(line)) continue; // timecode line
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function mdToText(md: string) {
  let s = md;
  // Remove code fences and inline code ticks (keep content inline)
  s = s.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, ""));
  s = s.replace(/`([^`]*)`/g, "$1");
  // Images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1");
  // Headings: #### Title -> Title
  s = s.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  // Blockquotes: > text -> text
  s = s.replace(/^\s{0,3}>\s?/gm, "");
  // Lists: -/*/+ or 1. -> text
  s = s.replace(/^\s{0,3}([*+-]|\d+\.)\s+/gm, "");
  // Emphasis/strong/strike: *text* **text** _text_ __text__ ~~text~~ -> text
  s = s.replace(/([*_~]{1,2})([^*_~]+)\1/g, "$2");
  // Horizontal rules
  s = s.replace(/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/gm, "");
  // Strip simple HTML tags
  s = s.replace(/<[^>]+>/g, "");
  // Normalize whitespace
  s = s.replace(/\r\n?|\r/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

async function extractTextFromFile(file: File): Promise<string> {
  const raw = await file.text();
  const name = file.name.toLowerCase();
  if (name.endsWith(".rtf")) return rtfToText(raw);
  if (name.endsWith(".srt")) return srtToText(raw);
  if (name.endsWith(".md") || name.endsWith(".markdown")) return mdToText(raw);
  return raw;
}

export default function FileTextInput({ onLoadText, lang }: { onLoadText: (text: string) => void; lang?: string; }) {
  const ui = messages[normalizeUILang(lang)];
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleFile = async (file: File) => onLoadText(await extractTextFromFile(file));
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
