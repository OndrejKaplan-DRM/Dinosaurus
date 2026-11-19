// Úlomky po rozkousnutí větve nebo zásahu štítu. Jen ozdoba: o skóre ani o prohře nerozhodují,
// proto stačí vlastní balistika s odrazem od země místo celého fyzikálního enginu.
import * as T from 'three';

const GRAVITY = 18;
const GROUND = 0.08;
const BOUNCE = 0.32;

/** Stav jednoho úlomku bez vazby na vykreslování, aby šel zkoušet v Node. */
export function stepParticle(p, dt) {
  if (p.life <= 0) return;
  p.life -= dt;
  p.vy -= GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;
  if (p.y < GROUND) {
    p.y = GROUND;
    p.vy = Math.abs(p.vy) * BOUNCE;
    if (p.vy < 0.6) p.vy = 0;
    p.vx *= 0.7;
    p.vz *= 0.7;
    p.spin *= 0.6;
  }
  p.angle += p.spin * dt;
}

export class Debris {
  constructor(count = 32, random = Math.random) {
    this.random = random;
    this.next = 0;
    this.particles = Array.from({ length: count }, () => ({ x: 0, y: -30, z: 0, vx: 0, vy: 0, vz: 0, angle: 0, spin: 0, life: 0 }));
    this.meshes = [];
  }
  /** Volitelné: bez scény úlomky jen počítá (testy, náhradní vykreslení). */
  attach(scene, woodTexture) {
    const material = new T.MeshStandardMaterial({ map: woodTexture, color: 0xc7a679, roughness: 1 });
    const geometry = new T.DodecahedronGeometry(0.12, 0);
    this.meshes = this.particles.map(() => {
      const mesh = new T.Mesh(geometry, material);
      mesh.visible = false;
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    });
  }
  burst(x, y, z, n = 8) {
    const r = this.random;
    for (let i = 0; i < n; i++) {
      const p = this.particles[this.next++ % this.particles.length];
      Object.assign(p, { x, y: y + 0.5, z, vx: (r() - 0.5) * 5, vy: 2 + r() * 4, vz: 2 + r() * 4, angle: r() * 6, spin: (r() - 0.5) * 16, life: 2.2 });
    }
  }
  step(dt) {
    for (const p of this.particles) stepParticle(p, dt);
  }
  draw() {
    for (let i = 0; i < this.meshes.length; i++) {
      const p = this.particles[i];
      const mesh = this.meshes[i];
      mesh.visible = p.life > 0;
      if (!mesh.visible) continue;
      mesh.position.set(p.x, p.y, p.z);
      mesh.rotation.set(p.angle, p.angle * 0.7, p.angle * 0.4);
      mesh.scale.set(1.9, 0.65, 1).multiplyScalar(Math.min(1, p.life * 3));
    }
  }
  clear() {
    for (const p of this.particles) p.life = 0;
    for (const mesh of this.meshes) mesh.visible = false;
  }
  get active() {
    return this.particles.filter((p) => p.life > 0).length;
  }
}
