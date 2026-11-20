// Vstupy: klávesnice, dotyk, gesta a gamepad. Převádí je na příkazy hry a na pohyb v nabídkách.
// O tom, co který příkaz znamená, rozhoduje hra (Runner.command, Grove), ne tento soubor.

export const RUN_KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', ArrowDown: 'duck', KeyS: 'duck', Space: 'bite' };
export const GROVE_KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'forward', KeyW: 'forward', ArrowDown: 'back', KeyS: 'back', ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump' };

/** Popis ovládání pro nápovědu; drží se u map kláves, aby se nerozešly. */
export const CONTROLS = [
  { action: 'Změna pruhu', keys: '← →  nebo  A D', touch: 'tah do strany', pad: 'kříž nebo levá páčka' },
  { action: 'Skok', keys: '↑  nebo  W', touch: 'tah nahoru', pad: 'A' },
  { action: 'Podlezení', keys: '↓  nebo  S (drž)', touch: 'tah dolů', pad: 'kříž dolů nebo B' },
  { action: 'Kousnutí', keys: 'mezerník', touch: 'ťuknutí', pad: 'X' },
  { action: 'Pauza', keys: 'Esc  nebo  P', touch: 'tlačítko Pauza', pad: 'Start' },
  { action: 'Další skladba', keys: 'N', touch: 'tlačítko ⏭', pad: '—' },
];

/** Co se na gamepadu změnilo od minula. Čistá funkce, aby šla zkoušet bez ovladače. */
export function padEdges(pad, prev = {}) {
  const b = (i) => Boolean(pad.buttons[i]?.pressed);
  const ax = pad.axes[0] || 0;
  const ay = pad.axes[1] || 0;
  const now = { left: b(14) || ax < -0.55, right: b(15) || ax > 0.55, up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, a: b(0), b: b(1), x: b(2), start: b(9) };
  const pressed = {};
  const released = {};
  for (const k of Object.keys(now)) {
    pressed[k] = now[k] && !prev[k];
    released[k] = !now[k] && Boolean(prev[k]);
  }
  return { now, pressed, released };
}

/** Kam se posune fokus v nabídce: další nebo předchozí prvek v pořadí, na koncích dokola. */
export function nextFocus(items, current, step) {
  if (!items.length) return null;
  const i = items.indexOf(current);
  if (i < 0) return step > 0 ? items[0] : items[items.length - 1];
  return items[(i + step + items.length) % items.length];
}

export function installInput({ game, grove, shell, audio, isSurface, prefs, onPause, onDevKey }) {
  const held = new Set();
  const grovePointer = new Map();
  const unlock = () => void audio.unlock();

  function syncGrove() {
    grove.release();
    if (!shell.inGrove()) return;
    for (const code of held) {
      const cmd = GROVE_KEYS[code];
      if (cmd && cmd !== 'jump') grove.keys.add(cmd);
    }
    for (const cmd of grovePointer.values()) if (cmd !== 'jump') grove.keys.add(cmd);
  }
  function clear() {
    held.clear();
    grovePointer.clear();
    grove.release();
    game.duckHold = false;
  }

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (e.code === 'Escape') {
      e.preventDefault();
      shell.back();
      return;
    }
    if (e.code === 'F3' || e.code === 'F2') {
      if (onDevKey(e.code)) e.preventDefault();
      return;
    }
    // V nabídkách patří klávesy nabídce: šipky posouvají fokus, Enter a mezerník stiskne prvek pod ním.
    if (shell.menuOpen()) {
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          if (tag === 'INPUT' && document.activeElement.type === 'range') return; // posuvník si šipky bere sám
          if (tag === 'SELECT') return;
        } else return;
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') (e.preventDefault(), shell.moveFocus(1));
      else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') (e.preventDefault(), shell.moveFocus(-1));
      else if ((e.code === 'Enter' || e.code === 'Space') && (!document.activeElement || document.activeElement === document.body)) (e.preventDefault(), shell.activateDefault());
      return;
    }
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (RUN_KEYS[e.code] || GROVE_KEYS[e.code] || e.code === 'KeyP') e.preventDefault();
    if (e.repeat) return;
    unlock();
    if (e.code === 'KeyN') return void audio.player?.next();
    if (shell.inGrove()) {
      if (!GROVE_KEYS[e.code]) return;
      held.add(e.code);
      syncGrove();
      if (e.code === 'Space') grove.command('jump');
      return;
    }
    if (e.code === 'KeyP') return onPause();
    if (RUN_KEYS[e.code]) {
      held.add(e.code);
      game.command(RUN_KEYS[e.code]);
    }
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
    syncGrove();
    if (RUN_KEYS[e.code] === 'duck' && !held.has('ArrowDown') && !held.has('KeyS')) game.command('duck', false);
  });

  // Dotyková tlačítka (vytváří je HUD); delegace, protože se HUD překresluje.
  document.addEventListener('pointerdown', (e) => {
    const run = e.target.closest?.('[data-control]');
    const roam = e.target.closest?.('[data-grove]');
    if (!run && !roam) return;
    e.preventDefault();
    unlock();
    (run || roam).setPointerCapture?.(e.pointerId);
    if (run) game.command(run.dataset.control);
    else {
      grovePointer.set(e.pointerId, roam.dataset.grove);
      syncGrove();
      if (roam.dataset.grove === 'jump') grove.command('jump');
    }
  });
  const release = (e) => {
    const run = e.target.closest?.('[data-control]');
    if (run) game.command(run.dataset.control, false);
    if (grovePointer.delete(e.pointerId)) syncGrove();
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) document.addEventListener(type, release, true);

  // Gesta na herní ploše: tah = pruh, skok nebo podřep; ťuknutí = kousnutí.
  let swipe = null;
  document.addEventListener('pointerdown', (e) => {
    if (!isSurface(e.target)) return;
    unlock();
    swipe = { x: e.clientX, y: e.clientY };
  });
  document.addEventListener('pointerup', (e) => {
    if (!swipe || shell.menuOpen()) return void (swipe = null);
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    const tap = Math.hypot(dx, dy) < 25;
    swipe = null;
    if (shell.inGrove()) return void (tap && grove.command('jump'));
    if (game.phase !== 'playing') return;
    if (tap) game.command('bite');
    else if (Math.abs(dx) > Math.abs(dy)) game.command(dx > 0 ? 'right' : 'left');
    else if (dy < 0) game.command('jump');
    else (game.command('duck'), game.command('duck', false));
  });
  document.addEventListener('pointercancel', () => {
    if (!swipe) return;
    swipe = null;
    game.duckHold = false;
  });

  let padState = {};
  /** Volá se jednou za snímek. */
  function pollGamepad() {
    const pad = [...(navigator.getGamepads?.() || [])].find(Boolean);
    if (!pad) return void (padState = {});
    const { now, pressed, released } = padEdges(pad, padState);
    padState = now;
    if (Object.values(pressed).some(Boolean)) unlock();
    if (shell.menuOpen()) {
      if (pressed.down || pressed.right) shell.moveFocus(1);
      if (pressed.up || pressed.left) shell.moveFocus(-1);
      if (pressed.a) shell.activateFocused();
      if (pressed.b || pressed.start) shell.back();
      return;
    }
    if (pressed.start) return onPause();
    if (shell.inGrove()) {
      grove.release();
      for (const [k, cmd] of [['left', 'left'], ['right', 'right'], ['up', 'forward'], ['down', 'back']]) if (now[k]) grove.keys.add(cmd);
      if (now.x) grove.keys.add('sprint');
      if (pressed.a) grove.command('jump');
      return;
    }
    if (pressed.left) game.command('left');
    if (pressed.right) game.command('right');
    if (pressed.a || pressed.up) game.command('jump');
    if (pressed.down || pressed.b) game.command('duck');
    if ((released.down || released.b) && !now.down && !now.b) game.command('duck', false);
    if (pressed.x) game.command('bite');
    if (prefs.vibrate && pressed.x) pad.vibrationActuator?.playEffect?.('dual-rumble', { duration: 40, strongMagnitude: 0.3, weakMagnitude: 0.5 }).catch(() => {});
  }

  window.addEventListener('blur', clear);
  return { clear, pollGamepad, syncGrove };
}
