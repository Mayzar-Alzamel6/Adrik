// Renders the web app's Web Audio cues (adrik-app/src/lib/sounds.ts) to WAV files for the phone.
// Run: node scripts/make-sounds.js
const fs = require("fs");
const path = require("path");

const RATE = 22050;

function render(tones) {
  const end = Math.max(...tones.map((t) => t.start + t.duration + 0.05));
  const buf = new Float32Array(Math.ceil(end * RATE));
  for (const { freq, start, duration, volume, type = "sine" } of tones) {
    const s0 = Math.floor(start * RATE);
    const n = Math.floor((duration + 0.05) * RATE);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      // Same envelope as the web: exponential attack to `volume` in 20ms, exponential decay to ~0.
      const env =
        t < 0.02 ? 0.0001 * Math.pow(volume / 0.0001, t / 0.02) : volume * Math.pow(0.0001 / volume, Math.min(1, (t - 0.02) / (duration - 0.02)));
      const ph = (freq * t) % 1;
      const wave = type === "triangle" ? 1 - 4 * Math.abs(ph - 0.5) : Math.sin(2 * Math.PI * ph);
      buf[s0 + i] += wave * env;
    }
  }
  return buf;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVEfmt ", 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const cues = {
  start: [
    { freq: 523.25, start: 0, duration: 0.35, volume: 0.12 },
    { freq: 783.99, start: 0.12, duration: 0.5, volume: 0.1 },
  ],
  end: [0, 0.45, 0.9].flatMap((at) => [
    { freq: 880, start: at, duration: 1.4, volume: 0.28 },
    { freq: 1760, start: at, duration: 0.9, volume: 0.08 },
    { freq: 1318.5, start: at + 0.02, duration: 1.1, volume: 0.06, type: "triangle" },
  ]),
  "breath-in": [{ freq: 392, start: 0, duration: 0.6, volume: 0.07 }],
  "breath-hold": [{ freq: 440, start: 0, duration: 0.6, volume: 0.07 }],
  "breath-out": [{ freq: 329.63, start: 0, duration: 0.6, volume: 0.07 }],
};

const out = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(out, { recursive: true });
for (const [name, tones] of Object.entries(cues)) {
  fs.writeFileSync(path.join(out, `${name}.wav`), wav(render(tones)));
}
console.log("wrote", Object.keys(cues).join(", "));
