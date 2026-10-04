// Kidney co-pilot clinician view: the app calculates eGFR, Cockcroft-Gault clearance on actual
// and adjusted weight, the KDIGO stage on the heat map and the renal dose bands, live as today's
// values are edited; Claude answers the e-consult and drafts the sick-day plan.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { egfrCkdEpi2021, cockcroftGault, idealBodyWeight, adjustedBodyWeight, kdigoRisk, KDIGO_GRID, ckdConfirmDate, capecitabineBand, oxaliplatinBand, metforminBand, contrastBand } from "../clinical.js";

const AGE = 58, SEX = "male", HEIGHT = 168;
const HISTORY = [["6 Jul", 1.23, 42, "On daily aceclofenac"], ["24 Aug", 1.0, null, "Discharge"]];
const RISK_DOT = { low: "ok", moderate: "warn", high: "danger", "very high": "danger" };
const fmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default {
  notes: [
    "The app recalculates eGFR from each creatinine (CKD-EPI 2021): 68 in July on the NSAID, 85 today. Claude explains the recovery.",
    "Creatinine clearance is shown on actual weight (94) and adjusted body weight (81); dosing uses the more conservative value. Both are far above the capecitabine threshold of 50.",
    "The KDIGO heat map places him at G2 A2, moderate risk. The app works out that CKD can only be confirmed from 6 Oct, three months after the first raised UACR.",
    "Try it: change today's creatinine to 1.9. eGFR falls to 40, clearance to 43, capecitabine drops to a 75% starting dose, metformin is capped and the contrast advice changes.",
  ],
  guide: [
    "Check the app's kidney numbers and the KDIGO heat map.",
    "Ask Claude to answer the e-consult.",
    "Accept, edit or reject each dosing line.",
    "Edit today's values to see how the dose bands move.",
    "Send the sick-day rules to Thomas and file the note.",
  ],
  mount(root, ctx) {
    const today = { creatinine: 1.02, uacr: 38, weight: 84 };
    let d = null, dosing = null;
    const ibw = idealBodyWeight(HEIGHT, SEX);

    const calc = () => {
      const abw = adjustedBodyWeight(today.weight, ibw);
      const egfr = egfrCkdEpi2021(today.creatinine, AGE, SEX);
      const crclActual = cockcroftGault({ age: AGE, weightKg: today.weight, creatinine: today.creatinine, sex: SEX });
      const crcl = cockcroftGault({ age: AGE, weightKg: abw, creatinine: today.creatinine, sex: SEX });
      return { abw, egfr, crclActual, crcl, k: kdigoRisk(egfr, today.uacr), cape: capecitabineBand(crcl), oxa: oxaliplatinBand(crcl), met: metforminBand(egfr), contrast: contrastBand(egfr) };
    };

    root.innerHTML = "";
    const view = el(`<div class="nk">
      <section class="tiles" id="tiles"></section>
      <div class="nk__top">
        <section><h3 class="section-title">Kidney trend (eGFR by the app)</h3><div id="trend"></div>
          <div class="nk__inputs"><span class="label">Today's values (2 Sep)</span>
            <label class="field">Creatinine (mg/dL)<input type="number" step="0.01" data-k="creatinine" value="${today.creatinine}"></label>
            <label class="field">UACR (mg/g)<input type="number" data-k="uacr" value="${today.uacr}"></label>
            <label class="field">Weight (kg)<input type="number" step="0.1" data-k="weight" value="${today.weight}"></label>
          </div></section>
        <section><h3 class="section-title">KDIGO heat map (app)</h3><div id="grid"></div><p class="hint" id="confirm"></p></section>
      </div>
      <section><h3 class="section-title">Renal dose bands (app)</h3><div id="bands"></div></section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to answer the e-consult</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    function update() {
      const c = calc();
      $("#tiles").innerHTML = `
        <div class="tile tile--score"><span class="label">eGFR today (app)</span><span class="tile__v">${c.egfr}</span><span class="tile__u">mL/min/1.73 m² · CKD-EPI 2021</span></div>
        <div class="tile"><span class="label">CrCl, adjusted weight (app)</span><span class="tile__v">${c.crcl}</span><span class="tile__u">mL/min · ABW ${c.abw} kg (IBW ${ibw})</span></div>
        <div class="tile"><span class="label">CrCl, actual weight (app)</span><span class="tile__v">${c.crclActual}</span><span class="tile__u">mL/min · ${today.weight} kg</span></div>
        <div class="tile"><span class="label">KDIGO (app)</span><span class="tile__v">${c.k.g} ${c.k.a}</span><span class="tile__u">${c.k.risk} risk · provisional</span></div>`;
      trend(c.egfr);
      $("#grid").innerHTML = `<table class="nk__grid" aria-label="KDIGO heat map, patient at ${c.k.g} ${c.k.a}"><thead><tr><th></th><th>A1 &lt;30</th><th>A2 30–300</th><th>A3 &gt;300</th></tr></thead><tbody>${Object.entries(KDIGO_GRID).map(([g, row]) => `<tr><th>${g}</th>${row.map((r, i) => `<td data-risk="${r}" ${g === c.k.g && i === Number(c.k.a[1]) - 1 ? 'data-here="true"' : ""}>${g === c.k.g && i === Number(c.k.a[1]) - 1 ? "Thomas" : ""}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      $("#confirm").textContent = `First raised UACR 6 Jul → CKD can be confirmed from ${fmt(ckdConfirmDate("2026-07-06"))} (more than 3 months).`;
      const rows = [["Capecitabine", `CrCl ${c.crcl}`, c.cape.dose, c.cape.pct === 100 ? "ok" : c.cape.pct ? "warn" : "danger"], ["Oxaliplatin", `CrCl ${c.crcl}`, c.oxa, c.oxa === "Full dose" ? "ok" : "warn"], ["Metformin", `eGFR ${c.egfr}`, c.met, c.egfr >= 45 ? "ok" : c.egfr >= 30 ? "warn" : "danger"], ["Contrast CT", `eGFR ${c.egfr}`, c.contrast, c.egfr >= 45 ? "ok" : c.egfr >= 30 ? "warn" : "danger"]];
      $("#bands").innerHTML = `<div class="nk__bands">${rows.map(([drug, basis, band, dot]) => `<div class="nk__band"><span class="dot dot--${dot}"></span><span><strong>${drug}</strong><br><small class="muted">${basis}</small></span><span>${esc(band)}</span></div>`).join("")}</div>`;
    }

    function trend(egfrToday) {
      const pts = [...HISTORY.map(([day, cr]) => [day, egfrCkdEpi2021(cr, AGE, SEX)]), ["2 Sep", egfrToday]];
      const W = 420, H = 150, m = { l: 34, r: 16, t: 14, b: 24 }, y0 = 15, y1 = 105;
      const x = (i) => m.l + (i / (pts.length - 1)) * (W - m.l - m.r);
      const y = (v) => m.t + (1 - (Math.max(y0, Math.min(y1, v)) - y0) / (y1 - y0)) * (H - m.t - m.b);
      $("#trend").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="eGFR ${pts.map((p) => `${p[0]} ${p[1]}`).join(", ")}">
        ${[30, 60, 90].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--chart-grid)"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`).join("")}
        <path d="${pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join("")}" fill="none" stroke="var(--chart-1)" stroke-width="2"/>
        ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p[1])}" r="4" fill="var(--chart-1)"/><text x="${x(i)}" y="${y(p[1]) - 8}" text-anchor="middle" font-size="11.5" fill="var(--ink)">${p[1]}</text><text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${p[0]}</text>`).join("")}
      </svg><p class="hint">Creatinine 1.23 → 1.00 → ${today.creatinine} mg/dL · UACR 42 → ${today.uacr} mg/g</p>`;
    }
    update();

    view.querySelectorAll("[data-k]").forEach((inp) => inp.addEventListener("change", () => {
      if (inp.value === "") return;
      const before = calc();
      today[inp.dataset.k] = Number(inp.value);
      const after = calc();
      audit.add(`Today's ${inp.dataset.k === "uacr" ? "UACR" : inp.dataset.k} set to ${inp.value}: eGFR ${before.egfr} → ${after.egfr}, CrCl ${before.crcl} → ${after.crcl}${before.cape.dose !== after.cape.dose ? `, capecitabine ${after.cape.dose.toLowerCase()}` : ""}`, after.cape.pct < 100 ? "reject" : "edit");
      update();
    }));

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const c = calc();
      const payload = {
        consult: ctx.mod.defaultInput,
        appChecks: [
          `eGFR (CKD-EPI 2021): 6 Jul ${egfrCkdEpi2021(1.23, AGE, SEX)}, 24 Aug ${egfrCkdEpi2021(1.0, AGE, SEX)}, today ${c.egfr}`,
          `Cockcroft-Gault: ${c.crclActual} mL/min on actual weight ${today.weight} kg; ${c.crcl} mL/min on adjusted body weight ${c.abw} kg (IBW ${ibw})`,
          `KDIGO ${c.k.g} ${c.k.a}, ${c.k.risk} risk; CKD confirmable from ${fmt(ckdConfirmDate("2026-07-06"))}`,
          `Capecitabine: ${c.cape.dose}; oxaliplatin: ${c.oxa}; metformin: ${c.met}; contrast: ${c.contrast}`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading the kidney trend against the chemotherapy plan…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("E-consult answer drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="nk__out">
        <section class="headline-card"><span class="label">Answers for Medical Oncology</span><ol class="nk__answers">${d.answers.map((a) => `<li>${esc(a)}</li>`).join("")}</ol></section>
        <section><h3 class="section-title">Kidney function assessment</h3><ul class="facts">${d.assessment.map((a) => `<li><span class="dot"></span><span>${esc(a)}</span><span></span></li>`).join("")}</ul></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Drug dosing</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="dosing"></div></section>
        <div class="handover">
          <section><h3 class="section-title">Contrast imaging</h3><ul class="facts">${d.contrast.map((a) => `<li><span class="dot dot--ok"></span><span>${esc(a)}</span><span></span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Long-term kidney protection</h3><ul class="facts">${d.protection.map((a) => `<li><span class="dot dot--warn"></span><span>${esc(a)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section class="brief"><span class="label">Sick-day rules for Thomas</span><textarea id="sick" rows="6" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.sickDay)}</textarea><button class="rbtn" id="send">Send to patient</button></section>
        <section><h3 class="section-title">Monitoring schedule</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>When</th><th>Test</th><th>Why</th></tr></thead><tbody>${d.monitoring.map((m) => `<tr><td>${esc(m.when)}</td><td>${esc(m.test)}</td><td>${esc(m.why)}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="brief"><span class="label">Note to Medical Oncology</span><textarea id="note" rows="4" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.note)}</textarea></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file e-consult</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      dosing = reviewList(g.querySelector("#dosing"), d.dosing.map((x, i) => ({ key: String(i), label: x.drug, text: x.action, meta: `${esc(x.threshold)} · ${esc(x.patient)}` })), { audit, noun: "dosing line" });
      g.querySelector("#accept-all").onclick = () => dosing.acceptAll();
      g.querySelector("#send").onclick = (e) => { audit.add("Sick-day rules sent to the patient", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        const c = calc();
        ctx.file([
          `## Kidney numbers (app)`, `- eGFR ${c.egfr}; CrCl ${c.crcl} (adjusted weight) / ${c.crclActual} (actual)`, `- KDIGO ${c.k.g} ${c.k.a} (${c.k.risk} risk), confirm from ${fmt(ckdConfirmDate("2026-07-06"))}`, `- Capecitabine ${c.cape.dose}; oxaliplatin ${c.oxa}; metformin ${c.met}`,
          `## Answers`, ...d.answers.map((a, i) => `${i + 1}. ${a}`),
          `## Dosing`, ...dosing.states().map((x) => `- ${x.label}: ${x.text} (${x.status})`),
          `## Sick-day rules`, g.querySelector("#sick").value.trim(),
          `## Note to Medical Oncology`, g.querySelector("#note").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }
  },
};
