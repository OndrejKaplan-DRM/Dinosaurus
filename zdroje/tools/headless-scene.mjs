/** Geometry inspection only. This does not pretend to be a WebGL browser. */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let canvas;
try{canvas=require('@napi-rs/canvas');}catch{canvas=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
export const {createCanvas,loadImage}=canvas;
globalThis.document={createElement:()=>createCanvas(64,64)};globalThis.ProgressEvent=class{};
export async function loadModel(){const b=await readFile(new URL('../public/models/raptor.glb',import.meta.url));const len=b.readUInt32LE(12);const j=JSON.parse(b.subarray(20,20+len));const bv=j.bufferViews[j.images[0].bufferView],sourceImage=b.subarray(28+len+(bv.byteOffset||0),28+len+(bv.byteOffset||0)+bv.byteLength);for(const m of j.materials){delete m.emissiveTexture;delete m.emissiveFactor;delete m.extensions;if(m.pbrMetallicRoughness)delete m.pbrMetallicRoughness.baseColorTexture;}delete j.textures;delete j.images;
 const raw=Buffer.from(JSON.stringify(j)),pad=(4-raw.length%4)%4,json=Buffer.concat([raw,Buffer.alloc(pad,32)]),bin=b.subarray(20+len);const out=Buffer.alloc(20);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(20+json.length+bin.length,8);out.writeUInt32LE(json.length,12);out.writeUInt32LE(0x4e4f534a,16);const all=Buffer.concat([out,json,bin]);
 const gltf=await new Promise((ok,no)=>new GLTFLoader().parse(all.buffer.slice(all.byteOffset,all.byteOffset+all.byteLength),'',ok,no));
 const map=new T.Texture(await loadImage(sourceImage));map.flipY=false;map.colorSpace=T.SRGBColorSpace;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)o.material=new T.MeshStandardMaterial({map,color:0xffffff,roughness:.82});});return gltf;
}
export async function loadTextures(){const out={};for(const key of ['ground','wood','rock']){out[key]=new T.Texture(await loadImage(new URL('../public/textures/'+key+'.jpg',import.meta.url).pathname));out[key].colorSpace=T.SRGBColorSpace;}return out;}
