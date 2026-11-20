// Nabídky a obrazovky. Shell neví nic o vykreslování hry; se hrou mluví jen přes `actions`
// a čte její stav. Základní obrazovku určuje fáze hry, nad ní se vrství okna (nastavení, nápověda…).
// Pravidla: Esc vrací o úroveň, fokus se po zavření vrací, odkud přišel, ničivá akce se ptá,
// a každé okno se na malé obrazovce posouvá.
import { h, fmt, focusables } from './dom.mjs';
import { PAGES } from './settings-schema.mjs';
import { CONTROLS, nextFocus } from '../input.mjs';
import { GUIDE, DIFFICULTY_NAMES } from '../game/guide.mjs';
import { REVIVE_COST, rankOf, describeMission, availableSkins, dateKey } from '../game/meta.mjs';
import { RUSH, NIGHT_BONUS } from '../game/core.mjs';
import { LEVELS } from '../game/progression.mjs';

const CREDITS = [
  ['Námět a vedení', 'Ondřej Kaplan'],
  ['První verze', 'Grok'],
  ['Verze 2', 'ChatGPT'],
  ['Verze 3', 'Claude'],
];
const SOURCES = [
  ['Model dinosaura', 'vytvořen v Meshy, účet autora hry'],
  ['Krajina a zvířata (43 modelů), kůra a skály', 'Quaternius, volné dílo CC0'],
  ['Půda', 'vlastní textura ze skriptu, CC0'],
  ['Zvuky', 'Kenney a fvcalderan, CC0'],
  ['Hudba (8 skladeb)', 'Suno, účet autora hry'],
  ['Písmo Fredoka', 'SIL Open Font License 1.1'],
  ['Three.js', 'licence MIT'],
];

export function createShell(c) {
  const { root, game, grove, settings, defs, prefs, save, actions, hud } = c;
  const baseLayer = h('div', { class: 'layer base' });
  const overLayer = h('div', { class: 'layer over' });
  const bar = h('div', { class: 'bar' });
  const info = h('div', { class: 'info' }, h('span', { class: 'now-playing' }), h('span', { class: 'env' }));
  root.append(baseLayer, bar, info, overLayer);

  let base = '';
  let results = null;
  const overlays = []; // { name, el, opener, onClose }
  let lastBack = 0;

  // ── pomocné stavebnice ────────────────────────────────────────────────────
  const AUTOFOCUS = new Set(['title.play', 'pause.resume', 'res.again']);
  const btn = (label, cid, onclick, cls = 'card', sub = '') => h('button', { class: 'btn ' + cls, type: 'button', 'data-autofocus': AUTOFOCUS.has(cid), dataset: { cid }, onclick }, h('span', {}, label), sub ? h('small', {}, sub) : null);
  const link = (label, cid, onclick) => h('button', { class: 'link', type: 'button', dataset: { cid }, onclick }, label);
  const panel = (name, title, overline, ...kids) =>
    h(
      'section',
      { class: 'screen', dataset: { screen: name }, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('div', { class: 'panel' }, h('header', {}, h('div', {}, overline ? h('p', { class: 'overline' }, overline) : null, h('h2', {}, title)), name === 'pause' || name === 'results' ? null : h('button', { class: 'close', type: 'button', 'aria-label': 'Zavřít', onclick: () => back() }, '×')), ...kids),
    );
  const top = () => (overlays.length ? overlays[overlays.length - 1].el : baseLayer);

  function focusDefault(container = top()) {
    const list = focusables(container);
    (container.querySelector('[data-autofocus]') || list.find((el) => !el.classList.contains('close')) || list[0])?.focus({ preventScroll: true });
  }

  // ── základní obrazovky ────────────────────────────────────────────────────
  function buildTitle() {
    const p = save.profile;
    const rank = rankOf(p.xp);
    const today = p.daily.date === dateKey() ? p.daily.score : 0;
    return h(
      'section',
      { class: 'title', dataset: { screen: 'title' } },
      h('div', { class: 'title-head' }, h('p', { class: 'overline' }, 'MALÝ DRAVEC. VELKÁ VÝPRAVA.'), h('h1', { class: 'wordmark' }, 'Dinoš'), h('p', { class: 'wordsub' }, 'pravěký běh'),
        h('button', { class: 'rankline', type: 'button', dataset: { cid: 'title.records' }, onclick: () => open('progress'), 'aria-label': 'Deník lovce' }, h('b', {}, rank.name), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(rank.progress * 100)}%` })), h('span', {}, `◆ ${fmt(p.bank)}`)),
      ),
      h('nav', { class: 'stack' },
        btn('Vyrazit na stezku', 'title.play', () => actions.start('run'), 'primary', `${DIFFICULTY_NAMES[prefs.difficulty]} · rekord ${fmt(p.best[prefs.difficulty])}`),
        btn('Denní výprava', 'title.daily', () => actions.start('daily'), 'card', today ? `stejná trať pro všechny · dnes ${fmt(today)}` : 'stejná trať pro všechny'),
        btn('Klidná výprava', 'title.practice', () => actions.start('practice'), 'card', 'bez prohry'),
        btn('Poběhat si v háji', 'title.free', () => actions.enterGrove(), 'card', 'volný pohyb'),
      ),
      h('nav', { class: 'links' }, link('Deník lovce', 'title.collection', () => open('progress')), link('Jak hrát', 'title.help', () => open('help')), link('Nastavení', 'title.settings', () => open('settings')), link('O hře', 'title.about', () => open('about')), prefs.dev ? link('Vývojář', 'title.dev', () => actions.openDeveloper()) : null),
      h('footer', { dataset: { cid: 'title.version' } }, `${c.viewKind() === 'webgl2' ? '3D vykreslování' : 'Úsporné vykreslování'} · ${c.version}`),
    );
  }

  function buildPause() {
    const s = game;
    return panel(
      'pause', 'Chvilka v kapradí', 'STEZKA POČKÁ',
      h('p', { class: 'lead' }, `Zatím ${fmt(s.distance)} m a ${fmt(s.score)} bodů. Dinoš ti nikam neuteče.`),
      h('nav', { class: 'stack' },
        btn('Pokračovat', 'pause.resume', () => actions.resume(), 'primary'),
        h('div', { class: 'row2' }, btn('Nastavení', 'pause.settings', () => open('settings')), btn('Jak hrát', 'pause.help', () => open('help'))),
        h('div', { class: 'row2' },
          btn('Začít znovu', 'pause.restart', () => confirm('Začít znovu?', 'Rozběhnutý běh se zahodí.', 'Začít znovu', () => actions.restart())),
          btn('Do menu', 'pause.toMenu', () => confirm('Odejít do menu?', s.practice ? 'Nasbíraný jantar si odneseš.' : 'Rozběhnutý běh se zahodí.', 'Do menu', () => actions.toMenu())),
        ),
        prefs.dev ? link('Vývojář · F3', 'pause.dev', () => actions.openDeveloper()) : null,
      ),
      h('p', { class: 'fine', dataset: { cid: 'pause.keys' } }, 'Esc nebo P pro návrat'),
    );
  }

  function buildResults() {
    const r = results;
    const s = r.summary;
    const g = r.gained;
    const stat = (label, value) => h('div', { class: 'stat' }, h('small', {}, label), h('b', {}, value));
    const overline = g.record ? `NOVÝ REKORD • ${DIFFICULTY_NAMES[s.difficulty].toUpperCase()}` : g.dailyRecord ? 'DENNÍ VÝPRAVA • NEJLEPŠÍ DNEŠNÍ BĚH' : r.daily ? 'DENNÍ VÝPRAVA' : 'KONEC BĚHU';
    const gains = [];
    if (g.xp) gains.push(h('li', {}, `+${fmt(g.xp)} zkušeností`));
    for (const m of g.missions) gains.push(h('li', { class: 'good' }, `Úkol splněn: ${m.text}`));
    if (g.rankUp) gains.push(h('li', { class: 'good' }, `Nová hodnost: ${g.rankUp}`));
    if (s.revived) gains.push(h('li', {}, 'Běh po oživení se do rekordů nepočítá.'));
    return panel(
      'results', g.record || g.dailyRecord ? 'To byla jízda!' : 'I dravec klopýtne.', overline,
      h('p', { class: 'lead', dataset: { cid: 'res.reason' } }, r.reason),
      h('div', { class: 'stats', dataset: { cid: 'res.stats' } }, stat('Vzdálenost', fmt(s.distance) + ' m'), stat('Skóre', fmt(s.score)), stat('Jantar', fmt(s.amber)), stat('Kousnutí', fmt(s.chomps)), stat('Nejdelší kombo', '×' + s.maxCombo), stat('Lovecký trans', s.rushes + '×')),
      gains.length ? h('ul', { class: 'gains' }, gains) : null,
      h('nav', { class: 'stack' },
        btn('Ještě jeden běh', 'res.again', () => actions.restart(), 'primary'),
        r.canRevive ? btn(`Vstát a běžet dál · ${REVIVE_COST} ◆`, 'res.revive', () => actions.revive(), 'card', `v zásobě ${fmt(save.profile.bank)} ◆ · jednou za běh`) : null,
        btn('Zpátky do menu', 'res.toMenu', () => actions.toMenu()),
      ),
      h('p', { class: 'fine', dataset: { cid: 'res.seed' } }, `Trať č. ${s.seed}`),
    );
  }

  const buildGroveBar = () => h('div', { class: 'grovebar', dataset: { screen: 'grove' } }, btn('← Zpět do menu', 'grove.back', () => actions.leaveGrove(), 'pill'), h('span', { class: 'fine' }, 'Šipky nebo WASD · Shift běh · mezerník skok'));

  // ── okna ──────────────────────────────────────────────────────────────────
  function buildSettings(state = { page: settings.pages[0] }) {
    const pages = [...settings.pages, ...(settings.pages.includes('data') ? [] : ['data'])];
    if (!pages.includes(state.page)) state.page = pages[0];
    const body = h('div', { class: 'rows' });
    const rerender = (focusId) => {
      const fresh = buildSettings(state);
      const current = overlays.find((o) => o.name === 'settings');
      current.el.replaceWith(fresh);
      current.el = fresh;
      (focusId && fresh.querySelector(`[data-focus="${focusId}"]`))?.focus({ preventScroll: true });
    };
    const change = (d, value, focusId) => Promise.resolve(settings.set(d.id, value)).catch(() => {}).finally(() => rerender(focusId));

    for (const d of defs.filter((x) => x.page === state.page && settings.visible(x))) {
      let control;
      if (d.type === 'action') control = h('button', { class: 'btn small', type: 'button', dataset: { focus: d.id, cid: d.id }, onclick: () => settings.run(d.id) }, d.actionLabel || d.label);
      else if (d.type === 'toggle') control = h('input', { type: 'checkbox', class: 'switch', checked: settings.get(d.id), 'aria-label': d.label, dataset: { focus: d.id, cid: d.id }, onchange: (e) => change(d, e.target.checked, d.id) });
      else if (d.type === 'range') {
        const out = h('output', {}, d.format ? d.format(settings.get(d.id)) : settings.get(d.id));
        control = h('div', { class: 'range' }, h('input', { type: 'range', min: d.min, max: d.max, step: d.step, value: settings.get(d.id), 'aria-label': d.label, dataset: { focus: d.id, cid: d.id }, oninput: (e) => { settings.set(d.id, Number(e.target.value)); out.textContent = d.format ? d.format(settings.get(d.id)) : settings.get(d.id); } }), out);
      } else if (d.segment)
        control = h('div', { class: 'segment', role: 'radiogroup', 'aria-label': d.label, dataset: { cid: d.id } }, d.options.map((o) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(settings.get(d.id) === o.value), class: settings.get(d.id) === o.value ? 'on' : '', dataset: { focus: d.id + ':' + o.value }, onclick: () => change(d, o.value, d.id + ':' + o.value) }, o.label)));
      else control = h('select', { 'aria-label': d.label, dataset: { focus: d.id, cid: d.id }, onchange: (e) => change(d, d.options[e.target.selectedIndex].value, d.id) }, d.options.map((o) => h('option', { selected: settings.get(d.id) === o.value }, o.label)));
      body.append(h('div', { class: 'setrow' + (d.type === 'range' || d.segment || d.type === 'select' ? ' wide' : '') }, h('div', { class: 'setlabel' }, h('span', {}, d.label), d.hint ? h('small', {}, d.hint) : null), control));
    }
    if (state.page === 'data') {
      body.append(
        h('div', { class: 'setrow' }, h('div', { class: 'setlabel' }, h('span', {}, 'Výchozí nastavení'), h('small', {}, 'Vrátí všechny volby. Postup a rekordy zůstanou.')), h('button', { class: 'btn small', type: 'button', dataset: { cid: 'set.reset', focus: 'set.reset' }, onclick: () => confirm('Obnovit výchozí nastavení?', 'Všechny volby se vrátí na původní hodnoty.', 'Obnovit', () => (settings.reset(), rerender('set.reset'))) }, 'Obnovit')),
        h('div', { class: 'setrow' }, h('div', { class: 'setlabel' }, h('span', {}, 'Postup a rekordy'), h('small', {}, 'Smaže hodnost, úkoly, zásobu jantaru i rekordy.')), h('button', { class: 'btn small danger', type: 'button', dataset: { cid: 'set.clearRecords', focus: 'set.clearRecords' }, onclick: () => confirm('Smazat postup a rekordy?', 'Tohle nejde vrátit.', 'Smazat', () => (actions.resetProfile(), rerender('set.clearRecords'))) }, 'Smazat')),
        h('p', { class: 'fine', dataset: { cid: 'set.storage' } }, settings.persistent && save.persistent ? 'Nastavení a postup se ukládají v tomto prohlížeči.' : 'V tomto prostředí se nic neuchová. Nastavení i postup platí jen do zavření stránky.'),
      );
    }
    const tabs = h('div', { class: 'tabs', role: 'tablist' }, pages.map((p) => h('button', { type: 'button', role: 'tab', 'aria-selected': String(p === state.page), class: p === state.page ? 'on' : '', dataset: { focus: 'tab:' + p }, onclick: () => ((state.page = p), rerender('tab:' + p)) }, PAGES[p])));
    return panel('settings', 'Nastavení', '', tabs, body, h('nav', { class: 'stack' }, btn('Hotovo', 'set.done', () => back(), 'primary')));
  }

  function buildProgress() {
    const p = save.profile;
    const rank = rankOf(p.xp);
    const missions = p.missions.map(describeMission).map((m) => h('li', {}, h('span', {}, m.text), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round((m.progress / m.target) * 100)}%` })), h('small', {}, `${fmt(m.progress)} / ${fmt(m.target)} · +${m.xp} zk.`)));
    const skins = c.viewKind() === 'webgl2'
      ? h('div', { class: 'skins', dataset: { cid: 'col.entries' } }, availableSkins(p).map((s) => h('button', { type: 'button', class: 'skin' + (p.skin === s.id ? ' on' : ''), disabled: !s.unlocked, 'aria-pressed': String(p.skin === s.id), onclick: () => (actions.setSkin(s.id), refresh('progress', buildProgress)) }, h('i', { style: `background:#${s.tint.toString(16).padStart(6, '0')}` }), h('span', {}, s.name), s.unlocked ? null : h('small', {}, s.rankName))))
      : null;
    const today = p.daily.date === dateKey() ? p.daily.score : 0;
    return panel(
      'progress', 'Deník lovce', 'POSTUP',
      h('div', { class: 'rankbox' }, h('b', {}, rank.name), h('span', { class: 'meter' }, h('i', { style: `width:${Math.round(rank.progress * 100)}%` })), h('small', {}, rank.next ? `${fmt(p.xp)} / ${fmt(rank.next.xp)} zkušeností · další hodnost ${rank.next.name}` : `${fmt(p.xp)} zkušeností · nejvyšší hodnost`), h('small', {}, `Zásoba jantaru ◆ ${fmt(p.bank)} · oživení stojí ${REVIVE_COST}`)),
      h('h3', {}, 'Úkoly'),
      missions.length ? h('ul', { class: 'missions' }, missions) : h('p', { class: 'fine' }, 'Všechny úkoly jsou splněné.'),
      skins ? h('h3', {}, 'Zbarvení') : null,
      skins,
      h('h3', {}, 'Rekordy'),
      h('div', { class: 'stats', dataset: { cid: 'rec.best' } }, ...Object.entries(DIFFICULTY_NAMES).map(([k, name]) => h('div', { class: 'stat' }, h('small', {}, name), h('b', {}, fmt(p.best[k])))), h('div', { class: 'stat' }, h('small', {}, 'Denní výprava dnes'), h('b', {}, fmt(today)))),
      h('p', { class: 'fine', dataset: { cid: 'rec.totals' } }, `Celkem ${fmt(p.totals.runs)} běhů, ${fmt(p.totals.distance)} m, ${fmt(p.totals.amber)} jantarů, ${fmt(p.totals.chomps)} kousnutí.`),
      h('nav', { class: 'stack' }, btn('Hotovo', 'progress.done', () => back(), 'primary')),
    );
  }

  function buildHelp() {
    const touch = document.body.classList.contains('touch');
    return panel(
      'help', 'Jak hrát', 'NÁPOVĚDA',
      h('p', { class: 'lead', dataset: { cid: 'help.goal' } }, 'Běž co nejdál. Překážky přeskakuj, podlézej nebo rozkousni, sbírej jantar a drž kombo. Jeden náraz bez štítu běh končí.'),
      h('h3', {}, 'Ovládání'),
      h('table', { class: 'controls', dataset: { cid: 'help.controls' } }, h('tbody', {}, CONTROLS.map((k) => h('tr', {}, h('th', {}, k.action), h('td', {}, touch ? k.touch : k.keys), h('td', { class: 'dimcell' }, touch ? k.keys : `ovladač: ${k.pad}`))))),
      h('h3', {}, 'Co na stezce potkáš'),
      h('ul', { class: 'guide', dataset: { cid: 'help.elements' } }, GUIDE.map((g) => h('li', {}, h('b', {}, g.name), h('span', {}, g.how), h('small', {}, (g.from ? `od ${fmt(g.from)} m` : 'od začátku') + (g.note ? ` · ${g.note}` : ''))))),
      h('h3', {}, 'Lovecký trans'),
      h('p', {}, `Jantar, kousnutí a těsné úhyby plní ukazatel pod rychlostí. Když se naplní, Dinoš na ${RUSH.time} sekund zrychlí, body se počítají dvakrát, jantar přitahuje i ze sousedního pruhu a větve, kořist, trní a kořeny prorazí. Kameny, kmeny a kutálející se překážky platí dál.`),
      h('h3', {}, 'Krajina, noc a déšť'),
      h('p', {}, `Stezka vede pěti úseky: ${LEVELS.map((l) => l.name).join(', ')}. Každý nový úsek přinese prémii a kus klidné cesty. Za posledním začíná další den a tempo se zvedá. V noci jsou odměny ${String(NIGHT_BONUS).replace('.', ',')}× vyšší. Za deště stojí louže všude a přebíhání mezi pruhy trvá déle.`),
      h('h3', {}, 'Režimy a postup'),
      h('p', { dataset: { cid: 'help.modes' } }, `Výprava se počítá do rekordů. Denní výprava má pro všechny stejnou trať a vlastní rekord dne. Klidná výprava nekončí nárazem a jen plní zásobu jantaru. Za běhy a splněné úkoly roste hodnost a odemykají se zbarvení. Po pádu jde jednou za běh vstát za ${REVIVE_COST} jantarů ze zásoby.`),
      h('nav', { class: 'stack' }, btn('Rozumím', 'help.done', () => back(), 'primary')),
    );
  }

  function buildAbout() {
    const rows = (list) => h('table', { class: 'controls' }, h('tbody', {}, list.map(([a, b]) => h('tr', {}, h('th', {}, a), h('td', {}, b)))));
    return panel('about', 'O hře', 'DINOŠ · PRAVĚKÝ BĚH', h('p', { class: 'lead', dataset: { cid: 'about.version' } }, `Verze ${c.version} · sestaveno ${c.built}`), h('h3', {}, 'Kdo na hře pracoval'), h('div', { dataset: { cid: 'about.credits' } }, rows(CREDITS)), h('h3', {}, 'Původ a licence'), h('div', { dataset: { cid: 'about.licences' } }, rows(SOURCES)), h('nav', { class: 'stack' }, btn('Zavřít', 'about.done', () => back(), 'primary')));
  }

  const builders = { settings: () => buildSettings(), progress: buildProgress, help: buildHelp, about: buildAbout };

  function confirm(title, text, yes, onYes) {
    const el = panel('confirm', title, 'POTVRZENÍ', h('p', { class: 'lead' }, text), h('nav', { class: 'row2' }, h('button', { class: 'btn card', type: 'button', 'data-autofocus': true, dataset: { cid: 'sys.confirm' }, onclick: () => back() }, 'Zpět'), h('button', { class: 'btn card danger', type: 'button', onclick: () => (back(), onYes()) }, yes)));
    el.classList.add('narrow');
    push('confirm', el);
  }

  function push(name, el, onClose) {
    const opener = document.activeElement;
    overlays.push({ name, el, opener, onClose });
    overLayer.append(el);
    layout();
    focusDefault(el);
  }
  function open(name) {
    if (overlays.some((o) => o.name === name)) return;
    if (['playing', 'ready'].includes(game.phase)) actions.pause();
    push(name, builders[name]());
  }
  /** Okno, které si staví někdo jiný (panel Vývojář). */
  function openExternal(name, el, onClose) {
    if (overlays.some((o) => o.name === name)) return;
    if (['playing', 'ready'].includes(game.phase)) actions.pause();
    el.hidden = false;
    push(name, el, onClose);
  }
  function refresh(name, build) {
    const o = overlays.find((x) => x.name === name);
    if (!o) return;
    const fresh = build();
    o.el.replaceWith(fresh);
    o.el = fresh;
    focusDefault(fresh);
  }
  function closeTop() {
    const o = overlays.pop();
    if (!o) return false;
    if (o.onClose) (o.el.hidden = true), o.onClose();
    else o.el.remove();
    layout();
    if (o.opener?.isConnected && o.opener.offsetParent !== null) o.opener.focus({ preventScroll: true });
    else focusDefault();
    return true;
  }
  function closeAll() {
    while (overlays.length) {
      const o = overlays.pop();
      if (o.onClose) (o.el.hidden = true), o.onClose();
      else o.el.remove();
    }
    layout();
  }

  /** Esc, tlačítko B na ovladači a křížek: vždy o jednu úroveň zpět. */
  function back() {
    const now = performance.now();
    if (now - lastBack < 250) return; // jeden stisk nesmí zavřít dvě úrovně
    lastBack = now;
    if (closeTop()) return;
    if (base === 'grove') actions.leaveGrove();
    else if (base === 'results') actions.toMenu();
    else if (base === 'pause') actions.resume();
    else if (base === 'hud') actions.pause();
  }

  /** Spodní vrstvy jsou pod oknem nedosažitelné (klávesnicí ani čtečkou). */
  function layout() {
    const covered = overlays.length > 0;
    baseLayer.inert = covered;
    bar.inert = covered;
    overlays.forEach((o, i) => (o.el.inert = i < overlays.length - 1));
    document.body.classList.toggle('modal', covered);
    hud.show({ hud: base === 'hud' && !covered, pads: base === 'hud' && !covered && game.phase === 'playing' && document.body.classList.contains('touch'), grovePads: base === 'grove' && !covered && document.body.classList.contains('touch'), countdown: base === 'hud' && !covered && (game.phase === 'ready' || c.resuming()) });
  }

  function buildBar() {
    const muted = prefs.audio.master === 0;
    bar.replaceChildren(
      h('button', { class: 'round', type: 'button', dataset: { cid: 'bar.mute' }, 'aria-label': muted ? 'Zapnout zvuk' : 'Vypnout zvuk', 'aria-pressed': String(muted), onclick: () => actions.toggleMute() }, muted ? '♪' : '♫'),
      h('button', { class: 'round', type: 'button', dataset: { cid: 'bar.nextTrack' }, 'aria-label': 'Další skladba', onclick: () => actions.nextTrack() }, '⏭'),
      document.documentElement.requestFullscreen ? h('button', { class: 'round', type: 'button', dataset: { cid: 'bar.fullscreen' }, 'aria-label': 'Celá obrazovka', onclick: () => actions.toggleFullscreen() }, '⛶') : null,
    );
  }

  /** Srovná nabídky se stavem hry. Volá se po každé změně fáze. */
  function sync({ rebuild = false } = {}) {
    const phase = game.phase;
    const next = phase === 'menu' ? (grove.active ? 'grove' : 'title') : phase === 'paused' ? (c.resuming() ? 'hud' : 'pause') : phase === 'dead' ? 'results' : 'hud';
    if (next !== base || rebuild) {
      base = next;
      const el = base === 'title' ? buildTitle() : base === 'pause' ? buildPause() : base === 'results' && results ? buildResults() : base === 'grove' ? buildGroveBar() : null;
      baseLayer.replaceChildren(...(el ? [el] : []));
      document.body.dataset.base = base;
      if (!overlays.length && base !== 'hud' && base !== 'grove') focusDefault();
      if (base === 'hud') document.activeElement?.blur?.();
    }
    buildBar();
    layout();
  }

  return {
    sync,
    open,
    openExternal,
    back,
    closeAll,
    confirm,
    setResults(r) {
      results = r;
    },
    info(nowPlaying, env) {
      info.children[0].textContent = nowPlaying;
      info.children[1].textContent = env;
    },
    menuOpen: () => overlays.length > 0 || base === 'title' || base === 'pause' || base === 'results',
    inGrove: () => base === 'grove' && !overlays.length,
    overlayOpen: () => overlays.length > 0,
    get base() {
      return base;
    },
    get screen() {
      return overlays.length ? overlays[overlays.length - 1].name : base;
    },
    moveFocus(step) {
      nextFocus(focusables(top()), document.activeElement, step)?.focus({ preventScroll: false });
    },
    activateDefault: () => focusDefault(),
    activateFocused() {
      const el = document.activeElement;
      if (el && el !== document.body && top().contains(el)) el.click();
      else focusDefault();
    },
  };
}
