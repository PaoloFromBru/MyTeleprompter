"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stima WPM dal microfono con Web Audio API:
 * - bandpass 300–3000 Hz
 * - inviluppo RMS -> dB
 * - soglia dinamica su rumore di fondo
 * - picchi ~ sillabe -> parole/minuto (≈ 1 parola = 1.66 sillabe)
 */
export function useMicSpeechRate(opts?: {
  smoothingSecs?: number;
  minDbThreshold?: number;
  ema?: number;
}) {
  const smoothingSecs = opts?.smoothingSecs ?? 2.0;
  const minDbThreshold = opts?.minDbThreshold ?? -50;
  const emaAlpha = opts?.ema ?? 0.25;

  const [permission, setPermission] = useState<"idle"|"granted"|"denied">("idle");
  const [listening, setListening] = useState(false);
  const [wpm, setWpm] = useState(0); // float; round only in UI
  const [talking, setTalking] = useState(false);
  const [noiseFloor, setNoiseFloor] = useState(-60);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bandpassRef = useRef<BiquadFilterNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const syllableTimestampsRef = useRef<number[]>([]);
  const lastPeakAtRef = useRef(0);
  const lastWpmRef = useRef(0);
  const wpmFloatRef = useRef(0);
  const talkingRef = useRef(false);
  const noiseFloorRef = useRef(-60);
  const lastUiUpdateRef = useRef(0);
  const uiWpmRef = useRef(0);
  const uiTalkingRef = useRef(false);

  const start = useCallback(async () => {
    if (listening) return;
    try {
      const nav = (typeof navigator !== "undefined" ? navigator : undefined);
      type LegacyGUM = (constraints: MediaStreamConstraints, success: (stream: MediaStream) => void, error: (err: unknown) => void) => void;
      const getUserMedia: ((c: MediaStreamConstraints) => Promise<MediaStream>) | null = (() => {
        if (nav?.mediaDevices?.getUserMedia) return (c: MediaStreamConstraints) => nav.mediaDevices.getUserMedia(c);
        const legacy = nav as unknown as { webkitGetUserMedia?: LegacyGUM; mozGetUserMedia?: LegacyGUM; getUserMedia?: LegacyGUM };
        if (legacy?.webkitGetUserMedia) return (c: MediaStreamConstraints) => new Promise((res, rej) => legacy.webkitGetUserMedia!(c, res, rej));
        if (legacy?.mozGetUserMedia) return (c: MediaStreamConstraints) => new Promise((res, rej) => legacy.mozGetUserMedia!(c, res, rej));
        if (legacy?.getUserMedia) return (c: MediaStreamConstraints) => new Promise((res, rej) => legacy.getUserMedia!(c, res, rej));
        return null;
      })();
      if (!getUserMedia) {
        setPermission("denied");
        setListening(false);
        return;
      }
      const stream = await getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      } as MediaStreamConstraints);
      setPermission("granted");
      mediaStreamRef.current = stream;

      type WebkitAudioContextCtor = new () => AudioContext;
      const w = window as unknown as { webkitAudioContext?: WebkitAudioContextCtor };
      const AudioCtor: new () => AudioContext = (window.AudioContext || (w.webkitAudioContext as unknown as new () => AudioContext));
      const audioCtx = new AudioCtor();
      audioCtxRef.current = audioCtx;

      const src = audioCtx.createMediaStreamSource(stream);

      const bandpass = audioCtx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1000;
      bandpass.Q.value = 0.707;
      bandpassRef.current = bandpass;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      src.connect(bandpass);
      bandpass.connect(analyser);

      const timeData = new Float32Array(analyser.fftSize);
      // let lastNow = performance.now(); // not used currently

      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(timeData);

        let sum = 0;
        for (let i = 0; i < timeData.length; i++) sum += timeData[i] * timeData[i];
        const rms = Math.sqrt(sum / timeData.length) || 1e-9;
        const db = 20 * Math.log10(rms);

        // Track noise floor in ref (not state) to avoid re-render each frame
        noiseFloorRef.current = 0.98 * noiseFloorRef.current + 0.02 * db;

        const now = performance.now();

        const isTalking = db > Math.max(minDbThreshold, noiseFloorRef.current + 6);
        talkingRef.current = isTalking;

        const refractoryMs = 120;
        if (isTalking) {
          const sinceLastPeak = now - lastPeakAtRef.current;
          if (sinceLastPeak > refractoryMs) {
            lastPeakAtRef.current = now;
            syllableTimestampsRef.current.push(now);
          }
        }

        const horizonMs = smoothingSecs * 1000;
        const cutoff = now - horizonMs;
        while (syllableTimestampsRef.current.length && syllableTimestampsRef.current[0] < cutoff) {
          syllableTimestampsRef.current.shift();
        }

        const syllablesPerSec = syllableTimestampsRef.current.length / smoothingSecs;
        const wordsPerSec = syllablesPerSec / 1.66;
        const wpmInstant = Math.max(0, Math.min(240, wordsPerSec * 60));

        const wpmSmoothed = emaAlpha * wpmInstant + (1 - emaAlpha) * lastWpmRef.current;
        lastWpmRef.current = wpmSmoothed;
        wpmFloatRef.current = wpmSmoothed;

        // Throttle UI state updates (~15 Hz) or on meaningful change
        const uiNow = now;
        const needsUpdate =
          uiNow - lastUiUpdateRef.current > 66 ||
          Math.abs(uiWpmRef.current - wpmSmoothed) > 2 ||
          uiTalkingRef.current !== talkingRef.current;
        if (needsUpdate) {
          lastUiUpdateRef.current = uiNow;
          setWpm(wpmSmoothed);
          setTalking(talkingRef.current);
          setNoiseFloor(noiseFloorRef.current);
          uiWpmRef.current = wpmSmoothed;
          uiTalkingRef.current = talkingRef.current;
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      setListening(true);
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setPermission("denied");
      setListening(false);
    }
  }, [listening, emaAlpha, minDbThreshold, smoothingSecs]);

  const stop = useCallback(() => {
    setListening(false);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch((err) => console.error("Failed to close audio context", err));
      audioCtxRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.error("Failed to stop media tracks", err);
      }
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
    bandpassRef.current = null;
    syllableTimestampsRef.current = [];
    lastPeakAtRef.current = 0;
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { permission, listening, start, stop, wpm, talking, noiseFloor };
}
