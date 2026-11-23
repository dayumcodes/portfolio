// v3 "studio glass" scene: a stylized, code-built studio room inspired by the
// mood of threeui.com/studio-glass. All geometry is procedural three.js; no
// assets or code were taken from the reference site.
import * as THREE from "three";

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
};

const WOOD = 0x96633a, WOOD_D = 0x7a4f2c, WALL = 0x2f4f47, WALL_D = 0x254038;

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
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

export function mountStudio(canvas, { images = [], onReady } = {}) {
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

  // ---- room shell -------------------------------------------------------
  const room = new THREE.Group();
  scene.add(room);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: WOOD_D, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: WALL, roughness: 0.95 }));
  backWall.position.set(0, 6, -6);
  backWall.receiveShadow = true;
  room.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: WALL_D, roughness: 0.95 }));
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-8.4, 6, 0);
  leftWall.receiveShadow = true;
  room.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(24, 12), new THREE.MeshStandardMaterial({ color: 0x3d2f24, roughness: 0.95 }));
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

  // ---- desk --------------------------------------------------------------
  const desk = new THREE.Group();
  desk.position.set(0.6, 0, 0.4);
  room.add(desk);

  const deskTop = box(7.4, 0.16, 2.6, WOOD, { rough: 0.55 });
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
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.bias = -0.0004;
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
  };
  const setBrightness = (v) => { brightness = Math.min(1, Math.max(0.15, v)); };

  // ---- pointer parallax ----------------------------------------------------
  let px = 0, py = 0;
  const onPointer = (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2;
    py = (e.clientY / innerHeight - 0.5) * 2;
  };
  addEventListener("pointermove", onPointer, { passive: true });

  const resize = () => {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
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

    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI * brightness;
    if (tgt.sunPos) sun.position.set(...tgt.sunPos);
    hemi.color.copy(cur.hemiSky);
    hemi.groundColor.copy(cur.hemiGnd);
    hemi.intensity = cur.hemiI * brightness;
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

    camera.position.x += (px * 0.55 - camera.position.x) * 0.04;
    camera.position.y += (2.1 - py * 0.35 - camera.position.y) * 0.04;
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
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
      renderer.dispose();
    },
  };
}
