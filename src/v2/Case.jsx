import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PROJECTS } from "./data.js";

const EASE = "cubic-bezier(0.7, 0, 0.2, 1)";
const DUR = 1050;
const html = () => document.documentElement;

function rich(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((s, i) => (s.startsWith("**") ? <strong key={i}>{s.slice(2, -2)}</strong> : s));
}

function Block({ b }) {
  switch (b.type) {
    case "heading":
      return <h3 className="pv-h">{b.text}</h3>;
    case "p":
      return <p className="pv-p">{rich(b.text)}</p>;
    case "list":
      return (
        <ul className="pv-list">
          {b.items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      );
    case "glass":
      return (
        <div className="pv-glass">
          <div className="pv-glass-card">
            <span className="pv-glass-sheen" aria-hidden="true" />
            <span className="pv-glass-mark" aria-hidden="true">
              “
            </span>
            <p>{rich(b.text)}</p>
          </div>
        </div>
      );
    case "link":
      return (
        <p className="pv-p">
          <a className="pv-link" href={b.href} target="_blank" rel="noopener noreferrer">
            {b.text} ↗
          </a>
        </p>
      );
    default:
      return null;
  }
}

export default function CaseStudy() {
  const [slug, setSlug] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [revealed, setRevealed] = useState(false);
  const flyer = useRef(null);
  const hero = useRef(null);
  const source = useRef(null);
  const scroller = useRef(null);
  const busy = useRef(false);

  const project = PROJECTS.find((p) => p.slug === slug && p.story);

  const open = useCallback((index, media, push = true) => {
    const p = PROJECTS[index];
    if (!p || !p.story || busy.current) return;
    busy.current = true;
    source.current = media || null;
    html().dataset.projectMotion = "";
    html().dataset.project = "open";
    setSlug(p.slug);
    setPhase("opening");
    if (push) history.pushState({ project: p.slug }, "", `/projects/${p.slug}`);
  }, []);

  const close = useCallback((fromPop = false) => {
    if (busy.current || phase !== "open") return;
    busy.current = true;
    setPhase("closing");
    setRevealed(false);
    if (!fromPop && location.pathname.startsWith("/projects/")) history.pushState({}, "", "/");
  }, [phase]);

  // FLIP open
  useLayoutEffect(() => {
    if (phase !== "opening") return;
    const f = flyer.current;
    const h = hero.current;
    if (!f || !h) return;
    const to = h.getBoundingClientRect();
    const from = source.current?.getBoundingClientRect() || { left: to.left, top: to.top + 40, width: to.width, height: to.height };
    f.style.left = to.left + "px";
    f.style.top = to.top + "px";
    f.style.width = to.width + "px";
    f.style.height = to.height + "px";
    f.style.transformOrigin = "0 0";
    const tf = `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const a = f.animate([{ transform: tf }, { transform: "none" }], { duration: reduce ? 1 : DUR, easing: EASE, fill: "both" });
    const t = setTimeout(() => setRevealed(true), reduce ? 0 : DUR * 0.45);
    a.onfinish = () => {
      f.setAttribute("data-landed", "");
      h.setAttribute("data-landed", "");
      busy.current = false;
      setPhase("open");
    };
    return () => clearTimeout(t);
  }, [phase]);

  // FLIP close
  useLayoutEffect(() => {
    if (phase !== "closing") return;
    const f = flyer.current;
    const h = hero.current;
    if (!f || !h) return;
    const from = h.getBoundingClientRect();
    const to = source.current?.getBoundingClientRect();
    f.removeAttribute("data-landed");
    h.removeAttribute("data-landed");
    delete html().dataset.project;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    f.style.left = from.left + "px";
    f.style.top = from.top + "px";
    f.style.width = from.width + "px";
    f.style.height = from.height + "px";
    const tf = to ? `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})` : "scale(0.9)";
    const a = f.animate([{ transform: "none" }, { transform: tf, opacity: to ? 1 : 0 }], { duration: reduce ? 1 : DUR, easing: EASE, fill: "both" });
    a.onfinish = () => {
      setSlug(null);
      setPhase("idle");
      delete html().dataset.projectMotion;
      busy.current = false;
    };
  }, [phase]);

  useEffect(() => {
    const onOpen = (e) => open(e.detail.index, e.detail.image);
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onPop = () => {
      const m = location.pathname.match(/^\/projects\/([^/]+)/);
      if (m) {
        const i = PROJECTS.findIndex((p) => p.slug === m[1]);
        if (i >= 0 && phase === "idle") open(i, null, false);
      } else if (phase === "open") close(true);
    };
    addEventListener("project:open", onOpen);
    addEventListener("keydown", onKey);
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("project:open", onOpen);
      removeEventListener("keydown", onKey);
      removeEventListener("popstate", onPop);
    };
  }, [open, close, phase]);

  // deep link
  useEffect(() => {
    const m = location.pathname.match(/^\/projects\/([^/]+)/);
    if (!m) return;
    const i = PROJECTS.findIndex((p) => p.slug === m[1]);
    if (i < 0) return;
    const wait = setInterval(() => {
      if (html().dataset.intro === "done") {
        clearInterval(wait);
        open(i, null, false);
      }
    }, 120);
    return () => clearInterval(wait);
  }, [open]);

  useEffect(() => {
    if (phase === "idle") return;
    const n = scroller.current;
    n?.focus({ preventScroll: true });
  }, [phase]);

  if (!project) return null;
  const ri = (n) => ({ className: "pv-reveal", "data-in": "", style: { "--delay": 0.35 + n * 0.08 + "s" } });

  return (
    <div className="pv" data-phase={phase} {...(revealed ? { "data-revealed": "" } : {})} role="dialog" aria-modal="true" aria-label={project.title}>
      <div
        className="pv-scroll"
        ref={scroller}
        tabIndex={-1}
        onClick={(e) => {
          if (!e.target.closest(".pv-column > *")) close();
        }}
      >
        <div className="pv-topbar">
          <span />
          <button type="button" onClick={() => close()}>
            close · esc
          </button>
        </div>
        <div className="pv-column">
          <div className="pv-hero" ref={hero}>
            <img src={project.image} alt="" />
          </div>
          <div className="pv-head">
            <p {...ri(0)}>
              <span>{project.kind}</span>
            </p>
            <h2 {...ri(1)}>{project.headline}</h2>
            <p className="pv-summary pv-reveal" data-in="" style={{ "--delay": "0.55s" }}>
              {project.summary}
            </p>
          </div>
          <dl className="pv-details pv-reveal" data-in="" style={{ "--delay": "0.65s" }}>
            {project.details.map((d) => (
              <div key={d.label}>
                <dt>{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
          <div className="pv-story pv-reveal" data-in="" style={{ "--delay": "0.75s" }}>
            {project.story.map((b, i) => (
              <Block key={i} b={b} />
            ))}
          </div>
          <div className="pv-foot pv-reveal" data-in="" style={{ "--delay": "0.85s" }}>
            <button type="button" onClick={() => close()}>
              ← back
            </button>
            {project.href ? (
              <a href={project.href} target="_blank" rel="noopener noreferrer">
                visit ↗
              </a>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
      <div className="pv-flyer" ref={flyer}>
        <img src={project.image} alt="" />
      </div>
    </div>
  );
}
