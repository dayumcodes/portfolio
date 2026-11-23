// v3 "studio glass" scene: a stylized, code-built studio room inspired by the
// mood of threeui.com/studio-glass. All geometry is procedural three.js; no
// assets or code were taken from the reference site.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const MOODS = {
  morning: {
    sky: ["#a8d4e8", "#f8e6c2"], sun: "#ffd9a8", sunI: 3.6, sunPos: [-5, 4.5, -8],
    hemi: ["#bcd8e2", "#4a3b2f", 1.6], lamp: 0.25, screen: 0.55, tint: "rgba(255, 214, 160, 0.05)",
  },
  afternoon: {
    sky: ["#bfe0ea", "#e8f2f0"], sun: "#fff3e0", sunI: 4.4, sunPos: [-4, 7, -7],
    hemi: ["#cfe6ec", "#54443a", 1.9], lamp: 0.0, screen: 0.45, tint: "rgba(255,255,255,0.02)",
  },
  sunset: {
    sky: ["#f7b06a", "#e2603f"], sun: "#ff9c5a", sunI: 2.8, sunPos: [-6, 2.2, -8],
    hemi: ["#9a6f80", "#3d2b26", 1.0], lamp: 0.9, screen: 0.7, tint: "rgba(255, 140, 70, 0.06)",
  },
  night: {
    sky: ["#0d1b2a", "#1b3a4b"], sun: "#9db8d6", sunI: 0.5, sunPos: [-5, 5.5, -8],
    hemi: ["#2a4560", "#181410", 0.7], lamp: 1.6, screen: 1.0, tint: "rgba(10, 20, 40, 0.12)",
  },
  thunderstorm: {
    sky: ["#33434f", "#57676f"], sun: "#90a8ba", sunI: 1.1, sunPos: [-5, 5, -8],
    hemi: ["#5a6e7e", "#232a2e", 1.05], lamp: 1.0, screen: 0.9, tint: "rgba(30, 45, 60, 0.10)",
  },
};

const WOOD = 0x96633a, WOOD_D = 0x7a4f2c, WALL = 0x2f4f47, WALL_D = 0x254038;

function box(w, h, d, color, opts = {}) {
  // rounded edges take the hard CG edge off furniture; falls back for tiny pieces
  const r = Math.min(0.035, w / 4, h / 4, d / 4);
  const geo = r > 0.004
    ? new RoundedBoxGeometry(w, h, d, 2, r)
    : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.8, metalness: opts.metal ?? 0.05, ...opts.mat })
  );
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.recv ?? true;
  return m;
}
function cyl(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 24),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.7, metalness: opts.metal ?? 0.08, ...opts.mat })
  );
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.recv ?? true;
  return m;
}

// Floor planks: per-plank tone variation, seams and grain streaks.
function plankTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  const tones = ["#7d5231", "#83562f", "#754c2b", "#7a4f2c", "#855a36"];
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 256) {
      const off = (y / 64) % 2 ? 128 : 0;
      g.fillStyle = tones[((x + y) / 64 + y) % tones.length | 0] || tones[0];
      g.fillRect((x + off) % 512, y, 254, 62);
      if (x + off >= 512) { g.fillRect(x + off - 512, y, 254, 62); }
    }
  }
  g.strokeStyle = "rgba(35, 20, 8, 0.55)";
  g.lineWidth = 2;
  for (let y = 0; y <= 512; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let i = 0; i < 220; i++) {
    g.strokeStyle = `rgba(50, 30, 12, ${0.05 + (i % 4) * 0.02})`;
    g.lineWidth = 1;
    const y0 = (i * 41) % 512, x0 = (i * 97) % 512;
    g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 40, y0 + 3, x0 + 90, y0 - 3, x0 + 150, y0 + 2); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Subtle plaster noise so walls are not dead flat.
function wallTexture(base) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const v = (i * 37) % 100;
    g.fillStyle = v < 50 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.03)";
    g.fillRect((i * 61) % 256, (i * 137) % 256, 2 + (i % 3), 1 + (i % 2));
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Horizontal wood-grain texture for desk and console tops.
function woodTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#96633a"; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = `rgba(60, 35, 15, ${0.04 + (i % 5) * 0.02})`;
    g.lineWidth = 1 + (i % 3);
    const y = (i * 37) % 128;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin((x + i * 53) * 0.02) * 3);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Vertical gradient texture used for the sky outside the window.
function skyTexture(top, bottom) {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(1, bottom);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Simple painted "wall art": mountains over a lake, drawn on a canvas.
function artTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 320;
  const g = c.getContext("2d");
  const sky = g.createLinearGradient(0, 0, 0, 200);
  sky.addColorStop(0, "#f4e3c8"); sky.addColorStop(1, "#e8c9a8");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 200);
  g.fillStyle = "#8d9aa8";
  g.beginPath(); g.moveTo(60, 200); g.lineTo(200, 60); g.lineTo(340, 200); g.closePath(); g.fill();
  g.fillStyle = "#6d7d8d";
  g.beginPath(); g.moveTo(220, 200); g.lineTo(360, 90); g.lineTo(480, 200); g.closePath(); g.fill();
  g.fillStyle = "#f8f4ec";
  g.beginPath(); g.moveTo(168, 102); g.lineTo(200, 60); g.lineTo(232, 102); g.closePath(); g.fill();
  const lake = g.createLinearGradient(0, 200, 0, 320);
  lake.addColorStop(0, "#b8c8c4"); lake.addColorStop(1, "#7d9490");
  g.fillStyle = lake; g.fillRect(0, 200, 512, 120);
  g.fillStyle = "#4a5d55";
  for (let i = 0; i < 26; i++) {
    const x = 10 + i * 20, h = 18 + ((i * 37) % 22);
    g.beginPath(); g.moveTo(x, 210); g.lineTo(x + 7, 210 - h); g.lineTo(x + 14, 210); g.closePath(); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function mountStudio(canvas, { images = [], onReady, onBrightness, onPresetStep, lowfx } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x16211f, 14, 30);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 2.1, 9.4);
  const camTarget = new THREE.Vector3(0, 1.5, 0);

  // post: gentle bloom sells the lamp / monitor / sky glow like the reference
  // lowfx (thumbnail renders, weak GPUs): plain rendering, cheaper shadows
  const useFx = !lowfx;
  if (lowfx) {
    renderer.setPixelRatio(1);
  }
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.65, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- room shell -------------------------------------------------------
  const room = new THREE.Group();
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0xb08050, map: plankTexture(), roughness: 0.72 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  // CC0 (Poly Haven) roughness maps for tactile light response
  const texLoader = new THREE.TextureLoader();
  const roughMap = (url, rx, ry) => {
    const t = texLoader.load(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  };
  floor.material.roughnessMap = roughMap("/v3/tex/floor_rough.jpg", 5, 5);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture("#2f4f47"), roughness: 0.95 }));
  backWall.position.set(0, 6, -6);
  backWall.receiveShadow = true;
  room.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture("#254038"), roughness: 0.95 }));
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-8.4, 6, 0);
  leftWall.receiveShadow = true;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, map: wallTexture("#3d2f24"), roughness: 0.95 }));
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(8.4, 6, 0);
  rightWall.receiveShadow = true;
  room.add(rightWall);

  // ---- window on the back wall, left of the desk -----------------------
  const winGroup = new THREE.Group();
  winGroup.position.set(-5.4, 3.3, -5.9);
  room.add(winGroup);

  const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture("#cfe8ef", "#f6e2c0"), side: THREE.DoubleSide, fog: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 4.4), skyMat);
  sky.position.z = 0.05;
  winGroup.add(sky);

  // distant tree silhouettes outside
  const treeMat = new THREE.MeshBasicMaterial({ color: 0x2e4a3e, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 6; i++) {
    const tr = new THREE.Mesh(new THREE.SphereGeometry(0.26 + (i % 3) * 0.12, 8, 6), treeMat);
    tr.position.set(-2.1 + i * 0.85, -1.35 + (i % 2) * 0.3, 0.08);
    tr.scale.y = 1.5;
    winGroup.add(tr);
  }

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3120, roughness: 0.6 });
  const fw = 4.2, fh = 3.4, ft = 0.16;
  const frame = new THREE.Group();
  [[0, fh / 2, fw + ft, ft], [0, -fh / 2, fw + ft, ft], [-fw / 2, 0, ft, fh], [fw / 2, 0, ft, fh], [0, 0, ft * 0.7, fh]].forEach(([x, y, w, h]) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), frameMat);
    f.position.set(x, y, 0);
    f.castShadow = true;
    frame.add(f);
  });
  winGroup.add(frame);

  // blinds: tilted slats near the top of the window
  const blinds = new THREE.Group();
  const slatMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb4, roughness: 0.7 });
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.1, 0.02), slatMat);
    s.position.set(0, fh / 2 - 0.25 - i * 0.16, 0.12);
    s.rotation.x = -0.9;
    blinds.add(s);
  }
  winGroup.add(blinds);

  // rain streaks on the glass, revealed in the thunderstorm mood
  const rainCanvas = document.createElement("canvas");
  rainCanvas.width = 256; rainCanvas.height = 256;
  const rg2 = rainCanvas.getContext("2d");
  for (let i = 0; i < 90; i++) {
    const x = (i * 53) % 256, y = (i * 97) % 256, l = 14 + ((i * 31) % 26);
    const lg = rg2.createLinearGradient(x, y, x + 2, y + l);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.35, `rgba(224,236,244,${0.16 + (i % 4) * 0.07})`);
    lg.addColorStop(1, "rgba(255,255,255,0)");
    rg2.strokeStyle = lg;
    rg2.lineWidth = 1 + (i % 2) * 0.6;
    rg2.beginPath(); rg2.moveTo(x, y); rg2.lineTo(x + 2, y + l); rg2.stroke();
  }
  const rainTex = new THREE.CanvasTexture(rainCanvas);
  rainTex.wrapS = rainTex.wrapT = THREE.RepeatWrapping;
  const rainMat = new THREE.MeshBasicMaterial({ map: rainTex, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const rainMesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), rainMat);
  rainMesh.position.z = 0.14;
  winGroup.add(rainMesh);

  // sun shafts falling from the blinds into the room
  const shaftMat = new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const shafts = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.55 + i * 0.2, 4.6), shaftMat);
    sh.position.set(-1.1 + i * 1.1, -1.7, 1.6 + i * 0.3);
    sh.rotation.set(1.05, 0.1 * (i - 1), 0.18);
    shafts.add(sh);
  }
  winGroup.add(shafts);

  // small plants on the window sill
  const sill = box(fw + 0.5, 0.08, 0.4, 0x4a3120, { rough: 0.6 });
  sill.position.set(0, -fh / 2 - 0.2, 0.16);
  winGroup.add(sill);
  const sillLeaf = new THREE.MeshStandardMaterial({ color: 0x3d6b4a, roughness: 0.8 });
  [[-1.5, 0x9a5a3a], [-0.85, 0x6a4a3a]].forEach(([sx, potC]) => {
    const p2 = cyl(0.14, 0.11, 0.22, potC, { seg: 14 });
    p2.position.set(sx, -fh / 2 - 0.05, 0.16);
    winGroup.add(p2);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4 + (j % 2) * 0.14, 6), sillLeaf);
      leaf.position.set(sx + Math.cos(a) * 0.06, 0.28 - fh / 2, 0.16 + Math.sin(a) * 0.05);
      leaf.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
      leaf.castShadow = true;
      winGroup.add(leaf);
    }
  });

  // ---- desk --------------------------------------------------------------
  const desk = new THREE.Group();
  desk.position.set(0.6, 0, 0.4);
  room.add(desk);

  const deskTop = box(7.4, 0.16, 2.6, WOOD, { rough: 0.55 });
  deskTop.material.map = woodTexture();
  deskTop.material.map.repeat.set(2, 1);
  deskTop.material.roughnessMap = roughMap("/v3/tex/walnut_rough.jpg", 2, 1);
  deskTop.material.needsUpdate = true;
  deskTop.position.y = 1.42;
  desk.add(deskTop);
  [[-3.5, -1.1], [3.5, -1.1], [-3.5, 1.1], [3.5, 1.1]].forEach(([x, z]) => {
    const leg = box(0.14, 1.4, 0.14, WOOD_D);
    leg.position.set(x, 0.7, z);
    desk.add(leg);
  });

  // monitor
  const monitor = new THREE.Group();
  monitor.position.set(0.7, 1.5, -0.55);
  desk.add(monitor);
  const stand = box(0.5, 0.05, 0.34, 0xd9d4cc, { rough: 0.35, metal: 0.5 });
  stand.position.y = 0.03;
  monitor.add(stand);
  const neck = box(0.09, 0.55, 0.06, 0xd9d4cc, { rough: 0.35, metal: 0.5 });
  neck.position.y = 0.3;
  monitor.add(neck);
  const bezel = box(2.15, 1.28, 0.07, 0x1a1d1f, { rough: 0.4, metal: 0.2 });
  bezel.position.y = 0.95;
  monitor.add(bezel);

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 512; screenCanvas.height = 296;
  const sg = screenCanvas.getContext("2d");
  const paintFallback = () => {
    const gr = sg.createLinearGradient(0, 0, 512, 296);
    gr.addColorStop(0, "#2b4a52"); gr.addColorStop(1, "#142a30");
    sg.fillStyle = gr; sg.fillRect(0, 0, 512, 296);
    sg.fillStyle = "rgba(255,255,255,0.75)";
    sg.font = "600 34px system-ui, sans-serif";
    sg.textAlign = "center";
    sg.fillText("mfuzail", 256, 158);
  };
  paintFallback();
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.16), screenMat);
  screenMesh.position.set(0, 0.95, 0.041);
  monitor.add(screenMesh);
  const screenGlow = new THREE.PointLight(0xbfe6f0, 0.55, 4.5, 2);
  screenGlow.position.set(0, 1.0, 0.8);
  monitor.add(screenGlow);

  // cycle project images on the monitor
  const loader = new THREE.ImageLoader();
  const imgs = images.map((src) => ({ src, img: null }));
  let imgIdx = -1;
  const showImage = (i) => {
    const entry = imgs[i];
    if (!entry) return;
    const draw = (img) => {
      const s = Math.max(512 / img.width, 296 / img.height);
      const w = img.width * s, h = img.height * s;
      sg.drawImage(img, (512 - w) / 2, (296 - h) / 2, w, h);
      screenTex.needsUpdate = true;
    };
    if (entry.img) draw(entry.img);
    else loader.load(entry.src, (img) => { entry.img = img; draw(img); }, undefined, () => {});
  };
  const cycle = setInterval(() => {
    if (!imgs.length) return;
    imgIdx = (imgIdx + 1) % imgs.length;
    showImage(imgIdx);
  }, 6000);
  if (imgs.length) { imgIdx = 0; showImage(0); }

  // keyboard: slab + keys
  const kb = new THREE.Group();
  kb.position.set(0.55, 1.53, 0.35);
  kb.rotation.y = -0.04;
  desk.add(kb);
  const kbBase = box(1.55, 0.05, 0.5, 0x2a2d2f, { rough: 0.5 });
  kb.add(kbBase);
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x3d4144, roughness: 0.6 });
  const keyGeo = new THREE.BoxGeometry(0.09, 0.03, 0.09);
  for (let r = 0; r < 4; r++) {
    for (let k = 0; k < 14; k++) {
      const key = new THREE.Mesh(keyGeo, keyMat);
      key.position.set(-0.68 + k * 0.105 + (r % 2) * 0.02, 0.04, -0.16 + r * 0.11);
      key.castShadow = true;
      kb.add(key);
    }
  }

  // mouse
  const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshStandardMaterial({ color: 0x242628, roughness: 0.35 }));
  mouse.scale.set(1, 0.55, 1.35);
  mouse.position.set(1.75, 1.55, 0.4);
  mouse.castShadow = true;
  desk.add(mouse);

  // mug
  const mug = cyl(0.09, 0.075, 0.16, 0xc4603a, { rough: 0.5 });
  mug.position.set(-0.6, 1.58, 0.5);
  desk.add(mug);

  // pencil holder + pencils
  const holder = cyl(0.09, 0.08, 0.2, 0x7a6a55, { rough: 0.8 });
  holder.position.set(-1.35, 1.6, -0.5);
  desk.add(holder);
  [0xc98f3d, 0x3d7a5c, 0x8a4a6a].forEach((c, i) => {
    const p = cyl(0.012, 0.012, 0.3, c, { seg: 8 });
    p.position.set(-1.38 + i * 0.035, 1.72, -0.5 + (i % 2) * 0.03);
    p.rotation.z = (i - 1) * 0.12;
    desk.add(p);
  });

  // notebook
  const nb = box(0.62, 0.035, 0.45, 0x3a4a44, { rough: 0.7 });
  nb.position.set(-2.2, 1.52, 0.3);
  nb.rotation.y = 0.25;
  desk.add(nb);

  // ---- desk lamp ---------------------------------------------------------
  const lampGroup = new THREE.Group();
  lampGroup.position.set(3.0, 1.5, -0.5);
  desk.add(lampGroup);
  const lampBase = cyl(0.16, 0.2, 0.05, 0x2c2e30, { rough: 0.4, metal: 0.3 });
  lampBase.position.y = 0.03;
  lampGroup.add(lampBase);
  const lampArm = cyl(0.025, 0.025, 0.85, 0x2c2e30, { rough: 0.4, metal: 0.3 });
  lampArm.position.set(0, 0.45, 0);
  lampArm.rotation.z = 0.28;
  lampGroup.add(lampArm);
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0.25 })
  );
  shade.position.set(0.24, 0.92, 0);
  shade.rotation.z = -0.7;
  shade.castShadow = true;
  lampGroup.add(shade);
  const lampLight = new THREE.PointLight(0xffc98a, 0.25, 7, 1.8);
  lampLight.position.set(0.34, 0.82, 0.1);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(512, 512);
  lampGroup.add(lampLight);

  // ---- side console with a glowing mushroom lamp --------------------------
  const consoleT = new THREE.Group();
  consoleT.position.set(5.9, 0, -4.6);
  room.add(consoleT);
  const cTop = box(2.6, 0.1, 0.9, WOOD, { rough: 0.55 });
  cTop.material.map = woodTexture();
  cTop.material.needsUpdate = true;
  cTop.position.y = 0.95;
  consoleT.add(cTop);
  [[-1.15, -0.35], [1.15, -0.35], [-1.15, 0.35], [1.15, 0.35]].forEach(([x, z]) => {
    const leg = box(0.09, 0.95, 0.09, WOOD_D);
    leg.position.set(x, 0.475, z);
    consoleT.add(leg);
  });
  // mushroom lamp
  const ml = new THREE.Group();
  ml.position.set(0.55, 1.0, 0);
  consoleT.add(ml);
  const mlStem = cyl(0.05, 0.09, 0.32, 0xe8e0d0, { rough: 0.5 });
  mlStem.position.y = 0.16;
  ml.add(mlStem);
  const mlDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0xf2e6d0, roughness: 0.55, emissive: 0xffc98a, emissiveIntensity: 0.4, side: THREE.DoubleSide })
  );
  mlDome.position.y = 0.34;
  mlDome.castShadow = true;
  ml.add(mlDome);
  const mlLight = new THREE.PointLight(0xffc98a, 0, 6, 1.8);
  mlLight.position.set(0.55, 1.45, 0.15);
  consoleT.add(mlLight);
  // book stack and a vase with branches
  [0x8a4a3a, 0x3a5a7a, 0xb08a4a].forEach((c, i) => {
    const b = box(0.42, 0.05, 0.3, c, { rough: 0.75 });
    b.position.set(-0.75, 1.03 + i * 0.052, 0.05);
    b.rotation.y = (i - 1) * 0.14;
    consoleT.add(b);
  });
  const vase = cyl(0.09, 0.12, 0.3, 0x5a4a3a, { rough: 0.6 });
  vase.position.set(-0.2, 1.15, -0.15);
  consoleT.add(vase);
  for (let i = 0; i < 3; i++) {
    const br = cyl(0.008, 0.008, 0.55, 0x4a3b2c, { seg: 6 });
    br.position.set(-0.2 + (i - 1) * 0.04, 1.5, -0.15);
    br.rotation.z = (i - 1) * 0.22;
    consoleT.add(br);
  }

  // ---- chair -------------------------------------------------------------
  const chair = new THREE.Group();
  chair.position.set(1.1, 0, 2.3);
  chair.rotation.y = -0.35;
  room.add(chair);
  const seat = box(0.72, 0.09, 0.68, 0x23262a, { rough: 0.7 });
  seat.position.y = 0.85;
  chair.add(seat);
  const back = box(0.68, 0.95, 0.09, 0x23262a, { rough: 0.7 });
  back.position.set(0, 1.45, -0.32);
  back.rotation.x = -0.12;
  chair.add(back);
  const post = cyl(0.045, 0.045, 0.8, 0x3a3d40, { metal: 0.4, rough: 0.4 });
  post.position.y = 0.42;
  chair.add(post);
  for (let i = 0; i < 5; i++) {
    const leg = box(0.5, 0.04, 0.06, 0x3a3d40, { metal: 0.4 });
    leg.position.y = 0.06;
    leg.rotation.y = (i / 5) * Math.PI * 2;
    leg.translateX(0.22);
    chair.add(leg);
  }

  // ---- plant -------------------------------------------------------------
  const plant = new THREE.Group();
  plant.position.set(-4.6, 0, -3.4);
  room.add(plant);
  const pot = cyl(0.28, 0.22, 0.42, 0x9a5a3a, { rough: 0.8 });
  pot.position.y = 0.21;
  plant.add(pot);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d6b4a, roughness: 0.8 });
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.9 + (i % 3) * 0.3, 6), leafMat);
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.12, 0.75 + (i % 3) * 0.12, Math.sin(a) * 0.12);
    leaf.rotation.set(Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45);
    leaf.castShadow = true;
    plant.add(leaf);
  }

  // ---- side shelf with books ---------------------------------------------
  const shelf = new THREE.Group();
  shelf.position.set(5.6, 0, -5.2);
  room.add(shelf);
  const shelfBoard = box(2.2, 0.08, 0.5, WOOD, { rough: 0.6 });
  shelfBoard.position.y = 1.1;
  shelf.add(shelfBoard);
  const bookCols = [0x8a4a3a, 0x3a5a7a, 0x6a7a3a, 0xb08a4a, 0x5a3a6a, 0x4a6a5a];
  let bx = -0.9;
  bookCols.forEach((c, i) => {
    const h = 0.34 + (i % 3) * 0.06;
    const b = box(0.09, h, 0.34, c, { rough: 0.75 });
    b.position.set(bx, 1.14 + h / 2, 0);
    if (i === bookCols.length - 1) b.rotation.z = -0.25;
    shelf.add(b);
    bx += 0.13;
  });

  // ---- wall art ----------------------------------------------------------
  const art = new THREE.Group();
  art.position.set(3.4, 3.6, -5.95);
  room.add(art);
  const artFrame = box(1.9, 1.25, 0.06, 0x2a211a, { rough: 0.5 });
  art.add(artFrame);
  const artCanvas = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 1.05),
    new THREE.MeshBasicMaterial({ map: artTexture() })
  );
  artCanvas.position.z = 0.035;
  art.add(artCanvas);

  // ---- rug ---------------------------------------------------------------
  const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshStandardMaterial({ color: 0x51352a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.8, 0.005, 1.6);
  rug.receiveShadow = true;
  room.add(rug);

  // ---- lighting -----------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xbcd8e2, 0x4a3b2f, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
  sun.position.set(-6, 4.2, -3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 6;
  scene.add(sun);
  const fill = new THREE.AmbientLight(0xffffff, 0.22);
  const frontFill = new THREE.DirectionalLight(0xcfe0e8, 0.4);
  frontFill.position.set(2.5, 4, 10);
  scene.add(frontFill);
  scene.add(fill);

  // ---- mood / brightness control ------------------------------------------
  const cur = {
    skyTop: new THREE.Color(MOODS.morning.sky[0]),
    skyBot: new THREE.Color(MOODS.morning.sky[1]),
    sun: new THREE.Color(MOODS.morning.sun),
    sunI: MOODS.morning.sunI,
    hemiSky: new THREE.Color(MOODS.morning.hemi[0]),
    hemiGnd: new THREE.Color(MOODS.morning.hemi[1]),
    hemiI: MOODS.morning.hemi[2],
    lamp: MOODS.morning.lamp,
    screen: MOODS.morning.screen,
    rain: 0,
  };
  const tgt = { ...cur };
  let brightness = 0.82;
  let moodName = "morning";

  const setMood = (name) => {
    const m = MOODS[name];
    if (!m) return;
    moodName = name;
    tgt.skyTop = new THREE.Color(m.sky[0]);
    tgt.skyBot = new THREE.Color(m.sky[1]);
    tgt.sun = new THREE.Color(m.sun);
    tgt.sunI = m.sunI;
    tgt.sunPos = m.sunPos;
    tgt.hemiSky = new THREE.Color(m.hemi[0]);
    tgt.hemiGnd = new THREE.Color(m.hemi[1]);
    tgt.hemiI = m.hemi[2];
    tgt.lamp = m.lamp;
    tgt.screen = m.screen;
    tgt.rain = name === "thunderstorm" ? 1 : 0;
  };
  const setBrightness = (v) => { brightness = Math.min(1, Math.max(0.15, v)); };

  // ---- pointer parallax ----------------------------------------------------
  let px = 0, py = 0;
  const onPointer = (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener("pointermove", onPointer, { passive: true });

  // ---- room interactions: pick, drag, brush -------------------------------
  // (the reference's interaction set, re-implemented on our own objects)
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const castAt = (e, targets) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return null;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(targets, true);
    return hits[0] || null;
  };

  // liftable desk objects land where they are dropped
  const liftables = [kb, mouse, holder, nb].map((obj) => ({ obj, base: obj.position.clone(), baseRotY: obj.rotation.y }));
  const liftParents = [kb, mouse, holder, nb];
  const interactives = [blinds, chair, monitor, ...liftParents, plant];
  const plantLeaves = plant.children.filter((m) => m.geometry && m.geometry.type === "ConeGeometry");
  plantLeaves.forEach((l) => (l.userData.sway = 0));

  let gesture = null;
  let blindDrop = 0;
  let panX = 0;
  const slatBase = blinds.children.map((s) => s.position.y);
  const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();

  const applyBlind = () => {
    blinds.children.forEach((s, i) => {
      s.position.y = slatBase[i] - blindDrop * i * 0.17;
      s.rotation.x = -0.9 + blindDrop * 0.75;
    });
  };

  const onCanvasDown = (e) => {
    if (!e.isPrimary) return;
    const hit = castAt(e, interactives);
    gesture = { x: e.clientX, y: e.clientY, moved: 0, kind: "scene" };
    if (hit) {
      let node = hit.object;
      while (node && !interactives.includes(node)) node = node.parent;
      if (node === blinds) gesture.kind = "blind";
      else if (node === chair) gesture.kind = "chair";
      else if (node === monitor) gesture.kind = "monitor";
      else if (node === plant) gesture.kind = "plant";
      else if (liftParents.includes(node)) {
        const L = liftables.find((l) => l.obj === node);
        gesture.kind = "lift";
        gesture.L = L;
        const local = desk.worldToLocal(hit.point.clone());
        if (node === kb && Math.abs(local.x - kb.position.x) > 0.55) gesture.kind = "kbturn";
      }
      canvas.setPointerCapture?.(e.pointerId);
    }
  };

  const onCanvasMove = (e) => {
    if (!e.isPrimary) return;
    if (!gesture) {
      const h = castAt(e, plantLeaves);
      if (h) h.object.userData.sway = 1;
      return;
    }
    const dx = e.clientX - gesture.x;
    const dy = e.clientY - gesture.y;
    gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
    if (gesture.kind === "blind") {
      blindDrop = Math.min(1, Math.max(0, blindDrop + dy * 0.004));
      applyBlind();
    } else if (gesture.kind === "chair") {
      chair.position.x = Math.min(3.2, Math.max(-3.2, chair.position.x + dx * 0.006));
      chair.rotation.y += dx * 0.0012;
    } else if (gesture.kind === "monitor") {
      monitor.rotation.y = Math.min(0.8, Math.max(-0.8, monitor.rotation.y + dx * 0.004));
      screenMesh.rotation.x = Math.min(0.35, Math.max(-0.35, screenMesh.rotation.x - dy * 0.002));
    } else if (gesture.kind === "kbturn") {
      gesture.L.obj.rotation.y += dx * 0.006;
    } else if (gesture.kind === "lift") {
      const r2 = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r2.left) / r2.width) * 2 - 1, -((e.clientY - r2.top) / r2.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      deskPlane.constant = -(desk.localToWorld(new THREE.Vector3(0, gesture.L.base.y + 0.5, 0)).y);
      if (ray.ray.intersectPlane(deskPlane, hitPoint)) {
        const local = desk.worldToLocal(hitPoint.clone());
        gesture.L.obj.position.x = Math.min(3.4, Math.max(-3.4, local.x));
        gesture.L.obj.position.z = Math.min(1.1, Math.max(-1.1, local.z));
        gesture.L.obj.position.y = gesture.L.base.y + 0.28;
      }
    } else if (gesture.kind === "plant") {
      plantLeaves.forEach((l) => (l.userData.sway = Math.min(1, l.userData.sway + Math.hypot(dx, dy) * 0.02)));
    } else {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (camera.aspect < 0.8) panX = Math.min(2.6, Math.max(-2.6, panX + dx * 0.008));
        else if (onBrightness && Math.abs(dx) > 1) { onBrightness(dx * 0.12); gesture.x = e.clientX; }
      }
    }
    if (gesture.kind !== "scene") { gesture.x = e.clientX; gesture.y = e.clientY; }
  };

  const onCanvasUp = (e) => {
    if (!gesture) return;
    if (gesture.kind === "lift") gesture.L.obj.position.y = gesture.L.base.y;
    gesture = null;
    canvas.releasePointerCapture?.(e.pointerId);
  };

  canvas.addEventListener("pointerdown", onCanvasDown);
  canvas.addEventListener("pointermove", onCanvasMove);
  canvas.addEventListener("pointerup", onCanvasUp);
  canvas.addEventListener("pointercancel", onCanvasUp);
  canvas.style.touchAction = "none";

  const resize = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    if (useFx) composer.setSize(w, h);
    camera.aspect = w / h;
    // pull the camera back on narrow screens so the room still reads
    camera.position.z = camera.aspect < 0.8 ? 12.5 : 9.4;
    camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize);
  resize();

  const qp = new URLSearchParams(location.search);
  if (qp.get("cam") === "window") {
    camera.position.set(-0.5, 3, 2.5);
    camTarget.set(-4.7, 3.4, -5.9);
  }

  let raf = 0;
  const clock = new THREE.Clock();
  let skySwap = null;
  let flashT = 0;
  let swayT = 0;
  const tick = () => {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.pow(0.002, dt); // smoothing

    cur.skyTop.lerp(tgt.skyTop, k);
    cur.skyBot.lerp(tgt.skyBot, k);
    cur.sun.lerp(tgt.sun, k);
    cur.sunI += (tgt.sunI - cur.sunI) * k;
    cur.hemiSky.lerp(tgt.hemiSky, k);
    cur.hemiGnd.lerp(tgt.hemiGnd, k);
    cur.hemiI += (tgt.hemiI - cur.hemiI) * k;
    cur.lamp += (tgt.lamp - cur.lamp) * k;
    cur.screen += (tgt.screen - cur.screen) * k;
    cur.rain += (tgt.rain - cur.rain) * k;
    rainMat.opacity = cur.rain * 0.85;
    if (cur.rain > 0.01) { rainTex.offset.y -= dt * 0.45; rainTex.offset.x -= dt * 0.004; }
    shaftMat.opacity = Math.max(0, (cur.sunI - 0.6) / 4) * 0.11 * brightness * (1 - cur.rain);
    mlLight.intensity = cur.lamp * brightness * 2.6;
    mlDome.material.emissiveIntensity = 0.15 + cur.lamp * 0.8;

    // storm lightning: brief bright flashes while it rains
    if (cur.rain > 0.4) {
      flashT -= dt;
      if (flashT <= -3 - (Math.sin(clock.elapsedTime * 13.7) * 0.5 + 0.5) * 5) flashT = 0.28 + Math.random() * 0.22;
    } else flashT = Math.min(flashT, 0);
    const flash = flashT > 0 ? Math.min(1, flashT / 0.2) : 0;

    sun.color.copy(cur.sun);
    sun.intensity = (cur.sunI * (1 - blindDrop * 0.8) + flash * 2.4) * brightness;
    if (tgt.sunPos) sun.position.set(...tgt.sunPos);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGnd);
    hemi.intensity = (cur.hemiI * (1 - blindDrop * 0.45) + flash * 1.6) * brightness;

    // plant sway decay
    swayT += dt;
    plantLeaves.forEach((l, i) => {
      if (l.userData.sway > 0.01) {
        const s = l.userData.sway;
        l.rotation.z += Math.sin(swayT * 9 + i) * 0.02 * s;
        l.rotation.x += Math.cos(swayT * 7 + i * 2) * 0.015 * s;
        l.userData.sway *= 1 - 2.4 * dt;
      }
    });
    lampLight.intensity = cur.lamp * brightness * 2.2;
    shade.material.emissiveIntensity = 0.1 + cur.lamp * 0.6;
    screenGlow.intensity = cur.screen * brightness;
    screenMat.color.setScalar(0.55 + cur.screen * 0.5 * brightness);

    // swap the sky gradient only when the lerped colors actually change
    const skyKey = `${cur.skyTop.getHexString()}/${cur.skyBot.getHexString()}`;
    if (skyKey !== skySwap) {
      skySwap = skyKey;
      const old = skyMat.map;
      skyMat.map = skyTexture(`#${cur.skyTop.getHexString()}`, `#${cur.skyBot.getHexString()}`);
      skyMat.needsUpdate = true;
      old && old.dispose();
    }

    camera.position.x += (px * 0.55 + panX - camera.position.x) * 0.04;
    camera.position.y += (2.1 - py * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(camTarget.x + panX, camTarget.y, camTarget.z);

    if (useFx) composer.render();
    else renderer.render(scene, camera);
  };
  tick();
  onReady && onReady();

  return {
    setMood,
    setBrightness,
    get mood() { return moodName; },
    dispose() {
      cancelAnimationFrame(raf);
      clearInterval(cycle);
      removeEventListener("pointermove", onPointer);
      removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onCanvasDown);
      canvas.removeEventListener("pointermove", onCanvasMove);
      canvas.removeEventListener("pointerup", onCanvasUp);
      canvas.removeEventListener("pointercancel", onCanvasUp);
      composer.dispose?.();
      renderer.dispose();
    },
  };
}
