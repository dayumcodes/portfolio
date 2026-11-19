// Koi pond: procedural fish meshes bent along a spine in the vertex shader,
// plus a ripple height-field rendered as soft light rings. Original code.
import * as THREE from "three";

export function canRunPond() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2") && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const FISH_VERT = `
uniform float uTime, uPhase, uSpeed, uLen;
varying vec3 vN; varying vec2 vUv; varying float vT; varying float vFin;
attribute float aFin;
void main(){
  vec3 p = position;
  float t = clamp((p.x / uLen) + 0.5, 0.0, 1.0); // 0 tail .. 1 head
  float k = (1.0 - t);
  float amp = k * k * (0.07 + 0.16 * uSpeed) * uLen;
  float w = sin(uTime * (3.0 + 5.0 * uSpeed) + uPhase - t * 5.5);
  p.y += amp * w * (0.55 + 0.45 * k);
  // fins flutter a little on their own
  p.y += aFin * sin(uTime * 4.0 + uPhase + p.x * 0.08) * 0.06 * uLen * abs(p.z) * 0.0;
  vN = normalMatrix * normal;
  vUv = uv; vT = t; vFin = aFin;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FISH_FRAG = `
precision mediump float;
uniform vec3 uBase, uPatch, uDark; uniform float uSeed, uFade;
varying vec3 vN; varying vec2 vUv; varying float vT; varying float vFin;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec3 N = normalize(vN);
  float across = abs(vUv.y - 0.5) * 2.0;
  float field = n(vec2(vT * 4.0 + uSeed, vUv.y * 2.2 + uSeed * 1.7)) * 0.65 + n(vec2(vT * 9.0 + uSeed * 3.0, vUv.y * 5.0)) * 0.35;
  float pt = smoothstep(0.5, 0.62, field);
  float dk = smoothstep(0.7, 0.76, n(vec2(vT * 6.0 + uSeed * 2.0, vUv.y * 3.0 + 4.0)));
  vec3 c = mix(uBase, uPatch, pt);
  c = mix(c, uDark, dk * 0.9);
  // scale pattern
  vec2 sc = vec2(vT * 70.0, vUv.y * 22.0 + floor(vT * 70.0) * 0.5);
  float scales = smoothstep(0.0, 0.5, length(fract(sc) - 0.5));
  c *= 0.9 + 0.1 * scales;
  float diff = 0.45 + 0.55 * clamp(dot(N, normalize(vec3(-0.25, 0.35, 0.9))), 0.0, 1.0);
  float edge = 1.0 - 0.28 * smoothstep(0.55, 1.0, across);
  vec3 col = c * diff * edge;
  float spec = pow(clamp(dot(reflect(-normalize(vec3(-0.25, 0.35, 0.9)), N), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
  col += vec3(0.5, 0.55, 0.6) * spec * 0.18 * (1.0 - vFin);
  float alpha = mix(0.96, 0.55, vFin) * uFade;
  gl_FragColor = vec4(col, alpha);
}`;

// Rounded koi: smooth lathe body, curved tail fan, leaf-shaped fins.
function fishGeometry(len, wid) {
  const seg = 40;
  const ring = 18;
  const pos = [];
  const uv = [];
  const fin = [];
  const idx = [];
  const prof = (t) => {
    // t: 0 tail .. 1 head. broad shoulders near 0.68, tapering peduncle, rounded nose
    const head = Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.86) / 0.14, 2)));
    const body = Math.sin(Math.PI * Math.pow(t, 0.62));
    const r = t > 0.86 ? head * 0.78 : 0.1 + 0.9 * Math.pow(Math.max(0, body), 0.9);
    return Math.max(0.04, r);
  };
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const x = (t - 0.5) * len;
    const r = wid * prof(t);
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2;
      pos.push(x, Math.cos(a) * r, Math.sin(a) * r * 0.62);
      uv.push(t, j / ring);
      fin.push(0);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j;
      const b = a + ring + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const sheet = (pts) => {
    // fan from first point
    const base = pos.length / 3;
    pts.forEach(([x, y]) => {
      pos.push(x, y, 0);
      uv.push(x / len + 0.5, 0.5 + y / (wid * 3));
      fin.push(1);
    });
    for (let i = 1; i < pts.length - 1; i++) idx.push(base, base + i, base + i + 1, base, base + i + 1, base + i);
  };
  // tail fan: curved edge with a soft notch
  const tail = [[-len * 0.45, 0]];
  for (let i = 0; i <= 14; i++) {
    const u = (i / 14) * 2 - 1;
    const x = -len * (0.62 + 0.1 * (1 - Math.abs(u) * 0.2) - 0.05 * Math.exp(-u * u * 18));
    tail.push([x, u * wid * 1.45]);
  }
  sheet(tail);
  // pectoral fins: rounded leaf swept back
  const leaf = (sg) => {
    const pts = [[len * 0.17, sg * wid * 0.55]];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const w = Math.sin(u * Math.PI);
      pts.push([len * 0.17 - u * len * 0.2 - w * 0.0, sg * (wid * 0.55 + w * wid * 0.95 + u * wid * 0.25)]);
    }
    pts.push([len * 0.0, sg * wid * 0.6]);
    sheet(pts);
  };
  leaf(1);
  leaf(-1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aFin", new THREE.Float32BufferAttribute(fin, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  // fix normals on flat sheets so they face the camera
  const n = g.getAttribute("normal");
  for (let i = 0; i < fin.length; i++) if (fin[i] > 0.5) n.setXYZ(i, 0, 0, 1);
  return g;
}

export function mountPond(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  const size = () => renderer.setSize(innerWidth, innerHeight, false);
  size();
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(0, innerWidth, innerHeight, 0, -100, 100);
  const fit = () => {
    cam.right = innerWidth;
    cam.top = innerHeight;
    cam.updateProjectionMatrix();
  };
  const mk = (n, len, wid, big) => {
    const out = [];
    const palettes = [
      [0xf1ede4, 0xe2562b, 0x1b1b1d],
      [0xf1ede4, 0xe2562b, 0xe2562b],
      [0xefe9dc, 0x2a2a2c, 0xe2562b],
      [0xf0a13b, 0xf6efe0, 0xc7421f],
    ];
    for (let i = 0; i < n; i++) {
      const pal = palettes[(Math.random() * palettes.length) | 0];
      const mat = new THREE.ShaderMaterial({
        vertexShader: FISH_VERT,
        fragmentShader: FISH_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: Math.random() * 6 },
          uSpeed: { value: 0.3 },
          uLen: { value: len },
          uBase: { value: new THREE.Color(pal[0]) },
          uPatch: { value: new THREE.Color(pal[1]) },
          uDark: { value: new THREE.Color(pal[2]) },
          uSeed: { value: Math.random() * 20 },
          uFade: { value: 1 },
        },
      });
      const m = new THREE.Mesh(fishGeometry(len, wid), mat);
      m.position.set(Math.random() * innerWidth, Math.random() * innerHeight, big ? 1 : 0);
      m.scale.setScalar(Math.min(1, Math.max(0.55, innerWidth / 1200)));
      scene.add(m);
      out.push({ m, mat, a: Math.random() * 6.28, v: 30 + Math.random() * 25, turn: 0, big, len });
    }
    return out;
  };
  const koi = mk(3 + ((Math.random() * 4) | 0), 118, 15, true);
  const fry = mk(9 + ((Math.random() * 7) | 0), 34, 4.2, false);
  const all = [...koi, ...fry];
  // keep text readable: fish dim and steer away from text zones
  let zones = [];
  let zoneAt = 0;
  const refreshZones = (now) => {
    if (now - zoneAt < 160) return;
    zoneAt = now;
    const out = [];
    const intro = document.querySelector(".intro");
    const layer = document.querySelector(".intro-layer");
    const lop = layer ? parseFloat(getComputedStyle(layer).opacity) : 1;
    if (intro && lop > 0.25) {
      const r = intro.getBoundingClientRect();
      out.push({ l: r.left - 24, r: r.right + 24, t: r.top - 10, b: r.bottom + 12 });
    }
    document.querySelectorAll(".card-meta, .slider, .contact, .card-eyebrow").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > 0 && r.left < innerWidth) out.push({ l: r.left - 12, r: r.right + 12, t: r.top - 8, b: r.bottom + 10 });
    });
    zones = out;
  };
  const mouse = { x: -1e4, y: -1e4, still: 0, moved: 0 };

  // ripples
  const ripples = [];
  const ringMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uR: { value: 0 }, uA: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: "varying vec2 vUv; uniform float uR,uA; void main(){ float d=length(vUv-0.5)*2.0; float ring=smoothstep(0.06,0.0,abs(d-uR)); gl_FragColor=vec4(0.85,0.92,1.0,ring*uA*0.35);}",
  });
  const ripple = (x, y) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), ringMat.clone());
    m.position.set(x, y, 5);
    m.scale.setScalar(10);
    scene.add(m);
    ripples.push({ m, t: 0 });
  };

  const down = (e) => {
    ripple(e.clientX, innerHeight - e.clientY);
    for (const f of all) {
      const dx = f.m.position.x - e.clientX;
      const dy = f.m.position.y - (innerHeight - e.clientY);
      const d = Math.hypot(dx, dy);
      if (d < 300) {
        f.flee = 1.2;
        f.a = Math.atan2(dy, dx);
      }
    }
  };
  const move = (e) => {
    mouse.x = e.clientX;
    mouse.y = innerHeight - e.clientY;
    mouse.moved = performance.now();
  };
  addEventListener("pointerdown", down, { passive: true });
  addEventListener("pointermove", move, { passive: true });
  const onResize = () => {
    size();
    fit();
  };
  addEventListener("resize", onResize);

  let raf = 0;
  let last = 0;
  let time = 0;
  setTimeout(() => canvas.setAttribute("data-ready", ""), 300);
  const loop = (now) => {
    const dt = Math.min((now - last) / 1000 || 0.016, 0.05);
    last = now;
    time += dt;
    const still = now - mouse.moved > 700;
    refreshZones(now);
    for (const f of all) {
      const p = f.m.position;
      let speed = f.v;
      let target = f.a + Math.sin(time * 0.4 + f.mat.uniforms.uSeed.value) * 0.5;
      const margin = 120;
      if (p.x < margin || p.x > innerWidth - margin || p.y < margin || p.y > innerHeight - margin) target = Math.atan2(innerHeight / 2 - p.y, innerWidth / 2 - p.x);
      if (f.big && still && mouse.x > -1000) {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < 420 && d > 40) target = Math.atan2(mouse.y - p.y, mouse.x - p.x);
      }
      // zone avoidance (screen y is flipped against world y)
      let inside = false;
      for (const z of zones) {
        const sy = innerHeight - p.y;
        const cx = (z.l + z.r) / 2;
        const cy = (z.t + z.b) / 2;
        if (p.x > z.l - 30 && p.x < z.r + 30 && sy > z.t - 30 && sy < z.b + 30) {
          if (p.x > z.l && p.x < z.r && sy > z.t && sy < z.b) inside = true;
          if (!f.flee) target = Math.atan2(-(cy - sy) * 1, p.x - cx) * 1;
          if (!f.flee) target = Math.atan2(sy - cy > 0 ? -(sy - cy) : -(sy - cy), p.x - cx);
        }
      }
      const want = inside ? 0.12 : 1;
      f.mat.uniforms.uFade.value += (want - f.mat.uniforms.uFade.value) * Math.min(1, dt * 6);
      if (f.flee > 0) {
        f.flee -= dt;
        speed *= 3.4;
      }
      let da = target - f.a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      f.a += da * Math.min(1, dt * (f.flee > 0 ? 6 : 1.6));
      p.x += Math.cos(f.a) * speed * dt;
      p.y += Math.sin(f.a) * speed * dt;
      f.m.rotation.z = f.a;
      f.mat.uniforms.uTime.value = time;
      f.mat.uniforms.uSpeed.value = Math.min(1, speed / 80);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt;
      const k = r.t / 1.8;
      r.m.scale.setScalar(10 + 360 * k);
      r.m.material.uniforms.uR.value = 0.15 + 0.8 * k;
      r.m.material.uniforms.uA.value = Math.max(0, 1 - k);
      if (k >= 1) {
        scene.remove(r.m);
        r.m.geometry.dispose();
        r.m.material.dispose();
        ripples.splice(i, 1);
      }
    }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("pointerdown", down);
    removeEventListener("pointermove", move);
    removeEventListener("resize", onResize);
    renderer.dispose();
  };
}
