// Xylophone sound generator using Web Audio API
import { melodyPlayer } from "./melody.js";

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
        const playedNote = melodyPlayer.playCurrentNote(playNote);
        if (playedNote) {
          console.log(`Playing melody note: ${playedNote.note}`);
        }
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
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        // Only handle horizontal gestures (X-axis)
        if (deltaX > deltaY && deltaX > 10) {
          isHorizontalGesture = true;
          hasDetectedDirection = true;
        } else if (deltaY > deltaX && deltaY > 10) {
          // Vertical scroll - let browser handle it, don't prevent default
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

// Export melody player for external control
export { melodyPlayer };

// Expose globally for console access
window.melodyPlayer = melodyPlayer;

// Initialize when DOM is ready
function init() {
  initXylophone();
  // Enable Mario melody by default
  melodyPlayer.enableMelodyMode("mario");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
