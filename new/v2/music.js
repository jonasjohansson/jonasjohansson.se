// music.js — Zelda-esque harmony: soft triangle PolySynth + Lydian scale

let synth = null;
let audioReady = false;
let toneLoaded = false;

// Load Tone.js only after a user gesture to avoid autoplay warnings
function loadToneOnce() {
  return new Promise((resolve, reject) => {
    if (window.Tone) {
      toneLoaded = true;
      resolve();
      return;
    }
    if (toneLoaded) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/tone@14.8.49/build/Tone.js";
    s.async = true;
    s.onload = () => {
      toneLoaded = true;
      resolve();
    };
    s.onerror = (e) => reject(e);
    document.head.appendChild(s);
  });
}

// Unlock audio + build synth chain on first gesture
export async function ensureAudio() {
  if (audioReady) return;
  await loadToneOnce().catch(() => {});
  if (!window.Tone) return;

  // Start/resume context (requires gesture)
  try {
    await Tone.start();
  } catch {}
  if (Tone.context.state !== "running") {
    try {
      await Tone.context.resume();
    } catch {}
  }

  // Gentle FX chain for that nostalgic, airy vibe
  const filter = new Tone.Filter({
    frequency: 1800,
    type: "lowpass",
    rolloff: -24,
  });

  const chorus = new Tone.Chorus({
    frequency: 0.8,
    delayTime: 1.8,
    depth: 0.15,
    wet: 0.25,
  }).start();

  const reverb = new Tone.Reverb({
    decay: 3.5,
    preDelay: 0.02,
    wet: 0.22,
  });

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.35 },
    maxPolyphony: 8,
  });

  synth.chain(filter, chorus, reverb, Tone.Destination);
  audioReady = true;
  console.log("[audio] context + synth ready");
}

// ---- Scale mapping (C Lydian) ----
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const LOW_MIDI = 48; // C3
const HIGH_MIDI = 69; // A4

function snapLydian(m) {
  const oct = Math.floor(m / 12);
  const inOct = m - oct * 12;
  let best = LYDIAN[0],
    bestDist = Infinity;
  for (const iv of LYDIAN) {
    const d = Math.abs(inOct - iv);
    if (d < bestDist) {
      bestDist = d;
      best = iv;
    }
  }
  return Math.max(LOW_MIDI, Math.min(HIGH_MIDI, oct * 12 + best));
}

export function indexToMidi(i, totalStrips = STRIP_COUNT) {
  // Safety checks
  if (isNaN(i) || isNaN(totalStrips) || totalStrips <= 0) {
    return LOW_MIDI;
  }

  const t = Math.max(0, Math.min(1, i / (totalStrips - 1)));
  const approx = LOW_MIDI + t * (HIGH_MIDI - LOW_MIDI);
  const fromTop = totalStrips - 1 - i;
  const trim = fromTop < 4 ? [4, 3, 2, 1][fromTop] : 0; // soften very top
  return snapLydian(approx - trim);
}

const midiToNote = (m) => window.Tone.Frequency(m, "midi").toNote();

export function playStripNote(index, velocity = 0.9, totalStrips = STRIP_COUNT) {
  if (!audioReady || !synth) return;

  // Safety checks
  if (isNaN(index) || isNaN(totalStrips) || totalStrips <= 0) {
    return;
  }

  const root = indexToMidi(index, totalStrips);
  const fifth = root + 7;
  const notes = [midiToNote(root), midiToNote(fifth)];

  try {
    synth.triggerAttackRelease(notes, "8n", undefined, velocity);
  } catch (error) {
    console.warn("Audio error:", error);
  }
}
