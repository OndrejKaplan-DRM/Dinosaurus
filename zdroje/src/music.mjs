export const TRACKS={menu_a:'Night Menu · I',menu_b:'Night Menu · II',grove_a:'Lazy Prehistoric Grove · I',grove_b:'Lazy Prehistoric Grove · II',run_a:'Agile Exploration · I',run_b:'Agile Exploration · II',run_c:'Agile Exploration · III',run_d:'Agile Exploration · IV'};
const run=['run_a','run_b','run_c','run_d','grove_a','grove_b'];
export const PLAYLISTS={menu:['menu_a','menu_b','grove_a','grove_b'],grove:run,start:run,run,rush:run,shield:run,pause:['grove_a','grove_b'],peril:['grove_a','grove_b']};
/** One music voice. Fade OUT finishes before the next source is connected.
 * Audio-clock deadlines survive slow frames; a new cue never extends a stop.
 * Random 60–95 second excerpts, shuffled without repetition. No overlapping music. */
export class MusicPlayer{
 constructor(ctx,bus,getBuffer,{rng=Math.random}={}){this.rng=rng;this.ctx=ctx;this.bus=bus;this.getBuffer=getBuffer;this.cue='menu';this.current=null;this.last='';this.starts=0;this.history=[];this.skipRequested=false;this.played=new Set();}
 request(cue){if(PLAYLISTS[cue])this.cue=cue;}
 disposeVoice(voice){if(!voice)return;voice.source.onended=null;try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();if(this.current===voice)this.current=null;}
 choose(name){if(TRACKS[name]){if(this.current?.name===name&&!this.current.fading){this.current.manual=true;this.requested=null;this.skipRequested=false;return;}this.requested=name;this.skipRequested=true;}}
 next(){this.requested=null;this.skipRequested=true;}
 update(){
  const now=this.ctx.currentTime,pool=this.requested?[this.requested]:PLAYLISTS[this.cue],v=this.current;
  if(v){
   if(now>=v.stopAt){this.disposeVoice(v);}
   else if((this.skipRequested||(!pool.includes(v.name)&&!v.manual&&!['pause','peril'].includes(this.cue)))&&!v.fading){
    // Wait for the requested cue to decode before fading the old one.
    if(!pool.some(n=>(!this.skipRequested||n!==v.name)&&this.getBuffer(n)))return;
    v.fading=true;this.skipRequested=false;v.stopAt=Math.min(v.stopAt,now+.65);
    const p=v.gain.gain;
    if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(now);
    else{p.cancelScheduledValues(now);p.setValueAtTime(v.level*Math.min(1,(now-v.started)/1.2),now);}
    p.linearRampToValueAtTime(0,v.stopAt);v.source.stop(v.stopAt);
    return;
   }else return;
  }
  let candidates=pool.filter(n=>!this.history.includes(n)&&this.getBuffer(n));
  if(!candidates.length){this.history=this.history.filter(n=>!pool.includes(n));candidates=pool.filter(n=>n!==this.last&&this.getBuffer(n));}
  if(!candidates.length)candidates=pool.filter(n=>this.getBuffer(n));
  if(!candidates.length)return;
  const manual=Boolean(this.requested);const name=candidates[Math.floor(this.rng()*candidates.length)],buffer=this.getBuffer(name);
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),duration=Math.min(buffer.duration,this.excerptSeconds||60+this.rng()*35);this.requested=null;
  const offset=this.played.has(name)?this.rng()*Math.max(0,buffer.duration-duration):0;this.played.add(name);const level=.8,fade=Math.min(1.2,duration/4);
  source.buffer=buffer;source.loop=false;source.connect(gain);gain.connect(this.bus);
  gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+fade);
  gain.gain.setValueAtTime(level,now+Math.max(fade,duration-fade));gain.gain.linearRampToValueAtTime(0,now+duration);
  const voice={name,manual,source,gain,started:now,stopAt:now+duration,level,fading:false};
  source.onended=()=>this.disposeVoice(voice);
  this.skipRequested=false;this.current=voice;this.last=name;this.history.push(name);this.starts++;source.start(now,offset);source.stop(voice.stopAt);
 }
 get song(){return this.current?.name||'';}
 get activeCount(){return this.current&&this.ctx.currentTime<this.current.stopAt?1:0;}
}
