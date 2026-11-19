/** Pravidla běhu. Nezávisí na vykreslování ani na prohlížeči; jednotky metry a sekundy, vpřed = −Z.
 * Zranitelný je jen trup, ocas je ozdoba. Kolize jsou průniky drah mezi dvěma kroky,
 * nikdy „dotyk v jednom okamžiku“, takže rychlý hráč překážkou neproletí. */
import { LEVELS, levelAt } from './progression.mjs';

export const LANE = 2.35;
export const STEP = 1 / 120;

/** Rozměry prvků na trati: poloviční šířka, poloviční délka, výška (u klády i spodní hrana). */
export const LIMITS = {
  rollingWood: { rx: 0.55, z: 0.35, top: 0.55 },
  rollingRock: { rx: 0.62, z: 0.66, top: 0.82 },
  root: { rx: 0.7, z: 0.5, top: 0.44 },
  pool: { rx: 0.8, z: 1, top: 0.1 },
  rock: { rx: 0.62, z: 0.66, top: 0.82 },
  log: { rx: 0.91, z: 0.32, bottom: 1.16, top: 1.79 },
  thorn: { rx: 0.64, z: 0.55, top: 1.9 },
  wood: { rx: 0.65, z: 0.6, top: 1.26 },
  snack: { rx: 0.37, z: 0.4, top: 0.56 },
  amber: { rx: 0.34, z: 0.34 },
  shield: { rx: 0.4, z: 0.4 },
};

/** Tempo: počáteční rychlost, strop, zrychlení na metr a čas mezi řadami při stropu. */
export const PACE = {
  klid: { start: 8.8, cap: 16, acc: 0.012, interval: 1.8 },
  lov: { start: 11, cap: 23, acc: 0.019, interval: 1.5 },
  dravec: { start: 13, cap: 27, acc: 0.025, interval: 1.32 },
};

/** Lovecký trans: plní se sbíráním a kousáním, pak na chvíli zrychlí a prorazí měkké překážky. */
export const RUSH = { time: 6, speed: 1.18, score: 2, magnet: 2.4, amber: 0.08, chomp: 0.12, dodge: 0.03, decay: 0.012 };
const SOFT = new Set(['wood', 'snack', 'thorn', 'root']);
/** Po vstupu do nového úseku: úsek bez překážek (m), a od kdy začínají další dny. */
export const STAGE = { breather: 60, lookahead: 100, lapStart: 4500, lapLength: 1500, lapMax: 4 };
export const NIGHT_BONUS = 1.25;
const WET_AT = 0.45;
const NIGHT_BELOW = 0.25;

/** Pohyblivé překážky se kývají uvnitř svého pruhu; stejná poloha platí pro kolize i obraz. */
export function obstacleX(o, time, dev = {}) {
  const moving = (o.kind === 'rollingWood' || o.kind === 'rollingRock') && dev?.moving !== false;
  return o.lane * LANE + (moving ? Math.sin(time * 1.6 + o.id * 2.4) * 0.35 : 0);
}

/** Vývojářský skok na vzdálenost. Běh se označí jako zkušební. */
export function seekRun(s, distance) {
  const d = Math.max(0, Math.min(20000, Number(distance) || 0));
  s.start();
  s.distance = s.world = d;
  s.nextAt = d + 36;
  s.rows = 6;
  s.milestone = (Math.floor(d / 250) + 1) * 250;
  s.stage = levelAt(d);
  s.lap = lapAt(d);
  s.cleanFrom = d;
  s.dev = { ...s.dev, enabled: true };
  s.practice = true;
}

export function lapAt(distance) {
  return Math.max(0, Math.floor((distance - STAGE.lapStart) / STAGE.lapLength));
}

/** Opakovatelný generátor (mulberry32). */
export function random(seed = 0xd1905) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Kdy během kroku (0–1) leží bod jdoucí z a do b uvnitř intervalu ⟨min, max⟩. */
export function sweepInterval(a, b, min, max) {
  if (Math.abs(b - a) < 1e-10) return a >= min && a <= max ? [0, 1] : null;
  const t0 = (min - a) / (b - a);
  const t1 = (max - a) / (b - a);
  const enter = Math.max(0, Math.min(t0, t1));
  const exit = Math.min(1, Math.max(t0, t1));
  return enter <= exit ? [enter, exit] : null;
}

function sweepContact(x0, x1, z0, z1, y0, y1, rx, hz, minY, maxY) {
  let enter = 0;
  let exit = 1;
  for (const interval of [sweepInterval(x0, x1, -rx, rx), sweepInterval(z0, z1, -hz, hz), sweepInterval(y0, y1, minY, maxY)]) {
    if (!interval) return null;
    enter = Math.max(enter, interval[0]);
    exit = Math.min(exit, interval[1]);
  }
  return enter <= exit ? enter : null;
}

const HIT_ADVICE = {
  log: 'Kmen byl příliš nízko. Zkus se přikrčit.',
  thorn: 'Trní raději oběhni.',
  wood: 'Suchou větev můžeš rozkousnout mezerníkem.',
  snack: 'Kořist rozkousni nebo přeskoč.',
};

export class Runner {
  constructor({ seed = 1, difficulty = 'lov', practice = false, onEvent = () => {} } = {}) {
    this.seed = seed >>> 0;
    this.rng = random(seed);
    this.difficulty = difficulty in PACE ? difficulty : 'lov';
    this.practice = practice;
    this.onEvent = onEvent;
    this.phase = 'menu';
    this.reset();
    this.phase = 'menu';
  }

  reset() {
    Object.assign(this, {
      x: 0, lane: 0, y: 0, vy: 0, grounded: true,
      duck: 0, duckHold: false, duckMin: 0, duckGrace: 0, tailTuck: 0, jumpBuffer: 0,
      bite: 0, biteCd: 0, invincible: 0, shield: 0,
      score: 0, distance: 0, time: 0, world: 0, speed: 0,
      combo: 0, comboT: 0, amber: 0, chomps: 0, dodges: 0,
      nextAt: 36, rows: 0, objects: [], id: 0,
      stumble: 0, recover: false, hitSide: 1, shake: 0, flash: 0, land: 0,
      countdown: 1.05, started: false, reason: '', milestone: 250,
      // lovecký trans, etapy a údaje pro úkoly
      rage: 0, rush: 0, stage: 0, lap: 0, breatherUntil: 0, revived: false,
      jumps: 0, brushes: 0, rushes: 0, hits: 0, maxCombo: 0, cleanFrom: 0, bestClean: 0, nightDistance: 0, rainDistance: 0,
    });
  }

  emit(type, data = {}) {
    this.onEvent({ type, ...data });
  }

  /** Nový běh. Se zadaným seedem jde trať zopakovat (denní výprava, sdílení). */
  start({ seed } = {}) {
    if (seed !== undefined) {
      this.seed = seed >>> 0;
      this.rng = random(this.seed);
    }
    this.reset();
    this.phase = 'ready';
    this.speed = (PACE[this.difficulty] || PACE.lov).start;
    this.emit('start');
  }

  pause() {
    if (this.phase === 'playing' || this.phase === 'ready') {
      this.beforePause = this.phase;
      this.phase = 'paused';
      this.duckHold = false;
      this.emit('pause');
    }
  }

  resume() {
    if (this.phase === 'paused') {
      this.phase = this.beforePause || 'playing';
      this.emit('resume');
    }
  }

  menu() {
    this.phase = 'menu';
    this.objects = [];
    this.duckHold = false;
    this.emit('menu');
  }

  /** Jednou za běh lze po pádu vstát a pokračovat. Cenu řeší volající. */
  revive() {
    if (this.phase !== 'dead' || this.revived) return false;
    this.revived = true;
    this.phase = 'playing';
    this.invincible = 2.5;
    this.stumble = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.reason = '';
    this.cleanFrom = this.distance;
    this.objects = this.objects.filter((o) => o.z < -30);
    this.emit('revive');
    return true;
  }

  command(cmd, on = true) {
    if (this.phase !== 'playing') return;
    if (cmd === 'left' && on) this.lane = Math.max(-1, this.lane - 1);
    if (cmd === 'right' && on) this.lane = Math.min(1, this.lane + 1);
    if (cmd === 'jump' && on) this.jumpBuffer = 0.16;
    if (cmd === 'duck') {
      const was = this.duckHold;
      this.duckHold = on;
      if (on && this.grounded) {
        this.duckMin = 0.48;
        if (!was) this.emit('duck');
      }
    }
    if (cmd === 'bite' && on && this.biteCd <= 0) {
      this.bite = 0.32;
      this.biteCd = 0.4;
      this.emit('bite');
    }
  }

  spawn(kind, lane, z, y) {
    const o = { id: ++this.id, kind, lane, z, y: y ?? (kind === 'amber' ? 1.0 : kind === 'shield' ? 1.06 : 0), active: true, passed: false, bend: 0 };
    this.objects.push(o);
    return o;
  }

  isWet() {
    return (this.environment?.rain ?? 0) > WET_AT;
  }

  isNight() {
    return (this.environment?.day ?? 1) < NIGHT_BELOW;
  }

  /** Jedna řada trati. Nejvýš dva obsazené pruhy, jeden zůstává vždy volný. */
  row(z = -100) {
    const r = this.rng;
    const n = this.rows++;
    const lane = Math.floor(r() * 3) - 1;
    if (n < 6) {
      // Prvních šest řad učí: jantar, kámen, kláda, větev, kořist, štít.
      this.spawn(['amber', 'rock', 'log', 'wood', 'snack', 'shield'][n], [0, 0, 1, 0, -1, 0][n], z);
      return;
    }
    const q = r();
    if (q < 0.22) {
      for (let j = 0; j < 3; j++) this.spawn('amber', lane, z - j * 2, 1.0);
      return;
    }
    if (q < 0.29) {
      this.spawn('shield', lane, z);
      return;
    }
    const d = this.distance;
    const kinds =
      d < 150
        ? ['rock', 'log', 'wood', 'snack']
        : [
            'rock', 'log', 'wood', 'thorn', 'snack',
            ...(d >= 450 ? ['root'] : []),
            ...(d >= 900 || this.isWet() ? ['pool'] : []), // za deště stojí louže všude
            ...(d >= 1800 ? ['rollingWood'] : []),
            ...(d >= 3000 ? ['rollingRock'] : []),
          ];
    this.spawn(kinds[Math.floor(r() * kinds.length)], lane, z);
    if (q > 0.72 && d > 180) {
      const second = [-1, 0, 1].filter((x) => x !== lane)[Math.floor(r() * 2)];
      this.spawn(kinds[Math.floor(r() * kinds.length)], second, z);
    }
  }

  addRage(amount) {
    if (this.rush > 0) return;
    this.rage = Math.min(1, this.rage + amount);
    if (this.rage >= 1) {
      this.rush = RUSH.time;
      this.rushes++;
      this.emit('rushStart');
    }
  }

  hit(o) {
    if (this.phase !== 'playing' || this.invincible > 0) return;
    if (this.dev?.invulnerable) {
      o.active = false;
      this.emit('protected', { o });
      return;
    }
    if (this.rush > 0 && SOFT.has(o.kind)) {
      // V transu Dinoš měkké překážky prorazí.
      o.active = false;
      this.reward(40, 'Průraz');
      this.emit('break', { o, rush: true });
      return;
    }
    o.active = false;
    this.combo = 0;
    this.comboT = 0;
    this.hits++;
    this.bestClean = Math.max(this.bestClean, this.distance - this.cleanFrom);
    this.cleanFrom = this.distance;
    this.hitSide = o.lane === 0 ? (this.rng() < 0.5 ? -1 : 1) : Math.sign(o.lane);
    this.shake = 0.25;
    this.flash = 0.25;
    if (this.shield) {
      this.shield = 0;
      this.invincible = 1.25;
      this.emit('shieldBreak', { o });
      return;
    }
    this.phase = 'stumble';
    this.stumble = 0;
    this.recover = this.practice;
    this.rush = 0;
    this.rage = 0;
    this.reason = HIT_ADVICE[o.kind] || 'Příště přeskočit nebo uhnout.';
    this.emit('hit', { o });
  }

  /** Násobitel odměn: trans ×2, noční lov ×1,25. */
  get multiplier() {
    return (this.rush > 0 ? RUSH.score : 1) * (this.isNight() ? NIGHT_BONUS : 1);
  }

  reward(base, text) {
    this.combo = Math.min(8, this.combo + 1);
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.comboT = 3.5;
    const mul = this.multiplier;
    const gain = mul === 1 ? base * this.combo : Math.round(base * this.combo * mul);
    this.score += gain;
    this.emit('reward', { gain, text });
  }

  tick(dt = STEP) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.04);
    if (this.phase === 'paused' || this.phase === 'dead') return;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.land = Math.max(0, this.land - dt * 4);
    if (this.phase === 'menu') {
      this.world += dt * 1.5;
      return;
    }
    if (this.phase === 'ready') {
      this.countdown -= dt;
      if (this.countdown <= 0) {
        this.phase = 'playing';
        this.emit('go');
      }
      return;
    }
    if (this.phase === 'stumble') {
      this.stumble += dt;
      this.world += this.speed * dt * Math.max(0, 1 - this.stumble / 0.55) * 0.35;
      if (this.stumble > 0.72) {
        if (this.recover) {
          this.phase = 'playing';
          this.invincible = 1.5;
          this.y = 0;
          this.vy = 0;
          this.grounded = true;
          this.cleanFrom = this.distance;
          this.emit('recover');
        } else {
          this.bestClean = Math.max(this.bestClean, this.distance - this.cleanFrom);
          this.phase = 'dead';
          this.emit('end');
        }
      }
      return;
    }

    const pace = PACE[this.difficulty];
    const cap = pace.cap + Math.min(STAGE.lapMax, this.lap);
    const wet = this.isWet();
    const night = this.isNight();
    const rushing = this.rush > 0;
    this.speed = Number.isFinite(this.dev?.speed)
      ? Math.max(4, Math.min(30, this.dev.speed))
      : Math.min(cap, pace.start + this.distance * pace.acc) * (rushing ? RUSH.speed : 1);
    const travel = this.speed * dt;

    // Přesun mezi pruhy; na mokru to klouže a trvá déle.
    const oldX = this.x;
    const dx = this.lane * LANE - this.x;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), (wet ? 13 : 18) * dt);

    // Podřep: držený vydrží; po uvolnění počká, až pod kládou projede i ocas.
    this.duckMin = Math.max(0, this.duckMin - dt);
    this.duckGrace = Math.max(0, this.duckGrace - dt);
    let overhead = false;
    for (const o of this.objects) if (o.active && o.kind === 'log' && Math.abs(this.x - o.lane * LANE) < 1.12 && o.z > -2.9 && o.z < 2.4) overhead = true;
    const duckWanted = this.grounded && (this.duckHold || this.duckMin > 0 || this.duckGrace > 0 || (this.duck > 0.25 && overhead));
    this.duck += (Number(duckWanted) - this.duck) * Math.min(1, dt * 22);
    this.tailTuck += (Number(duckWanted || (overhead && this.duck > 0.1)) - this.tailTuck) * Math.min(1, dt * 16);

    if (this.jumpBuffer > 0) {
      this.jumpBuffer -= dt;
      if (this.grounded) {
        this.vy = 9.0;
        this.grounded = false;
        this.jumpBuffer = 0;
        this.duckMin = 0;
        this.duckGrace = 0;
        this.jumps++;
        this.emit('jump');
      }
    }
    const oldY = this.y;
    this.vy -= 25 * dt;
    this.y += this.vy * dt;
    if (this.y <= 0) {
      if (!this.grounded) {
        this.land = 1;
        this.emit('land');
      }
      this.y = 0;
      this.vy = 0;
      this.grounded = true;
    }

    this.bite = Math.max(0, this.bite - dt);
    this.biteCd = Math.max(0, this.biteCd - dt);
    this.invincible = Math.max(0, this.invincible - dt);
    this.distance += travel;
    this.world += travel;
    this.score += travel * 5 * (rushing ? RUSH.score : 1);
    if (night) this.nightDistance += travel;
    if (wet) this.rainDistance += travel;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;

    // Lovecký trans dobíhá, jinak nálada pomalu vyprchává.
    if (rushing) {
      this.rush -= dt;
      this.rage = Math.max(0, this.rush / RUSH.time);
      if (this.rush <= 0) {
        this.rush = 0;
        this.rage = 0;
        this.invincible = Math.max(this.invincible, 0.8);
        this.emit('rushEnd');
      }
    } else this.rage = Math.max(0, this.rage - dt * RUSH.decay);

    // Etapy: nový úsek krajiny přinese prémii, kus klidné stezky a trochu loveckého zápalu.
    const stage = levelAt(this.distance);
    if (stage > this.stage) {
      this.stage = stage;
      const bonus = 250 * stage;
      this.score += bonus;
      this.breatherUntil = this.distance + STAGE.lookahead + STAGE.breather;
      this.emit('stage', { index: stage, name: LEVELS[stage].name, bonus });
      this.addRage(0.25);
    }
    const lap = lapAt(this.distance);
    if (lap > this.lap) {
      this.lap = lap;
      this.score += 500 * lap;
      this.breatherUntil = this.distance + STAGE.lookahead + STAGE.breather;
      this.emit('lap', { lap, bonus: 500 * lap });
    }

    // Řady vznikají 100 m před hráčem; rozestup dává čas na reakci i při nejvyšší rychlosti.
    while (this.nextAt < this.distance + STAGE.lookahead) {
      if (this.dev?.obstacles !== false && this.nextAt >= this.breatherUntil) this.row(-(this.nextAt - this.distance) - travel);
      this.nextAt += Math.max(17, cap * pace.interval);
    }

    for (const o of this.objects) {
      if (!o.active) continue;
      const oldZ = o.z;
      o.z += travel;
      const sh = LIMITS[o.kind];
      const biteLane = Math.abs(this.x - o.lane * LANE) < sh.rx + 0.45;
      if ((o.kind === 'wood' || o.kind === 'snack') && this.bite > 0.02 && biteLane && oldZ < 0.45 && o.z > -3.0 && this.y < 0.75) {
        o.active = false;
        this.chomps++;
        this.reward(o.kind === 'wood' ? 60 : 50, o.kind === 'wood' ? 'Křup!' : 'Kořist');
        this.addRage(RUSH.chomp);
        this.emit('break', { o });
        continue;
      }
      const hz = sh.z + 0.35;
      const rx = sh.rx + 0.3;
      const x0 = oldX - obstacleX(o, this.time - dt, this.dev);
      const x1 = this.x - obstacleX(o, this.time, this.dev);
      if (o.kind === 'amber' || o.kind === 'shield') {
        const center = this.duck > 0.4 ? 0.45 : 0.88;
        const reach = rx + (this.rush > 0 && o.kind === 'amber' ? RUSH.magnet : 0); // v transu jantar přitahuje i ze sousedního pruhu
        const contact = sweepContact(x0, x1, oldZ, o.z, oldY + center, this.y + center, reach, hz, o.y - 0.83, o.y + 0.83);
        if (contact !== null) {
          o.active = false;
          if (o.kind === 'amber') {
            this.amber++;
            this.reward(30, 'Jantar');
            this.addRage(RUSH.amber);
            this.emit('amber');
          } else {
            this.shield = 1;
            this.emit('shield');
          }
          continue;
        }
      } else if (o.kind === 'pool') {
        if (sweepContact(x0, x1, oldZ, o.z, oldY, this.y, rx, hz, -100, 0.22) !== null && !o.splashed) {
          o.splashed = true;
          this.combo = 0;
          this.comboT = 0;
          this.emit('splash', { o });
        }
      } else if (o.kind === 'log') {
        const contact = sweepContact(x0, x1, oldZ, o.z, oldY, this.y, rx, hz, sh.bottom - 1.43, sh.top - 0.25);
        if (contact !== null) {
          if (this.duck > 0.24 && this.grounded) {
            o.bend = 1;
            this.duckGrace = 0.22;
            if (!o.brushed) {
              o.brushed = true;
              this.brushes++;
              this.emit('brush', { o });
            }
          } else this.hit(o);
        }
      } else if (sweepContact(x0, x1, oldZ, o.z, oldY, this.y, rx, hz, -100, sh.top - 0.16) !== null) this.hit(o);

      if (o.z > 1.4 && !o.passed) {
        o.passed = true;
        if (!['amber', 'shield'].includes(o.kind) && !(o.kind === 'pool' && o.splashed)) {
          if (Math.abs(this.x - o.lane * LANE) < 1.2) {
            this.dodges++;
            this.reward(10, o.kind === 'log' ? 'Podlez!' : 'Hop!');
            this.addRage(RUSH.dodge);
          } else this.score += 5;
        }
      }
      if (o.z > 9) o.active = false;
      if (this.phase !== 'playing') break;
    }
    this.objects = this.objects.filter((o) => o.active || (o.z < 9 && o.bend > 0));
    if (this.objects.length > 80) this.objects = this.objects.slice(-80);
    if (this.distance >= this.milestone) {
      this.emit('milestone', { distance: this.milestone });
      this.milestone += 250;
    }
  }

  /** Čísla běhu pro výsledky, úkoly a zkušenosti. */
  summary() {
    return {
      seed: this.seed,
      difficulty: this.difficulty,
      practice: this.practice,
      dev: Boolean(this.dev?.enabled),
      revived: this.revived,
      distance: this.distance,
      score: Math.floor(this.score),
      amber: this.amber,
      chomps: this.chomps,
      dodges: this.dodges,
      jumps: this.jumps,
      brushes: this.brushes,
      rushes: this.rushes,
      hits: this.hits,
      maxCombo: this.maxCombo,
      bestClean: Math.max(this.bestClean, this.distance - this.cleanFrom),
      nightDistance: this.nightDistance,
      rainDistance: this.rainDistance,
      stage: this.stage,
      lap: this.lap,
    };
  }
}
