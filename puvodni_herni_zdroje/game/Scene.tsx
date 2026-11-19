import { useFrame, useLoader } from "@react-three/fiber";
import { CuboidCollider, Physics, RigidBody, useBeforePhysicsStep } from "@react-three/rapier";
import type { RapierCollider, RapierRigidBody } from "@react-three/rapier";
import { ActiveCollisionTypes } from "@dimforge/rapier3d-compat";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { palette } from "@/game/palette";
import { settings } from "@/game/settings";
import { setAmbience, setMusicCue } from "@/game/audio";
import { LANE_X, POOL, SHAPE, debrisQ, onTouch, sim, stepSim, type Kind } from "@/game/sim";
import { MenuGrove } from "@/game/MenuGrove";
import { Raptor } from "@/game/Raptor";

const TEX = ["/textures/ground.jpg", "/textures/rock.jpg", "/textures/wood.jpg", "/textures/sky.jpg", "/textures/fern.png"];

const bodies: (RapierRigidBody | null)[] = Array.from({ length: POOL }, () => null);
const colliders: (RapierCollider | null)[] = Array.from({ length: POOL }, () => null);
const visuals: (THREE.Group | null)[] = Array.from({ length: POOL }, () => null);
const debrisBodies: (RapierRigidBody | null)[] = Array.from({ length: 10 }, () => null);
const debrisLeft = Array.from({ length: 10 }, () => 0);

const PAIR = ActiveCollisionTypes.DEFAULT | ActiveCollisionTypes.KINEMATIC_KINEMATIC;

type SizedCollider = RapierCollider & {
  setHalfExtents: (v: { x: number; y: number; z: number }) => void;
  setTranslationWrtParent: (v: { x: number; y: number; z: number }) => void;
};

function shapeOf(kind: Kind) {
  return SHAPE[kind];
}

function Director() {
  useFrame((_, dt) => {
    stepSim(dt);
  });

  useBeforePhysicsStep(() => {
    for (let i = 0; i < POOL; i += 1) {
      const body = bodies[i];
      const col = colliders[i] as SizedCollider | null;
      const view = visuals[i];
      const o = sim.obstacles[i];
      if (!body || !o) continue;
      const alive = o.alive && (sim.phase === "playing" || sim.phase === "paused" || sim.phase === "dying");
      body.setNextKinematicTranslation({
        x: o.lane * LANE_X,
        y: alive ? o.y : -40,
        z: alive ? o.z : 0,
      });
      (body as RapierRigidBody & { userData?: { poolId: number } }).userData = { poolId: i };
      if (col) {
        const s = shapeOf(o.kind);
        col.setHalfExtents({ x: s.hx, y: s.hy, z: s.hz });
        col.setTranslationWrtParent({ x: 0, y: s.py, z: 0 });
        col.setEnabled(alive && sim.phase === "playing");
      }
      if (view) {
        for (const child of view.children) child.visible = child.name === o.kind;
        if (o.kind === "amber" || o.kind === "shield") view.rotation.y += 0.05;
        else view.rotation.y = 0;
        view.position.y = o.hop;
      }
    }

    while (debrisQ.length) {
      const job = debrisQ.shift();
      if (!job) break;
      let slot = debrisLeft.findIndex((t) => t <= 0);
      if (slot < 0) slot = 0;
      const body = debrisBodies[slot];
      if (!body) continue;
      debrisLeft[slot] = 1.35;
      body.setEnabled(true);
      body.setGravityScale(1, true);
      body.setTranslation({ x: job.x, y: job.y, z: job.z }, true);
      body.setLinvel({ x: job.vx, y: job.vy, z: job.vz }, true);
      body.setAngvel({ x: job.ax, y: job.ay, z: job.az }, true);
      body.wakeUp();
    }
  });

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < debrisLeft.length; i += 1) {
      if (debrisLeft[i] <= 0) continue;
      debrisLeft[i] -= d;
      if (debrisLeft[i] <= 0) {
        const body = debrisBodies[i];
        body?.setGravityScale(0, true);
        body?.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body?.setTranslation({ x: i * 0.4, y: -40, z: 0 }, true);
      }
    }
  });

  return null;
}

function Player() {
  const body = useRef<RapierRigidBody>(null);
  const stand = useRef<RapierCollider>(null);
  const slide = useRef<RapierCollider>(null);

  useBeforePhysicsStep(() => {
    const b = body.current;
    if (!b) return;
    b.setNextKinematicTranslation({ x: sim.x, y: sim.y, z: 0 });
    const hot = sim.phase === "playing";
    stand.current?.setEnabled(hot && sim.sliding <= 0);
    slide.current?.setEnabled(hot && sim.sliding > 0);
  });

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[0, 0, 0]}
      onIntersectionEnter={(payload) => {
        const other = payload.other.rigidBody as { userData?: { poolId?: number } } | undefined;
        const id = other?.userData?.poolId;
        if (typeof id === "number") onTouch(id);
      }}
    >
      <CuboidCollider ref={stand} args={[0.4, 0.62, 0.42]} position={[0, 0.7, 0]} sensor activeCollisionTypes={PAIR} />
      <CuboidCollider ref={slide} args={[0.4, 0.22, 0.46]} position={[0, 0.28, -0.18]} sensor activeCollisionTypes={PAIR} />
      <Raptor />
    </RigidBody>
  );
}

function Chunk({ index, rock, wood }: { index: number; rock: THREE.Texture; wood: THREE.Texture }) {
  return (
    <RigidBody
      type="kinematicPosition"
      colliders={false}
      position={[0, -40, 0]}
      userData={{ poolId: index }}
      ref={(node) => {
        bodies[index] = node;
      }}
    >
      <CuboidCollider
        args={[0.5, 0.5, 0.5]}
        sensor
        activeCollisionTypes={PAIR}
        ref={(node) => {
          colliders[index] = node;
        }}
      />
      <group
        ref={(node) => {
          visuals[index] = node;
        }}
      >
        <group name="rock">
          <mesh castShadow position={[0, 0.48, 0]} scale={[1.15, 0.85, 1]}>
            <dodecahedronGeometry args={[0.55, 0]} />
            <meshStandardMaterial map={rock} roughness={0.92} />
          </mesh>
        </group>
        <group name="snack">
          <mesh castShadow position={[0, 0.32, 0]}>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshStandardMaterial color={palette.snack} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[0, 0.48, -0.22]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color={palette.snack} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.28, 0.32]} rotation={[0.6, 0, 0]}>
            <coneGeometry args={[0.08, 0.4, 6]} />
            <meshStandardMaterial color="#3e5a28" />
          </mesh>
        </group>
        <group name="log">
          <mesh castShadow position={[0, 1.5, 0]} rotation={[0.08, 0.04, Math.PI / 2]}>
            <cylinderGeometry args={[0.22, 0.3, 2.05, 7]} />
            <meshStandardMaterial map={wood} roughness={0.86} />
          </mesh>
          <mesh castShadow position={[0.15, 1.58, 0.05]} rotation={[0.4, 0.2, Math.PI / 2]}>
            <cylinderGeometry args={[0.1, 0.16, 0.7, 5]} />
            <meshStandardMaterial map={wood} roughness={0.9} />
          </mesh>
        </group>
        <group name="thorn">
          {[0, 0.35, -0.3].map((z) => (
            <mesh key={z} castShadow position={[0, 0.7, z]}>
              <coneGeometry args={[0.28, 1.5, 6]} />
              <meshStandardMaterial color={palette.thorn} roughness={0.85} />
            </mesh>
          ))}
        </group>
        <group name="crate">
          <mesh castShadow position={[0, 0.85, 0]}>
            <boxGeometry args={[1.05, 1.55, 1.05]} />
            <meshStandardMaterial map={wood} roughness={0.75} />
          </mesh>
        </group>
        <group name="amber">
          <mesh position={[0, 0, 0]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={palette.amber} emissive={palette.amber} emissiveIntensity={1.3} roughness={0.25} />
          </mesh>
        </group>
        <group name="shield">
          <mesh>
            <icosahedronGeometry args={[0.36, 0]} />
            <meshStandardMaterial color={palette.bone} emissive={palette.bone} emissiveIntensity={0.35} roughness={0.35} />
          </mesh>
        </group>
      </group>
    </RigidBody>
  );
}

function Debris({ wood }: { wood: THREE.Texture }) {
  return (
    <>
      {debrisBodies.map((_, i) => (
        <RigidBody
          key={i}
          position={[i * 0.4, -40, 0]}
          gravityScale={0}
          restitution={0.32}
          friction={0.65}
          colliders="cuboid"
          ref={(node) => {
            debrisBodies[i] = node;
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.26, 0.18, 0.22]} />
            <meshStandardMaterial map={wood} color="#d7b089" roughness={0.7} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

function loopZ(travel: number, span: number, near: number) {
  const m = ((travel % span) + span) % span;
  return near - span + m;
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function lump(seed: number) {
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const swell =
      Math.sin(n.x * 2.6 + seed * 1.3) * Math.cos(n.z * 2.2 + seed * 0.6) * 0.16 +
      Math.sin(n.y * 3.4 + n.x * 1.7 + seed) * 0.08;
    v.copy(n).multiplyScalar(1 + swell);
    if (v.y < -0.05) v.y *= 0.55;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function frond() {
  const geo = new THREE.PlaneGeometry(1.7, 2.5, 1, 5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    const t = (y + 1.25) / 2.5;
    pos.setZ(i, Math.sin(t * Math.PI) * 0.22);
    pos.setX(i, pos.getX(i) * (0.55 + t * 0.7));
  }
  geo.computeVertexNormals();
  return geo;
}

const FROND = frond();

function skyZoom(tex: THREE.Texture, world: number, phase: number) {
  const cycle = (((world * 0.024 + phase) % 1) + 1) % 1;
  const zoom = 1 + cycle * 0.62;
  const rep = 1 / zoom;
  tex.repeat.set(rep, rep);
  tex.offset.set((1 - rep) * 0.5, (1 - rep) * 0.38);
  if (cycle < 0.18) return cycle / 0.18;
  if (cycle > 0.72) return (1 - cycle) / 0.28;
  return 1;
}

function Scenery({
  ground,
  rock,
  fern,
  sky,
}: {
  ground: THREE.Texture;
  rock: THREE.Texture;
  fern: THREE.Texture;
  sky: THREE.Texture;
}) {
  const cliffRefs = useRef<(THREE.Group | null)[]>([]);
  const fernRefs = useRef<(THREE.Group | null)[]>([]);
  const midRefs = useRef<(THREE.Group | null)[]>([]);
  const ridgeRefs = useRef<(THREE.Group | null)[]>([]);
  const skyMatA = useRef<THREE.MeshBasicMaterial>(null);
  const skyMatB = useRef<THREE.MeshBasicMaterial>(null);
  const hold = useRef<THREE.Group>(null);

  const cliffMap = useMemo(() => {
    const map = rock.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1.15, 1.05);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, [rock]);

  const lumps = useMemo(() => Array.from({ length: 14 }, (_, i) => lump(i + 3)), []);
  const cliffMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: cliffMap, roughness: 0.94, metalness: 0, color: "#efe0cf" }),
    [cliffMap],
  );
  const farMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: cliffMap, roughness: 1, metalness: 0, color: "#6b4a36" }),
    [cliffMap],
  );

  const skyA = useMemo(() => {
    const map = sky.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    return map;
  }, [sky]);
  const skyB = useMemo(() => {
    const map = skyA.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [skyA]);

  const cliffs = useMemo(() => {
    const list: { side: number; slot: number; jut: number; parts: { x: number; y: number; z: number; sx: number; sy: number; sz: number; ry: number; rx: number }[] }[] = [];
    let id = 1;
    for (let s = 0; s < 2; s += 1) {
      const side = s === 0 ? -1 : 1;
      for (let slot = 0; slot < 5; slot += 1) {
        const h = (k: number) => hash(id * 13 + k);
        id += 1;
        const tall = 1.15 + h(1) * 0.45;
        const mid = 0.85 + h(2) * 0.35;
        list.push({
          side,
          slot,
          jut: 7.35 + h(4) * 0.4,
          parts: [
            { x: 0.15, y: 1.15 * tall, z: -2.4, sx: 2.15 * tall, sy: 1.7 * tall, sz: 1.85 * tall, ry: h(5) * 2.4, rx: (h(6) - 0.5) * 0.4 },
            { x: 0.45, y: 2.55 * mid, z: -0.5, sx: 1.55 * mid, sy: 1.45 * mid, sz: 1.4 * mid, ry: h(7) * 3, rx: 0.25 },
            { x: -0.15, y: 0.95, z: 1.7, sx: 1.9, sy: 1.35, sz: 1.7, ry: -0.6, rx: 0.15 },
            { x: 0.7, y: 1.35, z: 3.5, sx: 1.45, sy: 1.15, sz: 1.35, ry: 1.1, rx: -0.2 },
            { x: 0.25, y: 3.15, z: 1.1, sx: 1.15, sy: 1.05, sz: 1.1, ry: 0.4, rx: 0.35 },
          ],
        });
      }
    }
    return list;
  }, []);

  const ferns = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const h = (k: number) => hash(80 + i * 9 + k);
        return {
          side: i % 2 === 0 ? -1 : 1,
          slot: i,
          x: 3.55 + h(1) * 1.7,
          scale: 0.85 + h(2) * 0.7,
          rot: (h(3) - 0.5) * 1.1,
          lean: (h(4) - 0.5) * 0.25,
        };
      }),
    [],
  );

  useFrame(() => {
    const span = 88;
    for (let i = 0; i < cliffs.length; i += 1) {
      const group = cliffRefs.current[i];
      const cliff = cliffs[i];
      if (!group || !cliff) continue;
      const z = loopZ(cliff.slot * (span / 5) + sim.world, span, 16);
      group.position.set(cliff.side * cliff.jut, 0, z);
    }
    const fernSpan = 78;
    for (let i = 0; i < ferns.length; i += 1) {
      const group = fernRefs.current[i];
      const item = ferns[i];
      if (!group || !item) continue;
      const z = loopZ(item.slot * (fernSpan / ferns.length) + sim.world, fernSpan, 10);
      group.position.set(item.side * item.x, 0, z);
    }
    const midSpan = 72;
    for (let i = 0; i < 8; i += 1) {
      const group = midRefs.current[i];
      if (!group) continue;
      const side = i < 4 ? -1 : 1;
      const slot = i % 4;
      const z = loopZ(slot * (midSpan / 4) + sim.world * 0.48, midSpan, -6);
      group.position.set(side * (10.4 + (slot % 2) * 0.8), 0, z);
    }
    const ridgeSpan = 96;
    for (let i = 0; i < 8; i += 1) {
      const group = ridgeRefs.current[i];
      if (!group) continue;
      const side = i % 2 === 0 ? -1 : 1;
      const z = loopZ(i * (ridgeSpan / 8) + sim.world * 0.3, ridgeSpan, -24);
      group.position.set(side * (14.2 + (i % 3) * 1.6), 0, z);
    }
    if (skyMatA.current) skyMatA.current.opacity = skyZoom(skyA, sim.world, 0);
    if (skyMatB.current) skyMatB.current.opacity = skyZoom(skyB, sim.world, 0.5);
    if (hold.current) hold.current.visible = sim.phase !== "menu";
  });

  return (
    <group ref={hold}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -18]} receiveShadow>
        <planeGeometry args={[28, 140]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      <mesh position={[0, 10.5, -46]}>
        <planeGeometry args={[92, 38]} />
        <meshBasicMaterial ref={skyMatA} map={skyA} transparent toneMapped={false} fog={false} depthWrite={false} />
      </mesh>
      <mesh position={[0, 10.2, -40]}>
        <planeGeometry args={[84, 34]} />
        <meshBasicMaterial ref={skyMatB} map={skyB} transparent toneMapped={false} fog={false} depthWrite={false} />
      </mesh>
      {cliffs.map((cliff, i) => (
        <group
          key={`c${i}`}
          ref={(node) => {
            cliffRefs.current[i] = node;
          }}
        >
          {cliff.parts.map((part, p) => (
            <mesh
              key={p}
              geometry={lumps[(i * 5 + p) % lumps.length]}
              position={[-cliff.side * part.x, part.y, part.z]}
              rotation={[part.rx, cliff.side * part.ry, part.rx * 0.6]}
              scale={[part.sx, part.sy, part.sz]}
              material={cliffMat}
            />
          ))}
          <mesh geometry={lumps[(i + 3) % lumps.length]} position={[-cliff.side * 0.9, 0.42, 1.4]} rotation={[0.4, i, 0.2]} scale={[0.7, 0.45, 0.6]} material={cliffMat} />
          <mesh geometry={lumps[(i + 7) % lumps.length]} position={[-cliff.side * 1.35, 0.28, -2.2]} rotation={[0.2, i * 0.7, 0.5]} scale={[0.55, 0.32, 0.5]} material={cliffMat} />
        </group>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const side = i < 4 ? -1 : 1;
        return (
          <group
            key={`m${i}`}
            ref={(node) => {
              midRefs.current[i] = node;
            }}
          >
            <mesh geometry={lumps[i % lumps.length]} position={[0, 1.6, 0]} rotation={[0.2, side * 0.7, 0.1]} scale={[2.4, 1.8, 2.2]} material={farMat} />
            <mesh geometry={lumps[(i + 4) % lumps.length]} position={[-side * 0.5, 3.1, 1.6]} rotation={[0.35, side * -0.4, 0.2]} scale={[1.7, 1.5, 1.6]} material={cliffMat} />
            <mesh geometry={lumps[(i + 9) % lumps.length]} position={[side * 0.3, 0.9, -2.2]} rotation={[0.15, i, -0.25]} scale={[1.9, 1.15, 1.8]} material={farMat} />
          </group>
        );
      })}
      {Array.from({ length: 8 }, (_, i) => {
        return (
          <group
            key={`r${i}`}
            ref={(node) => {
              ridgeRefs.current[i] = node;
            }}
          >
            <mesh geometry={lumps[(i + 2) % lumps.length]} position={[0, 1.35, 0]} rotation={[0.18, i * 0.6, 0.12]} scale={[2.8, 1.7, 2.2]} material={farMat} />
            <mesh geometry={lumps[(i + 6) % lumps.length]} position={[0.6, 2.4, 0.8]} rotation={[-0.15, i, 0.3]} scale={[1.6, 1.25, 1.45]} material={farMat} />
          </group>
        );
      })}
      {ferns.map((item, i) => (
        <group
          key={`f${i}`}
          ref={(node) => {
            fernRefs.current[i] = node;
          }}
          rotation={[item.lean, item.side * item.rot, 0]}
          scale={item.scale}
        >
          <mesh position={[0, 1.25, 0]} geometry={FROND}>
            <meshStandardMaterial map={fern} transparent alphaTest={0.45} roughness={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[item.side * 0.35, 0.95, 0.25]} rotation={[0.1, 0.8, 0.15]} scale={0.72} geometry={FROND}>
            <meshStandardMaterial map={fern} transparent alphaTest={0.45} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rig() {
  const reduce = useRef(false);
  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const cam = state.camera;
    const phase = sim.phase;
    const menu = phase === "menu";
    const shake = settings.shake && !reduce.current ? sim.shake : 0;
    const jx = shake > 0.02 ? (Math.random() - 0.5) * shake : 0;
    const jy = shake > 0.02 ? (Math.random() - 0.5) * shake * 0.6 : 0;
    const t = state.clock.elapsedTime;
    const tx = menu ? 0.25 + Math.sin(t * 0.17) * 0.62 : sim.x * 0.4 + jx;
    const ty = menu ? 3.55 + Math.sin(t * 0.11) * 0.14 : 2.15 + sim.y * 0.1 + jy;
    const tz = menu ? 8.55 : 5.35;
    const k = 1 - Math.exp(-4.2 * d);
    cam.position.x += (tx - cam.position.x) * k;
    cam.position.y += (ty - cam.position.y) * k;
    cam.position.z += (tz - cam.position.z) * k;
    if (menu) cam.lookAt(Math.sin(t * 0.13) * 0.45, 1.75, -9);
    else cam.lookAt(sim.x * 0.15, 1.05 + sim.y * 0.12, -7);
    state.gl.shadowMap.enabled = settings.shadows;
    if (state.scene.background instanceof THREE.Color) {
      state.scene.background.set(menu ? "#24341f" : palette.bg);
    }
    const fog = state.scene.fog as THREE.Fog | undefined;
    if (fog) {
      fog.near = menu ? 26 : 18;
      fog.far = menu ? 84 : 58;
      fog.color.set(menu ? "#7f9a68" : palette.fog);
    }
    if (menu) setMusicCue("menu");
    else if (phase === "paused") setMusicCue("pause");
    else if (phase === "dying" || phase === "dead") setMusicCue("peril");
    else if (sim.shields > 0) setMusicCue("shield");
    else if (sim.speed > 18) setMusicCue("rush");
    else if (sim.distance < 18) setMusicCue("start");
    else setMusicCue("run");
    setAmbience(menu ? 1 : phase === "playing" ? 0.62 : 0.32);
  }, -1);
  return null;
}

function Spores() {
  const count = 32;
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 8;
      arr[i * 3 + 1] = 0.6 + Math.random() * 3.2;
      arr[i * 3 + 2] = -Math.random() * 26;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const speed = sim.phase === "playing" ? sim.speed : 3.2;
    for (let i = 0; i < count; i += 1) {
      let z = attr.getZ(i) + d * speed * 0.92;
      let x = attr.getX(i) + Math.sin(sim.time * 0.7 + i) * d * 0.15;
      if (z > 1.5) {
        x = (Math.random() - 0.5) * 8;
        attr.setXYZ(i, x, 0.5 + Math.random() * 3.3, -20 - Math.random() * 8);
      } else {
        attr.setX(i, x);
        attr.setZ(i, z);
      }
    }
    attr.needsUpdate = true;
    if (ref.current) ref.current.visible = sim.phase !== "menu";
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#efd3b0" size={0.04} transparent opacity={0.22} depthWrite={false} />
    </points>
  );
}

function Dust() {
  const count = 18;
  const ref = useRef<THREE.Points>(null);
  const pos = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) arr[i * 3 + 1] = -1;
    return arr;
  }, []);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [pos]);
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const running = sim.phase === "playing" && sim.grounded && sim.sliding <= 0;
    for (let i = 0; i < count; i += 1) {
      let y = attr.getY(i);
      y += d * (0.6 + (i % 3) * 0.2);
      let z = attr.getZ(i) + d * (1.4 + sim.speed * 0.05);
      if (!running || y > 0.8 || z > 1.6) {
        if (running && i % 3 === Math.floor(sim.time * 8) % 3) {
          attr.setXYZ(i, sim.x + (Math.random() - 0.5) * 0.35, 0.05, 0.15);
        } else if (y > 0) {
          attr.setXYZ(i, 0, -2, 0);
        }
      } else {
        attr.setY(i, y);
        attr.setZ(i, z);
      }
    }
    attr.needsUpdate = true;
    if (ref.current) ref.current.visible = sim.phase === "playing";
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={palette.bone} size={0.07} transparent opacity={0.4} depthWrite={false} />
    </points>
  );
}

export function Scene() {
  const [ground, rock, wood, sky, fern] = useLoader(THREE.TextureLoader, TEX);

  useLayoutTextures(ground, rock, wood, sky, fern);

  return (
    <>
      <fog attach="fog" args={[palette.fog, 18, 58]} />
      <hemisphereLight args={["#ffe0b8", "#243020", 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3.5, 7, 9]} intensity={1.35} color={"#ffe7c4"} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <Physics gravity={[0, -24, 0]} timeStep={1 / 60} updatePriority={-1}>
        <Director />
        <RigidBody type="fixed" colliders="cuboid" position={[0, -0.55, 0]}>
          <mesh visible={false}>
            <boxGeometry args={[40, 1, 160]} />
          </mesh>
        </RigidBody>
        <Scenery ground={ground} rock={rock} fern={fern} sky={sky} />
        <Player />
        {sim.obstacles.map((o) => (
          <Chunk key={o.id} index={o.id} rock={rock} wood={wood} />
        ))}
        <Debris wood={wood} />
      </Physics>
      <MenuGrove />
      <Rig />
      <Dust />
      <Spores />
    </>
  );
}

function useLayoutTextures(...textures: THREE.Texture[]) {
  const [ground, rock, wood, sky, fern] = textures;
  ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(5, 22);
  rock.wrapS = rock.wrapT = THREE.RepeatWrapping;
  rock.repeat.set(1, 2);
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping;
  wood.colorSpace = THREE.SRGBColorSpace;
  ground.colorSpace = THREE.SRGBColorSpace;
  rock.colorSpace = THREE.SRGBColorSpace;
  sky.colorSpace = THREE.SRGBColorSpace;
  fern.colorSpace = THREE.SRGBColorSpace;
  ground.anisotropy = 8;

  useFrame(() => {
    ground.offset.y = (sim.world * 0.045) % 1;
  });
}