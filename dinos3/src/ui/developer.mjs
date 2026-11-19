import { detailSprite } from '../render/details.mjs';
import { LEVELS, DETAILS, DETAIL_UNLOCK } from '../game/progression.mjs';
import { LIMITS, seekRun } from '../game/core.mjs';
import { TRACKS } from '../audio/music.mjs';
const $ = (id) => document.getElementById(id);
const check = (key, label, on = true) =>
  `<label class="dev-check"><span>${label}</span><input id="dev-${key}" type="checkbox" ${on ? 'checked' : ''}></label>`;
export class Developer {
  constructor({ game, environment, settings, audio, startPreview, setWire }) {
    Object.assign(this, { game, environment, settings, audio, startPreview, setWire });
    this.flags = {};
    this.envFlags = {};
    const panel = document.createElement('section');
    panel.id = 'developer';
    panel.className = 'modal-screen';
    panel.hidden = true;
    panel.innerHTML = `<div class="card developer-card"><div class="card-header"><div><span class="overline">LABORATOŘ PRAVĚKU · 2.7</span><h2>Vývojář</h2></div><button class="close" data-action="close" aria-label="Zavřít vývojáře">×</button></div><p>Testovací běhy neukládají rekordy. F3 otevře tento panel i během hry.</p><div class="dev-levels">${LEVELS.map((l, i) => `<button class="dev-level" data-level="${i}"><span>${l.at.toLocaleString('cs-CZ')} m</span><b>${l.name}</b><small>${l.note}</small></button>`).join('')}</div><div class="dev-row"><label>Vzdálenost (m)<input id="dev-distance" type="number" min="0" max="20000" step="100" value="0"></label><button id="dev-play" class="primary">Spustit test úseku →</button></div><details open><summary>Obloha a počasí</summary><div class="dev-grid"><label>Počasí<select id="dev-weather"><option value="auto">Proměnlivé</option><option value="clear">Slunečno</option><option value="rain">Déšť</option><option value="wind">Vítr</option><option value="heat">Vedro</option><option value="shower">Přeháňka</option></select></label><label>Denní doba<select id="dev-hour"><option value="">Automatická</option><option value="6">Svítání</option><option value="12">Poledne</option><option value="18.5">Soumrak</option><option value="0">Noc</option></select></label><label>Osvětlená část měsíce<input id="dev-moonPhase" type="range" min="0" max="1" step=".02" value=".78"></label><label>Hustota vegetace<input id="dev-density" type="range" min=".25" max="1.5" step=".05" value="1"></label>${[
      ['imported', 'Nové modely krajiny'],
      ['wildlife', 'Velcí dinosauři a zvířata'],
      ['moon', 'Měsíc'],
      ['stars', 'Hvězdy'],
      ['clouds', 'Mraky'],
      ['fog', 'Mlha do dálky'],
      ['rain', 'Kapky deště'],
      ['leaves', 'Listí ve větru'],
      ['fauna', 'Drobná fauna'],
    ]
      .map(([k, l]) => check(k, l))
      .join(
        '',
      )}</div></details><details><summary>Běh, překážky a ochrana</summary><div class="dev-grid">${check('invulnerable', 'Nezranitelnost')}${check('obstacles', 'Generovat překážky')}${check('moving', 'Pohyblivé překážky')}${check('wire', 'Zobrazit tělesnou kolizi', false)}<label>Rychlost běhu<select id="dev-speed"><option value="">Automatická</option><option value="6">6 m/s · pomalu</option><option value="12">12 m/s</option><option value="20">20 m/s</option><option value="27">27 m/s · rychle</option></select></label><label>Čas světa<select id="dev-time"><option value="50">1 : 50</option><option value="100" selected>1 : 100</option></select></label><label>Překážka<select id="dev-kind">${Object.keys(
      LIMITS,
    )
      .map(
        (k) =>
          `<option value="${k}">${{ rollingWood: 'Kutálející se větev', rollingRock: 'Pohyblivý kámen', root: 'Kořeny', pool: 'Brod', rock: 'Kámen', log: 'Nízký kmen', thorn: 'Trní', wood: 'Suchá větev', snack: 'Kořist', amber: 'Jantar', shield: 'Štít' }[k]}</option>`,
      )
      .join(
        '',
      )}</select></label><label>Pruh<select id="dev-lane"><option value="-1">Levý</option><option value="0" selected>Střední</option><option value="1">Pravý</option></select></label></div><div class="dev-row"><button id="dev-spawn" class="secondary">Vložit 30 m před Dinoše</button><button id="dev-clear" class="secondary">Odstranit překážky</button><button id="dev-shield" class="secondary">Přidat štít</button></div><p id="dev-feedback" role="status"></p></details><details><summary>Hudební režie · všech 8 skladeb</summary><label>Skladba<select id="dev-track">${Object.entries(
      TRACKS,
    )
      .map(([k, v]) => `<option value="${k}">${v}</option>`)
      .join(
        '',
      )}</select></label><div class="dev-row"><button id="dev-listen" class="secondary">Přehrát vybranou</button><button id="dev-next" class="secondary">Další náhodná</button></div><label>Délka úryvků<select id="dev-excerpt"><option value="0">Náhodně 60–95 s</option><option value="30">30 s · rychlý test</option><option value="120">120 s</option></select></label><p>První poslech od začátku, další z různých míst. Jedna hudební stopa v každém okamžiku.</p></details><details><summary>43 importovaných modelů · katalog</summary><div id="asset-gallery" class="dev-catalog"></div><p>CC0 modely Quaternius. Výtvarná rekonstrukce pozdní křídy: Parasaurolophus žil dříve než T. rex a Triceratops, jejich společný výskyt je herní licence. Drobné rostliny a živočichové jsou obecné motivy, nikoli rekonstrukce konkrétních dobových druhů.</p></details><details><summary>10 nových drobností z prostředí pozdní křídy</summary><div id="dev-catalog" class="dev-catalog"></div><p>Inspirace nivami Hell Creek před přibližně 66 miliony let. Drobní obratlovci, ryby a sladkovodní měkkýši mají fosilní oporu; listový opad, duté dřevo a náplavy jsou ekologickou interpretací. Modely jsou stylizované, nikoli rekonstrukce konkrétních druhů.</p></details><output id="dev-status"></output><div class="dev-row"><button id="dev-continue" class="primary">Použít a pokračovat →</button><button id="dev-reset" class="secondary">Obnovit výchozí hodnoty</button></div></div>`;
    $('interface').append(panel);
    for (const [kind, name] of DETAILS) {
      const tile = document.createElement('figure'),
        pic = detailSprite(kind),
        caption = document.createElement('figcaption');
      pic.setAttribute('role', 'img');
      pic.setAttribute('aria-label', name);
      caption.textContent = name + ' · od ' + DETAIL_UNLOCK[kind] + ' m';
      tile.append(pic, caption);
      $('dev-catalog').append(tile);
    }
    panel.querySelectorAll('[data-level]').forEach(
      (b) =>
        (b.onclick = () => {
          $('dev-distance').value = LEVELS[Number(b.dataset.level)].at + 200;
          this.preview();
        }),
    );
    $('dev-play').onclick = () => this.preview();
    $('dev-continue').onclick = () => {
      this.apply();
      if (game.phase === 'menu' || game.phase === 'dead') this.preview();
      else {
        game.resume();
        startPreview();
      }
    };
    $('dev-reset').onclick = () => this.reset();
    for (const k of ['imported', 'wildlife', 'moon', 'stars', 'clouds', 'fog', 'rain', 'leaves', 'fauna', 'moonPhase', 'density', 'hour'])
      $('dev-' + k).onchange = () => {
        this.envFlags[k] =
          k === 'hour'
            ? $('dev-hour').value === ''
              ? null
              : Number($('dev-hour').value)
            : ['moonPhase', 'density'].includes(k)
              ? Number($('dev-' + k).value)
              : $('dev-' + k).checked;
        this.apply();
      };
    for (const k of ['invulnerable', 'obstacles', 'moving'])
      $('dev-' + k).onchange = () => {
        this.flags[k] = $('dev-' + k).checked;
        this.apply();
      };
    $('dev-speed').onchange = () => {
      this.flags.speed = $('dev-speed').value === '' ? null : Number($('dev-speed').value);
      this.apply();
    };
    $('dev-wire').onchange = () => setWire($('dev-wire').checked);
    $('dev-weather').onchange = () => {
      settings.weather = $('dev-weather').value;
    };
    $('dev-time').onchange = () => {
      settings.timeScale = Number($('dev-time').value);
    };
    $('dev-spawn').onclick = () => {
      this.apply();
      if (game.phase === 'menu' || game.phase === 'dead') {
        $('dev-feedback').textContent = 'Nejprve spusť test úseku. Potom se vrať klávesou F3.';
        return;
      }
      game.spawn($('dev-kind').value, Number($('dev-lane').value), -30);
      $('dev-feedback').textContent = 'Překážka vložena. Použij „Použít a pokračovat“.';
    };
    $('dev-clear').onclick = () => {
      this.apply();
      game.objects = [];
      $('dev-feedback').textContent = 'Překážky odstraněny.';
    };
    $('dev-shield').onclick = () => {
      this.apply();
      game.shield = 1;
      $('dev-feedback').textContent = 'Štít připraven.';
    };
    $('dev-listen').onclick = async () => {
      await audio.unlock();
      const name = $('dev-track').value;
      const b = await audio.load(name, 'music/' + name + '.ogg');
      if (b) audio.player.choose(name);
    };
    $('dev-next').onclick = async () => {
      await audio.unlock();
      audio.player?.next();
    };
    $('dev-excerpt').onchange = async () => {
      await audio.unlock();
      if (audio.player) audio.player.excerptSeconds = Number($('dev-excerpt').value);
    };
    this.flags.invulnerable = true;
    void this.catalog();
  }
  async catalog() {
    try {
      const asset = (p) => window.DINO_ASSETS?.[p] || '/' + p;
      const [list, meta] = await Promise.all([
        fetch(asset('nature/manifest.json')).then((r) => r.json()),
        fetch(asset('nature/atlas.json')).then((r) => r.json()),
      ]);
      const image = new Image();
      image.src = asset('nature/scenery.webp');
      await image.decode();
      const animals = new Image();
      animals.src = asset('nature/fauna.webp');
      await animals.decode();
      for (const a of list) {
        const m = meta.models[a.id],
          spec = meta[m.atlas],
          tile = document.createElement('canvas');
        tile.width = tile.height = 160;
        const n = m.start + (m.frames > 1 ? 6 : 0);
        tile
          .getContext('2d')
          .drawImage(
            m.atlas === 'static' ? image : animals,
            (n % spec.cols) * spec.size,
            Math.floor(n / spec.cols) * spec.size,
            spec.size,
            spec.size,
            0,
            0,
            160,
            160,
          );
        const fig = document.createElement('figure'),
          caption = document.createElement('figcaption');
        caption.textContent = a.name;
        tile.setAttribute('aria-label', a.name);
        fig.append(tile, caption);
        $('asset-gallery').append(fig);
      }
    } catch {
      $('asset-gallery').textContent = 'Katalog modelů se nepodařilo načíst.';
    }
  }
  apply() {
    this.game.dev = { ...this.flags, enabled: true };
    this.game.practice = true;
    this.environment.options = { ...this.envFlags };
  }
  preview() {
    this.apply();
    seekRun(this.game, $('dev-distance').value);
    this.startPreview();
  }
  reset(preserveWeather = false) {
    this.flags = { invulnerable: true };
    this.envFlags = {};
    this.game.dev = {};
    this.environment.options = {};
    this.setWire(false);
    for (const k of [
      'imported',
      'wildlife',
      'moon',
      'stars',
      'clouds',
      'fog',
      'rain',
      'leaves',
      'fauna',
      'invulnerable',
      'obstacles',
      'moving',
    ])
      $('dev-' + k).checked = true;
    $('dev-wire').checked = false;
    $('dev-hour').value = '';
    $('dev-speed').value = '';
    $('dev-density').value = 1;
    $('dev-moonPhase').value = 0.78;
    if (!preserveWeather) {
      this.settings.weather = 'auto';
      this.settings.timeScale = 100;
    }
    $('dev-weather').value = this.settings.weather;
    $('dev-time').value = this.settings.timeScale;
    $('dev-excerpt').value = 0;
    if (this.audio.player) this.audio.player.excerptSeconds = 0;
  }
  status(d) {
    $('dev-status').textContent =
      `${d.renderer} · modely: ${d.nature?.models || 0}, zvířata: ${d.nature?.animals || 0} · ${d.fps} fps · ${Math.floor(d.distance)} m · hudební hlasy: ${d.audio.voices} · přehrání: ${d.audio.starts}`;
  }
}
