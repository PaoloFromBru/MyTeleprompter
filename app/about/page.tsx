export default function AboutPage() {
  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">About</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">A modern, voice‑adaptive teleprompter that stays on your device.</p>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6"/><path d="M6 12h12"/><path d="M12 4v6"/></svg>
            Voice‑adaptive
          </h2>
          <p className="text-sm opacity-90">Estimates your speaking rate from the mic and keeps text aligned to your pace.</p>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></svg>
            ASR follow
          </h2>
          <p className="text-sm opacity-90">Optionally follows your speech with on‑device ASR—no audio upload.</p>
        </div>
        <div className="card p-4 space-y-2">
          <h2 className="font-medium flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
            Files & formats
          </h2>
          <p className="text-sm opacity-90">Load .txt, .md, .rtf, or .srt. We normalize for clean reading.</p>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-medium mb-1">Open source</h2>
        <p className="text-sm opacity-90">This project is open source. Feedback and feature requests are welcome.</p>
      </section>
    </div>
  );
}
