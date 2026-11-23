import { useEffect, useRef, useState } from "react";
import { mountStudio } from "./scene.js";
import { PROFILE, JOBS, PROJECTS } from "../v2/data.js";

// v3 "studio glass": a floating frosted-glass control panel over a code-built
// studio scene. Inspired by the mood of threeui.com/studio-glass; implemented
// independently with Fuzail's real content.

const MOOD_LIST = [
  { id: "morning", label: "Morning", hint: "soft sun through the window" },
  { id: "afternoon", label: "Afternoon", hint: "bright working light" },
  { id: "sunset", label: "Sunset", hint: "low amber light" },
  { id: "night", label: "Night", hint: "lamp and monitor glow" },
];

const TILE_SLUGS = ["ramprush", "orbit", "windshield-hud", "calorie-tracker-ai"];

const ICONS = {
  ramprush: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M6 17l1.5-5h7L17 8h3l-1.5 4.5M7 20a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 20Zm10 0a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 17 20Z"/></svg>
  ),
  orbit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16v9H9l-5 4V6Z"/><path d="M8 10.5h8M8 13h5"/></svg>
  ),
  "windshield-hud": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17a9 9 0 1 1 16 0"/><path d="M12 17l3.5-5"/><circle cx="12" cy="17" r="1.4"/></svg>
  ),
  "calorie-tracker-ai": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 0 0 16 0Z"/><path d="M12 12V6M12 6c-2 0-3-1.5-3-3 2 0 3 1.5 3 3Zm0 0c2 0 3-1.5 3-3-2 0-3 1.5-3 3Z"/></svg>
  ),
  more: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>
  ),
};

function Tile({ project, onOpen }) {
  const corner = project.href ? "live" : "case";
  return (
    <button type="button" className={`tile tile-${project.slug}`} onClick={() => onOpen(project)} aria-label={`${project.title} — ${project.kind}`}>
      <span className="tile-icon" aria-hidden="true">{ICONS[project.slug] || ICONS.more}</span>
      <span className="tile-corner">{corner}</span>
      <span className="tile-text">
        <span className="tile-name">{project.title}</span>
        <span className="tile-detail">{project.kind}</span>
      </span>
    </button>
  );
}

export default function V3App() {
  const canvasRef = useRef(null);
  const studioRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [mood, setMood] = useState("morning");
  const [bright, setBright] = useState(82);
  const [open, setOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    document.title = "Mohammed Fuzail — studio glass";
    const studio = mountStudio(canvasRef.current, {
      images: ["/v2/cards/ramprush.jpg", "/v2/cards/calorie-ai.jpg", "/v2/cards/hud.jpg", "/v2/cards/orbit.jpg"],
    });
    studioRef.current = studio;
    const q = new URLSearchParams(location.search);
    if (q.get("mood")) handleMood(q.get("mood"));
    if (q.get("bright")) handleBright(Number(q.get("bright")));
    return () => studio.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMood = (m) => {
    setMood(m);
    studioRef.current?.setMood(m);
  };
  const handleBright = (v) => {
    const n = Math.min(100, Math.max(15, Math.round(v)));
    setBright(n);
    studioRef.current?.setBrightness(n / 100);
  };

  // drag the panel by its title, like the reference's lighting panel
  const onHandleDown = (e) => {
    const panel = panelRef.current;
    if (!panel) return;
    dragRef.current = {
      x: e.clientX, y: e.clientY,
      px: parseFloat(panel.style.getPropertyValue("--panel-x")) || 0,
      py: parseFloat(panel.style.getPropertyValue("--panel-y")) || 0,
    };
    panel.setAttribute("data-moving", "");
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onHandleMove = (e) => {
    const d = dragRef.current;
    const panel = panelRef.current;
    if (!d || !panel) return;
    const nx = Math.min(innerWidth * 0.4, Math.max(-innerWidth * 0.4, d.px + e.clientX - d.x));
    const ny = Math.min(innerHeight * 0.5, Math.max(-40, d.py + e.clientY - d.y));
    panel.style.setProperty("--panel-x", `${nx}px`);
    panel.style.setProperty("--panel-y", `${ny}px`);
  };
  const onHandleUp = () => {
    dragRef.current = null;
    panelRef.current?.removeAttribute("data-moving");
  };

  const openProject = (p) => {
    if (p.internal) location.href = p.internal;
    else if (p.href) window.open(p.href, "_blank", "noopener");
    else setDrawer(true);
  };

  const tiles = TILE_SLUGS.map((s) => PROJECTS.find((p) => p.slug === s)).filter(Boolean);
  const moodHint = MOOD_LIST.find((m) => m.id === mood)?.hint;

  return (
    <div className={`v3 m-${mood}`} data-collapsed={open ? undefined : ""}>
      <canvas ref={canvasRef} className="v3-canvas" aria-hidden="true" />
      <div className="v3-tint" aria-hidden="true" style={{ opacity: (1 - bright / 100) * 0.8 }} />

      <div className="v3-coords">
        <section className="v3-panel" ref={panelRef} aria-label="Portfolio controls">
          <header className="v3-heading">
            <h1>
              <button
                type="button"
                className="v3-handle"
                title="Drag to move the panel"
                onPointerDown={onHandleDown}
                onPointerMove={onHandleMove}
                onPointerUp={onHandleUp}
                onPointerCancel={onHandleUp}
              >
                {PROFILE.name}
              </button>
            </h1>
            <button type="button" className="v3-toggle" aria-expanded={open} aria-label={open ? "Hide panels" : "Show panels"} onClick={() => setOpen(!open)}>
              <span aria-hidden="true" />
            </button>
          </header>

          {open && (
            <>
              <div className="v3-grid">
                <div className="tile tile-profile">
                  <span className="tile-top">
                    <img className="tile-avatar" src={PROFILE.avatar} alt="" draggable="false" />
                    <span className="tile-corner">about</span>
                  </span>
                  <span className="moods" role="group" aria-label="Studio lighting presets">
                    {MOOD_LIST.map((m) => (
                      <button key={m.id} type="button" className={`mood mood-${m.id}`} aria-pressed={mood === m.id} title={`${m.label} — ${m.hint}`} onClick={() => handleMood(m.id)}>
                        <span aria-hidden="true" />
                        {m.label}
                      </button>
                    ))}
                  </span>
                  <span className="tile-text">
                    <span className="tile-name">{PROFILE.tagline}</span>
                    <span className="tile-detail">4.5 yrs · builds with AI, ships for real users</span>
                  </span>
                </div>

                <Tile project={tiles[0]} onOpen={openProject} />
                <Tile project={tiles[1]} onOpen={openProject} />
                <Tile project={tiles[2]} onOpen={openProject} />

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

                <button type="button" className="tile tile-more" onClick={() => setDrawer(true)} aria-label="Everything else — projects, experience, contact">
                  <span className="tile-icon" aria-hidden="true">{ICONS.more}</span>
                  <span className="tile-corner">all</span>
                  <span className="tile-text">
                    <span className="tile-name">Everything else</span>
                    <span className="tile-detail">projects, experience, contact</span>
                  </span>
                </button>

                <Tile project={tiles[3]} onOpen={openProject} />
              </div>
              <p className="v3-hint">{moodHint} · drag my name to move this panel</p>
            </>
          )}
        </section>
      </div>

      <nav className="v3-versions" aria-label="Other portfolio versions">
        <a href="/">v2 · default</a>
        <a href="/v1">v1 · 3d</a>
      </nav>
      <p className="v3-credit">v3 · studio glass edition</p>

      {drawer && (
        <div className="v3-drawer-backdrop" onClick={() => setDrawer(false)}>
          <section className="v3-drawer" aria-label="All projects and contact" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>Everything else</h2>
              <button type="button" className="drawer-close" onClick={() => setDrawer(false)} aria-label="Close">×</button>
            </header>
            <div className="drawer-cols">
              <div>
                <h3>Projects</h3>
                <ul>
                  {PROJECTS.map((p) => (
                    <li key={p.slug}>
                      {p.internal || p.href ? (
                        <a href={p.internal || p.href} target={p.internal ? "_self" : "_blank"} rel="noopener noreferrer">
                          <strong>{p.title}</strong>
                          <span>{p.kind}</span>
                        </a>
                      ) : (
                        <span><strong>{p.title}</strong><span>{p.kind}</span></span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Experience</h3>
                <ul>
                  {JOBS.map((j) => (
                    <li key={j.company}><span><strong>{j.company}</strong><span>{j.title} · {j.from} — {j.to}</span></span></li>
                  ))}
                </ul>
                <h3>Contact</h3>
                <ul>
                  <li><a href={`mailto:${PROFILE.email}`}><strong>{PROFILE.email}</strong><span>email</span></a></li>
                  <li><a href={PROFILE.github} target="_blank" rel="noopener noreferrer"><strong>dayumcodes</strong><span>github</span></a></li>
                  <li><a href={PROFILE.linkedin} target="_blank" rel="noopener noreferrer"><strong>mohammed-fuzail-2k24</strong><span>linkedin</span></a></li>
                  <li><a href={PROFILE.x} target="_blank" rel="noopener noreferrer"><strong>@mazino213</strong><span>x</span></a></li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
