import * as T from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
/** Rapier owns secondary motion; deterministic swept collisions own the score. */
export class Debris {
  async init(scene, wood) {
    await RAPIER.init();
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -18, z: 0 });
    this.world.timestep = 1 / 120;
    const b = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.2, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(60, 0.2, 100), b);
    this.pool = [];
    const mat = new T.MeshStandardMaterial({ map: wood, color: 0xc7a679, roughness: 1 }),
      geo = new T.DodecahedronGeometry(0.12, 0);
    for (let i = 0; i < 32; i++) {
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic().setTranslation(0, -30, 0).setLinearDamping(0.15).setAngularDamping(0.2),
      );
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.13, 0.08, 0.13).setRestitution(0.32).setFriction(0.8), body);
      body.setEnabled(false);
      const mesh = new T.Mesh(geo, mat);
      mesh.visible = false;
      mesh.scale.set(1.9, 0.65, 1);
      mesh.castShadow = true;
      scene.add(mesh);
      this.pool.push({ body, mesh, life: 0 });
    }
    this.next = 0;
  }
  burst(x, y, z, n = 8) {
    if (!this.world) return;
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.next++ % this.pool.length];
      p.life = 2.2;
      p.body.setEnabled(true);
      p.body.setTranslation({ x, y: y + 0.5, z }, true);
      p.body.setLinvel({ x: (Math.random() - 0.5) * 5, y: 2 + Math.random() * 4, z: 2 + Math.random() * 4 }, true);
      p.body.setAngvel({ x: Math.random() * 8, y: Math.random() * 8, z: Math.random() * 6 }, true);
      p.mesh.visible = true;
    }
  }
  step(dt) {
    if (!this.world) return;
    this.world.step();
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        p.body.setEnabled(false);
      }
    }
  }
  draw() {
    for (const p of this.pool || [])
      if (p.life > 0) {
        p.mesh.position.copy(p.body.translation());
        p.mesh.quaternion.copy(p.body.rotation());
        p.mesh.scale.set(1.9, 0.65, 1).multiplyScalar(Math.min(1, p.life * 3));
      }
  }
  clear() {
    for (const p of this.pool || []) {
      p.life = 0;
      p.mesh.visible = false;
      p.body.setEnabled(false);
    }
  }
}
