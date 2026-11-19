import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCanvas, Image, Path2D } from '@napi-rs/canvas';
import { Grove } from '../src/game/grove.mjs';
import * as T from 'three';
import { World } from '../src/render/world.mjs';
import { CanvasScene } from '../src/render/canvas-scene.mjs';
import { Runner } from '../src/game/core.mjs';
globalThis.Image = Image;
globalThis.Path2D = Path2D;
globalThis.window = { devicePixelRatio: 1 };
globalThis.innerWidth = 800;
globalThis.innerHeight = 600;
globalThis.document = { createElement: () => createCanvas(1, 1) };
const files = ['fallback/raptor-atlas.webp', 'fallback/raptor-atlas.json', 'textures/ground.jpg', 'textures/rock.jpg'];
const assets = {};
for (const f of files) {
  const ext = f.split('.').pop(),
    mime = ext === 'json' ? 'application/json' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  assets[f] = 'data:' + mime + ';base64,' + (await readFile(new URL('../public/' + f, import.meta.url))).toString('base64');
}
const canvas = createCanvas(800, 600),
  view = await new CanvasScene().init(canvas, (p) => assets[p]);
test('compatibility renderer loads the actual 88 GLB frames and paints a real menu', () => {
  assert.equal(view.meta.count, 88);
  const state = new Runner();
  state.time = 2;
  state.grove = new Grove();
  state.grove.enter();
  view.draw(state, 0.016);
  const data = canvas.getContext('2d').getImageData(0, 0, 800, 600).data;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 32) colors.add(data[i] + data[i + 1] * 256 + data[i + 2] * 65536);
  assert.ok(colors.size > 3000);
});
test('running, jumping, crouching and stumbling render without a GPU', () => {
  const s = new Runner();
  s.start();
  s.countdown = 0;
  s.tick();
  s.nextAt = 1e6;
  for (const kind of ['rock', 'log', 'wood', 'thorn', 'snack', 'amber', 'shield']) s.spawn(kind, 0, -5 - s.objects.length * 6);
  for (const phase of ['playing', 'stumble', 'dead']) {
    s.phase = phase;
    s.stumble = 0.3;
    for (const y of [0, 1.2])
      for (const duck of [0, 1]) {
        s.y = y;
        s.grounded = y === 0;
        s.duck = duck;
        assert.doesNotThrow(() => view.draw(s, 0.016, true));
      }
  }
});
test('resize uses the actual mobile canvas width and capped pixel ratio', () => {
  globalThis.innerWidth = 390;
  globalThis.innerHeight = 844;
  window.devicePixelRatio = 3;
  view.resize();
  assert.equal(canvas.width, 585);
  assert.equal(canvas.height, 1266);
  assert.doesNotThrow(() => view.draw(new Runner(), 0.016));
});

test('actual Canvas ground moves towards the camera and remains stationary in the menu', () => {
  const pattern = view.groundPattern,
    records = [];
  view.groundPattern = {
    setTransform(m) {
      records.push(m);
      pattern.setTransform(m);
    },
  };
  const s = new Runner();
  s.phase = 'playing';
  s.world = 0;
  view.draw(s, 0);
  const first = records.splice(0);
  s.world = 0.7;
  view.draw(s, 0);
  const second = records.splice(0);
  assert.equal(first.length, second.length);
  for (let i = 0; i < first.length; i++) assert.ok(second[i].f > first[i].f);
  s.phase = 'menu';
  view.draw(s, 0);
  const menu = records.splice(0);
  s.world = 100;
  view.draw(s, 0);
  assert.deepEqual(records, menu);
  view.groundPattern = pattern;
});
test('actual Three ground UV offset follows the approaching scenery', () => {
  const scene = new T.Scene(),
    tex = new T.Texture(),
    w = new World(scene, { ground: tex, wood: tex, rock: tex }),
    s = new Runner();
  s.phase = 'playing';
  s.world = 1;
  w.update(s, 0, false);
  const old = w.moving[0].g.position.z,
    offset = w.dirt.offset.y;
  s.world = 1.1;
  w.update(s, 0, false);
  assert.ok(w.moving[0].g.position.z > old);
  assert.ok(w.dirt.offset.y > offset);
  assert.ok(Math.abs(w.dirt.offset.y - offset - (0.1 / 180) * 24) < 1e-10);
  w.update(s, 0, true);
  assert.equal(w.dirt.offset.y, 0);
});
test('the mobile grove camera keeps the selected dinosaur visible at both clearing edges', () => {
  const s = new Runner();
  s.grove = new Grove();
  s.grove.enter();
  for (const [x, z] of [
    [-4.3, -13],
    [4.3, 1.5],
  ]) {
    Object.assign(s.grove.animals[0], { x, z });
    view.draw(s, 0.016);
    const p = view.project(x, 0, z);
    assert.ok(Math.abs(p.x - view.w / 2) < 0.1);
    const half = (p.k * view.meta.worldSize * 1.82) / 1.68 / 2;
    assert.ok(p.x - half >= 0 && p.x + half <= view.w);
    assert.ok(p.y > 0 && p.y < view.h);
  }
});

import { Environment, Atmosphere, route, WEATHER } from '../src/game/environment.mjs';
test('every weather preset renders at day and night with late-game hazards', () => {
  const s = new Runner();
  s.phase = 'playing';
  s.distance = s.world = 1600;
  s.environment = new Environment(7);
  s.spawn('root', -1, -14);
  s.spawn('pool', 1, -9);
  const overlay = new Atmosphere(createCanvas(390, 844));
  for (const weather of Object.keys(WEATHER))
    for (const daylight of ['noon', 'night']) {
      for (let i = 0; i < 200; i++) s.environment.tick(0.1, { weather, daylight });
      assert.doesNotThrow(() => {
        view.draw(s, 0.016);
        overlay.draw(s.environment);
      });
    }
});
test('3D ground and scenery share route deformation and later vegetation unlocks', () => {
  const scene = new T.Scene();
  scene.fog = new T.Fog('#aacccc', 35, 120);
  const tex = new T.Texture(),
    w = new World(scene, { ground: tex, wood: tex, rock: tex }),
    s = new Runner();
  s.phase = 'playing';
  s.world = s.distance = 100;
  s.environment = new Environment(2);
  s.environment.tick(0.1);
  w.update(s, 0, false);
  const m = w.moving[0],
    b = route(s.world, m.g.position.z);
  assert.ok(Math.abs(m.g.position.x - m.x - b.x) < 1e-6);
  assert.ok(Math.abs(m.g.position.y - b.y) < 1e-6);
  const pos = w.ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 43) {
    const b = route(s.world, w.groundBase[i * 3 + 2] - 55);
    assert.ok(Math.abs(pos.getY(i) - w.groundBase[i * 3 + 1] - b.y) < 1e-5);
  }
  assert.ok(w.moving.some((m) => m.unlock && !m.g.visible));
  s.world = s.distance = 1600;
  w.update(s, 0, false);
  assert.ok(w.moving.filter((m) => m.unlock && m.g.visible).length > 5);
  assert.ok(
    w.moving.some((m) => !m.g.visible),
    'biome composition filters some plants',
  );
  for (const kind of ['root', 'pool']) assert.ok(w.makeObstacle(kind, { wood: tex }).children.length > 0);
});
test('all six crouch atlas frames have visibly different stepping poses', () => {
  const tile = createCanvas(320, 320),
    g = tile.getContext('2d'),
    frames = [];
  for (let i = 64; i < 70; i++) {
    g.clearRect(0, 0, 320, 320);
    g.drawImage(view.atlas, (i % 10) * 320, Math.floor(i / 10) * 320, 320, 320, 0, 0, 320, 320);
    frames.push(g.getImageData(0, 0, 320, 320).data.slice());
  }
  for (let i = 1; i < 6; i++) {
    let changed = 0;
    for (let j = 0; j < frames[i].length; j += 4)
      if (frames[i][j] !== frames[i - 1][j] || frames[i][j + 3] !== frames[i - 1][j + 3]) changed++;
    assert.ok(changed > 250, 'crouch animation frames must not be static: ' + changed);
  }
});
