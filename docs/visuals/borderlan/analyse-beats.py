# Requires FFmpeg, NumPy and SciPy. Reads the source recordings without modifying them.
import json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy import signal

repo = Path(__file__).resolve().parents[3]
root = (Path(sys.argv[1]) if len(sys.argv) > 1 else repo.parent / 'borderlan/conductor/public') / 'music'
output = Path(sys.argv[2]) if len(sys.argv) > 2 else Path('/tmp/borderlan-beats')
output.mkdir(parents=True, exist_ok=True)
settings=[('sandstorm','Darude - Sandstorm.mp3',170),('kernkraft','Zombie Nation - Kernkraft 400.mp3',75),('9pm','ATB - 9PM (Till I Come).mp3',75)]
for key,name,start in settings:
    sr=22050;hop=110;hz=sr/hop
    pcm=subprocess.run(['ffmpeg','-v','error','-ss',str(start),'-t','94','-i',str(root/name),'-ac','1','-ar',str(sr),'-f','f32le','pipe:1'],capture_output=True,check=True).stdout
    audio=np.frombuffer(pcm,dtype='<f4')
    low=signal.sosfilt(signal.butter(3,[35,130],btype='bandpass',fs=sr,output='sos'),audio)
    n=len(audio)//hop;t=np.arange(n)/hz
    env=np.sqrt(np.mean(low[:n*hop].reshape(n,hop)**2,axis=1))
    f,p=signal.periodogram(signal.detrend(env),fs=hz,nfft=262144)
    candidates=np.flatnonzero((f*60>125)&(f*60<145));index=candidates[np.argmax(p[candidates])]
    bpm=float(f[index]*60);period=60/bpm
    z=np.sum((env-env.mean())*np.exp(2j*np.pi*t/period))
    phase=float((np.angle(z)/(2*np.pi)*period)%period)
    peaks,_=signal.find_peaks(env,distance=int(period*hz*.65),prominence=np.std(env)*.12)
    grid=[];corrections=[];strength=[]
    for expected in np.arange(phase,92,period):
        nearby=peaks[abs(t[peaks]-expected)<period*.22]
        if len(nearby):
            peak=int(nearby[np.argmax(env[nearby])]);left=max(0,peak-int(.085*hz))
            # The steepest rising edge marks the audible kick attack, before
            # the low-frequency RMS maximum. Compensate for filter delay.
            slope=np.diff(env[left:peak+1]);attack=left+int(np.argmax(slope))
            measured=max(0,float(t[attack]-.006));power=float(env[peak])
            predicted=float(expected-.035)
            actual=measured if abs(measured-predicted)<=.03 else predicted
        else:
            actual=float(expected-.035);power=0
        if not grid or actual-grid[-1]>.2:
            grid.append(actual);corrections.append(actual-(expected-.035));strength.append(power)
    origin=grid[0];beats=[round(v-origin,5) for v in grid if v-origin<91]
    result={'music':name,'start':round(start+origin,5),'duration':90,'bpm':round(bpm,5),'beats':beats,'method':'Low-frequency RMS pulse spectrum with a steady quarter-note grid, refined to nearby kick attacks within 30 ms at 5 ms resolution; grid preserved through breaks.'}
    (output / (key+'-grid.json')).write_text(json.dumps(result))
    print(key,'bpm',round(bpm,3),'start',result['start'],'beats',len(beats),'median beat spacing',round(float(np.median(np.diff(beats))),4),'median local adjustment ms',round(float(np.median(np.abs(corrections))*1000),1))
    print('first beats',beats[:12])
