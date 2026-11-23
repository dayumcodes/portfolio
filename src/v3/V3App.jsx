import { useEffect, useRef, useState } from "react";
import { mountStudio } from "./scene.js";
import { PROFILE, JOBS, PROJECTS } from "../v2/data.js";

// v3 "studio glass": a floating frosted-glass control panel over a code-built
// studio scene. Layout and interactions follow threeui.com/studio-glass as a
// reference; everything here is implemented independently with Fuzail's real
// content, and all imagery is his own or generated from his own scene.

const MOOD_LIST = [
  { id: "morning", label: "Morning", detail: "Soft sun through the window", level: 78, slot: "hero" },
  { id: "thunderstorm", label: "Thunderstorm", detail: "Rain on glass", level: 36, slot: "wide" },
  { id: "afternoon", label: "Afternoon", detail: "High sun, clear daylight", level: 100, slot: "compact" },
  { id: "sunset", label: "Sunset", detail: "Low amber light", level: 64, slot: "wide" },
  { id: "night", label: "Night", detail: "Lamp and monitor glow", level: 22, slot: "compact" },
];

const HINTS = [
  "Drag my name to move this panel",
  "Drag left or right on the room to dim or brighten it",
  "Pick a studio preset to change the workspace lighting",
];

const TILE_SLUGS = ["ramprush", "orbit", "windshield-hud", "calorie-tracker-ai"];
const TILE_IMGS = {
  ramprush: "/v2/cards/ramprush.jpg",
  orbit: "/v2/cards/orbit.jpg",
  "windshield-hud": "/v2/cards/hud.jpg",
  "calorie-tracker-ai": "/v2/cards/calorie-ai.jpg",
};

function Level({ value, unit }) {
  return (
    <span className="level">
      <span className="number">{value}</span>
      <span className="unit">{unit}</span>
    </span>
  );
}

export default function V3App() {
  const canvasRef = useRef(null);
  const studioRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const sceneDrag = useRef(null);
  const [mood, setMood] = useState("morning");
  const [bright, setBright] = useState(78);
  const [drawer, setDrawer] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [bare] = useState(() => new URLSearchParams(location.search).get("bare") === "1");

  useEffect(() => {
    document.title = "Mohammed Fuzail — studio glass";
    const studio = mountStudio(canvasRef.current, {
      images: ["/v2/cards/ramprush.jpg", "/v2/cards/calorie-ai.jpg", "/v2/cards/hud.jpg", "/v2/cards/orbit.jpg"],
    });
    studioRef.current = studio;
    const q = new URLSearchParams(location.search);
    const m = MOOD_LIST.find((x) => x.id === q.get("mood"));
    if (m) { setMood(m.id); studio.setMood(m.id); setBright(m.level); studio.setBrightness(m.level / 100); }
    if (q.get("bright")) handleBright(Number(q.get("bright")));
    const t = setInterval(() => setHintIdx((i) => (i + 1) % HINTS.length), 7000);
    return () => { clearInterval(t); studio.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMood = (id) => {
    const m = MOOD_LIST.find((x) => x.id === id);
    if (!m) return;
    setMood(id);
    studioRef.current?.setMood(id);
    setBright(m.level);
    studioRef.current?.setBrightness(m.level / 100);
  };
  const handleBright = (v) => {
    const n = Math.min(100, Math.max(15, Math.round(v)));
    setBright(n);
    studioRef.current?.setBrightness(n / 100);
  };

  // ---- panel drag: pointer on the title, arrows when focused, Home resets --
  const setPanelPos = (x, y) => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty("--panel-x", `${x}px`);
    panel.style.setProperty("--panel-y", `${y}px`);
  };
  const getPanelPos = () => {
    const panel = panelRef.current;
    if (!panel) return { x: 0, y: 0 };
    return {
      x: parseFloat(panel.style.getPropertyValue("--panel-x")) || 0,
      y: parseFloat(panel.style.getPropertyValue("--panel-y")) || 0,
    };
  };
  const onHandleDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, ...getPanelPos() };
    panelRef.current?.setAttribute("data-moving", "");
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    setPanelPos(
      Math.min(innerWidth * 0.4, Math.max(-innerWidth * 0.4, d.px + e.clientX - d.x)),
      Math.min(innerHeight * 0.5, Math.max(-40, d.py + e.clientY - d.y))
    );
  };
  const onHandleUp = () => {
    dragRef.current = null;
    panelRef.current?.removeAttribute("data-moving");
  };
  const onHandleKey = (e) => {
    const step = e.shiftKey ? 24 : 8;
    const { x, y } = getPanelPos();
    if (e.key === "Home") { setPanelPos(0, 0); e.preventDefault(); return; }
    const moves = { ArrowLeft: [x - step, y], ArrowRight: [x + step, y], ArrowUp: [x, y - step], ArrowDown: [x, y + step] };
    if (moves[e.key]) { setPanelPos(...moves[e.key]); e.preventDefault(); }
  };

  // ---- scene drag: pull left/right anywhere on the room to change brightness
  const onSceneDown = (e) => {
    if (e.target !== canvasRef.current) return;
    sceneDrag.current = { x: e.clientX, b: bright };
  };
  const onSceneMove = (e) => {
    const d = sceneDrag.current;
    if (!d) return;
    handleBright(d.b + ((e.clientX - d.x) / innerWidth) * 130);
  };
  const onSceneUp = () => { sceneDrag.current = null; };

  const openProject = (p) => {
    if (p.internal) location.href = p.internal;
    else if (p.href) window.open(p.href, "_blank", "noopener");
    else setDrawer(true);
  };

  const tiles = TILE_SLUGS.map((s) => PROJECTS.find((p) => p.slug === s)).filter(Boolean);

  return (
    <div
      className={`v3 m-${mood}`}
      data-bare={bare ? "" : undefined}
      onPointerDown={onSceneDown}
      onPointerMove={onSceneMove}
      onPointerUp={onSceneUp}
      onPointerCancel={onSceneUp}
    >
      <canvas ref={canvasRef} className="v3-canvas" aria-hidden="true" />
      <div className="v3-tint" aria-hidden="true" style={{ opacity: (1 - bright / 100) * 0.8 }} />

      <div className="v3-coords">
        <section className="v3-panel" ref={panelRef} aria-label="Portfolio and studio lighting controls">
          <header className="v3-heading">
            <h1>
              <button
                type="button"
                className="v3-handle"
                title="Drag to move the panel (arrow keys move it, Home re-centres)"
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
                onKeyDown={onHandleKey}
              >
                {PROFILE.name}
              </button>
            </h1>
            <button type="button" className="v3-toggle" aria-label="Re-centre panel" title="Re-centre panel" onClick={() => setPanelPos(0, 0)}>
              <span aria-hidden="true" />
            </button>
          </header>

          <div className="v3-scroll">
            {/* portfolio bento */}
            <div className="v3-grid grid-portfolio" role="group" aria-label="Portfolio">
              <div className="tile tile-profile">
                <span className="instrument">
                  <img src={PROFILE.avatar} alt="" draggable="false" />
                </span>
                <span className="copy">
                  <span className="name">Full-Stack Developer & AI Engineer</span>
                  <span className="detail">builds with AI, ships for real users</span>
                </span>
                <Level value="4.5" unit="yrs" />
              </div>

              {tiles.map((p) => (
                <button key={p.slug} type="button" className={`tile tile-img tile-${p.slug}`} onClick={() => openProject(p)} aria-label={`${p.title} — ${p.kind}`}>
                  <span className="instrument">
                    <img src={TILE_IMGS[p.slug]} alt="" draggable="false" loading="lazy" />
                  </span>
                  <span className="tile-corner">{p.href ? "live" : "case"}</span>
                  <span className="copy">
                    <span className="name">{p.title}</span>
                    <span className="detail">{p.kind}</span>
                  </span>
                </button>
              ))}

              <button type="button" className="tile tile-more" onClick={() => setDrawer(true)} aria-label="Everything else — projects, experience, contact">
                <span className="instrument more-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>
                </span>
                <span className="tile-corner">all</span>
                <span className="copy">
                  <span className="name">Everything else</span>
                  <span className="detail">projects, experience, contact</span>
                </span>
              </button>
            </div>

            <p className="v3-group-label">Studio lighting</p>

            {/* lighting bento, arranged like the reference */}
            <div className="v3-grid grid-lighting" role="group" aria-label="Studio lighting presets">
              {MOOD_LIST.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`tile tile-img preset slot-${m.slot} mood-${m.id}`}
                  aria-pressed={mood === m.id}
                  onClick={() => handleMood(m.id)}
                >
                  <span className="instrument">
                    <img src={`/v3/mood-${m.id}.jpg`} alt="" draggable="false" loading="lazy" />
                  </span>
                  {mood === m.id && <span className="indicator" aria-hidden="true" />}
                  <span className="copy">
                    <span className="name">{m.label}</span>
                    <span className="detail">{m.detail}</span>
                  </span>
                  <Level value={m.level} unit="%" />
                </button>
              ))}

              <div className="tile tile-bright">
                <svg className="tile-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M19.4 4.6l-1.8 1.8M6.4 17.6l-1.8 1.8"/></svg>
                <input
                  type="range"
                  min="15"
                  max="100"
                  value={bright}
                  aria-label="Studio brightness"
                  onChange={(e) => handleBright(e.target.value)}
                />
                <span className="bright-label">Brightness</span>
              </div>
            </div>
          </div>
          <p className="v3-hint">{HINTS[hintIdx]}</p>
        </section>
      </div>

      <nav className="v3-versions" aria-label="Other portfolio versions">
        <a href="/">v2 · default</a>
        <a href="/v1">v1 · 3d</a>
      </nav>
      <p className="v3-credit">v3 · studio glass edition</p>

      {drawer && (
        <div className="v3-drawer-backdrop" role="dialog" aria-modal="true" aria-label="Everything else" onClick={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <div className="v3-drawer">
            <header>
              <h2>Everything else</h2>
              <button type="button" className="drawer-close" aria-label="Close" onClick={() => setDrawer(false)}>×</button>
            </header>
            <div className="drawer-cols">
              <section>
                <h3>Projects</h3>
                <ul>
                  {PROJECTS.filter((p) => !p.internal).map((p) => (
                    <li key={p.slug}>
                      {p.href ? (
                        <a href={p.href} target="_blank" rel="noopener">
                          <strong>{p.title}</strong>
                          <span>{p.kind}</span>
                        </a>
                      ) : (
                        <span>
                          <strong>{p.title}</strong>
                          <span>{p.kind}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Experience</h3>
                <ul>
                  {JOBS.map((j) => (
                    <li key={j.company}>
                      <span>
                        <strong>{j.title} · {j.company}</strong>
                        <span>{j.from} — {j.to}{j.length ? ` · ${j.length}` : ""}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <h3>Contact</h3>
                <ul>
                  <li><a href={`mailto:${PROFILE.email}`}><strong>{PROFILE.email}</strong><span>email</span></a></li>
                  <li><a href={PROFILE.github} target="_blank" rel="noopener"><strong>GitHub</strong><span>dayumcodes</span></a></li>
                  <li><a href={PROFILE.linkedin} target="_blank" rel="noopener"><strong>LinkedIn</strong><span>mohammed-fuzail-2k24</span></a></li>
                  <li><a href={PROFILE.x} target="_blank" rel="noopener"><strong>X</strong><span>mazino213</span></a></li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
