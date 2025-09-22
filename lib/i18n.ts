export type UILang = "en" | "it" | "fr" | "nl";

export function normalizeUILang(lang: string | undefined | null): UILang {
  const l = (lang || "").toLowerCase();
  if (l.startsWith("it")) return "it";
  if (l.startsWith("fr")) return "fr";
  if (l.startsWith("nl")) return "nl";
  return "en";
}

export const messages: Record<UILang, {
  // Navigation
  navHome: string;
  navSettings: string;
  navHelp: string;
  navAbout: string;
  navLibrary: string;
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
  fullscreenLabel: string;
  nudgeBackTitle: string;
  nudgeForwardTitle: string;
  asrFollowTitle: string;
  asrUnsupportedTitle: string;
  asrOnLabel: string;
  asrOffLabel: string;
  fileLoadLabel: string;
  saveLabel: string;
  detachSampleLabel: string;
  savedNotice: string;
  saveTitleLabel: string;
  settingsTitle: string;
  settingsIntro: string;
  fontSizeLabel: string;
  mirrorModeLabel: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  themeSepia: string;
  themeContrast: string;
  fontLabel: string;
  fontSans: string;
  fontSerif: string;
  baseWpmLabel: string;
  holdOnSilenceLabel: string;
  asrResumeDelayLabel: string;
  helpOpenLabel: string;
  helpCloseLabel: string;
  helpTitle: string;
  helpIntro: string;
  helpEnvironmentTitle: string;
  helpShortcutsTitle: string;
  helpMicSupportLabel: string;
  helpASRSupportLabel: string;
  helpSecureContextLabel: string;
  helpFilesTitle: string;
  helpFilesContent: string;
  helpTroubleshootTitle: string;
  helpTroubleshootContent: string;
  helpPrivacyTitle: string;
  helpPrivacyNote: string;
  onboardText: string;
  gotItLabel: string;
  asrMatchesLabel: string;
  asrCoverageLabel: string;
  asrWindowLabel: string;
  asrWindowViewport: string;
  asrWindowViewport2x: string;
  asrWindowWide: string;
  asrSnapMode: string;
  asrSnapGentle: string;
  asrSnapAggressive: string;
  asrSnapInstant: string;
  asrSnapSticky: string;
  asrStickyThreshold: string;
  asrLeadLabel: string;
  micDriftWhileASRLabel: string;
  asrDerivedDriftLabel: string;
  asrDriftMutualExclusionHelp: string;
  lockToHighlightLabel: string;
  debugOverlayLabel: string;
  sectionGeneralTitle: string;
  sectionTypographyTitle: string;
  sectionMicScrollingTitle: string;
  sectionAsrFollowTitle: string;
  sectionAsrVisualizationTitle: string;
  settingsFooterNote: string;
}> = {
  en: {
    navHome: "Home",
    navSettings: "Settings",
    navHelp: "Help",
    navAbout: "About",
    navLibrary: "Library",
    title: "Adaptive teleprompter",
    loadDemo: "Load demo",
    langLabel: "Lang",
    micEnable: "Enable microphone",
    start: "Start",
    stop: "Stop",
    reset: "Reset",
    statusSpeaking: "speaking",
    statusPaused: "paused",
    pxWord: "px/word",
    fullscreenLabel: "Fullscreen",
    nudgeBackTitle: "Nudge back",
    nudgeForwardTitle: "Nudge forward",
    asrFollowTitle: "Follow speech (ASR)",
    asrUnsupportedTitle: "ASR not supported in this browser",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Load text…",
    saveLabel: "Save",
    detachSampleLabel: "Detach sample",
    savedNotice: "Saved",
    saveTitleLabel: "Title",
    settingsTitle: "Settings",
    settingsIntro: "Personalize reading, mic behavior, and ASR follow. Changes save locally.",
    fontSizeLabel: "Font size",
    mirrorModeLabel: "Mirror mode",
    themeLabel: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSepia: "Sepia",
    themeContrast: "High Contrast",
    fontLabel: "Font",
    fontSans: "Sans",
    fontSerif: "Serif",
    baseWpmLabel: "Base WPM",
    holdOnSilenceLabel: "Hold on silence",
    asrResumeDelayLabel: "ASR resume delay (ms)",
    asrMatchesLabel: "ASR matches",
    asrCoverageLabel: "Coverage",
    helpOpenLabel: "Help",
    helpCloseLabel: "Close",
    helpTitle: "Help & Shortcuts",
    helpIntro: "Quick tips and environment checks to get you rolling.",
    helpEnvironmentTitle: "Environment",
    helpShortcutsTitle: "Keyboard shortcuts",
    helpMicSupportLabel: "Microphone support",
    helpASRSupportLabel: "ASR support",
    helpSecureContextLabel: "Secure context (HTTPS/localhost)",
    helpFilesTitle: "Files",
    helpFilesContent: "You can load .txt, .md, .rtf, .srt. We strip timestamps/RTF control words and convert Markdown to plain text.",
    helpTroubleshootTitle: "Troubleshooting",
    helpTroubleshootContent: "If Space does not start, ensure you are on HTTPS or localhost and grant mic permission. If ASR does not follow, try Chrome and correct language.",
    helpPrivacyTitle: "Privacy",
    helpPrivacyNote: "Audio stays in the browser; no recording or upload.",
    onboardText: "Allow microphone access and use the controls below to start or stop the teleprompter.",
    gotItLabel: "Got it",
    asrWindowLabel: "ASR window",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Wide",
    asrSnapMode: "Snap",
    asrSnapGentle: "Gentle",
    asrSnapAggressive: "Aggressive",
    asrSnapInstant: "Instant",
    asrSnapSticky: "Sticky",
    asrStickyThreshold: "Threshold (px)",
    asrLeadLabel: "ASR lead",
    micDriftWhileASRLabel: "Mic drift while ASR",
    asrDerivedDriftLabel: "ASR-derived drift (between matches)",
    asrDriftMutualExclusionHelp: "Only one can be active at a time. If both are off, text advances only on ASR matches (or when unlocked, by base WPM during silence).",
    lockToHighlightLabel: "Lock to highlight",
    debugOverlayLabel: "Debug overlay",
    sectionGeneralTitle: "General",
    sectionTypographyTitle: "Typography & Display",
    sectionMicScrollingTitle: "Mic & Scrolling",
    sectionAsrFollowTitle: "ASR Follow & Drift",
    sectionAsrVisualizationTitle: "ASR Visualization",
    settingsFooterNote: "These settings are saved locally and used by the teleprompter on the home page.",
  },
  fr: {
    navHome: "Accueil",
    navSettings: "Réglages",
    navHelp: "Aide",
    navAbout: "À propos",
    navLibrary: "Bibliothèque",
    title: "Téléprompteur adaptatif",
    loadDemo: "Charger la démo",
    langLabel: "Langue",
    micEnable: "Activer le micro",
    start: "Démarrer",
    stop: "Arrêter",
    reset: "Reset",
    statusSpeaking: "parle",
    statusPaused: "en pause",
    pxWord: "px/mot",
    fullscreenLabel: "Plein écran",
    nudgeBackTitle: "Reculer",
    nudgeForwardTitle: "Avancer",
    asrFollowTitle: "Suivre la voix (ASR)",
    asrUnsupportedTitle: "ASR non pris en charge par ce navigateur",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Charger du texte…",
    saveLabel: "Enregistrer",
    detachSampleLabel: "Détacher l’exemple",
    savedNotice: "Enregistré",
    saveTitleLabel: "Titre",
    settingsTitle: "Paramètres",
    settingsIntro: "Personnalisez la lecture, le micro et le suivi ASR. Les changements sont enregistrés localement.",
    fontSizeLabel: "Taille de police",
    mirrorModeLabel: "Mode miroir",
    themeLabel: "Thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSepia: "Sépia",
    themeContrast: "Contraste élevé",
    fontLabel: "Police",
    fontSans: "Sans",
    fontSerif: "Serif",
    baseWpmLabel: "WPM de base",
    holdOnSilenceLabel: "Pause en silence",
    asrResumeDelayLabel: "Délai de reprise ASR (ms)",
    asrMatchesLabel: "Correspondances ASR",
    asrCoverageLabel: "Couverture",
    helpOpenLabel: "Aide",
    helpCloseLabel: "Fermer",
    helpTitle: "Aide et raccourcis",
    helpIntro: "Astuces rapides et vérifications de l’environnement.",
    helpEnvironmentTitle: "Environnement",
    helpShortcutsTitle: "Raccourcis clavier",
    helpMicSupportLabel: "Prise en charge du micro",
    helpASRSupportLabel: "Prise en charge ASR",
    helpSecureContextLabel: "Contexte sécurisé (HTTPS/localhost)",
    helpFilesTitle: "Fichiers",
    helpFilesContent: "Vous pouvez charger des fichiers .txt, .md, .rtf, .srt. Nous supprimons les horodatages/commandes RTF et convertissons le Markdown en texte brut.",
    helpTroubleshootTitle: "Dépannage",
    helpTroubleshootContent: "Si Espace ne démarre pas, vérifiez que vous êtes en HTTPS ou sur localhost et accordez la permission micro. Si l’ASR ne suit pas, essayez Chrome et choisissez la langue correcte.",
    helpPrivacyTitle: "Confidentialité",
    helpPrivacyNote: "L’audio reste dans le navigateur ; aucune enregistrement ni téléversement.",
    onboardText: "Autorisez l’accès au micro et utilisez les contrôles ci-dessous pour démarrer ou arrêter le téléprompteur.",
    gotItLabel: "Compris",
    asrWindowLabel: "Fenêtre ASR",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Large",
    asrSnapMode: "Accroche",
    asrSnapGentle: "Doux",
    asrSnapAggressive: "Agressif",
    asrSnapInstant: "Instantané",
    asrSnapSticky: "Collant",
    asrStickyThreshold: "Seuil (px)",
    asrLeadLabel: "Avance ASR",
    micDriftWhileASRLabel: "Dérive micro pendant l’ASR",
    asrDerivedDriftLabel: "Dérive basée ASR (entre correspondances)",
    asrDriftMutualExclusionHelp: "Une seule option peut être active. Si les deux sont désactivées, le texte avance uniquement sur les correspondances ASR (ou, si déverrouillé, selon le WPM de base pendant le silence).",
    lockToHighlightLabel: "Verrouiller sur le surlignage",
    debugOverlayLabel: "Superposition de débogage",
    sectionGeneralTitle: "Général",
    sectionTypographyTitle: "Typographie et affichage",
    sectionMicScrollingTitle: "Micro et défilement",
    sectionAsrFollowTitle: "Suivi ASR et dérive",
    sectionAsrVisualizationTitle: "Visualisation ASR",
    settingsFooterNote: "Ces réglages sont enregistrés localement et utilisés par le téléprompteur sur la page d’accueil.",
  },
  nl: {
    navHome: "Home",
    navSettings: "Instellingen",
    navHelp: "Help",
    navAbout: "Over",
    navLibrary: "Bibliotheek",
    title: "Adaptieve teleprompter",
    loadDemo: "Demo laden",
    langLabel: "Taal",
    micEnable: "Microfoon inschakelen",
    start: "Start",
    stop: "Stop",
    reset: "Reset",
    statusSpeaking: "spreekt",
    statusPaused: "gepauzeerd",
    pxWord: "px/woord",
    fullscreenLabel: "Volledig scherm",
    nudgeBackTitle: "Terug",
    nudgeForwardTitle: "Vooruit",
    asrFollowTitle: "Spraak volgen (ASR)",
    asrUnsupportedTitle: "ASR niet ondersteund in deze browser",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Tekst laden…",
    saveLabel: "Opslaan",
    detachSampleLabel: "Loskoppelen voorbeeld",
    savedNotice: "Opgeslagen",
    saveTitleLabel: "Titel",
    settingsTitle: "Instellingen",
    settingsIntro: "Personaliseer lezen, microfoongedrag en ASR-volgen. Wijzigingen worden lokaal opgeslagen.",
    fontSizeLabel: "Lettergrootte",
    mirrorModeLabel: "Spiegelmodus",
    themeLabel: "Thema",
    themeLight: "Licht",
    themeDark: "Donker",
    themeSepia: "Sepia",
    themeContrast: "Hoog contrast",
    fontLabel: "Lettertype",
    fontSans: "Sans",
    fontSerif: "Serif",
    baseWpmLabel: "Basis-WPM",
    holdOnSilenceLabel: "Pauzeren bij stilte",
    asrResumeDelayLabel: "ASR-hervattingsvertraging (ms)",
    asrMatchesLabel: "ASR-overeenkomsten",
    asrCoverageLabel: "Dekking",
    helpOpenLabel: "Help",
    helpCloseLabel: "Sluiten",
    helpTitle: "Help en sneltoetsen",
    helpIntro: "Snelle tips en omgevingscontroles om te starten.",
    helpEnvironmentTitle: "Omgeving",
    helpShortcutsTitle: "Sneltoetsen",
    helpMicSupportLabel: "Microfoonondersteuning",
    helpASRSupportLabel: "ASR-ondersteuning",
    helpSecureContextLabel: "Beveiligde context (HTTPS/localhost)",
    helpFilesTitle: "Bestanden",
    helpFilesContent: "Je kunt .txt, .md, .rtf, .srt laden. We verwijderen tijdstempels/RTF-besturingswoorden en zetten Markdown om naar platte tekst.",
    helpTroubleshootTitle: "Probleemoplossing",
    helpTroubleshootContent: "Start Spatie niet? Controleer HTTPS of localhost en geef microfoonrechten. Volgt ASR niet? Probeer Chrome en kies de juiste taal.",
    helpPrivacyTitle: "Privacy",
    helpPrivacyNote: "Audio blijft in de browser; geen opname of upload.",
    onboardText: "Sta microfoontoegang toe en gebruik de bediening hieronder om de teleprompter te starten of te stoppen.",
    gotItLabel: "Begrepen",
    asrWindowLabel: "ASR-venster",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Breed",
    asrSnapMode: "Vastklikken",
    asrSnapGentle: "Zacht",
    asrSnapAggressive: "Agressief",
    asrSnapInstant: "Direct",
    asrSnapSticky: "Plakkerig",
    asrStickyThreshold: "Drempel (px)",
    asrLeadLabel: "ASR-voorsprong",
    micDriftWhileASRLabel: "Mic-drift tijdens ASR",
    asrDerivedDriftLabel: "ASR-afgeleide drift (tussen matches)",
    asrDriftMutualExclusionHelp: "Er kan maar één optie actief zijn. Als beide uit staan, schuift de tekst alleen bij ASR-overeenkomsten (of, indien ontgrendeld, op basis van de basis-WPM tijdens stilte).",
    lockToHighlightLabel: "Vergrendelen op markering",
    debugOverlayLabel: "Debug-overlay",
    sectionGeneralTitle: "Algemeen",
    sectionTypographyTitle: "Typografie en weergave",
    sectionMicScrollingTitle: "Microfoon en scrollen",
    sectionAsrFollowTitle: "ASR-volgen en drift",
    sectionAsrVisualizationTitle: "ASR-visualisatie",
    settingsFooterNote: "Deze instellingen worden lokaal opgeslagen en gebruikt door de teleprompter op de startpagina.",
  },
  it: {
    navHome: "Home",
    navSettings: "Impostazioni",
    navHelp: "Aiuto",
    navAbout: "Informazioni",
    navLibrary: "Libreria",
    title: "Teleprompter adattivo",
    loadDemo: "Carica demo",
    langLabel: "Lingua",
    micEnable: "Attiva microfono",
    start: "Start",
    stop: "Stop",
    reset: "Reset",
    statusSpeaking: "parlando",
    statusPaused: "pausa",
    pxWord: "px/parola",
    fullscreenLabel: "Schermo intero",
    nudgeBackTitle: "Sposta indietro",
    nudgeForwardTitle: "Sposta avanti",
    asrFollowTitle: "Segui parlato (ASR)",
    asrUnsupportedTitle: "ASR non supportato nel browser",
    asrOnLabel: "ASR: ON",
    asrOffLabel: "ASR: OFF",
    fileLoadLabel: "Carica testo…",
    saveLabel: "Salva",
    detachSampleLabel: "Scollega demo",
    savedNotice: "Salvato",
    saveTitleLabel: "Titolo",
    settingsTitle: "Impostazioni",
    settingsIntro: "Personalizza lettura, comportamento del microfono e follow ASR. Le modifiche vengono salvate localmente.",
    fontSizeLabel: "Dimensione font",
    mirrorModeLabel: "Modalità specchio",
    themeLabel: "Tema",
    themeLight: "Chiaro",
    themeDark: "Scuro",
    themeSepia: "Seppia",
    themeContrast: "Alto contrasto",
    fontLabel: "Font",
    fontSans: "Sans",
    fontSerif: "Serif",
    baseWpmLabel: "WPM base",
    holdOnSilenceLabel: "Ferma in silenzio",
    asrResumeDelayLabel: "Ritardo ripresa ASR (ms)",
    asrMatchesLabel: "Corrispondenze ASR",
    asrCoverageLabel: "Copertura",
    helpOpenLabel: "Aiuto",
    helpCloseLabel: "Chiudi",
    helpTitle: "Aiuto e scorciatoie",
    helpIntro: "Suggerimenti rapidi e verifiche dell’ambiente.",
    helpEnvironmentTitle: "Ambiente",
    helpShortcutsTitle: "Scorciatoie da tastiera",
    helpMicSupportLabel: "Supporto microfono",
    helpASRSupportLabel: "Supporto ASR",
    helpSecureContextLabel: "Contesto sicuro (HTTPS/localhost)",
    helpFilesTitle: "File",
    helpFilesContent: "Puoi caricare .txt, .md, .rtf, .srt. Rimuoviamo i timestamp/controlli RTF e convertiamo Markdown in testo semplice.",
    helpTroubleshootTitle: "Risoluzione problemi",
    helpTroubleshootContent: "Se Space non avvia, verifica HTTPS o localhost e consenti il microfono. Se l'ASR non segue, prova Chrome e imposta la lingua corretta.",
    helpPrivacyTitle: "Privacy",
    helpPrivacyNote: "L'audio resta nel browser; nessuna registrazione o upload.",
    onboardText: "Consenti l’accesso al microfono e usa i controlli qui sotto per avviare o fermare il teleprompter.",
    gotItLabel: "Fatto",
    asrWindowLabel: "Finestra ASR",
    asrWindowViewport: "Viewport",
    asrWindowViewport2x: "Viewport ×2",
    asrWindowWide: "Ampia",
    asrSnapMode: "Aggancio",
    asrSnapGentle: "Morbido",
    asrSnapAggressive: "Aggressivo",
    asrSnapInstant: "Istantaneo",
    asrSnapSticky: "Appiccicoso",
    asrStickyThreshold: "Soglia (px)",
    asrLeadLabel: "Margine ASR",
    micDriftWhileASRLabel: "Deriva da microfono con ASR",
    asrDerivedDriftLabel: "Deriva da ASR (tra match)",
    asrDriftMutualExclusionHelp: "Solo una opzione può essere attiva. Se entrambe sono spente, il testo avanza solo con le corrispondenze ASR (oppure, se sbloccato, con il WPM base durante il silenzio).",
    lockToHighlightLabel: "Blocca all'evidenziato",
    debugOverlayLabel: "Overlay debug",
    sectionGeneralTitle: "Generale",
    sectionTypographyTitle: "Tipografia e display",
    sectionMicScrollingTitle: "Microfono e scorrimento",
    sectionAsrFollowTitle: "Follow ASR e deriva",
    sectionAsrVisualizationTitle: "Visualizzazione ASR",
    settingsFooterNote: "Queste impostazioni sono salvate localmente e usate dal teleprompter nella home.",
  },
};
