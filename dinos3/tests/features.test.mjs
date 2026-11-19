import test from 'node:test';
import assert from 'node:assert/strict';
import { Runner, STEP, RUSH, STAGE, NIGHT_BONUS, seekRun, lapAt } from '../src/game/core.mjs';

function playing(opts = {}) {
  const events = [];
  const s = new Runner({ seed: 5, onEvent: (e) => events.push(e), ...opts });
  s.start();
  while (s.phase === 'ready') s.tick(STEP);
  s.dev = { obstacles: false };
  s.objects = [];
  return { s, events };
}
const run = (s, seconds) => {
  for (let i = 0; i < seconds * 120; i++) s.tick(STEP);
};

test('rage fills from amber, starts a rush once full, and the rush ends on its own', () => {
  const { s, events } = playing();
  for (let i = 0; i < 12; i++) s.addRage(RUSH.amber);
  assert.ok(s.rage > 0.9 && s.rush === 0, 'not yet full');
  s.addRage(RUSH.amber);
  assert.equal(s.rush, RUSH.time);
  assert.equal(s.rushes, 1);
  assert.ok(events.some((e) => e.type === 'rushStart'));
  s.addRage(1);
  assert.equal(s.rushes, 1, 'rage cannot stack during a rush');
  run(s, RUSH.time + 0.1);
  assert.equal(s.rush, 0);
  assert.equal(s.rage, 0);
  assert.ok(events.some((e) => e.type === 'rushEnd'));
  assert.ok(s.invincible > 0, 'short grace after the rush');
});

test('rush is faster, doubles distance score and smashes soft obstacles but not hard ones', () => {
  const a = playing().s;
  const b = playing().s;
  b.addRage(1);
  run(a, 1);
  run(b, 1);
  assert.ok(Math.abs(b.distance / a.distance - RUSH.speed) < 0.01, 'speed ratio ' + b.distance / a.distance);
  assert.ok(Math.abs(b.score / a.score - RUSH.speed * RUSH.score) < 0.02);

  const { s, events } = playing();
  s.addRage(1);
  s.spawn('thorn', 0, -3);
  run(s, 0.5);
  assert.equal(s.phase, 'playing', 'thorn is smashed');
  assert.ok(events.some((e) => e.type === 'break' && e.rush));
  s.spawn('rock', 0, -3);
  run(s, 0.5);
  assert.equal(s.phase, 'stumble', 'a rock still stops the runner');
  assert.equal(s.rush, 0, 'a real hit ends the rush');
});

test('rush pulls amber from the neighbouring lane', () => {
  const calm = playing().s;
  calm.spawn('amber', 1, -3);
  run(calm, 0.6);
  assert.equal(calm.amber, 0);
  const { s } = playing();
  s.addRage(1);
  s.spawn('amber', 1, -3);
  run(s, 0.6);
  assert.equal(s.amber, 1);
});

test('entering a new section pays a bonus once, announces it and leaves a quiet stretch', () => {
  const events = [];
  const s = new Runner({ seed: 9, practice: true, onEvent: (e) => events.push(e) });
  seekRun(s, 880);
  s.dev = { enabled: true, invulnerable: true };
  while (s.phase === 'ready') s.tick(STEP);
  const before = s.score;
  while (s.distance < 905) s.tick(STEP);
  const stage = events.filter((e) => e.type === 'stage');
  assert.equal(stage.length, 1);
  assert.equal(stage[0].index, 1);
  assert.equal(stage[0].name, 'Říční břeh');
  assert.ok(s.score - before >= 250);
  const from = s.breatherUntil - STAGE.breather;
  const spawnedAt = [];
  const seen = new Set();
  while (s.distance < 1150) {
    s.tick(STEP);
    for (const o of s.objects) if (!seen.has(o.id)) (seen.add(o.id), spawnedAt.push(s.distance - o.z));
  }
  assert.ok(spawnedAt.length > 3, 'rows resume after the quiet stretch');
  assert.ok(!spawnedAt.some((d) => d > from + 1 && d < s.breatherUntil - 3), 'no row inside the quiet stretch');
  assert.equal(events.filter((e) => e.type === 'stage').length, 1, 'announced once');
});

test('seeking past a section does not pay its bonus; later days raise the speed cap', () => {
  const events = [];
  const s = new Runner({ seed: 3, onEvent: (e) => events.push(e) });
  seekRun(s, 2000);
  while (s.phase === 'ready') s.tick(STEP);
  run(s, 1);
  assert.equal(events.filter((e) => e.type === 'stage').length, 0);
  assert.equal(s.stage, 2);
  assert.equal(lapAt(4400), 0);
  assert.equal(lapAt(6100), 1);
  const late = new Runner({ seed: 3 });
  seekRun(late, 7600);
  late.dev = { enabled: true, obstacles: false };
  while (late.phase === 'ready') late.tick(STEP);
  run(late, 0.5);
  assert.equal(late.lap, 2);
  assert.equal(Math.round(late.speed), 25, 'cap 23 + 2 days');
});

test('night raises rewards, rain unlocks pools early and makes lane changes slower', () => {
  const day = playing().s;
  const night = playing().s;
  night.environment = { day: 0.1, rain: 0 };
  day.reward(30, 'x');
  night.reward(30, 'x');
  assert.equal(night.score - day.score, Math.round(30 * NIGHT_BONUS) - 30);

  const wet = new Runner({ seed: 11 });
  wet.environment = { day: 1, rain: 0.8 };
  wet.start();
  wet.distance = 300;
  wet.rows = 6;
  const kinds = new Set();
  for (let i = 0; i < 400; i++) (wet.row(-100), wet.objects.forEach((o) => kinds.add(o.kind)), (wet.objects = []));
  assert.ok(kinds.has('pool'), 'pools appear at 300 m in rain');
  const dry = new Runner({ seed: 11 });
  dry.start();
  dry.distance = 300;
  dry.rows = 6;
  const dryKinds = new Set();
  for (let i = 0; i < 400; i++) (dry.row(-100), dry.objects.forEach((o) => dryKinds.add(o.kind)), (dry.objects = []));
  assert.ok(!dryKinds.has('pool'));

  const a = playing().s;
  const b = playing().s;
  b.environment = { day: 1, rain: 0.8 };
  a.command('right');
  b.command('right');
  run(a, 0.1);
  run(b, 0.1);
  assert.ok(b.x < a.x - 0.3, 'slippery lane change');
});

test('revive works once, clears the nearby track and keeps the score', () => {
  const { s, events } = playing();
  run(s, 1);
  s.spawn('rock', 0, -2);
  s.spawn('rock', 0, -20);
  s.spawn('rock', 0, -60);
  run(s, 1.2);
  assert.equal(s.phase, 'dead');
  const score = s.score;
  assert.equal(s.revive(), true);
  assert.equal(s.phase, 'playing');
  assert.equal(s.score, score);
  assert.ok(s.objects.every((o) => o.z < -30), 'nearby obstacles removed');
  assert.ok(s.invincible > 2);
  assert.ok(events.some((e) => e.type === 'revive'));
  s.objects = [];
  s.invincible = 0;
  s.spawn('rock', 0, -2);
  run(s, 1.2);
  assert.equal(s.phase, 'dead');
  assert.equal(s.revive(), false, 'only once per run');
});

test('a seed makes the whole track repeatable and the summary carries the run numbers', () => {
  const track = (seed) => {
    const s = new Runner({ seed: 1, practice: true });
    s.start({ seed });
    const rows = [];
    const seen = new Set();
    for (let i = 0; i < 120 * 40; i++) {
      s.tick(STEP);
      for (const o of s.objects) if (!seen.has(o.id)) (seen.add(o.id), rows.push(o.kind + o.lane));
    }
    return { rows: rows.join(','), s };
  };
  const a = track(777);
  const b = track(777);
  const c = track(778);
  assert.equal(a.rows, b.rows);
  assert.notEqual(a.rows, c.rows);
  const sum = a.s.summary();
  assert.equal(sum.seed, 777);
  assert.ok(sum.distance > 300 && sum.jumps === 0 && sum.bestClean >= 0);
  assert.deepEqual(Object.keys(sum).filter((k) => sum[k] === undefined), []);
});

test('clean streak is the longest distance without a hit', () => {
  const { s } = playing();
  s.practice = true;
  run(s, 2);
  const first = s.distance;
  s.spawn('rock', 0, -1.5);
  run(s, 3);
  assert.equal(s.hits, 1);
  assert.ok(Math.abs(s.summary().bestClean - Math.max(first, s.distance - first)) < 6, String(s.summary().bestClean));
});
