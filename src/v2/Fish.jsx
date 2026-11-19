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
varying vec3 vN; varying vec2 vUv; varying float vT;
void main(){
  vec3 p = position;
  float t = clamp((p.x / uLen) + 0.5, 0.0, 1.0); // 0 tail .. 1 head
  float amp = (1.0 - t) * (1.0 - t) * (0.1 + 0.18 * uSpeed) * uLen;
  float w = sin(uTime * (3.0 + 5.0 * uSpeed) + uPhase + t * 5.0);
  p.z += amp * w;
  vec3 n = normal;
  float slope = amp * 0.0;
  vN = normalMatrix * n;
  vUv = uv; vT = t;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FISH_FRAG = `
precision mediump float;
uniform vec3 uBase, uPatch; uniform float uSeed;
varying vec3 vN; varying vec2 vUv; varying float vT;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  float pt = smoothstep(0.52, 0.6, n(vec2(vT*5.0+uSeed, vUv.y*3.0+uSeed*2.0)));
  vec3 c = mix(uBase, uPatch, pt);
  float scale = 0.5+0.5*sin(vT*90.0)*sin(vUv.y*60.0);
  c *= 0.92 + 0.08 * scale;
  float l = 0.55 + 0.45 * clamp(dot(normalize(vN), normalize(vec3(-0.3,0.8,0.6))), 0.0, 1.0);
  gl_FragColor = vec4(c * l, 0.92);
}`;

function fishGeometry(len, wid) {
  // body: lathe-like along x, flattened in z
  const seg = 28;
  const ring = 14;
  const pos = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg; // 0 tail .. 1 head
    const x = (t - 0.5) * len;
    const prof = Math.sin(Math.pow(t, 0.7) * Math.PI) ** 0.8 * (0.2 + 0.8 * Math.min(1, t * 2.2));
    const r = wid * (t < 0.15 ? 0.12 + t * 2.4 : prof);
    for (let j = 0; j <= ring; j++) {
      const a = (j / ring) * Math.PI * 2;
      pos.push(x, Math.cos(a) * r, Math.sin(a) * r * 0.55);
      uv.push(t, j / ring);
    }
  }
  for (let i = 0; i < seg; i++)
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j;
      const b = a + ring + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  // tail fan + pectoral fins (flat triangles)
  const add = (pts) => {
    const base = pos.length / 3;
    pts.forEach(([x, y, z]) => {
      pos.push(x, y, z);
      uv.push(x / len + 0.5, 0.5);
    });
    idx.push(base, base + 1, base + 2, base, base + 2, base + 1);
  };
  add([[-len * 0.46, 0, 0], [-len * 0.62, wid * 1.3, 0], [-len * 0.6, -wid * 1.3, 0]]);
  add([[-len * 0.46, 0, 0], [-len * 0.66, wid * 0.55, 0], [-len * 0.66, -wid * 0.55, 0]]);
  add([[len * 0.16, wid * 0.5, 0], [len * 0.04, wid * 1.5, 0], [-len * 0.06, wid * 0.7, 0]]);
  add([[len * 0.16, -wid * 0.5, 0], [len * 0.04, -wid * 1.5, 0], [-len * 0.06, -wid * 0.7, 0]]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
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
      [0xf2efe8, 0xe0532a],
      [0xe9e4da, 0x222222],
      [0xf4a23b, 0xfff2dc],
      [0xe0532a, 0xf3efe6],
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
          uSeed: { value: Math.random() * 20 },
        },
      });
      const m = new THREE.Mesh(fishGeometry(len, wid), mat);
      m.position.set(Math.random() * innerWidth, Math.random() * innerHeight, big ? 1 : 0);
      scene.add(m);
      out.push({ m, mat, a: Math.random() * 6.28, v: 30 + Math.random() * 25, turn: 0, big, len });
    }
    return out;
  };
  const koi = mk(3 + ((Math.random() * 4) | 0), 150, 17, true);
  const fry = mk(9 + ((Math.random() * 7) | 0), 44, 5, false);
  const all = [...koi, ...fry];
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
    for (const f of all) {
      const p = f.m.position;
      let speed = f.v;
      let target = f.a + Math.sin(time * 0.4 + f.mat.uniforms.uSeed.value) * 0.5;
      const margin = 160;
      if (p.x < margin || p.x > innerWidth - margin || p.y < margin || p.y > innerHeight - margin) target = Math.atan2(innerHeight / 2 - p.y, innerWidth / 2 - p.x);
      if (f.big && still && mouse.x > -1000) {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < 420 && d > 40) target = Math.atan2(mouse.y - p.y, mouse.x - p.x);
      }
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
