export type UILang = "en" | "it";

export function normalizeUILang(lang: string | undefined | null): UILang {
  const l = (lang || "").toLowerCase();
  return l.startsWith("it") ? "it" : "en";
}

export const messages: Record<UILang, {
  title: string;
  loadDemo: string;
  micEnable: string;
  start: string;
  stop: string;
  reset: string;
  statusSpeaking: string;
  statusPaused: string;
  pxWord: string;
  nudgeBackTitle: string;
  nudgeForwardTitle: string;
  asrFollowTitle: string;
  asrUnsupportedTitle: string;
  asrOnLabel: string;
  asrOffLabel: string;
  fileLoadLabel: string;
}> = {
  en: {
    title: "Adaptive teleprompter (closed-loop)",
    loadDemo: "Load demo",
    micEnable: "Enable microphone",
    start: "Start",
    stop: "Stop",
    reset: "Reset",
    statusSpeaking: "speaking",
    statusPaused: "paused",
    pxWord: "px/word",
    nudgeBackTitle: "Nudge back",
    nudgeForwardTitle: "Nudge forward",
    asrFollowTitle: "Follow speech (ASR)",
    asrUnsupportedTitle: "ASR not supported in this browser",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Load text…",
  },
  it: {
    title: "Teleprompter adattivo (feedback chiuso)",
    loadDemo: "Carica demo",
    micEnable: "Attiva microfono",
    start: "Start",
    stop: "Stop",
    reset: "Reset",
    statusSpeaking: "parlando",
    statusPaused: "pausa",
    pxWord: "px/parola",
    nudgeBackTitle: "Sposta indietro",
    nudgeForwardTitle: "Sposta avanti",
    asrFollowTitle: "Segui parlato (ASR)",
    asrUnsupportedTitle: "ASR non supportato nel browser",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Carica testo…",
  },
};

