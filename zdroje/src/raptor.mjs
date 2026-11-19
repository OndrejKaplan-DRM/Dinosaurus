import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
const v=new T.Vector3(),q=new T.Quaternion(),parentQ=new T.Quaternion(),axis=new T.Vector3();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Overlay poses always start with the animation's current pose; no accumulating rotations. */
export class Raptor{
 constructor(gltf,{height=1.68,tint=0xffffff,offset=0}={}){
  this.root=new T.Group();this.fit=new T.Group();this.root.add(this.fit);this.scene=clone(gltf.scene);this.fit.add(this.scene);this.height=height;
  this.bones={};this.rest=new Map();this.scene.traverse(o=>{if(o.isBone){this.bones[o.name]=o;this.rest.set(o,o.quaternion.clone());}if(o.isSkinnedMesh){o.frustumCulled=false;o.castShadow=true;const src=o.material;this.material=new T.MeshStandardMaterial({map:src.map||src.emissiveMap,color:tint,roughness:.82,metalness:0,side:T.DoubleSide});o.material=this.material;}});
  this.mixer=new T.AnimationMixer(this.scene);this.action=this.mixer.clipAction(gltf.animations[0]);this.action.play();this.action.time=offset;
  const duckClip=gltf.animations[0].clone();duckClip.name='Crouch reference';this.duckAction=this.mixer.clipAction(duckClip);this.duckAction.play();this.duckAction.time=.32;this.duckAction.paused=true;this.duckAction.setEffectiveWeight(0);
  this.mixer.update(0);this.scene.updateMatrixWorld(true);
  const box=new T.Box3();this.scene.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();const a=o.geometry.attributes.position;for(let i=0;i<a.count;i+=4){o.getVertexPosition(i,v);o.localToWorld(v);box.expandByPoint(v);}});
  const size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3()),scale=height/size.y;
  this.fit.scale.setScalar(scale);this.fit.position.set(-c.x*scale,-box.min.y*scale,-c.z*scale);this.baseY=this.fit.position.y;this.crouch=0;this.lastX=0;
  this.basePose=[];this.scene.traverse(o=>{if(o.isBone)this.basePose.push({bone:o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
  this.footSamples=[];this.scene.traverse(o=>{if(!o.isSkinnedMesh)return;const ids=o.geometry.attributes.skinIndex,weights=o.geometry.attributes.skinWeight,candidates=[];for(let i=0;i<ids.count;i+=2){for(let k=0;k<4;k++){const name=o.skeleton.bones[ids.getComponent(i,k)]?.name;if(['backleg2','R_backleg2'].includes(name)&&weights.getComponent(i,k)>.25){candidates.push(i);break;}}}const stride=Math.max(1,Math.floor(candidates.length/256));this.footSamples.push({mesh:o,indices:candidates.filter((_,i)=>i%stride===0)});});
 }
 worldRotate(name,wx,wy,wz,angle){const b=this.bones[name];if(!b||Math.abs(angle)<1e-4)return;b.parent.getWorldQuaternion(parentQ);axis.set(wx,wy,wz).applyQuaternion(parentQ.invert()).normalize();q.setFromAxisAngle(axis,angle);b.quaternion.premultiply(q);b.updateWorldMatrix(false,true);}
 update(dt,s,{wild=false,speed=1}={}){
  // Mixer re-evaluates every animated channel before each procedural layer.
  const frozen=!wild&&['paused','dead'].includes(s.phase);if(frozen)return;
  const fail=!wild&&s.phase==='stumble';const air=!wild&&!s.grounded;
  const want=wild?0:s.duck;this.crouch+=(want-this.crouch)*Math.min(1,dt*20);
  this.action.timeScale=wild?speed:fail?.45:air?.55:s.phase==='ready'?.55:.85+s.speed*.052;
  this.action.setEffectiveWeight(1-this.crouch);this.duckAction.setEffectiveWeight(this.crouch);
  // Three's mixer skips writes for constant tracks. Restore the last clean
  // animation pose explicitly before evaluating, then cache it before overlays.
  for(const b of this.basePose){b.bone.position.copy(b.p);b.bone.quaternion.copy(b.q);b.bone.scale.copy(b.s);}
  this.mixer.update(dt);
  for(const b of this.basePose){b.p.copy(b.bone.position);b.q.copy(b.bone.quaternion);b.s.copy(b.bone.scale);}
  this.scene.updateWorldMatrix(true,true);
  if(wild){this.plantFeet(this.root.position.y);return;}
  const c=this.crouch,bite=s.bite/.32,tuck=s.tailTuck;
  // Fold knees, lower the hips, keep the head looking forward.
  this.worldRotate('backleg',1,0,0,-c*.15);this.worldRotate('backleg1',1,0,0,c*.05);
  this.worldRotate('R_backleg',1,0,0,-c*.15);this.worldRotate('R_backleg1',1,0,0,c*.05);
  // Compact alternating steps under a stable crouched torso. Phase is travelled
  // distance, so a held crouch keeps moving and a pause freezes the same pose.
  if(c>0&&!air&&!fail){const phase=(s.world||0)/4.2*Math.PI*2;for(const [prefix,offset]of[['',0],['R_',Math.PI]]){const swing=Math.sin(phase+offset),lift=Math.max(0,Math.cos(phase+offset));this.worldRotate(prefix+'backleg',1,0,0,c*.38*swing);this.worldRotate(prefix+'backleg1',1,0,0,-c*.4*lift);this.worldRotate(prefix+'backleg2',1,0,0,c*(.15*lift-.12*swing));}}
  this.worldRotate('chest',1,0,0,-c*.23+air*-.12);
  this.worldRotate('head',1,0,0,c*.2-bite*.32);
  this.worldRotate('headend',1,0,0,bite*.18);
  // Tail arcs down instead of remaining a rigid lever behind the animal.
  for(const [i,name] of ['tail','tailstart','tail1','tail2','tail3'].entries())this.worldRotate(name,1,0,0,tuck*(.12+i*.025));
  if(air){const fold=clamp(s.y/1.2,0,1);this.worldRotate('backleg',1,0,0,.32*fold);this.worldRotate('R_backleg',1,0,0,.32*fold);this.worldRotate('backleg1',1,0,0,-.55*fold);this.worldRotate('R_backleg1',1,0,0,-.55*fold);}
  const vx=dt>0?(s.x-this.lastX)/dt:0;this.lastX=s.x;
  this.root.position.set(s.x,s.y,0);this.root.scale.set(1,1,1);this.root.rotation.set(-.1*c+clamp(s.vy/25,-.2,.25),Math.PI-clamp(vx*.01,-.15,.15),clamp(-vx*.014,-.13,.13));
  // A compact sideways catch, 720 ms, feet under the centre of mass. Never a backflip.
  if(fail){const t=clamp(s.stumble/.72,0,1),pulse=Math.sin(Math.PI*t);this.root.position.x+=s.hitSide*.42*pulse;this.root.position.y=Math.max(0,s.y*(1-t))+.12*Math.sin(t*Math.PI*2)-.08*pulse;this.root.position.z=.5*Math.sin(t*Math.PI*.5);this.root.rotation.set(-.35*pulse,Math.PI+s.hitSide*.3*pulse,s.hitSide*.38*pulse);this.worldRotate('head',1,0,0,.35*pulse);this.worldRotate('tail',0,1,0,-s.hitSide*.3*pulse);}
  this.fit.position.y=this.baseY-.37*c-.08*s.land;
  // Mild squash on the landing root, never on the entire model in the air.
  this.root.scale.y=1-.16*c-.045*s.land;this.root.scale.x=1+.02*s.land;
  this.plantFeet(Math.max(0,s.y));
 }
 plantFeet(ground){this.root.updateMatrixWorld(true);let low=Infinity;for(const sample of this.footSamples){sample.mesh.skeleton.update();for(const i of sample.indices){sample.mesh.getVertexPosition(i,v);sample.mesh.localToWorld(v);low=Math.min(low,v.y);}}if(Number.isFinite(low))this.root.position.y+=ground-low+.015;this.root.updateMatrixWorld(true);}
}
