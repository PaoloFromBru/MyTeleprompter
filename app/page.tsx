"use client";
import { useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import { messages, normalizeUILang } from "@/lib/i18n";

const SAMPLE_IT = `Signore e Signori,
grazie per essere qui oggi. Questo teleprompter regola automaticamente
la velocità di scorrimento in base alla mia voce. Se accelero, il testo
scorre più velocemente; se rallento o mi fermo, il testo rallenta per
restarmi accanto.`;
const SAMPLE_EN = `Ladies and Gentlemen,
thank you for being here today. This teleprompter automatically adjusts
the scrolling speed based on my voice. If I speed up, the text scrolls
faster; if I slow down or pause, the text slows to stay with me.`;

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  useEffect(() => {
    // Initialize from browser language on first mount
    const l = typeof navigator !== "undefined" ? navigator.language : "it-IT";
    setLang(l);
  }, []);
  const ui = messages[normalizeUILang(lang)];
  const [text, setText] = useState(SAMPLE_IT);
  useEffect(() => {
    // Swap sample text when language changes only if current text is exactly one of the samples
    setText((prev) => {
      if (prev === SAMPLE_IT || prev === SAMPLE_EN) {
        return normalizeUILang(lang) === "it" ? SAMPLE_IT : SAMPLE_EN;
      }
      return prev;
    });
  }, [lang]);
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{ui.title}</h1>
        <label className="text-sm flex items-center gap-2">
          <span>Lang</span>
          <select
            className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1 text-sm"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            <option value="it-IT">Italiano (it-IT)</option>
            <option value="en-US">English (en-US)</option>
          </select>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <FileTextInput onLoadText={setText} lang={lang} />
        <button
          className="px-3 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-sm"
          onClick={() => setText(normalizeUILang(lang) === "it" ? SAMPLE_IT : SAMPLE_EN)}
          type="button"
        >
          {ui.loadDemo}
        </button>
      </div>
      <Teleprompter text={text} baseWpm={140} holdOnSilence lang={lang} />
    </main>
  );
}
