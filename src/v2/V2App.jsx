import React, { useEffect, useRef, useState } from "react";
import Intro from "./Intro.jsx";
import Fish from "./Fish.jsx";

const JOBS = [
  {
    company: "techzoetic",
    title: "software engineer",
    range: "aug 2024 - present",
    points: [
      "ride-hailing platform: react native apps, next.js dashboards, node/express api + websocket tracking on azure",
      "creator marketplace: react + typescript, stripe connect payouts, openai gpt tooling",
      "power apps + dynamics 365 crm solutions, c# plugins, power automate + azure functions",
    ],
  },
  {
    company: "infosys",
    title: "system engineer",
    range: "mar 2022 - jul 2024 · 2 yrs 5 mos",
    points: [
      "automated power platform deployments with azure devops pipelines, cli + powershell",
      "custom connectors and flows moving data between d365 crm and external rest apis",
      "power pages portals with liquid templates, web roles and secure forms",
    ],
  },
];

const PROJECTS = [
  {
    name: "RampRush",
    kind: "co-founder · three.js racer",
    link: "https://tryramprush.com",
    img: "/v2/cards/ramprush.jpg",
  },
  {
    name: "Orbit",
    kind: "ai chat workspace",
    link: "https://orbit-chat-po6w.onrender.com",
    img: "/v2/cards/orbit.jpg",
  },
  {
    name: "Windshield HUD",
    kind: "react · geolocation",
    link: "https://windshield-hud.vercel.app",
    img: "/v2/cards/hud.jpg",
  },
  {
    name: "Portfolio v1",
    kind: "the old 3d portfolio",
    link: "/v1",
    img: "/v2/cards/v1.jpg",
  },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function Experience() {
  const [active, setActive] = useState(0);
  const manualAt = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - manualAt.current > 7000) {
        setActive((a) => (a + 1) % JOBS.length);
      }
    }, 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="v2-exp">
      <div className="v2-exp-title">~/experience</div>
      {JOBS.map((job, i) => {
        const open = i === active;
        const last = i === JOBS.length - 1;
        return (
          <div className={"v2-job" + (open ? " open" : "")} key={job.company}>
            <button
              className="v2-job-head"
              onClick={() => {
                manualAt.current = Date.now();
                setActive(open ? -1 : i);
              }}
            >
              <span className="v2-faint">{open ? (last ? "└─> " : "├─> ") : last ? "└── " : "├── "}</span>
              <span className="v2-company">{job.company}/</span>
              <span className="v2-plus">{open ? " [-]" : " [+]"}</span>
            </button>
            {open && (
              <div className="v2-job-body">
                <div className="v2-job-meta">
                  <span>{job.title}</span>
                  <span className="v2-faint">{job.range}</span>
                </div>
                <ul>
                  {job.points.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
      <div className="v2-exp-foot">{JOBS.length} companies · since 2022</div>
    </div>
  );
}

function Contact() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText("mfuzail7820@gmail.com");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = "mailto:mfuzail7820@gmail.com";
    }
  };

  return (
    <nav className={"v2-contact" + (open ? " open" : "")}>
      <button className="v2-contact-head" onClick={() => setOpen((o) => !o)}>
        {copied ? "copied" : "contact"} <span className="v2-chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="v2-contact-menu">
          <button onClick={copyEmail}>mfuzail7820@gmail.com</button>
          <a href="https://github.com/dayumcodes" target="_blank" rel="noreferrer">
            github ↗
          </a>
          <a href="https://www.linkedin.com/in/mohammed-fuzail-2k24" target="_blank" rel="noreferrer">
            linkedin ↗
          </a>
          <a href="https://x.com/mazino213" target="_blank" rel="noreferrer">
            x ↗
          </a>
        </div>
      )}
    </nav>
  );
}

function Scene() {
  const stripRef = useRef(null);
  const cardRefs = useRef([]);
  const scrubRef = useRef(null);
  const headerRef = useRef(null);
  const progress = useRef(0);
  const target = useRef(0);
  const mouse = useRef({ x: 0, y: 0 });
  const N = PROJECTS.length;

  useEffect(() => {
    let raf;
    const onMouse = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onWheel = (e) => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      target.current = clamp(target.current + d * 0.0016, 0, N - 1);
    };
    const onKey = (e) => {
      if (e.key === "ArrowRight") target.current = clamp(Math.round(target.current) + 1, 0, N - 1);
      if (e.key === "ArrowLeft") target.current = clamp(Math.round(target.current) - 1, 0, N - 1);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);

    const loop = () => {
      progress.current += (target.current - progress.current) * 0.12;
      const p = progress.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const narrow = vw < 860;
      const CW = narrow ? Math.min(vw * 0.7, 250) : Math.min(vw * 0.34, 470);
      const SP = narrow ? vw * 0.88 : Math.max(CW + 70, vw * 0.16 + CW * 0.55);
      const fx = (narrow ? vw * 0.5 : vw * 0.66) - CW / 2 + mouse.current.x * 16;
      const fy = narrow ? vh * 0.7 : vh * 0.47 + mouse.current.y * 9;

      if (stripRef.current) {
        stripRef.current.style.transform = `translate3d(${fx - p * SP}px, ${fy}px, 0)`;
      }
      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        const d = i - p;
        const ad = Math.abs(d);
        const ry = clamp(-d * 42, -52, 52);
        const tz = -Math.min(ad, 2.4) * 200;
        const sc = 1 - Math.min(ad, 2.4) * 0.09;
        el.style.width = CW + "px";
        el.style.transform = `translate3d(${i * SP}px, -50%, ${tz}px) rotateY(${ry}deg) scale(${sc})`;
        el.style.opacity = String(Math.max(0.3, 1 - ad * 0.36));
        el.style.zIndex = String(200 - Math.round(ad * 10));
        el.style.filter = ad < 0.12 ? "none" : `brightness(${Math.max(0.5, 1 - ad * 0.26)})`;
      });
      if (scrubRef.current && document.activeElement !== scrubRef.current) {
        scrubRef.current.value = String(Math.round(p * 100));
      }
      if (headerRef.current) {
        headerRef.current.style.transform = `translate3d(${mouse.current.x * -12}px, calc(-50% + ${mouse.current.y * -7}px), 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [N]);

  return (
    <main className="v2-main">
      <div className="v2-stage-light" />
      <div className="v2-grain" />
      <Fish />

      <header className="v2-header" ref={headerRef}>
        <div className="v2-signature" aria-hidden="true">
          Fuzail
        </div>
        <div className="v2-id">
          <img className="v2-avatar" src="https://github.com/dayumcodes.png" alt="Mohammed Fuzail" />
          <div>
            <h1 className="v2-name">Mohammed Fuzail</h1>
            <p className="v2-role">Full-Stack Developer &amp; AI Engineer</p>
          </div>
        </div>
        <p className="v2-bio">
          I <span className="v2-pill">◈ build products</span>,{" "}
          <span className="v2-pill">&lt;/&gt; write code</span>, and occasionally wire{" "}
          <span className="v2-pill">✦ AI</span> into things people actually use.
        </p>
        <Experience />
      </header>

      <div className="v2-strip" ref={stripRef}>
        {PROJECTS.map((p, i) => (
          <a
            key={p.name}
            ref={(el) => (cardRefs.current[i] = el)}
            className="v2-card"
            href={p.link}
            target={p.link.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
          >
            <span className="v2-card-media">
              <img src={p.img} alt={p.name} draggable={false} />
            </span>
            <span className="v2-card-meta">
              <b>{p.name}</b>
              <i>{p.kind}</i>
            </span>
          </a>
        ))}
      </div>

      <div className="v2-scrub">
        <input
          ref={scrubRef}
          className="v2-range"
          type="range"
          min={0}
          max={(N - 1) * 100}
          defaultValue={0}
          onInput={(e) => {
            target.current = clamp(Number(e.target.value) / 100, 0, N - 1);
          }}
          aria-label="Browse projects"
        />
        <div className="v2-ticks">
          {PROJECTS.map((_, i) => (
            <span key={i}>0{i}</span>
          ))}
        </div>
      </div>

      <Contact />
      <div className="v2-foot">
        © 2026 mohammed fuzail · <a href="/v1">v1</a>
      </div>
      <div className="v2-fadein" />
    </main>
  );
}

export default function V2App() {
  const [entered, setEntered] = useState(false);
  return (
    <div className="v2-root">
      {entered && <Scene />}
      {!entered && <Intro onDone={() => setEntered(true)} />}
    </div>
  );
}
