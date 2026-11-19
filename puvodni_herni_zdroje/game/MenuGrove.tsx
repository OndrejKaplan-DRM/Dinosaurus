import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mountRaptor, prepareRaptor } from "@/game/Raptor";
import { sim } from "@/game/sim";

const TEX = ["/textures/ground.jpg", "/textures/rock.jpg", "/textures/sky.jpg", "/textures/fern.png"];

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 9.2) * 43758.5453;
  return x - Math.floor(x);
}

function paintTitle(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(47, 107, 79, 0.92)";
  ctx.beginPath();
  ctx.ellipse(170, 230, 120, 42, -0.7, 0, Math.PI * 2);
  ctx.ellipse(1110, 210, 130, 40, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(232, 93, 4, 0.85)";
  ctx.beginPath();
  ctx.ellipse(168, 214, 28, 70, 0.4, 0, Math.PI * 2);
  ctx.ellipse(1112, 196, 26, 68, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f0a202";
  ctx.beginPath();
  ctx.ellipse(w / 2, 200, 290, 92, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = "#1a1408";
  ctx.font = '700 210px "Fredoka", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText("Dinoš", w / 2, 188);
  const grad = ctx.createLinearGradient(0, 60, 0, 320);
  grad.addColorStop(0, "#fff6df");
  grad.addColorStop(0.45, "#ffd56a");
  grad.addColorStop(1, "#e07a1a");
  ctx.fillStyle = grad;
  ctx.fillText("Dinoš", w / 2, 188);
  ctx.font = '600 52px "Fredoka", sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = "#1a1408";
  ctx.strokeText("pravěký běh", w / 2, 360);
  ctx.fillStyle = "#f4efe4";
  ctx.fillText("pravěký běh", w / 2, 360);
}

function useTitleMap() {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 480;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    paintTitle(canvas);
    map.needsUpdate = true;
    return { canvas, map };
  }, []);

  useEffect(() => {
    let live = true;
    const redraw = () => {
      if (!live) return;
      paintTitle(tex.canvas);
      tex.map.needsUpdate = true;
    };
    void document.fonts.load('700 210px "Fredoka"').then(redraw);
    void document.fonts.ready.then(redraw);
    return () => {
      live = false;
    };
  }, [tex]);

  return tex.map;
}

function Wild({ seed }: { seed: number }) {
  const gltf = useGLTF("/models/raptor.glb");
  const model = useMemo(() => prepareRaptor(gltf.scene), [gltf.scene]);
  const fit = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const { actions } = useAnimations(gltf.animations, model);
  const motion = useRef({
    x: Math.sin(seed * 1.7) * 4.2,
    z: -3.2 - (seed % 5) * 2.7,
    vx: Math.cos(seed) * 0.8,
    vz: Math.sin(seed * 1.4) * 0.7,
    run: seed % 2 === 0,
    timer: 0.3 + (seed % 4) * 0.4,
  });

  useLayoutEffect(() => {
    const g = fit.current;
    if (!g) return;
    mountRaptor(model, g, 1.38 + (seed % 3) * 0.16);
  }, [model, seed]);

  useEffect(() => {
    const clip = gltf.animations[0];
    const action = clip ? actions[clip.name] : undefined;
    action?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      action?.stop();
    };
  }, [actions, gltf.animations]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05);
    const clip = gltf.animations[0];
    const action = clip ? actions[clip.name] : undefined;
    const live = sim.phase === "menu";
    if (action) action.paused = !live;
    const g = root.current;
    if (!g || !live) return;
    const m = motion.current;
    m.timer -= d;
    if (m.timer <= 0) {
      const ang = Math.random() * Math.PI * 2;
      m.run = Math.random() > 0.4;
      const spd = m.run ? 2.1 + Math.random() * 1.7 : 0.42 + Math.random() * 0.5;
      m.vx = Math.sin(ang) * spd;
      m.vz = Math.cos(ang) * spd;
      m.timer = 1.5 + Math.random() * 3.6;
    }
    m.x += m.vx * d;
    m.z += m.vz * d;
    if (m.x < -6.4 || m.x > 6.4) m.vx *= -1;
    if (m.z < -17.2 || m.z > 0.6) m.vz *= -1;
    m.x = Math.max(-7, Math.min(7, m.x));
    m.z = Math.max(-17.6, Math.min(1, m.z));
    g.position.set(m.x, 0, m.z);
    const yaw = Math.atan2(m.vx, m.vz);
    let dy = yaw - g.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    g.rotation.y += dy * Math.min(1, d * 5);
    if (action) action.timeScale = m.run ? 1.28 : 0.58;
  });

  return (
    <group ref={root}>
      <group ref={fit}>
        <primitive object={model} />
      </group>
    </group>
  );
}

export function MenuGrove() {
  const [ground, rock, sky, fern] = useLoader(THREE.TextureLoader, TEX);
  const root = useRef<THREE.Group>(null);
  const title = useTitleMap();
  const rockGeo = useMemo(() => new THREE.IcosahedronGeometry(1, 2), []);
  const fernGeo = useMemo(() => new THREE.PlaneGeometry(1.35, 2.3), []);

  const floor = useMemo(() => {
    const map = ground.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(4, 7);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [ground]);

  const rockMap = useMemo(() => {
    const map = rock.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1.2, 1.1);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [rock]);

  const skyMap = useMemo(() => {
    const map = sky.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [sky]);

  const fernMap = useMemo(() => {
    const map = fern.clone();
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [fern]);

  const rocks = useMemo(
    () =>
      [
        { z: -36, spread: 16, y: 1.6, n: 6, s: 3.2 },
        { z: -22, spread: 11, y: 1.15, n: 5, s: 2.1 },
        { z: -6.5, spread: 8.2, y: 0.7, n: 4, s: 1.25 },
        { z: -1.2, spread: 7.4, y: 0.55, n: 4, s: 0.95 },
      ].flatMap((band, b) =>
        Array.from({ length: band.n }, (_, i) => {
          const n = b * 10 + i + 1;
          const side = i % 2 === 0 ? -1 : 1;
          return {
            key: `rk${n}`,
            x: side * (3.6 + hash(n) * band.spread * 0.45),
            y: band.y * (0.75 + hash(n + 3) * 0.5),
            z: band.z + (hash(n + 5) - 0.5) * 2.4,
            s: band.s * (0.75 + hash(n + 8) * 0.55),
            ry: hash(n + 2) * 3,
          };
        }),
      ),
    [],
  );

  const ferns = useMemo(
    () =>
      [
        { z: -28, n: 8, s: 2.6, x0: 5.5 },
        { z: -12, n: 8, s: 1.7, x0: 3.2 },
        { z: 1.4, n: 7, s: 1.35, x0: 2.2 },
        { z: 3.6, n: 6, s: 1.7, x0: 1.6 },
      ].flatMap((band, b) =>
        Array.from({ length: band.n }, (_, i) => {
          const n = b * 12 + i + 4;
          const side = i % 2 === 0 ? -1 : 1;
          return {
            key: `fn${n}`,
            x: side * (band.x0 + hash(n) * 4.2),
            z: band.z + (hash(n + 1) - 0.5) * 1.6,
            s: band.s * (0.75 + hash(n + 6) * 0.5),
            ry: (hash(n + 2) - 0.5) * 1.4,
          };
        }),
      ),
    [],
  );

  const trunks = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return {
          key: `tr${i}`,
          x: side * (4.2 + hash(i + 20) * 3.5),
          z: -26 + i * 3.3,
          h: 1.6 + hash(i + 21) * 2.2,
          ry: hash(i + 22) * 2,
        };
      }),
    [],
  );

  const motes = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(40 * 3);
    for (let i = 0; i < 40; i += 1) {
      arr[i * 3] = (hash(i + 40) - 0.5) * 14;
      arr[i * 3 + 1] = 0.4 + hash(i + 41) * 4;
      arr[i * 3 + 2] = -2 - hash(i + 42) * 30;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame((state) => {
    if (root.current) root.current.visible = sim.phase === "menu";
    if (sim.phase !== "menu") return;
    const attr = motes.getAttribute("position") as THREE.BufferAttribute;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < 40; i += 1) {
      const y = 0.5 + ((attr.getY(i) + 0.004) % 4.2);
      const x = attr.getX(i) + Math.sin(t * 0.4 + i) * 0.004;
      attr.setY(i, y);
      attr.setX(i, x);
    }
    attr.needsUpdate = true;
  });

  return (
    <group ref={root}>
      <hemisphereLight args={["#e7f5c8", "#4a3a24", 0.55]} />
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, -12]} receiveShadow>
        <planeGeometry args={[42, 78]} />
        <meshStandardMaterial map={floor} color="#d5e2b4" roughness={1} />
      </mesh>
      <mesh position={[0, 12, -48]}>
        <planeGeometry args={[110, 46]} />
        <meshBasicMaterial map={skyMap} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 4.2, -33]}>
        <planeGeometry args={[48, 12]} />
        <meshBasicMaterial color="#c5d59a" transparent opacity={0.22} depthWrite={false} fog={false} />
      </mesh>
      {rocks.map((item) => (
        <mesh key={item.key} geometry={rockGeo} position={[item.x, item.y, item.z]} rotation={[0.2, item.ry, 0.15]} scale={item.s} castShadow>
          <meshStandardMaterial map={rockMap} color="#c4a07a" roughness={0.96} metalness={0} />
        </mesh>
      ))}
      {trunks.map((item) => (
        <mesh key={item.key} position={[item.x, item.h * 0.5, item.z]} rotation={[0.08, item.ry, 0.04]} castShadow>
          <cylinderGeometry args={[0.16, 0.28, item.h, 6]} />
          <meshStandardMaterial color="#6a4a32" roughness={0.9} />
        </mesh>
      ))}
      {ferns.map((item) => (
        <group key={item.key} position={[item.x, item.s * 0.95, item.z]} rotation={[0.08, item.ry, 0]} scale={item.s}>
          <mesh geometry={fernGeo}>
            <meshStandardMaterial map={fernMap} transparent alphaTest={0.42} roughness={1} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={fernGeo} rotation={[0, 0.9, 0.08]} position={[0.18, -0.1, 0.05]} scale={0.8}>
            <meshStandardMaterial map={fernMap} transparent alphaTest={0.42} roughness={1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.85, -15]}>
        <planeGeometry args={[8.4, 3.15]} />
        <meshBasicMaterial map={title} alphaTest={0.18} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.2, -8.5]}>
        <planeGeometry args={[28, 6]} />
        <meshBasicMaterial color="#9eb57a" transparent opacity={0.12} depthWrite={false} fog={false} />
      </mesh>
      <points geometry={motes}>
        <pointsMaterial color="#f3e2b0" size={0.045} transparent opacity={0.35} depthWrite={false} />
      </points>
      <Wild seed={1} />
      <Wild seed={2} />
      <Wild seed={3} />
      <Wild seed={4} />
      <Wild seed={5} />
    </group>
  );
}
