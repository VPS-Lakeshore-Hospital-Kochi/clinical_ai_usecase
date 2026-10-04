// Cardiac pre-op clinician view: the app scores RCRI live from the checkboxes, runs the stepwise
// peri-operative pathway and checks post-op troponins for myocardial injury; Claude drafts the
// consult. Clearance for surgery is locked until the pathway or the stress-test result allows it.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { RCRI_ITEMS, rcri, periopPathway, minsCheck } from "../clinical.js";

const BASELINE_TROP = 6;
const STRESS = { none: "Not yet done", low: "No or mild ischaemia", high: "High-risk ischaemia" };

export default {
  notes: [
    "The RCRI is scored live from the checkboxes, pre-filled from the record: intraperitoneal surgery and insulin give 2 points, a 6.6% MACE estimate (10.1% in the updated Canadian estimates).",
    "Tick ischaemic heart disease to see RCRI 3. Untick 'new exertional symptoms' and set capacity to ≥4 METs: the pathway says proceed without testing. The symptoms are what make testing necessary here, not the surgery.",
    "Clearance is locked until the stress-test result is recorded. 'High-risk ischaemia' keeps it locked and escalates to angiography and the MDT.",
    "After surgery, enter the 24-hour troponin: 14 ng/L is a rise of 8 from the baseline of 6, which the app flags as myocardial injury (MINS).",
  ],
  guide: [
    "Check the RCRI and pathway the app has worked out from the record.",
    "Ask Claude for the consult.",
    "Accept, edit or reject each line of the medicine plan.",
    "Record the stress-test result; clearance unlocks if it allows.",
    "After surgery, enter the troponins; then send the note and file.",
  ],
  mount(root, ctx) {
    const flags = { highRiskSurgery: true, insulin: true };
    const st = { symptomatic: true, mets: "<4", ntprobnp: 180, stress: "none" };
    const trop = { h24: null, h48: null };
    let d = null, meds = null, cleared = false;

    root.innerHTML = "";
    const view = el(`<div class="cd">
      <section class="tiles" id="tiles"></section>
      <div class="cd__top">
        <section><h3 class="section-title">RCRI (app, live)</h3><ul class="cd__rcri">${RCRI_ITEMS.map((i) => `<li><label class="check"><input type="checkbox" data-r="${i.key}" ${flags[i.key] ? "checked" : ""}> <span>${esc(i.label)}</span></label><strong>+1</strong></li>`).join("")}</ul></section>
        <section class="cd__inputs"><h3 class="section-title">Pathway inputs</h3>
          <label class="check"><input type="checkbox" id="sym" checked> New exertional chest heaviness</label>
          <label class="field">Functional capacity<select id="mets"><option value="<4" selected>&lt;4 METs (DASI 18)</option><option value="≥4">≥4 METs</option><option value="unknown">Unknown</option></select></label>
          <label class="field">NT-proBNP (pg/mL)<input type="number" id="bnp" value="180"></label>
          <div id="pathway"></div>
        </section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude for the consult</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));
    const path = () => periopPathway({ symptomatic: st.symptomatic, rcriPoints: rcri(flags).points, mets: st.mets, ntprobnp: st.ntprobnp });

    function update() {
      const r = rcri(flags), p = path();
      $("#tiles").innerHTML = `
        <div class="tile tile--score"><span class="label">RCRI (app)</span><span class="tile__v">${r.points}</span><span class="tile__u">${r.elevated ? "elevated risk" : "low risk"}</span></div>
        <div class="tile"><span class="label">MACE estimate (app)</span><span class="tile__v">${r.lee}%</span><span class="tile__u">Lee 1999 · ${r.duceppe}% Duceppe 2017</span></div>
        <div class="tile"><span class="label">hs-Troponin I baseline</span><span class="tile__v">${BASELINE_TROP} ng/L</span><span class="tile__u">normal (&lt;20)</span></div>
        <div class="tile"><span class="label">Echo</span><span class="tile__v">EF 58%</span><span class="tile__u">no wall-motion abnormality · mild LVH</span></div>`;
      $("#pathway").innerHTML = `<div class="cd__path" data-test="${p.testing}"><span class="label">Stepwise pathway (app) · step ${p.step}</span><p>${esc(p.text)}</p></div>`;
      if (d) gate();
    }
    update();

    view.querySelectorAll("[data-r]").forEach((c) => c.addEventListener("change", () => {
      flags[c.dataset.r] = c.checked;
      audit.add(`RCRI: ${c.checked ? "added" : "removed"} ${RCRI_ITEMS.find((i) => i.key === c.dataset.r).label.split(" (")[0].toLowerCase()} → ${rcri(flags).points} points`, "edit");
      update();
    }));
    $("#sym").onchange = (e) => { st.symptomatic = e.target.checked; audit.add(`Symptoms ${e.target.checked ? "present" : "absent"}`, "edit"); update(); };
    $("#mets").onchange = (e) => { st.mets = e.target.value; audit.add(`Functional capacity set to ${st.mets}`, "edit"); update(); };
    $("#bnp").onchange = (e) => { if (e.target.value === "") return; st.ntprobnp = Number(e.target.value); audit.add(`NT-proBNP ${st.ntprobnp}`, "edit"); update(); };

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const r = rcri(flags), p = path();
      const payload = {
        consult: ctx.mod.defaultInput,
        appChecks: [
          `RCRI ${r.points} (${RCRI_ITEMS.filter((i) => flags[i.key]).map((i) => i.label.split(" (")[0]).join(", ") || "none"}); MACE ${r.lee}% (Lee 1999) or ${r.duceppe}% (Duceppe 2017)`,
          `Functional capacity ${st.mets} METs; NT-proBNP ${st.ntprobnp} pg/mL; symptoms ${st.symptomatic ? "new exertional chest heaviness" : "none"}`,
          `Stepwise pathway step ${p.step}: ${p.text}`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is weighing the symptoms, the ECG and the surgery window…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Consult drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="cd__out">
        <section class="headline-card"><span class="label">Bottom line</span><p class="cd__bottom">${esc(d.bottomLine)}</p></section>
        <div class="handover">
          <section><h3 class="section-title">Symptom assessment</h3><ul class="facts">${d.symptoms.map((s) => `<li><span class="dot dot--warn"></span><span>${esc(s)}</span><span></span></li>`).join("")}</ul></section>
          <section class="cd__eval"><h3 class="section-title">Recommended evaluation</h3><p><strong>${esc(d.evaluation.test)}</strong> · ${esc(d.evaluation.timeline)}</p><p class="muted">${esc(d.evaluation.why)}</p><p>${esc(d.evaluation.changesPlan)}</p>
            <label class="field">Stress-test result<select id="stress">${Object.entries(STRESS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
            <div id="gate"></div></section>
        </div>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Peri-operative medicine plan</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="meds"></div></section>
        <section class="cd__trop"><h3 class="section-title">Post-operative troponin (app checks for injury)</h3><p class="hint">Baseline ${BASELINE_TROP} ng/L. Injury = rise of more than 5 ng/L from baseline, or above 20 ng/L.</p>
          <div class="cd__tropgrid"><label class="field">24 h (ng/L)<input type="number" data-h="h24"></label><label class="field">48 h (ng/L)<input type="number" data-h="h48"></label></div><div id="mins"></div>
          <ul class="facts">${d.surveillance.map((s) => `<li><span class="dot"></span><span>${esc(s)}</span><span></span></li>`).join("")}</ul></section>
        <section><h3 class="section-title">Long-term prevention</h3><ul class="facts">${d.prevention.map((s) => `<li><span class="dot dot--ok"></span><span>${esc(s)}</span><span></span></li>`).join("")}</ul></section>
        <section class="brief"><span class="label">Note to surgical &amp; anaesthesia teams</span><textarea id="note" rows="5" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.note)}</textarea><button class="rbtn" id="send">Send to teams</button></section>
        <div class="actions-row"><button class="btn btn--primary" id="clear">Clear for surgery on 19 Aug</button><button class="btn btn--approve" id="file">Approve &amp; file consult</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      meds = reviewList(g.querySelector("#meds"), d.meds.map((m, i) => ({ key: String(i), label: m.drug, text: `Before: ${m.before} · Day of surgery: ${m.day} · After: ${m.after}`, meta: esc(m.rationale) })), { audit, noun: "medicine plan line" });
      g.querySelector("#accept-all").onclick = () => meds.acceptAll();
      g.querySelector("#stress").onchange = (e) => { st.stress = e.target.value; audit.add(`Stress-test result: ${STRESS[st.stress]}`, st.stress === "high" ? "reject" : "info"); gate(); };
      g.querySelectorAll("[data-h]").forEach((inp) => inp.addEventListener("change", () => {
        trop[inp.dataset.h] = inp.value === "" ? null : Number(inp.value);
        const m = trop[inp.dataset.h] == null ? null : minsCheck(BASELINE_TROP, trop[inp.dataset.h]);
        if (m) audit.add(`Troponin ${inp.dataset.h === "h24" ? "24 h" : "48 h"}: ${trop[inp.dataset.h]} ng/L (rise ${m.rise})${m.injury ? ", myocardial injury" : ""}`, m.injury ? "reject" : "info");
        mins();
      }));
      g.querySelector("#send").onclick = (e) => { audit.add("Note sent to the surgical and anaesthesia teams", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#clear").onclick = (e) => { cleared = true; audit.add("Cleared for surgery on 19 Aug with the peri-operative plan", "accept"); e.target.disabled = true; e.target.textContent = "✓ Cleared"; };
      g.querySelector("#file").onclick = () => {
        const r = rcri(flags), p = path();
        ctx.file([
          `## Risk (app)`, `- RCRI ${r.points}; MACE ${r.lee}% (Lee) / ${r.duceppe}% (Duceppe)`, `- Pathway step ${p.step}: ${p.text}`, `- Stress test: ${STRESS[st.stress]}`,
          `## Bottom line`, d.bottomLine,
          `## Medicine plan`, ...meds.states().map((m) => `- ${m.label}: ${m.text} (${m.status})`),
          `## Post-operative troponin`, ...["h24", "h48"].map((h) => trop[h] == null ? `- ${h === "h24" ? "24 h" : "48 h"}: pending` : `- ${h === "h24" ? "24 h" : "48 h"}: ${trop[h]} ng/L${minsCheck(BASELINE_TROP, trop[h]).injury ? " (myocardial injury)" : ""}`),
          `## Clearance`, cleared ? "Cleared for 19 Aug." : "Not cleared yet.",
          `## Note to teams`, g.querySelector("#note").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      gate(); mins();
    }

    function gate() {
      const p = path();
      const ok = !p.testing || st.stress === "low";
      const box = view.querySelector("#gate");
      if (!box) return;
      box.innerHTML = st.stress === "high"
        ? `<div class="escalate"><h3>Angiography and MDT</h3><p>High-risk ischaemia: invasive angiography, then weigh revascularisation against the cancer surgery. Clearance stays locked.</p></div>`
        : `<p class="hint">${ok ? "✓ Clearance allowed" : "Clearance locked: testing is indicated and no result is recorded"}</p>`;
      const btn = view.querySelector("#clear");
      if (!cleared) btn.disabled = !ok;
    }

    function mins() {
      const rows = ["h24", "h48"].filter((h) => trop[h] != null).map((h) => ({ h, ...minsCheck(BASELINE_TROP, trop[h]) }));
      view.querySelector("#mins").innerHTML = rows.map((r) => `<p class="cd__mins" data-injury="${r.injury}"><span class="dot dot--${r.injury ? "danger" : "ok"}"></span> ${r.h === "h24" ? "24 h" : "48 h"}: ${trop[r.h]} ng/L, rise ${r.rise}. ${r.injury ? "Myocardial injury: cardiology review, aspirin and statin, outpatient ischaemia work-up." : "No injury."}</p>`).join("");
    }
  },
};
