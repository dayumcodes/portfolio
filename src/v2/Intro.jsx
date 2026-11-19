import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";

const BOOT_LINES = [
  "FUZAIL-OS BIOS v2.0",
  "memory check .......... 640K OK",
  "loading react ......... OK",
  "mounting ~/experience . OK",
  "releasing the koi ..... OK",
  "",
  "entering portfolio _",
];

// ---- boot screen drawn on a canvas, used as the CRT screen texture ----
function makeScreenCanvas() {
  const c = document.createElement("canvas");
  c.width = 640;
  c.height = 480;
  return c;
}

function drawScreen(c, lines, phase, blink) {
  const g = c.getContext("2d");
  const W = c.width;
  const H = c.height;
  // dark glass
  const grad = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.75);
  if (phase === "off") {
    grad.addColorStop(0, "#0b0f0b");
    grad.addColorStop(1, "#050705");
  } else {
    grad.addColorStop(0, "#12240f");
    grad.addColorStop(1, "#071006");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  if (phase !== "off") {
    g.font = "24px 'Courier New', monospace";
    g.textBaseline = "top";
    g.shadowColor = "rgba(120,255,150,0.55)";
    g.shadowBlur = 8;
    g.fillStyle = "#9dffb0";
    const shown = BOOT_LINES.slice(0, lines);
    shown.forEach((l, i) => g.fillText(l, 40, 44 + i * 40));
    if (phase === "boot" && blink && lines < BOOT_LINES.length) {
      const row = Math.max(shown.length - 1, 0);
      const last = shown[shown.length - 1] || "";
      const w = g.measureText(last).width;
      g.fillRect(40 + w + 4, 44 + row * 40, 14, 26);
    }
    g.shadowBlur = 0;
  }

  // scanlines
  g.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.4);
  // glass highlight
  g.fillStyle = "rgba(255,255,255,0.045)";
  g.beginPath();
  g.ellipse(W * 0.3, H * 0.18, W * 0.34, H * 0.12, -0.35, 0, Math.PI * 2);
  g.fill();
}

function makeKeyboardTexture() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 176;
  const g = c.getContext("2d");
  g.fillStyle = "#cfc6ad";
  g.fillRect(0, 0, c.width, c.height);
  const rows = 5;
  const cols = 14;
  const kw = 512 / cols;
  const kh = 176 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const isSpace = r === rows - 1 && col >= 4 && col <= 9;
      if (r === rows - 1 && col > 4 && col <= 9) continue;
      const x = col * kw + 3;
      const y = r * kh + 3;
      g.fillStyle = "#e6dfc9";
      g.fillRect(x, y, (isSpace ? kw * 6 : kw) - 6, kh - 6);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(x, y + (isSpace ? kw * 6 : kw) * 0 + kh - 8, (isSpace ? kw * 6 : kw) - 6, 3);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function RetroComputer({ screenCanvas, screenTick }) {
  const screenTex = useMemo(() => {
    const t = new THREE.CanvasTexture(screenCanvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [screenCanvas]);
  const kbTex = useMemo(makeKeyboardTexture, []);

  useEffect(() => {
    screenTex.needsUpdate = true;
  }, [screenTick, screenTex]);

  const beige = "#d6cdb4";
  const beigeDark = "#b8ae94";
  return (
    <group>
      <hemisphereLight intensity={0.55} groundColor="#1a1a1a" color="#fff4e0" />
      <ambientLight intensity={0.35} />
      <spotLight
        position={[6, 8, 7]}
        angle={0.5}
        penumbra={1}
        intensity={140}
        color="#ffe8c8"
      />
      <pointLight position={[-5, 3, 4]} intensity={18} color="#bfd4ff" />

      {/* desk */}
      <mesh position={[0, -0.72, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 9]} />
        <meshStandardMaterial color="#241d16" roughness={0.9} />
      </mesh>

      {/* monitor body */}
      <group position={[0, 0.42, 0]}>
        <mesh position={[0, 0, -0.1]}>
          <boxGeometry args={[2.34, 1.78, 1.62]} />
          <meshStandardMaterial color={beige} roughness={0.65} />
        </mesh>
        {/* front bezel */}
        <mesh position={[0, 0.02, 0.72]}>
          <boxGeometry args={[2.1, 1.56, 0.08]} />
          <meshStandardMaterial color={beigeDark} roughness={0.7} />
        </mesh>
        {/* screen (boot text lives here) */}
        <mesh position={[0, 0.04, 0.775]}>
          <planeGeometry args={[1.72, 1.26]} />
          <meshBasicMaterial map={screenTex} toneMapped={false} />
        </mesh>
        {/* brand strip + power LED */}
        <mesh position={[0, -0.72, 0.765]}>
          <boxGeometry args={[2.1, 0.16, 0.02]} />
          <meshStandardMaterial color={beige} roughness={0.7} />
        </mesh>
        <mesh position={[0.86, -0.72, 0.78]}>
          <circleGeometry args={[0.025, 16]} />
          <meshBasicMaterial color={screenTick > 0 ? "#7dff8a" : "#3a2c10"} />
        </mesh>
        {/* stand */}
        <mesh position={[0, -1.02, -0.15]}>
          <boxGeometry args={[0.9, 0.28, 0.9]} />
          <meshStandardMaterial color={beigeDark} roughness={0.7} />
        </mesh>
      </group>

      {/* keyboard */}
      <group position={[0, -0.62, 1.75]} rotation={[-0.09, 0, 0]}>
        <mesh>
          <boxGeometry args={[2.05, 0.09, 0.72]} />
          <meshStandardMaterial color={beige} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.047, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.95, 0.62]} />
          <meshStandardMaterial map={kbTex} roughness={0.8} />
        </mesh>
      </group>

      {/* mouse */}
      <group position={[1.5, -0.64, 1.7]}>
        <mesh scale={[1, 0.55, 1.35]}>
          <sphereGeometry args={[0.17, 24, 18]} />
          <meshStandardMaterial color={beige} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.075, 0.05]}>
          <boxGeometry args={[0.012, 0.03, 0.14]} />
          <meshStandardMaterial color={beigeDark} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

const CAM_HOME = new THREE.Vector3(2.55, 1.35, 4.9);
const LOOK_HOME = new THREE.Vector3(0, 0.35, 0.4);
const CAM_ZOOM = new THREE.Vector3(0, 0.46, 2.35);
const LOOK_ZOOM = new THREE.Vector3(0, 0.46, 0.78);

function Rig({ phase, onZoomed }) {
  const v = useRef(new THREE.Vector3());
  const zoomed = useRef(false);
  useFrame((state, dt) => {
    const cam = state.camera;
    const t = state.clock.elapsedTime;
    if (phase === "zoom") {
      v.current.copy(CAM_ZOOM);
      cam.position.lerp(v.current, 1 - Math.pow(0.02, dt));
      cam.lookAt(LOOK_ZOOM);
      if (!zoomed.current && cam.position.distanceTo(CAM_ZOOM) < 0.28) {
        zoomed.current = true;
        onZoomed?.();
      }
    } else {
      const amp = phase === "boot" ? 0.06 : 0.3;
      v.current.set(
        CAM_HOME.x + Math.sin(t * 0.22) * amp,
        CAM_HOME.y + Math.sin(t * 0.31) * amp * 0.25,
        CAM_HOME.z
      );
      cam.position.lerp(v.current, 1 - Math.pow(0.0001, dt));
      cam.lookAt(LOOK_HOME);
    }
  });
  return null;
}

export default function Intro({ onDone }) {
  const [phase, setPhase] = useState("off");
  const [lines, setLines] = useState(0);
  const [blink, setBlink] = useState(true);
  const screenCanvas = useMemo(makeScreenCanvas, []);
  const tick = useRef(0);
  const [screenTick, setScreenTick] = useState(0);

  const redraw = (l = lines, p = phase, b = blink) => {
    drawScreen(screenCanvas, l, p, b);
    tick.current += 1;
    setScreenTick(tick.current);
  };

  // initial dark screen
  useEffect(() => {
    drawScreen(screenCanvas, 0, "off", false);
    tick.current += 1;
    setScreenTick(tick.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // caret blink
  useEffect(() => {
    if (phase !== "boot") return;
    const id = setInterval(() => setBlink((b) => !b), 420);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, phase, blink]);

  // auto power-on shortly after mount
  useEffect(() => {
    if (phase === "off") {
      const t = setTimeout(() => setPhase("boot"), 2600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // typed boot lines, then zoom into the screen
  useEffect(() => {
    if (phase !== "boot") return;
    if (lines < BOOT_LINES.length) {
      const t = setTimeout(() => setLines((n) => n + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setPhase("zoom"), 1100);
    return () => clearTimeout(t);
  }, [phase, lines]);

  return (
    <div
      className={"v2-intro phase-" + phase}
      onClick={() =>
        setPhase((p) => (p === "off" ? "boot" : p === "boot" ? "zoom" : p))
      }
    >
      <Canvas dpr={[1, 1.75]} camera={{ position: CAM_HOME.toArray(), fov: 40 }}>
        <Suspense fallback={null}>
          <RetroComputer screenCanvas={screenCanvas} screenTick={screenTick} />
        </Suspense>
        <Rig phase={phase} onZoomed={onDone} />
      </Canvas>

      <div className="v2-crt-flash" />

      {phase === "off" && <div className="v2-hint">click to power on</div>}
      <div className="v2-fadeout" />
    </div>
  );
}
