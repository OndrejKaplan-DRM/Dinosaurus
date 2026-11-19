"""Small original CC0 procedural score; no downloaded/generated commercial songs."""
from pathlib import Path
import numpy as np, wave, subprocess, json
RATE=24000
OUT=Path(__file__).resolve().parents[1]/'public'/'music';OUT.mkdir(exist_ok=True)
rng=np.random.default_rng(1905)
TRACKS=[('menu_a',82,0,.2),('menu_b',78,3,.16),('start',104,0,.5),('run_a',110,0,.65),('run_b',114,5,.62),('rush',136,7,1),('shield',118,2,.75),('pause',68,0,.04)]
def freq(n):return 440*2**((n-69)/12)
for idx,(name,bpm,transpose,energy) in enumerate(TRACKS):
 beat=60/bpm;dur=beat*64;n=int(dur*RATE);out=np.zeros((n,2),np.float64)
 def add(sound,when,vol=.2,pan=0):
  start=int(when*RATE);stop=min(n,start+len(sound))
  if start>=n:return
  l=np.sqrt((1-pan)*.5);r=np.sqrt((1+pan)*.5);out[start:stop,0]+=sound[:stop-start]*vol*l;out[start:stop,1]+=sound[:stop-start]*vol*r
 def tone(note,length,kind='bell'):
  t=np.arange(int(length*RATE))/RATE;f=freq(note+transpose)
  if kind=='bell':return (np.sin(2*np.pi*f*t)*np.exp(-t*3.8)+.25*np.sin(2*np.pi*f*2.002*t)*np.exp(-t*7)+.08*np.sin(2*np.pi*f*3*t)*np.exp(-t*12))*(1-np.exp(-t*180))
  if kind=='bass':return (np.sin(2*np.pi*f*t)+.12*np.sin(2*np.pi*f*2*t))*np.exp(-t*2.8)*(1-np.exp(-t*90))
  env=np.minimum(1,t/.5)*np.minimum(1,(length-t)/.8)
  return .5*(np.sin(2*np.pi*f*t)+.22*np.sin(2*np.pi*f*2*t))*env
 chords=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,60]]
 motif=[74,77,81,79,77,74,72,69,72,74,77,79,81,77,74,72]
 for bar in range(16):
  chord=chords[(bar//2+idx%2)%4]
  for j,note in enumerate(chord):add(tone(note,beat*4.5,'pad'),bar*4*beat,.055,(-1 if j%2 else 1)*.4)
  for b in range(4):
   when=(bar*4+b)*beat
   if name!='pause':
    add(tone(chord[0]-12,beat*.9,'bass'),when,.11+energy*.04)
    if b%2==0 or energy>.6:
     t=np.arange(int(.24*RATE))/RATE;kick=np.sin(2*np.pi*(48*t+60*.05*(1-np.exp(-t/.05))))*np.exp(-t*20);add(kick,when,.18*energy)
   if b%2==0 or energy>.45:
    note=motif[(bar*2+b//2+idx*3)%len(motif)];add(tone(note,beat*1.7),when+.012*np.sin(bar+b),.12 if name!='pause' else .06,np.sin(bar+b)*.5)
   if energy>.3:
    for half in range(2):
     if rng.random()<.18:continue
     t=np.arange(int(.08*RATE))/RATE;noise=rng.normal(0,1,len(t));noise=np.r_[0,np.diff(noise)]*np.exp(-t*65);add(noise,when+half*beat*.5,.013*energy,(-1 if half else 1)*.5)
 # Quiet stereo echo, stable gain and a fade at both boundaries.
 delay=int(beat*.75*RATE);out[delay:]+=out[:-delay,::-1]*.15
 fade=int(.12*RATE);out[:fade]*=np.linspace(0,1,fade)[:,None];out[-fade:]*=np.linspace(1,0,fade)[:,None]
 peak=np.max(np.abs(out));rms=np.sqrt(np.mean(out*out));target=.06 if name=='pause' else .105;out*=min(.78/max(peak,1e-6),target/max(rms,1e-6))
 wav=OUT/(name+'.wav')
 with wave.open(str(wav),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes((np.clip(out,-1,1)*32767).astype('<i2').tobytes())
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-c:a','libvorbis','-q:a','4',str(OUT/(name+'.ogg'))],check=True);wav.unlink()
 print(name,round(dur,2),'seconds',flush=True)
