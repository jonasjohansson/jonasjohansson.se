// Melody system for playing songs through strip interactions

// Note frequencies for common notes (in Hz)
const NOTE_FREQUENCIES = {
  F2: 87.31,
  "F#2": 92.5,
  G2: 98.0,
  "G#2": 103.83,
  A2: 110.0,
  "A#2": 116.54,
  B2: 123.47,
  C3: 130.81,
  "C#3": 138.59,
  D3: 146.83,
  "D#3": 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.0,
  G3: 196.0,
  "G#3": 207.65,
  A3: 220.0,
  "A#3": 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
  C6: 1046.5,
};

// Mario theme - corrected to be in C major, starting at the right octave
const MARIO_MELODY = [
  { note: "E5", duration: 0.15 },
  { note: "E5", duration: 0.15 },
  { note: "E5", duration: 0.15 },
  { note: "C5", duration: 0.15 },
  { note: "E5", duration: 0.15 },
  { note: "G5", duration: 0.3 },
  { note: "G4", duration: 0.3 },
  { note: "C5", duration: 0.25 },
  { note: "G4", duration: 0.25 },
  { note: "E4", duration: 0.25 },
  { note: "A4", duration: 0.2 },
  { note: "B4", duration: 0.2 },
  { note: "A#4", duration: 0.15 },
  { note: "A4", duration: 0.2 },
  { note: "G4", duration: 0.25 },
  { note: "E5", duration: 0.25 },
  { note: "G5", duration: 0.25 },
  { note: "A5", duration: 0.2 },
  { note: "F5", duration: 0.2 },
  { note: "G5", duration: 0.2 },
  { note: "E5", duration: 0.2 },
  { note: "C5", duration: 0.2 },
  { note: "D5", duration: 0.2 },
  { note: "B4", duration: 0.2 },
];

const MELODIES = {
  mario: { name: "Super Mario Bros.", notes: MARIO_MELODY },
};

class MelodyPlayer {
  constructor() {
    this.isMelodyMode = false;
    this.currentMelody = null;
    this.currentNoteIndex = 0;
    this.isPlaying = false;
    this.playbackTimeout = null;
  }

  // Enable melody mode with a specific melody
  enableMelodyMode(melodyKey) {
    if (MELODIES[melodyKey]) {
      this.isMelodyMode = true;
      this.currentMelody = MELODIES[melodyKey];
      this.currentNoteIndex = 0;
      this.isPlaying = false;
      return true;
    }
    return false;
  }

  // Disable melody mode
  disableMelodyMode() {
    this.isMelodyMode = false;
    this.currentMelody = null;
    this.currentNoteIndex = 0;
    this.isPlaying = false;
    if (this.playbackTimeout) {
      clearTimeout(this.playbackTimeout);
      this.playbackTimeout = null;
    }
  }

  // Get the next note in the melody
  getNextNote() {
    if (!this.isMelodyMode || !this.currentMelody) {
      return null;
    }

    const note = this.currentMelody.notes[this.currentNoteIndex];
    this.currentNoteIndex = (this.currentNoteIndex + 1) % this.currentMelody.notes.length;
    return note;
  }

  // Play the current note in the melody
  playCurrentNote(playNoteFunction) {
    if (!this.isMelodyMode || !this.currentMelody) {
      return null;
    }

    const note = this.getNextNote();
    if (note) {
      const frequency = NOTE_FREQUENCIES[note.note];
      if (typeof frequency === "number" && isFinite(frequency)) {
        playNoteFunction(frequency, note.duration);
        return note;
      }
    }
    return null;
  }

  getAvailableMelodies() {
    return Object.keys(MELODIES).map((key) => ({
      key,
      name: MELODIES[key].name,
    }));
  }

  selectRandomMelody() {
    const keys = Object.keys(MELODIES);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return randomKey;
  }
}

export const melodyPlayer = new MelodyPlayer();

