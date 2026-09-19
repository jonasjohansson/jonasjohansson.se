import { getAudioContext } from './xylophone.js';

// Squeezing the window plays a real accordion rather than the strips' xylophone.
// A free reed is rich and buzzing, so each note is a bank of sawtooths a few
// cents apart: that beating is the musette sound an accordion is known for.
// Bellows also sustain while they move, so this holds while the window is being
// dragged and releases when it stops, instead of striking a note per step.
const REEDS = [-11, 0, 9];            // cents apart, the musette beat
const CHORD = [1, 1.5, 2];            // root, fifth, octave
const SCALE = [146.83, 164.81, 196.0, 220.0, 246.94, 293.66]; // D pentatonic
const LEVEL = 0.09;                   // quieter than the xylophone's strike
const HELD_MS = 170;                  // silence for this long means the drag ended

let bellows = null;
let degree = 0;
let releaseTimer = 0;

// Reeds start at pitch. Starting them at the oscillator's default and setting
// the note afterwards clicks at the top of every squeeze.
function open(context, root) {
  const now = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, now);
  // Reeds are bright but not harsh; the body of the instrument rolls off the top.
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2400, now);
  filter.Q.setValueAtTime(0.6, now);
  filter.connect(gain);
  gain.connect(context.destination);
  const voices = [];
  for (const interval of CHORD) {
    for (const cents of REEDS) {
      const oscillator = context.createOscillator();
      oscillator.type = 'sawtooth';
      oscillator.detune.setValueAtTime(cents, now);
      oscillator.frequency.setValueAtTime(root * interval, now);
      oscillator.connect(filter);
      oscillator.start(now);
      voices.push({ oscillator, interval });
    }
  }
  return { gain, filter, voices };
}

function close(context) {
  if (!bellows) return;
  const { gain, filter, voices } = bellows;
  const now = context.currentTime;
  bellows = null;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(0, now, 0.06);
  voices.forEach(({ oscillator }) => oscillator.stop(now + 0.4));
  voices.at(-1).oscillator.addEventListener('ended', () => {
    filter.disconnect();
    gain.disconnect();
  });
}

// Every resize while a drag continues: keep the reeds sounding and hold the
// release off. Crossing a strip's width moves the chord a degree, up as the
// window opens and down as it closes.
function squeeze(context, moved) {
  const now = context.currentTime;
  if (moved) degree = (degree + (moved < 0 ? -1 : 1) + SCALE.length) % SCALE.length;
  const root = SCALE[degree];
  bellows ||= open(context, root);
  bellows.voices.forEach(({ oscillator, interval }) => oscillator.frequency.setValueAtTime(root * interval, now));
  bellows.gain.gain.cancelScheduledValues(now);
  bellows.gain.gain.setTargetAtTime(LEVEL, now, 0.03);
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => close(context), HELD_MS);
}

export function bindAccordion(container, signal) {
  // Phones change width by rotating, which is not a squeeze.
  if (matchMedia('(hover: none)').matches) return;
  let width = innerWidth;
  const stop = () => { clearTimeout(releaseTimer); const context = getAudioContext(); if (context) close(context); };
  addEventListener('resize', () => {
    const strips = container.querySelectorAll('.strip:not([hidden])').length;
    // A hidden wall (a phone card list, say) is not being squeezed.
    if (!strips || container.offsetParent === null) { width = innerWidth; return; }
    const context = getAudioContext();
    // Audio only starts after a real gesture, and a window drag is not one.
    if (!context || context.state !== 'running') { width = innerWidth; return; }
    const step = Math.max(24, innerWidth / strips);
    const travelled = innerWidth - width;
    if (Math.abs(travelled) >= step) width = innerWidth;
    squeeze(context, Math.abs(travelled) >= step ? travelled : 0);
  }, { signal, passive: true });
  addEventListener('pagehide', stop, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, { signal });
  signal.addEventListener('abort', stop);
}
