import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import * as T from 'three';
import { Runner, LANE, LIMITS, obstacleX, seekRun } from '../src/game/core.mjs';
import { Environment, Atmosphere } from '../src/game/environment.mjs';
import { SkyPainter, fogRange } from '../src/render/sky.mjs';
import { LEVELS, DETAILS, sceneryVisible } from '../src/game/progression.mjs';
import { detailMesh, detailSprite } from '../src/render/details.mjs';
import { World } from '../src/render/world.mjs';
globalThis.document = { createElement: () => createCanvas(1, 1) };
globalThis.innerWidth = 800;
globalThis.innerHeight = 600;
test('moon is a textured background and foreground atmosphere cannot paint over a tree', () => {
  const e = new Environment(1);
  e.tick(0.1, { daylight: 'night', weather: 'clear' });
  e.options = { clouds: false, fauna: false, leaves: false, rain: false };
  const sky = new SkyPainter(),
    c = createCanvas(800, 600),
    g = c.getContext('2d');
  sky.draw(g, 800, 600, e);
  const moon = g.getImageData(575, 100, 18, 18).data,
    values = new Set();
  for (let i = 0; i < moon.length; i += 4) values.add(moon[i]);
  assert.ok(values.size > 20);
  const tree = [22, 61, 31];
  g.fillStyle = 'rgb(' + tree.join(',') + ')';
  g.fillRect(570, 90, 30, 40);
  const fg = createCanvas(800, 600),
    a = new Atmosphere(fg);
  a.draw(e);
  g.drawImage(fg, 0, 0);
  assert.deepEqual([...g.getImageData(584, 108, 1, 1).data].slice(0, 3), tree);
  assert.equal(fg.getContext('2d').getImageData(584, 108, 1, 1).data[3], 0);
});
test('Three sky is scene background, with no depth-independent celestial sprites', () => {
  const scene = new T.Scene(),
    tex = new T.Texture(),
    w = new World(scene, { ground: tex, wood: tex, rock: tex });
  assert.equal(scene.background, w.skyTexture);
  assert.ok(scene.background.isCanvasTexture);
  assert.equal(w.sun, undefined);
  assert.equal(w.sky, undefined);
  assert.equal(w.clouds.length, 0);
});
test('moon phase changes illuminated area; paused sky remains pixel-identical; clouds move with time', () => {
  const e = new Environment(1);
  e.tick(0.1, { daylight: 'night' });
  e.options = { clouds: false, stars: false, fauna: false, moonPhase: 0.2 };
  const c = createCanvas(800, 600),
    g = c.getContext('2d'),
    sky = new SkyPainter();
  const light = () => {
    sky.draw(g, 800, 600, e);
    const d = g.getImageData(572, 96, 24, 24).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 100) n++;
    return n;
  };
  const crescent = light();
  e.options.moonPhase = 1;
  assert.ok(light() > crescent * 2);
  e.options = { clouds: true, stars: false, moon: false, fauna: false };
  e.cloud = 1;
  sky.draw(g, 800, 600, e);
  const a = c.toBuffer('image/png');
  e.tick(20, {}, true);
  sky.draw(g, 800, 600, e);
  assert.ok(c.toBuffer('image/png').equals(a));
  e.elapsed += 45;
  sky.draw(g, 800, 600, e);
  assert.ok(!c.toBuffer('image/png').equals(a));
});
test('wet weather reduces far visibility without covering the player', () => {
  const clear = fogRange({ rain: 0, wet: 0, hour: 12 }),
    wet = fogRange({ rain: 1, wet: 1, hour: 6 });
  assert.ok(wet[1] < clear[1]);
  assert.ok(wet[0] >= 25);
  assert.ok(fogRange({ options: { fog: false } })[0] > 400);
});
test('all ten new details have nonempty Canvas silhouettes and actual bounded meshes', () => {
  assert.equal(DETAILS.length, 10);
  for (const [k] of DETAILS) {
    const m = detailMesh(k);
    assert.ok(m.children.length > 0, k);
    m.updateMatrixWorld();
    const box = new T.Box3().setFromObject(m),
      size = box.getSize(new T.Vector3());
    assert.ok(size.x > 0 && size.x < 5 && size.y < 3, k);
    const c = detailSprite(k),
      d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    assert.ok(
      d.some((n, i) => i % 4 === 3 && n > 0),
      k,
    );
  }
});
test('late sections change vegetation composition and fauna toggle works', () => {
  const count = (kind, d) => Array.from({ length: 100 }, (_, i) => sceneryVisible(kind, d, i)).filter(Boolean).length;
  assert.ok(count('conifer', 3200) > count('conifer', 1100) * 5);
  assert.ok(count('palm', 4700) > count('palm', 3200) * 5);
  for (const kind of ['mammal', 'lizard', 'amphibian', 'fish']) assert.equal(sceneryVisible(kind, 100, 0, { fauna: false }), false);
});
function playing() {
  const s = new Runner();
  s.start();
  s.phase = 'playing';
  s.nextAt = 1e9;
  return s;
}
test('moving hazards collide at their animated positions, stay inside reserved lanes and freeze in pause', () => {
  for (const kind of ['rollingWood', 'rollingRock']) {
    const s = playing(),
      o = s.spawn(kind, 0, -0.6);
    s.tick();
    assert.equal(s.phase, 'stumble');
    for (let t = 0; t < 50; t += 0.013) assert.ok(Math.abs(obstacleX(o, t) - o.lane * LANE) <= 0.3500001);
    const safe = playing();
    safe.lane = 1;
    safe.x = LANE;
    safe.spawn(kind, 0, -0.6);
    safe.tick();
    assert.equal(safe.phase, 'playing');
    safe.pause();
    const x = obstacleX(safe.objects[0], safe.time);
    safe.tick(0.04);
    assert.equal(obstacleX(safe.objects[0], safe.time), x);
    assert.equal(obstacleX(o, 3, { moving: false }), 0);
  }
});
test('hazard unlocks and dev seek preserve safety and do not queue missed rows', () => {
  for (const [d, allowed] of [
    [1000, []],
    [2000, ['rollingWood']],
    [3300, ['rollingWood', 'rollingRock']],
  ]) {
    const s = new Runner({ seed: 22 });
    s.distance = d;
    s.rows = 6;
    const seen = new Set();
    for (let i = 0; i < 300; i++) {
      s.objects = [];
      s.row(-100);
      assert.ok(new Set(s.objects.map((o) => o.lane)).size <= 2);
      for (const o of s.objects) if (o.kind.startsWith('rolling')) seen.add(o.kind);
    }
    assert.deepEqual(seen, new Set(allowed));
  }
  const s = playing();
  s.spawn('rock', 0, -1);
  seekRun(s, 4700);
  assert.equal(s.objects.length, 0);
  assert.equal(s.distance, 4700);
  assert.equal(s.world, 4700);
  assert.ok(s.nextAt > s.distance);
  assert.ok(s.dev.enabled && s.practice);
  s.dev.obstacles = false;
  s.phase = 'playing';
  for (let i = 0; i < 100; i++) s.tick();
  assert.equal(s.objects.length, 0);
  s.dev.obstacles = true;
  s.tick();
  assert.equal(s.objects.length, 0);
});
test('developer protection does not stop normal collision behavior after reset', () => {
  const s = playing();
  s.dev = { enabled: true, invulnerable: true };
  s.spawn('rock', 0, -0.7);
  s.tick();
  assert.equal(s.phase, 'playing');
  s.dev = {};
  s.spawn('rock', 0, -0.7);
  s.tick();
  assert.equal(s.phase, 'stumble');
});
test('moving hazard grazing collision uses relative sweep rather than its lane centre', () => {
  const hit = playing();
  hit.time = (Math.PI * 1.5 - 2.4) / 1.6;
  hit.x = -1.15;
  hit.lane = -1;
  hit.spawn('rollingWood', 0, -0.4);
  hit.tick(0.001);
  assert.equal(hit.phase, 'stumble');
  const still = playing();
  still.dev = { moving: false };
  still.time = (Math.PI * 1.5 - 2.4) / 1.6;
  still.x = -1.15;
  still.lane = -1;
  still.spawn('rollingWood', 0, -0.4);
  still.tick(0.001);
  assert.equal(still.phase, 'playing');
});
