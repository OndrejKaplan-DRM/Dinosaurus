import { readFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// Geometry and animation only. Production loads the unmodified, textured GLB.
export async function loadTestModel() {
  const b = await readFile(new URL('../public/models/raptor.glb', import.meta.url)),
    n = b.readUInt32LE(12),
    j = JSON.parse(b.subarray(20, 20 + n));
  for (const m of j.materials) {
    delete m.emissiveTexture;
    delete m.emissiveFactor;
    delete m.extensions;
    if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.baseColorTexture;
  }
  delete j.images;
  delete j.textures;
  const raw = Buffer.from(JSON.stringify(j)),
    json = Buffer.concat([raw, Buffer.alloc((4 - (raw.length % 4)) % 4, 32)]),
    bin = b.subarray(20 + n),
    h = Buffer.alloc(20);
  h.writeUInt32LE(0x46546c67, 0);
  h.writeUInt32LE(2, 4);
  h.writeUInt32LE(20 + json.length + bin.length, 8);
  h.writeUInt32LE(json.length, 12);
  h.writeUInt32LE(0x4e4f534a, 16);
  const out = Buffer.concat([h, json, bin]);
  return new Promise((ok, no) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength), '', ok, no));
}
