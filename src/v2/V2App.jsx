import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { PROFILE, JOBS, PROJECTS } from "./data.js";
import { canRun3D, run3D } from "./Intro.jsx";
import { canRunPond, mountPond } from "./Fish.jsx";
import CaseStudy from "./Case.jsx";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const root = () => document.documentElement;

/* ------------------------------------------------------------------ */
/* film light: soft top light + vignette + dithered grain, drawn once  */
/* ------------------------------------------------------------------ */
function drawFilmLight(canvas) {
  const w = Math.max(1, Math.round(innerWidth));
  const h = Math.max(1, Math.round(innerHeight));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const ss = (a) => {
    const t = Math.min(1, Math.max(0, a));
    return t * t * (3 - 2 * t);
  };
  for (let y = 0; y < h; y++) {
    const ty = y / h / 0.7;
    const vy = (y / h - 0.45) / 1.1;
    for (let x = 0; x < w; x++) {
      const tx = (x / w - 0.5) / 0.9;
      const vx = (x / w - 0.5) / 1.4;
      const light = 0.03 * (1 - ss(Math.sqrt(tx * tx + ty * ty)));
      const dark = 0.42 * ss((Math.sqrt(vx * vx + vy * vy) - 0.5) / 0.5);
      const a = 1 - (1 - light) * (1 - dark);
      const k = a > 0 ? (light * (1 - dark)) / a : 0;
      const i = (y * w + x) * 4;
      d[i] = 236 * k;
      d[i + 1] = 241 * k;
      d[i + 2] = 248 * k;
      d[i + 3] = 255 * a + (Math.random() + Math.random() - 1) * (a > 0.001 ? 12 : 0);
    }
  }
  ctx.putImageData(img, 0, 0);
}

/* ------------------------------------------------------------------ */
/* signature                                                           */
/* ------------------------------------------------------------------ */
function Signature() {
  // A typographic wordmark (not a claimed handwritten signature), revealed left to right.
  useLayoutEffect(() => {
    root().style.setProperty("--sig-end", "1.9s");
  }, []);
  return (
    <div className="signature" aria-hidden="true">
      <span className="signature-word">Fuzail</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* mascot: the avatar, turns toward the pointer, squashes when booped  */
/* ------------------------------------------------------------------ */
function Mascot({ size = 104 }) {
  const body = useRef(null);
  const face = useRef(null);
  const img = useRef(null);
  const btn = useRef(null);

  useEffect(() => {
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const move = (e) => {
      const r = btn.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (innerWidth * 0.5);
      const dy = (e.clientY - cy) / (innerHeight * 0.5);
      target.x = clamp(dx, -1, 1);
      target.y = clamp(dy, -1, 1);
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.1;
      cur.y += (target.y - cur.y) * 0.1;
      if (face.current)
        face.current.style.transform = `rotateY(${(cur.x * 20).toFixed(2)}deg) rotateX(${(-cur.y * 14).toFixed(2)}deg)`;
      if (img.current)
        img.current.style.transform = `translate(${(cur.x * 4).toFixed(2)}px, ${(cur.y * 3).toFixed(2)}px) scale(1.12)`;
      raf = requestAnimationFrame(tick);
    };
    addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  const boop = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    body.current?.animate(
      [
        { transform: "scale(1, 1)", easing: "ease-in" },
        { transform: "scale(1.08, 0.88)", offset: 0.18, easing: "ease-out" },
        { transform: "scale(0.94, 1.1)", offset: 0.4, easing: "ease-in-out" },
        { transform: "scale(1.03, 0.97)", offset: 0.66, easing: "ease-in-out" },
        { transform: "scale(1, 1)" },
      ],
      { duration: 420, easing: "linear" },
    );
  };

  return (
    <button
      ref={btn}
      type="button"
      className="mascot"
      aria-label={`Boop ${PROFILE.name.split(" ")[1]}`}
      onClick={boop}
      style={{ width: size, height: size }}
    >
      <span ref={body} className="mascot-body">
        <span ref={face} className="mascot-face">
          <img ref={img} src={PROFILE.avatar} alt="" draggable={false} />
        </span>
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* experience tree: opens company by company on a loop                 */
/* ------------------------------------------------------------------ */
const kidsOf = (j) => [j.title, `${j.from} – ${j.to} · ${j.length}`];
const SUMMARY = `${JOBS.length} companies · since ${JOBS[JOBS.length - 1].from.split(" ")[1]}`;
const COLS = Math.max(SUMMARY.length, ...JOBS.flatMap((j) => [6 + j.company.length + 3, ...kidsOf(j).map((k) => 8 + k.length)]));
const ROWS = 1 + JOBS.length + Math.max(...JOBS.map((j) => kidsOf(j).length)) + 2;

function treeLines(cursor, open, kids) {
  const out = ["~/experience"];
  JOBS.forEach((j, i) => {
    const last = i === JOBS.length - 1;
    out.push(`${last ? "└─" : "├─"}${i === cursor ? "> " : "─ "}${j.company}/${i !== open || kids === 0 ? " +" : ""}`);
    if (i === open) {
      const k = kidsOf(j);
      for (let n = 0; n < kids; n++) out.push(`${last ? "    " : "│   "}${n === k.length - 1 ? "└── " : "├── "}${k[n]}`);
    }
  });
  while (out.length < ROWS - 1) out.push("");
  out.push(SUMMARY);
  return out.map((l) => l.padEnd(COLS)).join("\n");
}

function buildTreeTimeline() {
  const frames = [];
  let t = 0;
  const add = (cursor, open, kids, dur) => {
    frames.push({ at: t, text: treeLines(cursor, open, kids) });
    t += dur;
  };
  let cursor = 0;
  add(0, -1, 0, 0.9);
  JOBS.forEach((j, i) => {
    while (cursor < i) add(++cursor, -1, 0, 0.13);
    add(cursor, i, 0, 0.3);
    const k = kidsOf(j).length;
    for (let n = 1; n <= k; n++) add(cursor, i, n, n === k ? 2.4 : 0.07);
    for (let n = k - 1; n >= 0; n--) add(cursor, i, n, n === 0 ? 0.3 : 0.07);
  });
  while (cursor > 0) add(--cursor, -1, 0, 0.13);
  return { frames, total: t };
}

function Tree() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { frames, total } = buildTreeTimeline();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (t) => {
      const m = ((t % total) + total) % total;
      let i = 0;
      while (i + 1 < frames.length && frames[i + 1].at <= m) i++;
      return frames[i].text;
    };
    el.textContent = at(0);
    if (reduce) return;
    let raf = 0;
    let last = "";
    const start = performance.now();
    const tick = (now) => {
      const next = at((now - start) / 1000);
      if (next !== last) {
        el.textContent = next;
        last = next;
      }
      raf = requestAnimationFrame(tick);
    };
    const begin = () => {
      raf = requestAnimationFrame(tick);
    };
    begin();
    return () => cancelAnimationFrame(raf);
  }, []);
  const label = JOBS.map((j) => `${j.title} at ${j.company}, ${j.from} to ${j.to}`).join("; ");
  return (
    <pre ref={ref} className="tree" role="img" aria-label={`Experience: ${label}`} style={{ "--cols": COLS }}>
      {treeLines(0, -1, 0)}
    </pre>
  );
}

/* ------------------------------------------------------------------ */
/* pills                                                               */
/* ------------------------------------------------------------------ */
const Icon = ({ children }) => (
  <svg className="pill-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

/* ------------------------------------------------------------------ */
/* contact                                                             */
/* ------------------------------------------------------------------ */
const ico = (c) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {c}
  </svg>
);
const CONTACT_ICONS = {
  linkedin: ico(
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 10.5V16M8 7.75v.01M11.5 16v-5.5M11.5 13c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5v3" />
    </>,
  ),
  github: ico(
    <path d="M9 19c-4 1.2-4-2-6-2.5m12 4.5v-3.1a2.7 2.7 0 0 0-.8-2.1c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.5 2.8 5.5 3.1 5.5 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.8 5.7 5.5 6a2.7 2.7 0 0 0-.8 2.1V21" />,
  ),
  x: ico(<path d="M4 4l16 16M20 4L4 20" />),
  email: ico(
    <>
      <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5" />
      <path d="M15.5 8.5V6.5a2.5 2.5 0 0 0-2.5-2.5H6.5A2.5 2.5 0 0 0 4 6.5V13a2.5 2.5 0 0 0 2.5 2.5h2" />
    </>,
  ),
  check: ico(<path d="m5 12.5 4.5 4.5L19 7.5" />),
};
const WAYS = [
  { id: "linkedin", label: "linkedin", href: PROFILE.linkedin, key: "l" },
  { id: "github", label: "github", href: PROFILE.github, key: "g" },
  { id: "x", label: "x / twitter", href: PROFILE.x, key: "x" },
  { id: "email", label: "copy email", key: "c" },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Contact() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const cap = useRef(null);
  const list = useRef(null);
  const glide = useRef(null);
  const closedSize = useRef(null);
  const anim = useRef(null);
  const timer = useRef(0);

  const measureClosed = () => {
    if (!cap.current) return;
    const r = cap.current.getBoundingClientRect();
    closedSize.current = { width: r.width, height: r.height };
  };
  useLayoutEffect(() => {
    if (!open) measureClosed();
  });

  const toggle = () => {
    if (!open) measureClosed();
    setOpen((o) => !o);
  };

  useLayoutEffect(() => {
    const el = cap.current;
    if (!el || !closedSize.current) return;
    anim.current?.cancel();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (open) {
      const r = el.getBoundingClientRect();
      anim.current = el.animate(
        [
          { width: closedSize.current.width + "px", height: closedSize.current.height + "px" },
          { width: r.width + "px", height: r.height + "px" },
        ],
        { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      Array.from(list.current?.children ?? []).forEach((li, i) =>
        li.animate(
          [
            { opacity: 0, transform: "translateY(-6px)", filter: "blur(4px)" },
            { opacity: 1, transform: "none", filter: "blur(0px)" },
          ],
          { duration: 380, delay: 110 + 40 * i, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
        ),
      );
    }
  }, [open]);

  const place = (row) => {
    const g = glide.current;
    if (!g) return;
    if (!row) {
      g.removeAttribute("data-on");
      return;
    }
    const top = row.offsetTop;
    g.style.transform = `translateY(${top}px)`;
    g.setAttribute("data-on", "");
  };

  const act = useCallback(async (w) => {
    if (w.id === "email") {
      const ok = await copyText(PROFILE.email);
      if (ok) {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1800);
      } else location.href = `mailto:${PROFILE.email}`;
    } else window.open(w.href, "_blank", "noopener,noreferrer");
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const html = root();
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (html.dataset.intro === "on" || html.dataset.project === "open") return;
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      const w = WAYS.find((x) => x.key === e.key.toLowerCase());
      if (!w) return;
      e.preventDefault();
      if (!e.repeat) act(w);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, act]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => {
      if (!cap.current?.contains(e.target)) setOpen(false);
    };
    addEventListener("pointerdown", away);
    return () => removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <nav className="contact" aria-label="Contact">
      <div ref={cap} className="contact-cap" data-open={open ? "" : undefined}>
        <button type="button" className="contact-head" aria-expanded={open} aria-controls="contact-ways" onClick={toggle}>
          <span className="contact-label">
            <span className="contact-face" aria-hidden={copied}>
              contact
            </span>
            <span className="contact-face contact-face-done" aria-hidden={!copied}>
              {CONTACT_ICONS.check}copied
            </span>
          </span>
          <svg className="contact-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="contact-ways" onPointerLeave={() => place(null)}>
            <span ref={glide} className="contact-glide" aria-hidden="true" />
            <ul ref={list} id="contact-ways" className="contact-list">
              {WAYS.map((w) => {
                const props = {
                  className: "contact-row",
                  onPointerEnter: (e) => e.pointerType === "mouse" && place(e.currentTarget),
                  onFocus: (e) => place(e.currentTarget),
                };
                const inner = (
                  <>
                    <span className="contact-row-icon">{CONTACT_ICONS[w.id]}</span>
                    <span className="contact-row-label">{w.label}</span>
                    <kbd className="contact-kbd">{w.key.toUpperCase()}</kbd>
                  </>
                );
                return (
                  <li key={w.id}>
                    {w.href ? (
                      <a {...props} href={w.href} target="_blank" rel="noopener noreferrer">
                        {inner}
                      </a>
                    ) : (
                      <button {...props} type="button" onClick={() => act(w)}>
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* the slider + strip controller                                       */
/* ------------------------------------------------------------------ */
function spring(x, v, target, k, c, dt) {
  v += (k * (target - x) - c * v) * dt;
  x += v * dt;
  return [x, v];
}

function createController(el) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(max-width: 640px), (pointer: coarse)");
  const light = el.root.querySelector(".stage-light");

  let vw = 0;
  let maxScroll = 0;
  let railW = 0;
  let stops = [0];
  let cards = [];
  let pitch = 1;
  let R = 0; // scroll position
  let RV = 0;
  let T = 0; // scroll target
  let Q = 0; // knob position
  let QV = 0;
  let D = 0; // knob target
  let idx = 0;
  let lastOn = -1;
  let stopEls = [];
  let drag = null;
  let touch = null;
  let wheelTimer = 0;
  let raf = 0;
  let last = 0;
  let suppressClick = false;

  const toKnob = (s) => (maxScroll ? (s / maxScroll) * railW : 0);
  const toScroll = (q) => (railW ? (q / railW) * maxScroll : 0);
  const nearest = (s) => stops.reduce((b, v, i) => (Math.abs(v - s) < Math.abs(stops[b] - s) ? i : b), 0);
  const setVar = (c, k, v) => {
    if (c.set.get(k) !== v) {
      c.set.set(k, v);
      c.el.style.setProperty(k, v);
    }
  };
  const magnet = (q) => {
    let best = q;
    let dist = Infinity;
    for (const s of stops) {
      const p = toKnob(s);
      if (Math.abs(p - q) < dist) {
        dist = Math.abs(p - q);
        best = p;
      }
    }
    if (dist >= 14) return q;
    const f = 1 - dist / 14;
    return q + (best - q) * 0.7 * f * f;
  };

  function measure() {
    vw = el.root.clientWidth;
    const nodes = Array.from(el.track.querySelectorAll("[data-card]"));
    cards = nodes
      .map((n) => ({ el: n.querySelector(".card-body"), centre: n.offsetLeft + n.offsetWidth / 2, set: new Map() }))
      .filter((c) => c.el);
    pitch = nodes.length > 1 ? nodes[1].offsetLeft - nodes[0].offsetLeft : nodes[0]?.offsetWidth || 1;
    maxScroll = Math.max(0, el.track.offsetWidth - vw);
    stops = [0, ...nodes.map((n) => clamp(n.offsetLeft + n.offsetWidth / 2 - vw / 2, 0, maxScroll))];
    railW = el.rail.clientWidth;
    el.stops.textContent = "";
    stopEls = stops.map((s, i) => {
      const span = document.createElement("span");
      span.className = "slider-stop";
      span.textContent = String(i).padStart(2, "0");
      span.style.left = toKnob(s).toFixed(2) + "px";
      el.stops.appendChild(span);
      return span;
    });
    idx = Math.min(idx, stops.length - 1);
    R = T = stops[idx];
    RV = 0;
    Q = D = toKnob(R);
    QV = 0;
    lastOn = -1;
    render();
  }

  function aria() {
    el.slider.setAttribute("aria-valuenow", String(maxScroll ? Math.round((T / maxScroll) * 100) : 0));
    el.slider.setAttribute("aria-valuetext", idx === 0 ? "Intro" : `Project ${idx} of ${stops.length - 1}`);
  }

  function goTo(i) {
    idx = clamp(i, 0, stops.length - 1);
    T = stops[idx];
    aria();
    kick();
  }

  function render() {
    el.track.style.transform = `translate3d(${(-R).toFixed(2)}px,0,0)`;
    const first = stops[1] || maxScroll || 1;
    const p = clamp(R / first, 0, 1);
    const sm = p * p * (3 - 2 * p);
    el.intro.style.transform = `scale(${(1 - 0.08 * sm).toFixed(4)})`;
    el.intro.style.filter = !coarse.matches && sm > 0.002 ? `blur(${(8 * sm).toFixed(2)}px)` : "";
    el.intro.style.opacity = (1 - 0.5 * sm).toFixed(3);
    el.intro.toggleAttribute("inert", sm > 0.5);
    for (const c of cards) {
      const e = reduce.matches ? 0 : (c.centre - R - vw / 2) / pitch;
      const ry = clamp(-22 * e, -34, 34);
      const tz = -70 * Math.min(1.5, Math.abs(e));
      setVar(c, "transform", `perspective(1500px) translateZ(${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`);
      if (coarse.matches) continue;
      const a = (ry * Math.PI) / 180;
      const l = -0.5 * Math.sin(a) + 0.79 * Math.cos(a) - 0.79;
      setVar(c, "--shade", Math.max(0, -1.6 * l + 0.12 * Math.min(1, Math.abs(e))).toFixed(3));
      setVar(c, "--lift", Math.max(0, 1.4 * l).toFixed(3));
      setVar(c, "--glint-x", `${(50 - 2.4 * ry).toFixed(1)}%`);
      setVar(c, "--glint", (0.1 + 0.16 * Math.max(0, 1 - Math.abs(ry + 8) / 30)).toFixed(3));
      setVar(c, "--rim", (0.08 + 0.32 * Math.max(0, -ry / 34)).toFixed(3));
      const blur = 2.4 * Math.max(0, Math.min(1.4, Math.abs(e)) - 0.15);
      setVar(c, "filter", blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "");
    }
    light?.style.setProperty("opacity", sm.toFixed(3));
    el.knob.style.transform = `translate3d(${Q.toFixed(2)}px,0,0)`;
    const on = nearest(toScroll(Q));
    if (on !== lastOn) {
      stopEls[lastOn]?.removeAttribute("data-on");
      stopEls[on]?.setAttribute("data-on", "");
      lastOn = on;
    }
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    if (!drag) D = clamp(toKnob(T), 0, railW);
    if (reduce.matches) {
      R = T;
      RV = 0;
      if (!drag) {
        Q = D;
        QV = 0;
      }
    }
    const touching = !!touch?.active;
    if (touching) R = T;
    for (let t = dt; t > 1e-6; t -= 1 / 240) {
      const h = Math.min(t, 1 / 240);
      if (!reduce.matches && !touching) [R, RV] = spring(R, RV, T, 120, 2 * Math.sqrt(120) * 0.92, h);
      if (!reduce.matches || drag) [Q, QV] = spring(Q, QV, D, drag ? 900 : 260, 2 * Math.sqrt(drag ? 900 : 260) * (drag ? 0.9 : 0.85), h);
      if (Q < 0 || Q > railW) {
        Q = clamp(Q, 0, railW);
        QV = 0;
      }
    }
    render();
    const busy = Math.abs(T - R) > 0.05 || Math.abs(RV) > 0.05 || Math.abs(D - Q) > 0.05 || Math.abs(QV) > 0.05 || drag || touch?.active;
    if (busy) raf = requestAnimationFrame(frame);
    else {
      R = T;
      Q = D;
      RV = QV = 0;
      render();
      raf = 0;
      delete root().dataset.sliding;
    }
  }
  function kick() {
    if (!raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }
  const px = (e) => e.clientX - el.rail.getBoundingClientRect().left;

  const onDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.slider.setPointerCapture(e.pointerId);
    el.slider.focus({ preventScroll: true });
    const p = px(e);
    const off = Math.abs(p - Q) < el.knob.offsetWidth ? Q - p : 0;
    drag = { id: e.pointerId, off, s: [{ t: performance.now(), p: p + off }] };
    el.slider.setAttribute("data-active", "");
    D = magnet(clamp(p + off, 0, railW));
    T = toScroll(D);
    kick();
  };
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = px(e) + drag.off;
    drag.s.push({ t: performance.now(), p });
    if (drag.s.length > 12) drag.s.shift();
    D = magnet(clamp(p, 0, railW));
    T = toScroll(D);
    kick();
  };
  const velocity = (s) => {
    const now = performance.now();
    const f = s.filter((x) => now - x.t < 100);
    if (f.length < 2) return 0;
    const a = f[0];
    const b = f[f.length - 1];
    return b.t > a.t ? ((b.p - a.p) / (b.t - a.t)) * 1000 : 0;
  };
  const onUp = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const q = clamp(px(e) + drag.off + 0.12 * velocity(drag.s), 0, railW);
    drag = null;
    el.slider.removeAttribute("data-active");
    goTo(nearest(toScroll(q)));
  };
  const onSliderKey = (e) => {
    const last = stops.length - 1;
    const map = { ArrowRight: idx + 1, ArrowUp: idx + 1, ArrowLeft: idx - 1, ArrowDown: idx - 1, Home: 0, End: last, PageUp: idx + 1, PageDown: idx - 1 };
    const n = map[e.key];
    if (n === undefined) return;
    e.preventDefault();
    goTo(n);
  };
  const onWheel = (e) => {
    if (root().dataset.intro === "on" || root().dataset.project === "open") return;
    const intro = el.intro;
    if (idx === 0 && R < 1 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && intro.scrollHeight > intro.clientHeight + 1 && !(e.deltaY > 0 ? intro.scrollTop + intro.clientHeight >= intro.scrollHeight - 1 : intro.scrollTop <= 0)) return;
    e.preventDefault();
    const mode = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vw : 1;
    const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * mode;
    T = clamp(T + d, 0, maxScroll);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => goTo(nearest(T)), 180);
    kick();
  };
  const onKey = (e) => {
    const h = root();
    if (h.dataset.intro === "on" || h.dataset.project === "open" || e.defaultPrevented) return;
    if (e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
    if (e.target !== el.slider) onSliderKey(e);
  };
  const rub = (x, lim) => (lim * x) / (x + lim);
  const onTouchDown = (e) => {
    if (e.pointerType !== "touch" || drag || el.slider.contains(e.target)) return;
    touch = { id: e.pointerId, x0: e.clientX, start: R, active: false, s: [] };
  };
  const onTouchMove = (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.x0;
    if (!touch.active && Math.abs(dx) > 8) {
      touch.active = true;
      RV = 0;
      try {
        el.root.setPointerCapture(e.pointerId);
      } catch {}
    }
    if (touch.active) {
      const t = touch.start - dx;
      T = t < 0 ? -rub(-t, 160) : t > maxScroll ? maxScroll + rub(t - maxScroll, 160) : t;
      touch.s.push({ t: performance.now(), p: T });
      if (touch.s.length > 12) touch.s.shift();
      kick();
    }
  };
  const onTouchUp = (e) => {
    if (!touch || e.pointerId !== touch.id) return;
    const was = touch.active;
    const v = velocity(touch.s);
    touch = null;
    if (was) {
      RV = v;
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      goTo(nearest(clamp(T + 0.18 * v, 0, maxScroll)));
    }
  };
  const onClick = (e) => {
    const card = e.target.closest("[data-card]");
    if (!card) return;
    if (card.hasAttribute("data-external")) {
      if (suppressClick) e.preventDefault();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (suppressClick) return;
    const media = card.querySelector(".card-media");
    const i = Array.from(el.track.querySelectorAll("[data-card]")).indexOf(card);
    const p = PROJECTS[i];
    if (p?.internal) {
      location.href = p.internal;
      return;
    }
    dispatchEvent(new CustomEvent("project:open", { detail: { index: i, image: media } }));
  };

  el.slider.addEventListener("pointerdown", onDown);
  el.slider.addEventListener("pointermove", onMove);
  el.slider.addEventListener("pointerup", onUp);
  el.slider.addEventListener("pointercancel", onUp);
  el.slider.addEventListener("keydown", onSliderKey);
  el.root.addEventListener("wheel", onWheel, { passive: false });
  el.root.addEventListener("pointerdown", onTouchDown);
  el.root.addEventListener("pointermove", onTouchMove);
  el.root.addEventListener("pointerup", onTouchUp);
  el.root.addEventListener("pointercancel", onTouchUp);
  el.track.addEventListener("click", onClick);
  addEventListener("keydown", onKey);
  addEventListener("resize", measure);
  measure();
  aria();

  return {
    goTo,
    cleanup() {
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      el.slider.removeEventListener("pointerdown", onDown);
      el.slider.removeEventListener("pointermove", onMove);
      el.slider.removeEventListener("pointerup", onUp);
      el.slider.removeEventListener("pointercancel", onUp);
      el.slider.removeEventListener("keydown", onSliderKey);
      el.root.removeEventListener("wheel", onWheel);
      el.root.removeEventListener("pointerdown", onTouchDown);
      el.root.removeEventListener("pointermove", onTouchMove);
      el.root.removeEventListener("pointerup", onTouchUp);
      el.root.removeEventListener("pointercancel", onTouchUp);
      el.track.removeEventListener("click", onClick);
      removeEventListener("keydown", onKey);
      removeEventListener("resize", measure);
    },
    remeasure: measure,
  };
}

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */
const OutIcon = () => (
  <svg className="card-out" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
);

function Page() {
  const rootRef = useRef(null);
  const introRef = useRef(null);
  const trackRef = useRef(null);
  const sliderRef = useRef(null);
  const railRef = useRef(null);
  const knobRef = useRef(null);
  const stopsRef = useRef(null);

  useEffect(() => {
    const c = createController({
      root: rootRef.current,
      intro: introRef.current,
      track: trackRef.current,
      slider: sliderRef.current,
      rail: railRef.current,
      knob: knobRef.current,
      stops: stopsRef.current,
    });
    window.__v2 = c;
    const fonts = document.fonts?.ready.then(() => c.remeasure());
    return () => {
      c.cleanup();
      delete window.__v2;
      void fonts;
    };
  }, []);

  return (
    <main className="page" ref={rootRef}>
      <div className="intro-layer" ref={introRef}>
        <section className="intro">
          <Signature />
          <header className="header">
            <Mascot size={104} />
            <div>
              <h1 className="name">{PROFILE.name}</h1>
              <p className="tagline">
                Full-Stack Developer &amp; <span className="nowrap">AI Engineer</span>
              </p>
            </div>
          </header>
          <p className="bio">
            I{" "}
            <span className="pill">
              <Icon>
                <path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20ZM13.5 7.5l3 3" />
              </Icon>
              build products
            </span>
            ,{" "}
            <span className="pill">
              <Icon>
                <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
              </Icon>
              write code
            </span>
            , and occasionally wire{" "}
            <span className="pill">
              <Icon>
                <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4ZM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
              </Icon>
              AI
            </span>{" "}
            into things people actually use.
          </p>
          <Tree />
        </section>
      </div>
      <div className="stage-light" aria-hidden="true" />
      <div className="projects" ref={trackRef}>
        {PROJECTS.map((p, i) => {
          const external = !!p.internal && false;
          return (
            <a
              key={p.slug}
              className="card"
              href={p.internal || `/projects/${p.slug}`}
              data-card="true"
              draggable={false}
              style={{ "--i": i }}
              {...(external ? { "data-external": "" } : {})}
            >
              <span className="card-body">
                {p.href && !p.story ? <span className="card-eyebrow">~/live · side projects</span> : null}
                {i === 1 ? <span className="card-eyebrow">~/live · things i shipped</span> : null}
                <span className="card-media">
                  <img className="card-img" src={p.image} alt={p.title} draggable={false} loading="eager" />
                </span>
                <span className="card-floor" aria-hidden="true">
                  <img className="card-reflection" src={p.image} alt="" draggable={false} loading="lazy" />
                </span>
                <span className="card-meta">
                  <span className="card-title">{p.title}</span>
                  <span className="card-kind">{p.kind}</span>
                </span>
              </span>
            </a>
          );
        })}
      </div>
      <Contact />
      <div className="slider" ref={sliderRef} role="slider" tabIndex={0} aria-label="Scroll through projects" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-valuetext="Intro">
        <div className="slider-well">
          <span className="slider-groove" />
          <div className="slider-rail" ref={railRef}>
            <div className="slider-knob" ref={knobRef}>
              <span className="slider-cap" />
            </div>
          </div>
        </div>
        <div className="slider-stops" ref={stopsRef} />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* root: intro then page                                               */
/* ------------------------------------------------------------------ */
export default function V2App() {
  const filmRef = useRef(null);
  const pondRef = useRef(null);
  const overlayRef = useRef(null);
  const [overlay, setOverlay] = useState(true);

  useLayoutEffect(() => {
    const h = root();
    h.classList.add("v2");
    h.dataset.intro = "on";
    return () => {
      h.classList.remove("v2");
      delete h.dataset.intro;
    };
  }, []);

  useEffect(() => {
    if (filmRef.current) drawFilmLight(filmRef.current);
  }, []);

  useEffect(() => {
    let unmount = null;
    const canvas = pondRef.current;
    if (canvas && canRunPond()) {
      try {
        unmount = mountPond(canvas);
      } catch (e) {
        console.warn("pond unavailable", e);
      }
    }
    return () => unmount?.();
  }, []);

  useEffect(() => {
    const h = root();
    const el = overlayRef.current;
    let stop = null;
    let dead = false;
    const finish = () => {
      h.dataset.intro = "done";
      setOverlay(false);
    };
    const params = new URLSearchParams(location.search);
    if (params.has("nointro") || /HeadlessChrome.*skip3d/.test(navigator.userAgent)) {
      finish();
      return;
    }
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canRun3D()) {
      // no WebGL: skip the machine, fade straight into the page
      requestAnimationFrame(() => {
        h.dataset.intro = "done";
        if (el) el.dataset.stage = "fade";
        setTimeout(() => !dead && setOverlay(false), 600);
      });
      return;
    }
    try {
      stop = run3D(el, {
        reduce,
        onStage: (s) => {
          if (s === "fade") h.dataset.intro = "done";
        },
        onDone: () => !dead && setOverlay(false),
      });
    } catch (e) {
      console.warn("3d intro failed", e);
      finish();
    }
    return () => {
      dead = true;
      stop?.();
    };
  }, []);

  return (
    <>
      <canvas ref={filmRef} className="film-light" aria-hidden="true" />
      {overlay && <div ref={overlayRef} className="intro-overlay" role="status" aria-label="Loading" />}
      <canvas ref={pondRef} className="pond" aria-hidden="true" />
      <Page />
      <CaseStudy />
    </>
  );
}
