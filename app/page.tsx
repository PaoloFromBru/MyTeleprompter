"use client";
import { useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";

const SAMPLE = `Signore e Signori,
grazie per essere qui oggi. Questo teleprompter regola automaticamente
la velocità di scorrimento in base alla mia voce. Se accelero, il testo
scorre più velocemente; se rallento o mi fermo, il testo rallenta per
restarmi accanto.`;

export default function Home() {
  const [text, setText] = useState(SAMPLE);
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Teleprompter adattivo (feedback chiuso)</h1>
      <div className="flex items-center gap-3">
        <FileTextInput onLoadText={setText} />
        <button
          className="px-3 py-1 rounded bg-neutral-200 hover:bg-neutral-300 text-sm"
          onClick={() => setText(SAMPLE)}
          type="button"
        >
          Carica demo
        </button>
      </div>
      <Teleprompter text={text} baseWpm={140} holdOnSilence />
    </main>
  );
}
