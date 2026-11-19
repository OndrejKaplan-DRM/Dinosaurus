import { LEVELS, levelAt } from './progression.mjs';
import { random } from './core.mjs';
export const WEATHER = {
  clear: { name: 'Slunečno', rain: 0, wind: 0.18, cloud: 0.08, heat: 0.3 },
  rain: { name: 'Teplý déšť', rain: 0.65, wind: 0.35, cloud: 0.8, heat: 0 },
  wind: { name: 'Větrno', rain: 0, wind: 1, cloud: 0.4, heat: 0.1 },
  heat: { name: 'Dusné vedro', rain: 0, wind: 0.12, cloud: 0.12, heat: 1 },
  shower: { name: 'Prudká přeháňka', rain: 1, wind: 0.7, cloud: 0.95, heat: 0 },
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function route(distance, z, menu = false) {
  if (menu) return { x: 0, y: 0 };
  const ahead = Math.max(0, -z),
    fade = 1 - Math.exp((-ahead * ahead) / 900),
    d = distance;
  const bend = (t) => 9 * Math.sin(t / 130) + 5 * Math.sin(t / 63);
  const hill = (t) => 1.8 * Math.sin(t / 90) + 0.7 * Math.sin(t / 37);
  return { x: (bend(d - z) - bend(d)) * fade, y: (hill(d - z) - hill(d)) * fade };
}
export function biome(d) {
  return LEVELS[levelAt(d)].name;
}
export class Environment {
  constructor(seed = Date.now()) {
    this.rng = random(seed);
    this.elapsed = 0;
    this.hour = 16;
    this.clock = 16;
    this.weather = this.mode = 'clear';
    this.name = WEATHER.clear.name;
    this.next = 25 + this.rng() * 15;
    this.rain = 0;
    this.wind = 0.18;
    this.cloud = 0.08;
    this.heat = 0.3;
    this.day = 1;
    this.wet = 0;
  }
  tick(dt, settings = {}, paused = false) {
    if (paused) return;
    this.elapsed += dt;
    const fixed = { morning: 7, noon: 12, dusk: 18.5, night: 0 };
    this.clock = (this.clock + (dt * (Number(settings.timeScale) || 100)) / 3600) % 24;
    this.hour = Number.isFinite(this.options?.hour)
      ? this.options.hour
      : settings.daylight in fixed
        ? fixed[settings.daylight]
        : this.clock;
    if (this.elapsed >= this.next) {
      const pool = Object.keys(WEATHER).filter((k) => k !== this.weather);
      this.weather = pool[Math.floor(this.rng() * pool.length)];
      this.next = this.elapsed + 35 + this.rng() * 35;
    }
    this.mode = settings.weather in WEATHER ? settings.weather : this.weather;
    const w = WEATHER[this.mode],
      k = 1 - Math.exp(-dt * 0.18);
    for (const key of ['rain', 'wind', 'cloud', 'heat']) this[key] += (w[key] - this[key]) * k;
    this.day = clamp((Math.sin(((this.hour - 6) / 24) * Math.PI * 2) + 0.16) / 0.65, 0, 1);
    this.wet += (this.rain - this.wet) * (1 - Math.exp(-dt * 0.025));
    this.name = w.name;
  }
  get label() {
    return (
      this.name + ' · ' + String(Math.floor(this.hour)).padStart(2, '0') + ':' + String(Math.floor((this.hour % 1) * 60)).padStart(2, '0')
    );
  }
  sky() {
    const d = this.day,
      c = this.cloud;
    return {
      top: `rgb(${Math.round(17 + 57 * d - 22 * c * d)},${Math.round(30 + 132 * d - 55 * c * d)},${Math.round(58 + 134 * d - 66 * c * d)})`,
      bottom: `rgb(${Math.round(55 + 147 * d - 55 * c * d)},${Math.round(67 + 148 * d - 55 * c * d)},${Math.round(88 + 105 * d - 40 * c * d)})`,
    };
  }
}
/** Screen-space atmosphere shared by both renderers, bounded work per frame. */
export class Atmosphere {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }
  resize() {
    this.w = this.canvas.width = innerWidth;
    this.h = this.canvas.height = innerHeight;
  }
  draw(e, reduced = false) {
    const g = this.ctx,
      w = this.w,
      h = this.h,
      t = e.elapsed;
    g.clearRect(0, 0, w, h);
    if (e.options?.rain !== false && e.rain > 0.01) {
      g.strokeStyle = `rgba(192,222,228,${e.rain * 0.38})`;
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < (reduced ? 55 : 180) * e.rain; i++) {
        const x = ((i * 97.17 + t * 85 * e.wind) % (w + 80)) - 40,
          y = ((i * 123.7 + t * 540) % (h + 40)) - 20;
        g.moveTo(x, y);
        g.lineTo(x + 7 * e.wind, y + 15);
      }
      g.stroke();
    }
    const leaves = e.options?.leaves === false ? 0 : Math.floor(e.wind * (reduced ? 8 : 30));
    for (let i = 0; i < leaves; i++) {
      const x = ((i * 123.7 + t * (55 + e.wind * 100)) % (w + 80)) - 40,
        y = h * 0.3 + ((i * 87.3 + t * 32) % (h * 0.68));
      g.save();
      g.translate(x, y);
      g.rotate(t * 2 + i);
      g.fillStyle = i % 3 ? '#729243aa' : '#b0a15e88';
      g.beginPath();
      g.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    // Small insects stay near vegetation, leaving the centre lane unobscured.
    if (e.options?.fauna !== false && e.rain < 0.6)
      for (let i = 0; i < 12; i++) {
        const x = (i % 2 ? w * 0.86 : w * 0.14) + Math.sin(t * 1.3 + i * 3) * w * 0.1,
          y = h * 0.52 + Math.sin(t * 0.8 + i) * h * 0.15;
        g.fillStyle = e.day > 0.3 ? '#cce4a766' : '#dcf3b077';
        g.fillRect(x, y, 2, 2);
      }
    if (e.heat > 0.4 && e.day > 0.5) {
      g.fillStyle = `rgba(231,195,118,${e.heat * 0.045})`;
      g.fillRect(0, h * 0.35, w, h * 0.65);
    }
    if (e.wind > 0.5 && e.rain < 0.1) {
      g.fillStyle = '#c7c69925';
      for (let i = 0; i < 18; i++) {
        g.beginPath();
        g.ellipse((t * 60 + i * 97) % w, h * 0.65 + Math.sin(t + i) * h * 0.13, 22, 3, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}
