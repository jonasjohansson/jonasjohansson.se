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

// Ensure audio context exists and is running; returns null if not ready
function getActiveAudio() {
  if (!audioContext) return null;
  if (audioContext.state === "suspended") {
    audioContext.resume();
    return null;
  }
  return audioContext;
}

// Get number of currently visible strips (set by filter system)
function getVisibleStripCount() {
  const container = document.getElementById("strips");
  if (!container) return 20;
  const count = parseInt(container.getAttribute("data-visible-count"), 10);
  return isNaN(count) ? 20 : count;
}

// Subtle bass tone for minimal filter results
function playBassNote(frequency = 55, duration = 0.5) {
  const ctx = getActiveAudio();
  if (!ctx) return;

  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, t);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.8, t + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(250, t);
  filter.Q.setValueAtTime(1, t);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + duration);
}

// Generate a clear, melodic tone for Mario
function playNote(frequency, duration = 0.3) {
  const ctx = getActiveAudio();
  if (!ctx) return;

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

// Play a note adapted to how many strips are currently visible
function playAdaptiveNote(index, totalStrips) {
  const visibleCount = getVisibleStripCount();

  if (visibleCount === 1) {
    // Single result: just a bass tone
    playBassNote(55, 0.5);
  } else if (visibleCount <= 4) {
    // Very few: low simple tones, no melody
    const lowFreqs = [65.41, 82.41, 98.0, 110.0]; // C2, E2, G2, A2
    playBassNote(lowFreqs[index % lowFreqs.length], 0.4);
  } else if (visibleCount <= 7) {
    // Few: reduced pentatonic, no melody
    const frequency = getFrequencyForStrip(index, totalStrips);
    playNote(frequency * 0.5, 0.3);
  } else if (melodyPlayer.isMelodyMode) {
    // Full set: play melody
    melodyPlayer.playCurrentNote(playNote);
  } else {
    // Full set: individual strip note
    const frequency = getFrequencyForStrip(index, totalStrips);
    playNote(frequency, 0.4);
  }
}

// Advance the melody by a single note (used for tap-to-step on touch devices)
export function stepMelody() {
  initAudio();
  if (melodyPlayer.isMelodyMode) {
    melodyPlayer.playCurrentNote(playNote);
  }
}

export function initXylophone() {
  const stripsContainer = document.getElementById("strips");
  if (!stripsContainer) return;

  const strips = Array.from(stripsContainer.querySelectorAll(".strip"));
  let currentTouchStrip = -1; // Track which strip the touch is currently over
  let isTouching = false;

  // Desktop: track strip crossings via pointermove + coalesced samples so fast
  // sweeps don't skip strips when hover-driven reflow shifts geometry mid-move.
  const TRAIL_MS = 75;
  const trailTimers = new WeakMap();
  let lastMouseStrip = null;

  function flashStrip(strip) {
    strip.classList.add("strip-trail");
    const prev = trailTimers.get(strip);
    if (prev) clearTimeout(prev);
    trailTimers.set(strip, setTimeout(() => {
      strip.classList.remove("strip-trail");
      trailTimers.delete(strip);
    }, TRAIL_MS));
  }

  function sampleMouseAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const strip = el?.closest(".strip");
    if (!strip || strip === lastMouseStrip) return;
    if (!stripsContainer.contains(strip)) return;
    const index = strips.indexOf(strip);
    if (index === -1) return;
    lastMouseStrip = strip;
    initAudio();
    playAdaptiveNote(index, strips.length);
    flashStrip(strip);
  }

  stripsContainer.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const coalesced = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
    if (coalesced && coalesced.length) {
      for (const ev of coalesced) sampleMouseAt(ev.clientX, ev.clientY);
    } else {
      sampleMouseAt(e.clientX, e.clientY);
    }
  });

  stripsContainer.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    lastMouseStrip = null;
  });

  // Global touch handler for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let isHorizontalGesture = false;
  let hasDetectedDirection = false;

  stripsContainer.addEventListener(
    "touchstart",
    (e) => {
      initAudio();
      isTouching = true;
      hasDetectedDirection = false;
      isHorizontalGesture = false;

      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      
      // On touch devices the melody steps via a page-wide tap handler, so don't
      // also play a per-strip note here (would double up on each tap).
      if (window.matchMedia("(hover: none)").matches) return;

      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const strip = element?.closest(".strip");
      if (strip) {
        const index = strips.indexOf(strip);
        if (index !== -1 && currentTouchStrip !== index) {
          currentTouchStrip = index;
          playAdaptiveNote(index, strips.length);
        }
      }
    },
    { passive: true }
  );

  stripsContainer.addEventListener(
    "touchmove",
    (e) => {
      if (!isTouching) return;
      // No swipe-to-play on touch devices; let the page scroll instead.
      if (window.matchMedia("(hover: none)").matches) return;

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
          playAdaptiveNote(index, strips.length);
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




