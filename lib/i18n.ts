export type UILang = "en" | "it";

export function normalizeUILang(lang: string | undefined | null): UILang {
  const l = (lang || "").toLowerCase();
  return l.startsWith("it") ? "it" : "en";
}

export const messages: Record<UILang, {
  title: string;
  loadDemo: string;
  langLabel: string;
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
  settingsTitle: string;
  fontSizeLabel: string;
  mirrorModeLabel: string;
  baseWpmLabel: string;
  holdOnSilenceLabel: string;
  helpOpenLabel: string;
  helpCloseLabel: string;
  helpTitle: string;
  helpShortcutsTitle: string;
  helpMicSupportLabel: string;
  helpASRSupportLabel: string;
  helpSecureContextLabel: string;
  helpFilesTitle: string;
  helpFilesContent: string;
  helpTroubleshootTitle: string;
  helpTroubleshootContent: string;
  helpPrivacyNote: string;
  asrMatchesLabel: string;
  asrCoverageLabel: string;
  asrWindowLabel: string;
  asrWindowViewport: string;
  asrWindowViewport2x: string;
  asrWindowWide: string;
  asrSnapMode: string;
  asrSnapGentle: string;
  asrSnapAggressive: string;
  asrLeadLabel: string;
}> = {
  en: {
    title: "Adaptive teleprompter (closed-loop)",
    loadDemo: "Load demo",
    langLabel: "Lang",
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
    settingsTitle: "Settings",
    fontSizeLabel: "Font size",
    mirrorModeLabel: "Mirror mode",
    baseWpmLabel: "Base WPM",
    holdOnSilenceLabel: "Hold on silence",
    asrMatchesLabel: "ASR matches",
    asrCoverageLabel: "Coverage",
    helpOpenLabel: "Help",
    helpCloseLabel: "Close",
    helpTitle: "Help & Shortcuts",
    helpShortcutsTitle: "Keyboard shortcuts",
    helpMicSupportLabel: "Microphone support",
    helpASRSupportLabel: "ASR support",
    helpSecureContextLabel: "Secure context (HTTPS/localhost)",
    helpFilesTitle: "Files",
    helpFilesContent: "You can load .txt, .md, .rtf, .srt. We strip timestamps/RTF control words and convert Markdown to plain text.",
    helpTroubleshootTitle: "Troubleshooting",
    helpTroubleshootContent: "If Space does not start, ensure you are on HTTPS or localhost and grant mic permission. If ASR does not follow, try Chrome and correct language.",
    helpPrivacyNote: "Audio stays in the browser; no recording or upload.",
    asrWindowLabel: "ASR window",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Wide",
    asrSnapMode: "Snap",
    asrSnapGentle: "Gentle",
    asrSnapAggressive: "Aggressive",
    asrLeadLabel: "ASR lead",
  },
  it: {
    title: "Teleprompter adattivo (feedback chiuso)",
    loadDemo: "Carica demo",
    langLabel: "Lingua",
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
    settingsTitle: "Impostazioni",
    fontSizeLabel: "Dimensione font",
    mirrorModeLabel: "Modalità specchio",
    baseWpmLabel: "WPM base",
    holdOnSilenceLabel: "Ferma in silenzio",
    asrMatchesLabel: "Corrispondenze ASR",
    asrCoverageLabel: "Copertura",
    helpOpenLabel: "Aiuto",
    helpCloseLabel: "Chiudi",
    helpTitle: "Aiuto e scorciatoie",
    helpShortcutsTitle: "Scorciatoie da tastiera",
    helpMicSupportLabel: "Supporto microfono",
    helpASRSupportLabel: "Supporto ASR",
    helpSecureContextLabel: "Contesto sicuro (HTTPS/localhost)",
    helpFilesTitle: "File",
    helpFilesContent: "Puoi caricare .txt, .md, .rtf, .srt. Rimuoviamo i timestamp/controlli RTF e convertiamo Markdown in testo semplice.",
    helpTroubleshootTitle: "Risoluzione problemi",
    helpTroubleshootContent: "Se Space non avvia, verifica HTTPS o localhost e consenti il microfono. Se l'ASR non segue, prova Chrome e imposta la lingua corretta.",
    helpPrivacyNote: "L'audio resta nel browser; nessuna registrazione o upload.",
    asrWindowLabel: "Finestra ASR",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Ampia",
    asrSnapMode: "Aggancio",
    asrSnapGentle: "Morbido",
    asrSnapAggressive: "Aggressivo",
    asrLeadLabel: "Margine ASR",
  },
};
