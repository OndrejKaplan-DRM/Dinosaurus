// Rychlá kouřová zkouška v prohlížeči: načtení, chyby v konzoli a snímky hlavních obrazovek.
// Spuštění: (npx vite --host 127.0.0.1 --port 8792 &) ; PW=/cesta/k/playwright OUT=/tmp/shots node tools/qa/smoke.cjs
const { chromium } = require(process.env.PW || 'playwright');
const OUT = (process.env.OUT || '/tmp') + '/';
const URL = process.env.URL || 'http://127.0.0.1:8792/';
const SIZES = { pc: [1280, 720, false], vyska: [390, 844, true], sirka: [844, 390, true] };
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--disable-gpu'] });
  for (const name of (process.env.ONLY || 'pc,vyska,sirka').split(',')) {
    const [w, h, mobile] = SIZES[name];
    const ctx = await browser.newContext(mobile ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    await page.goto(URL);
    await page.waitForFunction(() => window.dinosDiagnostics?.().ready, null, { timeout: 170000 });
    const shot = async (n) => { await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}${name}_${n}.png`, timeout: 170000 }); };
    const d = await page.evaluate(() => window.dinosDiagnostics());
    console.log(name, d.version, d.renderer, d.screen);
    await shot('1_menu');
    for (const s of (process.env.SCREENS || 'settings,progress,help').split(',')) {
      await page.evaluate((x) => window.__dinos.shell.open(x), s);
      await shot('2_' + s);
      await page.evaluate(() => window.__dinos.shell.closeAll());
    }
    await page.evaluate(() => window.__dinos.start('practice'));
    await page.waitForFunction(() => window.dinosDiagnostics().distance > 5, null, { timeout: 170000 });
    await page.evaluate(() => window.__dinos.game.addRage(1));
    await shot('3_hra');
    await page.evaluate(() => window.__dinos.actions.pause());
    await shot('4_pauza');
    console.log(name, 'chyby:', errs.length, errs.slice(0, 4));
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
