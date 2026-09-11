import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const portfolio = fileURLToPath(new URL('../../../', import.meta.url));
const root = process.argv[2] || path.resolve(portfolio, '../borderlan/launcher/trailers');
// These are the existing launcher previews, not recordings of guests playing.
const clips = [
  { id: 'cs16', start: 4, seconds: 6 },
  { id: 'aqtion', start: 6, seconds: 6 },
  { id: 'openarena', start: 4, seconds: 6 },
];
const output = path.join(portfolio, 'projects/borderlan/game-previews.mp4');
const inputArgs = clips.flatMap(clip => ['-ss', String(clip.start), '-t', String(clip.seconds), '-i', path.join(root, clip.id + '.mp4')]);
const filters = clips.map((_, i) => `[${i}:v]fps=30,setsar=1,setpts=PTS-STARTPTS[v${i}]`);
filters.push(clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${clips.length}:v=1:a=0[out]`);
function ffmpeg(args) {
  const result = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'FFmpeg failed');
}
ffmpeg([...inputArgs, '-filter_complex', filters.join(';'), '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-maxrate', '3M', '-bufsize', '6M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output]);
ffmpeg(['-i', output, '-frames:v', '1', '-q:v', '2', '-update', '1', path.join(portfolio, 'projects/borderlan/game-previews.jpg')]);
console.log('Created an 18-second reel: Counter-Strike 1.6, Action Quake 2 and OpenArena.');
