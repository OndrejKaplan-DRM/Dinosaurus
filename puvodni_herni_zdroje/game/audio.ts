import { settings, subscribeSettings } from "@/game/settings";

const FILES = [
  "click",
  "back",
  "confirm",
  "toggle",
  "jump",
  "slide",
  "bite",
  "chomp",
  "wood",
  "crash",
  "thud",
  "amber",
  "shield",
  "step0",
  "step1",
  "step2",
  "tick",
  "drum",
  "jingle",
  "fail",
] as const;

export type Sfx = (typeof FILES)[number];

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, ArrayBuffer>();
let pumping = 0;
let nextNote = 0;
let stepIndex = 0;
let started = false;

function curve(v: number) {
  return Math.max(0, Math.min(1, v)) ** 2;
}

export function applyVolumes() {
  if (!ctx || !master || !musicBus || !sfxBus) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(curve(settings.master), now, 0.03);
  musicBus.gain.setTargetAtTime(curve(settings.music), now, 0.03);
  sfxBus.gain.setTargetAtTime(curve(settings.sfx), now, 0.03);
}

function decodeAll() {
  if (!ctx) return;
  for (const [name, raw] of pending) {
    if (buffers.has(name)) continue;
    const copy = raw.slice(0);
    void ctx.decodeAudioData(copy).then((buf) => {
      buffers.set(name, buf);
    }).catch(() => undefined);
  }
}

export function preloadAudio() {
  const jobs: Array<[string, string]> = [
    ...FILES.map((name) => [name, `/audio/${name}.mp3`] as [string, string]),
    ["grove", "/audio/music/grove.ogg"],
    ...[0, 1, 2, 3, 4, 5].map((i) => [`insect${i}`, `/audio/music/insect${i}.ogg`] as [string, string]),
  ];
  for (const [name, url] of jobs) {
    if (pending.has(name) || buffers.has(name)) continue;
    void fetch(url)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(name))))
      .then((buf) => {
        pending.set(name, buf);
        decodeAll();
      })
      .catch(() => undefined);
  }
}

function pumpMusic() {
  if (!ctx || !musicBus) return;
  if (bedSrc) return;
  if (!buffers.get("drum")) return;
  if (nextNote < ctx.currentTime) nextNote = ctx.currentTime + 0.08;
  const eighth = 60 / 108 / 2;
  while (nextNote < ctx.currentTime + 0.28) {
    const i = stepIndex % 8;
    if (i % 2 === 0) playAt("drum", nextNote, 0.7);
    else playAt("tick", nextNote, 0.35);
    if (i % 4 === 0) playAt(`step${(stepIndex / 4) % 3 | 0}`, nextNote, 0.28);
    nextNote += eighth;
    stepIndex += 1;
  }
}

let windGain: GainNode | null = null;

function ensureWind() {
  if (!ctx || !master || windGain) return;
  const rate = ctx.sampleRate;
  const len = rate * 2;
  const buf = ctx.createBuffer(1, len, rate);
  const data = buf.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < len; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = brown * 0.98 + white * 0.02;
    data[i] = brown * 2.4;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 380;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  src.connect(filter);
  filter.connect(windGain);
  windGain.connect(master);
  src.start();
}

export function setAmbience(amount: number) {
  if (!ctx || !windGain) return;
  const vol = Math.max(0, Math.min(1, amount)) * 0.045;
  windGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.25);
}

export type MusicCue = "menu" | "pause" | "start" | "run" | "rush" | "peril" | "shield";

const CUE: Record<string, { rate: number; hz: number; vol: number; fromStart: number }> = {
  menu: { rate: 0.9, hz: 1700, vol: 0.5, fromStart: 0.28 },
  menuB: { rate: 0.76, hz: 980, vol: 0.42, fromStart: 0.08 },
  pause: { rate: 0.66, hz: 720, vol: 0.2, fromStart: 0.16 },
  start: { rate: 1, hz: 5400, vol: 0.62, fromStart: 0.86 },
  run: { rate: 1.04, hz: 3600, vol: 0.54, fromStart: 0.34 },
  rush: { rate: 1.22, hz: 6800, vol: 0.6, fromStart: 0.18 },
  peril: { rate: 0.8, hz: 560, vol: 0.46, fromStart: 0.06 },
  shield: { rate: 1.08, hz: 4800, vol: 0.58, fromStart: 0.42 },
};

let currentCue = "";
let bedSrc: AudioBufferSourceNode | null = null;
let bedGain: GainNode | null = null;
let nextRestart = 0;
let insectAt = 0;

export function setMusicCue(cue: MusicCue) {
  if (!ctx || !musicBus) return;
  let next: string = cue;
  if (cue === "menu" && (currentCue === "menu" || currentCue === "menuB")) next = currentCue;
  else if (cue === "menu") next = Math.random() < 0.4 ? "menuB" : "menu";
  if (next !== currentCue) {
    currentCue = next;
    nextRestart = 0;
  }
  const grove = buffers.get("grove");
  if (!grove) return;
  if (!bedSrc || ctx.currentTime >= nextRestart) startBed(grove, Boolean(bedSrc));
  if (ctx.currentTime >= insectAt) playInsect();
}

function startBed(grove: AudioBuffer, cross: boolean) {
  if (!ctx || !musicBus || !currentCue) return;
  const spec = CUE[currentCue] ?? CUE.menu;
  const now = ctx.currentTime;
  const prev = bedSrc;
  const prevGain = bedGain;
  if (prevGain) {
    prevGain.gain.cancelScheduledValues(now);
    prevGain.gain.setValueAtTime(Math.max(prevGain.gain.value, 0), now);
    prevGain.gain.linearRampToValueAtTime(0, now + 0.55);
  }
  prev?.stop(now + 0.62);
  const src = ctx.createBufferSource();
  src.buffer = grove;
  src.loop = true;
  src.playbackRate.value = spec.rate * (0.97 + Math.random() * 0.06);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = spec.hz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(spec.vol, now + (cross ? 0.7 : 1));
  src.connect(filter);
  filter.connect(gain);
  gain.connect(musicBus);
  const span = Math.max(1, grove.duration - 0.4);
  const offset = Math.random() < spec.fromStart ? 0 : Math.random() * span * 0.82;
  src.start(now, offset);
  bedSrc = src;
  bedGain = gain;
  nextRestart = now + 18 + Math.random() * 20;
  window.setTimeout(() => {
    if (bedSrc !== prev) {
      prev?.disconnect();
      prevGain?.disconnect();
    }
  }, 900);
}

function playInsect() {
  if (!ctx || !sfxBus) return;
  const buf = buffers.get(`insect${(Math.random() * 6) | 0}`);
  if (!buf) {
    insectAt = ctx.currentTime + 0.45;
    return;
  }
  const menu = currentCue === "menu" || currentCue === "menuB";
  insectAt = ctx.currentTime + (menu ? 1.2 + Math.random() * 2.5 : 6 + Math.random() * 9);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.84 + Math.random() * 0.32;
  const gain = ctx.createGain();
  gain.gain.value = (menu ? 0.7 : 0.16) * (0.7 + Math.random() * 0.55);
  src.connect(gain);
  gain.connect(sfxBus);
  const offset = buf.duration > 0.45 && Math.random() < 0.4 ? Math.random() * buf.duration * 0.45 : 0;
  src.start(ctx.currentTime, offset);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

export function unlockAudio() {
  if (typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    applyVolumes();
    subscribeSettings(applyVolumes);
    decodeAll();
    ensureWind();
  }
  ensureWind();
  if (ctx.state === "suspended") void ctx.resume();
  if (!started) {
    started = true;
    pumping = window.setInterval(pumpMusic, 80);
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

function playAt(name: string, when: number, vol = 1, rate = 1) {
  if (!ctx || !musicBus) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(musicBus);
  src.start(when);
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

export function playSfx(name: Sfx, opts?: { vol?: number; rate?: number }) {
  if (!ctx || !sfxBus) return;
  const buf = buffers.get(name);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const rate = opts?.rate ?? 0.96 + Math.random() * 0.08;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(opts?.vol ?? 1, ctx.currentTime);
  src.connect(gain);
  gain.connect(sfxBus);
  src.start();
  src.onended = () => {
    src.disconnect();
    gain.disconnect();
  };
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeAudio();
  });
}
