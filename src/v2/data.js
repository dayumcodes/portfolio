// Content for the v2 portfolio. Everything here comes from Fuzail's resume,
// his own repos and the projects he has shipped.

export const PROFILE = {
  name: "Mohammed Fuzail",
  tagline: "Full-Stack Developer & AI Engineer",
  email: "mfuzail7820@gmail.com",
  github: "https://github.com/dayumcodes",
  linkedin: "https://www.linkedin.com/in/mohammed-fuzail-2k24",
  x: "https://x.com/mazino213",
  avatar: "https://github.com/dayumcodes.png",
};

export const JOBS = [
  {
    company: "techzoetic",
    title: "software engineer, ai & platforms",
    from: "aug 2024",
    to: "present",
    length: "2 yrs 4 mos",
  },
  {
    company: "infosys",
    title: "system engineer, power platform",
    from: "mar 2022",
    to: "jul 2024",
    length: "2 yrs 5 mos",
  },
];

const P = (slug, title, kind, image, extra) => ({ slug, title, kind, image, ...extra });

export const PROJECTS = [
  P("ride-hailing-platform", "Ride-hailing platform", "Techzoetic", "/v2/cards/ride-hailing.jpg", {
    headline: "Architecting a ride-hailing platform",
    summary: "React Native apps, Next.js dashboards and a live tracking backend, designed end to end.",
    details: [
      { label: "role", value: "architect, full stack" },
      { label: "company", value: "techzoetic" },
      { label: "clients", value: "react native, next.js" },
      { label: "cloud", value: "azure" },
    ],
    story: [
      { type: "heading", text: "What it is" },
      { type: "p", text: "A ride-hailing platform made of **React Native apps** and **Next.js dashboards**, running on a Node.js backend." },
      { type: "heading", text: "My part" },
      { type: "p", text: "I architected the system and built across the stack: the Node.js and Express API, **WebSocket live tracking**, and the deployment on Azure." },
      { type: "glass", text: "Ride-hailing lives on **live location**, so tracking runs over **WebSockets** instead of polling." },
      { type: "list", items: ["React Native apps", "Next.js dashboards", "Node.js and Express API", "WebSocket live tracking", "Azure hosting"] },
    ],
  }),
  P("ramprush", "RampRush", "co-founder · three.js racer", "/v2/cards/ramprush.jpg", {
    headline: "RampRush, a racing game that runs in a tab",
    summary: "A browser 3D racing game: chase a swerving flatbed, climb its ramp, and tow rivals back.",
    href: "https://tryramprush.com",
    details: [
      { label: "role", value: "co-founder, builder" },
      { label: "with", value: "zeeshan sheikh" },
      { label: "stack", value: "three.js" },
      { label: "play", value: "in the browser" },
    ],
    story: [
      { type: "heading", text: "The game" },
      { type: "p", text: "RampRush is a casual 3D racing game that needs no download. You chase a swerving flatbed truck, climb its ramp and try to beat everyone else onto it." },
      { type: "p", text: "Drive with **WASD**, **drift** with Space and use the **tow line** on Right Shift to pull rivals back." },
      { type: "heading", text: "Modes" },
      { type: "list", items: ["Free Computer mode against up to 5 AI rivals, in 3 difficulty tiers", "Multiplayer lobbies of up to 10 drivers, joined with a 4-character room code", "Several maps, including Night Shift"] },
      { type: "glass", text: "The goal was a game you can share as a **link** and be racing in **seconds**." },
      { type: "link", text: "Play RampRush", href: "https://tryramprush.com" },
    ],
  }),
  P("orbit", "Orbit", "ai chat workspace", "/v2/cards/orbit.jpg", {
    headline: "Orbit, an AI chat app for the browser",
    summary: "A chat workspace with history, Google sign-in and a fast hosted model behind it.",
    href: "https://orbit-chat-po6w.onrender.com",
    details: [
      { label: "role", value: "builder" },
      { label: "db", value: "postgres (neon)" },
      { label: "model", value: "groq" },
      { label: "host", value: "render" },
    ],
    story: [
      { type: "heading", text: "The idea" },
      { type: "p", text: "A chat assistant you can open from any browser, with your conversations saved so you can come back to them." },
      { type: "heading", text: "How it is built" },
      { type: "list", items: ["Google sign-in", "Chat history stored in Postgres on Neon", "Replies from a Groq-hosted model", "Deployed on Render"] },
      { type: "glass", text: "Sign-in, saved history and a real reply, all in **one page** and **one tab**." },
      { type: "link", text: "Open Orbit", href: "https://orbit-chat-po6w.onrender.com" },
    ],
  }),
  P("windshield-hud", "Windshield HUD", "react · geolocation", "/v2/cards/hud.jpg", {
    headline: "A heads-up display for your windshield",
    summary: "Speed, heading and turn-by-turn directions, mirrored so they reflect on the glass.",
    href: "https://windshield-hud.vercel.app",
    details: [
      { label: "role", value: "builder" },
      { label: "input", value: "gps" },
      { label: "host", value: "vercel" },
      { label: "source", value: "open on github" },
    ],
    story: [
      { type: "heading", text: "What it does" },
      { type: "p", text: "Open the page on a phone and it becomes a **mirrored display** that reflects in the windshield." },
      { type: "list", items: ["GPS speed and compass heading", "A mirrored mode for windshield reflection", "Turn-by-turn directions with a route diagram", "A demo mode, clearly labelled as simulated data"] },
      { type: "glass", text: "It runs in **any browser**, so there is nothing to install before a drive." },
      { type: "link", text: "Open Windshield HUD", href: "https://windshield-hud.vercel.app" },
    ],
  }),
  P("creator-marketplace", "Creator marketplace", "Techzoetic", "/v2/cards/creator-marketplace.jpg", {
    headline: "Leading a creator marketplace",
    summary: "A React and TypeScript marketplace with Stripe Connect payouts and GPT-powered creator tools.",
    details: [
      { label: "role", value: "lead, full stack" },
      { label: "company", value: "techzoetic" },
      { label: "payments", value: "stripe connect" },
      { label: "ai", value: "openai gpt" },
    ],
    story: [
      { type: "heading", text: "What it is" },
      { type: "p", text: "A creator marketplace built with **React and TypeScript**. I led the build." },
      { type: "list", items: ["Payouts through Stripe Connect", "GPT-powered tools for creators, using the OpenAI API", "React and TypeScript front end"] },
      { type: "glass", text: "Money and AI are the parts people **trust last**, so they get the most care." },
    ],
  }),
  P("portfolio-v1", "Portfolio v1", "the old 3d portfolio", "/v2/cards/v1.jpg", {
    internal: "/v1",
  }),
];

export const SIGNATURE_PATH =
  "M18 118 C 40 70, 66 28, 104 20 C 120 17, 122 30, 108 44 C 92 62, 66 80, 58 104 " +
  "M40 66 C 70 56, 100 52, 128 56 " +
  "M150 52 C 142 72, 134 96, 144 104 C 158 114, 172 76, 180 52 C 176 78, 178 100, 192 104 C 204 106, 214 84, 218 62 " +
  "M236 52 C 252 46, 272 48, 282 52 C 268 64, 254 84, 244 98 C 262 94, 280 94, 292 104 " +
  "M312 82 C 300 66, 322 56, 330 78 C 336 96, 326 108, 318 100 C 310 90, 334 70, 342 88 C 346 100, 352 106, 360 100 " +
  "M378 98 C 380 88, 384 70, 392 62 M390 40 L391 42 " +
  "M408 28 C 410 52, 408 80, 412 102 C 430 104, 460 90, 494 84";
