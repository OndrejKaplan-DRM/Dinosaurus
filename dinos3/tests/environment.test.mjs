import test from 'node:test';
import assert from 'node:assert/strict';
import { Environment, route, biome } from '../src/game/environment.mjs';
import { Runner } from '../src/game/core.mjs';
test('day is 864 active seconds at 1:100 and pause freezes weather', () => {
  const e = new Environment(1);
  for (let i = 0; i < 8640; i++) e.tick(0.1, { timeScale: 100 });
  assert.ok(Math.abs(e.hour - 16) < 1e-6);
  const before = JSON.stringify(e);
  e.tick(100, {}, true);
  assert.equal(JSON.stringify(e), before);
});
test('seeded random weather changes and forced presets converge gently', () => {
  const e = new Environment(10),
    seen = new Set();
  for (let i = 0; i < 3000; i++) {
    e.tick(0.1);
    seen.add(e.mode);
  }
  assert.ok(seen.size >= 3);
  const old = e.rain;
  e.tick(0.01, { weather: 'shower' });
  assert.ok(Math.abs(e.rain - old) < 0.01);
  for (let i = 0; i < 200; i++) e.tick(0.1, { weather: 'shower', daylight: 'night' });
  assert.ok(e.rain > 0.9);
  assert.equal(e.day, 0);
  assert.equal(e.hour, 0);
});
test('route turns both ways and changes elevation while keeping the player origin stable', () => {
  let left = false,
    right = false,
    hill = false;
  for (let d = 0; d < 5000; d += 20) {
    assert.deepEqual(route(d, 0), { x: 0, y: 0 });
    const r = route(d, -70);
    left ||= r.x < -5;
    right ||= r.x > 5;
    hill ||= Math.abs(r.y) > 1;
    for (const z of [-100, -40, -5]) {
      const a = route(d, z),
        b = route(d + 0.01, z);
      assert.ok(Math.abs(b.x - a.x) < 0.02);
      assert.ok(Number.isFinite(a.y));
    }
  }
  assert.ok(left && right && hill);
  assert.deepEqual(route(100, -70, true), { x: 0, y: 0 });
});
function running() {
  const g = new Runner();
  g.start();
  for (let i = 0; i < 130; i++) g.tick();
  g.objects = [];
  g.nextAt = 1e9;
  return g;
}
test('water is nonfatal, clears combo once, and jumping avoids the splash', () => {
  const events = [],
    g = running();
  g.onEvent = (e) => events.push(e.type);
  g.combo = 5;
  g.spawn('pool', 0, -1.2);
  for (let i = 0; i < 30; i++) g.tick();
  assert.equal(g.phase, 'playing');
  assert.equal(events.filter((e) => e === 'splash').length, 1);
  assert.equal(g.combo, 0);
  const j = running();
  j.y = 1.2;
  j.vy = 2;
  j.grounded = false;
  j.onEvent = (e) => {
    assert.notEqual(e.type, 'splash');
  };
  j.spawn('pool', 0, -1);
  for (let i = 0; i < 20; i++) j.tick();
});
test('roots are a low jump hazard and unlock only later', () => {
  const g = running();
  g.spawn('root', 0, -0.8);
  g.tick();
  assert.equal(g.phase, 'stumble');
  const j = running();
  j.y = 1;
  j.vy = 0;
  j.grounded = false;
  j.spawn('root', 0, -0.8);
  j.tick();
  assert.equal(j.phase, 'playing');
  for (const d of [0, 449]) {
    const r = new Runner();
    r.distance = d;
    r.rows = 10;
    for (let i = 0; i < 100; i++) r.row();
    assert.ok(r.objects.every((o) => !['root', 'pool'].includes(o.kind)));
  }
  assert.notEqual(biome(0), biome(1000));
});

test('changing time scale preserves the current hour', () => {
  const e = new Environment(1);
  e.tick(36, { timeScale: 100 });
  assert.ok(Math.abs(e.hour - 17) < 1e-10);
  e.tick(36, { timeScale: 50 });
  assert.ok(Math.abs(e.hour - 17.5) < 1e-10);
});
