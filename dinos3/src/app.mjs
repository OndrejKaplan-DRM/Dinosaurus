// Spuštění a propojení: vytvoří systémy, vybere vykreslování, řídí smyčku a běhy.
// Pravidla hry jsou v game/, obraz v render/, zvuk v audio/, nabídky v ui/.
import { VERSION, BUILT } from './config.mjs';
import { Runner, STEP } from './game/core.mjs';
import { Grove } from './game/grove.mjs';
import { Environment, Atmosphere, biome } from './game/environment.mjs';
import { applyRun, payRevive, dailySeed, REVIVE_COST, SKINS } from './game/meta.mjs';
import { Sound } from './audio/audio.mjs';
import { TRACKS } from './audio/music.mjs';
import { Debris } from './render/debris.mjs';
import { createView3D } from './render/view3d.mjs';
import { createView2D } from './render/view2d.mjs';
import { createSave } from './save.mjs';
import { installInput } from './input.mjs';
import { createSettings } from './ui/settings-core.mjs';
import { createSettingsDefs, createPrefs } from './ui/settings-schema.mjs';
import { createHud } from './ui/hud.mjs';
import { createShell } from './ui/shell.mjs';
import { Developer } from './ui/developer.mjs';

const $ = (id) => document.getElementById(id);
const asset = (p) => window.DINO_ASSETS?.[p] || '/' + p;
const coarse = matchMedia('(pointer: coarse)');

const prefs = createPrefs();
const save = createSave();
const audio = new Sound(asset, prefs.audio);
const grove = new Grove();
const environment = new Environment();
const debris = new Debris();
const devWorld = { weather: 'auto', timeScale: 100 }; // volby panelu Vývojář; do nastavení hráče se nikdy nezapisují
const game = new Runner({ seed: Date.now(), onEvent });
game.grove = grove;
game.environment = environment;

let view = null;
let atmosphere = null;
let ready = false;
let recovering = false;
let wire = false;
let run = { kind: 'run', daily: false };
let pending = null; // výsledek běhu, který ještě čeká na zapsání (hráč může vstát a běžet dál)
let resumeTimer = 0;
let lastVolume = 80;
let lastPhase = '';
let lastTime = 0;
let lastHud = 0;
let acc = 0;
let stepAt = 0;
const stats = { fps: 0, frames: 0, time: 0, drawMs: 0 };

const root = $('interface');
const hud = createHud({ root, onPause: () => actions.pause() });
const defs = createSettingsDefs({ prefs, audio, view: () => view, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, applyTouch });
const settings = createSettings(defs, save.store);
const developer = new Developer({ game, environment, settings: devWorld, audio, startPreview, setWire: (v) => (wire = v) });
const devPanel = $('developer');
devPanel.classList.add('screen');
devPanel.querySelector('.card').classList.add('panel', 'wide');
devPanel.querySelector('[data-action="close"]').addEventListener('click', () => shell.back());

const actions = {
  start,
  restart: () => (game.dev?.enabled ? developer.preview() : start(run.kind)),
  pause() {
    resumeTimer = 0;
    game.pause();
    shell.sync();
  },
  resume() {
    shell.closeAll();
    if (prefs.resumeCountdown && game.beforePause === 'playing') resumeTimer = 0.9;
    else game.resume();
    shell.sync();
  },
  toMenu() {
    leaveRun();
    grove.leave();
    game.menu();
    debris.clear();
    shell.closeAll();
    shell.sync({ rebuild: true });
  },
  revive() {
    const paid = payRevive(save.profile);
    if (!paid || !pending) return;
    save.setProfile(paid);
    pending = null;
    game.revive();
    shell.sync();
  },
  enterGrove() {
    void audio.unlock();
    grove.enter();
    input.clear();
    shell.sync();
  },
  leaveGrove() {
    grove.leave();
    input.clear();
    shell.sync();
  },
  openDeveloper() {
    if (prefs.dev) shell.openExternal('developer', devPanel, () => {});
  },
  toggleMute() {
    void audio.unlock();
    const now = settings.get('set.vol.master');
    if (now > 0) lastVolume = now;
    settings.set('set.vol.master', now > 0 ? 0 : lastVolume);
    shell.sync();
  },
  nextTrack: () => audio.unlock().then(() => audio.player?.next()),
  toggleFullscreen: () => Promise.resolve(settings.set('set.fullscreen', !document.fullscreenElement)).catch(() => hud.toast('Celá obrazovka není dostupná', true)),
  setSkin(id) {
    save.setProfile({ ...save.profile, skin: id });
    applySkin();
  },
  resetProfile() {
    pending = null;
    save.resetProfile();
    applySkin();
    shell.sync({ rebuild: true });
  },
};
const shell = createShell({ root, game, grove, settings, defs, prefs, save, actions, hud, version: VERSION, built: BUILT, viewKind: () => view?.kind, resuming: () => resumeTimer > 0 });
const input = installInput({ game, grove, shell, audio, prefs, isSurface: (el) => el?.id === 'scene', onPause: () => (game.phase === 'paused' ? actions.resume() : actions.pause()), onDevKey });

function onDevKey(code) {
  if (!prefs.dev) return false;
  if (code === 'F3') actions.openDeveloper();
  else {
    wire = !wire;
    hud.toast(wire ? 'Kontrola kolizí zapnuta' : 'Kontrola kolizí vypnuta', true);
  }
  return true;
}

function applyTouch() {
  document.body.classList.toggle('touch', prefs.touch === 'vzdy' || (prefs.touch === 'auto' && coarse.matches));
  if (ready) shell.sync();
}
coarse.addEventListener?.('change', applyTouch);

function applySkin() {
  view?.setSkin?.((SKINS.find((s) => s.id === save.profile.skin) || SKINS[0]).tint);
}

/** Počasí a čas, které právě platí: hráčovo nastavení, při zkušebním běhu volby vývojáře. */
function worldSettings() {
  if (!game.dev?.enabled) return prefs.world;
  return { ...prefs.world, timeScale: devWorld.timeScale, weather: devWorld.weather !== 'auto' ? devWorld.weather : prefs.world.weather };
}

function start(kind = 'run') {
  if (!ready) return;
  void audio.unlock();
  leaveRun();
  developer.reset();
  grove.leave();
  shell.closeAll();
  run = { kind, daily: kind === 'daily' };
  game.practice = kind === 'practice';
  game.difficulty = kind === 'practice' ? 'klid' : kind === 'daily' ? 'lov' : prefs.difficulty;
  game.start({ seed: kind === 'daily' ? dailySeed() : (Math.random() * 2 ** 32) >>> 0 });
  input.clear();
  hud.clearToasts();
  shell.sync();
}

/** Zkušební běh z panelu Vývojář právě začal. */
function startPreview() {
  grove.leave();
  shell.closeAll();
  input.clear();
  run = { kind: 'run', daily: false };
  resumeTimer = 0;
  shell.sync();
}

/** Zapíše čekající výsledek; klidná výprava si při odchodu odnese nasbíraný jantar. */
function leaveRun() {
  commitPending();
  if (game.practice && !game.dev?.enabled && game.phase !== 'menu' && game.amber > 0) {
    const { profile, gained } = applyRun(save.profile, game.summary());
    save.setProfile(profile);
    if (gained.amber) hud.toast(`+${gained.amber} ◆ do zásoby`, true);
  }
}
function commitPending() {
  if (!pending) return;
  save.setProfile(pending.profile);
  pending = null;
}

function finish() {
  const summary = game.summary();
  const result = applyRun(save.profile, summary, { daily: run.daily });
  const canRevive = result.gained.eligible && !summary.revived && save.profile.bank >= REVIVE_COST;
  pending = result;
  if (!canRevive) commitPending();
  shell.setResults({ summary, gained: result.gained, reason: game.reason, daily: run.daily, canRevive });
  audio.sfx('fail', 0.25, 1.13);
}

function onEvent(e) {
  view?.onEvent(e);
  const o = e.o;
  switch (e.type) {
    case 'start': debris.clear(); stepAt = 0; document.body.classList.remove('rush'); audio.switch('start'); break;
    case 'go': hud.toast('Vyraz!'); break;
    case 'jump': audio.sfx('jump', 0.4); break;
    case 'land': audio.sfx('thud', 0.28); break;
    case 'duck': audio.sfx('slide', 0.3, 1.2); break;
    case 'bite': audio.sfx('bite', 0.5); break;
    case 'amber': audio.sfx('amber', 0.5, 1 + Math.min(game.combo, 8) * 0.025); break;
    case 'shield': audio.sfx('shield', 0.5); hud.toast('Štít tě jednou zachrání', true); break;
    case 'shieldBreak': audio.sfx('shield', 0.55, 0.7); hud.toast('Štít tě zachránil'); buzz(40); break;
    case 'splash': audio.sfx('slide', 0.22, 0.65); hud.toast('Mělký brod · kombo smyto', true); break;
    case 'hit': audio.sfx('crash', 0.5, 1.18); audio.switch('peril'); document.body.classList.remove('rush'); buzz(90); break;
    case 'break': audio.sfx(o.kind === 'wood' ? 'wood' : 'chomp', 0.6); break;
    case 'brush': audio.sfx('thud', 0.17, 1.4); break;
    case 'reward': if (e.text !== 'Hop!' && e.text !== 'Podlez!') hud.toast(`+${e.gain} ${e.text}`, true); break;
    case 'recover': hud.toast('Dinoš běží dál', true); break;
    case 'revive': audio.sfx('shield', 0.5, 1.2); hud.toast('Dinoš vstal a běží dál'); break;
    case 'milestone': if (e.distance % 500 === 0) hud.toast(`${e.distance} metrů!`, true); break;
    case 'stage': audio.sfx('amber', 0.4, 0.8); hud.banner(e.name, `+${e.bonus} bodů · kus klidné stezky`); break;
    case 'lap': audio.sfx('amber', 0.4, 0.7); hud.banner(`Den ${e.lap + 1}`, `+${e.bonus} bodů · stezka zrychluje`); break;
    case 'rushStart': audio.sfx('jingle', 0.4); document.body.classList.add('rush'); hud.banner('Lovecký trans!', 'body ×2 · větve a trní prorazíš'); break;
    case 'rushEnd': document.body.classList.remove('rush'); break;
    case 'end': finish(); break;
  }
}

function buzz(ms) {
  if (prefs.vibrate) navigator.vibrate?.(ms);
}

function diagnostics() {
  const leader = grove.animals[0];
  return {
    version: VERSION, ready, renderer: view?.kind || 'none', screen: shell.screen, phase: game.phase, mode: run.kind,
    distance: +game.distance.toFixed(2), score: Math.floor(game.score), x: +game.x.toFixed(3), y: +game.y.toFixed(3), duck: +game.duck.toFixed(3),
    shield: game.shield, rage: +game.rage.toFixed(3), rush: +game.rush.toFixed(2), stage: game.stage, lap: game.lap, objects: game.objects.length,
    practice: game.practice, developer: game.dev || {}, nature: view?.natureStats || null,
    grove: { active: grove.active, x: +leader.x.toFixed(3), z: +leader.z.toFixed(3), y: +leader.y.toFixed(3), speed: +leader.speed.toFixed(3) },
    environment: { hour: +environment.hour.toFixed(2), weather: environment.mode, rain: +environment.rain.toFixed(2), day: +environment.day.toFixed(2), biome: biome(game.distance) },
    audio: { state: audio.ctx?.state || 'locked', decoded: audio.loadsOK, cue: audio.cue, song: audio.song, voices: audio.player?.activeCount || 0, starts: audio.player?.starts || 0, failures: audio.errors?.length || 0 },
    profile: { xp: save.profile.xp, bank: save.profile.bank, skin: save.profile.skin, missions: save.profile.missions.length },
    fps: stats.fps, drawMs: Math.round(stats.drawMs),
  };
}
window.dinosDiagnostics = diagnostics;
// Háček pro automatické zkoušky; hra ho sama nepoužívá.
window.__dinos = { game, grove, settings, save, shell, actions, prefs, environment, hud, defs, get view() { return view; }, start };

async function makeView2D() {
  const old = $('scene');
  const canvas = old.cloneNode(false); // plátno, které už dostalo kontext WebGL, pro 2D použít nejde
  old.replaceWith(canvas);
  return createView2D({ canvas, asset, game, prefs });
}

async function boot() {
  settings.applyAll();
  applyTouch();
  atmosphere = new Atmosphere($('atmosphere'));
  const canvas = $('scene');
  let context = null;
  if (prefs.renderer !== 'canvas') {
    try {
      context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      context = null;
    }
  }
  if (context) {
    try {
      view = await createView3D({ canvas, context, asset, game, grove, debris, prefs, onProgress: (t) => ($('loadtext').textContent = t) });
      view.onContextLost(recover);
    } catch (error) {
      console.warn('3D není dostupné, přecházím na úsporné vykreslování:', error.message);
      view = null;
    }
  }
  if (!view) {
    $('loadtext').textContent = 'Spouštím úsporné vykreslování…';
    view = await makeView2D();
  }
  document.body.dataset.renderer = view.kind;
  settings.applyAll(); // teď už existuje pohled, na který se dají přenést stíny a ostrost
  applySkin();

  ready = true;
  $('boot').hidden = true;
  root.hidden = false;
  shell.sync({ rebuild: true });
  window.addEventListener('resize', () => {
    atmosphere.resize();
    view.resize();
  });
  const onHide = () => {
    input.clear();
    if (['playing', 'ready'].includes(game.phase)) actions.pause();
    audio.suspend();
    commitPending();
  };
  window.addEventListener('blur', onHide);
  window.addEventListener('pagehide', commitPending);
  document.addEventListener('visibilitychange', () => document.hidden && onHide());
  window.addEventListener('focus', () => {
    if (audio.unlocked) void audio.unlock();
    lastTime = performance.now();
    acc = 0;
  });
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

async function recover(error) {
  if (recovering) return;
  recovering = true;
  game.pause();
  try {
    if (view?.kind === 'canvas2d') throw error;
    view?.dispose();
    view = await makeView2D();
    document.body.dataset.renderer = view.kind;
    hud.toast('Hra pokračuje v úsporném vykreslování', true);
    recovering = false;
    lastTime = performance.now();
    acc = 0;
    shell.sync({ rebuild: true });
    requestAnimationFrame(frame);
  } catch (e) {
    showError(e);
  }
}

function showError(error) {
  ready = false;
  const boot = $('boot');
  boot.hidden = false;
  boot.classList.add('error');
  boot.querySelector('strong').textContent = 'Stezka se nenačetla';
  $('loadtext').textContent = 'Načítání se přerušilo. ' + error.message;
  $('retry').hidden = false;
  console.error(error);
}
$('retry').addEventListener('click', () => location.reload());

function musicCue() {
  const p = game.phase;
  if (p === 'menu') return grove.active ? 'grove' : 'menu';
  if (p === 'paused') return 'pause';
  if (p === 'dead' || p === 'stumble') return 'peril';
  if (p === 'ready' || game.distance < 20) return 'start';
  if (game.shield) return 'shield';
  return game.speed > 18 || game.rush > 0 ? 'rush' : 'run';
}

function frame(now) {
  if (recovering) return;
  try {
    if (document.hidden) {
      lastTime = now;
      acc = 0;
      requestAnimationFrame(frame);
      return;
    }
    const raw = Math.max(0, (now - lastTime) / 1000);
    const dt = Math.min(raw, 0.1);
    lastTime = now;
    acc += dt;
    input.pollGamepad();
    if (resumeTimer > 0 && (resumeTimer -= raw) <= 0) {
      resumeTimer = 0;
      game.resume();
      shell.sync();
    }

    // Pevný krok 1/120 s; po dlouhé pauze se nedohání víc než 12 kroků.
    const covered = shell.overlayOpen();
    let steps = 0;
    while (acc >= STEP && steps < 12) {
      game.tick(STEP);
      environment.tick(STEP, worldSettings(), ['paused', 'dead'].includes(game.phase) || covered);
      if (game.phase === 'menu' && !covered) grove.tick(STEP);
      if (!['paused', 'dead', 'menu'].includes(game.phase)) debris.step(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 12) acc = 0;
    if (lastPhase !== game.phase) {
      lastPhase = game.phase;
      shell.sync();
    }

    audio.switch(musicCue());
    audio.update();
    audio.weather(environment);
    if (game.phase === 'playing' && game.grounded && game.time >= stepAt) {
      audio.sfx('step' + Math.floor(Math.random() * 3), game.duck > 0.4 ? 0.065 : 0.11, 0.95 + game.speed * 0.015);
      view.step();
      stepAt = game.time + (game.duck > 0.4 ? 2.1 / game.speed : Math.max(0.15, 0.31 - game.speed * 0.004));
    }

    hud.tick(raw);
    if (now - lastHud > 80) {
      lastHud = now;
      hud.update(game, { prefs, daily: run.daily });
      if (resumeTimer > 0) hud.countdownText(String(Math.ceil(resumeTimer / 0.3)));
      const song = audio.song && prefs.audio.master > 0 && prefs.audio.music > 0 ? '♫ ' + TRACKS[audio.song] : '';
      shell.info(song, `${environment.label} · ${biome(game.phase === 'menu' ? 0 : game.distance)}`);
      const d = diagnostics();
      $('runtime-probe').dataset.state = JSON.stringify(d);
      developer.status(d);
    }

    const paintStart = performance.now();
    view.draw(['paused', 'dead'].includes(game.phase) ? 0 : dt, wire);
    atmosphere.draw(environment, prefs.reduced || !prefs.shake);
    $('flash').style.opacity = prefs.reduced ? '0' : Math.min(0.15, game.flash * 0.3).toFixed(3);
    stats.drawMs = performance.now() - paintStart;
    stats.frames++;
    stats.time += raw;
    if (stats.time > 1) {
      stats.fps = Math.round(stats.frames / stats.time);
      stats.frames = stats.time = 0;
    }
    requestAnimationFrame(frame);
  } catch (error) {
    void recover(error);
  }
}

boot().catch(showError);
