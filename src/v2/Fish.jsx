import React, { useEffect, useRef } from "react";

// Koi pond: original procedural side-view koi, wandering on a 2D canvas.
const PALETTES = [
  { body: "#e9e5db", fin: "#d9d4c8", patch: "#d4571f" }, // kohaku
  { body: "#d4571f", fin: "#b84718", patch: "#26262b" }, // hi + sumi
  { body: "#d9a13b", fin: "#c08727", patch: "#e9e5db" }, // yamabuki
  { body: "#e9e5db", fin: "#d9d4c8", patch: "#c94f24" },
  { body: "#c94f24", fin: "#a53d16", patch: "#e9e5db" },
  { body: "#e9e5db", fin: "#cfc9bb", patch: "#2b2b30" }, // shiro + sumi
];

function spawn(w, h, i) {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    a: Math.random() * Math.PI * 2,
    sp: 16 + Math.random() * 20, // px/s
    s: 15 + Math.random() * 14, // base size
    ph: Math.random() * Math.PI * 2,
    wag: 5 + Math.random() * 3,
    depth: 0.55 + Math.random() * 0.45,
    c: PALETTES[i % PALETTES.length],
  };
}

export default function Fish({ count = 7 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const n = window.innerWidth < 860 ? Math.min(4, count) : count;
    const fish = [];
    for (let i = 0; i < n; i++) fish.push(spawn(window.innerWidth, window.innerHeight, i));

    const bodyPath = (c, L, W) => {
      c.beginPath();
      c.moveTo(L * 0.52, 0);
      c.quadraticCurveTo(L * 0.3, -W, -L * 0.12, -W * 0.66);
      c.quadraticCurveTo(-L * 0.38, -W * 0.38, -L * 0.44, 0);
      c.quadraticCurveTo(-L * 0.38, W * 0.38, -L * 0.12, W * 0.66);
      c.quadraticCurveTo(L * 0.3, W, L * 0.52, 0);
      c.closePath();
    };

    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);

      for (const f of fish) {
        // wander, then steer home when out of the pond
        f.a += Math.sin(now * 0.00045 * f.wag + f.ph) * 0.011 + (Math.random() - 0.5) * 0.008;
        const m = 90;
        if (f.x < -m) f.a = 0;
        else if (f.x > w + m) f.a = Math.PI;
        if (f.y < -m) f.a = Math.PI / 2;
        else if (f.y > h + m) f.a = -Math.PI / 2;

        f.x += Math.cos(f.a) * f.sp * f.depth * dt;
        f.y += Math.sin(f.a) * f.sp * f.depth * dt + Math.sin(now * 0.0011 + f.ph) * 6 * dt;

        const wag = Math.sin(now * 0.002 * f.wag + f.ph);
        const s = f.s * f.depth;
        const L = s * 3.1;
        const W = s * 0.66;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.a + wag * 0.1);
        ctx.globalAlpha = 0.35 + f.depth * 0.55;

        // tail
        const tw = wag * s * 0.55;
        ctx.beginPath();
        ctx.moveTo(-L * 0.4, 0);
        ctx.quadraticCurveTo(-L * 0.66, tw - W * 0.55, -L * 0.98, tw * 1.5 - W * 0.42);
        ctx.quadraticCurveTo(-L * 0.8, tw * 0.55, -L * 0.98, tw * 1.5 + W * 0.42);
        ctx.quadraticCurveTo(-L * 0.66, tw + W * 0.55, -L * 0.4, 0);
        ctx.closePath();
        ctx.fillStyle = f.c.fin;
        ctx.fill();

        // pectoral fins
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.ellipse(L * 0.06, -W * 0.85, s * 0.5, s * 0.2, -0.5 + wag * 0.25, 0, Math.PI * 2);
        ctx.ellipse(L * 0.06, W * 0.85, s * 0.5, s * 0.2, 0.5 - wag * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= 0.7;

        // body
        bodyPath(ctx, L, W);
        ctx.fillStyle = f.c.body;
        ctx.fill();

        // patches, clipped to the body
        ctx.save();
        bodyPath(ctx, L, W);
        ctx.clip();
        ctx.globalAlpha *= 0.92;
        ctx.fillStyle = f.c.patch;
        ctx.beginPath();
        ctx.ellipse(L * 0.18, -W * 0.25, s * 0.55, s * 0.4, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-L * 0.12, W * 0.3, s * 0.45, s * 0.35, -0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // eyes
        ctx.fillStyle = "#101114";
        ctx.beginPath();
        ctx.arc(L * 0.38, -W * 0.22, s * 0.075, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(L * 0.38, W * 0.22, s * 0.075, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count]);

  return <canvas ref={ref} className="v2-fish" aria-hidden="true" />;
}
