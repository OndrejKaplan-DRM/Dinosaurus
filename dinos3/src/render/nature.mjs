import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { createNatureLayout, sampleProp, WILDLIFE, sampleAnimal, POND_OUTLINE } from '../game/nature-layout.mjs';
import { route } from '../game/environment.mjs';
/** Komprimované modely mají polohy a normály jako normalizovaná celá čísla. Před přepočtem
 * do souřadnic světa je převedeme na desetinná, jinak by se hodnoty mimo rozsah ořízly. */
export function toFloatAttributes(geo) {
  for (const name of ['position', 'normal']) {
    const a = geo.attributes[name];
    if (!a || a.array instanceof Float32Array) continue;
    const out = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
    geo.setAttribute(name, new T.BufferAttribute(out, a.itemSize));
  }
  return geo;
}
export class NatureBank {
  constructor() {
    this.models = new Map();
  }
  async load(asset) {
    this.manifest = await fetch(asset('nature/manifest.json')).then((r) => r.json());
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    let index = 0;
    await Promise.all(
      Array.from({ length: 5 }, async () => {
        while (index < this.manifest.length) {
          const m = this.manifest[index++],
            g = await loader.loadAsync(asset('nature/' + m.id + '.glb'));
          g.scene.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              if (o.isSkinnedMesh) o.frustumCulled = false;
              for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
                mat.roughness = 0.9;
                mat.metalness = 0;
              }
            }
          });
          this.models.set(m.id, { ...g, meta: m });
        }
      }),
    );
    return this;
  }
}
export class NatureWorld {
  constructor(scene, bank) {
    this.bank = bank;
    this.root = new T.Group();
    this.root.name = 'Imported_CC0_Nature';
    scene.add(this.root);
    this.layout = createNatureLayout(bank.manifest);
    this.batches = [];
    this.animals = [];
    this.dummy = new T.Object3D();
    const byModel = new Map();
    for (const p of this.layout) {
      if (!byModel.has(p.model)) byModel.set(p.model, []);
      byModel.get(p.model).push(p);
    }
    for (const [id, entries] of byModel) {
      const src = bank.models.get(id).scene;
      src.updateMatrixWorld(true);
      src.traverse((o) => {
        if (!o.isMesh) return;
        const geo = o.geometry.clone();
        toFloatAttributes(geo);
        geo.applyMatrix4(o.matrixWorld);
        const mesh = new T.InstancedMesh(geo, o.material, entries.length);
        mesh.frustumCulled = false;
        mesh.castShadow = !['fern', 'flower', 'fungus', 'understory'].includes(entries[0].group);
        mesh.receiveShadow = true;
        mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
        this.root.add(mesh);
        this.batches.push({ mesh, entries });
      });
    }
    for (const [aIndex, a] of WILDLIFE.entries()) {
      const src = bank.models.get(a.model),
        body = clone(src.scene),
        g = new T.Group();
      g.add(body);
      g.scale.setScalar(a.scale);
      this.root.add(g);
      const mixer = new T.AnimationMixer(body),
        actions = {};
      for (const mode of ['idle', 'walk']) {
        const clip =
          src.animations.find((c) => c.name.toLowerCase().includes(mode)) ||
          src.animations.find((c) => /flying/i.test(c.name)) ||
          src.animations[0];
        if (clip) actions[mode] = mixer.clipAction(clip);
      }
      this.animals.push({ a, aIndex, g, body, mixer, actions, mode: null });
    }
    this.ponds = [];
    for (let i = 0; i < 5; i++) {
      const shape = new T.Shape();
      POND_OUTLINE.forEach(([x, y], j) => (j ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      shape.closePath();
      const p = new T.Mesh(
        new T.ShapeGeometry(shape),
        new T.MeshStandardMaterial({
          color: 0x427e73,
          roughness: 0.18,
          metalness: 0.25,
          transparent: true,
          opacity: 0.88,
          side: T.DoubleSide,
        }),
      );
      p.rotation.x = -Math.PI / 2;
      this.root.add(p);
      this.ponds.push({ mesh: p, x: i % 2 ? 10 : -10, offset: 18 + i * 34 });
    }
  }
  update(s, dt) {
    const menu = s.phase === 'menu',
      w = menu ? 0 : s.world,
      e = s.environment;
    this.root.visible = e?.options?.imported !== false;
    if (!this.root.visible) return;
    for (const { mesh, entries } of this.batches) {
      for (let i = 0; i < entries.length; i++) {
        const p = entries[i],
          v = sampleProp(p, s),
          bend = route(w, v.z, menu),
          d = this.dummy;
        d.position.set(v.x + bend.x, bend.y, v.z);
        d.rotation.set(0, p.yaw, Math.sin((e?.elapsed || 0) * 0.8 + p.phase) * 0.012 * (e?.wind || 0.1));
        d.scale.setScalar(v.visible ? v.scale : 0);
        d.updateMatrix();
        mesh.setMatrixAt(i, d.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const r of this.animals) {
      const v = sampleAnimal(r.a, r.aIndex, s),
        bend = route(w, v.z, menu);
      r.g.visible = v.visible;
      r.g.position.set(v.x + bend.x, v.y + bend.y, v.z);
      r.g.rotation.y = v.yaw;
      if (r.mode !== v.mode) {
        const next = r.actions[v.mode],
          old = r.actions[r.mode];
        if (next && next !== old) {
          next.reset().play();
          if (old) old.crossFadeTo(next, 0.65, false);
        }
        r.mode = v.mode;
      }
      r.mixer.update(dt);
    }
    for (const p of this.ponds) {
      const z = 15 - 180 + ((((p.offset + w) % 180) + 180) % 180),
        bend = route(w, z, menu);
      p.mesh.visible = menu || s.distance >= 900;
      p.mesh.position.set(p.x + bend.x, 0.045 + bend.y, z);
    }
  }
  get stats() {
    return { models: this.bank.models.size, instances: this.layout.length, animals: this.animals.length, batches: this.batches.length };
  }
}
