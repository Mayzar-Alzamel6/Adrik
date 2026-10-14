// Tiny Web Audio synth: no audio files, no dependencies.
// Browsers only allow audio after a user gesture, so the context is created/resumed by unlockAudio()
// from a pointer or key event; until then every play* call is a silent no-op.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, start: number, duration: number, volume: number, type: OscillatorType = "sine") {
  if (!ctx) return;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function ready(enabled: boolean) {
  return enabled && ctx !== null && ctx.state === "running";
}

/** Soft rising two-note chime. */
export function playStart(enabled: boolean) {
  if (!ready(enabled)) return;
  tone(523.25, 0, 0.35, 0.12);
  tone(783.99, 0.12, 0.5, 0.1);
}

/** Clear three-strike bell, loud enough to notice from across the room. */
export function playEnd(enabled: boolean) {
  if (!ready(enabled)) return;
  [0, 0.45, 0.9].forEach((at) => {
    tone(880, at, 1.4, 0.28);
    tone(1760, at, 0.9, 0.08);
    tone(1318.5, at + 0.02, 1.1, 0.06, "triangle");
  });
}

/** Gentle cue for each breathing phase: rising on inhale, steady on hold, falling on exhale. */
export function playBreathCue(phase: "in" | "hold" | "out", enabled: boolean) {
  if (!ready(enabled)) return;
  const freq = phase === "in" ? 392 : phase === "hold" ? 440 : 329.63;
  tone(freq, 0, 0.6, 0.07);
}
