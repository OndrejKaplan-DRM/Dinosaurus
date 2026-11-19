import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { preloadAudio, resumeAudio, unlockAudio } from "@/game/audio";
import { installInput } from "@/game/input";
import { palette } from "@/game/palette";
import { installProbe, nudgeLane, requestJump, requestSlide, sim } from "@/game/sim";
import { Scene } from "@/game/Scene";
import { Overlay } from "@/game/Overlay";

export function Game() {
  const swipe = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    preloadAudio();
    installProbe();
    const remove = installInput();
    const vis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      remove();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div
      className="game-root"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button, input, .panel")) return;
        unlockAudio();
        swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = swipe.current;
        swipe.current = null;
        if (!start || sim.phase !== "playing") return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) < 36) return;
        if (Math.abs(dx) > Math.abs(dy)) nudgeLane(dx < 0 ? -1 : 1);
        else if (dy < 0) requestJump();
        else requestSlide();
      }}
    >
      <Canvas
        shadows
        dpr={[1, 1.6]}
        camera={{ position: [0, 3.4, 8.4], fov: 52, near: 0.1, far: 140 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(palette.bg);
        }}
      >
        <color attach="background" args={[palette.bg]} />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Overlay />
    </div>
  );
}
