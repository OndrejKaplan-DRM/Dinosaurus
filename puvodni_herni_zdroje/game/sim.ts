import { playSfx } from "@/game/audio";
import { primeInput, sampleInput, setQa } from "@/game/input";
import { paceOf, settings } from "@/game/settings";

export const LANE_X = 2.35;
export const POOL = 16;

export const SHAPE = {
  rock: { hx: 0.72, hy: 0.46, hz: 1.15, py: 0.46 },
  snack: { hx: 0.55, hy: 0.36, hz: 0.7, py: 0.36 },
  log: { hx: 0.92, hy: 0.26, hz: 0.34, py: 1.5 },
  thorn: { hx: 0.66, hy: 0.95, hz: 0.95, py: 0.95 },
  crate: { hx: 0.6, hy: 0.85, hz: 0.72, py: 0.85 },
  amber: { hx: 0.38, hy: 0.38, hz: 0.38, py: 0 },
  shield: { hx: 0.4, hy: 0.4, hz: 0.4, py: 0 },
} as const;

export type Kind = keyof typeof SHAPE;
export type Lane = -1 | 0 | 1;

export type Obstacle = {
  id: number;
  kind: Kind;
  lane: Lane;
  z: number;
  y: number;
  alive: boolean;
  hop: number;
  hopV: number;
  brushed: boolean;
};

export type DebrisJob = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  ax: number;
  ay: number;
  az: number;
};

export type Toast = { id: number; text: string; life: number };

export type Phase = "menu" | "playing" | "paused" | "dying" | "dead";

const JUMP_V = 8.8;
const GRAV = 30;

export const debrisQ: DebrisJob[] = [];

function loadBest() {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem("drap-best") || 0) || 0;
  } catch {
    return 0;
  }
}

function makeObstacle(id: number): Obstacle {
  return { id, kind: "rock", lane: 0, z: 0, y: 0, alive: false, hop: 0, hopV: 0, brushed: false };
}

export const sim = {
  phase: "menu" as Phase,
  x: 0,
  laneTarget: 0 as Lane,
  y: 0,
  vy: 0,
  grounded: true,
  sliding: 0,
  slideCd: 0,
  biting: 0,
  biteCd: 0,
  jumpBuffer: 0,
  coyote: 0,
  speed: 0,
  distance: 0,
  world: 0,
  score: 0,
  combo: 0,
  comboT: 0,
  amber: 0,
  chomps: 0,
  shields: 0,
  shake: 0,
  flash: 0,
  fall: 0,
  dying: 0,
  best: loadBest(),
  isRecord: false,
  time: 0,
  rows: 0,
  nextRowZ: -18,
  obstacles: Array.from({ length: POOL }, (_, id) => makeObstacle(id)),
  toasts: [] as Toast[],
  toastId: 1,
};

export type HudSnap = {
  phase: Phase;
  score: number;
  best: number;
  distance: number;
  combo: number;
  shields: number;
  amber: number;
  chomps: number;
  flash: number;
  isRecord: boolean;
  toasts: Toast[];
  speed: number;
};

let snap: HudSnap = capture();
let pubAcc = 0;
const listeners = new Set<() => void>();

function capture(): HudSnap {
  return {
    phase: sim.phase,
    score: Math.floor(sim.score),
    best: sim.best,
    distance: Math.floor(sim.distance),
    combo: sim.combo,
    shields: sim.shields,
    amber: sim.amber,
    chomps: sim.chomps,
    flash: sim.flash,
    isRecord: sim.isRecord,
    toasts: sim.toasts.map((t) => ({ ...t })),
    speed: sim.speed,
  };
}

function publish(force = false) {
  if (!force && pubAcc < 0.1 && sim.flash <= 0 && sim.toasts.length === 0 && snap.phase === sim.phase && snap.combo === sim.combo) {
    return;
  }
  pubAcc = 0;
  snap = capture();
  listeners.forEach((fn) => fn());
}

export function subscribeHud(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getHud() {
  return snap;
}

function toast(text: string) {
  sim.toasts.push({ id: sim.toastId++, text, life: 0.9 });
  if (sim.toasts.length > 4) sim.toasts.shift();
}

function bump(base: number, label: string | null) {
  sim.combo = Math.min(8, sim.combo + 1);
  sim.comboT = 2.4;
  const gain = Math.round(base * sim.combo);
  sim.score += gain;
  if (label) toast(`+${gain} ${label}`);
}

function burstAt(x: number, y: number, z: number) {
  for (let i = 0; i < 5; i += 1) {
    debrisQ.push({
      x: x + (Math.random() - 0.5) * 0.5,
      y: y + 0.35,
      z,
      vx: (Math.random() - 0.5) * 7,
      vy: 3.2 + Math.random() * 4.5,
      vz: 1.5 + Math.random() * 5,
      ax: (Math.random() - 0.5) * 10,
      ay: (Math.random() - 0.5) * 10,
      az: (Math.random() - 0.5) * 10,
    });
  }
  if (debrisQ.length > 24) debrisQ.splice(0, debrisQ.length - 24);
}

function alloc() {
  return sim.obstacles.find((o) => !o.alive) ?? null;
}

function randLane(): Lane {
  return (Math.floor(Math.random() * 3) - 1) as Lane;
}

function place(kind: Kind, lane: Lane, y = 0, z = sim.nextRowZ) {
  const o = alloc();
  if (!o) return;
  o.kind = kind;
  o.lane = lane;
  o.z = z;
  o.y = y;
  o.alive = true;
  o.hop = 0;
  o.hopV = 0;
  o.brushed = false;
}

function spawnRow() {
  const z = sim.nextRowZ;
  const gap = Math.max(15, sim.speed * 1.02);
  sim.nextRowZ = z - gap;
  sim.rows += 1;
  const d = sim.distance;

  if (sim.rows === 1) {
    place("amber", 0, 0.95, z);
    return;
  }
  if (sim.rows === 2) {
    place("rock", 0, 0, z);
    return;
  }
  if (sim.rows === 3) {
    place("log", 1, 0, z);
    return;
  }
  if (sim.rows === 4) {
    place("snack", -1, 0, z);
    return;
  }
  if (sim.rows === 5) {
    place("crate", 0, 0, z);
    return;
  }

  const roll = Math.random();
  if (roll < 0.16) {
    const high = Math.random() < 0.34;
    place("amber", randLane(), high ? 2.05 : 0.95, z);
    if (Math.random() < 0.45) place("amber", randLane(), 0.95, z - 2.2);
    return;
  }
  if (roll < 0.2 && d > 80) {
    place("shield", randLane(), 1.15, z);
    return;
  }

  const easy: Kind[] = ["rock", "log", "snack"];
  const mid: Kind[] = ["rock", "log", "snack", "crate", "thorn"];
  const pool = d < 70 ? easy : mid;
  const pick = () => pool[Math.floor(Math.random() * pool.length)] ?? "rock";

  if (roll < 0.74 || d < 90) {
    place(pick(), randLane(), 0, z);
    return;
  }

  const free = randLane();
  const lanes = ([-1, 0, 1] as const).filter((lane) => lane !== free);
  place(pick(), lanes[0] ?? -1, 0, z);
  place(pick(), lanes[1] ?? 1, 0, z);
}

function fillTrack() {
  sim.nextRowZ = -18;
  sim.rows = 0;
  while (sim.nextRowZ > -74) spawnRow();
}

function saveBest() {
  const score = Math.floor(sim.score);
  sim.isRecord = score > sim.best && score > 0;
  if (score > sim.best) {
    sim.best = score;
    try {
      localStorage.setItem("drap-best", String(score));
    } catch {
      /* ignore */
    }
  }
}

function finishDead() {
  sim.phase = "dead";
  saveBest();
  playSfx("fail", { rate: 1, vol: 0.9 });
  publish(true);
}

function hurt(o: Obstacle) {
  const x = o.lane * LANE_X;
  o.alive = false;
  if (sim.shields > 0) {
    sim.shields -= 1;
    sim.shake = Math.max(sim.shake, 0.32);
    sim.flash = 0.28;
    sim.combo = 0;
    burstAt(x, 0.6, o.z);
    playSfx("thud", { vol: 0.8 });
    toast("Štít praskl");
    publish(true);
    return;
  }
  sim.phase = "dying";
  sim.dying = 0.9;
  sim.fall = 0;
  sim.shake = 0.62;
  sim.flash = 0.62;
  playSfx("crash", { rate: 1, vol: 1 });
  publish(true);
}

function knockLog(o: Obstacle) {
  if (o.brushed) return;
  o.brushed = true;
  o.hopV = Math.max(o.hopV, 5.4);
  playSfx("thud", { vol: 0.28, rate: 1.62 });
}

function logOverhead() {
  for (const o of sim.obstacles) {
    if (!o.alive || o.kind !== "log") continue;
    if (Math.abs(sim.x - o.lane * LANE_X) > 1.05) continue;
    if (o.z > -1.8 && o.z < 1.15) return o;
  }
  return null;
}

function tryChomp() {
  let wood = false;
  let meat = false;
  for (const o of sim.obstacles) {
    if (!o.alive) continue;
    if (o.kind !== "crate" && o.kind !== "snack") continue;
    if (Math.abs(sim.x - o.lane * LANE_X) > 1.05) continue;
    if (o.z < -3.15 || o.z > 0.9) continue;
    o.alive = false;
    if (o.kind === "crate") {
      wood = true;
      sim.chomps += 1;
      bump(70, "bedna");
    } else {
      meat = true;
      sim.chomps += 1;
      bump(55, "kořist");
    }
    burstAt(o.lane * LANE_X, 0.45, o.z);
  }
  if (wood) playSfx("wood", { vol: 0.9 });
  if (meat) playSfx("chomp", { vol: 0.95 });
  if (!wood && !meat) playSfx("bite", { vol: 0.75 });
}

export function onTouch(id: number) {
  const o = sim.obstacles[id];
  if (!o?.alive || sim.phase !== "playing") return;
  if (o.kind === "amber") {
    o.alive = false;
    sim.amber += 1;
    bump(35, "jantar");
    playSfx("amber", { vol: 0.8 });
    return;
  }
  if (o.kind === "shield") {
    o.alive = false;
    sim.shields = 1;
    playSfx("shield", { rate: 1, vol: 0.85 });
    toast("Štít");
    publish(true);
    return;
  }
  if (o.kind === "log" && sim.sliding > 0) {
    knockLog(o);
    return;
  }
  hurt(o);
}

export function beginRun() {
  for (const o of sim.obstacles) o.alive = false;
  sim.phase = "playing";
  sim.x = 0;
  sim.laneTarget = 0;
  sim.y = 0;
  sim.vy = 0;
  sim.grounded = true;
  sim.sliding = 0;
  sim.slideCd = 0;
  sim.biting = 0;
  sim.biteCd = 0.2;
  sim.jumpBuffer = 0;
  sim.coyote = 0.12;
  sim.distance = 0;
  sim.score = 0;
  sim.combo = 0;
  sim.comboT = 0;
  sim.amber = 0;
  sim.chomps = 0;
  sim.shields = 0;
  sim.fall = 0;
  sim.dying = 0;
  sim.isRecord = false;
  sim.flash = 0;
  sim.speed = 11 * paceOf();
  sim.toasts = [];
  fillTrack();
  primeInput();
  playSfx("jingle", { rate: 1, vol: 0.7 });
  publish(true);
}

export function pauseRun() {
  if (sim.phase !== "playing") return;
  sim.phase = "paused";
  publish(true);
}

export function resumeRun() {
  if (sim.phase !== "paused") return;
  sim.phase = "playing";
  primeInput();
  publish(true);
}

export function toMenu() {
  sim.phase = "menu";
  for (const o of sim.obstacles) o.alive = false;
  sim.x = 0;
  sim.y = 0;
  sim.vy = 0;
  sim.fall = 0;
  sim.laneTarget = 0;
  publish(true);
}

export function resetBest() {
  sim.best = 0;
  try {
    localStorage.removeItem("drap-best");
  } catch {
    /* ignore */
  }
  publish(true);
}

export function nudgeLane(dir: -1 | 1) {
  if (sim.phase !== "playing") return;
  sim.laneTarget = Math.max(-1, Math.min(1, sim.laneTarget + dir)) as Lane;
}

export function requestJump() {
  if (sim.phase !== "playing") return;
  sim.jumpBuffer = 0.14;
}

export function requestSlide() {
  if (sim.phase !== "playing" || !sim.grounded) return;
  sim.sliding = 0.62;
  sim.slideCd = 0.72;
  playSfx("slide", { vol: 0.7 });
}

export function debugHit() {
  if (sim.phase !== "playing") beginRun();
  const o = sim.obstacles[0];
  if (!o) return;
  o.alive = true;
  o.kind = "thorn";
  o.lane = sim.laneTarget;
  o.y = 0;
  o.z = -1.2;
  sim.x = sim.laneTarget * LANE_X;
}

function stepPlaying(dt: number) {
  const pace = paceOf();
  const cap = 25 * pace;
  sim.speed = Math.min(cap, (11 + sim.distance * 0.03) * pace);

  const { held, pressed, released } = sampleInput();
  if (pressed.left) sim.laneTarget = Math.max(-1, sim.laneTarget - 1) as Lane;
  if (pressed.right) sim.laneTarget = Math.min(1, sim.laneTarget + 1) as Lane;
  const targetX = sim.laneTarget * LANE_X;
  const maxStep = 22 * dt;
  const dx = targetX - sim.x;
  if (Math.abs(dx) <= maxStep) sim.x = targetX;
  else sim.x += Math.sign(dx) * maxStep;

  if (pressed.up) sim.jumpBuffer = 0.14;
  else sim.jumpBuffer -= dt;
  if (sim.grounded) sim.coyote = 0.12;
  else sim.coyote -= dt;

  if (pressed.down && sim.grounded) {
    sim.sliding = 0.62;
    sim.slideCd = 0.72;
    playSfx("slide", { vol: 0.7 });
  } else if (held.down && sim.grounded && sim.sliding <= 0 && sim.slideCd <= 0) {
    sim.sliding = 0.62;
    sim.slideCd = 0.72;
  }
  sim.slideCd = Math.max(0, sim.slideCd - dt);
  const bar = sim.grounded ? logOverhead() : null;
  if (bar && (sim.sliding > 0 || sim.slideCd > 0)) {
    sim.sliding = Math.max(sim.sliding, 0.22);
    knockLog(bar);
  } else {
    sim.sliding = Math.max(0, sim.sliding - dt);
  }

  if (sim.jumpBuffer > 0 && sim.coyote > 0 && sim.y < 0.25) {
    sim.vy = JUMP_V;
    sim.grounded = false;
    sim.coyote = 0;
    sim.jumpBuffer = 0;
    sim.sliding = 0;
    playSfx("jump", { vol: 0.8 });
  }
  if (released.up && sim.vy > 0) sim.vy *= 0.48;
  sim.vy -= GRAV * dt;
  sim.y += sim.vy * dt;
  if (sim.y <= 0) {
    if (!sim.grounded) playSfx("thud", { vol: 0.28, rate: 1.05 });
    sim.y = 0;
    sim.vy = 0;
    sim.grounded = true;
  }

  if (pressed.bite && sim.biteCd <= 0) {
    sim.biting = 0.28;
    sim.biteCd = 0.46;
    tryChomp();
  }
  sim.biteCd = Math.max(0, sim.biteCd - dt);
  sim.biting = Math.max(0, sim.biting - dt);

  sim.world += sim.speed * dt;
  sim.distance += sim.speed * dt;
  sim.score += sim.speed * dt * 5;
  sim.nextRowZ += sim.speed * dt;

  for (const o of sim.obstacles) {
    if (!o.alive) continue;
    o.z += sim.speed * dt;
    o.hopV -= 26 * dt;
    o.hop += o.hopV * dt;
    if (o.hop <= 0) {
      o.hop = 0;
      o.hopV = 0;
    }
    if (o.z > 3.2) {
      const near = Math.abs(sim.x - o.lane * LANE_X) < 0.9;
      if (near && (o.kind === "rock" || o.kind === "log" || o.kind === "snack")) bump(10, null);
      o.alive = false;
    }
  }
  while (sim.nextRowZ > -72) spawnRow();

  sim.comboT -= dt;
  if (sim.comboT <= 0) sim.combo = 0;
}

export function stepSim(dt: number) {
  const d = Math.min(Math.max(dt, 0), 0.05);
  if (typeof document !== "undefined" && document.hidden) return;
  pubAcc += d;
  sim.time += d;
  sim.shake = Math.max(0, sim.shake - d * 1.35);
  sim.flash = Math.max(0, sim.flash - d * 1.4);
  for (const t of sim.toasts) t.life -= d;
  sim.toasts = sim.toasts.filter((t) => t.life > 0);

  if (sim.phase === "menu") {
    sampleInput();
    sim.world += 3.4 * d;
    publish();
    return;
  }
  if (sim.phase === "paused" || sim.phase === "dead") {
    sampleInput();
    publish();
    return;
  }
  if (sim.phase === "dying") {
    sampleInput();
    sim.fall = Math.min(1, sim.fall + d * 1.7);
    sim.dying -= d;
    if (sim.dying <= 0) finishDead();
    else publish();
    return;
  }
  stepPlaying(d);
  publish();
}

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      getX: () => number;
      getY: () => number;
      getLane: () => number;
      setKeys: (codes: string[]) => void;
      setSteer: (v: number) => void;
      debugHit: () => void;
      poseSlide: () => string;
    };
  }
}

export function installProbe() {
  window.__controlsTest = {
    getYaw: () => 0,
    getSpeed: () => (sim.phase === "playing" ? sim.speed : 0),
    getX: () => sim.x,
    getY: () => sim.y,
    getLane: () => sim.laneTarget,
    setKeys: (codes) => setQa(codes),
    setSteer: () => undefined,
    debugHit,
    poseSlide: () => {
      if (sim.phase !== "playing" && sim.phase !== "paused") beginRun();
      const o = sim.obstacles[0];
      if (!o) return sim.phase;
      o.alive = true;
      o.kind = "log";
      o.lane = sim.laneTarget;
      o.z = -0.15;
      o.y = 0;
      o.hop = 0.22;
      o.hopV = 0;
      o.brushed = true;
      sim.x = sim.laneTarget * LANE_X;
      sim.y = 0;
      sim.grounded = true;
      sim.sliding = 0.45;
      sim.phase = "paused";
      return "slide";
    },
  };
}
