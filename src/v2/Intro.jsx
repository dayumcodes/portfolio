import React, { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const BOOT_LINES = [
  "FUZAIL-OS BIOS v2.0",
  "memory check .......... 640K OK",
  "loading react ......... OK",
  "mounting ~/experience . OK",
  "releasing the koi ..... OK",
  "",
  "entering portfolio _",
];

function Computer({ onReady }) {
  const computer = useGLTF("/desktop_pc/scene.gltf");
  useEffect(() => {
    onReady?.();
  }, [computer, onReady]);
  return (
    <mesh>
      <hemisphereLight intensity={10} groundColor="black" />
      <pointLight intensity={1} />
      <spotLight
        position={[-20, 50, 10]}
        angle={0.12}
        penumbra={1}
        intensity={2}
        castShadow
        shadow-mapSize={1024}
      />
      <primitive
        object={computer.scene}
        scale={0.75}
        position={[0, -3.25, -1.5]}
        rotation={[-0.01, -0.2, -0.1]}
      />
    </mesh>
  );
}

function Rig({ phase, onZoomed }) {
  const v = useRef(new THREE.Vector3());
  const zoomed = useRef(false);
  useFrame((state, dt) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    if (phase === "zoom") {
      v.current.set(-0.55, -0.85, 0.25);
      cam.position.lerp(v.current, 1 - Math.pow(0.008, dt));
      cam.lookAt(-0.55, -1.05, -1.5);
      if (!zoomed.current && cam.position.z < 0.5) {
        zoomed.current = true;
        onZoomed?.();
      }
    } else {
      const amp = phase === "boot" ? 0.1 : 0.38;
      v.current.set(Math.sin(t * 0.22) * amp, 0.5, 4.35);
      cam.position.lerp(v.current, 1 - Math.pow(0.0001, dt));
      cam.lookAt(0, -0.6, -1.5);
    }
  });
  return null;
}

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState("off");
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState(0);

  // auto power-on a little after the model is ready
  useEffect(() => {
    if (ready && phase === "off") {
      const t = setTimeout(() => setPhase("boot"), 2600);
      return () => clearTimeout(t);
    }
  }, [ready, phase]);

  // typed boot lines, then zoom into the screen
  useEffect(() => {
    if (phase !== "boot") return;
    if (lines < BOOT_LINES.length) {
      const t = setTimeout(() => setLines((n) => n + 1), 210);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("zoom"), 850);
    return () => clearTimeout(t);
  }, [phase, lines]);

  return (
    <div
      className={"v2-intro phase-" + phase}
      onClick={() =>
        setPhase((p) => (p === "off" ? "boot" : p === "boot" ? "zoom" : p))
      }
    >
      <Canvas shadows dpr={[1, 1.75]} camera={{ position: [0, 0.5, 4.35], fov: 42 }}>
        <Suspense fallback={null}>
          <Computer onReady={() => setReady(true)} />
        </Suspense>
        <Rig phase={phase} onZoomed={onDone} />
      </Canvas>

      <div className="v2-crt-flash" />
      <div className="v2-crt" aria-hidden="true">
        {BOOT_LINES.slice(0, lines).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        {phase === "boot" && <span className="v2-caret" />}
      </div>

      {phase === "off" && (
        <div className="v2-hint">{ready ? "click to power on" : "warming up the crt..."}</div>
      )}
      <div className="v2-fadeout" />
    </div>
  );
}

useGLTF.preload("/desktop_pc/scene.gltf");
