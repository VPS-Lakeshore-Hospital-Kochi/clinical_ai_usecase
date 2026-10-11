// Motion that shows Claude at work: the spark mark, the "reading and drafting" panel shown
// while a clinician view waits for Claude, the staggered reveal of Claude's draft, and the
// journey ribbon on the home page. Everything settles to a still, readable state when the
// viewer has asked for reduced motion.
import { esc } from "./common.js";

export const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// Eight rays, alternating long and short, drawn as strokes so they can pulse one by one.
export function sparkSVG(size = 22, cls = "") {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const r = i % 2 ? 7 : 10;
    const x = (12 + Math.cos(a) * r).toFixed(2);
    const y = (12 + Math.sin(a) * r).toFixed(2);
    return `<line x1="12" y1="12" x2="${x}" y2="${y}" style="--i:${i}"/>`;
  }).join("");
  return `<svg class="spark ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${rays}</svg>`;
}

const DEFAULT_STEPS = ["Reading the record", "Checking it against the rules", "Drafting for clinician review"];

// The panel shown while Claude works on a clinician view. Steps advance on a timer; the
// panel is replaced as soon as the answer arrives.
export function thinkingPanel(container, label, steps = DEFAULT_STEPS) {
  container.innerHTML = `
    <div class="claude-think" role="status" aria-live="polite">
      <div class="claude-think__head">${sparkSVG(28, "spark--busy")}<span class="claude-think__label">${esc(label)}</span></div>
      <ol class="claude-think__steps">${steps.map((s, i) => `<li data-state="${i ? "todo" : "doing"}">${esc(s)}</li>`).join("")}</ol>
      <div class="claude-think__draft" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
    </div>`;
  const items = [...container.querySelectorAll(".claude-think__steps li")];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= items.length - 1) return clearInterval(timer);
    items[i].dataset.state = "done";
    items[++i].dataset.state = "doing";
  }, reducedMotion() ? 900 : 620);
  return () => clearInterval(timer);
}

// Claude's answer arrives: whatever the view renders next into the container fades up in order.
export function revealNext(container) {
  if (reducedMotion()) return;
  container.classList.add("claude-reveal");
  setTimeout(() => container.classList.remove("claude-reveal"), 2400);
}

// Home page ribbon: one node per prototype, grouped by stage. The spark travels the journey
// and names each prototype as it passes; every node is a link into that demo.
export function journeyRibbon(root, stages) {
  const items = stages.flatMap((s) => s.items.map((it) => ({ ...it, stage: s.title }))).filter((it) => it.href);
  if (!items.length) return;
  root.innerHTML = `
    <div class="ribbon__track">
      <div class="ribbon__line"><div class="ribbon__fill"></div></div>
      <div class="ribbon__spark">${sparkSVG(26)}</div>
      ${items.map((it, i) => `<a class="ribbon__node" href="${it.href}" style="--x:${(i / (items.length - 1)) * 100}%" aria-label="${esc(it.title)}"><span></span></a>`).join("")}
    </div>
    <p class="ribbon__caption" aria-live="off"><span class="ribbon__stage"></span><b class="ribbon__title"></b><span class="ribbon__text"></span></p>`;
  const nodes = [...root.querySelectorAll(".ribbon__node")];
  const spark = root.querySelector(".ribbon__spark");
  const fill = root.querySelector(".ribbon__fill");
  const cap = {
    stage: root.querySelector(".ribbon__stage"),
    title: root.querySelector(".ribbon__title"),
    text: root.querySelector(".ribbon__text"),
  };
  let shown = -1;
  let hover = -1;
  const show = (i) => {
    if (i === shown) return;
    shown = i;
    const it = items[i];
    cap.stage.textContent = `${it.stage} · ${i + 1} of ${items.length}`;
    cap.title.textContent = it.title;
    cap.text.textContent = it.text;
    root.querySelector(".ribbon__caption").animate?.(
      [{ opacity: 0.2, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }],
      { duration: 380, easing: "ease-out" },
    );
  };
  nodes.forEach((n, i) => {
    n.addEventListener("mouseenter", () => { hover = i; show(i); });
    n.addEventListener("focus", () => { hover = i; show(i); });
    n.addEventListener("mouseleave", () => { hover = -1; });
  });

  if (reducedMotion()) {
    nodes.forEach((n) => n.classList.add("is-lit"));
    fill.style.width = "100%";
    spark.style.left = "100%";
    show(0);
    return;
  }

  const PER_NODE_MS = 1700;
  const total = PER_NODE_MS * items.length;
  let start = performance.now();
  let raf = 0;
  const tick = (now) => {
    const t = ((now - start) % (total + 1600)) / total; // a short rest at the end before it loops
    const p = Math.min(t, 1);
    const reached = Math.min(items.length - 1, Math.floor(p * (items.length - 1) + 0.02));
    spark.style.left = `${p * 100}%`;
    fill.style.width = `${p * 100}%`;
    nodes.forEach((n, i) => n.classList.toggle("is-lit", i <= reached));
    if (hover < 0) show(reached);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { start = performance.now() - (shown / (items.length - 1)) * total; raf = requestAnimationFrame(tick); }
  });
}
