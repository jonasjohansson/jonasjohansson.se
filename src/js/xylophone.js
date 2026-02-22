// Xylophone sound generator using Web Audio API
import { melodyPlayer, NOTE_FREQUENCIES } from "./melody.js";
import { detectSwipeDirection } from "./utils/gestureDetector.js";

let audioContext = null;

// Initialize audio context on first user interaction
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Generate a clear, melodic tone for Mario
function playNote(frequency, duration = 0.3) {
  const ctx = initAudio();

  // Create oscillator for the main tone
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Use triangle wave for a clear, melodic sound
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Add slight detuning for richer sound
  const oscillator2 = ctx.createOscillator();
  oscillator2.type = "triangle";
  oscillator2.frequency.setValueAtTime(frequency * 1.01, ctx.currentTime);

  // Envelope for clear attack and decay
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02); // Clear attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Clear decay

  // Add a gentle filter for warmth
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2000, ctx.currentTime); // Higher cutoff for clarity
  filter.Q.setValueAtTime(0.5, ctx.currentTime); // Gentle resonance

  // Connect the audio graph
  oscillator.connect(filter);
  oscillator2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Play the note
  oscillator.start(ctx.currentTime);
  oscillator2.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
  oscillator2.stop(ctx.currentTime + duration);
}

// Map strip index to musical scale (pentatonic for pleasant sounds)
function getFrequencyForStrip(index, totalStrips) {
  // C major pentatonic scale starting at C4 (261.63 Hz)
  const baseFreq = 261.63;
  const pentatonicIntervals = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]; // Major pentatonic ratios

  // Map strip position to scale
  const octaveSpan = 2; // Span 2 octaves
  const normalizedPosition = index / (totalStrips - 1); // 0 to 1
  const octave = Math.floor(normalizedPosition * octaveSpan);
  const scaleIndex = Math.floor(((normalizedPosition * octaveSpan) % 1) * pentatonicIntervals.length);

  const frequency = baseFreq * Math.pow(2, octave) * pentatonicIntervals[scaleIndex];
  return frequency;
}

export function initXylophone() {
  const stripsContainer = document.getElementById("strips");
  if (!stripsContainer) return;

  const strips = Array.from(stripsContainer.querySelectorAll(".strip"));
  let currentTouchStrip = -1; // Track which strip the touch is currently over
  let isTouching = false;

  // Mouse events for desktop
  strips.forEach((strip, index) => {
    strip.addEventListener("mouseenter", () => {
      if (melodyPlayer.isMelodyMode) {
        // Play next note in melody
        melodyPlayer.playCurrentNote(playNote);
      } else {
        // Play individual strip note
        const frequency = getFrequencyForStrip(index, strips.length);
        playNote(frequency, 0.4);
      }
    });
  });

  // Global touch handler for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let isHorizontalGesture = false;
  let hasDetectedDirection = false;

  stripsContainer.addEventListener(
    "touchstart",
    (e) => {
      isTouching = true;
      hasDetectedDirection = false;
      isHorizontalGesture = false;
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const strip = element?.closest(".strip");
      if (strip) {
        const index = strips.indexOf(strip);
        if (index !== -1 && currentTouchStrip !== index) {
          currentTouchStrip = index;
          if (melodyPlayer.isMelodyMode) {
            // Play next note in melody
            melodyPlayer.playCurrentNote(playNote);
          } else {
            // Play individual strip note
            const frequency = getFrequencyForStrip(index, strips.length);
            playNote(frequency, 0.4);
          }
        }
      }
    },
    { passive: true }
  );

  stripsContainer.addEventListener(
    "touchmove",
    (e) => {
      if (!isTouching) return;
      
      const touch = e.touches[0];
      
      // Detect direction on first move
      if (!hasDetectedDirection) {
        const direction = detectSwipeDirection(touchStartX, touchStartY, touch.clientX, touch.clientY);
        if (direction === "horizontal") {
          isHorizontalGesture = true;
          hasDetectedDirection = true;
        } else if (direction === "vertical") {
          isHorizontalGesture = false;
          hasDetectedDirection = true;
          return; // Allow normal scrolling
        }
      }
      
      // Only prevent default and handle music for horizontal gestures
      if (isHorizontalGesture) {
        e.preventDefault();
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const strip = element?.closest(".strip");
      if (strip) {
        const index = strips.indexOf(strip);
        if (index !== -1 && currentTouchStrip !== index) {
          currentTouchStrip = index;
          if (melodyPlayer.isMelodyMode) {
            // Play next note in melody
            melodyPlayer.playCurrentNote(playNote);
          } else {
            // Play individual strip note
            const frequency = getFrequencyForStrip(index, strips.length);
            playNote(frequency, 0.3);
          }
        }
      }
      }
      // If vertical gesture, don't prevent default - allow normal scrolling
    },
    { passive: false }
  );

  stripsContainer.addEventListener(
    "touchend",
    (e) => {
      isTouching = false;
      currentTouchStrip = -1;
      hasDetectedDirection = false;
      isHorizontalGesture = false;
    },
    { passive: true }
  );
}

export { melodyPlayer };

// --- Strip animation sound effects ---

// Wood block sound — sharp crack with hollow resonance (hyoshigi-style)
function playWoodClick(freq, volume = 0.08) {
  const ctx = initAudio();
  if (ctx.state === "suspended") return;

  const t = ctx.currentTime;

  // 1. Noise burst for the initial "crack" of wood striking
  const bufferSize = ctx.sampleRate * 0.02;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseBand = ctx.createBiquadFilter();
  noiseBand.type = "bandpass";
  noiseBand.frequency.setValueAtTime(freq * 2, t);
  noiseBand.Q.setValueAtTime(2, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(volume * 1.5, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

  noise.connect(noiseBand);
  noiseBand.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // 2. Resonant body tone — hollow wood ring
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.1);

  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = "bandpass";
  bodyFilter.frequency.setValueAtTime(freq * 1.2, t);
  bodyFilter.Q.setValueAtTime(8, t);

  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(volume, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

  osc.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(ctx.destination);

  // 3. Higher harmonic for brightness
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 2.7, t);
  osc2.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.06);

  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(volume * 0.4, t);
  harmGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

  osc2.connect(bodyFilter);
  bodyFilter.connect(harmGain);
  harmGain.connect(ctx.destination);

  noise.start(t);
  osc.start(t);
  osc2.start(t);
  noise.stop(t + 0.02);
  osc.stop(t + 0.13);
  osc2.stop(t + 0.07);
}

// Click tuned to next melody note for each strip entering
export function playStripEnterSound(index, totalStrips) {
  const note = melodyPlayer.isMelodyMode ? melodyPlayer.getNextNote() : null;
  if (note) {
    const freq = NOTE_FREQUENCIES[note.note];
    if (freq) { playWoodClick(freq, 0.06); return; }
  }
  // Fallback: ascending pentatonic
  const baseFreq = 261.63;
  const pentatonic = [1, 9/8, 5/4, 3/2, 5/3];
  const pos = index / Math.max(totalStrips - 1, 1);
  const octave = Math.floor(pos * 2);
  const scaleIdx = Math.floor(((pos * 2) % 1) * pentatonic.length);
  playWoodClick(baseFreq * Math.pow(2, octave) * pentatonic[scaleIdx], 0.06);
}

// Click tuned to next melody note for each strip exiting
export function playStripExitSound(index, totalStrips) {
  const note = melodyPlayer.isMelodyMode ? melodyPlayer.getNextNote() : null;
  if (note) {
    const freq = NOTE_FREQUENCIES[note.note];
    if (freq) { playWoodClick(freq, 0.09); return; }
  }
  // Fallback: descending
  const baseFreq = 2400;
  const minFreq = 200;
  playWoodClick(baseFreq - (baseFreq - minFreq) * (index / Math.max(totalStrips - 1, 1)), 0.09);
}

// Deep wood thud for the expand — like a large taiko or temple drum
export function playStripExpandSound() {
  const ctx = initAudio();
  if (ctx.state === "suspended") return;

  const t = ctx.currentTime;

  // 1. Noise burst for the hit impact
  const bufferSize = ctx.sampleRate * 0.03;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;

  const noiseBand = ctx.createBiquadFilter();
  noiseBand.type = "lowpass";
  noiseBand.frequency.setValueAtTime(300, t);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.12, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

  noise.connect(noiseBand);
  noiseBand.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  // 2. Deep body resonance
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(65, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);

  const bodyFilter = ctx.createBiquadFilter();
  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(200, t);
  bodyFilter.Q.setValueAtTime(1, t);

  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0.1, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  osc.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(ctx.destination);

  noise.start(t);
  osc.start(t);
  noise.stop(t + 0.04);
  osc.stop(t + 0.4);
}

export function destroyXylophone() {
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}
