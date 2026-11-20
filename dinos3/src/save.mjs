// Ukládání: nastavení a profil hráče v localStorage (při nedostupnosti jen v paměti).
// Při prvním spuštění převezme rekordy a nastavení z verze 2.
import { createStore } from './ui/store.mjs';
import { createProfile, normalizeProfile } from './game/meta.mjs';

export const STORE_PREFIX = 'dinos3:';

/** Rekordy a volby z Dinoše 2.x, pokud v prohlížeči zůstaly. */
export function readLegacy(backend = globalThis.localStorage) {
  const out = { best: {}, settings: null };
  try {
    for (const d of ['klid', 'lov', 'dravec']) {
      const n = Number(backend.getItem('dinos-best-' + d) || (d === 'lov' ? backend.getItem('drap-best') : 0));
      if (Number.isFinite(n) && n > 0) out.best[d] = Math.floor(n);
    }
    const s = JSON.parse(backend.getItem('dinos-settings-v2') || 'null');
    if (s && typeof s === 'object') out.settings = s;
  } catch {
    /* staré záznamy nejsou podmínkou */
  }
  return out;
}

/** Staré volby (0–1, jiné názvy) převedené na hodnoty nových deklarací. */
export function legacySettings(s) {
  if (!s) return null;
  const out = {};
  const pct = (v) => (Number.isFinite(v) ? Math.round(Math.max(0, Math.min(1, v)) * 20) * 5 : undefined);
  const put = (id, v) => v !== undefined && (out[id] = v);
  put('set.vol.master', pct(s.master));
  put('set.vol.music', pct(s.music));
  put('set.vol.sfx', pct(s.sfx));
  put('set.vol.ambience', pct(s.ambience));
  if (['klid', 'lov', 'dravec'].includes(s.difficulty)) out['set.difficulty'] = s.difficulty;
  if (typeof s.shake === 'boolean') out['set.shake'] = s.shake;
  if (typeof s.shadows === 'boolean') out['set.shadows'] = s.shadows;
  if (s.touch === true) out['set.touchButtons'] = 'vzdy';
  if (['cycle', 'morning', 'noon', 'dusk', 'night'].includes(s.daylight)) out['set.world.daylight'] = s.daylight;
  if ([50, 100].includes(s.timeScale)) out['set.world.timeScale'] = s.timeScale;
  // Počasí z verze 2 se nepřebírá: mohl ho tam zapsat vývojářský panel.
  return out;
}

export function createSave(backend = globalThis.localStorage) {
  const store = createStore(STORE_PREFIX, backend);
  let profile;
  const stored = store.get('profile');
  if (stored) profile = normalizeProfile(stored);
  else {
    profile = createProfile();
    const legacy = readLegacy(backend);
    Object.assign(profile.best, legacy.best);
    if (!store.get('settings') && legacy.settings) store.set('settings', { format: 1, values: legacySettings(legacy.settings) });
    store.set('profile', profile);
  }
  return {
    store,
    get profile() {
      return profile;
    },
    setProfile(next) {
      profile = normalizeProfile(next);
      return store.set('profile', profile);
    },
    resetProfile() {
      profile = createProfile();
      return store.set('profile', profile);
    },
    get persistent() {
      return store.persistent;
    },
  };
}
