// ED decision-support clinician view: an ED board the app scores (NEWS2, lab flags,
// rule-based medicine check), then Claude's differential, can't-miss checks and orders.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { news2, medicineCheck, toMin, toHHMM } from "../clinical.js";

const VITALS = { rr: 28, spo2: 89, oxygen: false, sbp: 152, dbp: 92, hr: 108, temp: 37.1, avpu: "A" };
const LABS = [
  ["hs-Troponin I (0 h → 1 h)", "38 → 41", "ng/L", "<20", "H"],
  ["NT-proBNP", "9,800", "pg/mL", "<450 (age >50)", "H"],
  ["Creatinine", "1.5 (baseline 1.3)", "mg/dL", "0.7–1.3", "H"],
  ["Potassium", "5.1", "mmol/L", "3.5–5.1", ""],
  ["Sodium", "134", "mmol/L", "135–145", "L"],
  ["Glucose", "240", "mg/dL", "70–140", "H"],
  ["WBC · CRP", "11.2 · 18", "×10⁹/L · mg/L", "4–11 · <5", "H"],
  ["VBG pH · pCO₂ · lactate", "7.33 · 48 · 1.6", "· mmHg · mmol/L", "7.35–7.45 · 35–45 · <2", "L"],
];
const MEDS = [
  { name: "Ramipril 2.5 mg", cls: ["acei"] },
  { name: "Metoprolol succinate 25 mg", cls: ["betablocker"] },
  { name: "Furosemide 40 mg", cls: ["loop"] },
  { name: "Aspirin 75 mg", cls: ["antiplatelet"] },
  { name: "Atorvastatin 80 mg", cls: [] },
  { name: "Metformin 500 mg twice daily", cls: ["metformin"] },
  { name: "Diclofenac 50 mg twice daily (started 10 days ago)", cls: ["nsaid"] },
];
const SEV = { High: "danger", Moderate: "warn", Low: "" };
const CANT = { "Excluded so far": "ok", "Not yet excluded": "warn", Present: "danger" };

export default {
  notes: [
    "The board is scored by the app: NEWS2 is 7 (emergency response) and the rule-based check flags the NSAID + ACE inhibitor + diuretic combination before Claude is asked.",
    "Claude names the likely trigger, diclofenac started by the GP 10 days ago, which a busy night team can easily miss.",
    "Troponin is raised, so Claude keeps NSTEMI on the can't-miss list with the specific checks that would exclude it, rather than dismissing it.",
    "Each first-6-hours action carries its guideline. The doctor accepts, edits or rejects each before signing the orders.",
  ],
  guide: [
    "Review the ED board: the app scores NEWS2, flags the labs and checks the medicines.",
    "Ask Claude for decision support: differential, can't-miss checks and a first-6-hours plan.",
    "Tick off each can't-miss check as you review it; accept, edit or reject each order.",
    "Sign the orders to file the ED assessment to Rajan's record.",
  ],
  mount(root, ctx) {
    const n = news2(VITALS);
    const findings = medicineCheck(MEDS, { k: 5.1, creatinine: 1.5, creatinineBaseline: 1.3, spo2: VITALS.spo2, heartFailure: true });
    root.innerHTML = "";
    const view = el(`<div class="ed">
      <section class="ed__board">
        <div class="review-tools"><div><span class="kicker">ED board · bay 4 · 14 Sep 02:30</span><h2 class="ed__title">Breathless at rest, 3 days</h2></div><span class="chip chip--muted">67 y · HFrEF (LVEF 30%) · LBBB · T2DM · CKD 3a</span></div>
        <div class="tiles">
          ${[["RR", VITALS.rr, "/min", n.parts.rr], ["SpO₂", `${VITALS.spo2}%`, "air", n.parts.spo2], ["BP", `${VITALS.sbp}/${VITALS.dbp}`, "mmHg", n.parts.sbp], ["HR", VITALS.hr, "sinus", n.parts.hr], ["Temp", VITALS.temp, "°C", n.parts.temp]]
            .map(([l, v, u, s]) => `<div class="tile" data-s="${s}"><span class="label">${l}</span><span class="tile__v">${v}</span><span class="tile__u">${u}${s ? ` · scores ${s}` : ""}</span></div>`).join("")}
          <div class="tile tile--score"><span class="label">NEWS2 (app)</span><span class="tile__v">${n.total}</span><span class="tile__u">${esc(n.response.label)}</span></div>
        </div>
        <div class="ed__cols">
          <div><h3 class="section-title">Results</h3><table class="mini"><tbody>${LABS.map(([t, v, u, r, f]) => `<tr><td>${esc(t)}</td><td class="num ${f ? "t-danger" : ""}">${esc(v)}${f ? ` <small>${f}</small>` : ""}</td><td class="muted">${esc(u)}</td><td class="muted">${esc(r)}</td></tr>`).join("")}</tbody></table>
            <p class="hint" style="margin-top:8px"><strong style="font-weight:500">ECG:</strong> sinus 108, LBBB unchanged from 2024, no concordant ST change. <strong style="font-weight:500">CXR:</strong> cardiomegaly, pulmonary oedema, small effusions, no consolidation.</p></div>
          <div><h3 class="section-title">Medicines · app check</h3><ul class="meds">${MEDS.map((m) => `<li>${esc(m.name)}</li>`).join("")}</ul>
            <ul class="findings-list">${findings.map((f) => `<li><span class="dot dot--${SEV[f.severity] || "ok"}"></span><span><strong>${esc(f.title)}</strong>${esc(f.detail)}</span></li>`).join("")}</ul></div>
        </div>
        <div class="actions-row"><button class="btn btn--primary" id="ask">Ask Claude for decision support</button><span class="chip chip--muted" id="src" hidden></span></div>
      </section>
      <div id="support"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = toMin("02:31"); return () => toHHMM(m++); })() });

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const box = $("#support");
      const result = await withClaude(box, (o) => ctx.ask({ presentation: ctx.mod.defaultInput, news2: n.total, appFindings: findings }, o), { label: "Claude is reviewing the case…" });
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Decision support requested");
      render(box, result.data);
    };

    function render(box, d) {
      box.innerHTML = "";
      const v = el(`<div class="ed__support">
        <section class="headline-card"><span class="label">Most likely</span><h3>${esc(d.mostLikely.diagnosis)}</h3><p><strong style="font-weight:500">Likely trigger:</strong> ${esc(d.mostLikely.precipitant)}</p></section>
        <section><h3 class="section-title">Differential</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Diagnosis</th><th>For</th><th>Against</th><th>Next test</th></tr></thead><tbody>
          ${d.differential.map((x) => `<tr><td><strong style="font-weight:500">${esc(x.diagnosis)}</strong><br><small class="muted">${esc(x.likelihood)}</small></td><td>${esc(x.for)}</td><td>${esc(x.against)}</td><td>${esc(x.nextTest)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Can't-miss checks</h3><ul class="cantmiss">${d.cantMiss.map((c, i) => `<li><label class="check" style="margin:0"><input type="checkbox" data-cm="${i}"> <span><strong>${esc(c.condition)}</strong> <span class="status t-${CANT[c.status]}"><span class="dot dot--${CANT[c.status]}"></span>${esc(c.status)}</span><br><span class="muted">${esc(c.check)}</span></span></label></li>`).join("")}</ul></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">First 6 hours</h3><button class="rbtn" id="all">Accept remaining</button></div><div id="orders"></div></section>
        <section><h3 class="section-title">Medicine review</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Medicines</th><th>Problem</th><th>Action</th></tr></thead><tbody>
          ${d.medicines.map((m) => `<tr><td><span class="dot dot--${SEV[m.severity] || ""}" title="${esc(m.severity)}"></span> <strong style="font-weight:500">${esc(m.medicines)}</strong></td><td>${esc(m.problem)}</td><td>${esc(m.action)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">What would change the plan</h3><ul class="ddx">${d.escalation.map((e) => `<li><strong>${esc(e.trigger)}</strong><br>${esc(e.action)}</li>`).join("")}</ul></section>
        <div class="actions-row"><button class="btn btn--approve" id="sign">Sign orders &amp; file</button><span class="hint" id="pending"></span><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(v);
      const q = (s) => v.querySelector(s);
      const orders = reviewList(q("#orders"), d.first6h.map((o, i) => ({ key: `o${i}`, text: o.action, meta: esc(o.guideline) })), { audit, noun: "order", onChange: () => upd() });
      const upd = () => { const p = orders.pending(); q("#pending").textContent = p ? `${p} order${p === 1 ? "" : "s"} not yet reviewed` : "All orders reviewed"; };
      upd();
      q("#all").onclick = () => orders.acceptAll();
      v.querySelectorAll("[data-cm]").forEach((cb) => cb.addEventListener("change", () => audit.add(`${cb.checked ? "Reviewed" : "Unticked"} can't-miss check: ${d.cantMiss[cb.dataset.cm].condition}`, cb.checked ? "accept" : "info")));
      q("#sign").onclick = () => {
        audit.add(`Signed ${orders.accepted().length} orders`, "accept");
        ctx.file([
          `## Most likely diagnosis`, `**${d.mostLikely.diagnosis}**. Trigger: ${d.mostLikely.precipitant}`,
          `## Board (app)`, `NEWS2 ${n.total} (${n.response.label}). Medicine check: ${findings.map((f) => f.title).join("; ")}`,
          `## Differential`, ...d.differential.map((x) => `- ${x.diagnosis} (${x.likelihood}): next ${x.nextTest}`),
          `## Can't-miss checks`, ...d.cantMiss.map((c, i) => `- [${v.querySelector(`[data-cm="${i}"]`).checked ? "x" : " "}] ${c.condition}: ${c.status}. ${c.check}`),
          `## Orders signed`, ...orders.accepted().map((o) => `- ${o.text} (${o.meta})`),
          `## Medicine review`, ...d.medicines.map((m) => `- **${m.medicines}:** ${m.action}`),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        q("#sign").disabled = true;
        q("#filed").textContent = "✓ Filed to Rajan's record";
      };
    }
  },
};
