"use client";

// ─── Concept: Web Audio API ───────────────────────────────────────────────────
// We don't use sound files (.mp3). Instead we use the browser's built-in
// Web Audio API to GENERATE sounds with math. An AudioContext is like a
// mixer board. We create "oscillators" (sound wave generators), shape them,
// and play them for a few milliseconds.
//
// Why not just use .mp3 files?
// 1. No extra files to host
// 2. Instant — no network request
// 3. Fully customizable pitch/duration in code
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback, useEffect } from "react";

export function useSounds(enabled: boolean) {
  // AudioContext must be created after a user interaction (browser rule).
  // We store it in a ref so it persists without causing re-renders.
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!enabled) return null;
    if (!ctxRef.current) {
      // Create the AudioContext lazily on first use
      ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return ctxRef.current;
  }, [enabled]);

  // ── Helper: play a tone ────────────────────────────────────────────────────
  // frequency: pitch in Hz (440 = A4 concert pitch)
  // duration:  how long in seconds
  // type:      wave shape — "sine" is smooth, "square" is buzzy
  // volume:    0.0 to 1.0
  const playTone = useCallback((
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume: number = 0.15,
    delay: number = 0,
  ) => {
    const ctx = getCtx();
    if (!ctx) return;

    // GainNode controls volume. We fade it in and out to avoid clicks.
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    // Oscillator generates the actual sound wave
    const osc = ctx.createOscillator();
    osc.connect(gainNode);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);

    const start = ctx.currentTime + delay;
    const end   = start + duration;

    // Envelope: fade in quickly, fade out at the end to avoid harsh clicks
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(volume, start + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, end);

    osc.start(start);
    osc.stop(end);
  }, [getCtx]);

  // ── New Post Sound ─────────────────────────────────────────────────────────
  // A soft "blip" — low frequency, short, sine wave
  const playNewPost = useCallback(() => {
    playTone(220, 0.08, "sine", 0.08);
  }, [playTone]);

  // ── Typing Sound ───────────────────────────────────────────────────────────
  // 3 rapid clicks — mimics keyboard typing
  const playTyping = useCallback(() => {
    for (let i = 0; i < 3; i++) {
      playTone(800 + Math.random() * 200, 0.03, "square", 0.04, i * 0.05);
    }
  }, [playTone]);

  // ── God Mode Injection Sound ───────────────────────────────────────────────
  // Dramatic descending tone + a sharp alarm ping
  // Concept: playing multiple tones at different delays creates a chord/sequence
  const playInjection = useCallback(() => {
    // Descending sweep
    const ctx = getCtx();
    if (!ctx) return;

    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);

    const osc = ctx.createOscillator();
    osc.connect(gainNode);
    osc.type = "sawtooth";
    // frequency.linearRampToValueAtTime sweeps the pitch over time
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);

    // Sharp ping at the end
    playTone(1760, 0.1, "sine", 0.25, 0.5);
  }, [getCtx, playTone]);

  // ── Faction Alert ──────────────────────────────────────────────────────────
  // Two-tone "ding" for when a new faction forms
  const playFactionAlert = useCallback(() => {
    playTone(523, 0.15, "sine", 0.12);       // C5
    playTone(659, 0.15, "sine", 0.12, 0.15); // E5
  }, [playTone]);

  // ── Error Sound ────────────────────────────────────────────────────────────
  const playError = useCallback(() => {
    playTone(150, 0.3, "sawtooth", 0.15);
  }, [playTone]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
    };
  }, []);

  return { playNewPost, playTyping, playInjection, playFactionAlert, playError };
}