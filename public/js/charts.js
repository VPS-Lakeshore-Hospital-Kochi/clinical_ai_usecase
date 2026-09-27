import { esc } from "./common.js";

// Time-in-range segments use the fixed status scale by clinical severity:
// level-2 hypo is critical, level-1 hypo and >250 are serious, 181-250 is a warning.
const RANGES = [
  { key: "veryLow", label: "Very low", range: "<54", color: "var(--critical)", target: "<1%" },
  { key: "low", label: "Low", range: "54–69", color: "var(--serious)", target: "<4%" },
  { key: "inRange", label: "In range", range: "70–180", color: "var(--good)", target: ">70%" },
  { key: "high", label: "High", range: "181–250", color: "var(--warning)", target: "<25%" },
  { key: "veryHigh", label: "Very high", range: ">250", color: "var(--serious)", target: "<5%" },
];

export function renderCgmWidget(el, cgm) {
  el.innerHTML = `
    <div class="widget">
      <p class="widget__title">Time in ranges</p>
      <p class="widget__sub">${esc(cgm.period)} · sensor wear ${cgm.wearPercent}% · mean ${cgm.meanGlucose} mg/dL · GMI ${cgm.gmi}% · CV ${cgm.cv}%</p>
      <div class="tir-bar" role="img" aria-label="${RANGES.map((r) => `${r.label} ${cgm.ranges[r.key]}%`).join(", ")}">
        ${RANGES.map((r) => `<span style="width:${cgm.ranges[r.key]}%;background:${r.color}" title="${r.label} ${r.range} mg/dL: ${cgm.ranges[r.key]}%"></span>`).join("")}
      </div>
      <ul class="tir-legend">
        ${RANGES.map((r) => `<li><i style="background:${r.color}"></i>${r.label} ${r.range} <b>${cgm.ranges[r.key]}%</b><span class="muted">(target ${r.target})</span></li>`).join("")}
      </ul>
    </div>
    <div class="widget">
      <p class="widget__title">Median glucose by hour (mg/dL), with interquartile range</p>
      <p class="widget__sub">14-day ambulatory glucose profile · shaded green = target 70–180</p>
      <div class="viz-root" id="agp"></div>
      <details class="table-toggle">
        <summary>Show as table</summary>
        <table>
          <thead><tr><th>Hour</th><th>Median</th><th>25th</th><th>75th</th></tr></thead>
          <tbody>${cgm.profile.map((p) => `<tr><td>${hh(p.hour)}</td><td>${p.median}</td><td>${p.p25}</td><td>${p.p75}</td></tr>`).join("")}</tbody>
        </table>
      </details>
    </div>`;
  renderAgp(el.querySelector("#agp"), cgm.profile);
}

function hh(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function renderAgp(root, profile) {
  const W = 560, H = 220;
  const m = { top: 10, right: 12, bottom: 24, left: 34 };
  const yMin = 40, yMax = 320;
  const x = (h) => m.left + (h / 23) * (W - m.left - m.right);
  const y = (v) => m.top + (1 - (v - yMin) / (yMax - yMin)) * (H - m.top - m.bottom);

  const line = profile.map((p, i) => `${i ? "L" : "M"}${x(p.hour).toFixed(1)},${y(p.median).toFixed(1)}`).join("");
  const band =
    profile.map((p, i) => `${i ? "L" : "M"}${x(p.hour).toFixed(1)},${y(p.p75).toFixed(1)}`).join("") +
    [...profile].reverse().map((p) => `L${x(p.hour).toFixed(1)},${y(p.p25).toFixed(1)}`).join("") +
    "Z";

  const yTicks = [70, 180, 250, 300];
  const xTicks = [0, 3, 6, 9, 12, 15, 18, 21];

  root.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Median glucose by hour of day over 14 days. Lowest around 3 AM at 96 mg/dL, highest around 2 PM at 262 mg/dL.">
      <rect x="${m.left}" y="${y(180)}" width="${W - m.left - m.right}" height="${y(70) - y(180)}" fill="var(--viz-target)"/>
      ${yTicks.map((t) => `<line x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}" stroke="var(--viz-grid)" stroke-width="1"${t === 70 ? ' stroke-dasharray="4 3" stroke="var(--viz-axis)"' : ""}/>
        <text x="${m.left - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
      <line x1="${m.left}" x2="${W - m.right}" y1="${H - m.bottom}" y2="${H - m.bottom}" stroke="var(--viz-axis)"/>
      ${xTicks.map((t) => `<text x="${x(t)}" y="${H - 6}" text-anchor="middle">${hh(t)}</text>`).join("")}
      <path d="${band}" fill="var(--viz-band)" stroke="none"/>
      <path d="${line}" fill="none" stroke="var(--viz-series)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <text x="${x(3)}" y="${y(96) + 18}" text-anchor="middle" style="fill:var(--ink-2)">night lows</text>
      <g class="agp-hover" style="display:none">
        <line class="agp-cross" y1="${m.top}" y2="${H - m.bottom}" stroke="var(--viz-axis)" stroke-width="1"/>
        <circle class="agp-dot" r="4.5" fill="var(--viz-series)" stroke="var(--surface)" stroke-width="2"/>
      </g>
      <rect class="agp-hit" x="${m.left}" y="${m.top}" width="${W - m.left - m.right}" height="${H - m.top - m.bottom}" fill="transparent"/>
    </svg>
    <div class="viz-tooltip" role="status"></div>`;

  const svg = root.querySelector("svg");
  const hover = root.querySelector(".agp-hover");
  const cross = root.querySelector(".agp-cross");
  const dot = root.querySelector(".agp-dot");
  const tip = root.querySelector(".viz-tooltip");
  const hit = root.querySelector(".agp-hit");

  function show(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM().inverse());
    const hour = Math.max(0, Math.min(23, Math.round(((local.x - m.left) / (W - m.left - m.right)) * 23)));
    const p = profile[hour];
    cross.setAttribute("x1", x(hour));
    cross.setAttribute("x2", x(hour));
    dot.setAttribute("cx", x(hour));
    dot.setAttribute("cy", y(p.median));
    hover.style.display = "";
    const scale = root.clientWidth / W;
    tip.innerHTML = `<b>${hh(hour)}</b> · median <b>${p.median}</b> mg/dL · IQR ${p.p25}–${p.p75}`;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max(x(hour) * scale, half), root.clientWidth - half)}px`;
    tip.style.top = `${y(p.p75) * scale}px`;
    tip.style.opacity = 1;
  }
  function hide() {
    hover.style.display = "none";
    tip.style.opacity = 0;
  }
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", hide);
}
