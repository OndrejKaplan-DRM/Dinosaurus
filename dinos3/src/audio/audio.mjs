import { MusicPlayer, PLAYLISTS, TRACKS } from './music.mjs';
const clips = [
  'click',
  'back',
  'jump',
  'slide',
  'bite',
  'chomp',
  'wood',
  'crash',
  'thud',
  'amber',
  'shield',
  'step0',
  'step1',
  'step2',
  'jingle',
  'fail',
];
const songs = Object.keys(TRACKS);
const lists = PLAYLISTS;
export class Sound {
  constructor(asset, settings) {
    this.asset = asset;
    this.settings = settings;
    this.buffers = new Map();
    this.loads = new Map();
    this.cue = 'menu';
    this.player = null;
    this.unlocked = false;
    this.loadsOK = 0;
    this.errors = [];
    this.failed = false;
  }
  async load(name, url) {
    if (this.loads.has(name)) return this.loads.get(name);
    const p = fetch(this.asset(url))
      .then((r) => {
        if (!r.ok) throw Error('audio ' + name);
        return r.arrayBuffer();
      })
      .then((b) => this.ctx.decodeAudioData(b))
      .then((b) => {
        this.buffers.set(name, b);
        this.loadsOK++;
        return b;
      })
      .catch((error) => {
        this.errors.push({ name, message: error.message });
        return null;
      });
    this.loads.set(name, p);
    return p;
  }
  async unlock() {
    try {
      if (this.failed) return false;
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC({ latencyHint: 'interactive' });
        const c = this.ctx;
        this.master = c.createGain();
        this.music = c.createGain();
        this.effects = c.createGain();
        this.ambient = c.createGain();
        this.mood = c.createGain();
        this.duckBus = c.createGain();
        this.music.connect(this.mood);
        this.mood.connect(this.duckBus);
        this.duckBus.connect(this.master);
        this.effects.connect(this.master);
        this.ambient.connect(this.master);
        const compressor = c.createDynamicsCompressor();
        compressor.threshold.value = -10;
        compressor.ratio.value = 4;
        this.master.connect(compressor);
        compressor.connect(c.destination);
        this.player = new MusicPlayer(c, this.music, (name) => this.buffers.get(name));
        this.player.request(this.cue);
        this.apply();
        for (const name of clips) this.load(name, 'audio/' + name + '.mp3');
        for (let i = 0; i < 6; i++) this.load('insect' + i, 'audio/music/insect' + i + '.ogg');
        this.ensureSongs(this.cue);
        this.mixMood();
        this.insectAt = 0;
        this.callAt = 3;
        this.makeWind();
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.unlocked = this.ctx.state === 'running';
      return this.unlocked;
    } catch (error) {
      this.failed = true;
      this.errors.push({ name: 'AudioContext', message: error.message });
      return false;
    }
  }
  apply() {
    if (!this.ctx) return;
    for (const [bus, key] of [
      [this.master, 'master'],
      [this.music, 'music'],
      [this.effects, 'sfx'],
      [this.ambient, 'ambience'],
    ])
      bus.gain.setTargetAtTime(Math.pow(this.settings[key], 1.5), this.ctx.currentTime, 0.05);
  }
  sfx(name, vol = 0.65, rate = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const b = this.buffers.get(name);
    if (!b) return;
    const c = this.ctx,
      s = c.createBufferSource(),
      g = c.createGain();
    if (['crash', 'shield', 'wood', 'chomp'].includes(name)) {
      const now = c.currentTime,
        p = this.duckBus.gain;
      p.cancelScheduledValues(now);
      p.setTargetAtTime(0.65, now, 0.035);
      p.setTargetAtTime(1, now + 0.3, 0.22);
    }
    s.buffer = b;
    s.playbackRate.value = rate * (0.97 + Math.random() * 0.06);
    g.gain.value = vol;
    s.connect(g);
    g.connect(this.effects);
    s.start();
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
  }
  mixMood() {
    if (!this.ctx) return;
    const level = { menu: 0.8, grove: 0.85, start: 0.95, run: 0.95, rush: 1.05, shield: 1, pause: 0.32, peril: 0.26 }[this.cue] ?? 0.9;
    this.mood.gain.setTargetAtTime(level, this.ctx.currentTime, 0.55);
  }
  get song() {
    return this.player?.song || '';
  }
  switch(cue) {
    if (this.cue !== cue) {
      this.cue = cue;
      this.player?.request(cue);
      this.ensureSongs(cue);
      this.mixMood();
    }
  }
  ensureSongs(cue) {
    if (!this.ctx) return;
    for (const name of lists[cue] || lists.run) this.load(name, 'music/' + name + '.ogg');
  }
  update() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    this.player.update();
    // Retain only the active cue and voice; delayed decodes cannot start playback.
    for (const key of songs)
      if (key !== this.song && key !== this.player.requested && !(lists[this.cue] || []).includes(key) && this.buffers.has(key)) {
        this.buffers.delete(key);
        this.loads.delete(key);
      }
    if (now >= this.callAt) {
      this.callAt = now + 11 + Math.random() * 17;
      const c = this.ctx,
        o = c.createOscillator(),
        g = c.createGain(),
        p = c.createStereoPanner();
      o.type = 'sine';
      const hz = 800 + Math.random() * 700;
      o.frequency.setValueAtTime(hz, now);
      o.frequency.exponentialRampToValueAtTime(hz * 0.6, now + 0.28);
      o.frequency.exponentialRampToValueAtTime(hz * 0.82, now + 0.45);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      p.pan.value = (Math.random() - 0.5) * 1.7;
      o.connect(g);
      g.connect(p);
      p.connect(this.ambient);
      o.start(now);
      o.stop(now + 0.6);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
        p.disconnect();
      };
    }
    if (now >= this.insectAt) {
      this.insectAt = now + 4 + Math.random() * 8;
      const b = this.buffers.get('insect' + Math.floor(Math.random() * 6));
      if (b) {
        const s = this.ctx.createBufferSource(),
          p = this.ctx.createStereoPanner(),
          g = this.ctx.createGain();
        s.buffer = b;
        s.playbackRate.value = 0.92 + Math.random() * 0.16;
        p.pan.value = (Math.random() - 0.5) * 1.5;
        g.gain.value = this.cue === 'menu' ? 0.27 : 0.1;
        s.connect(p);
        p.connect(g);
        g.connect(this.ambient);
        s.start();
        s.onended = () => {
          s.disconnect();
          p.disconnect();
          g.disconnect();
        };
      }
    }
  }
  weather(e) {
    if (!this.ctx || !this.windGain) return;
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.18 + e.wind * 0.45, now, 0.5);
    this.rainGain.gain.setTargetAtTime(e.rain * 0.1, now, 0.5);
  }
  makeWind() {
    const c = this.ctx,
      b = c.createBuffer(1, c.sampleRate * 4, c.sampleRate),
      data = b.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = brown * 0.99 + (Math.random() * 2 - 1) * 0.01;
      data[i] = brown * 2;
    }
    const s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = b;
    s.loop = true;
    f.type = 'lowpass';
    f.frequency.value = 700;
    g.gain.value = 0.3;
    this.windGain = g;
    s.connect(f);
    f.connect(g);
    g.connect(this.ambient);
    s.start();
    const rain = c.createBufferSource(),
      rb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
      rd = rb.getChannelData(0);
    for (let i = 0; i < rd.length; i++) rd[i] = Math.random() * 2 - 1;
    rain.buffer = rb;
    rain.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 4200;
    this.rainGain = c.createGain();
    this.rainGain.gain.value = 0;
    rain.connect(filter);
    filter.connect(this.rainGain);
    this.rainGain.connect(this.ambient);
    rain.start();
  }
  suspend() {
    if (this.ctx?.state === 'running')
      void this.ctx.suspend().catch((error) => this.errors.push({ name: 'suspend', message: error.message }));
  }
}
