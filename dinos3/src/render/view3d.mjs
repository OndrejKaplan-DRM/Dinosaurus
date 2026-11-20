// Trojrozměrné vykreslení (WebGL 2). Čte stav hry, nic v něm nemění.
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { LANE, obstacleX } from '../game/core.mjs';
import { route } from '../game/environment.mjs';
import { Raptor } from './raptor.mjs';
import { World } from './world.mjs';
import { NatureBank, NatureWorld } from './nature.mjs';

const MENU_TINTS = [0xffffff, 0xc2d6b2, 0xe3c79e, 0xb4c2ab];

export function withDeadline(promise, ms = 25000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('Načítání trvá příliš dlouho')), ms)))]).finally(() => clearTimeout(timer));
}

/**
 * @param {object} o  canvas, context (WebGL 2), asset(cesta), game, grove, debris, prefs, onProgress(text)
 * @returns {Promise<object>} pohled se stejným rozhraním jako view2d.mjs
 */
export async function createView3D({ canvas, context, asset, game, grove, debris, prefs, onProgress = () => {} }) {
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = prefs.shadows;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  scene.background = new T.Color('#b5c5a2');
  scene.fog = new T.Fog('#bac4a5', 34, 112);
  const camera = new T.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(9, 3.5, 10);

  scene.add(new T.HemisphereLight(0xe0f3ff, 0x56714d, 2.2));
  const sun = new T.DirectionalLight(0xffdf9e, 2.3);
  sun.position.set(-9, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 19, bottom: -16, far: 70 });
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0002;
  sun.target.position.set(0, 0, -9);
  scene.add(sun, sun.target);
  const rim = new T.DirectionalLight(0xb3deff, 0.8);
  rim.position.set(6, 7, -8);
  scene.add(rim);

  const textures = {};
  const textureLoader = new T.TextureLoader();
  await withDeadline(
    Promise.all(
      ['ground', 'rock', 'wood'].map(async (name) => {
        const tex = await textureLoader.loadAsync(asset('textures/' + name + '.jpg'));
        tex.colorSpace = T.SRGBColorSpace;
        tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        textures[name] = tex;
      }),
    ),
  );

  onProgress('Dinoš si protahuje nohy…');
  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await withDeadline(gltfLoader.loadAsync(asset('models/raptor.glb')));
  gltf.scene.traverse((o) => {
    if (o.isSkinnedMesh && o.material.map) {
      o.material.map.colorSpace = T.SRGBColorSpace;
      o.material.map.anisotropy = 8;
    }
  });

  onProgress('Probouzím les…');
  const bank = await withDeadline(new NatureBank().load(asset), 60000);
  const world = new World(scene, textures);
  world.nature = new NatureWorld(scene, bank);

  const player = new Raptor(gltf);
  scene.add(player.root);
  const wild = [];
  for (let i = 0; i < 4; i++) {
    const animal = new Raptor(gltf, { height: i === 0 ? 1.82 : 1.28 + i * 0.1, tint: MENU_TINTS[i], offset: i * 0.23 });
    wild.push(animal);
    scene.add(animal.root);
  }

  const groveRing = new T.Mesh(new T.RingGeometry(0.57, 0.6, 40), new T.MeshBasicMaterial({ color: 0xffe3a0, side: T.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }));
  groveRing.rotation.x = -Math.PI / 2;
  scene.add(groveRing);
  const debugBody = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ wireframe: true, color: 0x68ffee, depthTest: false }));
  debugBody.visible = false;
  scene.add(debugBody);
  debris.attach(scene, textures.wood);

  // Viditelné překážky se půjčují ze zásobníku podle druhu, nové se nevyrábějí za běhu donekonečna.
  const visuals = new Map();
  const pools = new Map();
  function obstacleGroup(o) {
    let rec = visuals.get(o.id);
    if (!rec) {
      let pool = pools.get(o.kind);
      if (!pool) pools.set(o.kind, (pool = []));
      rec = pool.find((r) => !r.used);
      if (!rec) {
        const group = world.makeObstacle(o.kind, textures, o.id);
        scene.add(group);
        rec = { group, used: false };
        pool.push(rec);
      }
      rec.used = true;
      visuals.set(o.id, rec);
    }
    return rec.group;
  }

  const wantCam = new T.Vector3();
  const lookAt = new T.Vector3();
  let fovKick = 0;
  let qualityCap = prefs.quality;

  function applyPixelRatio() {
    const cap = innerWidth < 720 ? Math.min(qualityCap, 1.3) : qualityCap;
    renderer.setPixelRatio(Math.min(devicePixelRatio, cap));
    renderer.setSize(innerWidth, innerHeight);
  }
  applyPixelRatio();

  function update(dt, wire) {
    const s = game;
    const menu = s.phase === 'menu';
    for (const [id, rec] of visuals) {
      if (menu || !s.objects.some((o) => o.id === id && o.active)) {
        rec.used = false;
        rec.group.visible = false;
        visuals.delete(id);
      }
    }
    if (!menu) {
      for (const o of s.objects) {
        if (!o.active) continue;
        const g = obstacleGroup(o);
        const bend = route(s.world, o.z, menu);
        g.visible = true;
        g.position.set(obstacleX(o, s.time, s.dev) + bend.x, o.y + bend.y, o.z);
        g.rotation.set(0, 0, 0);
        if (o.kind === 'rollingWood' || o.kind === 'rollingRock') {
          g.rotation.y = Math.sin(s.time * 1.6 + o.id * 2.4) * 0.4;
          g.children[0].rotation.x = s.dev?.moving === false ? 0 : s.time * 1.6;
        }
        if (o.kind === 'amber' || o.kind === 'shield') {
          g.position.y += Math.sin(s.time * 3 + o.id) * 0.12;
          g.rotation.y = s.time * 1.1 + o.id;
          g.rotation.z = Math.sin(s.time * 2 + o.id) * 0.13;
        }
        if (o.kind === 'log' && o.brushed) {
          o.bend = Math.max(0, o.bend - dt * 2);
          g.position.y += Math.sin(o.bend * Math.PI) * 0.2;
          g.rotation.z = Math.sin(o.bend * Math.PI * 3) * 0.08;
        }
      }
    }

    player.root.visible = !menu;
    if (!menu) player.update(dt, s);
    for (let i = 0; i < wild.length; i++) {
      const animal = wild[i];
      const w = grove.animals[i];
      animal.root.visible = menu;
      if (!menu) continue;
      animal.root.rotation.set(0, w.yaw, 0);
      animal.root.position.set(w.x, w.y, w.z);
      animal.update(dt, s, { wild: true, speed: w.speed * 0.7 });
      const shadow = world.shadows[i + 1];
      shadow.visible = true;
      shadow.position.set(w.x, 0.027, w.z);
      shadow.scale.setScalar(0.7);
    }
    groveRing.visible = menu && grove.active;
    groveRing.position.set(grove.animals[0].x, 0.04, grove.animals[0].z);
    for (let i = 1; i < world.shadows.length; i++) world.shadows[i].visible = menu;
    const own = world.shadows[0];
    own.visible = !menu;
    own.position.set(s.x, 0.029, 0);
    own.scale.setScalar(1 + s.y * 0.15);
    own.material.opacity = 0.4 / (1 + s.y * 0.7);

    world.update(s, dt, menu);
    debris.draw();

    // Kamera: v menu stojí stranou, v háji sleduje vybraného dinosaura, v běhu se drží za hráčem.
    const mobile = innerWidth < 720;
    const leader = grove.animals[0];
    const shake = prefs.shake && !prefs.reduced && s.phase !== 'paused' ? s.shake : 0;
    if (menu) wantCam.set(grove.active ? leader.x * (mobile ? 1 : 0.5) : mobile ? 3.0 : 3.6, grove.active ? 4.2 : 2.8, grove.active ? 11 : mobile ? 9 : 7.5);
    else wantCam.set(s.x * 0.32, 3.15 + s.y * 0.1, 7.8);
    if (shake > 0) {
      wantCam.x += Math.sin(s.time * 52) * shake * 0.3;
      wantCam.y += Math.cos(s.time * 63) * shake * 0.18;
    }
    camera.position.lerp(wantCam, 1 - Math.exp(-dt * 5));
    if (menu) lookAt.set(grove.active ? leader.x * (mobile ? 1 : 0.5) : mobile ? -0.8 : 0, 1.15, -4.5);
    else lookAt.set(s.x * 0.12, 1.0 + s.y * 0.08, -9);
    camera.lookAt(lookAt);
    // Zorné pole se s rychlostí rozšiřuje; lovecký trans přidá znatelný nádech.
    fovKick += ((!menu && s.rush > 0 && !prefs.reduced ? 7 : 0) - fovKick) * Math.min(1, dt * 4);
    camera.fov = (mobile ? 65 : 54) + (menu ? 0 : Math.max(0, s.speed - 11) * 0.18) + fovKick;
    camera.updateProjectionMatrix();

    debugBody.visible = wire && !menu;
    if (debugBody.visible) {
      debugBody.position.set(s.x, s.y + (s.duck > 0.25 ? 0.4 : 0.78), 0);
      debugBody.scale.set(0.62, s.duck > 0.25 ? 0.7 : 1.4, 0.7);
    }
  }

  return {
    kind: 'webgl2',
    canvas,
    draw(dt, wire = false) {
      update(dt, wire);
      renderer.render(scene, camera);
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      applyPixelRatio();
    },
    onEvent(e) {
      if (e.type === 'land') world.kickDust(game.x, 0, 7);
      else if (e.type === 'duck') world.kickDust(game.x, 0, 4);
      else if (e.type === 'splash') world.kickDust(game.x, 0, 12);
      else if (e.type === 'shieldBreak') debris.burst(e.o.lane * LANE, 0.4, e.o.z, 10);
      else if (e.type === 'break') debris.burst(e.o.lane * LANE, 0.2, e.o.z, e.o.kind === 'wood' ? 9 : 4);
      else if (e.type === 'brush') debris.burst(e.o.lane * LANE, 1.5, e.o.z, 2);
    },
    step() {
      world.kickDust(game.x, 0, 2);
    },
    setShadows(on) {
      renderer.shadowMap.enabled = on;
      scene.traverse((o) => o.material && (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)));
    },
    get shadows() {
      return renderer.shadowMap.enabled;
    },
    setQuality(cap) {
      qualityCap = cap;
      applyPixelRatio();
    },
    get quality() {
      return qualityCap;
    },
    get pixelRatio() {
      return renderer.getPixelRatio();
    },
    /** Zbarvení hráčova dinosaura; v háji ho nese i vybrané zvíře. */
    setSkin(tint) {
      player.material.color.set(tint);
      wild[0].material.color.set(tint);
    },
    get skin() {
      return player.material.color.getHex();
    },
    get natureStats() {
      return world.nature.stats;
    },
    onContextLost(handler) {
      canvas.addEventListener('webglcontextlost', (e) => (e.preventDefault(), handler(new Error('3D kontext byl přerušen'))), { once: true });
    },
    dispose() {
      renderer.dispose();
    },
  };
}
