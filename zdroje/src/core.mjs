/** Deterministic, render-independent runner. Metres, seconds; forward = -Z.
 * Only the trunk is vulnerable. The tail is an animated, flexible appendage.
 * Obstacles use swept intervals, never intersection-enter events. */
export const LANE=2.35, STEP=1/120;
export const LIMITS={rollingWood:{rx:.55,z:.35,top:.55},rollingRock:{rx:.62,z:.66,top:.82},root:{rx:.7,z:.5,top:.44},pool:{rx:.8,z:1,top:.1},rock:{rx:.62,z:.66,top:.82},log:{rx:.91,z:.32,bottom:1.16,top:1.79},thorn:{rx:.64,z:.55,top:1.9},wood:{rx:.65,z:.6,top:1.26},snack:{rx:.37,z:.4,top:.56},amber:{rx:.34,z:.34},shield:{rx:.4,z:.4}};
/** Motion stays within its reserved lane; same coordinates drive collisions and rendering. */
export function obstacleX(o,time,dev={}){return o.lane*LANE+(['rollingWood','rollingRock'].includes(o.kind)&&dev?.moving!==false?Math.sin(time*1.6+o.id*2.4)*.35:0);}
export function seekRun(s,distance){const d=Math.max(0,Math.min(20000,Number(distance)||0));s.start();s.distance=s.world=d;s.nextAt=d+36;s.rows=6;s.milestone=(Math.floor(d/250)+1)*250;s.dev={...s.dev,enabled:true};s.practice=true;}
export function random(seed=0xD1905){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export function sweepInterval(a,b,min,max){if(Math.abs(b-a)<1e-10)return a>=min&&a<=max?[0,1]:null;const t0=(min-a)/(b-a),t1=(max-a)/(b-a),enter=Math.max(0,Math.min(t0,t1)),exit=Math.min(1,Math.max(t0,t1));return enter<=exit?[enter,exit]:null;}
function sweepContact(x0,x1,z0,z1,y0,y1,rx,hz,minY,maxY){let enter=0,exit=1;for(const interval of [sweepInterval(x0,x1,-rx,rx),sweepInterval(z0,z1,-hz,hz),sweepInterval(y0,y1,minY,maxY)]){if(!interval)return null;enter=Math.max(enter,interval[0]);exit=Math.min(exit,interval[1]);}return enter<=exit?enter:null;}
export const PACE={klid:{start:8.8,cap:16,acc:.012,interval:1.8},lov:{start:11,cap:23,acc:.019,interval:1.5},dravec:{start:13,cap:27,acc:.025,interval:1.32}};
export class Runner{
 constructor({seed=1,difficulty='lov',practice=false,onEvent=()=>{}}={}){this.rng=random(seed);this.difficulty=difficulty in PACE?difficulty:'lov';this.practice=practice;this.onEvent=onEvent;this.phase='menu';this.reset();this.phase='menu';}
 reset(){Object.assign(this,{x:0,lane:0,y:0,vy:0,grounded:true,duck:0,duckHold:false,duckMin:0,duckGrace:0,tailTuck:0,jumpBuffer:0,bite:0,biteCd:0,invincible:0,shield:0,score:0,distance:0,time:0,world:0,speed:0,combo:0,comboT:0,amber:0,chomps:0,dodges:0,nextAt:36,rows:0,objects:[],id:0,stumble:0,recover:false,hitSide:1,shake:0,flash:0,land:0,countdown:1.05,started:false,reason:'',milestone:250});}
 emit(type,data={}){this.onEvent({type,...data});}
 start(){this.reset();this.phase='ready';this.speed=(PACE[this.difficulty]||PACE.lov).start;this.emit('start');}
 pause(){if(this.phase==='playing'||this.phase==='ready'){this.beforePause=this.phase;this.phase='paused';this.duckHold=false;this.emit('pause');}}
 resume(){if(this.phase==='paused'){this.phase=this.beforePause||'playing';this.emit('resume');}}
 menu(){this.phase='menu';this.objects=[];this.duckHold=false;this.emit('menu');}
 command(cmd,on=true){if(this.phase!=='playing')return;if(cmd==='left'&&on)this.lane=Math.max(-1,this.lane-1);if(cmd==='right'&&on)this.lane=Math.min(1,this.lane+1);if(cmd==='jump'&&on)this.jumpBuffer=.16;if(cmd==='duck'){const was=this.duckHold;this.duckHold=on;if(on&&this.grounded){this.duckMin=.48;if(!was)this.emit('duck');}}if(cmd==='bite'&&on&&this.biteCd<=0){this.bite=.32;this.biteCd=.4;this.emit('bite');}}
 spawn(kind,lane,z,y){const o={id:++this.id,kind,lane,z,y:y??(kind==='amber'?1.0:kind==='shield'?1.06:0),active:true,passed:false,bend:0};this.objects.push(o);return o;}
 row(z=-100){const r=this.rng, n=this.rows++;let lane=Math.floor(r()*3)-1;
  if(n<6){const kind=['amber','rock','log','wood','snack','shield'][n];this.spawn(kind,[0,0,1,0,-1,0][n],z);return;}
  const q=r();if(q<.22){for(let j=0;j<3;j++)this.spawn('amber',lane,z-j*2,1.0);return;}
  if(q<.29){this.spawn('shield',lane,z);return;}
  const kinds=this.distance<150?['rock','log','wood','snack']:['rock','log','wood','thorn','snack',...(this.distance>=450?['root']:[]),...(this.distance>=900?['pool']:[]),...(this.distance>=1800?['rollingWood']:[]),...(this.distance>=3000?['rollingRock']:[])];
  this.spawn(kinds[Math.floor(r()*kinds.length)],lane,z);
  if(q>.72&&this.distance>180){const second=([-1,0,1].filter(x=>x!==lane))[Math.floor(r()*2)];this.spawn(kinds[Math.floor(r()*kinds.length)],second,z);}
  // At most 2 occupied lanes. Spacing is based on the maximum speed in view.
 }
 hit(o){if(this.phase!=='playing'||this.invincible>0)return;if(this.dev?.invulnerable){o.active=false;this.emit('protected',{o});return;}
  o.active=false;this.combo=0;this.comboT=0;this.hitSide=o.lane===0?(this.rng()<.5?-1:1):Math.sign(o.lane);this.shake=.25;this.flash=.25;
  if(this.shield){this.shield=0;this.invincible=1.25;this.emit('shieldBreak',{o});return;}
  this.phase='stumble';this.stumble=0;this.recover=this.practice;this.reason=o.kind==='log'?'Kmen byl příliš nízko. Zkus se přikrčit.':o.kind==='thorn'?'Trní raději oběhni.':o.kind==='wood'?'Suchou větev můžeš rozkousnout mezerníkem.':o.kind==='snack'?'Kořist rozkousni nebo přeskoč.':'Příště přeskočit nebo uhnout.';this.emit('hit',{o});
 }
 reward(base,text){this.combo=Math.min(8,this.combo+1);this.comboT=3.5;const gain=base*this.combo;this.score+=gain;this.emit('reward',{gain,text});}
 tick(dt=STEP){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.04);
  if(this.phase==='paused'||this.phase==='dead')return;
  this.time+=dt;this.shake=Math.max(0,this.shake-dt);this.flash=Math.max(0,this.flash-dt);this.land=Math.max(0,this.land-dt*4);
  if(this.phase==='menu'){this.world+=dt*1.5;return;}
  if(this.phase==='ready'){this.countdown-=dt;if(this.countdown<=0){this.phase='playing';this.emit('go');}return;}
  if(this.phase==='stumble'){this.stumble+=dt;this.world+=this.speed*dt*Math.max(0,1-this.stumble/.55)*.35;
   if(this.stumble>.72){if(this.recover){this.phase='playing';this.invincible=1.5;this.y=0;this.vy=0;this.grounded=true;this.emit('recover');}else{this.phase='dead';this.emit('end');}}return;}
  const pace=PACE[this.difficulty];this.speed=Number.isFinite(this.dev?.speed)?Math.max(4,Math.min(30,this.dev.speed)):Math.min(pace.cap,pace.start+this.distance*pace.acc);const travel=this.speed*dt;
  const oldX=this.x;const dx=this.lane*LANE-this.x;this.x+=Math.sign(dx)*Math.min(Math.abs(dx),18*dt);
  this.duckMin=Math.max(0,this.duckMin-dt);this.duckGrace=Math.max(0,this.duckGrace-dt);
  // A held crouch stays down; release waits for the entire tail to clear.
  let overhead=false;for(const o of this.objects)if(o.active&&o.kind==='log'&&Math.abs(this.x-o.lane*LANE)<1.12&&o.z>-2.9&&o.z<2.4)overhead=true;
  const duckWanted=this.grounded&&(this.duckHold||this.duckMin>0||this.duckGrace>0||(this.duck>.25&&overhead));
  this.duck+=(Number(duckWanted)-this.duck)*Math.min(1,dt*22);
  this.tailTuck+=(Number(duckWanted||overhead&&this.duck>.1)-this.tailTuck)*Math.min(1,dt*16);
  if(this.jumpBuffer>0){this.jumpBuffer-=dt;if(this.grounded){this.vy=9.0;this.grounded=false;this.jumpBuffer=0;this.duckMin=0;this.duckGrace=0;this.emit('jump');}}
  const oldY=this.y;this.vy-=25*dt;this.y+=this.vy*dt;
  if(this.y<=0){if(!this.grounded){this.land=1;this.emit('land');}this.y=0;this.vy=0;this.grounded=true;}
  this.bite=Math.max(0,this.bite-dt);this.biteCd=Math.max(0,this.biteCd-dt);this.invincible=Math.max(0,this.invincible-dt);
  this.distance+=travel;this.world+=travel;this.score+=travel*5;this.comboT-=dt;if(this.comboT<=0)this.combo=0;
  // Generate 100 m ahead, with a reaction interval that still holds at the cap.
  while(this.nextAt<this.distance+100){if(this.dev?.obstacles!==false)this.row(-(this.nextAt-this.distance)-travel);this.nextAt+=Math.max(17,pace.cap*pace.interval);}
  for(const o of this.objects){if(!o.active)continue;const oldZ=o.z;o.z+=travel;
   const sh=LIMITS[o.kind];
   const biteLane=Math.abs(this.x-o.lane*LANE)<sh.rx+.45;
   if((o.kind==='wood'||o.kind==='snack')&&this.bite>.02&&biteLane&&oldZ<.45&&o.z>-3.0&&this.y<.75){o.active=false;this.chomps++;this.reward(o.kind==='wood'?60:50,o.kind==='wood'?'Křup!':'Kořist');this.emit('break',{o});continue;}
   const hz=sh.z+.35,rx=sh.rx+.3,x0=oldX-obstacleX(o,this.time-dt,this.dev),x1=this.x-obstacleX(o,this.time,this.dev);
   if(o.kind==='amber'||o.kind==='shield'){
    const center=this.duck>.4?.45:.88;
    const contact=sweepContact(x0,x1,oldZ,o.z,oldY+center,this.y+center,rx,hz,o.y-.83,o.y+.83);
    if(contact!==null){o.active=false;if(o.kind==='amber'){this.amber++;this.reward(30,'Jantar');this.emit('amber');}else{this.shield=1;this.emit('shield');}continue;}
   }else if(o.kind==='pool'){if(sweepContact(x0,x1,oldZ,o.z,oldY,this.y,rx,hz,-100,.22)!==null&&!o.splashed){o.splashed=true;this.combo=0;this.comboT=0;this.emit('splash',{o});}
   }else if(o.kind==='log'){
    const contact=sweepContact(x0,x1,oldZ,o.z,oldY,this.y,rx,hz,sh.bottom-1.43,sh.top-.25);
    if(contact!==null){if(this.duck>.24&&this.grounded){o.bend=1;this.duckGrace=.22;if(!o.brushed){o.brushed=true;this.emit('brush',{o});}}else this.hit(o);}
   }else if(sweepContact(x0,x1,oldZ,o.z,oldY,this.y,rx,hz,-100,sh.top-.16)!==null)this.hit(o);
   if(o.z>1.4&&!o.passed){o.passed=true;if(!['amber','shield'].includes(o.kind)&&!(o.kind==='pool'&&o.splashed)){if(Math.abs(this.x-o.lane*LANE)<1.2){this.dodges++;this.reward(10,o.kind==='log'?'Podlez!':'Hop!');}else this.score+=5;}}
   if(o.z>9)o.active=false;
   if(this.phase!=='playing')break;
  }
  this.objects=this.objects.filter(o=>o.active||o.z<9&&o.bend>0);if(this.objects.length>80)this.objects=this.objects.slice(-80);
  if(this.distance>=this.milestone){this.emit('milestone',{distance:this.milestone});this.milestone+=250;}
 }
}
