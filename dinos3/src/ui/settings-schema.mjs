// Nastavení jako deklarace. Každá volba má apply (provede změnu) a probe (vrátí, co hra skutečně má).
// Volba, která v dané situaci nic neudělá, má podmínku `when` a hráč ji nevidí.
// Identifikátory odpovídají katalogu nabídek pro arkádu (repo vibe-game-frameworks, 41_SABLONA).
import { WEATHER } from '../game/environment.mjs';
import { DIFFICULTY_NAMES } from '../game/guide.mjs';

export const PAGES = { hra: 'Hra', zvuk: 'Zvuk', obraz: 'Obraz', ovladani: 'Ovládání', svet: 'Svět', data: 'Data' };

/** Výchozí předvolby; systémy hry z tohoto objektu čtou, nastavení do něj zapisuje. */
export function createPrefs() {
  return {
    audio: { master: 0.8, music: 0.5, sfx: 0.75, ambience: 0.55 },
    difficulty: 'lov',
    hints: true,
    shake: true,
    reduced: false,
    resumeCountdown: true,
    shadows: true,
    quality: 1.6,
    renderer: 'auto',
    touch: 'auto',
    vibrate: true,
    world: { weather: 'auto', daylight: 'cycle', timeScale: 100 },
    dev: false,
  };
}

const percent = (v) => `${v} %`;
const opts = (pairs) => pairs.map(([value, label]) => ({ value, label }));

/**
 * @param {object} c prefs, audio (Sound), view() → aktuální pohled, coarse() → dotykové zařízení,
 *                   reducedMotion (systémová volba), applyTouch(), devAllowed
 */
export function createSettingsDefs(c) {
  const { prefs, audio } = c;
  const volume = (id, key, label, def, when) => ({
    id, page: 'zvuk', label, type: 'range', min: 0, max: 100, step: 5, def, format: percent, tolerance: 0.5, when,
    apply: (v) => { prefs.audio[key] = v / 100; audio.apply(); },
    probe: () => audio.settings[key] * 100,
  });
  const world = (id, key, label, def, options, hint) => ({
    id, page: 'svet', label, type: 'select', def, options, hint,
    apply: (v) => { prefs.world[key] = v; },
    probe: () => prefs.world[key],
  });
  const is3D = () => c.view()?.kind === 'webgl2';
  const canFullscreen = () => Boolean(document.documentElement.requestFullscreen) && document.fullscreenEnabled !== false;

  return [
    // ── Hra
    { id: 'set.difficulty', page: 'hra', label: 'Tempo stezky', type: 'select', segment: true, def: 'lov', options: opts(Object.entries(DIFFICULTY_NAMES)),
      hint: 'Platí od dalšího běhu. Klidná a denní výprava mají tempo pevné.',
      apply: (v) => { prefs.difficulty = v; }, probe: () => prefs.difficulty },
    { id: 'set.hints', page: 'hra', label: 'Rady ve hře', type: 'toggle', def: true, hint: 'Krátká rada před překážkou na prvních 230 metrech.',
      apply: (v) => { prefs.hints = v; }, probe: () => prefs.hints },
    { id: 'set.shake', page: 'hra', label: 'Otřesy kamery', type: 'toggle', def: !c.reducedMotion,
      apply: (v) => { prefs.shake = v; }, probe: () => prefs.shake },
    { id: 'set.resumeCountdown', page: 'hra', label: 'Odpočet po pauze', type: 'toggle', def: true,
      apply: (v) => { prefs.resumeCountdown = v; }, probe: () => prefs.resumeCountdown },

    // ── Zvuk
    volume('set.vol.master', 'master', 'Celková hlasitost', 80),
    volume('set.vol.music', 'music', 'Hudba', 50),
    volume('set.vol.sfx', 'sfx', 'Zvuky', 75),
    volume('set.vol.ambience', 'ambience', 'Prales', 55),
    { id: 'set.testSound', page: 'zvuk', label: 'Zkouška zvuku', actionLabel: 'Přehrát', type: 'action', run: () => audio.unlock().then(() => audio.sfx('amber', 0.6)) },
    { id: 'set.nextTrack', page: 'zvuk', label: 'Hudba', actionLabel: 'Další skladba ⏭', type: 'action', run: () => audio.unlock().then(() => audio.player?.next()) },

    // ── Obraz
    { id: 'set.quality', page: 'obraz', label: 'Ostrost obrazu', type: 'select', segment: true, def: 1.6, options: opts([[1, 'Úsporná'], [1.3, 'Střední'], [1.6, 'Plná']]),
      when: is3D, hint: 'Nižší ostrost šetří baterii a zvedá plynulost.',
      apply: (v) => { prefs.quality = v; c.view()?.setQuality?.(v); },
      probe: () => (is3D() ? c.view().quality : prefs.quality) },
    { id: 'set.shadows', page: 'obraz', label: 'Stíny', type: 'toggle', def: true, when: is3D,
      apply: (v) => { prefs.shadows = v; c.view()?.setShadows?.(v); },
      probe: () => (is3D() ? c.view().shadows : prefs.shadows) },
    { id: 'set.reducedMotion', page: 'obraz', label: 'Omezit pohyb', type: 'toggle', def: Boolean(c.reducedMotion), hint: 'Vypne otřesy, záblesky a rozšíření záběru v transu.',
      apply: (v) => { prefs.reduced = v; document.body.classList.toggle('reduced', v); }, probe: () => document.body.classList.contains('reduced') },
    { id: 'set.fullscreen', page: 'obraz', label: 'Celá obrazovka', type: 'toggle', def: false, persist: false, when: canFullscreen,
      apply: (v) => (v ? document.documentElement.requestFullscreen() : document.fullscreenElement ? document.exitFullscreen() : undefined),
      probe: () => Boolean(document.fullscreenElement),
      watch: (cb) => document.addEventListener('fullscreenchange', () => cb(Boolean(document.fullscreenElement))) },
    { id: 'set.renderer', page: 'obraz', label: 'Vykreslování', type: 'select', segment: true, def: 'auto', options: opts([['auto', 'Automaticky'], ['canvas', 'Úsporné 2D']]),
      hint: 'Platí po novém načtení hry. Úsporné 2D poběží i na starém zařízení.',
      apply: (v) => { prefs.renderer = v; }, probe: () => prefs.renderer },

    // ── Ovládání
    { id: 'set.touchButtons', page: 'ovladani', label: 'Dotyková tlačítka', type: 'select', segment: true, def: 'auto', options: opts([['auto', 'Automaticky'], ['vzdy', 'Vždy'], ['nikdy', 'Nikdy']]),
      hint: 'Gesta tahem fungují vždy.',
      apply: (v) => { prefs.touch = v; c.applyTouch(); },
      probe: () => prefs.touch },
    { id: 'set.vibration', page: 'ovladani', label: 'Vibrace při nárazu', type: 'toggle', def: true, when: () => typeof navigator.vibrate === 'function' || Boolean(navigator.getGamepads),
      apply: (v) => { prefs.vibrate = v; }, probe: () => prefs.vibrate },

    // ── Svět
    world('set.world.weather', 'weather', 'Počasí', 'auto', opts([['auto', 'Proměnlivé'], ...Object.entries(WEATHER).map(([k, w]) => [k, w.name])]), 'Déšť dělá louže a klouže to. Pevné počasí zůstane, dokud ho nezměníš.'),
    world('set.world.daylight', 'daylight', 'Denní doba', 'cycle', opts([['cycle', 'Plynutí dne a noci'], ['morning', 'Ráno'], ['noon', 'Poledne'], ['dusk', 'Soumrak'], ['night', 'Noc']]), 'V noci jsou odměny o čtvrtinu vyšší.'),
    world('set.world.timeScale', 'timeScale', 'Rychlost času', 100, opts([[100, '1 : 100 (den za 14,4 min)'], [50, '1 : 50 (den za 28,8 min)']])),

    // ── Data
    { id: 'set.devMode', page: 'data', label: 'Vývojářský režim', type: 'toggle', def: false, hint: 'Přidá panel Vývojář (F3). Zkušební běhy nic neukládají.',
      apply: (v) => { prefs.dev = v; document.body.classList.toggle('dev', v); }, probe: () => document.body.classList.contains('dev') },
  ];
}
