import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { LANE_X, sim } from "@/game/sim";

useGLTF.preload("/models/raptor.glb");

const TARGET_HEIGHT = 1.68;
const TAIL = ["tail", "tailstart", "tail1", "tail2", "tail3"];
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _inv = new THREE.Quaternion();
const _extra = new THREE.Quaternion();
const _tip = new THREE.Vector3();

export function Raptor() {
  const gltf = useGLTF("/models/raptor.glb");
  const scene = useMemo(() => prepareRaptor(gltf.scene), [gltf.scene]);
  const fit = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const head = useRef<THREE.Object3D | null>(null);
  const tails = useRef<THREE.Object3D[]>([]);
  const tuck = useRef(0);
  const extra = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler());
  const { actions } = useAnimations(gltf.animations, scene);

  useLayoutEffect(() => {
    const g = fit.current;
    if (!g) return;
    const mounted = mountRaptor(scene, g);
    head.current = mounted.head;
    tails.current = mounted.tails;
  }, [scene]);

  useEffect(() => {
    const clip = gltf.animations[0];
    const action = clip ? actions[clip.name] : undefined;
    action?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      action?.stop();
    };
  }, [actions, gltf.animations]);

  useFrame((_, dt) => {
    const clip = gltf.animations[0];
    const action = clip ? actions[clip.name] : undefined;
    if (action) {
      if (sim.phase === "dying" || sim.phase === "dead") action.timeScale = 0.2;
      else if (!sim.grounded) action.timeScale = 0.4;
      else if (sim.sliding > 0) action.timeScale = 1.15;
      else action.timeScale = sim.phase === "menu" ? 0.85 : 0.8 + Math.min(sim.speed, 26) / 22;
    }
    const bite = sim.biting > 0 ? Math.min(1, sim.biting / 0.28) : 0;
    if (head.current && bite > 0.02) {
      euler.current.set(-0.65 * bite, 0, 0);
      extra.current.setFromEuler(euler.current);
      head.current.quaternion.multiply(extra.current);
    }
    const want = sim.sliding > 0 ? 1 : 0;
    tuck.current += (want - tuck.current) * Math.min(1, dt * 9);
    const curl = tuck.current;
    if (curl > 0.02) {
      const chain = tails.current;
      for (let i = 0; i < chain.length; i += 1) {
        const bone = chain[i];
        if (!bone) continue;
        bone.updateWorldMatrix(true, false);
        _dir.set(0, 1, 0).transformDirection(bone.matrixWorld);
        _target.copy(_dir);
        _target.y -= 0.7 + i * 0.18;
        _target.normalize();
        _axis.crossVectors(_dir, _target);
        const span = _axis.length();
        if (span < 1e-4) continue;
        _axis.multiplyScalar(1 / span);
        const ang = Math.min(0.32, Math.asin(Math.min(1, span)) * curl * 0.55);
        _q.setFromAxisAngle(_axis, ang);
        _tip.copy(_dir).applyQuaternion(_q);
        if (_tip.y > _dir.y) _q.setFromAxisAngle(_axis, -ang);
        bone.parent?.getWorldQuaternion(_parentQ);
        _inv.copy(_parentQ).invert();
        _extra.copy(_inv).multiply(_q).multiply(_parentQ);
        bone.quaternion.premultiply(_extra);
      }
    }
    const g = root.current;
    if (!g) return;
    const air = sim.y > 0.04 ? Math.min(1, sim.y / 1.1) : 0;
    g.position.y = -0.2 * curl;
    g.rotation.set(-0.08 * curl + air * 0.32 + sim.fall * 1.25, Math.PI, (sim.laneTarget * LANE_X - sim.x) * -0.16);
    g.visible = sim.phase !== "menu";
  });

  return (
    <group ref={root}>
      <group ref={fit}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

export function prepareRaptor(source: THREE.Object3D) {
  const cloned = SkeletonUtils.clone(source) as THREE.Group;
  cloned.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const map = src.map ?? null;
    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 8;
    }
    mesh.material = new THREE.MeshStandardMaterial({
      map,
      color: "#ffffff",
      roughness: 0.62,
      metalness: 0,
      emissive: "#ffffff",
      emissiveMap: map,
      emissiveIntensity: 0.05,
      side: THREE.FrontSide,
    });
  });
  return cloned;
}

export function mountRaptor(scene: THREE.Object3D, g: THREE.Group, height = TARGET_HEIGHT) {
  const box = skinnedBounds(scene);
  const tails: THREE.Object3D[] = [];
  let head: THREE.Object3D | null = null;
  if (!box.isEmpty()) {
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = height / Math.max(size.y, 1e-6);
    g.scale.setScalar(s);
    g.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }
  scene.traverse((obj) => {
    if (obj.name === "head") head = obj;
    if (TAIL.includes(obj.name)) tails.push(obj);
  });
  tails.sort((a, b) => TAIL.indexOf(a.name) - TAIL.indexOf(b.name));
  return { head, tails };
}

function skinnedBounds(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const inv = scene.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  scene.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.update();
    const pos = mesh.geometry.getAttribute("position");
    const step = 12;
    for (let i = 0; i < pos.count; i += step) {
      mesh.getVertexPosition(i, v);
      mesh.localToWorld(v);
      v.applyMatrix4(inv);
      box.expandByPoint(v);
    }
  });
  return box;
}
