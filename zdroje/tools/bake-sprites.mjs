/** Bake the supplied, textured GLB to a lossless animated fallback atlas.
 * Exact mesh projection with a z buffer; no AI-created replacement character. */
import * as T from 'three';
import {writeFile,mkdir}from'node:fs/promises';
import {createCanvas,loadModel}from'./headless-scene.mjs';
import {Raptor}from'../src/raptor.mjs';import{Runner,STEP}from'../src/core.mjs';
const SIZE=320,COLS=10,plans=[];
for(let yaw=0;yaw<8;yaw++)for(let f=0;f<8;f++)plans.push({pose:'run',yaw:yaw*Math.PI/4,time:f/8});
for(let i=0;i<6;i++)plans.push({pose:'duck',yaw:Math.PI,time:i/6});
for(let i=0;i<8;i++)plans.push({pose:'jump',yaw:Math.PI,time:i/8});
for(let i=0;i<10;i++)plans.push({pose:'stumble',yaw:Math.PI,time:i/10*.72});
const gltf=await loadModel(),p=new Raptor(gltf),state=new Runner(),atlas=createCanvas(COLS*SIZE,Math.ceil(plans.length/COLS)*SIZE),atlasCtx=atlas.getContext('2d');
const image=gltf.scene.getObjectByProperty('isSkinnedMesh',true).material.map.image,tc=createCanvas(image.width,image.height),tctx=tc.getContext('2d');tctx.drawImage(image,0,0);const tex=tctx.getImageData(0,0,image.width,image.height).data,tw=image.width,th=image.height;
const camera=new T.OrthographicCamera(-2,2,2,-2,.1,30);camera.position.set(0,2.2,7);camera.lookAt(0,.8,0);camera.updateMatrixWorld();const vp=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),light=new T.Vector3(-.5,1,.7).normalize();
const ground=new T.Vector3().applyMatrix4(vp),anchor=[(ground.x*.5+.5)*SIZE,(.5-ground.y*.5)*SIZE];
const mesh=p.scene.getObjectByProperty('isSkinnedMesh',true),pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,index=mesh.geometry.index,count=index?index.count:pos.count;
const point=new T.Vector3(),normal=new T.Vector3();
function render(){p.root.updateMatrixWorld(true);mesh.skeleton.update();const screen=new Float32Array(pos.count*3),world=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){mesh.getVertexPosition(i,point);mesh.localToWorld(point);world[i*3]=point.x;world[i*3+1]=point.y;world[i*3+2]=point.z;point.applyMatrix4(vp);screen[i*3]=(point.x*.5+.5)*SIZE;screen[i*3+1]=(.5-point.y*.5)*SIZE;screen[i*3+2]=point.z;}
 const data=new Uint8ClampedArray(SIZE*SIZE*4),depth=new Float32Array(SIZE*SIZE).fill(Infinity);
 for(let t=0;t<count;t+=3){const ia=index?index.getX(t):t,ib=index?index.getX(t+1):t+1,ic=index?index.getX(t+2):t+2;const ax=screen[ia*3],ay=screen[ia*3+1],az=screen[ia*3+2],bx=screen[ib*3],by=screen[ib*3+1],bz=screen[ib*3+2],cx=screen[ic*3],cy=screen[ic*3+1],cz=screen[ic*3+2];const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<.003)continue;const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(SIZE-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(SIZE-1,Math.ceil(Math.max(ay,by,cy)));
  const ux=world[ib*3]-world[ia*3],uy=world[ib*3+1]-world[ia*3+1],uz=world[ib*3+2]-world[ia*3+2],vx=world[ic*3]-world[ia*3],vy=world[ic*3+1]-world[ia*3+1],vz=world[ic*3+2]-world[ia*3+2];normal.set(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx).normalize();const shade=.78+Math.max(0,normal.dot(light))*.36;
  const au=uv.getX(ia),av=uv.getY(ia),bu=uv.getX(ib),bv=uv.getY(ib),cu=uv.getX(ic),cv=uv.getY(ic);
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const a=((bx-x)*(cy-y)-(by-y)*(cx-x))/area,b=((cx-x)*(ay-y)-(cy-y)*(ax-x))/area,c=1-a-b;if(a<0||b<0||c<0)continue;const z=a*az+b*bz+c*cz,k=y*SIZE+x;if(z>=depth[k])continue;depth[k]=z;const u=a*au+b*bu+c*cu,v=a*av+b*bv+c*cv,ti=(Math.min(th-1,Math.max(0,Math.floor(v*th)))*tw+Math.min(tw-1,Math.max(0,Math.floor(u*tw))))*4,di=k*4;data[di]=tex[ti]*shade;data[di+1]=tex[ti+1]*shade;data[di+2]=tex[ti+2]*shade;data[di+3]=255;}
 }
 const canvas=createCanvas(SIZE,SIZE),ctx=canvas.getContext('2d'),out=ctx.createImageData(SIZE,SIZE);out.data.set(data);ctx.putImageData(out,0,0);return canvas;
}
for(let i=0;i<plans.length;i++){const plan=plans[i];Object.assign(state,{phase:'playing',x:0,y:0,vy:0,land:0,speed:11,world:0,grounded:true,duck:0,tailTuck:0,bite:0});p.root.rotation.set(0,Math.PI,0);p.root.position.set(0,0,0);p.root.scale.set(1,1,1);p.crouch=0;p.duckAction.setEffectiveWeight(0);p.action.time=plan.time;
 if(plan.pose==='duck'){state.duck=state.tailTuck=1;state.world=plan.time*4.2;p.crouch=1;}
 if(plan.pose==='jump'){state.grounded=false;state.y=1;state.vy=4-plan.time*8;}
 if(plan.pose==='stumble'){state.phase='stumble';state.stumble=plan.time;state.hitSide=1;p.action.time=.32;}
 p.update(STEP,state);if(plan.pose==='jump')p.root.position.y-=1;p.root.rotation.y=plan.yaw;
 atlasCtx.drawImage(render(),i%COLS*SIZE,Math.floor(i/COLS)*SIZE);
 if(i%16===0)console.log('Baked',i,'/',plans.length);
}
await mkdir(new URL('../public/fallback/',import.meta.url),{recursive:true});await writeFile(new URL('../public/fallback/raptor-atlas.webp',import.meta.url),atlas.toBuffer('image/webp',90));
await writeFile(new URL('../public/fallback/raptor-atlas.json',import.meta.url),JSON.stringify({size:SIZE,cols:COLS,count:plans.length,anchor,worldSize:4,run:{start:0,frames:8,views:8},duck:{start:64,frames:6},jump:{start:70,frames:8},stumble:{start:78,frames:10}},null,2));console.log('Done:',plans.length,'frames');
