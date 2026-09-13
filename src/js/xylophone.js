import { melodyPlayer } from './melody.js';

let audioContext;
const voices = new Set();

function getAudio() {
  if (document.hidden) return null;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return null;
  try {
    audioContext ||= new Audio();
    return audioContext;
  } catch { return null; }
}

function unlockAudio() {
  const context = getAudio();
  if (context && context.state !== 'running') context.resume().catch(() => {});
}

function playNote(context, frequency, duration) {
  // Preserve the original pair of triangle waves and warm, percussive envelope.
  // Limit overlapping voices during fast sweeps without queueing later notes.
  if (voices.size >= 4) voices.values().next().value.stop();
  const time = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, time);
  filter.Q.setValueAtTime(0.5, time);
  filter.connect(gain);
  gain.connect(context.destination);
  const oscillators = [frequency, frequency * 1.01].map(value => {
    const oscillator = context.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(value, time);
    oscillator.connect(filter);
    return oscillator;
  });
  const voice = {
    stop() {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setTargetAtTime(0, context.currentTime, 0.005);
      oscillators.forEach(oscillator => oscillator.stop(context.currentTime + 0.02));
      voices.delete(voice);
    },
  };
  voices.add(voice);
  let ended = 0;
  oscillators.forEach(oscillator => {
    oscillator.onended = () => {
      oscillator.disconnect();
      if (++ended === oscillators.length) {
        filter.disconnect();
        gain.disconnect();
        voices.delete(voice);
      }
    };
    oscillator.start(time);
    oscillator.stop(time + duration);
  });
}

function stepMelody() {
  const context = getAudio();
  if (!context) return false;
  if (context.state !== 'running') {
    // A blocked hover must not consume a note or queue a burst after a click.
    return false;
  }
  melodyPlayer.playCurrentNote((frequency, duration) => playNote(context, frequency, duration));
  return true;
}

function stopNotes() {
  voices.forEach(voice => voice.stop());
}

export function initializeStripAudio() {
  melodyPlayer.enableMelodyMode('mario');
  // Browsers that block hover audio unlock it after a real click, tap or key.
  document.addEventListener('click', unlockAudio, { capture: true });
  document.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
  document.addEventListener('keydown', unlockAudio, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopNotes(); });
  addEventListener('pagehide', stopNotes);
}

export function bindStripAudio(container, signal) {
  let lastStrip;
  let lastX, lastY;
  const sample = event => {
    // Track actual pointer movement, so hover reflow cannot trigger extra notes.
    if (event.clientX === lastX && event.clientY === lastY) return;
    lastX = event.clientX;
    lastY = event.clientY;
    const strip = document.elementFromPoint(lastX, lastY)?.closest('.strip:not([hidden])');
    if (!strip || !container.contains(strip)) { lastStrip = null; return; }
    if (strip !== lastStrip && stepMelody()) lastStrip = strip;
  };
  container.addEventListener('pointerdown', event => {
    // A touch plays nothing yet: a tap sounds through its click, a scrub as it moves, a swipe never.
    if (event.pointerType !== 'touch') return;
    lastStrip = null;
    lastX = lastY = undefined;
  }, { signal, passive: true });
  container.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const samples = event.getCoalescedEvents?.();
    for (const point of samples?.length ? samples : [event]) sample(point);
  }, { signal, passive: true });
  // A touch only plays while scrubbing; a swipe that scrolls the wall stays silent.
  container.addEventListener('touchmove', event => {
    if (!('scrubbing' in container.dataset)) return;
    const touch = event.touches[0];
    sample({ clientX: touch.clientX, clientY: touch.clientY });
  }, { signal, passive: true });
  container.addEventListener('pointerleave', () => {
    lastStrip = null;
    lastX = lastY = undefined;
  }, { signal });
  container.addEventListener('click', event => {
    if (event.pointerType === 'mouse' && event.detail !== 0) return;
    if (!event.target.closest('.strip:not([hidden])')) return;
    const context = getAudio();
    if (!context) return;
    if (context.state === 'running') stepMelody();
    else context.resume().then(() => { if (!signal.aborted) stepMelody(); }).catch(() => {});
  }, { signal });
}
