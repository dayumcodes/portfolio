// Intro: a retro television, keyboard and mouse assemble in a dark room, the
// set powers on (a line burning open into a warm picture), the live page fades
// up on the screen and the camera pushes through the glass into the page.
// Independently implemented to match the reference site's observed intro.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

export function canRun3D() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
const smooth = (p) => {
  const t = clamp01(p);
  return t * t * (3 - 2 * t);
};

const BG = "#1a1d21";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

// screen glass rectangle in scene units
const SCREEN = { cx: 0, cy: 94, cz: 69.3, w: 84, h: 70, r: 9 };
const CASE_TILT = Math.atan(6.5 / 70);
const KEY_Z0 = 93;
const caseTop = (z) => 6 + (6.5 * (154 - z)) / 70;

// camera dolly path: [t, target xyz, azimuth deg, elevation deg, log-distance]
const HOLD = [[8, 62, 40], 30, 18, 1];
const CAM_PATH = [
  [0, [0, 40, 36], 26, 12, 0.72],
  [0.22, [0, 80, 10], 32, 18, 0.9],
  [0.34, [0, 8, 119], 26, 30, 0.5],
  [0.5, [-14, 8, 119], 34, 36, 0.42],
  [0.64, [24, 8, 119], 42, 36, 0.42],
  [0.76, [111, 5, 127], 52, 30, 0.36],
  [0.86, [70, 6, 60], 44, 34, 0.62],
  [0.92, ...HOLD],
  [1, ...HOLD],
];

// keyboard rows in key units (negative = gap), true = dark key
const U = (n, w = 1, dark = false) => Array.from({ length: n }, () => [w, dark]);
const KEY_ROWS = [
  [[1, true], [-1], ...U(4), [-0.5], ...U(4, 1, true), [-0.5], ...U(4)],
  [...U(13), [2, true]],
  [[1.5, true], ...U(12), [1.5, true]],
  [[1.75, true], ...U(11), [2.25, true]],
  [[2.25, true], ...U(10), [2.75, true]],
  [...U(3, 1.25, true), [6.25], ...U(4, 1.25, true)],
];
const PAD_ROWS = [U(3, 1, true), U(3, 1, true), U(3, 1, true), [], [[-1], [1, true]], U(3, 1, true)];
const KEY_HEIGHTS = [4.6, 5.2, 4.9, 4.6, 4.6, 4.9];

function roundedRectPath(x0, y0, x1, y1, r) {
  const s = new THREE.Shape();
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.quadraticCurveTo(x1, y0, x1, y0 + r);
  s.lineTo(x1, y1 - r);
  s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1);
  s.quadraticCurveTo(x0, y1, x0, y1 - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
function roundedRectHole(x0, y0, x1, y1, r) {
  const s = new THREE.Path();
  s.moveTo(x0 + r, y0);
  s.quadraticCurveTo(x0, y0, x0, y0 + r);
  s.lineTo(x0, y1 - r);
  s.quadraticCurveTo(x0, y1, x0 + r, y1);
  s.lineTo(x1 - r, y1);
  s.quadraticCurveTo(x1, y1, x1, y1 - r);
  s.lineTo(x1, y0 + r);
  s.quadraticCurveTo(x1, y0, x1 - r, y0);
  s.lineTo(x0 + r, y0);
  return s;
}
// curved glass plate with planar UVs
function glassPlate(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRectPath(-w / 2, -h / 2, w / 2, h / 2, r), 8);
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

// fine grey noise texture used as a subtle bump/roughness variation
function noiseTexture(size = 256, amp = 18) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const data = ctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * amp * 2;
    data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
}

// soft contact shadow blob
function blobShadow(w, h, x, z) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.55, "rgba(0,0,0,0.4)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.05, z);
  m.renderOrder = -1;
  return m;
}

// canvas-drawn decal labels
function decal(x0, y0, x1, y1, z, draw) {
  const c = document.createElement("canvas");
  c.width = Math.round((x1 - x0) * 28);
  c.height = Math.round((y1 - y0) * 28);
  const ctx = c.getContext("2d");
  ctx.scale(28, 28);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  draw(ctx, (x, y) => [x - x0, y1 - y]);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(x1 - x0, y1 - y0),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  m.receiveShadow = true;
  return m;
}

function buildMaterials() {
  const noise = noiseTexture();
  const plastic = (color, roughness) =>
    new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.55, bumpMap: noise, bumpScale: 0.12, roughnessMap: noise });
  const drumC = document.createElement("canvas");
  drumC.width = 8;
  drumC.height = 2;
  const dc = drumC.getContext("2d");
  dc.fillStyle = "#e4e2dd";
  dc.fillRect(0, 0, 8, 2);
  dc.fillStyle = "#8f8d88";
  dc.fillRect(0, 0, 3, 2);
  const drumTex = new THREE.CanvasTexture(drumC);
  drumTex.colorSpace = THREE.SRGBColorSpace;
  drumTex.wrapS = THREE.RepeatWrapping;
  drumTex.repeat.set(64, 1);
  return {
    shell: plastic("#868b92", 0.5),
    housing: plastic("#1e2126", 0.5),
    plinth: plastic("#15171a", 0.7),
    face: plastic("#15171a", 0.42),
    surround: plastic("#0c0e10", 0.5),
    key: plastic("#959aa1", 0.55),
    keyDark: plastic("#454a51", 0.55),
    keyboard: plastic("#81868d", 0.5),
    well: plastic("#3d4248", 0.6),
    metal: new THREE.MeshPhysicalMaterial({ color: "#c9c8c4", metalness: 0.75, roughness: 0.3, clearcoat: 0.3 }),
    drum: new THREE.MeshStandardMaterial({ map: drumTex, roughness: 0.45, metalness: 0.3 }),
    groove: new THREE.MeshStandardMaterial({ color: "#121316", roughness: 0.9 }),
    glassBase: new THREE.MeshStandardMaterial({ color: "#090b0e", roughness: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.06, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.4 }),
    cord: new THREE.MeshStandardMaterial({ color: "#7d838a", roughness: 0.5 }),
  };
}

function rgbBadge(ctx, x, y, w, h) {
  ctx.fillStyle = "#1a1a1b";
  ctx.fillRect(x, y, w, h);
  ["#c8473c", "#4d9a5a", "#3d68b8"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + 0.5 + (i * (w - 1)) / 3, y + 0.5, (w - 1) / 3 - 0.25, h - 1);
  });
}

const GLOW_FRAG = `
uniform float uTime, uOpen, uWarm, uOpacity;
uniform vec2 uGrain;
uniform vec2 uPixels;
varying vec2 vUv;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c * vec2(1.0, 1.2));
  float falloff = pow(smoothstep(0.78, 0.0, r), 1.6);
  float lines = floor(min(uGrain.y, uPixels.y / 3.0));
  float scan = 0.9 + 0.1 * sin(vUv.y * lines * 3.14159);
  float cells = mix(0.55, 1.0, uWarm);
  float frame = floor(uTime * 30.0);
  vec2 grains = floor(min(uGrain * cells, uPixels * 0.5));
  float n = hash(floor(vUv * grains) + vec2(frame * 37.0, frame * 91.0));
  float grain = 1.0 + (n - 0.5) * mix(0.75, 0.38, uWarm);
  float flicker = 0.97 + 0.03 * sin(uTime * 57.0) * sin(uTime * 13.0);
  vec3 phosphor = vec3(0.46, 0.54, 0.64);
  vec3 col = phosphor * (0.16 + 0.84 * falloff) * scan * grain * flicker * mix(0.55, 1.0, uWarm);
  float line = (1.0 - smoothstep(0.0, 0.25, uOpen)) * exp(-c.x * c.x * 9.0);
  col *= 1.0 + 2.6 * line;
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const GLOW_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// the television, keyboard and mouse; returns animated parts and the screen
function buildSet(M) {
  const root = new THREE.Group();
  const parts = [];
  const box = (w, h, d, r, mat, seg = 4) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, 0.999 * Math.min(r, w / 2, h / 2, d / 2)), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const grooveBox = (w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.groove);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    return m;
  };
  const framePlate = (outer, inner, z, mat) => {
    const shape = roundedRectPath(outer.x0, outer.y0, outer.x1, outer.y1, outer.r);
    shape.holes.push(roundedRectHole(inner.x0, inner.y0, inner.x1, inner.y1, inner.r));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 16), mat);
    m.position.z = z;
    m.receiveShadow = true;
    return m;
  };
  const grow = (r, d = 0) => ({ x0: r.x0 - d, y0: r.y0 - d, x1: r.x1 + d, y1: r.y1 + d, r: r.r + d });

  const BEZEL = { x0: -60, x1: 60, y0: 44, y1: 140, r: 4 };
  const FACE_IN = { x0: -51, x1: 51, y0: 53, y1: 135, r: 8 };
  const GLASS = { x0: -42, x1: 42, y0: 59, y1: 129, r: 9 };
  const DRUM = { x0: 4, x1: 36, y0: 21, y1: 35 };

  // ---- the set itself ----
  const tv = new THREE.Group();
  const plinth = box(122, 5, 56, 1.5, M.plinth);
  plinth.position.set(0, 2.5, 36);
  tv.add(plinth);
  const shell = box(136, 145, 64, 5, M.shell, 6);
  shell.position.set(0, 77.5, 37);
  const housing = box(128, 134, 48, 10, M.housing, 6);
  housing.position.set(0, 72, -17);
  const rear = box(92, 96, 34, 12, M.housing, 6);
  rear.position.set(0, 67, -51);
  tv.add(shell, housing, rear);
  const seams = new THREE.Group();
  seams.add(grooveBox(126, 0.5, 0.3, 0, 40, 69.1));
  seams.add(grooveBox(0.3, 0.5, 56, 68.1, 40, 37));
  seams.add(grooveBox(0.3, 0.5, 56, -68.1, 40, 37));
  tv.add(seams);
  const vents = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const v = box(2.4, 13, 1.7, 0.7, M.shell, 3);
    v.position.set(68.6, 21, 62 - 3.6 * i);
    vents.add(v);
  }
  tv.add(vents);
  tv.add(framePlate(BEZEL, FACE_IN, 69.3, M.face));
  tv.add(framePlate(grow(FACE_IN, 0.4), grow(GLASS, 1.4), 69.2, M.surround));
  const gg = grow(GLASS, 1.8);
  const grooveFrame = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectPath(gg.x0, gg.y0, gg.x1, gg.y1, gg.r), 16), M.groove);
  grooveFrame.position.z = 69.1;
  grooveFrame.receiveShadow = true;
  tv.add(grooveFrame);
  // channel table + AC/DC labels
  tv.add(
    decal(BEZEL.x0 + 2, BEZEL.y0 + 1, BEZEL.x1 - 2, FACE_IN.y0 - 0.5, 69.4, (ctx, t) => {
      ctx.fillStyle = "rgba(170,170,166,0.7)";
      ctx.font = `500 1.5px ${FONT}`;
      const row = (y, cells) => cells.forEach((c, i) => c && ctx.fillText(c, ...t(-38 + 7.6 * i, y)));
      row(49.6, ["VHF", "3 4", "4", "6", "8", "", "", "7 9", "11", "13", "X-CH"]);
      row(47.2, ["UHF", "14", "20", "30", "46", "16", "65", "70", "60", "80", "X-CHH"]);
    })
  );
  tv.add(
    decal(FACE_IN.x1 + 0.5, FACE_IN.y1 - 6, BEZEL.x1 - 0.5, BEZEL.y1 - 0.5, 69.4, (ctx, t) => {
      ctx.font = `700 1.9px ${FONT}`;
      ctx.fillStyle = "rgba(150,150,146,0.75)";
      ctx.fillText("AC/DC", ...t((FACE_IN.x1 + BEZEL.x1) / 2, BEZEL.y1 - 2.4));
    })
  );
  // speaker grille, left of the deck
  const speaker = new THREE.Group();
  const spPanel = box(36, 24, 1, 1, M.surround, 3);
  spPanel.position.set(-44, 23, 68.7);
  speaker.add(spPanel);
  for (let i = 0; i < 12; i++) {
    const v = box(1.7, 24, 2.4, 0.6, M.shell, 3);
    v.position.set(-60.6 + 3.02 * i, 23, 69.4);
    speaker.add(v);
  }
  tv.add(speaker);
  // buttons
  const buttons = new THREE.Group();
  const bWell = box(22, 12, 1.2, 1, M.well);
  bWell.position.set(-11, 25, 69);
  buttons.add(bWell);
  for (let i = -1; i <= 1; i++) {
    const b = box(4.2, 9, 3.4, 0.8, M.key);
    b.position.set(-11 + 7 * i, 25, 70.3);
    buttons.add(b);
  }
  tv.add(buttons);
  // tuning drum
  const drumG = new THREE.Group();
  const rim = { x0: DRUM.x0, x1: DRUM.x1, y0: DRUM.y0, y1: DRUM.y1, r: 2 };
  const rimShape = roundedRectPath(rim.x0, rim.y0, rim.x1, rim.y1, rim.r);
  rimShape.holes.push(roundedRectHole(rim.x0 + 2, rim.y0 + 2, rim.x1 - 2, rim.y1 - 2, 1));
  const rimMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape, { depth: 1.8, bevelEnabled: false, curveSegments: 12 }), M.shell);
  rimMesh.castShadow = rimMesh.receiveShadow = true;
  rimMesh.position.z = 68.9;
  const drumBack = grooveBox(DRUM.x1 - DRUM.x0 - 4, DRUM.y1 - DRUM.y0 - 4, 0.4, (DRUM.x0 + DRUM.x1) / 2, (DRUM.y0 + DRUM.y1) / 2, 69);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, DRUM.x1 - DRUM.x0 - 2, 64), M.drum);
  drum.rotation.z = Math.PI / 2;
  drum.position.set((DRUM.x0 + DRUM.x1) / 2, (DRUM.y0 + DRUM.y1) / 2, 65);
  drum.castShadow = drum.receiveShadow = true;
  drumG.add(rimMesh, drumBack, drum);
  tv.add(drumG);
  // volume knob
  const vol = new THREE.Group();
  const vWell = box(16, 13, 1.2, 1.2, M.well);
  vWell.position.set(51, 25, 69);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.8, 40), M.surround);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(51, 25, 69.6);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 4.2, 40), M.metal);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(51, 25, 71.4);
  knob.castShadow = knob.receiveShadow = true;
  vol.add(vWell, collar, knob);
  tv.add(vol);
  // deck labels + badge
  tv.add(
    decal(-64, 8, 64, 39.4, 69.1, (ctx, t) => {
      ctx.fillStyle = "rgba(58,55,50,0.85)";
      ctx.font = `600 1.5px ${FONT}`;
      ["AFC", "RECALL", "BAND"].forEach((s, i) => ctx.fillText(s, ...t(-11 + (i - 1) * 7, 33)));
      ["OFF", "ON", "OFF"].forEach((s, i) => ctx.fillText(s, ...t(-11 + (i - 1) * 7, 17)));
      ctx.fillText("<  TUNING  >", ...t((DRUM.x0 + DRUM.x1) / 2, DRUM.y1 + 2));
      ctx.fillText("PULL-ON/VOL", ...t(51, 33.6));
      rgbBadge(ctx, ...t(6, 16), 14, 4.5);
    })
  );
  // glass stack: dark base, live page, phosphor glow, reflective glass
  const glassAt = (mesh, dz) => {
    mesh.position.set(SCREEN.cx, SCREEN.cy, SCREEN.cz + dz);
    return mesh;
  };
  const glassBase = glassAt(new THREE.Mesh(glassPlate(SCREEN.w, SCREEN.h, GLASS.r), M.glassBase), -0.05);
  glassBase.receiveShadow = true;
  const page = glassAt(
    new THREE.Mesh(glassPlate(SCREEN.w, SCREEN.h, GLASS.r), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, toneMapped: false, depthWrite: false })),
    0
  );
  const glow = glassAt(
    new THREE.Mesh(
      glassPlate(SCREEN.w, SCREEN.h, GLASS.r),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uOpen: { value: 0 },
          uWarm: { value: 0 },
          uOpacity: { value: 0 },
          uGrain: { value: new THREE.Vector2(340, 284) },
          uPixels: { value: new THREE.Vector2(2000, 2000) },
        },
        vertexShader: GLOW_VERT,
        fragmentShader: GLOW_FRAG,
      })
    ),
    0.02
  );
  const glass = glassAt(new THREE.Mesh(glassPlate(SCREEN.w, SCREEN.h, GLASS.r), M.glass), 0.5);
  page.renderOrder = 1;
  glow.renderOrder = 2;
  glass.renderOrder = 3;
  tv.add(glassBase, page, glow, glass);
  root.add(tv);
  parts.push({ object: tv, start: 0.02, dur: 0.2, from: new THREE.Vector3(0, 280, 0), heavy: true });
  parts.push({ object: blobShadow(204, 150, 0, 4), start: 0, dur: 0.22, from: new THREE.Vector3(), shadow: true });
  root.add(parts[parts.length - 1].object);

  // ---- keyboard ----
  const kb = new THREE.Group();
  kb.add(blobShadow(201.6, 105, 0, 119));
  kb.children[0].material.opacity = 1;
  for (const [x, z] of [[-74, 92], [74, 92], [-74, 146], [74, 146]]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.8, 16), M.plinth);
    foot.position.set(x, 0.4, z);
    kb.add(foot);
  }
  // wedge case, sloping up toward the back
  const wedgePts = [[85.2, 2], [152.8, 2], [152.8, 4.8], [85.2, 11.3]];
  const wedgeR = [1, 1, 2.6, 2.6];
  const wedgeShape = new THREE.Shape();
  wedgePts.forEach((p, i) => {
    const prev = wedgePts[(i + wedgePts.length - 1) % wedgePts.length];
    const next = wedgePts[(i + 1) % wedgePts.length];
    const r = wedgeR[i];
    const toward = (q) => {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      return [p[0] + ((q[0] - p[0]) * r) / d, p[1] + ((q[1] - p[1]) * r) / d];
    };
    const a = toward(prev);
    const b = toward(next);
    if (i === 0) wedgeShape.moveTo(a[0], a[1]);
    else wedgeShape.lineTo(a[0], a[1]);
    wedgeShape.quadraticCurveTo(p[0], p[1], b[0], b[1]);
  });
  const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, { depth: 165.6, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 3, curveSegments: 8 });
  wedgeGeo.rotateY(-Math.PI / 2);
  wedgeGeo.translate(82.8, 0, 0);
  const wedge = new THREE.Mesh(wedgeGeo, M.keyboard);
  wedge.castShadow = wedge.receiveShadow = true;
  kb.add(wedge);
  // back lip
  const lipZ = KEY_Z0 - 1.2 + (6.35 * 8.4 + 2.4) / 2;
  const lip = box(153.3 + 2.4, 0.6, 6.35 * 8.4 + 2.4, 1.6, M.surround, 3);
  lip.castShadow = false;
  lip.rotation.x = CASE_TILT;
  lip.position.set(-76.65 - 1.2 + (153.3 + 2.4) / 2, caseTop(lipZ) - 0.1, lipZ);
  kb.add(lip);
  kb.add(
    decal(58, 2, 70, 4.4, 154.1, (ctx, t) => {
      rgbBadge(ctx, ...t(58, 4.4), 12, 2.4);
    })
  );
  parts.push({ object: kb, start: 0.3, dur: 0.12, from: new THREE.Vector3(0, 0, 150) });
  root.add(kb);

  // keys, dropping in row by row
  const keyGeos = new Map();
  const keyRow = (layout, row, x0) => {
    let x = x0;
    const z = KEY_Z0 + (row === 0 ? 0 : (row + 0.35) * 8.4) + 4.2;
    layout.forEach(([w, dark]) => {
      if (w < 0) {
        x -= 8.4 * w;
        return;
      }
      const kw = 8.4 * w - 1.4;
      const kh = KEY_HEIGHTS[row];
      const id = `${kw}|${kh}`;
      if (!keyGeos.has(id)) keyGeos.set(id, new RoundedBoxGeometry(kw, kh, 7, 3, 1.1));
      const mesh = new THREE.Mesh(keyGeos.get(id), (dark ? M.keyDark : M.key).clone());
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.set(x + (8.4 * w) / 2, caseTop(z) - 1.2 + kh / 2, z);
      const holder = new THREE.Group();
      holder.add(mesh);
      root.add(holder);
      const delay = 0.4 + 0.028 * row + ((x - -76.65) / 8.4) * 0.0055 + 0.006 * Math.random();
      parts.push({
        object: holder,
        start: delay,
        dur: 0.085,
        from: new THREE.Vector3(0, 10, 0),
        settle: { mesh, tilt: [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3], pitch: CASE_TILT },
      });
      x += 8.4 * w;
    });
  };
  KEY_ROWS.forEach((layout, r) => keyRow(layout, r, -76.65));
  PAD_ROWS.forEach((layout, r) => keyRow(layout, r, -76.65 + 128.1));

  // ---- mouse ----
  const mouse = new THREE.Group();
  const mPlinth = box(27, 1.4, 43, 0.6, M.plinth, 3);
  mPlinth.position.set(111, 0.7, 127);
  const mBody = box(30, 10, 46, 4.5, M.keyboard, 6);
  mBody.position.set(111, 6, 127);
  const mButtons = [-1, 1].map((s) => {
    const b = box(11.8, 1.6, 15, 1, M.keyDark);
    b.position.set(111 + 7.2 * s, 10.9, 114.5);
    return b;
  });
  const mBadge = decal(135, 4.2, 145, 6.4, 0, (ctx, t) => {
    rgbBadge(ctx, ...t(135, 6.4), 10, 2.2);
  });
  mBadge.rotation.y = Math.PI / 2;
  mBadge.position.set(126.1, 5.3, 140);
  const mShadow = blobShadow(51, 69, 111, 127);
  mShadow.material.opacity = 1;
  mouse.add(mPlinth, mBody, ...mButtons, mBadge, mShadow);
  parts.push({ object: mouse, start: 0.7, dur: 0.1, from: new THREE.Vector3(140, 0, 0) });
  root.add(mouse);

  // cords, drawn on
  const cord = (pts, r = 0.8, len = 140) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, len, r, 8, false), M.cord);
    m.castShadow = true;
    m.geometry.setDrawRange(0, 0);
    return m;
  };
  const mouseCord = cord([
    [111, 4.5, 105], [111, 6, 101], [109, 7, 94], [105, 3, 86], [101, 0.9, 76],
    [96, 0.9, 50], [84, 0.9, 20], [72, 0.9, -6], [64, 3, -18], [56, 9, -22],
  ]);
  const mouseCordG = new THREE.Group();
  mouseCordG.add(mouseCord);
  parts.push({ object: mouseCordG, start: 0.8, dur: 0.12, from: new THREE.Vector3(), draw: [mouseCord] });
  root.add(mouseCordG);
  const kbCord = cord([[-34, 4, 85], [-34, 2.4, 80], [-36, 0.9, 74], [-38, 0.9, 63]], 0.75, 40);
  const kbCordG = new THREE.Group();
  kbCordG.add(kbCord);
  parts.push({ object: kbCordG, start: 0.77, dur: 0.06, from: new THREE.Vector3(), draw: [kbCord] });
  root.add(kbCordG);

  root.traverse((o) => {
    if (o.isMesh) o.frustumCulled = false;
  });
  return { root, parts, screen: { page, glow, glass } };
}

// small room used only to bake an environment map
function buildEnvScene() {
  const s = new THREE.Scene();
  const geo = new THREE.BoxGeometry();
  geo.deleteAttribute("uv");
  const room = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ side: THREE.BackSide }));
  room.position.set(-0.76, 13.2, 0.72);
  room.scale.set(31.7, 28.3, 28.6);
  s.add(room);
  const spot = new THREE.SpotLight(0xffffff, 900, 28, 2);
  spot.position.set(0.42, 16.2, 0.3);
  s.add(spot);
  const panel = (intensity, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
    m.material.color.setScalar(0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: intensity });
    m.material = mat;
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    s.add(m);
  };
  panel(50, -16.1, 14.4, 8.2, 0.1, 2.4, 2.7);
  panel(50, -16.1, 18, -8.2, 0.1, 2.4, 2.75);
  panel(17, 14.9, 12.2, -1.8, 0.15, 4.3, 6.3);
  panel(43, -0.46, 8.9, 14.5, 4.4, 5.4, 0.09);
  panel(20, 3.2, 11.5, -12.5, 2.5, 2, 0.1);
  panel(100, 0, 20, 0, 1, 0.1, 1);
  return s;
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
  const s = Math.min(w / vw, h / vh) === w / vw ? w / vw : h / vh;
  const k = s;
  const ox = (w - vw * k) / 2;
  const oy = (h - vh * k) / 2;
  const X = (v) => ox + v * k;
  const Y = (v) => oy + v * k;
  ctx.fillStyle = cs.getPropertyValue("--dot").trim() || "#121418";
  const step = 16 * k;
  for (let y = (oy % step) - step; y < h; y += step)
    for (let x = (ox % step) - step; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x + 8 * k, y + 8 * k, Math.max(0.6, k), 0, 6.29);
      ctx.fill();
    }
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
      const txt = node.textContent;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(txt))) {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const b = range.getBoundingClientRect();
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
    const svg = p.querySelector("svg");
    if (svg) {
      const sb = svg.getBoundingClientRect();
      const vb = (svg.getAttribute("viewBox") || "0 0 24 24").split(/\s+/).map(Number);
      const sx = (sb.width / vb[2]) * k;
      ctx.save();
      ctx.translate(X(sb.left), Y(sb.top));
      ctx.scale(sx, sx);
      ctx.strokeStyle = getComputedStyle(svg).color;
      ctx.lineWidth = parseFloat(svg.getAttribute("stroke-width") || "1.8");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      svg.querySelectorAll("path").forEach((pa) => {
        try {
          ctx.stroke(new Path2D(pa.getAttribute("d")));
        } catch {}
      });
      ctx.restore();
    }
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
  return c;
}

export function run3D(overlay, { reduce, onStage, onDone }) {
  const debug = new URLSearchParams(location.search).has("introdebug");
  const isMobile = matchMedia("(max-width: 640px), (pointer: coarse)").matches;
  const docEl = document.documentElement;
  const canvas = document.createElement("canvas");
  canvas.className = "intro-3d";
  const vig = document.createElement("canvas");
  vig.className = "intro-vignette";
  vig.setAttribute("aria-hidden", "true");
  overlay.append(canvas, vig);

  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(new THREE.Color(BG), 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildEnvScene(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const key = new THREE.DirectionalLight("#fff4e8", 2.4);
  key.position.set(-170, 300, 260);
  key.castShadow = true;
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -220, right: 220, top: 220, bottom: -220, near: 50, far: 900 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.6;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight("#c9d6ea", 0.9);
  fill.position.set(240, 160, -260);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight("#cdd6e2", "#0b0c0e", 0.32));
  const screenLight = new THREE.RectAreaLight("#cfdbec", 0, SCREEN.w, SCREEN.h);
  screenLight.position.set(SCREEN.cx, SCREEN.cy, SCREEN.cz + 0.8);
  screenLight.lookAt(SCREEN.cx, SCREEN.cy, SCREEN.cz + 10);
  scene.add(screenLight);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const M = buildMaterials();
  const { root, parts, screen } = buildSet(M);
  scene.add(root);
  root.traverse((o) => {
    if (o.isMesh)
      for (const m of [o.material].flat()) if (!(m instanceof THREE.ShaderMaterial)) m.dithering = true;
  });
  const basePos = new Map();
  for (const p of parts) basePos.set(p.object, p.object.position.clone());

  const camera = new THREE.PerspectiveCamera(30, 1, 20, 3000);
  let camDist = 600;
  const camState = { tx: 0, ty: 0, tz: 0, az: 0, el: 0, ld: 0, vtx: 0, vty: 0, vtz: 0, vaz: 0, vel: 0, vld: 0 };
  const SPRING = { k: 24, c: 2 * Math.sqrt(24) };

  function vignette() {
    const w = innerWidth;
    const h = innerHeight;
    if (vig.width === w && vig.height === h) return;
    vig.width = w;
    vig.height = h;
    const ctx = vig.getContext("2d");
    const data = ctx.createImageData(w, h);
    const rx = 0.7 * w;
    const ry = 0.65 * h;
    for (let y = 0, i = 0; y < h; y++) {
      const ny = (y + 0.5 - h / 2) / ry;
      for (let x = 0; x < w; x++, i += 4) {
        const nx = (x + 0.5 - w / 2) / rx;
        const d = clamp01((Math.sqrt(nx * nx + ny * ny) - 0.4) / 0.6);
        data.data[i + 3] = Math.min(255, Math.floor(0.6 * d * 255 + Math.random()));
      }
    }
    ctx.putImageData(data, 0, 0);
  }

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer?.setSize(w, h);
    vignette();
    const half = THREE.MathUtils.degToRad(30) / 2;
    const across = Math.atan(Math.tan(half) * camera.aspect);
    camDist = 150 / Math.sin(Math.min(half, across));
  }

  function pathAt(t) {
    let i = 0;
    for (; i + 1 < CAM_PATH.length - 1 && CAM_PATH[i + 1][0] <= t; ) i++;
    const a = CAM_PATH[i];
    const b = CAM_PATH[Math.min(i + 1, CAM_PATH.length - 1)];
    const k = b[0] > a[0] ? smooth((t - a[0]) / (b[0] - a[0])) : 1;
    const lerp = (x, y) => x + (y - x) * k;
    return { tx: lerp(a[1][0], b[1][0]), ty: lerp(a[1][1], b[1][1]), tz: lerp(a[1][2], b[1][2]), az: lerp(a[2], b[2]), el: lerp(a[3], b[3]), ld: Math.log(lerp(a[4], b[4])) };
  }
  const holdPose = () => ({ tx: HOLD[0][0], ty: HOLD[0][1], tz: HOLD[0][2], az: HOLD[1], el: HOLD[2], ld: 0 });

  function applyCamera(s, dist = camDist * Math.exp(s.ld)) {
    const az = THREE.MathUtils.degToRad(s.az);
    const el = THREE.MathUtils.degToRad(s.el);
    camera.position.set(s.tx + dist * Math.cos(el) * Math.sin(az), s.ty + dist * Math.sin(el), s.tz + dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(s.tx, s.ty, s.tz);
    return dist;
  }
  function springStep(dt, target) {
    for (let t = dt; t > 1e-6; t -= 1 / 240) {
      const h = Math.min(t, 1 / 240);
      for (const k of ["tx", "ty", "tz", "az", "el", "ld"]) {
        const v = `v${k}`;
        camState[v] += (SPRING.k * (target[k] - camState[k]) - SPRING.c * camState[v]) * h;
        camState[k] += camState[v] * h;
      }
    }
  }

  // (no depth-of-field pass: its depth readback washes out on some drivers;
  //  the vignette canvas carries the same cinematic falloff)
  const composer = null;
  const bokeh = null;

  // assembly animation for one part at progress t
  function placePart(p, t) {
    const obj = p.object;
    if (p.shadow) {
      const m = p.shadow === true ? p.object : p.shadow;
      m.material.opacity = smooth(t) ** 2;
      const s = 1.4 - 0.4 * smooth(t);
      m.scale.set(s, s, 1);
      return;
    }
    if (p.draw) {
      for (const m of p.draw) {
        const n = m.geometry.index.count;
        m.geometry.setDrawRange(0, 6 * Math.round((easeOut(t) * n) / 6));
      }
      return;
    }
    obj.visible = t > 0;
    if (p.settle) {
      const { mesh, tilt, pitch = 0 } = p.settle;
      const mat = mesh.material;
      const base = basePos.get(obj);
      let lift = 0;
      let lean = 0;
      if (t < 1) {
        if (t < 0.64) {
          const r = t / 0.64;
          lift = p.from.y * (1 - r * r);
          lean = 1 - smooth(r);
        } else {
          const r = (t - 0.64) / 0.36;
          lift = 0.045 * p.from.y * Math.sin(Math.PI * r) * (1 - r);
          lean = -0.18 * Math.sin(Math.PI * r) * (1 - r);
        }
      }
      obj.position.set(base.x, base.y + lift, base.z);
      mesh.rotation.set(pitch + tilt[0] * lean, 0, tilt[1] * lean);
      const opacity = t >= 1 ? 1 : smooth(t / 0.5);
      const fading = opacity < 1;
      if (mat.transparent !== fading) {
        mat.transparent = fading;
        mat.depthWrite = !fading;
        mat.needsUpdate = true;
      }
      mat.opacity = opacity;
      mesh.castShadow = opacity > 0.6;
      return;
    }
    const eased = t >= 1
      ? 1
      : p.heavy
        ? (() => {
            if (t < 0.72) return (t / 0.72) ** 2;
            const r = (t - 0.72) / 0.28;
            return 1 - 0.035 * Math.sin(r * Math.PI) * (1 - 0.5 * r);
          })()
        : 1 + 1.9 * (t - 1) ** 3 + 0.9 * (t - 1) ** 2;
    obj.position.copy(basePos.get(obj)).addScaledVector(p.from, 1 - eased);
    if (p.heavy && t >= 0.72 && !obj.userData.landed) {
      obj.userData.landed = true;
      camState.vty -= Math.min(26, 0.09 * p.from.length());
    }
  }
  function placeAll(progress) {
    for (const p of parts) placePart(p, clamp01((progress - p.start) / p.dur));
  }

  // what the screen shows once the set has booted: the real page, cropped to fill
  function screenCrop() {
    const aspect = innerWidth / innerHeight;
    const w = SCREEN.w - 0.8 * SCREEN.r;
    const h = SCREEN.h - 0.8 * SCREEN.r;
    return aspect > w / h ? { w, h: w / aspect } : { w: h * aspect, h };
  }
  let pageImage = null;
  let pageReady = false;
  function paintBootScreen() {
    const crop = screenCrop();
    const k = (innerWidth / crop.w) * Math.min(2, devicePixelRatio || 1);
    const c = document.createElement("canvas");
    c.width = Math.round(SCREEN.w * k);
    c.height = Math.round(SCREEN.h * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, c.width, c.height);
    if (pageImage) {
      const sx = (c.width - crop.w * k) / 2;
      const sy = (c.height - crop.h * k) / 2;
      ctx.drawImage(pageImage, sx, sy, crop.w * k, crop.h * k);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    screen.page.material.map = tex;
    screen.page.material.needsUpdate = true;
  }

  // capture the page once fonts settle (bounded wait)
  let snapshotDone = false;
  Promise.race([
    Promise.all([
      "complete" === document.readyState ? Promise.resolve() : new Promise((r) => addEventListener("load", () => r(), { once: true })),
      document.fonts?.ready,
    ]),
    new Promise((r) => setTimeout(r, 8000)),
  ]).then(() => {
    snapshotDone = true;
    try {
      pageImage = buildPageCanvas(
        Math.round(innerWidth * Math.min(2, devicePixelRatio || 1)),
        Math.round(innerHeight * Math.min(2, devicePixelRatio || 1))
      );
    } catch {
      pageImage = null;
    }
    pageReady = true;
  });

  // ---- phase machine ----
  let phase = "load";
  let phaseT = 0;
  let loadWait = 0;
  let extraWait = 0;
  let zoomFrom = holdPose();
  const setPhase = (p) => {
    phase = p;
    phaseT = 0;
    overlay.dataset.phase = p;
    if (p === "boot") paintBootScreen();
    if (p === "zoom") zoomFrom = { tx: camState.tx, ty: camState.ty, tz: camState.tz, az: camState.az, el: camState.el, ld: camState.ld };
    if (p === "fade") {
      docEl.dataset.intro = "done";
      overlay.dataset.stage = "fade";
      onStage?.("fade");
    }
    if (p === "done") onDone?.();
  };

  const glowU = screen.glow.material.uniforms;
  const ndc = new THREE.Vector3();
  const bufSize = new THREE.Vector2();

  Object.assign(camState, reduce ? holdPose() : pathAt(0));
  resize();
  placeAll(reduce ? 1 : 0);
  addEventListener("resize", resize);
  overlay.dataset.mode = "3d";

  // warm up shaders for the first visible key
  const firstKey = parts.find((p) => p.settle);
  if (firstKey) {
    const mat = firstKey.settle.mesh.material;
    mat.transparent = true;
    firstKey.object.visible = true;
    renderer.compile(scene, camera);
    mat.transparent = false;
    mat.needsUpdate = true;
    firstKey.object.visible = false;
  }

  let raf = 0;
  let lastNow = 0;
  let progress = 0;

  function cleanup() {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
    setTimeout(() => {
      composer?.dispose();
      renderer.dispose();
      pmrem.dispose();
      canvas.remove();
      vig.remove();
    }, 600);
  }

  if (reduce) {
    // jump straight to the end state: page shown, brief fade
    placeAll(1);
    setPhase("fade");
    onStage?.("fade");
    setTimeout(() => {
      setPhase("done");
      cleanup();
    }, 500);
    return () => cleanup();
  }


  let slow = 0;
  let frames = 0;
  let adapted = false;
  const loop = (now) => {
    let dt = lastNow ? Math.min((now - lastNow) / 1000, 0.3) : 1 / 60;
    frames++;
    if (!adapted && frames > 8) {
      if (dt > 1 / 24) slow++;
      if (slow > 6) {
        adapted = true;
        renderer.setPixelRatio(0.6);
        resize();
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.map?.dispose();
        key.shadow.map = null;
      }
    }
    while (dt > 1e-6 && phase !== "done") {
      const h = Math.min(dt, 1 / 60);
      tickSub(h);
      dt -= h;
    }
    if (composer && phase !== "zoom" && phase !== "fade" && phase !== "done") composer.render();
    else if (phase !== "done") renderer.render(scene, camera);
    if (phase !== "done") raf = requestAnimationFrame(loop);
  };

  // per-frame logic shared by the loop (rendering handled by callers)
  function tickSub(dt) {
    phaseT += dt;
    glowU.uTime.value += dt;
    stepCameraAndPhases(dt);
  }
  // extract: everything in tick() except rendering and timing
  function stepCameraAndPhases(dt) {
    renderer.getDrawingBufferSize(bufSize);
    ndc.set(SCREEN.cx - SCREEN.w / 2, SCREEN.cy + SCREEN.h / 2, SCREEN.cz).project(camera);
    const x0 = ndc.x;
    const y0 = ndc.y;
    ndc.set(SCREEN.cx + SCREEN.w / 2, SCREEN.cy - SCREEN.h / 2, SCREEN.cz).project(camera);
    glowU.uPixels.value.set((Math.abs(ndc.x - x0) / 2) * bufSize.x, (Math.abs(ndc.y - y0) / 2) * bufSize.y);

    if (phase === "load") {
      loadWait += dt;
      const target = snapshotDone && loadWait >= 3.9 ? 1 : Math.min(0.94, (loadWait / 3.9) * 0.94);
      progress = reduce ? target : progress + (target - progress) * (1 - Math.exp(-dt / 0.16));
      placeAll(reduce ? 1 : progress);
      springStep(dt, reduce ? holdPose() : pathAt(progress));
      if (target === 1 && progress > 0.995) {
        placeAll(1);
        if (!pageReady) extraWait += dt;
        const h = holdPose();
        const settled =
          reduce ||
          (Math.abs(camState.ld) < 0.004 &&
            Math.abs(camState.az - h.az) < 0.2 &&
            Math.abs(camState.el - h.el) < 0.2 &&
            Math.abs(camState.tx - h.tx) + Math.abs(camState.ty - h.ty) + Math.abs(camState.tz - h.tz) < 1);
        if ((pageReady || extraWait > 2) && settled) setPhase("hold");
      }
    } else if (phase === "hold") {
      springStep(dt, holdPose());
      const t = clamp01(phaseT / 0.55);
      const s = Math.sin(t * Math.PI) * (1 - 0.4 * t);
      root.scale.set(1 + 0.004 * s, 1 - 0.012 * s, 1 + 0.004 * s);
      if (phaseT >= 0.6) {
        root.scale.set(1, 1, 1);
        setPhase("power");
      }
    } else if (phase === "power") {
      springStep(dt, holdPose());
      const t = phaseT;
      const sx = t < 0.14 ? easeOut(t / 0.14) : 1;
      const sy = t < 0.14 ? 0.012 : 0.012 + 0.988 * easeOut((t - 0.14) / 0.3);
      screen.glow.scale.set(sx, sy, 1);
      glowU.uOpacity.value = 1;
      glowU.uOpen.value = (sy - 0.012) / 0.988;
      glowU.uWarm.value = smooth(t / 0.62);
      screenLight.intensity = 26 * sx * Math.sqrt(sy);
      if (t >= 0.62) setPhase("boot");
    } else if (phase === "boot") {
      springStep(dt, holdPose());
      const t = smooth(phaseT / 0.45);
      screen.page.material.opacity = t;
      glowU.uOpacity.value = (1 - t) ** 1.6;
      screenLight.intensity = 26 - 19 * t;
      if (phaseT >= 0.75) setPhase("zoom");
    } else if (phase === "zoom") {
      const raw = clamp01(phaseT / 1.5);
      const a = raw < 0.5 ? 8 * raw ** 4 : 1 - (-2 * raw + 2) ** 4 / 2;
      const target = screenCrop().h / 2 / Math.tan(THREE.MathUtils.degToRad(30) / 2);
      const from = camDist * Math.exp(zoomFrom.ld);
      const lerp = (x, y) => x + (y - x) * a;
      applyCamera(
        { tx: lerp(zoomFrom.tx, SCREEN.cx), ty: lerp(zoomFrom.ty, SCREEN.cy), tz: lerp(zoomFrom.tz, SCREEN.cz), az: lerp(zoomFrom.az, 0), el: lerp(zoomFrom.el, 0), ld: 0 },
        Math.exp(Math.log(from) + (Math.log(target) - Math.log(from)) * a)
      );
      screen.glass.material.opacity = 0.22 * (1 - smooth(1.4 * a));
      vig.style.opacity = "0";
      if (phaseT >= 1.5) setPhase("fade");
    } else if (phase === "fade") {
      if (phaseT >= (reduce ? 0.3 : 0.45)) setPhase("done");
    }

    if (phase === "load" || phase === "hold" || phase === "power" || phase === "boot") {
      const dist = applyCamera(camState);
      const dof = clamp01(-camState.ld / 1.1);
      if (bokeh) {
        bokeh.uniforms.focus.value = dist;
        bokeh.uniforms.aperture.value = 6e-5 * dof;
      }
      vig.style.opacity = dof.toFixed(3);
    }
  }

  if (debug) {
    // deterministic stepper: window.__introStep(t) advances to absolute time t
    let t = 0;
    window.__introStep = (to, fixed = 1 / 60) => {
      while (t < to - 1e-6) {
        const h = Math.min(fixed, to - t);
        t += h;
        tickSub(h);
      }
      if (composer && phase !== "zoom" && phase !== "fade") composer.render();
      else renderer.render(scene, camera);
      return t;
    };
    window.__introPhases = () => phase;
    window.__scene = scene;
    window.__camera = camera;
    window.__renderer = renderer;
    return () => cleanup();
  }

  raf = requestAnimationFrame(loop);
  return cleanup;
}
