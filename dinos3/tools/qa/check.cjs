// Zkoušky nabídek v prohlížeči. Každá kontrola odpovídá jedné vadě verze 2.7 nebo jednomu pravidlu šablony.
// MODE=layout | funkce;  PW=/cesta/k/playwright;  hra na URL (výchozí http://127.0.0.1:8792/).
const { chromium } = require(process.env.PW || 'playwright');
const URL = process.env.URL || 'http://127.0.0.1:8792/';
let pass = 0, fail = 0;
const ok = (cond, name, detail = '') => { cond ? pass++ : fail++; console.log(`${cond ? '  ok  ' : 'CHYBA '} ${name}${detail ? '  [' + detail + ']' : ''}`); };
const ready = (p) => p.waitForFunction(() => window.dinosDiagnostics?.().ready, null, { timeout: 170000 });
const diag = (p) => p.evaluate(() => window.dinosDiagnostics());
// Kliknutí bez čekání Playwrightu na snímek (softwarové vykreslování dává pod 1 snímek/s a page.click vyprší).
// Zásah se přesto ověří: ve středu prvku musí ležet prvek sám, ne jiná vrstva.
const click = async (p, sel) => {
  const hit = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'chybí ' + sel;
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (!(top === el || el.contains(top))) return 'překryto: ' + sel + ' <- ' + (top ? top.className || top.tagName : 'nic');
    el.click();
    return '';
  }, sel);
  if (hit) throw new Error(hit);
};

async function layout(browser) {
  const sizes = { 'počítač 1280×720': [1280, 720, false], 'telefon na výšku 390×844': [390, 844, true], 'telefon na šířku 844×390': [844, 390, true], 'malý telefon na šířku 667×375': [667, 375, true], 'tablet 820×1180': [820, 1180, true] };
  for (const [name, [w, h, mobile]] of Object.entries(sizes)) {
    const ctx = await browser.newContext(mobile ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL);
    await ready(p);
    // Každý ovládací prvek obrazovky je vidět, nebo se k němu dá posunout.
    const reach = (sel) => p.evaluate((sel) => {
      const box = document.querySelector(sel);
      const scroller = box.matches('.title') ? box : box.querySelector('.panel');
      const bad = [];
      for (const el of box.querySelectorAll('button, input, select')) {
        if (el.offsetParent === null) continue;
        el.scrollIntoView({ block: 'nearest' });
        const r = el.getBoundingClientRect();
        if (r.top < -1 || r.bottom > innerHeight + 1 || r.left < -1 || r.right > innerWidth + 1) bad.push(el.dataset.cid || el.textContent.trim().slice(0, 16));
      }
      return { bad, count: box.querySelectorAll('button, input, select').length, overflowY: getComputedStyle(scroller).overflowY, hscroll: document.documentElement.scrollWidth > innerWidth };
    }, sel);
    let r = await reach('[data-screen="title"]');
    ok(r.bad.length === 0 && r.count >= 8, `${name}: hlavní menu – všech ${r.count} prvků dosažitelných`, r.bad.join(','));
    ok(!r.hscroll, `${name}: bez vodorovného posuvu`);
    for (const screen of ['settings', 'progress', 'help', 'about']) {
      await p.evaluate((s) => window.__dinos.shell.open(s), screen);
      r = await reach(`[data-screen="${screen}"]`);
      ok(r.bad.length === 0, `${name}: ${screen} – prvky dosažitelné`, r.bad.join(','));
      await p.evaluate(() => window.__dinos.shell.closeAll());
    }
    await p.evaluate(() => { window.__dinos.start('practice'); window.__dinos.actions.pause(); });
    r = await reach('[data-screen="pause"]');
    ok(r.bad.length === 0 && r.count >= 5, `${name}: pauza – prvky dosažitelné`, r.bad.join(','));
    ok(errs.length === 0, `${name}: bez chyb stránky`, errs[0]);
    await ctx.close();
  }
}

async function funkce(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto(URL);
  await ready(p);
  const active = () => p.evaluate(() => document.activeElement?.dataset?.cid || document.activeElement?.dataset?.focus || document.activeElement?.tagName);
  const screen = () => p.evaluate(() => window.__dinos.shell.screen);

  console.log('— klávesnice a fokus');
  ok((await active()) === 'title.play', 'po načtení je fokus na hlavním tlačítku', await active());
  ok(await p.evaluate(() => [...document.querySelectorAll('[data-screen="title"] button, .bar button')].every((el) => { const r = el.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t === el || el.contains(t); })), 'každé tlačítko hlavního menu jde zasáhnout myší (nic ho nepřekrývá)');
  await p.keyboard.press('ArrowDown');
  ok((await active()) === 'title.daily', 'šipka dolů posune fokus', await active());
  await p.focus('[data-cid="title.settings"]');
  await p.keyboard.press('Enter');
  ok((await screen()) === 'settings' && (await diag(p)).phase === 'menu', 'Enter na „Nastavení“ otevře nastavení, ne běh', await screen());
  await p.waitForTimeout(300);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(100);
  ok((await screen()) === 'title' && (await active()) === 'title.settings', 'Esc zavře a fokus se vrátí na „Nastavení“', await active());
  await p.focus('[data-cid="title.help"]');
  await p.keyboard.press('Space');
  ok((await screen()) === 'help', 'mezerník na „Jak hrát“ otevře nápovědu');
  ok(await p.evaluate(() => document.querySelector('.layer.base').inert && document.querySelector('.bar').inert), 'vrstvy pod oknem jsou nedosažitelné');
  await p.evaluate(() => window.__dinos.shell.closeAll());

  console.log('— nastavení: každá volba něco dělá');
  const probes = await p.evaluate(async () => {
    const { settings, defs } = window.__dinos;
    const out = [];
    for (const d of defs) {
      if (d.type === 'action' || !settings.visible(d) || d.id === 'set.fullscreen') continue;
      const other = d.type === 'toggle' ? !d.def : d.type === 'range' ? (d.def === d.min ? d.max : d.min) : d.options.find((o) => o.value !== d.def).value;
      await settings.set(d.id, other);
      const changed = settings.probeAll().find((x) => x.id === d.id);
      await settings.set(d.id, d.def);
      const back = settings.probeAll().find((x) => x.id === d.id);
      out.push({ id: d.id, ok: changed.ok && changed.value === other && back.ok });
    }
    return out;
  });
  ok(probes.length >= 15 && probes.every((x) => x.ok), `apply a probe souhlasí u všech ${probes.length} voleb`, probes.filter((x) => !x.ok).map((x) => x.id).join(','));
  ok(await p.evaluate(() => { const { settings } = window.__dinos; settings.set('set.shadows', false); const a = window.__dinos.view.shadows; settings.set('set.shadows', true); return a === false && window.__dinos.view.shadows === true; }), 'stíny se ve 3D opravdu vypnou a zapnou');
  await p.evaluate(() => window.__dinos.shell.open('settings'));
  await click(p, '[data-focus="tab:zvuk"]');
  await p.evaluate(() => { const el = document.querySelector('[data-cid="set.vol.master"]'); el.value = 30; el.dispatchEvent(new Event('input', { bubbles: true })); });
  ok(await p.evaluate(() => Math.abs(window.__dinos.prefs.audio.master - 0.3) < 1e-9), 'posuvník hlasitosti změní hlasitost');
  await click(p, '[data-focus="tab:data"]');
  await click(p, '[data-cid="set.devMode"]');
  ok(await p.evaluate(() => window.__dinos.prefs.dev === true), 'vývojářský režim jde zapnout v nastavení');
  await p.evaluate(() => window.__dinos.shell.closeAll());

  console.log('— vývojář neprosakuje do nastavení hráče');
  ok(await p.evaluate(() => Boolean(document.querySelector('[data-cid="title.dev"]')) || (window.__dinos.shell.sync({ rebuild: true }), Boolean(document.querySelector('[data-cid="title.dev"]')))), 'položka Vývojář se objeví až se zapnutým režimem');
  await p.evaluate(() => { window.__dinos.actions.openDeveloper(); const w = document.getElementById('dev-weather'); w.value = 'rain'; w.dispatchEvent(new Event('change')); window.__dinos.shell.closeAll(); window.__dinos.settings.set('set.vol.music', 40); });
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('dinos3:settings')).values);
  ok(stored['set.world.weather'] === undefined || stored['set.world.weather'] === 'auto', 'počasí z panelu Vývojář se neuloží', String(stored['set.world.weather']));
  ok(stored['set.vol.master'] === 30 && stored['set.vol.music'] === 40, 'hráčovy volby se uloží');

  console.log('— běh, pauza, potvrzení');
  await p.evaluate(() => window.__dinos.start('run'));
  await p.waitForFunction(() => window.dinosDiagnostics().phase === 'playing', null, { timeout: 120000 });
  ok((await screen()) === 'hud', 'za běhu je vidět jen HUD');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  ok((await diag(p)).phase === 'paused' && (await active()) === 'pause.resume', 'Esc pozastaví a fokus je na „Pokračovat“');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.toasts')).display === 'none'), 'hlášky se v pauze nekreslí přes kartu');
  await click(p, '[data-cid="pause.restart"]');
  ok((await screen()) === 'confirm' && (await active()) === 'sys.confirm', '„Začít znovu“ se ptá a fokus je na „Zpět“', (await screen()) + ' ' + (await active()));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  ok((await screen()) === 'pause' && (await diag(p)).phase === 'paused', '„Zpět“ běh nezahodí');
  const before = (await diag(p)).distance;
  // Stav se čte ve stejné úloze jako návrat: při softwarovém vykreslování trvá jeden snímek déle než celý odpočet.
  const resuming = await p.evaluate(() => { window.__dinos.shell.back(); return window.dinosDiagnostics(); });
  ok(resuming.phase === 'paused' && resuming.screen === 'hud', 'po návratu běží krátký odpočet', resuming.phase + ' ' + resuming.screen);
  await p.waitForFunction(() => window.dinosDiagnostics().phase === 'playing', null, { timeout: 30000 });
  ok((await diag(p)).distance >= before, 'po odpočtu běh pokračuje');

  console.log('— herní prvky v živé hře');
  await p.evaluate(() => { window.__seen = false; const b = document.querySelector('.banner'); new MutationObserver(() => { if (!b.hidden && document.body.classList.contains('rush')) window.__seen = b.textContent; }).observe(b, { attributes: true, childList: true }); window.__dinos.game.addRage(1); });
  const seen = await p.waitForFunction(() => window.__seen, null, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => '');
  ok(/trans/i.test(seen), 'lovecký trans: oznámení a záře', seen);
  await p.evaluate(() => { const g = window.__dinos.game; g.objects = []; g.rush = 0; g.rage = 0; g.shield = 0; g.invincible = 0; g.amber = 4; g.spawn('rock', 0, -2); });
  await p.waitForFunction(() => window.dinosDiagnostics().phase === 'dead', null, { timeout: 60000 });
  await p.waitForTimeout(300);
  ok((await screen()) === 'results' && (await active()) === 'res.again', 'po pádu výsledky s fokusem na „Ještě jeden běh“', (await screen()) + ' ' + (await active()));
  const prof = await p.evaluate(() => window.__dinos.save.profile);
  ok(prof.xp > 0 && prof.bank === 4 && prof.totals.runs === 1, 'běh se započítal: zkušenosti, jantar, počet běhů', JSON.stringify([prof.xp, prof.bank, prof.totals.runs]));
  ok(!(await p.$('[data-cid="res.revive"]')), 'bez zásoby jantaru se oživení nenabízí');

  console.log('— oživení');
  await p.evaluate(() => { const d = window.__dinos; d.save.setProfile({ ...d.save.profile, bank: 40 }); d.start('run'); });
  await p.waitForFunction(() => window.dinosDiagnostics().phase === 'playing', null, { timeout: 120000 });
  await p.evaluate(() => { const g = window.__dinos.game; g.objects = []; g.spawn('rock', 0, -2); });
  await p.waitForFunction(() => window.dinosDiagnostics().phase === 'dead', null, { timeout: 60000 });
  await p.waitForTimeout(300);
  const runsBefore = await p.evaluate(() => window.__dinos.save.profile.totals.runs);
  await click(p, '[data-cid="res.revive"]');
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ phase: window.__dinos.game.phase, bank: window.__dinos.save.profile.bank, runs: window.__dinos.save.profile.totals.runs }));
  ok(after.phase === 'playing' && after.bank === 15 && after.runs === runsBefore, 'oživení stojí 25 jantarů, běh pokračuje a nezapočítá se dvakrát', JSON.stringify(after));

  console.log('— uložení přežije nové načtení');
  await p.evaluate(() => window.__dinos.actions.toMenu());
  const saved = await p.evaluate(() => window.__dinos.save.profile.xp);
  await p.reload();
  await ready(p);
  const again = await p.evaluate(() => ({ xp: window.__dinos.save.profile.xp, vol: window.__dinos.settings.get('set.vol.master'), dev: window.__dinos.prefs.dev }));
  ok(again.xp === saved && again.vol === 30 && again.dev === true, 'profil i nastavení zůstaly', JSON.stringify(again));

  console.log('— úsporné vykreslení');
  await p.evaluate(() => window.__dinos.settings.set('set.renderer', 'canvas'));
  await p.reload();
  await ready(p);
  const c2 = await p.evaluate(() => ({ kind: window.__dinos.view.kind, shadows: window.__dinos.settings.visible(window.__dinos.defs.find((d) => d.id === 'set.shadows')), quality: window.__dinos.settings.visible(window.__dinos.defs.find((d) => d.id === 'set.quality')) }));
  ok(c2.kind === 'canvas2d', 'volba „Úsporné 2D“ po načtení platí', c2.kind);
  ok(c2.shadows === false && c2.quality === false, 've 2D se stíny a ostrost nenabízejí');
  await p.evaluate(() => window.__dinos.shell.open('progress'));
  ok(!(await p.$('.skins')), 've 2D se zbarvení nenabízí');
  await p.evaluate(() => { window.__dinos.shell.closeAll(); window.__dinos.start('practice'); });
  await p.waitForFunction(() => window.dinosDiagnostics().distance > 3, null, { timeout: 120000 });
  ok(true, 've 2D jde hrát');
  await p.evaluate(() => { localStorage.setItem('dinos3:profile', '{"xp":"x",'); localStorage.setItem('dinos3:settings', '###'); });
  await p.reload();
  await ready(p);
  ok(await p.evaluate(() => window.__dinos.save.profile.missions.length === 3 && window.__dinos.settings.get('set.vol.master') === 80), 'poškozené záznamy vrátí výchozí stav');
  ok(errs.length === 0, 'bez chyb v konzoli', errs.slice(0, 2).join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--disable-gpu'] });
  try {
    if ((process.env.MODE || 'layout') === 'layout') await layout(browser);
    else await funkce(browser);
  } catch (e) {
    fail++;
    console.log('CHYBA  zkouška spadla: ' + e.message.split('\n')[0]);
  }
  console.log(`\nProhlížeč (${process.env.MODE || 'layout'}): ${pass} prošlo, ${fail} selhalo`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
