import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Debris } from '../src/render/debris.mjs';
import { loadTestModel } from '../tools/load-test-model.mjs';
import { Raptor } from '../src/render/raptor.mjs';
import { Runner, STEP } from '../src/game/core.mjs';
const gltf = await loadTestModel();
function rig(duck = 0) {
  const p = new Raptor(gltf),
    s = new Runner();
  s.phase = 'playing';
  s.speed = 11;
  s.duck = s.tailTuck = duck;
  return { p, s };
}
function bounds(p) {
  const box = new T.Box3(),
    v = new T.Vector3();
  p.root.updateMatrixWorld(true);
  p.scene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    o.skeleton.update();
    for (let i = 0; i < o.geometry.attributes.position.count; i += 8) {
      o.getVertexPosition(i, v);
      o.localToWorld(v);
      box.expandByPoint(v);
    }
  });
  return box;
}
test('the supplied GLB contains one usable skeletal animation and a coloured texture reference', () => {
  assert.equal(gltf.animations.length, 1);
  assert.ok(gltf.animations[0].tracks.length > 50);
  assert.ok(gltf.scene.getObjectByName('tail3'));
});
test('procedural crouch lowers the tail while the animated feet stay near ground', () => {
  const a = rig(0),
    b = rig(1),
    v = new T.Vector3(),
    v2 = new T.Vector3();
  for (let i = 0; i < 50; i++) {
    a.p.update(STEP, a.s);
    b.p.update(STEP, b.s);
  }
  a.p.bones.tail3.getWorldPosition(v);
  b.p.bones.tail3.getWorldPosition(v2);
  assert.ok(v2.y < v.y - 0.15);
  const box = bounds(b.p);
  assert.ok(box.min.y > -0.06);
  assert.ok(box.max.y < 1.16);
});
test('crouched body stays below the overhead log through a complete animation cycle', () => {
  const { p, s } = rig(1);
  for (let i = 0; i < 60; i++) p.update(STEP, s);
  let max = 0,
    min = 1;
  for (let i = 0; i < 120; i++) {
    p.update(STEP, s);
    if (i % 10 === 0) {
      const box = bounds(p);
      max = Math.max(max, box.max.y);
      min = Math.min(min, box.min.y);
    }
  }
  assert.ok(max < 1.16, 'max height ' + max);
  assert.ok(min > -0.07, 'lowest vertex ' + min);
});
test('fall reaction never rotates the animal onto its back', () => {
  const { p, s } = rig();
  s.phase = 'stumble';
  s.hitSide = 1;
  for (let i = 0; i < 87; i++) {
    s.stumble = i * STEP;
    p.update(STEP, s);
    assert.ok(Math.abs(p.root.rotation.x) < 0.4);
    assert.ok(Math.abs(p.root.rotation.z) < 0.42);
    assert.ok(Number.isFinite(p.root.position.y));
  }
});
test('bone overlays do not accumulate over repeated run cycles', () => {
  const { p, s } = rig(1);
  s.speed = (1 - 0.85) / 0.052;
  for (let i = 0; i < 240; i++) p.update(STEP, s);
  const q = p.bones.tail3.quaternion.clone();
  for (let i = 0; i < 120; i++) p.update(STEP, s);
  assert.ok(q.angleTo(p.bones.tail3.quaternion) < 0.015);
});
test('debris falls, bounces lower each time, rests on the ground and expires', () => {
  const debris = new Debris(8, () => 0.5);
  debris.burst(0, 1, -5, 4);
  assert.equal(debris.active, 4);
  const p = debris.particles[0];
  let peak = 0;
  let lowest = Infinity;
  for (let i = 0; i < 150; i++) {
    debris.step(STEP);
    peak = Math.max(peak, p.y);
    lowest = Math.min(lowest, p.y);
  }
  assert.ok(peak > 1.6 && peak < 2.2, 'peak ' + peak);
  assert.ok(lowest >= 0.08 - 1e-9, 'never below the ground');
  for (let i = 0; i < 100; i++) debris.step(STEP);
  assert.ok(Math.abs(p.y - 0.08) < 0.02, 'rests on the ground, y ' + p.y);
  for (let i = 0; i < 60; i++) debris.step(STEP);
  assert.equal(debris.active, 0, 'expired after 2.2 s');
  debris.burst(0, 0, 0, 20);
  assert.equal(debris.active, 8, 'pool is bounded');
});
test('held crouch takes alternating steps, keeps feet above ground and clears the log', () => {
  const { p, s } = rig(1);
  for (let i = 0; i < 100; i++) p.update(STEP, s);
  const feet = [[], []];
  let high = 0,
    low = Infinity;
  for (let i = 0; i < 48; i++) {
    s.world = (i / 48) * 4.2;
    p.update(STEP, s);
    for (const [j, name] of ['backleg2', 'R_backleg2'].entries()) {
      const v = new T.Vector3();
      p.bones[name].getWorldPosition(v);
      feet[j].push(v.z);
    }
    if (i % 4 === 0) {
      const b = bounds(p);
      high = Math.max(high, b.max.y);
      low = Math.min(low, b.min.y);
    }
  }
  for (const f of feet) assert.ok(Math.max(...f) - Math.min(...f) > 0.12, 'foot must travel through a visible step');
  assert.ok(high < 1.16, 'head/tail clear log: ' + high);
  assert.ok(low > -0.07, 'feet do not sink: ' + low);
  const before = p.bones.backleg.quaternion.clone();
  s.phase = 'paused';
  s.world += 1;
  p.update(0.1, s);
  assert.ok(before.angleTo(p.bones.backleg.quaternion) < 1e-6);
});
