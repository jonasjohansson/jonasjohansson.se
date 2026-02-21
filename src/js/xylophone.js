// Xylophone sound generator using Web Audio API
import { melodyPlayer } from "./melody.js";
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
            const playedNote = melodyPlayer.playCurrentNote(playNote);
            if (playedNote) {
              console.log(`Playing melody note: ${playedNote.note}`);
            }
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
            const playedNote = melodyPlayer.playCurrentNote(playNote);
            if (playedNote) {
              console.log(`Playing melody note: ${playedNote.note}`);
            }
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

// Short click/snap for each strip sliding in
export function playStripEnterSound(index, totalStrips) {
  const ctx = initAudio();
  if (ctx.state === "suspended") return;

  const baseFreq = 800;
  const maxFreq = 2000;
  const freq = baseFreq + (maxFreq - baseFreq) * (index / Math.max(totalStrips - 1, 1));

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Short noise burst for a click feel
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.04);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, ctx.currentTime);
  filter.Q.setValueAtTime(2, ctx.currentTime);

  // Sharp attack, instant decay
  gain.gain.setValueAtTime(0.06, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

// Percussive click for strips sliding out — descending, punchy
export function playStripExitSound(index, totalStrips) {
  const ctx = initAudio();
  if (ctx.state === "suspended") return;

  const baseFreq = 2400;
  const minFreq = 200;
  const freq = baseFreq - (baseFreq - minFreq) * (index / Math.max(totalStrips - 1, 1));

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Sharp snap that drops
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.15, ctx.currentTime + 0.06);

  // Add a noise-like second oscillator for texture
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(freq * 0.1, ctx.currentTime + 0.04);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06);
  filter.Q.setValueAtTime(4, ctx.currentTime);

  // Punchy attack, fast decay
  gain.gain.setValueAtTime(0.09, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.09);
  osc2.stop(ctx.currentTime + 0.09);
}

// Slow sweep that tracks the 1s grow transition
export function playStripExpandSound() {
  const ctx = initAudio();
  if (ctx.state === "suspended") return;

  const duration = 1.0; // Match CSS grow transition duration

  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  // Low tone that rises with the expansion
  osc.type = "sine";
  osc.frequency.setValueAtTime(60, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + duration);

  // Harmonic that follows
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(120, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + duration);

  // Filter opens as it expands
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + duration);
  filter.Q.setValueAtTime(0.5, ctx.currentTime);

  // Fade in quickly, sustain through transition, fade at end
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + 0.03);
  gain.gain.setValueAtTime(0.07, ctx.currentTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
  osc2.stop(ctx.currentTime + duration);
}

export function destroyXylophone() {
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
}
