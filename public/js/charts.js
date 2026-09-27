import { esc } from "./common.js";

// Time-in-range segments use the fixed status scale by clinical severity:
// level-2 hypo is critical, level-1 hypo and >250 are serious, 181-250 is a warning.
const RANGES = [
  { key: "veryLow", label: "Very low", range: "<54", color: "var(--chart-highlight)", target: "<1%" },
  { key: "low", label: "Low", range: "54–69", color: "rgba(216, 16, 84, 0.45)", target: "<4%" },
  { key: "inRange", label: "In range", range: "70–180", color: "var(--chart-1)", target: ">70%" },
  { key: "high", label: "High", range: "181–250", color: "var(--chart-3)", target: "<25%" },
  { key: "veryHigh", label: "Very high", range: ">250", color: "var(--chart-2)", target: "<5%" },
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
      <p class="widget__sub">14-day ambulatory glucose profile · shaded band = target 70–180</p>
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

// Home-monitoring trends: one small single-series panel per vital sign, each
// with its alert threshold. Points beyond the threshold are marked and named
// in the tooltip, so colour is never the only cue.
const VITAL_PANELS = [
  { key: "glucose", title: "Glucose", unit: "mg/dL", min: 60, max: 320, threshold: 250, above: true, band: [70, 180] },
  { key: "sbp", title: "Systolic BP", unit: "mmHg", min: 90, max: 130, threshold: 105, above: false },
  { key: "hr", title: "Heart rate", unit: "/min", min: 70, max: 115, threshold: 100, above: true },
  { key: "temp", title: "Temperature", unit: "°C", min: 36.5, max: 38.5, threshold: 37.8, above: true, decimals: 1 },
];

export function renderVitalsWidget(el, hm) {
  const weights = hm.readings.filter((r) => r.weightKg);
  el.innerHTML = `
    <div class="widget">
      <p class="widget__title">Home readings, ${esc(hm.period)}</p>
      <p class="widget__sub">Dashed line = alert threshold · ⚠ points are beyond it</p>
      <div class="vitals-grid">
        ${VITAL_PANELS.map((p) => `<div class="vital-panel viz-root" data-key="${p.key}"></div>`).join("")}
      </div>
      <table class="mini-table">
        <thead><tr><th>Day</th><th>Loose stools</th></tr></thead>
        <tbody>${hm.stoolsPerDay.map((s) => `<tr><td>${esc(s.date)}</td><td>${s.count}</td></tr>`).join("")}</tbody>
      </table>
      <p class="widget__sub" style="margin-top:6px">Weight: ${weights.map((r) => `${esc(r.label)} <b>${r.weightKg} kg</b>`).join(" → ")}</p>
      <details class="table-toggle">
        <summary>Show all readings as a table</summary>
        <table>
          <thead><tr><th>Time</th><th>Glucose</th><th>BP</th><th>HR</th><th>Temp</th></tr></thead>
          <tbody>${hm.readings.map((r) => `<tr><td>${esc(r.label)}</td><td>${r.glucose}</td><td>${r.sbp}/${r.dbp}</td><td>${r.hr}</td><td>${r.temp.toFixed(1)}</td></tr>`).join("")}</tbody>
        </table>
      </details>
    </div>`;
  for (const panel of VITAL_PANELS) {
    renderVitalPanel(el.querySelector(`[data-key="${panel.key}"]`), hm.readings, panel);
  }
}

function renderVitalPanel(root, readings, p) {
  const W = 240, H = 124;
  const m = { top: 22, right: 10, bottom: 18, left: 32 };
  const n = readings.length;
  const x = (i) => m.left + (i / (n - 1)) * (W - m.left - m.right);
  const y = (v) => m.top + (1 - (v - p.min) / (p.max - p.min)) * (H - m.top - m.bottom);
  const fmt = (v) => (p.decimals ? v.toFixed(p.decimals) : String(v));
  const beyond = (v) => (p.above ? v >= p.threshold : v < p.threshold);
  const values = readings.map((r) => r[p.key]);
  const last = values.at(-1);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");

  root.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${p.title}: ${values.map(fmt).join(", ")} ${p.unit}. Latest ${fmt(last)}${beyond(last) ? ", beyond the alert threshold" : ""}.">
      <text x="${m.left}" y="12" style="font-weight:600;fill:var(--ink)">${p.title}</text>
      <text x="${W - m.right}" y="12" text-anchor="end" style="font-weight:600;fill:${beyond(last) ? "var(--chart-highlight)" : "var(--ink)"}">${beyond(last) ? "⚠ " : ""}${fmt(last)} ${p.unit}</text>
      ${p.band ? `<rect x="${m.left}" y="${y(p.band[1])}" width="${W - m.left - m.right}" height="${y(p.band[0]) - y(p.band[1])}" fill="var(--viz-target)"/>` : ""}
      <line x1="${m.left}" x2="${W - m.right}" y1="${y(p.threshold)}" y2="${y(p.threshold)}" stroke="var(--viz-axis)" stroke-dasharray="4 3"/>
      <text x="${m.left - 5}" y="${y(p.threshold) + 4}" text-anchor="end">${fmt(p.threshold)}</text>
      <line x1="${m.left}" x2="${W - m.right}" y1="${H - m.bottom}" y2="${H - m.bottom}" stroke="var(--viz-grid)"/>
      <text x="${x(0)}" y="${H - 4}" text-anchor="start">25 Sep</text>
      <text x="${x(n - 1)}" y="${H - 4}" text-anchor="end">27 Sep</text>
      <path d="${line}" fill="none" stroke="var(--viz-series)" stroke-width="2" stroke-linejoin="round"/>
      ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${beyond(v) ? 4.5 : 3}" fill="${beyond(v) ? "var(--chart-highlight)" : "var(--viz-series)"}" stroke="var(--surface)" stroke-width="1.5"/>`).join("")}
      <rect class="vp-hit" x="${m.left}" y="${m.top}" width="${W - m.left - m.right}" height="${H - m.top - m.bottom}" fill="transparent"/>
    </svg>
    <div class="viz-tooltip" role="status"></div>`;

  const svg = root.querySelector("svg");
  const tip = root.querySelector(".viz-tooltip");
  const hit = root.querySelector(".vp-hit");
  function show(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.max(0, Math.min(n - 1, Math.round(((local.x - m.left) / (W - m.left - m.right)) * (n - 1))));
    const v = values[i];
    tip.innerHTML = `<b>${esc(readings[i].label)}</b> · ${fmt(v)} ${p.unit}${beyond(v) ? " · ⚠ beyond threshold" : ""}`;
    const scale = root.clientWidth / W;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max(x(i) * scale, half), root.clientWidth - half)}px`;
    tip.style.top = `${y(v) * scale}px`;
    tip.style.opacity = 1;
  }
  hit.addEventListener("pointermove", show);
  hit.addEventListener("pointerdown", show);
  hit.addEventListener("pointerleave", () => (tip.style.opacity = 0));
}
