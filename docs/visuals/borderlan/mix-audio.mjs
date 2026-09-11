import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const root = process.argv[2] || path.resolve(repo, '../borderlan/conductor/public');
const directory = path.join(repo, 'docs/visuals/borderlan');
const mixes = JSON.parse(fs.readFileSync(path.join(directory, 'audio-mixes.json')));
const rate = 48000, channels = 2;

function decode(file, start = 0, duration) {
  const args = ['-v', 'error', '-ss', String(start), '-i', file,
    ...(duration ? ['-t', String(duration)] : []),
    '-vn', '-ac', String(channels), '-ar', String(rate), '-f', 'f32le', 'pipe:1'];
  const result = spawnSync('ffmpeg', args, { maxBuffer: 128 * 1024 * 1024 });
  if (result.status !== 0) throw Error(result.stderr.toString());
  const audio = new Float32Array(result.stdout.byteLength / 4);
  for (let i = 0; i < audio.length; i++) audio[i] = result.stdout.readFloatLE(i * 4);
  return audio;
}

function levels(audio) {
  let squares = 0, peak = 0;
  for (const x of audio) { squares += x * x; peak = Math.max(peak, Math.abs(x)); }
  return { rms: Math.sqrt(squares / audio.length), peak };
}

function gainFor(audio, rmsTarget, peakTarget) {
  const { rms, peak } = levels(audio);
  return Math.min(rmsTarget / rms, peakTarget / peak);
}

// Align the audible attack, rather than any silence in the source WAV.
// A 2 ms window ignores isolated clicks; a short ramp avoids a splice click.
function trimStart(audio) {
  const { peak } = levels(audio);
  const window = Math.round(rate * .002) * channels, threshold = peak * .018;
  for (let i = 0; i < audio.length; i += window) {
    let squares = 0;
    for (let j = i; j < Math.min(i + window, audio.length); j++) squares += audio[j] ** 2;
    if (Math.sqrt(squares / window) >= threshold) return Math.max(0, i - Math.round(rate * .001) * channels);
  }
  throw Error('Silent sound effect');
}

function timeAtBeat(beats, beat) {
  const index = Math.floor(beat), fraction = beat - index;
  if (beats[index] === undefined || (fraction && beats[index + 1] === undefined)) throw Error('Cue outside beat grid');
  return beats[index] + (fraction ? fraction * (beats[index + 1] - beats[index]) : 0);
}

const reports = [];
for (const m of mixes) {
  const count = rate * channels * m.duration;
  const music = decode(path.join(root, 'music', m.music), m.start, m.duration);
  if (music.length !== count) throw Error(`Short music source: ${m.name}`);
  const effects = new Float32Array(count), voices = new Float32Array(count), mix = new Float32Array(count);
  const musicGain = gainFor(music, .115, .48);
  const cues = [];
  for (const cue of m.sfx) {
    const raw = decode(path.join(root, 'samples', cue.file + '.wav'));
    const trim = trimStart(raw), audio = raw.subarray(trim);
    const gain = gainFor(audio, cue.kind === 'voice' ? .115 : .08, cue.kind === 'voice' ? .45 : .36);
    const at = timeAtBeat(m.beats, cue.beat), offset = Math.round(at * rate) * channels;
    if (offset + audio.length > count) throw Error(`Truncated cue: ${cue.file}`);
    const target = cue.kind === 'voice' ? voices : effects;
    for (let i = 0; i < audio.length; i++) {
      const ramp = Math.min(1, i / (channels * rate * .001));
      target[i + offset] += audio[i] * gain * ramp;
    }
    cues.push({ ...cue, at, trimmedSeconds: trim / channels / rate, duration: audio.length / channels / rate });
  }
  const spoken = cues.filter(c => c.kind === 'voice');
  for (let i = 1; i < spoken.length; i++) {
    if (spoken[i - 1].at + spoken[i - 1].duration > spoken[i].at) {
      throw Error(`Overlapping voices: ${m.name}, ${spoken[i - 1].file}, ${spoken[i].file}`);
    }
  }
  let envelope = 0;
  const attack = Math.exp(-1 / (rate * .012)), release = Math.exp(-1 / (rate * .25));
  const fadeOut = 8 * 60 / m.bpm;
  for (let i = 0; i < count; i += channels) {
    const t = i / channels / rate, input = Math.max(Math.abs(voices[i]), Math.abs(voices[i + 1]));
    const smooth = input > envelope ? attack : release;
    envelope = smooth * envelope + (1 - smooth) * input;
    const duck = 1 / (1 + 2.5 * envelope);
    const fade = Math.max(0, Math.min(1, t / .08, (m.duration - t) / fadeOut));
    for (let c = 0; c < channels; c++) {
      mix[i + c] = (music[i + c] * musicGain * duck + effects[i + c] + voices[i + c]) * fade;
    }
  }
  const { peak, rms } = levels(mix), safety = Math.min(1, .85 / peak);
  if (safety < 1) for (let i = 0; i < count; i++) mix[i] *= safety;
  const output = path.join(repo, 'projects/borderlan', m.name + '.mp3');
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(rate), '-ac', String(channels),
    '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1',
    '-metadata', 'title=BorderLAN: ' + m.title + ' + game soundboard',
    '-metadata', 'artist=' + m.artist + ' / BorderLAN soundboard mix', output],
  { input: Buffer.from(mix.buffer), maxBuffer: 1024 * 1024 });
  if (result.status !== 0) throw Error(result.stderr.toString());
  const report = { name: m.name, seconds: m.duration, bpm: m.bpm, cues,
    peakDb: 20 * Math.log10(peak * safety), rmsDb: 20 * Math.log10(rms * safety), bytes: fs.statSync(output).size };
  reports.push(report);
  console.log({ ...report, cues: cues.length });
}
fs.writeFileSync(path.join(directory, 'audio-render-report.json'), JSON.stringify(reports, null, 2) + '\n');
