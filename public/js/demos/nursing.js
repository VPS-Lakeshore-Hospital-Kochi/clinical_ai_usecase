// Nursing clinician view: a live observation chart scored by the app (NEWS2), the
// response it requires, and Claude's handover drafted from the trend.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { news2, toMin, toHHMM } from "../clinical.js";

const NIGHT = [
  { time: "19 Aug 20:00", rr: 16, spo2: 97, oxygen: false, sbp: 128, dbp: 78, hr: 84, avpu: "A", temp: 37.2 },
  { time: "20 Aug 00:00", rr: 18, spo2: 96, oxygen: false, sbp: 122, dbp: 76, hr: 92, avpu: "A", temp: 37.4 },
  { time: "20 Aug 04:00", rr: 21, spo2: 95, oxygen: false, sbp: 112, dbp: 70, hr: 102, avpu: "A", temp: 37.6 },
  { time: "20 Aug 06:00", rr: 22, spo2: 93, oxygen: false, sbp: 106, dbp: 66, hr: 108, avpu: "A", temp: 37.8 },
];
const ROWS = [
  ["rr", "Respiration rate", (o) => o.rr],
  ["spo2", "SpO₂ (scale 1)", (o) => `${o.spo2}%`],
  ["oxygen", "Air or oxygen", (o) => (o.oxygen ? "O₂" : "Air")],
  ["sbp", "Systolic BP", (o) => `${o.sbp}/${o.dbp}`],
  ["hr", "Pulse", (o) => o.hr],
  ["avpu", "Consciousness", (o) => (o.avpu === "A" ? "Alert" : o.avpu)],
  ["temp", "Temperature", (o) => o.temp.toFixed(1)],
];
const URINE = { ml: 180, hours: 10, weightKg: 88 };

export default {
  guide: [
    "The app scores every set of observations with NEWS2 and shows the response the chart requires.",
    "Add a new set of observations to see the score and response change.",
    "Ask Claude to read the trend and draft the handover, differential and day-shift tasks.",
    "Escalate, tick off tasks and file the handover.",
  ],
  mount(root, ctx) {
    const obs = NIGHT.map((o) => ({ ...o }));
    let clockMin = toMin("06:05");
    const clock = () => toHHMM(clockMin++);
    let draftedAt = null;

    root.innerHTML = "";
    const view = el(`<div class="news">
      <div class="news__top">
        <div>
          <div class="review-tools"><h3 class="section-title" style="margin:0">Observation chart · bed 12 · POD 1 anterior resection</h3><span class="hint">NEWS2 calculated by the app (RCP 2017)</span></div>
          <div class="obs-wrap"><table class="obs" id="obs"></table></div>
          <div class="obs-legend"><span>Score beside each value: <span class="t-warn">1</span> · <span class="t-danger">2</span> · <span class="t-danger">3</span></span><span id="urine"></span></div>
        </div>
        <section class="response" id="response" aria-live="polite"></section>
      </div>
      <div class="trend card-v" style="padding:14px 18px"><div class="review-tools"><span class="label">NEWS2 trend</span><span class="hint">Dashed lines: 5 (urgent) and 7 (emergency)</span></div><div id="trend"></div></div>
      <form class="obs-form" id="form" autocomplete="off">
        <label class="field">Time<input id="f-time" value="07:00" required></label>
        <label class="field">Resp. rate<input id="f-rr" type="number" value="24" min="4" max="60" required></label>
        <label class="field">SpO₂ %<input id="f-spo2" type="number" value="92" min="60" max="100" required></label>
        <label class="field">Air / O₂<select id="f-o2"><option value="0">Air</option><option value="1">Oxygen</option></select></label>
        <label class="field">Systolic<input id="f-sbp" type="number" value="98" min="40" max="260" required></label>
        <label class="field">Diastolic<input id="f-dbp" type="number" value="62" min="20" max="160" required></label>
        <label class="field">Pulse<input id="f-hr" type="number" value="114" min="20" max="220" required></label>
        <label class="field">Consciousness<select id="f-avpu"><option>A</option><option>C</option><option>V</option><option>P</option><option>U</option></select></label>
        <label class="field">Temp °C<input id="f-temp" type="number" step="0.1" value="38.2" min="32" max="43" required></label>
        <button class="btn btn--secondary" type="submit">Add observations</button>
      </form>
      <section>
        <div class="review-tools"><h3 class="section-title" style="margin:0">Handover</h3><span class="chip chip--muted" id="src">Not drafted yet</span></div>
        <div id="handover"><div class="actions-row" style="margin:0"><button class="btn btn--primary" id="draft">Draft handover with Claude</button><span class="hint">Claude reads the chart, fluid balance and night notes.</span></div></div>
      </section>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock });

    const rate = URINE.ml / URINE.hours / URINE.weightKg;
    $("#urine").innerHTML = `Urine output ${URINE.ml} mL in ${URINE.hours} h = <strong class="t-danger">${rate.toFixed(1)} mL/kg/h</strong> (target ≥0.5)`;

    function renderChart() {
      const scored = obs.map((o) => ({ o, n: news2(o) }));
      $("#obs").innerHTML = `<thead><tr><th>Parameter</th>${scored.map(({ o }, i) => `<th>${esc(o.time)}${i >= NIGHT.length ? " ✎" : ""}</th>`).join("")}</tr></thead>
        <tbody>${ROWS.map(([k, label, fmt]) => `<tr><th>${label}</th>${scored.map(({ o, n }, i) => `<td data-s="${n.parts[k]}" class="${i >= NIGHT.length ? "is-new" : ""}">${esc(String(fmt(o)))}<span class="s">${n.parts[k]}</span></td>`).join("")}</tr>`).join("")}
        <tr class="total"><th>NEWS2 total</th>${scored.map(({ n }, i) => `<td class="${i >= NIGHT.length ? "is-new" : ""}">${n.total}${n.redScore ? " ⚑" : ""}</td>`).join("")}</tr></tbody>`;
      const last = scored[scored.length - 1];
      const r = last.n.response;
      const resp = $("#response");
      resp.dataset.level = r.level;
      resp.innerHTML = `<span class="label">Latest · ${esc(last.o.time)}</span>
        <div class="response__score">${last.n.total}<small>NEWS2</small></div>
        <div class="response__level">${esc(r.label)}</div>
        <p><strong>Observations:</strong> ${esc(r.frequency)}</p><p>${esc(r.action)}</p>`;
      renderTrend(scored.map((s) => s.n.total), scored.map((s) => s.o.time.slice(-5)));
    }

    function renderTrend(values, labels) {
      const W = 1100, H = 170, m = { l: 30, r: 28, t: 18, b: 24 };
      const max = 12;
      const x = (i) => m.l + (values.length === 1 ? 0 : (i * (W - m.l - m.r)) / (values.length - 1));
      const y = (v) => m.t + (1 - v / max) * (H - m.t - m.b);
      const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      $("#trend").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="NEWS2 over time: ${values.join(", ")}">
        ${[0, 5, 7, 12].map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${t === 5 || t === 7 ? "var(--ink-3)" : "var(--chart-grid)"}" ${t === 5 || t === 7 ? 'stroke-dasharray="4 4"' : ""}/><text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
        <path d="${line}" fill="none" stroke="var(--chart-1)" stroke-width="2.5" stroke-linejoin="round"/>
        ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="${i === values.length - 1 ? 6 : 4}" fill="${v >= 5 ? "var(--chart-highlight)" : "var(--chart-1)"}" stroke="#fff" stroke-width="2"/><text x="${x(i)}" y="${y(v) - 11}" text-anchor="middle" style="fill:var(--navy);font-weight:500">${v}</text><text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(labels[i])}</text>`).join("")}
      </svg>`;
    }
    renderChart();

    $("#form").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = (id) => $(id).value;
      const o = { time: `20 Aug ${v("#f-time")}`, rr: +v("#f-rr"), spo2: +v("#f-spo2"), oxygen: v("#f-o2") === "1", sbp: +v("#f-sbp"), dbp: +v("#f-dbp"), hr: +v("#f-hr"), avpu: v("#f-avpu"), temp: +v("#f-temp") };
      obs.push(o);
      const n = news2(o);
      audit.add(`Recorded observations at ${o.time.slice(-5)}: NEWS2 ${n.total} (${n.response.label})`, n.total >= 5 ? "reject" : "info");
      renderChart();
      if (draftedAt != null) $("#stale").hidden = false;
    });

    $("#draft").onclick = async () => {
      const box = $("#handover");
      const payload = {
        obs: obs.map((o) => { const n = news2(o); return { ...o, news2: n.total, breakdown: Object.entries(n.parts).map(([k, s]) => `${k} ${s}`).join(", ") }; }),
        notes: ctx.mod.defaultInput,
      };
      const result = await withClaude(box, (o) => ctx.ask(payload, o), { label: "Claude is reading the chart and night notes…" });
      draftedAt = obs.length;
      $("#src").textContent = sourceNote(result);
      renderHandover(box, result.data, result.mode === "demo" && obs.length > NIGHT.length);
      audit.add("Handover drafted");
    };

    function renderHandover(box, d, sampleMismatch) {
      box.innerHTML = "";
      const h = el(`<div class="news">
        <p class="stale" id="stale" ${sampleMismatch ? "" : "hidden"}>${sampleMismatch ? "Offline demo: this sample handover was written for the four night-shift observations, not the ones you added." : "New observations were added after this handover was drafted. Redraft before handing over."}</p>
        <section class="escalate">
          <span class="label">Escalate now?</span>
          <h3>${d.escalate.now ? "Yes: " : "No: "}${esc(d.escalate.who)}</h3>
          <p><strong>${esc(d.escalate.howFast)}</strong></p><p>${esc(d.escalate.why)}</p>
          <div class="actions-row">${d.escalate.now ? `<button class="btn btn--primary" id="call">Call the doctor now</button>` : ""}<span class="filed-note" id="called"></span></div>
        </section>
        <div class="handover">
          <section><h3 class="section-title">SBAR</h3><dl class="sbar">${[["situation", "Situation"], ["background", "Background"], ["assessment", "Assessment"], ["recommendation", "Recommendation"]].map(([k, l]) => `<dt>${l}</dt><dd><textarea data-sbar="${k}" rows="3" class="sbar-edit">${esc(d.sbar[k])}</textarea></dd>`).join("")}</dl></section>
          <section><h3 class="section-title">What could be happening</h3><ul class="ddx">${d.differential.map((x) => `<li><strong>${esc(x.cause)}</strong><span class="lik">${esc(x.likelihood)}</span><br><span class="t-ok" aria-hidden="true">+</span> ${esc(x.supports)}<br><span class="muted">− ${esc(x.against)}</span></li>`).join("")}</ul></section>
        </div>
        <div class="handover">
          <section><h3 class="section-title">Day-shift tasks</h3><ul class="tasks">${d.tasks.map((t, i) => `<li><input type="checkbox" id="task${i}" aria-label="${esc(t.task)}"><span class="time">${esc(t.time)}</span><span>${esc(t.task)}</span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Documentation gaps from the night</h3><ul class="plain-list">${d.gaps.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></section>
        </div>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file handover</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(h);
      const q = (s) => h.querySelector(s);
      h.querySelectorAll(".sbar-edit").forEach((t) => {
        Object.assign(t.style, { width: "100%", font: "inherit", fontSize: "14px", border: "1px solid var(--line)", borderRadius: "12px", padding: "8px 10px", resize: "vertical" });
        t.addEventListener("change", () => audit.add(`Edited SBAR ${t.dataset.sbar}`, "edit"));
      });
      q("#call")?.addEventListener("click", () => {
        audit.add(`Called the surgical doctor (NEWS2 ${news2(obs[obs.length - 1]).total}); nurse in charge informed`, "accept");
        q("#call").disabled = true;
        q("#called").textContent = "✓ Escalation recorded";
      });
      h.querySelectorAll(".tasks input").forEach((cb, i) => cb.addEventListener("change", () => {
        cb.closest("li").classList.toggle("is-done", cb.checked);
        audit.add(`${cb.checked ? "Completed" : "Reopened"} task: ${d.tasks[i].task}`, cb.checked ? "accept" : "info");
      }));
      q("#file").onclick = () => {
        const sbar = Object.fromEntries([...h.querySelectorAll("[data-sbar]")].map((t) => [t.dataset.sbar, t.value.trim()]));
        const rows = obs.map((o) => { const n = news2(o); return `| ${o.time} | ${o.rr} | ${o.spo2} | ${o.oxygen ? "O2" : "Air"} | ${o.sbp}/${o.dbp} | ${o.hr} | ${o.avpu} | ${o.temp} | **${n.total}** |`; });
        ctx.file([
          `## Escalation`, `${d.escalate.now ? "**Escalated now**" : "No escalation"}: ${d.escalate.who}. ${d.escalate.why}`,
          `## NEWS2 (calculated by the app)`, `| Time | RR | SpO2 | Air/O2 | BP | HR | AVPU | Temp | NEWS2 |\n|---|---|---|---|---|---|---|---|---|\n${rows.join("\n")}`,
          `## SBAR handover`, `- **S:** ${sbar.situation}\n- **B:** ${sbar.background}\n- **A:** ${sbar.assessment}\n- **R:** ${sbar.recommendation}`,
          `## Day-shift tasks`, d.tasks.map((t, i) => `- [${h.querySelector(`#task${i}`).checked ? "x" : " "}] ${t.time}: ${t.task}`).join("\n"),
          `## Documentation gaps`, d.gaps.map((g) => `- ${g}`).join("\n"),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        audit.add("Handover approved and filed", "accept");
        q("#file").disabled = true;
        q("#filed").textContent = "✓ Filed to the patient timeline";
      };
    }
  },
};
