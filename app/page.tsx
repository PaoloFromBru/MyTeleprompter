"use client";
import { useEffect, useState } from "react";
import Teleprompter from "@/components/Teleprompter";
import FileTextInput from "@/components/FileTextInput";
import HelpPanel from "@/components/HelpPanel";
import { messages, normalizeUILang } from "@/lib/i18n";

const SAMPLE_IT = `Signore e Signori,
è con grande piacere che vi parlo oggi del lavoro che svolge APPLiA.

APPLiA è l’associazione che rappresenta l’industria degli elettrodomestici in Europa.
Il nostro settore impiega direttamente oltre 200.000 persone,
e indirettamente sostiene milioni di posti di lavoro lungo la catena del valore.

La nostra missione è semplice ma ambiziosa:
promuovere l’innovazione, la sostenibilità e la competitività delle imprese europee.

Lavoriamo ogni giorno con le istituzioni europee,
con i governi nazionali, e con le organizzazioni della società civile.
Il nostro obiettivo è portare la voce di un settore essenziale,
che accompagna la vita quotidiana di centinaia di milioni di cittadini europei.

Oggi desidero concentrare la mia attenzione su un segmento specifico:
gli apparecchi di raffreddamento, o cooling appliances.

La domanda globale di questi prodotti è in forte crescita.
Le ragioni sono molteplici:
l’aumento della popolazione mondiale,
il miglioramento del livello di vita in numerose regioni emergenti,
e naturalmente il cambiamento climatico,
che porta a estati sempre più calde e prolungate.

Guardando all’Europa,
possiamo osservare tendenze simili ma con alcune peculiarità.
Da un lato, i consumatori europei chiedono apparecchi sempre più efficienti,
che riducano i consumi energetici e le bollette.
Dall’altro lato, i legislatori europei fissano standard molto severi,
per garantire la sicurezza e la sostenibilità ambientale.

Ed è proprio sul quadro legislativo che dobbiamo soffermarci.
La normativa sugli F-gas, ad esempio,
impone restrizioni significative sull’uso di gas fluorurati,
fondamentali per il funzionamento di molti sistemi di raffreddamento.

Un altro fronte delicato riguarda i PFAS,
le cosiddette “sostanze per sempre”.
L’ipotesi di un divieto totale solleva interrogativi importanti,
perché molte applicazioni industriali ancora non dispongono di alternative valide.

Tuttavia, vi sono anche prospettive positive.
Il piano RePower EU, ad esempio,
spinge verso un’accelerazione della transizione energetica,
offrendo opportunità per apparecchi più efficienti
e per tecnologie innovative che possano ridurre le emissioni complessive.

In questo contesto complesso,
qual è la via da seguire per un’associazione come APPLiA?

La nostra risposta è chiara:
dialogo costante con le istituzioni,
collaborazione con tutte le parti interessate,
e impegno per garantire che la sostenibilità vada di pari passo con la competitività.

Difendere la produzione europea non significa chiedere protezionismo,
ma creare un terreno equo in cui le aziende europee
possano continuare a investire in innovazione e occupazione.

Il nostro settore ha dimostrato di saper cambiare,
di saper investire nella digitalizzazione e nell’efficienza energetica,
e continuerà a farlo.

APPLiA sarà sempre al fianco delle istituzioni e dei cittadini,
per costruire insieme un futuro più verde,
più sicuro e più prospero per l’Europa.

Grazie per la vostra attenzione.`;
const SAMPLE_EN = `Ladies and Gentlemen,
it is a great pleasure to address you today about the work carried out by APPLiA.

APPLiA is the association representing the home appliance industry in Europe.
Our sector directly employs more than 200,000 people,
and indirectly supports millions of jobs across the value chain.

Our mission is simple yet ambitious:
to promote innovation, sustainability, and competitiveness.

We work every day with European institutions,
with national governments, and with civil society organizations.
Our goal is to bring the voice of an essential sector,
one that touches the everyday life of hundreds of millions of European citizens.

Today, I would like to focus on a specific segment:
cooling appliances.

The global demand for these products is rapidly increasing.
There are many reasons for this:
the growth of the world’s population,
the rising living standards in many emerging regions,
and of course, climate change,
which brings longer and hotter summers.

Looking at Europe,
we see similar trends, but also some unique characteristics.
On the one hand, European consumers ask for ever more efficient appliances,
capable of reducing energy consumption and household bills.
On the other hand, European legislators set strict standards,
to ensure both safety and environmental sustainability.

It is therefore necessary to consider the legislative framework.
The F-gas regulation, for example,
imposes significant restrictions on the use of fluorinated gases,
which are essential to the functioning of many cooling systems.

Another sensitive topic concerns PFAS,
the so-called “forever chemicals”.
The idea of a full ban raises important questions,
as many industrial applications still lack viable alternatives.

Yet, there are also positive perspectives.
The RePower EU plan, for instance,
accelerates the energy transition,
creating opportunities for more efficient appliances
and for innovative technologies to reduce overall emissions.

In such a complex environment,
what is the way forward for an association like APPLiA?

Our answer is clear:
a constant dialogue with institutions,
a collaborative approach with all stakeholders,
and a firm commitment to ensure that sustainability goes hand in hand with competitiveness.

Defending European manufacturing does not mean asking for protectionism.
It means creating a level playing field,
where European companies can continue to invest in innovation and employment.

Our sector has shown its ability to adapt,
to invest in digitalisation and in energy efficiency,
and it will continue to do so.

APPLiA will remain by the side of institutions and citizens,
to build together a greener, safer, and more prosperous future for Europe.

Thank you for your attention.`;

export default function Home() {
  const [lang, setLang] = useState<string>("it-IT");
  const [settings, setSettings] = useState({
    fontSizePx: 32,
    mirror: false,
    baseWpm: 140,
    holdOnSilence: true,
  });
  useEffect(() => {
    // Initialize from localStorage or browser language on first mount
    try {
      const savedLang = localStorage.getItem("tp:lang");
      const l = savedLang || (typeof navigator !== "undefined" ? navigator.language : "it-IT");
      setLang(l);
    } catch {}
    try {
      const raw = localStorage.getItem("tp:settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings((s) => ({ ...s, ...parsed }));
      }
    } catch {}
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
  // Persist settings and language
  useEffect(() => {
    try { localStorage.setItem("tp:lang", lang); } catch {}
  }, [lang]);
  useEffect(() => {
    try { localStorage.setItem("tp:settings", JSON.stringify(settings)); } catch {}
  }, [settings]);

  // Keyboard shortcuts at page level: m (mirror), +/- (font size)
  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = (el as HTMLElement).tagName;
      const editable = (el as HTMLElement).isContentEditable;
      return editable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    };
    const clamp = (v: number) => Math.max(20, Math.min(72, v));
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return;
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setSettings((s) => ({ ...s, mirror: !s.mirror }));
      } else if (e.key === "+" || (e.key === "=" && e.shiftKey)) {
        e.preventDefault();
        setSettings((s) => ({ ...s, fontSizePx: clamp((s.fontSizePx ?? 32) + 2) }));
      } else if (e.key === "-") {
        e.preventDefault();
        setSettings((s) => ({ ...s, fontSizePx: clamp((s.fontSizePx ?? 32) - 2) }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{ui.title}</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            <span>{ui.langLabel}</span>
            <select
              className="bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1 text-sm"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              <option value="it-IT">Italiano (it-IT)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </label>
          <HelpPanel lang={lang} />
        </div>
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
      {/* Settings */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="font-medium opacity-80">{ui.settingsTitle}</div>
        <label className="flex items-center gap-2">
          <span>{ui.fontSizeLabel}</span>
          <input
            type="range"
            min={20}
            max={72}
            step={1}
            value={settings.fontSizePx}
            onChange={(e) => setSettings((s) => ({ ...s, fontSizePx: Number(e.target.value) }))}
          />
          <span className="tabular-nums w-10 text-right">{settings.fontSizePx}px</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.mirror}
            onChange={(e) => setSettings((s) => ({ ...s, mirror: e.target.checked }))}
          />
          <span>{ui.mirrorModeLabel}</span>
        </label>
        <label className="flex items-center gap-2">
          <span>{ui.baseWpmLabel}</span>
          <input
            type="number"
            min={60}
            max={260}
            step={5}
            className="w-20 bg-neutral-100 dark:bg-neutral-800 border rounded px-2 py-1"
            value={settings.baseWpm}
            onChange={(e) => setSettings((s) => ({ ...s, baseWpm: Number(e.target.value) }))}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.holdOnSilence}
            onChange={(e) => setSettings((s) => ({ ...s, holdOnSilence: e.target.checked }))}
          />
          <span>{ui.holdOnSilenceLabel}</span>
        </label>
      </div>

      <Teleprompter
        text={text}
        baseWpm={settings.baseWpm}
        holdOnSilence={settings.holdOnSilence}
        lang={lang}
        fontSizePx={settings.fontSizePx}
        mirror={settings.mirror}
      />
    </main>
  );
}
