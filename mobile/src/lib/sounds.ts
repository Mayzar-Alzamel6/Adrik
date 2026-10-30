import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useAppStore } from "@/stores/useAppStore";

// The same cues as the web app's Web Audio synth, pre-rendered to WAV by scripts/make-sounds.js.
const SOURCES = {
  start: require("../../assets/sounds/start.wav"),
  end: require("../../assets/sounds/end.wav"),
  "breath-in": require("../../assets/sounds/breath-in.wav"),
  "breath-hold": require("../../assets/sounds/breath-hold.wav"),
  "breath-out": require("../../assets/sounds/breath-out.wav"),
} as const;

type Cue = keyof typeof SOURCES;

const players: Partial<Record<Cue, AudioPlayer>> = {};
let modeSet = false;

function play(cue: Cue) {
  if (useAppStore.getState().settings.sound === false) return;
  try {
    if (!modeSet) {
      modeSet = true;
      // Short cues: mix with the user's music, and stay quiet when the phone is on silent/vibrate.
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    }
    const player = (players[cue] ??= createAudioPlayer(SOURCES[cue]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // A missing cue must never break the flow it decorates.
  }
}

/** Soft rising two-note chime when a session starts. */
export const playStart = () => play("start");

/** Clear three-strike bell when a session or break ends. */
export const playEnd = () => play("end");

/** Gentle cue for each breathing phase: rising on inhale, steady on hold, falling on exhale. */
export const playBreathCue = (phase: "in" | "hold" | "out") => play(`breath-${phase}`);
