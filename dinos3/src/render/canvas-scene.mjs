import { NatureCanvas } from './nature-canvas.mjs';
import { LEGACY_DETAILS } from '../game/nature-layout.mjs';
import { SkyPainter, fogRange } from './sky.mjs';
import { sceneryVisible, DETAIL_UNLOCK } from '../game/progression.mjs';
import { DETAIL_KINDS, detailSprite } from './details.mjs';
import { LANE, random, obstacleX } from '../game/core.mjs';
import { route } from '../game/environment.mjs';
import { HABITAT, habitatSprite } from './habitat.mjs';
import { groundCoordinate } from '../game/motion.mjs';
const TAU = Math.PI * 2,
  clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const palette = { rock: '#9f7d4c', wood: '#95704c', thorn: '#554d32', snack: '#8eac5e', amber: '#ffd168', shield: '#91e6cf' };
function off(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
export async function imageAsset(url) {
  return new Promise((resolve, reject) => {
    const i = new Image(),
      timer = setTimeout(() => reject(new Error('Vypršel čas pro načtení obrázku')), 20000);
    i.onload = () => {
      clearTimeout(timer);
      resolve(i);
    };
    i.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Nepodařilo se načíst obrázek'));
    };
    i.src = url;
  });
}
/** Canvas compatibility renderer: the same Runner, inputs, scoring, audio and
 * textured GLB character, with baked mesh frames instead of a WebGL context. */
export class CanvasScene {
  async init(canvas, asset) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw Error('Prohlížeč nepodporuje ani Canvas 2D');
    [this.atlas, this.ground, this.rock] = await Promise.all([
      imageAsset(asset('fallback/raptor-atlas.webp')),
      imageAsset(asset('textures/ground.jpg')),
      imageAsset(asset('textures/rock.jpg')),
    ]);
    this.meta = await fetch(asset('fallback/raptor-atlas.json')).then((r) => {
      if (!r.ok) throw Error('Chybí popis animací');
      return r.json();
    });
    if (!this.meta.count || this.atlas.width < this.meta.cols * this.meta.size) throw Error('Neplatný atlas dinosaura');
    this.skyPainter = new SkyPainter();
    this.props = {};
    for (const k of DETAIL_KINDS) this.props[k] = detailSprite(k);
    for (const k of HABITAT) this.props[k] = habitatSprite(k);
    for (let i = 0; i < 7; i++) this.props['rock' + i] = this.makeRock(i);
    this.props.fern = this.makeFern();
    this.props.tree = this.makeTree();
    this.props.wood = this.makeWood();
    this.props.thorn = this.makeThorn();
    this.props.snack = this.makeSnack();
    this.props.log = this.makeLog();
    const rng = random(190516);
    this.scenery = [];
    for (let i = 0; i < 215; i++) {
      const kind =
        i % 7 === 0
          ? HABITAT[Math.floor(i / 7) % HABITAT.length]
          : i % 4 === 0
            ? ['broadleaf', 'conifer', 'palm', 'ginkgo'][Math.floor(i / 4) % 4] || 'broadleaf'
            : i % 5 === 0
              ? 'cycad'
              : 'fern';
      this.scenery.push({
        kind,
        unlock: i > 180 ? 1500 : i > 155 ? 900 : 0,
        x: (i % 2 ? -1 : 1) * (4.1 + rng() * 12),
        offset: rng() * 140,
        size: ['tree', 'broadleaf', 'conifer', 'palm', 'ginkgo'].includes(kind)
          ? 6 + rng() * 4
          : kind === 'pond'
            ? 4
            : kind === 'turtle'
              ? 0.7
              : kind === 'croc'
                ? 2
                : kind === 'fern'
                  ? 1 + rng() * 1.4
                  : 1.4 + rng() * 1.4,
      });
    }
    for (let i = 0; i < 50; i++)
      this.scenery.push({
        kind: DETAIL_KINDS[i % 10],
        unlock: DETAIL_UNLOCK[DETAIL_KINDS[i % 10]],
        x: (i % 2 ? -1 : 1) * (4.5 + rng() * 3.8),
        offset: (i * 31.3) % 140,
        size: 1.3 + (i % 10 > 2 ? 1 : 0),
      });
    if (asset('nature/manifest.json')) this.nature = await new NatureCanvas().load(asset);
    this.groundPattern = this.ctx.createPattern(this.ground, 'repeat');
    this.dust = [];
    this.age = 0;
    this.lastX = 0;
    this.resize();
    return this;
  }
  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.w = innerWidth;
    this.h = innerHeight;
    this.canvas.width = Math.round(this.w * ratio);
    this.canvas.height = Math.round(this.h * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.f = this.h / (2 * Math.tan(((this.w < 720 ? 65 : 54) * Math.PI) / 360));
  }
  project(x, y, z) {
    const bend = route(this.distance || 0, z, this.isMenu ?? true);
    x += bend.x;
    y += bend.y;
    const cy = this.cameraY ?? 3.15,
      cz = this.cameraZ ?? 7.8,
      cos = this.pitchCos ?? 0.992,
      sin = this.pitchSin ?? 0.127,
      dy = y - cy,
      dz = cz - z,
      depth = dz * cos - dy * sin;
    if (depth < 0.2) return null;
    return {
      x: this.w / 2 + ((x - this.camX) * this.f) / depth,
      y: this.h / 2 - ((dy * cos + dz * sin) * this.f) / depth,
      k: this.f / depth,
      depth,
    };
  }
  makeRock(seed) {
    const c = off(256, 192),
      g = c.getContext('2d'),
      r = random(seed + 72),
      path = new Path2D();
    for (let i = 0; i < 12; i++) {
      const a = (TAU * i) / 12,
        rad = 0.78 + r() * 0.2,
        x = 128 + Math.cos(a) * 116 * rad,
        y = 99 + Math.sin(a) * 83 * rad;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    path.closePath();
    g.save();
    g.clip(path);
    g.drawImage(this.rock, 0, 0, 256, 192);
    const gr = g.createLinearGradient(0, 0, 180, 192);
    gr.addColorStop(0, '#ffeeab55');
    gr.addColorStop(1, '#232e1f80');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 192);
    g.restore();
    g.strokeStyle = '#67552a44';
    g.lineWidth = 3;
    g.stroke(path);
    return c;
  }
  makeFern() {
    const c = off(300, 250),
      g = c.getContext('2d');
    g.translate(150, 235);
    for (let f = 0; f < 11; f++) {
      const a = (f - 5) * 0.23,
        s = 0.65 + (f % 3) * 0.16;
      g.save();
      g.rotate(a);
      g.scale(s, s);
      g.strokeStyle = '#476a2c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(-20, -130, 0, -222);
      g.stroke();
      for (let j = 1; j < 15; j++) {
        const t = j / 15,
          y = -t * 205,
          w = Math.sin(t * Math.PI) * 43;
        for (const sign of [-1, 1]) {
          g.fillStyle = j % 2 ? '#668b38' : '#3d6a32';
          g.beginPath();
          g.moveTo(-11 * Math.sin(t * Math.PI), y);
          g.quadraticCurveTo(sign * w * 0.55 - 7, y - 21, sign * w - 7, y - 30);
          g.quadraticCurveTo(sign * w * 0.75 - 7, y + 4, -11 * Math.sin(t * Math.PI), y + 5);
          g.fill();
        }
      }
      g.restore();
    }
    return c;
  }
  makeTree() {
    const c = off(330, 720),
      g = c.getContext('2d');
    g.lineCap = 'round';
    g.strokeStyle = '#4b5133';
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(154, 700);
    g.bezierCurveTo(168, 480, 130, 330, 172, 130);
    g.stroke();
    g.strokeStyle = '#a18d58';
    g.lineWidth = 16;
    g.stroke();
    for (let i = 0; i < 23; i++) {
      g.strokeStyle = i % 2 ? '#665a3d' : '#bba06a';
      g.lineWidth = 3;
      const y = 150 + i * 24;
      g.beginPath();
      g.moveTo(147 + Math.sin(i * 0.5) * 8, y);
      g.lineTo(170 + Math.sin(i * 0.5) * 7, y + 8);
      g.stroke();
    }
    g.strokeStyle = '#766b40';
    g.lineWidth = 7;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(156, 670);
      g.quadraticCurveTo(150 + (i - 2) * 15, 698, 150 + (i - 2) * 34, 710);
      g.stroke();
    }
    const fern = this.props.fern || this.makeFern();
    for (let i = 0; i < 6; i++) {
      g.save();
      g.translate(166, 146);
      g.rotate((i - 2.5) * 0.6);
      g.drawImage(fern, -125, -180, 250, 205);
      g.restore();
    }
    return c;
  }
  makeWood() {
    const c = off(230, 210),
      g = c.getContext('2d');
    g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = i % 2 ? '#b39467' : '#6c6544';
      g.lineWidth = 13 - (i % 3) * 2;
      g.beginPath();
      g.moveTo(50 + i * 23, 195);
      g.lineTo(180 - i * 23, 40 + i * 8);
      g.stroke();
      g.strokeStyle = '#d2b47c';
      g.lineWidth = 2;
      g.stroke();
    }
    return c;
  }
  makeThorn() {
    const c = off(230, 260),
      g = c.getContext('2d');
    g.drawImage(this.props.fern, 0, 135, 230, 125);
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = '#4b4932';
      g.lineWidth = 6;
      g.beginPath();
      const x = 35 + i * 20;
      g.moveTo(x, 250);
      g.quadraticCurveTo(125, 150, x + (i % 2 ? 20 : -15), 25 + (i % 3) * 20);
      g.stroke();
      for (let j = 0; j < 4; j++) {
        g.fillStyle = '#928455';
        g.beginPath();
        g.moveTo(x + (j - 2) * 4, 170 - j * 35);
        g.lineTo(x + 22, 152 - j * 35);
        g.lineTo(x + 4, 153 - j * 35);
        g.fill();
      }
    }
    return c;
  }
  makeSnack() {
    const c = off(180, 130),
      g = c.getContext('2d'),
      gr = g.createRadialGradient(75, 65, 3, 90, 80, 70);
    gr.addColorStop(0, '#b2c777');
    gr.addColorStop(1, '#5d7843');
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(90, 83, 63, 32, 0, 0, TAU);
    g.fill();
    for (const x of [56, 125]) {
      g.beginPath();
      g.ellipse(x, 85, 33, 15, x < 90 ? -0.7 : 0.7, 0, TAU);
      g.fill();
      g.fillStyle = '#bad580';
      g.beginPath();
      g.arc(x < 90 ? 66 : 114, 52, 19, 0, TAU);
      g.fill();
      g.fillStyle = '#263925';
      g.beginPath();
      g.arc(x < 90 ? 68 : 112, 49, 7, 0, TAU);
      g.fill();
      g.fillStyle = gr;
    }
    return c;
  }
  makeLog() {
    const c = off(360, 260),
      g = c.getContext('2d');
    g.lineCap = 'round';
    g.strokeStyle = '#625239';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(50, 252);
    g.lineTo(28, 70);
    g.moveTo(310, 252);
    g.lineTo(335, 67);
    g.stroke();
    g.lineWidth = 49;
    g.strokeStyle = '#6e5938';
    g.beginPath();
    g.moveTo(18, 75);
    g.bezierCurveTo(120, 65, 210, 100, 341, 58);
    g.stroke();
    g.lineWidth = 34;
    g.strokeStyle = '#a58a58';
    g.stroke();
    g.lineWidth = 3;
    g.strokeStyle = '#675136';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.moveTo(23, 56 + i * 8);
      g.bezierCurveTo(150, 48 + i * 10, 220, 90 + i * 3, 340, 40 + i * 8);
      g.stroke();
    }
    g.drawImage(this.props.fern, 260, 0, 95, 85);
    return c;
  }
  kickDust(x, z, n = 3) {
    for (let i = 0; i < n; i++)
      this.dust.push({
        x: x + (Math.random() - 0.5) * 0.7,
        z: z + (Math.random() - 0.5) * 0.5,
        y: 0.1,
        vx: Math.random() - 0.5,
        life: 0.6,
      });
    if (this.dust.length > 60) this.dust.splice(0, this.dust.length - 60);
  }
  event(e, s) {
    if (e.type === 'start') this.dust = [];
    if (['land', 'duck', 'brush', 'break', 'shieldBreak'].includes(e.type))
      this.kickDust(e.o ? e.o.lane * LANE : s.x, e.o?.z || 0, e.type === 'land' ? 7 : 4);
  }
  shadow(x, z, size = 1, opacity = 0.25) {
    const p = this.project(x, 0.012, z);
    if (!p) return;
    const g = this.ctx;
    g.fillStyle = `rgba(21,41,27,${opacity})`;
    g.beginPath();
    g.ellipse(p.x, p.y, p.k * 0.56 * size, p.k * 0.17 * size, 0, 0, TAU);
    g.fill();
  }
  billboard(img, x, z, width, height, base = 0) {
    const p = this.project(x, base, z);
    if (!p || p.depth > 160) return;
    const g = this.ctx,
      w = width * p.k,
      h = height * p.k;
    if (p.x + w < 0 || p.x - w > this.w) return;
    const [near, far] = fogRange(this.env);
    const fog = clamp((p.depth - near) / (far - near), 0, 0.95);
    g.globalAlpha = 1;
    g.drawImage(this.fogImage(img, fog), p.x - w / 2, p.y - h, w, h);
    g.globalAlpha = 1;
  }
  fogImage(img, fog) {
    if (fog < 0.05) return img;
    this.fogCache ??= new WeakMap();
    let entry = this.fogCache.get(img);
    if (!entry) {
      const ratio = Math.min(1, 256 / Math.max(img.width, img.height));
      entry = { canvas: off(Math.ceil(img.width * ratio), Math.ceil(img.height * ratio)), key: '' };
      this.fogCache.set(img, entry);
    }
    const level = Math.round(fog * 10),
      color = this.env?.sky().bottom || '#a3b8a3',
      key = level + color;
    if (entry.key !== key) {
      const c = entry.canvas,
        g = c.getContext('2d');
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1;
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = level / 10;
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);
      entry.key = key;
    }
    return entry.canvas;
  }
  dinosaur(s, x, z, height = 1.68, yaw = Math.PI, wild = false) {
    const p = this.project(x, s.y || 0, z);
    if (!p) return;
    let frame;
    if (wild) {
      const view = (Math.round(yaw / (Math.PI / 4)) + 8) % 8;
      frame = view * 8 + (Math.floor((s.gait ?? s.time) * 10) % 8);
    } else if (['stumble', 'dead'].includes(s.phase)) frame = 78 + Math.min(9, Math.floor((s.stumble / 0.72) * 10));
    else if (!s.grounded) frame = 70 + clamp(Math.floor(((9 - s.vy) / 18) * 8), 0, 7);
    else if (s.duck > 0.3) frame = 64 + Math.floor((((((s.world || 0) / 4.2) % 1) + 1) % 1) * 6);
    else frame = 32 + (Math.floor(s.time * (6 + s.speed * 0.35)) % 8);
    const m = this.meta,
      size = m.size,
      scale = (p.k * m.worldSize * height) / 1.68,
      ax = m.anchor[0] / size,
      ay = m.anchor[1] / size,
      g = this.ctx;
    g.save();
    g.translate(p.x, p.y);
    if (!wild && s.invincible > 0) g.globalAlpha = 0.75 + 0.25 * Math.sin(s.time * 23);
    g.drawImage(this.atlas, (frame % m.cols) * size, Math.floor(frame / m.cols) * size, size, size, -scale * ax, -scale * ay, scale, scale);
    g.restore();
  }
  obstacle(o, s) {
    if (!o.active) return;
    const x = obstacleX(o, s.time, s.dev),
      g = this.ctx;
    if (o.kind === 'amber' || o.kind === 'shield') {
      const p = this.project(x, o.y + Math.sin(s.time * 3 + o.id) * 0.1, o.z);
      if (!p) return;
      const r = p.k * (o.kind === 'amber' ? 0.25 : 0.34);
      g.save();
      const glow = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      glow.addColorStop(0, o.kind === 'amber' ? '#ffcd6a66' : '#92ffe577');
      glow.addColorStop(1, 'transparent');
      g.fillStyle = glow;
      g.fillRect(p.x - r * 3, p.y - r * 3, r * 6, r * 6);
      g.translate(p.x, p.y);
      g.rotate(Math.sin(s.time * 1.5 + o.id) * 0.15);
      g.fillStyle = palette[o.kind];
      g.strokeStyle = o.kind === 'amber' ? '#ffe7a8' : '#d5fff2';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r * 0.65, 0);
      g.lineTo(0, r);
      g.lineTo(-r * 0.65, 0);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
      return;
    }
    if (o.kind === 'pool') {
      const p = this.project(x, 0.02, o.z);
      if (p) {
        g.fillStyle = '#2a3e30';
        g.beginPath();
        g.ellipse(p.x, p.y, p.k * 1.03, p.k * 0.55, 0, 0, TAU);
        g.fill();
        g.fillStyle = '#497e7dcc';
        g.beginPath();
        g.ellipse(p.x, p.y + 2, p.k * 0.85, p.k * 0.45, 0, 0, TAU);
        g.fill();
        g.strokeStyle = '#b8dcbd';
        g.stroke();
      }
      return;
    }
    if (o.kind === 'root') {
      this.billboard(this.props.wood, x, o.z, 1.7, 0.5);
      return;
    }
    this.shadow(x, o.z, 0.8, 0.18);
    if (o.kind === 'rollingWood') {
      this.billboard(this.props.deadwood, x, o.z, 1.2, 0.55);
      return;
    }
    if (o.kind === 'rock' || o.kind === 'rollingRock') this.billboard(this.props['rock' + (o.id % 7)], x, o.z, 1.36, 0.84);
    else if (o.kind === 'log') this.billboard(this.props.log, x, o.z, 2.25, 1.9 + (o.brushed ? Math.sin(s.time * 20) * 0.04 : 0));
    else if (o.kind === 'wood') this.billboard(this.props.wood, x, o.z, 1.4, 1.26);
    else if (o.kind === 'thorn') this.billboard(this.props.thorn, x, o.z, 1.3, 1.9);
    else this.billboard(this.props.snack, x, o.z, 0.9, 0.55);
  }
  draw(s, dt, wire = false) {
    this.age += dt;
    this.distance = s.world;
    this.isMenu = s.phase === 'menu';
    this.env = s.environment;
    const roaming = s.phase === 'menu' && s.grove?.active;
    this.cameraY = roaming ? 4.2 : 3.15;
    this.cameraZ = roaming ? 11 : 7.8;
    this.pitchSin = roaming ? 0.19 : 0.127;
    this.pitchCos = roaming ? Math.sqrt(1 - 0.19 ** 2) : 0.992;
    this.camX =
      (roaming ? s.grove.animals[0].x * (this.w < 720 ? 1 : 0.35) : s.phase === 'menu' ? 0 : s.x * 0.32) +
      (this.settings?.shake ? s.shake * Math.sin(s.time * 52) * 0.18 : 0);
    const g = this.ctx,
      w = this.w,
      h = this.h,
      menu = s.phase === 'menu';
    g.globalAlpha = 1;
    this.skyPainter.draw(g, w, h, this.env);
    for (let row = 0; row < 3; row++) {
      const base = h * (0.43 + row * 0.025);
      g.fillStyle = ['#8fa99e', '#7f9982', '#6b876c'][row];
      g.beginPath();
      g.moveTo(-20, h);
      for (let x = -20; x <= w + 20; x += 15) {
        const phase = (x / w) * 12 + row * 2.1;
        g.lineTo(x, base - h * (0.035 + Math.pow(Math.sin(phase) * 0.5 + 0.5, 2) * (0.12 - row * 0.02) + Math.sin(phase * 2.7) * 0.015));
      }
      g.lineTo(w + 20, h);
      g.closePath();
      g.fill();
    }
    const horizon = this.project(0, 0, -1000).y;
    g.fillStyle = '#8a8d54';
    g.fillRect(0, horizon, w, h - horizon);
    // Perspective texture strips; irregular fern banks and shaded edges soften the road.
    g.globalAlpha = 0.82;
    for (let y = Math.max(0, Math.floor(horizon)); y < h; y += 4) {
      const py = (h / 2 - y) / this.f,
        dz = (-this.cameraY * this.pitchCos - py * this.cameraY * this.pitchSin) / (py * this.pitchCos - this.pitchSin),
        depth = dz * this.pitchCos + this.cameraY * this.pitchSin;
      if (depth <= 0) continue;
      const z = this.cameraZ - dz,
        k = this.f / depth,
        scale = k / 110;
      this.groundPattern.setTransform({
        a: scale,
        b: 0,
        c: 0,
        d: scale,
        e: w / 2 - this.camX * k,
        f: y - groundCoordinate(z, menu ? 0 : s.world) * 110 * scale,
      });
      g.fillStyle = this.groundPattern;
      g.fillRect(0, y, w, 4);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#266b36aa';
    g.fillRect(0, horizon, w, h - horizon);
    // Far-to-near strips form the real projected trail, including hill elevations.
    for (let z = -125; z < 7; z += 1) {
      const width = (t) => 3.65 + 0.11 * Math.sin((s.world - t) * 0.71) + 0.06 * Math.sin((s.world - t) * 2.13);
      const a = this.project(-width(z), 0, z),
        b = this.project(width(z), 0, z),
        c = this.project(width(z + 1), 0, z + 1),
        d = this.project(-width(z + 1), 0, z + 1);
      if (!a || !b || !c || !d) continue;
      g.fillStyle = `hsl(45 24% ${31 - (this.env?.wet || 0) * 5}%)`;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.lineTo(c.x, c.y);
      g.lineTo(d.x, d.y);
      g.fill();
    }
    // Soil flecks travel with the world, keeping the forward-motion cue clear.
    for (let i = 0; i < 280; i++) {
      const z = 7 - 130 + ((((i * 0.467 + (menu ? 0 : s.world)) % 130) + 130) % 130),
        x = Math.sin(i * 7.919) * 3.58,
        p = this.project(x, 0.008, z);
      if (!p || z > 6) continue;
      g.fillStyle = i % 3 ? '#d5be7920' : '#162a2028';
      g.beginPath();
      g.ellipse(p.x, p.y, Math.max(0.5, p.k * (0.015 + (i % 4) * 0.012)), Math.max(0.3, p.k * 0.014), i * 0.17, 0, TAU);
      g.fill();
    }
    const shade = g.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, '#193b29b5');
    shade.addColorStop(0.35, '#23492a00');
    shade.addColorStop(0.65, '#23492a00');
    shade.addColorStop(1, '#193b29b5');
    g.fillStyle = shade;
    g.fillRect(0, horizon, w, h - horizon);
    if (this.env?.options?.fog !== false) {
      const haze = g.createLinearGradient(0, horizon, 0, Math.min(h, horizon + h * 0.23));
      const c = this.env?.sky().bottom || 'rgb(165,185,165)';
      haze.addColorStop(0, c.replace('rgb(', 'rgba(').replace(')', ',.8)'));
      haze.addColorStop(1, c.replace('rgb(', 'rgba(').replace(')', ',0)'));
      g.fillStyle = haze;
      g.fillRect(0, horizon, w, h - horizon);
    }
    const jobs = [];
    this.nature?.jobs(this, s, jobs);
    for (const [index, o] of this.scenery.entries()) {
      if (this.nature && s.environment?.options?.imported !== false && !LEGACY_DETAILS.includes(o.kind)) continue;
      if (!sceneryVisible(o.kind, menu ? 0 : s.distance, index, this.env?.options)) continue;
      if (!menu && s.distance < (o.unlock || 0)) continue;
      const z = 12 - 140 + ((((o.offset + (menu ? 0 : s.world)) % 140) + 140) % 140);
      if (z > 7.3) continue;
      jobs.push({
        z,
        draw: () => {
          const img = this.props[o.kind];
          this.billboard(
            img,
            o.x + (['mammal', 'lizard', 'amphibian'].includes(o.kind) ? Math.sin(s.time * 0.9 + index) * 0.6 : 0),
            z,
            ['tree', 'broadleaf', 'conifer', 'palm', 'ginkgo'].includes(o.kind) ? o.size * 0.72 : o.size,
            ['tree', 'broadleaf', 'conifer', 'palm', 'ginkgo'].includes(o.kind) ? o.size : o.kind === 'fern' ? o.size * 0.8 : o.size * 0.7,
          );
        },
      });
    }
    if (menu && s.grove) {
      for (const [i, a] of s.grove.animals.entries()) {
        const { x, z, yaw, height } = a;
        jobs.push({
          z,
          draw: () => {
            this.shadow(x, z, 1, 0.2 / (1 + a.y));
            if (i === 0 && s.grove.active) {
              const p = this.project(x, 0.04, z);
              g.strokeStyle = '#ffe3a0';
              g.lineWidth = 2;
              g.beginPath();
              g.ellipse(p.x, p.y, p.k * 0.62, p.k * 0.19, 0, 0, TAU);
              g.stroke();
            }
            this.dinosaur({ ...s, y: a.y, gait: a.gait }, x, z, height, yaw, true);
          },
        });
      }
    } else {
      for (const o of s.objects) if (o.active) jobs.push({ z: o.z, draw: () => this.obstacle(o, s) });
      jobs.push({
        z: 0,
        draw: () => {
          this.shadow(s.x, 0, 1 + s.y * 0.1, 0.26 / (1 + s.y));
          this.dinosaur(s, s.x, 0);
          if (s.shield) {
            const p = this.project(s.x, s.y + 0.75, 0);
            g.strokeStyle = '#a8f0d4';
            g.lineWidth = 2;
            g.beginPath();
            g.ellipse(p.x, p.y, p.k * 0.83, p.k * 0.9, 0, 0, TAU);
            g.stroke();
          }
          if (wire) {
            const p = this.project(s.x, s.y, 0);
            g.strokeStyle = '#56efc1';
            g.lineWidth = 1;
            g.strokeRect(p.x - p.k * 0.3, p.y - p.k * (s.duck > 0.25 ? 0.7 : 1.43), p.k * 0.6, p.k * (s.duck > 0.25 ? 0.7 : 1.43));
          }
        },
      });
    }
    jobs.sort((a, b) => a.z - b.z);
    for (const job of jobs) job.draw();
    for (const d of this.dust) {
      d.life -= dt;
      d.z += (s.speed * 0.5 + 1) * dt;
      d.x += d.vx * dt;
      d.y += dt * 0.3;
      const p = this.project(d.x, d.y, d.z);
      if (!p || d.life <= 0) continue;
      g.fillStyle = `rgba(221,196,146,${d.life * 0.22})`;
      g.beginPath();
      g.arc(p.x, p.y, p.k * (0.1 + (0.6 - d.life) * 0.4), 0, TAU);
      g.fill();
    }
    this.dust = this.dust.filter((d) => d.life > 0);
    if (this.env) {
      g.fillStyle = `rgba(8,19,47,${(1 - this.env.day) * 0.46 + this.env.cloud * 0.08})`;
      g.fillRect(0, 0, w, h);
    }
    const vignette = g.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.45, w * 0.7);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, '#16332655');
    g.fillStyle = vignette;
    g.fillRect(0, 0, w, h);
  }
}
