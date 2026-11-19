// Koi pond, rebuilt to match the reference site's behavior and look:
// spine-deformed procedural koi and fry over a GPU wave-field that bends the
// page's dot grid. Independently implemented from observed behavior.
import * as THREE from "three";

export function canRunPond() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

const WHITE = [0.9, 0.89, 0.86];
const ORANGE = [0.95, 0.46, 0.15];
const RED = [0.84, 0.24, 0.1];
const BLACK = [0.06, 0.06, 0.07];
const GOLD = [0.95, 0.71, 0.27];
const SILVER = [0.8, 0.81, 0.83];
const FRYC = [0.66, 0.7, 0.67];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const angNorm = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Body half-width profile along the fish (0 head .. 1 tail root).
function bodyProfile(t) {
  if (t < 0) return 0;
  if (t < 0.16) {
    const k = (0.16 - t) / 0.16;
    return 0.9 * Math.sqrt(Math.max(0, 1 - k * k));
  }
  if (t < 0.32) return 0.9 + 0.1 * Math.sin(((t - 0.16) / 0.16) * (Math.PI / 2));
  return Math.max(0.02, 1 - 0.86 * Math.pow((t - 0.32) / 0.54, 1.7));
}

const FISH_VERT = `
uniform vec4 uSpine[24];
uniform float uLength;
uniform float uZ;
uniform vec2 uFlap;
uniform vec4 uTail;
uniform vec3 uTailShape;
attribute vec3 aLocal;
attribute vec3 aNorm;
attribute vec2 aCoord;
attribute float aKind;
attribute vec3 aFin;
varying vec3 vN;
varying vec2 vCoord;
varying float vKind;
varying float vSheen;
void main() {
  vec3 loc = aLocal;
  vSheen = 0.0;
  if (aKind > 0.5 && aKind < 1.5) {
    // tail membrane: fan of rays from the tail root, spreading, curling and
    // carrying a travelling ripple
    float a = aFin.x;
    float rn = aFin.y;
    float aa = abs(a);
    float reach = uTailShape.x * (0.68 + 0.4 * sin(aa * 1.95)) * sqrt(max(0.0, 1.0 - pow(aa, 8.0)));
    float r = reach * rn;
    float wave = uTail.z - rn * 5.0 + a * 1.4;
    float th = a * uTailShape.z * uTail.y + uTail.x * rn * (0.55 + 0.45 * rn) + uTail.w * rn * rn * sin(wave);
    loc.x += cos(th) * r / uLength;
    loc.y += a * uTailShape.y + sin(th) * r;
    vSheen = cos(wave) * rn;
  } else if (aKind > 1.5 && aKind < 2.5) {
    // paired fins sculling about their root
    float sgn = aFin.z;
    float flap = sgn > 0.0 ? uFlap.x : uFlap.y;
    float phi = aFin.x + flap;
    float r = aFin.y * (0.86 + 0.14 * cos(flap * 2.0));
    loc.x += cos(phi) * r / uLength;
    loc.y += sgn * sin(phi) * r;
  }
  float f = clamp(loc.x, 0.0, 1.0) * 23.0;
  float fi = min(floor(f), 22.0);
  int i = int(fi);
  float t = f - fi;
  vec4 sa = uSpine[i];
  vec4 sb = uSpine[i + 1];
  vec2 T = normalize(mix(sa.zw, sb.zw, t));
  vec2 P = mix(sa.xy, sb.xy, t) - T * (loc.x - clamp(loc.x, 0.0, 1.0)) * uLength;
  vec2 N = vec2(-T.y, T.x);
  vN = vec3(-T * aNorm.x + N * aNorm.y, aNorm.z);
  vCoord = aCoord;
  vKind = aKind;
  gl_Position = projectionMatrix * viewMatrix * vec4(P + N * loc.y, uZ + loc.z, 1.0);
}`;

const FISH_FRAG = `
uniform vec3 uBase;
uniform vec4 uPatch[6];
uniform vec3 uPatchCol[6];
uniform float uSeed;
uniform float uClarity;
uniform float uLength;
uniform float uWidth;
uniform float uSheen;
uniform float uBack;
uniform float uEye;
uniform vec3 uTailRoot;
uniform vec3 uWater;
varying vec3 vN;
varying vec2 vCoord;
varying float vKind;
varying float vSheen;
const vec3 L = vec3(-0.46, 0.56, 0.69);
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec2 c = vCoord;
  if (vKind < 0.5) {
    // body coat: base colour, ragged patches, a fine scale net, eyes, lighting
    vec3 col = uBase;
    col = mix(col * 0.5, col, mix(1.0, smoothstep(0.05, 0.65, abs(c.y)), uBack));
    for (int i = 0; i < 6; i++) {
      vec4 p = uPatch[i];
      if (p.z <= 0.0) continue;
      vec2 d = vec2((c.x - p.x) / p.z, (c.y - p.y) / p.w);
      float n = 0.5 * noise(c * vec2(16.0, 4.0) + uSeed + float(i) * 7.0) + 0.3 * noise(c * vec2(42.0, 10.0) + uSeed * 1.7);
      float m = smoothstep(0.06, -0.06, dot(d, d) - (0.62 + n));
      col = mix(col, uPatchCol[i], m);
    }
    float k = uLength * 0.42;
    float sa = sin(c.x * k + c.y * 7.0);
    float sb = sin(c.x * k - c.y * 7.0);
    float onA = 1.0 - smoothstep(0.0, 1.0, abs(sa) / max(fwidth(sa), 1e-4));
    float onB = 1.0 - smoothstep(0.0, 1.0, abs(sb) / max(fwidth(sb), 1e-4));
    float fine = 1.0 - smoothstep(0.35, 0.9, fwidth(c.x * k));
    col *= 1.0 - 0.1 * max(onA, onB) * fine * smoothstep(0.14, 0.24, c.x);
    vec2 e = vec2((c.x - 0.075) * uLength, (abs(c.y) - 0.72) * uWidth);
    float eye = 1.0 - smoothstep(uWidth * uEye * 0.8, uWidth * uEye, length(e));
    col = mix(col, vec3(0.02), eye);
    vec3 n = normalize(vN);
    vec3 h = normalize(L + vec3(0.0, 0.0, 1.0));
    float dif = 0.4 + 0.6 * max(dot(n, L), 0.0);
    float spec = pow(max(dot(n, h), 0.0), 26.0) * uSheen;
    vec3 lit = col * dif + spec * vec3(1.0, 0.98, 0.95) + eye * pow(max(dot(n, h), 0.0), 60.0) * 0.8;
    lit *= 0.55 + 0.45 * n.z;
    gl_FragColor = vec4(mix(uWater, lit, uClarity), 1.0);
  } else if (vKind < 1.5) {
    // tail membrane: rays dense at the root, fraying translucent edge
    float rn = c.x;
    float a = c.y;
    float x = a * 9.0;
    float fw = fwidth(x);
    float dRay = abs(fract(x + 0.5) - 0.5);
    float ray = (1.0 - smoothstep(0.045, 0.045 + fw, dRay)) * (1.0 - smoothstep(0.22, 0.45, fw)) * smoothstep(90.0, 160.0, uLength);
    float fray = noise(vec2(a * 40.0, uSeed)) * 0.06 + noise(vec2(a * 110.0, uSeed * 1.3)) * 0.03;
    float limit = 1.0 - fray * 0.6 - 0.008 * (1.0 - ray);
    float ew = max(fwidth(rn) * 1.5, 0.015);
    float edge = 1.0 - smoothstep(limit - ew, limit, rn);
    float grow = smoothstep(0.0, 0.16, rn);
    float alpha = (mix(0.74, 0.36, smoothstep(0.0, 0.95, rn)) + 0.14 * ray) * grow * edge;
    float away = smoothstep(0.05, 0.75, rn);
    vec3 col = mix(uTailRoot, vec3(0.86, 0.9, 0.94), away * 0.8);
    col = mix(col, uTailRoot * 0.9 + 0.08, ray * 0.3 * (1.0 - away * 0.4));
    col *= 0.95 + 0.07 * sin(x * 6.2832);
    col *= 0.8 + 0.28 * (1.0 - rn);
    col += vec3(1.0, 0.98, 0.95) * pow(max(vSheen, 0.0), 3.0) * 0.4 * uSheen;
    alpha *= mix(0.6, 1.0, uClarity);
    col = mix(uWater, col, uClarity);
    gl_FragColor = vec4(col * alpha, alpha);
  } else {
    // fins: thin translucent sheets ribbed with rays
    float t = c.x;
    float u = c.y;
    float a;
    vec3 fc = mix(uBase, vec3(0.95), 0.35);
    if (vKind < 2.5) {
      a = 0.46 * (0.72 + 0.28 * sin(u * 22.0)) * (1.0 - smoothstep(0.8, 1.0, t)) * (1.0 - smoothstep(0.8, 1.0, abs(u)));
    } else {
      fc *= 0.55;
      a = 0.6 * (1.0 - smoothstep(0.5, 1.0, abs(u))) * smoothstep(0.0, 0.15, t) * (1.0 - smoothstep(0.85, 1.0, t));
    }
    a *= mix(0.6, 1.0, uClarity);
    vec3 col = mix(uWater, fc * 0.85, uClarity);
    gl_FragColor = vec4(col * a, a);
  }
}`;

const QUAD_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// wave field: r is height, g is velocity, advanced a few substeps per frame
const WATER_SIM_FRAG = `
uniform sampler2D tPrev;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform vec4 uDrops[24];
uniform int uCount;
varying vec2 vUv;
void main() {
  vec4 info = texture2D(tPrev, vUv);
  vec2 px = vUv * uSize;
  for (int i = 0; i < 24; i++) {
    if (i >= uCount) break;
    vec4 d = uDrops[i];
    float k = max(0.0, 1.0 - length(px - d.xy) / d.z);
    info.r += (0.5 - cos(k * 3.14159) * 0.5) * d.w;
  }
  float avg = (
    texture2D(tPrev, vUv - vec2(uTexel.x, 0.0)).r +
    texture2D(tPrev, vUv + vec2(uTexel.x, 0.0)).r +
    texture2D(tPrev, vUv - vec2(0.0, uTexel.y)).r +
    texture2D(tPrev, vUv + vec2(0.0, uTexel.y)).r
  ) * 0.25;
  info.g += (avg - info.r) * 2.0;
  info.g *= 0.994;
  info.r += info.g;
  info.r *= 0.999;
  gl_FragColor = info;
}`;

// final pass: the page's dot grid on the pond floor, the rendered fish, both
// bent by the water gradient, with light gathering under the crests
const COMPOSITE_FRAG = `
uniform sampler2D tFish;
uniform sampler2D tWater;
uniform vec2 uRes;
uniform vec2 uTexel;
uniform float uDpr;
uniform float uColumn;
uniform vec3 uBg;
uniform vec3 uDot;
varying vec2 vUv;
void main() {
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float h = texture2D(tWater, vUv).r;
  float hl = texture2D(tWater, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture2D(tWater, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture2D(tWater, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture2D(tWater, vUv + vec2(0.0, uTexel.y)).r;
  vec2 g = vec2(hr - hl, hu - hd);
  vec2 off = g * 18.0;
  vec2 q = px + vec2(off.x, -off.y) * 0.7;
  vec2 m = mod(q, 16.0) - 8.0;
  float aa = 0.6 / uDpr;
  vec3 col = mix(uBg, uDot, 1.0 - smoothstep(1.0 - aa, 1.0 + aa, length(m)));
  vec4 fish = texture2D(tFish, vUv + off / uRes);
  float lap = hl + hr + hu + hd - 4.0 * h;
  fish.rgb *= 1.0 + clamp(-lap * 6.0, -0.15, 0.4);
  float colm = 1.0 - smoothstep(uColumn, uColumn + 170.0, abs(px.x - uRes.x * 0.5));
  fish *= 1.0 - 0.48 * colm;
  col = col * (1.0 - fish.a) + fish.rgb;
  float band = dot(g, vec2(-0.55, 0.835));
  col += vec3(0.6, 0.66, 0.75) * clamp(band * 0.9, 0.0, 0.16);
  col *= 1.0 - clamp(-band * 0.7, 0.0, 0.22);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------------- geometry ---------------- */

class GeoBuilder {
  constructor() {
    this.local = [];
    this.norm = [];
    this.coord = [];
    this.kind = [];
    this.fin = [];
    this.index = [];
  }
  v(local, norm, coord, kind, fin = [0, 0, 0]) {
    this.local.push(...local);
    this.norm.push(...norm);
    this.coord.push(...coord);
    this.kind.push(kind);
    this.fin.push(...fin);
    return this.kind.length - 1;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.local, 3));
    g.setAttribute("aLocal", new THREE.Float32BufferAttribute(this.local, 3));
    g.setAttribute("aNorm", new THREE.Float32BufferAttribute(this.norm, 3));
    g.setAttribute("aCoord", new THREE.Float32BufferAttribute(this.coord, 2));
    g.setAttribute("aKind", new THREE.Float32BufferAttribute(this.kind, 1));
    g.setAttribute("aFin", new THREE.Float32BufferAttribute(this.fin, 3));
    g.setIndex(this.index);
    return g;
  }
}

// body tube: rings along the length, elliptical cross section
function buildBody(len, wid, hei, segs, around) {
  const b = new GeoBuilder();
  for (let i = 0; i <= segs; i++) {
    const x = 0.86 * Math.pow(1 - Math.cos((i / segs) * (Math.PI / 2)), 0.85);
    const w = Math.max(0.3, wid * bodyProfile(x));
    const h = Math.max(0.3, hei * bodyProfile(x));
    const slope = ((bodyProfile(x + 0.004) - bodyProfile(x - 0.004)) / 0.008) * (wid / len);
    for (let j = 0; j <= around; j++) {
      const a = (Math.PI * j) / around;
      const cy = Math.cos(a) * h;
      const sy = Math.sin(a) * w;
      const l = Math.hypot(cy, sy) || 1;
      const n = [-0.8 * slope, cy / l, sy / l];
      const f = Math.hypot(...n);
      b.v([x, Math.cos(a) * w, Math.sin(a) * h], [n[0] / f, n[1] / f, n[2] / f], [x, Math.cos(a)], 0);
    }
  }
  for (let i = 0; i < segs; i++)
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j;
      const c = a + around + 1;
      b.index.push(a, c, a + 1, a + 1, c, c + 1);
    }
  return b;
}

function buildTail(b) {
  const base = b.kind.length;
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * 2 - 1;
    for (let j = 0; j <= 16; j++) {
      const rn = j / 16;
      b.v([0.8, 0, -1], [0, 0, 1], [rn, a], 1, [a, rn, 0]);
    }
  }
  for (let i = 0; i < 28; i++)
    for (let j = 0; j < 16; j++) {
      const o = base + 17 * i + j;
      const p = o + 17;
      b.index.push(o, p, o + 1, o + 1, p, p + 1);
    }
}

// a paired fin: arc of rays sweeping from phi0 to phi1, length len
function buildFin(b, atX, wid, hei, len, phi0, phi1) {
  for (const n of [-1, 1]) {
    const root = [atX, n * wid * bodyProfile(atX) * 0.82, -2];
    const s = b.v(root, [0, 0, 1], [0, 0], 2, [0, 0, n]);
    const outer = [];
    const mid = [];
    for (let i = 0; i <= 10; i++) {
      const a = i / 10;
      const phi = phi0 + (phi1 - phi0) * a;
      const r = len * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, 1.15 * a)));
      outer.push(b.v(root, [0, 0, 1], [1, 2 * a - 1], 2, [phi, r, n]));
      mid.push(b.v(root, [0, 0, 1], [0.5, 2 * a - 1], 2, [phi, 0.5 * r, n]));
    }
    for (let i = 0; i < 10; i++) {
      b.index.push(s, mid[i], mid[i + 1], mid[i], outer[i], mid[i + 1], mid[i + 1], outer[i], outer[i + 1]);
    }
  }
}

// dorsal fin: low ridge along the back
function buildDorsal(b, wid, hei) {
  const base = b.kind.length;
  for (let i = 0; i <= 12; i++) {
    const o = i / 12;
    const x = 0.3 + 0.36 * o;
    for (const n of [-1, 1]) b.v([x, n * wid * 0.07, hei * bodyProfile(x) + 1.2], [0, 0, 1], [o, n], 3);
  }
  for (let i = 0; i < 12; i++) {
    const a = base + 2 * i;
    b.index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
}

/* ---------------- fish factory ---------------- */

const TAIL_LEN = { koi: 0.3, fry: 0.25 };
const SWIM = {
  koi: { turn: 1.1, meander: 1, vb: [24, 40], glide: [1.6, 3.4], stroke: [1.8, 4], burst: 7, react: 1600, R: 360, amp: 0.045, beat: 0.45, beatK: 1 / 75, edge: 0.35, band: 260, bend: 0.4 },
  fry: { turn: 3.4, meander: 2.4, vb: [42, 64], glide: [0.3, 1], stroke: [0.4, 1.3], burst: 6, react: 3200, R: 440, amp: 0.075, beat: 1.4, beatK: 1 / 28, edge: 0.15, band: 130, bend: 0.6 },
};

// coat archetypes, picked by a single roll
function pickCoat() {
  const patches = [];
  const add = (count, color, s0, s1, rs, ra) => {
    for (let i = 0; i < count && patches.length < 6; i++)
      patches.push({ s: rand(s0, s1), a: rand(-0.4, 0.4), rs: rand(rs[0], rs[1]), ra: rand(ra[0], ra[1]), c: color });
  };
  const T = Math.random();
  if (T < 0.3) {
    add(Math.round(rand(2, 4)), Math.random() < 0.6 ? RED : ORANGE, 0.06, 0.72, [0.07, 0.14], [0.6, 1.4]);
    return { base: WHITE, patches, sheen: 0.32 };
  }
  if (T < 0.42) {
    patches.push({ s: 0.1, a: 0, rs: 0.055, ra: 0.45, c: RED });
    return { base: WHITE, patches, sheen: 0.32 };
  }
  if (T < 0.62) {
    add(Math.round(rand(2, 3)), ORANGE, 0.08, 0.7, [0.07, 0.13], [0.6, 1.3]);
    add(Math.round(rand(2, 3)), BLACK, 0.22, 0.78, [0.025, 0.05], [0.25, 0.45]);
    return { base: WHITE, patches, sheen: 0.32 };
  }
  if (T < 0.76) {
    add(Math.round(rand(0, 2)), WHITE, 0.3, 0.75, [0.05, 0.1], [0.4, 0.9]);
    return { base: ORANGE, patches, sheen: 0.38 };
  }
  if (T < 0.86) return { base: GOLD, patches, sheen: 0.6 };
  if (T < 0.94) {
    add(2, WHITE, 0.1, 0.7, [0.07, 0.12], [0.6, 1.2]);
    add(2, RED, 0.05, 0.6, [0.05, 0.1], [0.5, 1]);
    return { base: BLACK, patches, sheen: 0.45 };
  }
  return { base: SILVER, patches, sheen: 0.7 };
}

function makeFish(kind, x, y, angle, scale, waterColor) {
  const cfg = SWIM[kind];
  const depth = kind === "koi" ? Math.random() : 1;
  const L = kind === "koi" ? rand(188, 272) * scale * (0.86 + 0.2 * depth) : rand(20, 29) * Math.max(0.8, scale);
  const W = L * (kind === "koi" ? 0.145 : 0.12);
  const H = W * (kind === "koi" ? 0.85 : 0.8);
  const coat = kind === "koi" ? pickCoat() : { base: FRYC, patches: [], sheen: 0.75 };

  const body = buildBody(L, W, H, kind === "koi" ? 40 : 16, kind === "koi" ? 16 : 8);
  const appendages = new GeoBuilder();
  buildTail(appendages);
  if (kind === "koi") {
    buildFin(appendages, 0.22, W, H, 0.15 * L, 0.32, 1.25);
    buildFin(appendages, 0.5, W, H, 0.075 * L, 0.25, 0.85);
    buildDorsal(appendages, W, H);
  } else {
    buildFin(appendages, 0.24, W, H, 0.1 * L, 0.4, 1.1);
  }

  const patchU = Array.from({ length: 6 }, (_, i) => {
    const p = coat.patches[i];
    return p ? new THREE.Vector4(p.s, p.a, p.rs, p.ra) : new THREE.Vector4(0, 0, 0, 0);
  });
  const patchColU = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(...(coat.patches[i]?.c ?? WHITE)));
  const uniforms = {
    uSpine: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) },
    uLength: { value: L },
    uWidth: { value: W },
    uZ: { value: 0 },
    uFlap: { value: new THREE.Vector2() },
    uBase: { value: new THREE.Vector3(...coat.base) },
    uPatch: { value: patchU },
    uPatchCol: { value: patchColU },
    uSeed: { value: rand(0, 100) },
    uClarity: { value: kind === "koi" ? 0.5 + 0.38 * depth : rand(0.62, 0.8) },
    uSheen: { value: coat.sheen },
    uBack: { value: kind === "fry" ? 1 : 0 },
    uEye: { value: kind === "fry" ? 0.2 : 0.12 },
    uTail: { value: new THREE.Vector4(0, 1, rand(0, 6.28), 0.05) },
    uTailShape: { value: new THREE.Vector3(L * TAIL_LEN[kind], W * bodyProfile(0.8) * 0.9, 0.6) },
    uTailRoot: { value: new THREE.Vector3(...(coat.patches.find((p) => Math.abs(p.s - 0.76) < 1.4 * p.rs)?.c ?? coat.base)) },
    uWater: { value: waterColor },
  };
  const bodyMesh = new THREE.Mesh(
    body.build(),
    new THREE.ShaderMaterial({ vertexShader: FISH_VERT, fragmentShader: FISH_FRAG, uniforms })
  );
  const appMesh = new THREE.Mesh(
    appendages.build(),
    new THREE.ShaderMaterial({
      vertexShader: FISH_VERT,
      fragmentShader: FISH_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    })
  );
  bodyMesh.frustumCulled = false;
  appMesh.frustumCulled = false;

  const seg = L / 23;
  const spine = new Float32Array(48);
  for (let i = 0; i < 24; i++) {
    spine[2 * i] = x - Math.cos(angle) * seg * i;
    spine[2 * i + 1] = y - Math.sin(angle) * seg * i;
  }
  const baseSpeed = rand(cfg.vb[0], cfg.vb[1]) * (0.8 + 0.2 * scale);
  return {
    kind,
    L,
    W,
    depth,
    seg,
    p: spine,
    a: angle,
    v: baseSpeed,
    vb: baseSpeed,
    beat: rand(0, 6.28),
    amp: cfg.amp,
    flap: rand(0, 6.28),
    wander: [rand(0.05, 0.09) * cfg.meander, rand(0, 6.28), rand(0.13, 0.2) * cfg.meander, rand(0, 6.28), rand(0.27, 0.4) * cfg.meander, rand(0, 6.28)],
    gliding: false,
    rhythm: rand(0.5, 2),
    startle: 0,
    boost: 0.2,
    flee: 0,
    pending: null,
    travel: 0,
    tail: { bend: 0, bendV: 0, spread: 1, phase: rand(0, 6.28), lat: NaN },
    uniforms,
    meshes: [bodyMesh, appMesh],
  };
}

/* ---------------- pond ---------------- */

function cssColor(name, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const m = raw.match(/#(..)(..)(..)/);
  if (!m) return new THREE.Vector3(0.024, 0.031, 0.043);
  return new THREE.Vector3(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
}

export function mountPond(canvas) {
  const docEl = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
  renderer.autoClear = false;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  let C = innerWidth;
  let P = innerHeight;

  const fishScene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, C, 0, -P, 1, 5000);
  cam.position.z = 2500;

  const fishRT = new THREE.WebGLRenderTarget(1, 1, { samples: 4 });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false };
  let simA = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  let simB = new THREE.WebGLRenderTarget(1, 1, rtOpts);
  const simMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: WATER_SIM_FRAG,
    uniforms: {
      tPrev: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uSize: { value: new THREE.Vector2() },
      uDrops: { value: Array.from({ length: 24 }, () => new THREE.Vector4()) },
      uCount: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
  const simScene = new THREE.Scene();
  simScene.add(new THREE.Mesh(quadGeo, simMat));

  const bgCol = cssColor("--bg", "#06080b");
  const dotCol = cssColor("--dot", "#121418");
  const compMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      tFish: { value: fishRT.texture },
      tWater: { value: simA.texture },
      uRes: { value: new THREE.Vector2() },
      uTexel: { value: new THREE.Vector2() },
      uDpr: { value: dpr },
      uColumn: { value: 280 },
      uBg: { value: bgCol },
      uDot: { value: dotCol },
    },
    depthTest: false,
    depthWrite: false,
  });
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(quadGeo, compMat));

  function fit() {
    C = innerWidth;
    P = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(C, P, false);
    cam.right = C;
    cam.bottom = -P;
    cam.updateProjectionMatrix();
    fishRT.setSize(Math.round(C * dpr), Math.round(P * dpr));
    const sw = Math.ceil(C / 3);
    const sh = Math.ceil(P / 3);
    simA.dispose();
    simB.dispose();
    simA = new THREE.WebGLRenderTarget(sw, sh, rtOpts);
    simB = new THREE.WebGLRenderTarget(sw, sh, rtOpts);
    for (const rt of [simA, simB]) {
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0, 0);
      renderer.clear();
    }
    renderer.setRenderTarget(null);
    simMat.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    simMat.uniforms.uSize.value.set(C, P);
    compMat.uniforms.uTexel.value.set(1 / sw, 1 / sh);
    compMat.uniforms.uRes.value.set(C, P);
    compMat.uniforms.uDpr.value = dpr;
    compMat.uniforms.uColumn.value = Math.min(560, C - 32) / 2;
  }

  const all = [];
  const koi = [];
  const fry = [];
  const leader = { x: 0, y: 0, a: rand(0, 6.28), w: [rand(0, 6.28), rand(0, 6.28)] };

  // queued water drops (x, y, radius, strength), flushed into the sim each frame
  const dropQueue = [];
  const drop = (x, y, r, s) => {
    if (dropQueue.length < 96) dropQueue.push(x, y, r, s);
  };
  // delayed drops (surface events)
  const pending = [];

  let clock = 0;
  const pointer = { x: -1e4, y: -1e4, still: 0, mouse: false };

  function steer(f, dt) {
    const cfg = SWIM[f.kind];
    const hx = f.p[0];
    const hy = f.p[1];
    if (f.pending && clock >= f.pending.at) {
      f.flee = f.pending.dir;
      f.startle = Math.max(f.startle, f.pending.strength);
      f.boost = Math.max(f.boost, f.pending.strength);
      f.gliding = false;
      f.rhythm = rand(1, 2);
      f.pending = null;
    }
    let ix = Math.cos(f.a);
    let iy = Math.sin(f.a);
    const lim = -f.L * cfg.edge;
    const wall = (d) => {
      const t = clamp01((cfg.band - d) / cfg.band);
      return t * t * 2.4;
    };
    ix += wall(hx - lim) - wall(C - lim - hx);
    iy += wall(hy - lim) - wall(P - lim - hy);
    if (f.kind === "koi") {
      for (const o of koi) {
        if (o === f) continue;
        const dz = 0.35 + 0.65 * (1 - Math.abs(o.depth - f.depth));
        const R = 3.6 * Math.max(f.W, o.W);
        for (let i = 0; i < 24; i += 3) {
          const dx = hx - o.p[2 * i];
          const dy = hy - o.p[2 * i + 1];
          const d = Math.hypot(dx, dy);
          if (d > 1 && d < R) {
            const s = (1 - d / R) ** 2 * 2.4 * dz;
            ix += (dx / d) * s;
            iy += (dy / d) * s;
          }
        }
      }
      if (pointer.mouse && pointer.still > 1.2 && f.startle < 0.05) {
        const dx = pointer.x - hx;
        const dy = pointer.y - hy;
        const d = Math.hypot(dx, dy);
        if (d < 440 && d > 0.2 * f.L) {
          const s = 0.55 * (1 - d / 440) * clamp01((pointer.still - 1.2) / 1.5);
          ix += (dx / d) * s;
          iy += (dy / d) * s;
        }
      }
    } else {
      let cx = 0, cy = 0, ax = 0, ay = 0, n = 0;
      for (const o of fry) {
        if (o === f) continue;
        const dx = o.p[0] - hx;
        const dy = o.p[1] - hy;
        const d = Math.hypot(dx, dy);
        if (d > 150) continue;
        cx += dx;
        cy += dy;
        ax += Math.cos(o.a);
        ay += Math.sin(o.a);
        n++;
        if (d < 24 && d > 0.01) {
          ix -= (dx / d) * ((24 - d) / 24) * 3;
          iy -= (dy / d) * ((24 - d) / 24) * 3;
        }
      }
      if (n) {
        ix += (cx / n / 150) * 1.4 + (ax / n) * 0.9;
        iy += (cy / n / 150) * 1.4 + (ay / n) * 0.9;
      }
      const lx = leader.x - hx;
      const ly = leader.y - hy;
      const ld = Math.hypot(lx, ly) || 1;
      ix += (lx / ld) * 0.45;
      iy += (ly / ld) * 0.45;
      for (const o of koi)
        for (let i = 0; i < 24; i += 3) {
          const dx = hx - o.p[2 * i];
          const dy = hy - o.p[2 * i + 1];
          const d = Math.hypot(dx, dy);
          const R = 2.4 * o.W;
          if (d > 0.01 && d < R) {
            ix += (dx / d) * (1 - d / R) * 3;
            iy += (dy / d) * (1 - d / R) * 3;
          }
        }
    }
    if (f.startle > 0.02) {
      ix += 7 * Math.cos(f.flee) * f.startle;
      iy += 7 * Math.sin(f.flee) * f.startle;
    }
    const w = f.wander;
    const meander = 0.42 * Math.sin(clock * w[0] * 6.28 + w[1]) + 0.26 * Math.sin(clock * w[2] * 6.28 + w[3]) + 0.12 * Math.sin(clock * w[4] * 6.28 + w[5]);
    const maxTurn = cfg.turn + 9 * f.startle;
    let turn = meander * (f.kind === "fry" ? 1.4 : 1) * (1 - f.startle) + angNorm(Math.atan2(iy, ix) - f.a) * (1.6 + 6 * f.startle);
    turn = Math.max(-maxTurn, Math.min(maxTurn, turn));
    f.a = angNorm(f.a + turn * dt);
    f.rhythm -= dt;
    if (f.rhythm <= 0) {
      f.gliding = !f.gliding;
      f.rhythm = f.gliding ? rand(cfg.glide[0], cfg.glide[1]) : rand(cfg.stroke[0], cfg.stroke[1]);
    }
    const want = f.vb * ((f.gliding ? 0.55 : 1.15) + cfg.burst * f.boost);
    f.v += (want - f.v) * (1 - Math.exp(-dt / (want > f.v ? (f.boost > 0.1 ? 0.07 : 0.28) : 1.5)));
    const wantAmp = f.gliding && f.boost < 0.05 ? 0.3 * cfg.amp : cfg.amp + 0.07 * f.boost;
    f.amp += (wantAmp - f.amp) * (1 - Math.exp(-dt / 0.4));
    f.beat += 6.28 * dt * (cfg.beat + Math.min(f.v, 260) * cfg.beatK);
    f.flap += 6.28 * dt * (f.gliding ? 0.35 : 0.6) * (f.kind === "fry" ? 2 : 1);
    f.startle *= Math.exp(-dt / 0.9);
    f.boost *= Math.exp(-dt / 0.75);
    const step = f.v * dt;
    f.p[0] = hx + Math.cos(f.a) * step;
    f.p[1] = hy + Math.sin(f.a) * step;
    let heading = f.a;
    for (let i = 1; i < 24; i++) {
      const dx = f.p[(i - 1) * 2] - f.p[2 * i];
      let ang = Math.atan2(f.p[(i - 1) * 2 + 1] - f.p[2 * i + 1], dx);
      const dev = angNorm(ang - heading);
      if (dev > cfg.bend) ang = heading + cfg.bend;
      else if (dev < -cfg.bend) ang = heading - cfg.bend;
      f.p[2 * i] = f.p[(i - 1) * 2] - Math.cos(ang) * f.seg;
      f.p[2 * i + 1] = f.p[(i - 1) * 2 + 1] - Math.sin(ang) * f.seg;
      heading = ang;
    }
    if (f.kind === "koi" && f.depth > 0.45) {
      f.travel += step;
      if (f.travel > 22) {
        f.travel = 0;
        drop(f.p[0] - Math.cos(f.a) * f.L * 0.1, f.p[1] - Math.sin(f.a) * f.L * 0.1, 0.5 * f.W, 0.012 * (f.depth - 0.3) * Math.min(3, f.v / f.vb));
      }
    }
  }

  function startleAll(x, y, power) {
    for (const f of all) {
      const cfg = SWIM[f.kind];
      let best = Infinity;
      let bx = 0;
      let by = 0;
      for (let i = 0; i < 24; i += 2) {
        const dx = f.p[2 * i] - x;
        const dy = f.p[2 * i + 1] - y;
        const d = Math.hypot(dx, dy);
        if (d < best) [best, bx, by] = [d, f.p[2 * i], f.p[2 * i + 1]];
      }
      const R = cfg.R * power;
      if (best > 1.8 * R) continue;
      const strength = (best < R ? 0.55 + 0.45 * (1 - best / R) : 0.3 * (1 - (best - R) / (0.8 * R))) * Math.min(1, power + 0.2);
      let dir = Math.atan2(f.p[1] - y + (f.p[1] - by) * 0.5, f.p[0] - x + (f.p[0] - bx) * 0.5);
      dir += rand(-0.35, 0.35);
      if (!f.pending || f.pending.strength < strength) f.pending = { at: clock + 0.03 + best / cfg.react + rand(0, 0.05), dir, strength };
    }
    const away = Math.atan2(leader.y - y, leader.x - x);
    leader.x = Math.min(0.85 * C, Math.max(0.15 * C, x + 380 * Math.cos(away)));
    leader.y = Math.min(0.85 * P, Math.max(0.15 * P, y + 380 * Math.sin(away)));
  }

  const spineWork = new Float32Array(48);
  function updateUniforms(f, dt) {
    for (let i = 0; i < 24; i++) {
      const a = Math.min(i, 22);
      const tx = f.p[2 * a] - f.p[(a + 1) * 2];
      const ty = f.p[2 * a + 1] - f.p[(a + 1) * 2 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      const r = i / 23;
      const lat = f.L * f.amp * (Math.pow(r, 1.6) * Math.sin(f.beat - 5 * r) - 0.12 * (1 - r) * Math.sin(f.beat));
      spineWork[2 * i] = f.p[2 * i] - (ty / tl) * lat;
      spineWork[2 * i + 1] = f.p[2 * i + 1] + (tx / tl) * lat;
    }
    const sp = f.uniforms.uSpine.value;
    for (let i = 0; i < 24; i++) {
      const p0 = Math.max(0, i - 1);
      const p1 = Math.min(23, i + 1);
      const tx = spineWork[2 * p0] - spineWork[2 * p1];
      const ty = spineWork[2 * p0 + 1] - spineWork[2 * p1 + 1];
      const tl = Math.hypot(tx, ty) || 1;
      sp[i].set(spineWork[2 * i], -spineWork[2 * i + 1], tx / tl, -ty / tl);
    }
    f.uniforms.uFlap.value.set(0.3 * Math.sin(f.flap), 0.3 * Math.sin(f.flap + Math.PI));
    const tail = f.tail;
    const near = sp[Math.round(0.8 * 23)];
    const tip = sp[23];
    const lateral = -((tip.x - near.x) * near.w) + (tip.y - near.y) * near.z;
    if (dt > 0 && !Number.isNaN(tail.lat)) {
      const tl2 = f.L * TAIL_LEN[f.kind];
      const wantBend = Math.max(-0.7, Math.min(0.7, (-0.28 * (lateral - tail.lat)) / dt / tl2));
      tail.bendV += (70 * (wantBend - tail.bend) - 7 * tail.bendV) * dt;
      tail.bend += tail.bendV * dt;
      const ratio = f.v / f.vb;
      const wantSpread = f.boost > 0.15 ? 0.78 : f.gliding ? 1.08 : 1;
      tail.spread += (wantSpread - tail.spread) * (1 - Math.exp(-dt / 0.35));
      tail.phase += 6.283 * dt * (1.1 + 0.5 * Math.min(ratio, 4));
    }
    tail.lat = lateral;
    const ripple = 0.04 + 0.03 * Math.min(1, f.v / f.vb) + 0.05 * f.boost;
    f.uniforms.uTail.value.set(tail.bend, tail.spread, tail.phase, ripple);
  }

  function renderFrame(dt) {
    for (const f of all) updateUniforms(f, dt);
    renderer.setRenderTarget(fishRT);
    renderer.setClearColor(0, 0);
    renderer.clear();
    renderer.render(fishScene, cam);
    renderer.setRenderTarget(null);
    compMat.uniforms.tWater.value = simA.texture;
    renderer.render(compScene, quadCam);
  }

  const introOn = () => docEl.dataset.intro === "on" || document.hidden;
  const interactive = () => introOn() ? false : docEl.dataset.project !== "open";

  // text protection: fish dim inside content zones (in addition to steering
  // clear of them handled by the column dim in the composite)
  let zones = [];
  let zoneAt = 0;
  const refreshZones = (now) => {
    if (now - zoneAt < 160) return;
    zoneAt = now;
    const out = [];
    const layer = document.querySelector(".intro-layer");
    const intro = document.querySelector(".intro");
    const lop = layer ? parseFloat(getComputedStyle(layer).opacity) : 1;
    if (intro && lop > 0.25) {
      const r = intro.getBoundingClientRect();
      out.push({ l: r.left - 24, r: r.right + 24, t: r.top - 10, b: r.bottom + 12 });
    }
    document.querySelectorAll(".card-meta, .slider, .contact, .card-eyebrow").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > 0 && r.left < innerWidth) out.push({ l: r.left - 12, r: r.right + 12, t: r.top - 8, b: r.bottom + (el.classList.contains("slider") ? 46 : 10) });
    });
    zones = out;
  };
  const inZone = (x, yScreen) => {
    for (const z of zones) if (x > z.l && x < z.r && yScreen > z.t && yScreen < z.b) return true;
    return false;
  };

  let nextFryRipple = rand(1.5, 3.5);
  let nextKoiEvent = rand(6, 11);
  let raf = 0;
  let lastNow = 0;

  function frame(now) {
    // when a case study is open, idle at ~30ms frames without interaction
    if ((!interactive() || docEl.dataset.sliding !== undefined) && lastNow && now - lastNow < 30) {
      raf = introOn() ? 0 : requestAnimationFrame(frame);
      return;
    }
    const dt = lastNow ? Math.min((now - lastNow) / 1000, 1 / 30) : 1 / 60;
    lastNow = now;
    clock += dt;
    if (pointer.mouse && interactive()) pointer.still += dt;
    // the fry school's roaming leader
    leader.a += dt * (0.5 * Math.sin(0.21 * clock + leader.w[0]) + 0.3 * Math.sin(0.53 * clock + leader.w[1]));
    let lx = Math.cos(leader.a);
    let ly = Math.sin(leader.a);
    if (leader.x < 0.15 * C) lx += 1.5;
    if (leader.x > 0.85 * C) lx -= 1.5;
    if (leader.y < 0.15 * P) ly += 1.5;
    if (leader.y > 0.85 * P) ly -= 1.5;
    leader.a = Math.atan2(ly, lx);
    leader.x += 46 * Math.cos(leader.a) * dt;
    leader.y += 46 * Math.sin(leader.a) * dt;

    for (const f of all) steer(f, dt);

    // ambient life: fry dimples, and now and then a shallow koi rolls at the surface
    nextFryRipple -= dt;
    if (nextFryRipple <= 0 && fry.length) {
      nextFryRipple = rand(1.2, 4);
      const f = fry[(Math.random() * fry.length) | 0];
      drop(f.p[0], f.p[1], 4, 0.22);
    }
    nextKoiEvent -= dt;
    if (nextKoiEvent <= 0 && koi.length) {
      nextKoiEvent = rand(7, 14);
      const f = [...koi].sort((a, b) => b.depth - a.depth)[(Math.random() * Math.min(2, koi.length)) | 0];
      const x = f.p[0] + 4 * Math.cos(f.a);
      const y = f.p[1] + 4 * Math.sin(f.a);
      drop(x, y, 8, 0.35);
      pending.push({ at: clock + 0.35, x, y, r: 7, s: 0.25 });
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      if (clock >= p.at) {
        drop(p.x, p.y, p.r, p.s);
        pending.splice(i, 1);
      }
    }

    // flush drops through the wave sim, 1-4 substeps
    const drops = simMat.uniforms.uDrops.value;
    const count = Math.min(24, dropQueue.length / 4);
    for (let i = 0; i < count; i++) drops[i].set(dropQueue[4 * i], P - dropQueue[4 * i + 1], dropQueue[4 * i + 2], dropQueue[4 * i + 3]);
    dropQueue.length = 0;
    const steps = Math.max(1, Math.min(4, Math.round(120 * dt)));
    for (let s = 0; s < steps; s++) {
      simMat.uniforms.uCount.value = s === 0 ? count : 0;
      simMat.uniforms.tPrev.value = simA.texture;
      renderer.setRenderTarget(simB);
      renderer.render(simScene, quadCam);
      const tmp = simA;
      simA = simB;
      simB = tmp;
    }
    renderer.setRenderTarget(null);

    // dim fish inside text zones toward the water colour
    refreshZones(now);
    for (const f of all) {
      if (f.baseClarity === undefined) f.baseClarity = f.uniforms.uClarity.value;
      const dim = inZone(f.p[0], f.p[1]) ? 0.35 : 1;
      const u = f.uniforms.uClarity;
      const target = f.baseClarity * dim;
      u.value += (target - u.value) * Math.min(1, dt * 6);
    }

    renderFrame(dt);
    raf = introOn() ? 0 : requestAnimationFrame(frame);
  }

  function maybeResume() {
    if (!reduced && !raf && !introOn()) {
      lastNow = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  let dragging = false;
  let dragX = 0;
  let dragY = 0;
  const onDown = (e) => {
    if (reduced || !interactive()) return;
    if (e.target instanceof Element && e.target.closest("a, button, [role='slider'], [data-card], .contact, .rs, .slider")) return;
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    const x = e.clientX;
    const y = e.clientY;
    drop(x, y, 20, 0.85);
    const a0 = rand(0, 6.28);
    for (let i = 0; i < 6; i++) {
      const a = a0 + (i / 6) * 6.28 + rand(-0.3, 0.3);
      const d = rand(28, 64);
      pending.push({ at: clock + rand(0.12, 0.32), x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, r: rand(4, 6), s: rand(0.18, 0.3) });
    }
    pending.push({ at: clock + 0.42, x, y, r: 9, s: 0.4 });
    startleAll(x, y, 1);
  };
  const onMove = (e) => {
    pointer.mouse = e.pointerType === "mouse";
    if (Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) > 3) pointer.still = 0;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!dragging || reduced || !interactive()) return;
    if (Math.hypot(e.clientX - dragX, e.clientY - dragY) > 14) {
      drop(e.clientX, e.clientY, 9, 0.28);
      startleAll(e.clientX, e.clientY, 0.45);
      dragX = e.clientX;
      dragY = e.clientY;
    }
  };
  const onUp = () => (dragging = false);
  const onLeave = () => (pointer.mouse = false);

  let resizeTimer = 0;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      fit();
      if (reduced) renderFrame(0);
    }, 120);
  };
  const onContextLost = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.removeAttribute("data-ready");
  };

  fit();

  // spawn
  (function spawn(randomPlace) {
    const scale = Math.min(1, Math.max(0.62, Math.min(C, 1.4 * P) / 1150));
    const nKoi = Math.round(Math.min(6, Math.max(3, (C * P) / 26e4)));
    const side = (4 * Math.random()) | 0;
    const edgePoint = (s, t, m) => [
      s === 0 ? -m : s === 1 ? C + m : (0.1 + 0.8 * t) * C,
      s === 2 ? -m : s === 3 ? P + m : (0.15 + 0.7 * t) * P,
    ];
    for (let i = 0; i < nKoi; i++) {
      const [x, y] = randomPlace
        ? [rand(0.1, 0.9) * C, rand(0.15, 0.85) * P]
        : edgePoint((side + i) % 4, (i + rand(0.2, 0.8)) / nKoi, rand(0, 90) + 30 * i);
      const a = randomPlace ? rand(-Math.PI, Math.PI) : Math.atan2(P * rand(0.3, 0.7) - y, C * rand(0.3, 0.7) - x);
      koi.push(makeFish("koi", x, y, a, scale, bgCol));
    }
    [...koi]
      .sort((a, b) => a.depth - b.depth)
      .forEach((f, i) => {
        f.uniforms.uZ.value = 100 + 140 * i;
        f.meshes.forEach((m) => (m.renderOrder = 2 * i + (m === f.meshes[1] ? 1 : 0)));
        fishScene.add(...f.meshes);
      });
    const nFry = C < 700 ? 9 : 15;
    const [sx, sy] = randomPlace ? [0.7 * C, 0.3 * P] : edgePoint((side + 2) % 4, rand(0.3, 0.7), 60);
    leader.x = C * rand(0.3, 0.7);
    leader.y = P * rand(0.3, 0.7);
    const toward = Math.atan2(leader.y - sy, leader.x - sx);
    for (let i = 0; i < nFry; i++) {
      const f = makeFish("fry", sx + rand(-70, 70), sy + rand(-70, 70), toward + rand(-0.3, 0.3), scale, bgCol);
      f.uniforms.uZ.value = 1220 + 10 * i;
      f.meshes.forEach((m) => (m.renderOrder = 100 + 2 * i + (m === f.meshes[1] ? 1 : 0)));
      fry.push(f);
      fishScene.add(...f.meshes);
    }
    all.push(...koi, ...fry);
  })(reduced);

  if (reduced) {
    for (let i = 0; i < 40; i++) for (const f of all) steer(f, 1 / 30);
    for (const f of all) f.amp = 0.4 * SWIM[f.kind].amp;
    renderFrame(0);
  }

  canvas.dataset.ready = "";
  docEl.setAttribute("data-water", "");
  const observer = new MutationObserver(maybeResume);
  observer.observe(docEl, { attributes: true, attributeFilter: ["data-intro", "data-project"] });
  document.addEventListener("visibilitychange", maybeResume);
  addEventListener("pointerdown", onDown, { passive: true, capture: true });
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerup", onUp, { passive: true });
  addEventListener("pointercancel", onUp, { passive: true });
  docEl.addEventListener("pointerleave", onLeave);
  addEventListener("resize", onResize);
  canvas.addEventListener("webglcontextlost", onContextLost);
  maybeResume();

  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    document.removeEventListener("visibilitychange", maybeResume);
    removeEventListener("pointerdown", onDown, { capture: true });
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerup", onUp);
    removeEventListener("pointercancel", onUp);
    docEl.removeEventListener("pointerleave", onLeave);
    removeEventListener("resize", onResize);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    docEl.removeAttribute("data-water");
    for (const f of all) for (const m of f.meshes) (m.geometry.dispose(), m.material.dispose());
    quadGeo.dispose();
    simMat.dispose();
    compMat.dispose();
    fishRT.dispose();
    simA.dispose();
    simB.dispose();
    renderer.dispose();
  };
}
