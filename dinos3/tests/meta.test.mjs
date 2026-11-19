import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfile, normalizeProfile, rankOf, RANKS, applyRun, describeMission, MISSIONS, payRevive, REVIVE_COST, dailySeed, dateKey, availableSkins, runXp } from '../src/game/meta.mjs';

const summary = (over = {}) => ({ seed: 1, difficulty: 'lov', practice: false, dev: false, revived: false, distance: 0, score: 0, amber: 0, chomps: 0, dodges: 0, jumps: 0, brushes: 0, rushes: 0, hits: 0, maxCombo: 0, bestClean: 0, nightDistance: 0, rainDistance: 0, stage: 0, lap: 0, ...over });

test('a new profile has three distinct missions and the first rank', () => {
  const p = createProfile();
  assert.equal(p.missions.length, 3);
  assert.equal(new Set(p.missions.map((m) => m.id)).size, 3);
  assert.equal(rankOf(0).name, 'Mládě');
  assert.equal(rankOf(RANKS[2].xp).index, 2);
  assert.equal(rankOf(1e9).next, null);
  assert.ok(rankOf(150).progress > 0.49 && rankOf(150).progress < 0.51);
});

test('a run earns experience, fills the amber bank and sets a record without touching the input', () => {
  const p = createProfile();
  const s = summary({ distance: 1000, score: 6000, amber: 5, chomps: 2, rushes: 1, stage: 1 });
  const { profile, gained } = applyRun(p, s);
  assert.equal(p.xp, 0, 'input untouched');
  assert.equal(gained.xp >= runXp(s), true);
  assert.equal(runXp(s), 100 + 10 + 6 + 10 + 25);
  assert.equal(profile.bank, 5);
  assert.equal(profile.best.lov, 6000);
  assert.equal(gained.record, true);
  assert.equal(profile.totals.runs, 1);
  const again = applyRun(profile, summary({ distance: 100, score: 500 }));
  assert.equal(again.gained.record, false);
  assert.equal(again.profile.best.lov, 6000);
});

test('missions: single-run ones need one good run, cumulative ones add up; finished ones are replaced by new ones', () => {
  let p = createProfile();
  const ids = p.missions.map((m) => m.id);
  assert.deepEqual(ids, ['amberRun', 'distanceRun', 'chompTotal']);
  let r = applyRun(p, summary({ amber: 5, distance: 300, chomps: 4 }));
  assert.equal(r.gained.missions.length, 0);
  p = r.profile;
  assert.equal(describeMission(p.missions[2]).progress, 4);
  assert.equal(describeMission(p.missions[0]).progress, 5);
  r = applyRun(p, summary({ amber: 3, distance: 200, chomps: 6 }));
  assert.deepEqual(r.gained.missions.map((m) => m.id), ['chompTotal'], 'amber 5 then 3 does not add up; chomps 4 + 6 do');
  p = r.profile;
  assert.equal(p.missions.length, 3);
  assert.ok(!p.missions.some((m) => m.id === 'chompTotal'), 'replaced by the next mission');
  assert.equal(p.done.chompTotal, 1);
  r = applyRun(p, summary({ amber: 9 }));
  assert.deepEqual(r.gained.missions.map((m) => m.id), ['amberRun']);
  assert.ok(r.gained.xp >= 60);
});

test('all missions can be completed tier by tier and then the list runs dry without looping forever', () => {
  let p = createProfile();
  const big = summary({ distance: 5000, score: 1, amber: 99, chomps: 99, brushes: 99, rushes: 99, maxCombo: 8, bestClean: 5000, nightDistance: 5000, rainDistance: 5000, stage: 4 });
  let done = 0;
  for (let i = 0; i < 40; i++) {
    const r = applyRun(p, big);
    done += r.gained.missions.length;
    p = r.profile;
  }
  assert.equal(done, MISSIONS.length * 3);
  assert.equal(p.missions.length, 0);
  assert.equal(rankOf(p.xp).name, 'Postrach křídy');
});

test('practice only banks amber, developer runs change nothing, a revived run sets no record', () => {
  const p = createProfile();
  const practice = applyRun(p, summary({ practice: true, amber: 7, distance: 900, score: 9999 }));
  assert.equal(practice.profile.bank, 7);
  assert.equal(practice.profile.xp, 0);
  assert.equal(practice.profile.best.klid, 0);
  assert.equal(practice.gained.eligible, false);
  const dev = applyRun(p, summary({ dev: true, practice: true, amber: 7, score: 9999 }));
  assert.deepEqual(dev.profile, p);
  const revived = applyRun(p, summary({ revived: true, score: 5000, distance: 500 }));
  assert.equal(revived.profile.best.lov, 0);
  assert.ok(revived.profile.xp > 0);
});

test('daily run keeps its own best per day and the seed depends only on the date', () => {
  const day1 = new Date(2026, 10, 20, 8);
  const day2 = new Date(2026, 10, 21, 8);
  assert.equal(dailySeed(day1), dailySeed(new Date(2026, 10, 20, 23)));
  assert.notEqual(dailySeed(day1), dailySeed(day2));
  assert.equal(dateKey(day1), '2026-11-20');
  let r = applyRun(createProfile(), summary({ score: 3000 }), { daily: true, date: day1 });
  assert.equal(r.gained.dailyRecord, true);
  assert.equal(r.profile.best.lov, 0, 'daily does not touch the normal record');
  r = applyRun(r.profile, summary({ score: 2000 }), { daily: true, date: day1 });
  assert.equal(r.profile.daily.score, 3000);
  assert.equal(r.profile.daily.runs, 2);
  r = applyRun(r.profile, summary({ score: 100 }), { daily: true, date: day2 });
  assert.deepEqual(r.profile.daily, { date: '2026-11-21', score: 100, runs: 1 });
});

test('revive costs amber from the bank and is refused when the bank is short', () => {
  const p = { ...createProfile(), bank: REVIVE_COST + 3 };
  assert.equal(payRevive(p).bank, 3);
  assert.equal(payRevive({ ...p, bank: REVIVE_COST - 1 }), null);
});

test('skins unlock by rank; a damaged or foreign record becomes a valid profile', () => {
  const fresh = availableSkins(createProfile());
  assert.equal(fresh.filter((s) => s.unlocked).length, 1);
  assert.equal(availableSkins({ ...createProfile(), xp: 2000 }).filter((s) => s.unlocked).length, 4);
  for (const raw of [null, 'x', 42, {}, { xp: -5, bank: 'a', best: { lov: NaN }, missions: 'no', skin: 'jantar' }, { xp: 5000, skin: 'jantar', missions: [{ id: 'nope' }, { id: 'amberRun', progress: 3 }, { id: 'amberRun', progress: 9 }] }]) {
    const p = normalizeProfile(raw);
    assert.equal(p.missions.length, 3);
    assert.ok(p.xp >= 0 && p.bank >= 0);
    assert.equal(new Set(p.missions.map((m) => m.id)).size, 3);
  }
  assert.equal(normalizeProfile({ xp: 5000, skin: 'jantar' }).skin, 'jantar');
  assert.equal(normalizeProfile({ xp: 10, skin: 'jantar' }).skin, 'les', 'a locked skin falls back');
  assert.equal(normalizeProfile({ missions: [{ id: 'amberRun', progress: 3 }] }).missions[0].progress, 3);
});
