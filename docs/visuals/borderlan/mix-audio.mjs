import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../../../', import.meta.url));
const root = process.argv[2] || path.resolve(repo, '../borderlan/conductor/public');
const mixes=JSON.parse(fs.readFileSync(repo+'/docs/visuals/borderlan/audio-mixes.json'));
const rate=48000,channels=2;
function decode(file,start=0,duration){const args=['-v','error',...(start?['-ss',String(start)]:[]),'-i',file,...(duration?['-t',String(duration)]:[]),'-vn','-ac','2','-ar',String(rate),'-f','f32le','pipe:1'];const r=spawnSync('ffmpeg',args,{maxBuffer:128*1024*1024});if(r.status!==0)throw Error(r.stderr.toString());const a=new Float32Array(r.stdout.byteLength/4);for(let i=0;i<a.length;i++)a[i]=r.stdout.readFloatLE(i*4);return a;}
function gainFor(a,rmsTarget,peakTarget){let sq=0,peak=0;for(const x of a){sq+=x*x;peak=Math.max(peak,Math.abs(x));}return Math.min(rmsTarget/Math.sqrt(sq/a.length),peakTarget/peak);}
for(const m of mixes){
 const count=rate*channels*m.duration,music=decode(root+'/music/'+m.music,m.start,m.duration),fx=new Float32Array(count),mix=new Float32Array(count);
 const mg=gainFor(music,.075,.5);
 for(const[file,at]of m.sfx){const a=decode(root+'/samples/'+file+'.wav'),gain=gainFor(a,.13,.75),offset=Math.round(at*rate)*channels;for(let i=0;i<a.length&&i+offset<count;i++)fx[i+offset]+=a[i]*gain;}
 let envelope=0,peak=0,squares=0;const attack=Math.exp(-1/(rate*.012)),release=Math.exp(-1/(rate*.25));
 for(let i=0;i<count;i+=2){const t=i/channels/rate,input=Math.max(Math.abs(fx[i]),Math.abs(fx[i+1])),smooth=input>envelope?attack:release;envelope=smooth*envelope+(1-smooth)*input;const duck=1/(1+5*envelope),fade=Math.min(1,t,(m.duration-t)/4);for(let c=0;c<2;c++){const v=((music[i+c]||0)*mg*duck+fx[i+c])*Math.max(0,fade);mix[i+c]=v;peak=Math.max(peak,Math.abs(v));squares+=v*v;}}
 const safety=Math.min(1,.85/peak);if(safety<1)for(let i=0;i<count;i++)mix[i]*=safety;
 const pcm=Buffer.from(mix.buffer),r=spawnSync('ffmpeg',['-v','error','-y','-f','f32le','-ar',String(rate),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','192k','-map_metadata','-1','-metadata','title=BorderLAN: '+m.title+' + game soundboard','-metadata','artist='+m.artist+' / BorderLAN soundboard mix',repo+'/projects/borderlan/'+m.name+'.mp3'],{input:pcm,maxBuffer:1024*1024});if(r.status!==0)throw Error(r.stderr.toString());
 console.log({name:m.name,seconds:mix.length/rate/channels,samples:m.sfx.length,peak:20*Math.log10(peak*safety),rms:20*Math.log10(Math.sqrt(squares/count)*safety),bytes:fs.statSync(repo+'/projects/borderlan/'+m.name+'.mp3').size});
}
