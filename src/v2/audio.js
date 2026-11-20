// Tiny UI sounds made with Web Audio. They stay silent until the visitor has
// interacted with the page (browser autoplay rules), and honour reduced motion.
let ctx = null;
let armed = false;
let last = 0;
const quiet = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function arm() {
  if (armed) return;
  armed = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  } catch {
    ctx = null;
  }
}
if (typeof addEventListener === "function") {
  for (const ev of ["pointerdown", "keydown", "touchend"]) addEventListener(ev, arm, { once: true, passive: true });
}
export function tick(pitch = 1, gain = 0.05) {
  if (!ctx || quiet() || ctx.state !== "running") return;
  const now = ctx.currentTime;
  if (now - last < 0.035) return;
  last = now;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  o.type = "triangle";
  o.frequency.setValueAtTime(1500 * pitch, now);
  o.frequency.exponentialRampToValueAtTime(600 * pitch, now + 0.03);
  f.type = "bandpass";
  f.frequency.value = 1800 * pitch;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  o.connect(f).connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.06);
}
export function thunk() {
  if (!ctx || quiet() || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(60, now + 0.12);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.09, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + 0.18);
}

// The visitor-chosen paper page-turn sample, played when the slider turns to a
// new panel. One element, restarted per turn, so plays never overlap; a short
// throttle stops machine-gun repeats while wheeling or scrubbing.
let flipEl = null;
let flipAt = 0;
export function pageFlip() {
  if (quiet()) return;
  const now = performance.now();
  if (now - flipAt < 300) return;
  flipAt = now;
  try {
    if (!flipEl) {
      flipEl = new Audio("/v2/page-flip.m4a");
      flipEl.preload = "auto";
      flipEl.volume = 0.55;
    }
    flipEl.currentTime = 0;
    const p = flipEl.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {}
}
