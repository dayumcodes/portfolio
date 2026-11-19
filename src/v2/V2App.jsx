import React, { useEffect, useState } from "react";

const JOBS = [
  {
    company: "techzoetic",
    date: "08/2024 - present",
    title: "Software Engineer",
    points: [
      "Architected a ride-hailing platform: React Native apps, Next.js dashboards, Node.js/Express API and WebSocket tracking on Azure.",
      "Led a creator marketplace build with React + TypeScript, Stripe Connect payouts and OpenAI GPT tooling.",
      "Designed Power Apps and Dynamics 365 CRM solutions for client-facing products, with C# plugins and Power Automate + Azure Functions integrations.",
    ],
  },
  {
    company: "infosys",
    date: "03/2022 - 07/2024",
    title: "System Engineer",
    points: [
      "Automated Power Platform solution deployments across environments with Azure DevOps pipelines, CLI and PowerShell.",
      "Built custom connectors and flows for REST API data exchange between D365 CRM and external systems.",
      "Developed Power Pages portals with Liquid templates, web roles and secure forms.",
    ],
  },
];

const PROJECTS = [
  {
    name: "ramprush",
    desc: "Browser 3D racing game. Co-founded, built with Three.js.",
    link: "https://tryramprush.com",
    tags: "three.js · react · websockets",
  },
  {
    name: "orbit",
    desc: "AI chat web app with multi-model conversations and Google sign-in.",
    link: "https://orbit-chat-po6w.onrender.com",
    tags: "node.js · react · llm apis",
  },
  {
    name: "windshield-hud",
    desc: "In-browser car heads-up display: GPS speed, heading and turn-by-turn directions.",
    link: "https://windshield-hud.vercel.app",
    tags: "react · geolocation · maps",
  },
  {
    name: "attachflow",
    desc: "JavaScript mail extension for moving files between cloud storage and laptop.",
    link: "https://github.com/dayumcodes",
    tags: "javascript · browser extension",
  },
];

const BOOT_LINES = [
  "FUMAIL BIOS v2.0",
  "memory check ......... 640K OK",
  "loading react ......... OK",
  "mounting ~/experience . OK",
  "starting portfolio .... OK",
  "",
];

function Boot({ onDone }) {
  const [lines, setLines] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (lines < BOOT_LINES.length) {
      const t = setTimeout(() => setLines((n) => n + 1), 260);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(t);
  }, [lines]);

  if (gone) return null;
  return (
    <div className="v2-boot" style={{ "--boot-hold": "0.45s" }} onClick={() => setGone(true)}>
      <div>
        {BOOT_LINES.slice(0, lines).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
        <span className="v2-cursor" />
      </div>
    </div>
  );
}

function Job({ job, first }) {
  return (
    <div className="v2-job">
      <details>
        <summary>
          <span className="v2-faint">{first ? "├─> " : "├── "}</span>
          <span className="v2-company">{job.company}/</span>{" "}
          <span className="v2-plus">[+]</span>{" "}
          <span className="v2-date">{job.date}</span>
        </summary>
        <div className="v2-detail-body">
          <span className="v2-jobtitle">{job.title}</span>
          <ul>
            {job.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  );
}

export default function V2App() {
  return (
    <div className="v2-root">
      <Boot />
      <div className="v2-wrap">
        <header className="v2-header">
          <div>
            <span className="v2-prompt">fuzail@india</span>
            <span className="v2-faint">:</span>
            <span className="v2-path">~</span>
            <span className="v2-faint">$</span> whoami
          </div>
          <h1 className="v2-name">Mohammed Fuzail</h1>
          <div className="v2-role">Full-Stack Developer &amp; AI Engineer</div>
          <p className="v2-bio">
            I build full-stack products and wire AI into them. 4.5 years across
            React/Next.js, Node.js and the Microsoft Power Platform, lately
            shipping LLM features that real users talk to.
          </p>
          <nav className="v2-nav">
            <a href="#experience">experience</a>
            <a href="#projects">projects</a>
            <a href="#stack">stack</a>
            <a href="#contact">contact</a>
            <a href="/v1">v1</a>
          </nav>
        </header>

        <section className="v2-section" id="experience">
          <div className="v2-section-title">
            <span className="v2-tilde">~</span>/experience{" "}
            <span className="v2-note">· click a company to expand</span>
          </div>
          <div className="v2-tree">
            {JOBS.map((j, i) => (
              <Job key={j.company} job={j} first={i === 0} />
            ))}
            <div className="v2-tree-foot">
              <span className="v2-faint">└── </span>2 companies · since 2022
            </div>
          </div>
        </section>

        <section className="v2-section" id="projects">
          <div className="v2-section-title">
            <span className="v2-tilde">~</span>/projects{" "}
            <span className="v2-note">· things i build and ship</span>
          </div>
          {PROJECTS.map((p) => (
            <a key={p.name} className="v2-proj" href={p.link} target="_blank" rel="noreferrer">
              <div className="v2-proj-head">
                <span className="v2-proj-name">{p.name}</span>
                <span className="v2-proj-link">{p.link.replace("https://", "")} ↗</span>
              </div>
              <div className="v2-proj-desc">{p.desc}</div>
              <div className="v2-proj-tags">{p.tags}</div>
            </a>
          ))}
        </section>

        <section className="v2-section" id="stack">
          <div className="v2-section-title">
            <span className="v2-tilde">~</span>/stack
          </div>
          <p className="v2-stack">
            <b>daily:</b> react · next.js · node.js · typescript · tailwind
            <br />
            <b>ai:</b> openai api · langchain · vercel ai sdk · prompt eval
            <br />
            <b>data/infra:</b> mongodb · redis · docker · ci/cd · azure · grafana
            <br />
            <b>also:</b> three.js · react native · power platform · dynamics 365
          </p>
        </section>

        <section className="v2-section" id="contact">
          <div className="v2-section-title">
            <span className="v2-tilde">~</span>/contact
          </div>
          <ul className="v2-contact-list">
            <li>
              <span className="v2-key">email</span>
              <a href="mailto:mfuzail7820@gmail.com">mfuzail7820@gmail.com</a>
            </li>
            <li>
              <span className="v2-key">github</span>
              <a href="https://github.com/dayumcodes" target="_blank" rel="noreferrer">
                github.com/dayumcodes
              </a>
            </li>
            <li>
              <span className="v2-key">linkedin</span>
              <a href="https://www.linkedin.com/in/mohammed-fuzail-2k24" target="_blank" rel="noreferrer">
                linkedin.com/in/mohammed-fuzail-2k24
              </a>
            </li>
            <li>
              <span className="v2-key">x</span>
              <a href="https://x.com/mazino213" target="_blank" rel="noreferrer">
                x.com/mazino213
              </a>
            </li>
          </ul>
        </section>

        <footer className="v2-footer">
          <span>© 2026 mohammed fuzail</span>
          <span>
            this is v2 · the old 3d portfolio lives at <a href="/v1">/v1</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
