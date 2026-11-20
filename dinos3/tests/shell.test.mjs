// Čisté části nového rozhraní: vstupy, ukládání a deklarace nastavení. Bez prohlížeče.
import test from 'node:test';
import assert from 'node:assert/strict';
import { padEdges, nextFocus, CONTROLS, RUN_KEYS } from '../src/input.mjs';
import { createSave, readLegacy, legacySettings, STORE_PREFIX } from '../src/save.mjs';
import { createSettings } from '../src/ui/settings-core.mjs';
import { createSettingsDefs, createPrefs, PAGES } from '../src/ui/settings-schema.mjs';
import { GUIDE } from '../src/game/guide.mjs';
import { Runner } from '../src/game/core.mjs';

/** Náhrada localStorage. `broken` napodobí prohlížeč, který ukládání zakázal. */
function memoryBackend(initial = {}, broken = false) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem(k, v) {
      if (broken) throw new Error('zakázáno');
      data.set(k, String(v));
    },
    removeItem: (k) => data.delete(k),
  };
}
const pad = (buttons = [], axes = [0, 0]) => ({ buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i) })), axes });

test('ovladač: hrana stisku se ohlásí jednou, puštění také', () => {
  const first = padEdges(pad([0]));
  assert.equal(first.pressed.a, true);
  const held = padEdges(pad([0]), first.now);
  assert.equal(held.pressed.a, false, 'držené tlačítko se neopakuje');
  assert.equal(held.now.a, true);
  const up = padEdges(pad([]), held.now);
  assert.equal(up.released.a, true);
});

test('ovladač: páčka má mrtvou zónu a B není totéž co dolů', () => {
  assert.equal(padEdges(pad([], [0.3, 0.3])).now.left, false);
  assert.equal(padEdges(pad([], [0.3, 0.3])).now.down, false);
  assert.equal(padEdges(pad([], [-0.8, 0])).pressed.left, true);
  assert.equal(padEdges(pad([], [0, 0.9])).pressed.down, true);
  const b = padEdges(pad([1]));
  assert.equal(b.pressed.b, true);
  assert.equal(b.pressed.down, false, 'B (zpět) nesmí zároveň posouvat fokus dolů');
});

test('fokus: šipky obíhají dokola a bez fokusu začnou na kraji', () => {
  const items = ['a', 'b', 'c'];
  assert.equal(nextFocus(items, 'a', 1), 'b');
  assert.equal(nextFocus(items, 'c', 1), 'a');
  assert.equal(nextFocus(items, 'a', -1), 'c');
  assert.equal(nextFocus(items, null, 1), 'a');
  assert.equal(nextFocus(items, null, -1), 'c');
  assert.equal(nextFocus([], 'a', 1), null);
});

test('nápověda popisuje každý příkaz hry a každý prvek trati, který hra umí postavit', () => {
  const commands = new Set(Object.values(RUN_KEYS));
  assert.ok(CONTROLS.length >= commands.size, 'každý příkaz má řádek v tabulce ovládání');
  for (const row of CONTROLS) assert.ok(row.action && row.keys && row.touch && row.pad, `řádek „${row.action}“ má klávesy, dotyk i ovladač`);
  const g = new Runner();
  g.start({ seed: 1 });
  for (const item of GUIDE) assert.doesNotThrow(() => g.spawn(item.kind, 0, -40), `hra umí postavit „${item.kind}“`);
});

test('uložení: první spuštění převezme rekordy a volby z verze 2', () => {
  const backend = memoryBackend({ 'dinos-best-klid': '1200', 'drap-best': '3400.7', 'dinos-best-dravec': 'nesmysl', 'dinos-settings-v2': JSON.stringify({ master: 0.42, music: 0, difficulty: 'dravec', shake: false, touch: true, weather: 'rain', daylight: 'night', timeScale: 50 }) });
  const legacy = readLegacy(backend);
  assert.deepEqual(legacy.best, { klid: 1200, lov: 3400 });
  const save = createSave(backend);
  assert.equal(save.profile.best.klid, 1200);
  assert.equal(save.profile.best.lov, 3400);
  assert.equal(save.profile.best.dravec, 0);
  const values = JSON.parse(backend.getItem(STORE_PREFIX + 'settings')).values;
  assert.equal(values['set.vol.master'], 40, 'hlasitost 0–1 se převede na procenta po pěti');
  assert.equal(values['set.vol.music'], 0);
  assert.equal(values['set.difficulty'], 'dravec');
  assert.equal(values['set.shake'], false);
  assert.equal(values['set.touchButtons'], 'vzdy');
  assert.equal(values['set.world.daylight'], 'night');
  assert.equal(values['set.world.weather'], undefined, 'počasí z verze 2 se nepřebírá (mohl ho zapsat vývojářský panel)');
  assert.ok(backend.getItem('dinos-best-klid'), 'staré záznamy zůstávají na místě');
});

test('uložení: druhé spuštění už starou verzi nečte a profil drží', () => {
  const backend = memoryBackend({ 'dinos-best-klid': '1200' });
  const first = createSave(backend);
  first.setProfile({ ...first.profile, xp: 500, bank: 30 });
  backend.setItem('dinos-best-klid', '99999');
  const second = createSave(backend);
  assert.equal(second.profile.xp, 500);
  assert.equal(second.profile.bank, 30);
  assert.equal(second.profile.best.klid, 1200);
});

test('uložení: poškozený nebo nedostupný záznam hru nezastaví', () => {
  const broken = createSave(memoryBackend({ [STORE_PREFIX + 'profile']: '{"xp":' }));
  assert.equal(broken.profile.xp, 0);
  assert.equal(broken.profile.missions.length, 3);
  const none = createSave(memoryBackend({}, true));
  assert.equal(none.persistent, false, 'hra pozná, že se nic neuchová');
  none.setProfile({ ...none.profile, xp: 10 });
  assert.equal(none.profile.xp, 10, 'do zavření stránky stav platí');
  assert.equal(legacySettings(null), null);
});

/** Deklarace nastavení postavené nad napodobeninou zvuku a pohledu, bez DOM. */
function makeSettings({ kind = 'webgl2', backend = memoryBackend() } = {}) {
  globalThis.document ??= { documentElement: {}, fullscreenEnabled: false, fullscreenElement: null, addEventListener() {}, removeEventListener() {}, body: { classList: { set: new Set(), toggle(c, on) { on ? this.set.add(c) : this.set.delete(c); }, contains(c) { return this.set.has(c); } } } };
  const prefs = createPrefs();
  const audio = { settings: prefs.audio, apply() {}, unlock: async () => {}, sfx() {}, player: { next() {} } };
  const view = { kind, shadows: true, quality: 2, setShadows(on) { this.shadows = on; }, setQuality(q) { this.quality = q; } };
  const defs = createSettingsDefs({ prefs, audio, view: () => view, coarse: () => false, reducedMotion: false, applyTouch() {}, devAllowed: true });
  const save = createSave(backend);
  return { prefs, view, defs, backend, settings: createSettings(defs, save.store) };
}

test('nastavení: každá volba má stránku, popisek a ověřitelný účinek', async () => {
  const { defs, settings } = makeSettings();
  const ids = defs.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of defs) {
    assert.ok(PAGES[d.page], `„${d.id}“ patří na existující stránku`);
    assert.match(d.id, /^set\./);
    if (d.type === 'action' || d.id === 'set.fullscreen' || !settings.visible(d)) continue;
    const other = d.type === 'toggle' ? !d.def : d.type === 'range' ? (d.def === d.min ? d.max : d.min) : d.options.find((o) => o.value !== d.def).value;
    await settings.set(d.id, other);
    const row = settings.probeAll().find((x) => x.id === d.id);
    assert.ok(row.ok && row.value === other, `„${d.id}“ po změně opravdu platí`);
  }
});

test('nastavení: stíny a ostrost patří jen 3D pohledu', () => {
  const in3d = makeSettings({ kind: 'webgl2' });
  const in2d = makeSettings({ kind: 'canvas2d' });
  const visible = (s, id) => s.settings.visible(s.defs.find((d) => d.id === id));
  assert.equal(visible(in3d, 'set.shadows'), true);
  assert.equal(visible(in3d, 'set.quality'), true);
  assert.equal(visible(in2d, 'set.shadows'), false, 've 2D není co přepínat, volba se nenabízí');
  assert.equal(visible(in2d, 'set.quality'), false);
});

test('nastavení: hodnoty přežijí nové načtení a nesmysly se vrátí na výchozí', async () => {
  const backend = memoryBackend();
  const a = makeSettings({ backend });
  await a.settings.set('set.vol.master', 35);
  await a.settings.set('set.difficulty', 'dravec');
  const b = makeSettings({ backend });
  assert.equal(b.settings.get('set.vol.master'), 35);
  assert.equal(b.settings.get('set.difficulty'), 'dravec');
  backend.setItem(STORE_PREFIX + 'settings', JSON.stringify({ format: 1, values: { 'set.vol.master': 'hodně', 'set.difficulty': 'nesmysl', 'set.neznama': 1 } }));
  const c = makeSettings({ backend });
  assert.equal(c.settings.get('set.vol.master'), 80);
  assert.equal(c.settings.get('set.difficulty'), 'lov');
});
