import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILE, PROJECTS } from "../v2/data.js";

const MOODS = [
  { id: "morning", label: "Morning", detail: "Soft sun through the window", level: 78, icon: "✒️", slot: "hero" },
  { id: "thunderstorm", label: "Thunderstorm", detail: "Rain on glass", level: 36, icon: "⌁", slot: "wide" },
  { id: "afternoon", label: "Afternoon", detail: "High sun, clear daylight", level: 100, icon: "☼", slot: "small" },
  { id: "sunset", label: "Sunset", detail: "Low amber light", level: 64, icon: "⌛", slot: "wide" },
  { id: "night", label: "Night", detail: "Lamp and monitor glow", level: 22, icon: "◖", slot: "small" },
];
const FEATURED = ["ramprush", "orbit", "windshield-hud", "calorie-tracker-ai"];
const PROFILE_IMAGE = "/v2/avatar.png";
const PROJECT_IMAGES = {
  ramprush: "/v2/cards/ramprush.jpg",
  orbit: "/v2/cards/orbit.jpg",
  "windshield-hud": "/v2/cards/hud.jpg",
  "calorie-tracker-ai": "/v2/cards/calorie-ai.jpg",
};

function setTilt(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  event.currentTarget.style.setProperty("--card-rx", `${(0.5 - y) * 5}deg`);
  event.currentTarget.style.setProperty("--card-ry", `${(x - 0.5) * 6}deg`);
}
function clearTilt(event) {
  event.currentTarget.style.setProperty("--card-rx", "0deg");
  event.currentTarget.style.setProperty("--card-ry", "0deg");
}

export default function V3App() {
  const frameRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const brightnessDragRef = useRef(null);
  const movedRef = useRef(false);
  const tiltTimerRef = useRef(null);
  const [mood, setMood] = useState("morning");
  const [brightness, setBrightness] = useState(78);
  const [workOpen, setWorkOpen] = useState(false);
  const [cardsHidden, setCardsHidden] = useState(false);
  const projects = useMemo(
    () => FEATURED.map((slug) => PROJECTS.find((project) => project.slug === slug)).filter(Boolean),
    [],
  );

  useEffect(() => {
    document.title = `${PROFILE.name} — portfolio`;
    const onKeyDown = (event) => { if (event.key === "Escape") setWorkOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Drive the original Studio Glass lighting controls inside the same-origin scene.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    let attempts = 0;
    let timer;
    const applyLighting = () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return false;
        const target = MOODS.find((item) => item.id === mood);
        const button = [...doc.querySelectorAll("#studio-controls button[aria-label]")]
          .find((item) => item.getAttribute("aria-label").startsWith(`${target.label},`));
        if (!button) return false;
        button.click();
        const slider = doc.querySelector('#studio-controls input[type="range"]');
        if (slider) {
          const setter = Object.getOwnPropertyDescriptor(frame.contentWindow.HTMLInputElement.prototype, "value")?.set;
          setter?.call(slider, String(brightness));
          slider.dispatchEvent(new frame.contentWindow.Event("input", { bubbles: true }));
          slider.dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        }
        return true;
      } catch {
        return false;
      }
    };
    const retry = () => {
      if (applyLighting() || attempts++ > 20) clearInterval(timer);
    };
    frame.addEventListener("load", retry);
    timer = window.setInterval(retry, 250);
    retry();
    return () => { clearInterval(timer); frame.removeEventListener("load", retry); };
  }, [mood, brightness]);

  const chooseMood = (item) => {
    setMood(item.id);
    setBrightness(item.level);
  };
  const setBrightnessFromPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    setBrightness(Math.round(100 - progress * 85));
  };
  const startBrightnessDrag = (event) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    brightnessDragRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setBrightnessFromPointer(event);
  };
  const moveBrightnessDrag = (event) => {
    if (brightnessDragRef.current !== event.pointerId) return;
    event.preventDefault();
    setBrightnessFromPointer(event);
  };
  const endBrightnessDrag = (event) => {
    if (brightnessDragRef.current === event.pointerId) brightnessDragRef.current = null;
  };
  const openProject = (project) => {
    if (project.internal) window.location.assign(project.internal);
    else if (project.href) window.open(project.href, "_blank", "noopener,noreferrer");
  };

  const setPanelOffset = (x, y) => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty("--panel-x", `${x}px`);
    panel.style.setProperty("--panel-y", `${y}px`);
  };
  const onHandleDown = (event) => {
    if (event.button !== 0 || !panelRef.current) return;
    const panel = panelRef.current;
    const x = Number.parseFloat(getComputedStyle(panel).getPropertyValue("--panel-x")) || 0;
    const y = Number.parseFloat(getComputedStyle(panel).getPropertyValue("--panel-y")) || 0;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, lastX: event.clientX, lastTime: performance.now(), velocity: 0 };
    movedRef.current = false;
    panel.dataset.moving = "true";
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onHandleMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const panel = panelRef.current;
    const rect = panel.getBoundingClientRect();
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    movedRef.current ||= Math.abs(dx) + Math.abs(dy) > 4;
    const minX = 24 - (rect.left - dx);
    const maxX = window.innerWidth - 24 - (rect.right - dx);
    const minY = 10 - (rect.top - dy);
    const maxY = window.innerHeight - 10 - (rect.bottom - dy);
    const x = Math.min(maxX, Math.max(minX, drag.x + dx));
    const y = Math.min(maxY, Math.max(minY, drag.y + dy));
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    drag.velocity = (event.clientX - drag.lastX) / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;
    setPanelOffset(x, y);
  };
  const onHandleUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const panel = panelRef.current;
    if (panel) {
      delete panel.dataset.moving;
      if (movedRef.current) {
        panel.style.setProperty("--panel-tilt", `${Math.max(-1.4, Math.min(1.4, drag.velocity * 24))}deg`);
        clearTimeout(tiltTimerRef.current);
        tiltTimerRef.current = window.setTimeout(() => panel.style.setProperty("--panel-tilt", "0deg"), 450);
      } else {
        setPanelOffset(0, 0);
      }
    }
  };
  const onHandleKeyDown = (event) => {
    const step = event.shiftKey ? 32 : 12;
    const panel = panelRef.current;
    if (!panel) return;
    const x = Number.parseFloat(getComputedStyle(panel).getPropertyValue("--panel-x")) || 0;
    const y = Number.parseFloat(getComputedStyle(panel).getPropertyValue("--panel-y")) || 0;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Home") { setPanelOffset(0, 0); event.preventDefault(); return; }
    if (moves[event.key]) {
      setPanelOffset(x + moves[event.key][0], y + moves[event.key][1]);
      event.preventDefault();
    }
  };

  return (
    <main className="portfolio-glass">
      <iframe
        ref={frameRef}
        className="portfolio-scene"
        src="/studio-glass.html?view=room"
        title="Interactive studio room"
        allow="fullscreen"
      />
      <div className="scene-shade" aria-hidden="true" />
      <div className={`rain-overlay${mood === "thunderstorm" ? " is-active" : ""}`} aria-hidden="true" />

      <section ref={panelRef} className="portfolio-panel" aria-label="Mohammed Fuzail portfolio">
        <header className="portfolio-heading">
          <h1><button className="panel-handle" type="button" aria-label="Drag portfolio panel. Use arrow keys to move; Home to reset." onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={onHandleKeyDown} onClick={(event) => { if (movedRef.current) event.preventDefault(); else setPanelOffset(0, 0); movedRef.current = false; }}>{PROFILE.name}<span className="heading-grip" aria-hidden="true">⠿</span></button></h1>
          <button className="heading-mark" type="button" aria-expanded={!cardsHidden} aria-controls="portfolio-card-content" aria-label={cardsHidden ? "Show portfolio cards" : "Hide portfolio cards"} onClick={() => setCardsHidden((hidden) => !hidden)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 17h14"/><circle cx="9" cy="7" r="2.2"/><circle cx="15" cy="17" r="2.2"/></svg>
          </button>
        </header>

        <div className={`portfolio-body${cardsHidden ? " is-collapsed" : ""}`} id="portfolio-card-content" aria-hidden={cardsHidden} inert={cardsHidden}>
        <div className="portfolio-grid" aria-label="Featured portfolio projects">
          <article className="glass-card profile-card" onPointerMove={setTilt} onPointerLeave={clearTilt}>
            <img className="profile-avatar" src={PROFILE_IMAGE} alt="" />
            <span className="profile-years">4.5<small>yrs</small></span>
            <div className="profile-copy">
              <h2>{PROFILE.tagline}</h2>
              <p>builds with AI, ships for real users</p>
            </div>
            <span className="card-glow" aria-hidden="true" />
          </article>

          {projects.map((project, index) => (
            <button
              className={`glass-card project-card project-${project.slug}`}
              type="button"
              key={project.slug}
              style={{ "--card-delay": `${index * 70}ms`, "--card-image": `url("${PROJECT_IMAGES[project.slug] || project.image}")` }}
              onPointerMove={setTilt}
              onPointerLeave={clearTilt}
              onClick={() => openProject(project)}
            >
              <img src={PROJECT_IMAGES[project.slug] || project.image} alt="" draggable="false" />
              <span className="project-live">{project.href ? "live" : "case"}</span>
              <span className="project-copy">
                <strong>{project.title}</strong>
                <small>{project.kind}</small>
              </span>
              <span className="card-glow" aria-hidden="true" />
            </button>
          ))}

          <button className="glass-card more-card" type="button" onClick={() => setWorkOpen(true)} onPointerMove={setTilt} onPointerLeave={clearTilt}>
            <span className="more-icon" aria-hidden="true">▦</span>
            <span className="project-live">all</span>
            <span className="more-copy"><strong>Everything else</strong><small>projects, experience, contact</small></span>
            <span className="card-glow" aria-hidden="true" />
          </button>
        </div>

        <p className="lighting-label">Studio lighting</p>
        <div className="lighting-grid" role="group" aria-label="Studio lighting presets">
          {MOODS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`glass-card mood-card mood-${item.id} slot-${item.slot}${mood === item.id ? " is-selected" : ""}`}
              aria-pressed={mood === item.id}
              onClick={() => chooseMood(item)}
              onPointerMove={setTilt}
              onPointerLeave={clearTilt}
            >
              <span className="mood-icon" aria-hidden="true">{item.icon}</span>
              <span className="mood-level">{brightness === item.level && mood === item.id ? brightness : item.level}<small>%</small></span>
              <span className="mood-copy"><strong>{item.label}</strong>{item.detail && <small>{item.detail}</small>}</span>
              {mood === item.id && <span className="selected-check" aria-hidden="true">✓</span>}
              <span className="card-glow" aria-hidden="true" />
            </button>
          ))}
          <label className="glass-card brightness-card" style={{ "--brightness-fill": `${((brightness - 15) / 85) * 64}%`, "--brightness-ink": brightness >= 55 ? "#34362f" : "#fbfaf5" }} onPointerDown={startBrightnessDrag} onPointerMove={moveBrightnessDrag} onPointerUp={endBrightnessDrag} onPointerCancel={endBrightnessDrag}>
            <span className="brightness-cap" aria-hidden="true" />
            <span className="sun-icon" aria-hidden="true">☼</span>
            <input
              type="range"
              min="15"
              max="100"
              value={brightness}
              aria-label="Studio brightness"
              onChange={(event) => setBrightness(Number(event.target.value))}
            />
            <span className="brightness-name">Brightness</span>
          </label>
        </div>
        </div>
      </section>

      {workOpen && (
        <div className="work-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setWorkOpen(false)}>
          <section className="work-dialog" role="dialog" aria-modal="true" aria-labelledby="work-title">
            <header className="work-header">
              <div><p className="portfolio-eyebrow">A FEW THINGS I’VE BUILT</p><h2 id="work-title">Selected work</h2></div>
              <button className="work-close" type="button" aria-label="Close selected work" onClick={() => setWorkOpen(false)}>×</button>
            </header>
            <div className="work-grid">
              {PROJECTS.filter((project) => !FEATURED.includes(project.slug) && !project.internal).map((project, index) => (
                <button className="work-card" type="button" key={project.slug} onClick={() => openProject(project)}>
                  <span className="work-image-wrap"><img src={project.image} alt="" loading="lazy" /><span className="work-index">0{index + 1}</span><span className="work-arrow" aria-hidden="true">↗</span></span>
                  <span className="work-copy"><strong>{project.title}</strong><span>{project.kind}</span><span className="work-summary">{project.summary}</span></span>
                </button>
              ))}
            </div>
            <footer className="work-footer"><span>More on GitHub</span><a href={PROFILE.github} target="_blank" rel="noreferrer">@dayumcodes ↗</a><a href={`mailto:${PROFILE.email}`}>Email me ↗</a></footer>
          </section>
        </div>
      )}
    </main>
  );
}
