/** Postup mezi běhy: zkušenosti, hodnosti, úkoly, jantarová zásoba, rekordy a denní výprava.
 * Čistá logika nad obyčejným objektem „profil“; ukládání řeší save.mjs. */

export const PROFILE_VERSION = 1;
export const REVIVE_COST = 25;

export const RANKS = [
  { xp: 0, name: 'Mládě' },
  { xp: 300, name: 'Stopař' },
  { xp: 900, name: 'Lovec' },
  { xp: 2000, name: 'Dravec' },
  { xp: 4000, name: 'Vůdce smečky' },
  { xp: 7000, name: 'Postrach křídy' },
];

/** Zbarvení Dinoše; odemyká se hodností. */
export const SKINS = [
  { id: 'les', name: 'Lesní', tint: 0xffffff, rank: 0 },
  { id: 'pisek', name: 'Písečný', tint: 0xe9cfa0, rank: 1 },
  { id: 'mech', name: 'Mechový', tint: 0xb9d6a4, rank: 2 },
  { id: 'soumrak', name: 'Soumračný', tint: 0xb9aee0, rank: 3 },
  { id: 'jantar', name: 'Jantarový', tint: 0xffd27a, rank: 4 },
  { id: 'popel', name: 'Popelavý', tint: 0x9aa7ad, rank: 5 },
];

/** Úkoly. `run` = splnit v jednom běhu, `total` = nasbírat postupně. Tři stupně s rostoucí odměnou. */
export const MISSIONS = [
  { id: 'amberRun', stat: 'amber', mode: 'run', targets: [8, 15, 25], text: (n) => `Seber ${n} jantarů v jednom běhu` },
  { id: 'distanceRun', stat: 'distance', mode: 'run', targets: [600, 1500, 3000], text: (n) => `Uběhni ${n} m v jednom běhu` },
  { id: 'chompTotal', stat: 'chomps', mode: 'total', targets: [10, 30, 80], text: (n) => `Rozkousni ${n} větví nebo kořistí` },
  { id: 'cleanRun', stat: 'bestClean', mode: 'run', targets: [400, 900, 1800], text: (n) => `Uběhni ${n} m bez jediného zásahu` },
  { id: 'comboRun', stat: 'maxCombo', mode: 'run', targets: [5, 7, 8], text: (n) => `Udrž kombo ×${n}` },
  { id: 'rushTotal', stat: 'rushes', mode: 'total', targets: [2, 6, 15], text: (n) => `Dostaň se ${n}× do loveckého transu` },
  { id: 'stageRun', stat: 'stage', mode: 'run', targets: [1, 2, 4], text: (n) => `Doběhni do ${n + 1}. úseku krajiny` },
  { id: 'nightTotal', stat: 'nightDistance', mode: 'total', targets: [500, 1500, 4000], text: (n) => `Uběhni ${n} m v noci` },
  { id: 'rainTotal', stat: 'rainDistance', mode: 'total', targets: [400, 1200, 3000], text: (n) => `Uběhni ${n} m v dešti` },
  { id: 'duckTotal', stat: 'brushes', mode: 'total', targets: [8, 25, 60], text: (n) => `Podlez ${n} kmenů` },
];
const MISSION_XP = [60, 120, 220];
const ACTIVE_MISSIONS = 3;
const DIFFICULTIES = ['klid', 'lov', 'dravec'];

export function createProfile() {
  const p = {
    version: PROFILE_VERSION,
    xp: 0,
    bank: 0,
    skin: 'les',
    best: { klid: 0, lov: 0, dravec: 0 },
    daily: { date: '', score: 0, runs: 0 },
    totals: { runs: 0, distance: 0, amber: 0, chomps: 0 },
    missions: [],
    missionCursor: 0,
    done: {},
  };
  refillMissions(p);
  return p;
}

const count = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Z čehokoli (poškozený záznam, starší verze) udělá platný profil. */
export function normalizeProfile(raw) {
  const p = createProfile();
  if (!raw || typeof raw !== 'object') return p;
  p.xp = count(raw.xp);
  p.bank = count(raw.bank);
  for (const d of DIFFICULTIES) p.best[d] = count(raw.best?.[d]);
  if (typeof raw.daily?.date === 'string') p.daily = { date: raw.daily.date.slice(0, 10), score: count(raw.daily.score), runs: count(raw.daily.runs) };
  for (const k of Object.keys(p.totals)) p.totals[k] = count(raw.totals?.[k]);
  p.missionCursor = count(raw.missionCursor);
  p.done = {};
  for (const m of MISSIONS) p.done[m.id] = Math.min(m.targets.length, count(raw.done?.[m.id]));
  p.missions = [];
  for (const a of Array.isArray(raw.missions) ? raw.missions : []) {
    const m = MISSIONS.find((x) => x.id === a?.id);
    if (!m || p.missions.some((x) => x.id === m.id) || p.done[m.id] >= m.targets.length) continue;
    p.missions.push({ id: m.id, tier: p.done[m.id], progress: count(a.progress) });
  }
  refillMissions(p);
  p.skin = SKINS.some((s) => s.id === raw.skin && s.rank <= rankOf(p.xp).index) ? raw.skin : 'les';
  return p;
}

export function rankOf(xp) {
  let index = 0;
  for (let i = 1; i < RANKS.length; i++) if (xp >= RANKS[i].xp) index = i;
  const next = RANKS[index + 1] || null;
  const from = RANKS[index].xp;
  return { index, name: RANKS[index].name, next, progress: next ? (xp - from) / (next.xp - from) : 1 };
}

/** Doplní aktivní úkoly do tří; bere další nesplněné v pevném pořadí. */
export function refillMissions(p) {
  p.done ||= {};
  let guard = MISSIONS.length * 2;
  while (p.missions.length < ACTIVE_MISSIONS && guard-- > 0) {
    const m = MISSIONS[p.missionCursor++ % MISSIONS.length];
    const tier = p.done[m.id] || 0;
    if (tier >= m.targets.length || p.missions.some((x) => x.id === m.id)) continue;
    p.missions.push({ id: m.id, tier, progress: 0 });
  }
  return p;
}

export function describeMission(active) {
  const m = MISSIONS.find((x) => x.id === active.id);
  const target = m.targets[active.tier];
  return { id: m.id, text: m.text(target), target, progress: Math.min(target, Math.floor(active.progress)), xp: MISSION_XP[active.tier], mode: m.mode };
}

/** Zkušenosti za samotný běh. */
export function runXp(s) {
  return Math.floor(s.distance / 10) + s.amber * 2 + s.chomps * 3 + s.rushes * 10 + s.stage * 25;
}

export function dailySeed(date = new Date()) {
  const key = dateKey(date);
  let h = 2166136261;
  for (const ch of 'dinos' + key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function dateKey(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Započítá dokončený běh. Nemění vstupní profil, vrací nový a přehled toho, co běh přinesl.
 * Zkušební běhy vývojáře nepřinášejí nic. Klidná výprava plní jen jantarovou zásobu.
 * Běh po oživení se počítá celý, ale rekord nezapisuje.
 */
export function applyRun(profile, s, { daily = false, date = new Date() } = {}) {
  const p = structuredClone(profile);
  const out = { xp: 0, amber: 0, record: false, dailyRecord: false, rankUp: null, missions: [], eligible: !s.dev && !s.practice };
  if (s.dev) return { profile: p, gained: out };
  out.amber = s.amber;
  p.bank += s.amber;
  if (s.practice) return { profile: p, gained: out };

  const before = rankOf(p.xp).index;
  p.totals.runs++;
  p.totals.distance += Math.floor(s.distance);
  p.totals.amber += s.amber;
  p.totals.chomps += s.chomps;
  out.xp = runXp(s);

  for (const a of p.missions) {
    const m = MISSIONS.find((x) => x.id === a.id);
    const value = Number(s[m.stat]) || 0;
    a.progress = m.mode === 'run' ? Math.max(a.progress, value) : a.progress + value;
    if (a.progress >= m.targets[a.tier]) {
      const d = describeMission(a);
      out.missions.push({ id: m.id, text: d.text, xp: d.xp });
      out.xp += d.xp;
      p.done[m.id] = a.tier + 1;
      a.completed = true;
    }
  }
  p.missions = p.missions.filter((a) => !a.completed);
  refillMissions(p);

  if (!s.revived) {
    if (daily) {
      const key = dateKey(date);
      if (p.daily.date !== key) p.daily = { date: key, score: 0, runs: 0 };
      p.daily.runs++;
      if (s.score > p.daily.score) {
        p.daily.score = s.score;
        out.dailyRecord = true;
      }
    } else if (s.score > (p.best[s.difficulty] || 0)) {
      p.best[s.difficulty] = s.score;
      out.record = true;
    }
  }

  p.xp += out.xp;
  const after = rankOf(p.xp);
  if (after.index > before) out.rankUp = after.name;
  return { profile: p, gained: out };
}

/** Zaplatí oživení ze zásoby. Vrací nový profil, nebo null, když jantar nestačí. */
export function payRevive(profile) {
  if (profile.bank < REVIVE_COST) return null;
  return { ...profile, bank: profile.bank - REVIVE_COST };
}

export function availableSkins(profile) {
  const rank = rankOf(profile.xp).index;
  return SKINS.map((s) => ({ ...s, unlocked: s.rank <= rank, rankName: RANKS[s.rank].name }));
}
