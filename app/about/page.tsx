export default function AboutPage() {
  return (
    <div className="py-6 space-y-4">
      <h1 className="text-xl font-semibold">About</h1>
      <p className="text-sm opacity-90">
        Adaptive Teleprompter is a browser-based, voice-adaptive teleprompter. It can
        estimate your speaking rate from the microphone and optionally follow your speech using
        on-device ASR. Audio never leaves your device.
      </p>
      <p className="text-sm opacity-90">
        This project is open source. Feedback and feature requests are welcome.
      </p>
    </div>
  );
}

