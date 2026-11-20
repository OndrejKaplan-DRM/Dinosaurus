// Ukazatele během hry: stav běhu, lovecký trans, oznámení a dotyková tlačítka.
import { h, fmt } from './dom.mjs';
import { LANE, obstacleX } from '../game/core.mjs';
import { HINTS, DIFFICULTY_NAMES } from '../game/guide.mjs';

export function createHud({ root, onPause }) {
  const el = {
    mode: h('span', { class: 'hud-mode' }),
    metres: h('b', { class: 'hud-metres' }, '0'),
    speed: h('span', { class: 'hud-speed' }),
    score: h('b', { class: 'hud-score' }, '0'),
    combo: h('span', { class: 'hud-combo' }),
    status: h('span', { class: 'hud-status' }),
    rage: h('i'),
    badges: h('div', { class: 'hud-badges' }),
    hint: h('div', { class: 'hud-hint', role: 'status' }),
    banner: h('div', { class: 'banner', hidden: true }),
    countdown: h('div', { class: 'countdown', hidden: true }),
    toasts: h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }),
  };
  const rageBar = h('div', { class: 'hud-rage', title: 'Lovecký trans' }, el.rage);
  const hud = h(
    'div',
    { class: 'hud', hidden: true },
    h('div', { class: 'hud-left' }, el.mode, h('div', {}, el.metres, h('small', {}, ' m')), el.speed, rageBar, el.badges),
    h('div', { class: 'hud-right' }, h('small', {}, 'SKÓRE'), el.score, el.combo, el.status, h('button', { class: 'pill', dataset: { cid: 'bar.pause' }, onclick: onPause, 'aria-label': 'Pauza' }, 'II Pauza')),
    el.hint,
  );
  const pad = (control, label, cls = '') => h('button', { class: 'pad ' + cls, dataset: { control }, 'aria-label': label }, label);
  const pads = h('div', { class: 'pads', hidden: true }, h('div', { class: 'pads-left' }, pad('left', '←'), pad('right', '→')), h('div', { class: 'pads-right' }, pad('duck', '↓'), pad('jump', '↑'), pad('bite', 'Křup!', 'wide')));
  const gpad = (grove, label, cls = '') => h('button', { class: 'pad ' + cls, dataset: { grove }, 'aria-label': label }, label);
  const grovePads = h('div', { class: 'pads', hidden: true }, h('div', { class: 'pads-left cross' }, gpad('forward', '↑'), gpad('left', '←'), gpad('back', '↓'), gpad('right', '→')), h('div', { class: 'pads-right' }, gpad('sprint', 'Běh', 'wide'), gpad('jump', 'Skok', 'wide')));
  root.append(hud, pads, grovePads, el.banner, el.countdown, el.toasts);

  let toasts = [];
  let bannerLeft = 0;
  const renderToasts = () => el.toasts.replaceChildren(...toasts.map((t) => h('div', { class: 'toast' + (t.small ? ' small' : '') }, t.text)));

  return {
    el: hud,
    show({ hud: showHud, pads: showPads, grovePads: showGrovePads, countdown }) {
      hud.hidden = !showHud;
      pads.hidden = !showPads;
      grovePads.hidden = !showGrovePads;
      el.countdown.hidden = !countdown;
      if (!showHud) el.banner.hidden = true;
    },
    toast(text, small = false) {
      toasts.push({ text, small, left: 1.6 });
      toasts = toasts.slice(-3);
      renderToasts();
    },
    clearToasts() {
      toasts = [];
      renderToasts();
    },
    /** Velké oznámení uprostřed: nový úsek, další den, lovecký trans. */
    banner(title, sub = '') {
      el.banner.replaceChildren(h('b', {}, title), sub ? h('span', {}, sub) : null);
      el.banner.hidden = false;
      bannerLeft = 2.6;
    },
    countdownText(text) {
      el.countdown.textContent = text;
    },
    /** Časovače oznámení; volá se každý snímek se skutečným časem. */
    tick(dt) {
      if (bannerLeft > 0 && (bannerLeft -= dt) <= 0) el.banner.hidden = true;
      if (!toasts.length) return;
      for (const t of toasts) t.left -= dt;
      if (toasts.some((t) => t.left <= 0)) {
        toasts = toasts.filter((t) => t.left > 0);
        renderToasts();
      }
    },
    /** Čísla a rady; stačí několikrát za sekundu. */
    update(s, { prefs, daily }) {
      el.mode.textContent = s.dev?.enabled ? 'VÝVOJÁŘ · BEZ REKORDŮ' : s.practice ? 'KLIDNÁ VÝPRAVA' : daily ? 'DENNÍ VÝPRAVA' : DIFFICULTY_NAMES[s.difficulty].toUpperCase();
      el.metres.textContent = fmt(s.distance);
      el.speed.textContent = fmt(s.speed * 3.6) + ' km/h';
      el.score.textContent = fmt(s.score);
      el.combo.textContent = s.combo > 1 ? '×' + s.combo : '';
      el.status.textContent = s.shield ? '◇ Štít připraven' : '';
      el.rage.style.width = Math.round(s.rage * 100) + '%';
      rageBar.classList.toggle('on', s.rush > 0);
      const badges = [];
      if (s.rush > 0) badges.push('Trans ×2');
      if (s.isNight()) badges.push('Noční lov ×1,25');
      if (s.isWet()) badges.push('Kluzko');
      if (s.lap > 0) badges.push('Den ' + (s.lap + 1));
      if (el.badges.dataset.key !== badges.join('|')) {
        el.badges.dataset.key = badges.join('|');
        el.badges.replaceChildren(...badges.map((b) => h('span', {}, b)));
      }
      el.countdown.textContent = s.countdown > 0.65 ? 'Připrav se…' : s.countdown > 0.25 ? 'Na stezku…' : 'Běž!';
      let hint = '';
      if (prefs.hints && s.phase === 'playing' && (s.distance < 230 || s.practice)) {
        const reach = Math.max(12, s.speed * 1.3);
        const next = s.objects.filter((o) => o.active && o.z < 0 && o.z > -reach && Math.abs(s.x - obstacleX(o, s.time, s.dev)) < LANE * 0.47).sort((a, b) => b.z - a.z)[0];
        if (next) hint = HINTS[next.kind];
      }
      el.hint.textContent = hint;
    },
  };
}
