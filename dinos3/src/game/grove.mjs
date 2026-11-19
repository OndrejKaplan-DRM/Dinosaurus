const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const GROVE_BOUNDS = { left: -4.3, right: 4.3, far: -13, near: 1.5 };
export class Grove {
  constructor() {
    this.active = false;
    this.time = 0;
    this.keys = new Set();
    this.animals = Array.from({ length: 4 }, (_, i) => ({
      x: i === 0 ? 2.2 : 1 + i * 0.8,
      z: i === 0 ? 0.2 : -2 - i * 2.5,
      y: 0,
      vy: 0,
      yaw: Math.PI,
      speed: 0,
      gait: i * 0.23,
      height: i === 0 ? 1.82 : 1.28 + i * 0.1,
    }));
  }
  enter() {
    this.active = true;
    this.release();
  }
  leave() {
    this.active = false;
    this.release();
  }
  release() {
    this.keys.clear();
  }
  command(cmd, on = true) {
    if (!this.active) return;
    if (on) this.keys.add(cmd);
    else this.keys.delete(cmd);
    if (cmd === 'jump' && on) {
      const a = this.animals[0];
      if (a.y === 0) a.vy = 7;
    }
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.04);
    this.time += dt;
    for (const [i, a] of this.animals.entries()) {
      let vx = 0,
        vz = 0;
      if (i === 0 && this.active) {
        vx = Number(this.keys.has('right')) - Number(this.keys.has('left'));
        vz = Number(this.keys.has('back')) - Number(this.keys.has('forward'));
        const length = Math.hypot(vx, vz),
          pace = this.keys.has('sprint') ? 4.1 : 2.1;
        if (length) {
          vx = (vx / length) * pace;
          vz = (vz / length) * pace;
        }
      } else {
        const gx = i === 0 ? 2 + Math.sin(this.time * 0.17) * 2 : Math.sin(this.time * 0.17 + i * 2) * 4,
          gz = i === 0 ? -2.3 + Math.cos(this.time * 0.11) * 2.8 : -7 + Math.cos(this.time * 0.11 + i * 1.7) * 4;
        const dx = gx - a.x,
          dz = gz - a.z,
          d = Math.hypot(dx, dz),
          pace = i % 2 ? 0.9 : 1.7;
        vx = (dx / Math.max(1, d)) * pace;
        vz = (dz / Math.max(1, d)) * pace;
      }
      const oldX = a.x,
        oldZ = a.z;
      a.x = clamp(a.x + vx * dt, GROVE_BOUNDS.left, GROVE_BOUNDS.right);
      a.z = clamp(a.z + vz * dt, GROVE_BOUNDS.far, GROVE_BOUNDS.near);
      a.speed = Math.hypot(a.x - oldX, a.z - oldZ) / dt;
      if (a.speed > 0.02) {
        const yaw = Math.atan2(vx, vz),
          turn = Math.atan2(Math.sin(yaw - a.yaw), Math.cos(yaw - a.yaw));
        a.yaw += turn * (1 - Math.exp(-dt * 12));
        a.gait += dt * a.speed * 0.7;
      }
      a.vy -= 22 * dt;
      a.y = Math.max(0, a.y + a.vy * dt);
      if (a.y === 0) a.vy = 0;
    }
  }
}
