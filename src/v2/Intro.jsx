// Original three.js intro: a retro CRT computer assembles, powers on, boots,
// and the camera pushes into its screen, which shows a live replica of the page.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PROFILE } from "./data.js";

export function canRun3D() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ss = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (p) => 1 - Math.pow(1 - p, 3);

// timeline, seconds
const T = { drops: 2.6, power: 3.2, boot: 4.0, page: 6.0, zoom: 6.4, fade: 9.0, end: 9.6 };

const SW = 84;
const SH = 70;
const SY = 94;
const SZ = 32.6;

const BOOT_LINES = [
  "CRT-OS  rev 2.4   (c) 1994",
  "",
  "memory test .......... 640K ok",
  "keyboard ............. found",
  "pointer .............. found",
  "display .............. 84 x 70",
  "",
  "mounting /home/fuzail",
  "starting portfolio.app",
  "",
  "ready.",
];

function paintBoot(ctx, w, h, t) {
  ctx.fillStyle = "#050806";
  ctx.fillRect(0, 0, w, h);
  const fs = Math.round(h * 0.052);
  ctx.font = `${fs}px "Geist Mono", ui-monospace, Menlo, monospace`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#8dffb0";
  ctx.shadowColor = "#6dffa0";
  ctx.shadowBlur = fs * 0.4;
  const chars = Math.floor(t * 38);
  let n = 0;
  const x = w * 0.08;
  let y = h * 0.1;
  for (const line of BOOT_LINES) {
    const part = line.slice(0, Math.max(0, chars - n));
    ctx.fillText(part, x, y);
    n += line.length + 1;
    if (chars < n) {
      if (Math.floor(t * 3) % 2 === 0) {
        ctx.fillRect(x + ctx.measureText(part).width + 4, y, fs * 0.55, fs);
      }
      break;
    }
    y += fs * 1.35;
  }
  ctx.shadowBlur = 0;
}

// Replica of the live page, laid out from the real DOM so it matches 1:1.
function buildPageCanvas(w, h, noAvatar) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  const cs = getComputedStyle(document.documentElement);
  const bg = cs.getPropertyValue("--bg").trim() || "#0b0c0e";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const vw = innerWidth;
  const vh = innerHeight;
  const sc = Math.max(w / vw, h / vh) === w / vw ? w / vw : h / vh;
  // map viewport so the visible crop equals the canvas
  const s = Math.min(w / vw, h / vh) === w / vw ? w / vw : h / vh;
  const k = Math.max(w / vw, h / vh) <= 0 ? 1 : s;
  void sc;
  const ox = (w - vw * k) / 2;
  const oy = (h - vh * k) / 2;
  const X = (v) => ox + v * k;
  const Y = (v) => oy + v * k;
  // dot grid
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  const step = 22 * k;
  for (let y = Y(0) % step; y < h; y += step) for (let x = X(0) % step; x < w; x += step) ctx.fillRect(x, y, Math.max(1, 1.2 * k), Math.max(1, 1.2 * k));

  const q = (sel) => document.querySelector(sel);
  const rr = (r, rad, fill, stroke) => {
    ctx.beginPath();
    ctx.roundRect(X(r.left), Y(r.top), r.width * k, r.height * k, rad * k);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, k);
      ctx.stroke();
    }
  };
  const textOf = (root, color, font) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      const st = getComputedStyle(el);
      const size = parseFloat(st.fontSize);
      ctx.font = `${st.fontWeight} ${size * k}px ${font || st.fontFamily}`;
      ctx.fillStyle = color || st.color;
      ctx.textBaseline = "alphabetic";
      ctx.letterSpacing = st.letterSpacing === "normal" ? "0px" : st.letterSpacing;
      const txt = node.textContent;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(txt))) {
        const r = document.createRange();
        r.setStart(node, m.index);
        r.setEnd(node, m.index + m[0].length);
        const b = r.getBoundingClientRect();
        if (!b.width) continue;
        ctx.fillText(m[0], X(b.left), Y(b.bottom - (b.height - size) / 2 - size * 0.2));
      }
    }
  };
  const sigw = q(".signature-word");
  if (sigw) {
    const b = sigw.getBoundingClientRect();
    const st = getComputedStyle(sigw);
    ctx.font = `italic ${st.fontWeight} ${parseFloat(st.fontSize) * k}px ${st.fontFamily}`;
    ctx.fillStyle = "#3b4048";
    ctx.textBaseline = "alphabetic";
    ctx.save();
    ctx.translate(X(b.left), Y(b.top + parseFloat(st.fontSize) * 0.86));
    ctx.transform(1, 0, -0.14, 1, 0, 0);
    ctx.fillText("Fuzail", 0, 0);
    ctx.restore();
  }
  const mas = q(".mascot");
  const finish = () => c;
  if (mas) {
    const im = mas.querySelector("img");
    const b = (im || mas).getBoundingClientRect();
    rr(b, b.width / 2, "#2a2d33");
    if (!noAvatar && im && im.complete && im.naturalWidth) {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.arc(X(b.left + b.width / 2), Y(b.top + b.height / 2), (b.width / 2) * k, 0, 7);
        ctx.clip();
        ctx.drawImage(im, X(b.left), Y(b.top), b.width * k, b.height * k);
        ctx.restore();
        ctx.getImageData(0, 0, 1, 1);
      } catch {
        ctx.restore();
        return buildPageCanvas(w, h, true);
      }
    }
  }
  const name = q(".name");
  if (name) textOf(name);
  const tag = q(".tagline");
  if (tag) textOf(tag);
  document.querySelectorAll(".pill").forEach((p) => {
    const b = p.getBoundingClientRect();
    rr(b, 10, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.1)");
  });
  const bio = q(".bio");
  if (bio) textOf(bio);
  const tree = q(".tree");
  if (tree) {
    const b = tree.getBoundingClientRect();
    const st = getComputedStyle(tree);
    const size = parseFloat(st.fontSize);
    ctx.font = `${size * k}px ${st.fontFamily}`;
    ctx.fillStyle = st.color;
    const lh = parseFloat(st.lineHeight) || size * 1.4;
    tree.textContent.split("\n").forEach((ln, i) => ctx.fillText(ln, X(b.left), Y(b.top + lh * (i + 0.8))));
  }
  const sl = q(".slider-well");
  if (sl) {
    const b = sl.getBoundingClientRect();
    rr(b, b.height / 2, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.12)");
    const kn = q(".slider-knob");
    if (kn) {
      const kb = kn.getBoundingClientRect();
      const cx = X(kb.left + kb.width / 2);
      const cy = Y(kb.top + kb.height / 2);
      const kr = (kb.width / 2) * k;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = 12 * k;
      ctx.shadowOffsetY = 5 * k;
      const g = ctx.createRadialGradient(cx - kr * 0.2, cy - kr * 0.4, 0, cx, cy, kr);
      g.addColorStop(0, "#56595f");
      g.addColorStop(0.3, "#393d41");
      g.addColorStop(0.65, "#25282c");
      g.addColorStop(1, "#101215");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, kr, 0, 7);
      ctx.fill();
      ctx.restore();
    }
  }
  return finish();
}

const CRT_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const CRT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uPower, uClean, uTime;
uniform vec2 uRes;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 c = uv*2.0-1.0;
  float curve = (1.0-uClean)*0.06;
  c *= 1.0 + dot(c,c)*curve;
  vec2 uv2 = c*0.5+0.5;
  if(uv2.x<0.0||uv2.x>1.0||uv2.y<0.0||uv2.y>1.0){ gl_FragColor=vec4(0.0,0.0,0.0,1.0); return; }
  // power-on: horizontal line expands to full height
  float open = smoothstep(0.0,1.0,uPower);
  float halfH = mix(0.004, 1.0, smoothstep(0.35,1.0,uPower));
  float halfW = mix(0.05, 1.0, smoothstep(0.0,0.35,uPower));
  float inY = 1.0 - smoothstep(halfH-0.01, halfH+0.01, abs(c.y));
  float inX = 1.0 - smoothstep(halfW-0.02, halfW+0.02, abs(c.x));
  float mask = inX*inY;
  vec3 col = texture2D(uTex, uv2).rgb;
  float ab = (1.0-uClean)*0.0015;
  col.r = texture2D(uTex, uv2+vec2(ab,0.0)).r;
  col.b = texture2D(uTex, uv2-vec2(ab,0.0)).b;
  float scan = 0.5+0.5*sin(uv2.y*uRes.y*3.14159);
  col *= 1.0 - (1.0-uClean)*0.16*scan;
  col += (hash(uv2*uRes+uTime)-0.5)*0.05*(1.0-uClean);
  float vig = 1.0 - (1.0-uClean)*0.55*dot(c,c)*0.5;
  col *= vig;
  vec3 line = vec3(0.85,0.95,1.0) * (1.0-smoothstep(0.0,0.35,uPower)*0.0);
  col = mix(line*0.38, col, smoothstep(0.35,0.9,uPower));
  gl_FragColor = vec4(col*mask, 1.0);
}`;

export function run3D(overlay, { reduce, onStage, onDone }) {
  const debug = new URLSearchParams(location.search).has("introdebug");
  const w0 = innerWidth;
  const h0 = innerHeight;
  const canvas = document.createElement("canvas");
  canvas.className = "intro-3d";
  const vig = document.createElement("canvas");
  vig.className = "intro-vignette";
  overlay.append(canvas, vig);
  {
    vig.width = 256;
    vig.height = 256;
    const g = vig.getContext("2d");
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 190);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    vig.style.setProperty("--vig", "1");
  }
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w0, h0, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const bgc = getComputedStyle(document.documentElement).getPropertyValue("--loader-bg").trim() || "#0b0c0e";
  renderer.setClearColor(new THREE.Color(bgc), 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, w0 / h0, 10, 5000);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2e36, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e6, 3.4);
  key.position.set(-220, 300, 200);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 900 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd5d9e0, 0.5);
  rim.position.set(160, 120, -160);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShadowMaterial({ opacity: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const beige = new THREE.MeshStandardMaterial({ color: 0x4f5257, roughness: 0.62, metalness: 0.02 });
  const beigeDark = new THREE.MeshStandardMaterial({ color: 0x383b3f, roughness: 0.65 });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x5c5f64, roughness: 0.5 });
  const keyMatDark = new THREE.MeshStandardMaterial({ color: 0x8e8a80, roughness: 0.5 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.4 });

  const parts = []; // { obj, delay, rise }
  const add = (obj, delay, rise = 150) => {
    obj.traverse((o) => {
      if (o.isMesh && o.material !== floor.material) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    obj.userData.base = obj.position.clone();
    obj.userData.baseRot = obj.rotation.clone();
    parts.push({ obj, delay, rise, spin: (Math.random() - 0.5) * 0.35 });
    scene.add(obj);
    return obj;
  };

  // base + neck
  const base = new THREE.Mesh(new RoundedBoxGeometry(104, 8, 62, 4, 3), beigeDark);
  base.position.set(0, 4, 0);
  add(base, 0.0, 120);
  // shell
  const shell = new THREE.Mesh(new RoundedBoxGeometry(136, 145, 64, 6, 9), beige);
  shell.position.set(0, 77.5 + 4, 0);
  add(shell, 0.35, 170);
  // bezel recess (dark frame) and glass
  const frame = new THREE.Mesh(new RoundedBoxGeometry(SW + 10, SH + 10, 4, 4, 3), beigeDark);
  frame.position.set(0, SY + 4, 31);
  add(frame, 0.7, 170);
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(SW + 2.4, SH + 2.4), black);
  inner.position.set(0, SY + 4, SZ + 0.1 + 1.8);
  add(inner, 0.7, 170);
  // floppy slot, badge
  const slot = new THREE.Mesh(new THREE.BoxGeometry(38, 2.4, 1), black);
  slot.position.set(26, 44 + 4, 32.3);
  add(slot, 0.95, 140);
  const led = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16), new THREE.MeshBasicMaterial({ color: 0x4cff7a }));
  led.position.set(54, 38 + 4, 32.4);
  add(led, 1.0, 140);
  // rainbow badge, top vents, handle recess, side vents
  const badge = new THREE.Group();
  [0xe5484d, 0xf2a93b, 0x4cb86a, 0x3b82f6].forEach((c, i) => {
    const sq = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.6), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    sq.position.set((i % 2) * 2.8, -Math.floor(i / 2) * 2.8, 0);
    badge.add(sq);
  });
  badge.position.set(-52, 49 + 4, 32.4);
  add(badge, 1.0, 140);
  const vents = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(46, 0.5, 1.3), black);
    v.position.set(-20, 77.5 + 4 + 72.6, -4 + i * 3.2);
    vents.add(v);
  }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(86, 0.6, 5), black);
  handle.position.set(0, 77.5 + 4 + 72.6, 24);
  vents.add(handle);
  for (let i = 0; i < 9; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.6, 16, 1.3), black);
    v.position.set(68.2, 112, -22 + i * 3.4);
    vents.add(v);
    const w = v.clone();
    w.position.y = 82;
    vents.add(w);
  }
  add(vents, 0.4, 170);

  // screen
  const SCR_W = 1024;
  const SCR_H = Math.round((1024 * SH) / SW);
  const scr = document.createElement("canvas");
  scr.width = SCR_W;
  scr.height = SCR_H;
  const sctx = scr.getContext("2d");
  sctx.fillStyle = "#000";
  sctx.fillRect(0, 0, SCR_W, SCR_H);
  const tex = new THREE.CanvasTexture(scr);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const crt = new THREE.ShaderMaterial({
    vertexShader: CRT_VERT,
    fragmentShader: CRT_FRAG,
    uniforms: { uTex: { value: tex }, uPower: { value: 0 }, uClean: { value: 0 }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(SCR_W, SCR_H) } },
    toneMapped: false,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), crt);
  glass.position.set(0, SY + 4, SZ + 2.2);
  add(glass, 0.75, 170);

  // keyboard
  const kb = new THREE.Group();
  const kbBody = new THREE.Mesh(new RoundedBoxGeometry(122, 4.2, 46, 3, 1.6), beige);
  kbBody.position.set(0, 2.1, 0);
  kb.add(kbBody);
  const keyGeo = new RoundedBoxGeometry(7.4, 3.2, 7.4, 2, 0.9);
  const rows = [
    { n: 14, x0: -52, w: 1 },
    { n: 14, x0: -52, w: 1 },
    { n: 13, x0: -50, w: 1 },
    { n: 12, x0: -48, w: 1 },
    { n: 11, x0: -46, w: 1 },
    { n: 1, x0: -20, w: 6 },
  ];
  const inst = [];
  rows.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) inst.push({ x: r.x0 + i * 8.4 + (r.w > 1 ? 0 : 0), z: -17 + ri * 8.4, w: r.w, row: ri });
  });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) inst.push({ x: 40 + i * 8.4, z: -17 + (j + 1) * 8.4, w: 1, row: j + 1, pad: true });
  const kmesh = new THREE.InstancedMesh(keyGeo, keyMat, inst.length);
  const m4 = new THREE.Matrix4();
  inst.forEach((k, i) => {
    m4.makeScale(k.w, 1, 1).setPosition(k.x + (k.w > 1 ? 21 : 0), 5.2, k.z);
    // setPosition keeps scale
    const mm = new THREE.Matrix4().makeTranslation(k.x + (k.w > 1 ? (k.w * 7.4) / 2 - 3.7 + 6 : 0), 5.2, k.z).multiply(new THREE.Matrix4().makeScale(k.w, 1, 1));
    kmesh.setMatrixAt(i, mm);
    kmesh.setColorAt(i, new THREE.Color(k.pad || k.row === 0 ? 0x484b50 : 0x62656a));
  });
  kmesh.instanceColor.needsUpdate = true;
  kb.add(kmesh);
  kb.position.set(-6, 2.6, 78);
  kb.rotation.x = -Math.atan(6.5 / 70) * 0;
  kb.userData.slope = Math.atan(6.5 / 70);
  add(kb, 1.2, 150);

  // mouse + cord
  const mouse = new THREE.Group();
  const mb = new THREE.Mesh(new RoundedBoxGeometry(14, 6, 22, 4, 3), beige);
  mb.position.y = 3;
  const mbtn = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 9), black);
  mbtn.position.set(0, 6.1, -5);
  mouse.add(mb, mbtn);
  mouse.position.set(88, 0, 76);
  add(mouse, 1.5, 130);
  const cordPts = [new THREE.Vector3(88, 2, 64), new THREE.Vector3(86, 1.2, 50), new THREE.Vector3(70, 1.2, 46), new THREE.Vector3(60, 1.2, 40), new THREE.Vector3(30, 1.2, 36)];
  const cordGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 64, 0.7, 6, false);
  const cord = new THREE.Mesh(cordGeo, new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughness: 0.6 }));
  cord.castShadow = true;
  scene.add(cord);
  const cordIdx = cordGeo.index.count;
  cordGeo.setDrawRange(0, 0);

  // camera shots
  const shot = (t, pos, look, fov) => ({ t, pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look), fov });
  // near-orthographic 3/4 hold pose (long lens), then a swing to the front for the zoom
  const hold = (d, y = 0) => [827 * (d / 1520), 713 * (d / 1520) + y + 70, 1058 * (d / 1520) + 20];
  const shots = [
    shot(0, hold(2300, 0), [0, 70, 20], 10),
    shot(0.9, hold(1900, 0), [0, 72, 20], 10),
    shot(T.drops, hold(1520), [0, 72, 20], 10),
    shot(T.power - 0.3, [160, 140, 420], [0, 92, 30], 20),
    shot(T.power + 0.4, [0, 104, 250], [0, 96, 30], 30),
  ];
  const camPos = shots[0].pos.clone();
  const camLook = shots[0].look.clone();
  let camFov = shots[0].fov;
  const vPos = new THREE.Vector3();
  const vLook = new THREE.Vector3();
  let vFov = 0;
  const K = 24;
  const C = 2 * Math.sqrt(K);
  const pageCanvasRef = { c: null };

  function zoomShot() {
    const asp = innerWidth / innerHeight;
    const fov = 30;
    const th = Math.tan((fov * Math.PI) / 360);
    const distH = SH / 2 / th;
    const distW = SW / 2 / (th * asp);
    const dist = Math.min(distH, distW) * 0.975;
    return shot(T.zoom, [0, SY + 4, SZ + 2.2 + dist], [0, SY + 4, SZ + 2.2], fov);
  }
  let zoomS = null;

  let time = 0;
  let stageSent = false;
  let finished = false;
  let bootPainted = -1;

  function step(dt) {
    time += dt;
    const t = time;
    // drops
    for (const p of parts) {
      const k = clamp((t - p.delay) / 0.85, 0, 1);
      const e = easeOut(k);
      const bounce = k < 1 ? Math.sin(k * Math.PI * 2.2) * (1 - k) * 4 * (k > 0.6 ? 1 : 0) : 0;
      p.obj.visible = t >= p.delay;
      p.obj.position.y = p.obj.userData.base.y + p.rise * (1 - e) + Math.max(0, bounce);
      p.obj.rotation.z = p.obj.userData.baseRot.z + p.spin * (1 - e);
      p.obj.rotation.x = p.obj.userData.baseRot.x + (p === parts.find((q) => q.obj === kb) ? 0 : 0);
    }
    kb.rotation.x = kb.userData.slope;
    cordGeo.setDrawRange(0, Math.floor(cordIdx * easeOut(clamp((t - 1.9) / 0.7, 0, 1)) / 3) * 3);

    // screen
    const power = ss(T.power, T.power + 0.8, t);
    crt.uniforms.uPower.value = power;
    crt.uniforms.uTime.value = t;
    led.visible = t >= 1.0 && t > T.power - 0.1;
    if (t >= T.power && t < T.page + 0.7) {
      const bt = Math.max(0, t - T.boot);
      const frameId = Math.floor(t * 30);
      if (frameId !== bootPainted) {
        bootPainted = frameId;
        paintBoot(sctx, SCR_W, SCR_H, bt);
        if (t >= T.page - 0.05) {
          if (!pageCanvasRef.c) {
            try {
              pageCanvasRef.c = buildPageCanvas(SCR_W, SCR_H);
            } catch (e) {
              console.warn(e);
            }
          }
          if (pageCanvasRef.c) {
            sctx.globalAlpha = ss(T.page, T.page + 0.6, t);
            sctx.drawImage(pageCanvasRef.c, 0, 0);
            sctx.globalAlpha = 1;
          }
        }
        tex.needsUpdate = true;
      }
    } else if (t >= T.page + 0.7 && pageCanvasRef.c && bootPainted !== -2) {
      bootPainted = -2;
      sctx.drawImage(pageCanvasRef.c, 0, 0);
      tex.needsUpdate = true;
    }
    crt.uniforms.uClean.value = ss(T.zoom, T.zoom + 1.6, t);

    // camera
    if (t >= T.zoom && !zoomS) {
      zoomS = zoomShot();
      shots.push(zoomS);
    }
    let cur = shots[0];
    for (const s of shots) if (s.t <= t) cur = s;
    for (const [pos, v, tgt] of [
      [camPos, vPos, cur.pos],
      [camLook, vLook, cur.look],
    ]) {
      v.addScaledVector(tgt.clone().sub(pos), K * dt).addScaledVector(v, -C * dt);
      pos.addScaledVector(v, dt);
    }
    vFov += (K * (cur.fov - camFov) - C * vFov) * dt;
    camFov += vFov * dt;
    camera.position.copy(camPos);
    camera.fov = camFov;
    camera.lookAt(camLook);
    camera.updateProjectionMatrix();
    vig.style.opacity = String(1 - ss(T.zoom, T.zoom + 1.4, t));

    if (t >= T.fade && !stageSent) {
      stageSent = true;
      overlay.dataset.stage = "fade";
      onStage?.("fade");
    }
    if (t >= T.end && !finished) {
      finished = true;
      cleanup();
      onDone?.();
    }
  }

  function draw() {
    renderer.render(scene, camera);
  }

  let raf = 0;
  let lastNow = 0;
  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    if (zoomS) {
      shots.splice(shots.indexOf(zoomS), 1);
      zoomS = null;
    }
  };
  addEventListener("resize", onResize);
  camera.aspect = w0 / h0;

  function cleanup() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", onResize);
    setTimeout(() => {
      renderer.dispose();
      canvas.remove();
      vig.remove();
    }, 600);
  }

  if (reduce) {
    time = T.end - 0.8;
    // jump straight to the end: page already set, brief fade
    overlay.dataset.stage = "fade";
    onStage?.("fade");
    setTimeout(() => {
      finished = true;
      cleanup();
      onDone?.();
    }, 500);
    return () => cleanup();
  }

  if (debug) {
    // deterministic stepper: window.__introStep(t) advances to absolute time t and renders
    window.__introStep = (to, fixed = 1 / 60) => {
      while (time < to - 1e-6) step(Math.min(fixed, to - time));
      draw();
      return time;
    };
    window.__introT = T;
    return () => cleanup();
  }

  let slow = 0;
  let frames = 0;
  let adapted = false;
  const loop = (now) => {
    // wall-clock driven: the intro lasts the same time at any frame rate
    let dt = lastNow ? Math.min((now - lastNow) / 1000, 0.3) : 1 / 60;
    lastNow = now;
    frames++;
    if (!adapted && frames > 8) {
      if (dt > 1 / 24) slow++;
      if (slow > 6) {
        adapted = true;
        renderer.setPixelRatio(0.6);
        renderer.setSize(innerWidth, innerHeight, false);
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
    }
    while (dt > 1e-6 && !finished) {
      const h = Math.min(dt, 1 / 60);
      step(h);
      dt -= h;
    }
    draw();
    if (!finished) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return cleanup;
}
