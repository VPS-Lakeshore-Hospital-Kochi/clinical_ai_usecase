// Ortho surgery planner clinician view: the app scores function and runs the readiness gate,
// which re-computes as the surgeon records results; Claude drafts the plan; listing for surgery
// unlocks only when the gate says Proceed.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { oxfordKneeBand, tkaReadiness } from "../clinical.js";

const DOT = { ok: "ok", optimise: "warn", defer: "danger" };
const GI = { pending: "Pending", clear: "Complete, no malignancy", cancer: "Cancer found" };

export default {
  notes: [
    "The app scores the Oxford Knee Score (17/48, severe) and runs the readiness gate from the record: unexplained iron-deficiency anaemia with weight loss defers surgery, whatever the knee looks like.",
    "Claude's verdict is checked against the app's gate; the chip says whether they agree.",
    "Every optimisation item is linked to the gate item it clears. Ticking dental, skin or MRSA clears those gate items straight away.",
    "Try it: set the GI result to 'Complete, no malignancy', HbA1c 7.6 and Hb 13.2, and tick the last three items. The gate turns to Proceed and listing unlocks. Then set 'Cancer found', which is what happened to Thomas: the gate defers again.",
  ],
  guide: [
    "Look at the app's function score and readiness gate.",
    "Ask Claude to draft the surgical plan.",
    "Accept, edit or reject the plan options; work through the optimisation checklist.",
    "Record results as they come back; the gate re-computes.",
    "List for surgery once the gate says Proceed, or file the deferral.",
  ],
  mount(root, ctx) {
    const oks = 17;
    const state = { hba1c: 9.1, hb: 10.2, bmi: 31.2, nsaidStopped: true, giResult: "pending", dental: false, skin: false, mrsa: false };
    const done = new Set();
    let d = null, options = null, listed = false, lastVerdict = tkaReadiness(state).verdict;

    root.innerHTML = "";
    const view = el(`<div class="or">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Readiness gate (app)</span><span class="tile__v or__verdict" id="t-verdict"></span><span class="tile__u" id="t-open"></span></div>
        <div class="tile"><span class="label">Oxford Knee Score (app)</span><span class="tile__v">${oks} / 48</span><span class="tile__u">${oxfordKneeBand(oks)}</span></div>
        <div class="tile"><span class="label">X-ray, right knee</span><span class="tile__v">KL 4</span><span class="tile__u">12° varus · FFD 10° · flexion 105°</span></div>
        <div class="tile"><span class="label">BMI</span><span class="tile__v">${state.bmi}</span><span class="tile__u">below the 40 threshold</span></div>
      </section>
      <div class="or__top">
        <section><h3 class="section-title">Readiness gate (app)</h3><ul class="facts" id="gate"></ul></section>
        <section class="or__results"><h3 class="section-title">Record results</h3><p class="hint">The gate re-computes as results come back.</p>
          <label class="field">GI work-up<select id="gi">${Object.entries(GI).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
          <div class="or__nums"><label class="field">HbA1c (%)<input type="number" step="0.1" id="hba1c" value="${state.hba1c}"></label><label class="field">Hb (g/dL)<input type="number" step="0.1" id="hb" value="${state.hb}"></label></div>
        </section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to draft the surgical plan</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    function gate() {
      const g = tkaReadiness(state);
      $("#t-verdict").textContent = g.verdict;
      $("#t-open").textContent = g.open ? `${g.open} item${g.open === 1 ? "" : "s"} open` : "nothing open";
      $("#gate").innerHTML = g.items.map((i) => `<li><span class="dot dot--${DOT[i.status]}"></span><span>${esc(i.text)}</span><small class="muted">${i.status === "ok" ? "clear" : i.status}</small></li>`).join("");
      if (g.verdict !== lastVerdict) { audit.add(`App gate: ${lastVerdict} → ${g.verdict}`, g.verdict === "Proceed" ? "accept" : "info"); lastVerdict = g.verdict; }
      if (d) plan();
    }
    gate();

    $("#gi").onchange = (e) => { state.giResult = e.target.value; audit.add(`GI work-up result recorded: ${GI[state.giResult]}`, state.giResult === "cancer" ? "reject" : "info"); gate(); };
    for (const k of ["hba1c", "hb"]) $(`#${k}`).addEventListener("change", (e) => { if (e.target.value === "") return; state[k] = Number(e.target.value); audit.add(`${k === "hb" ? "Hb" : "HbA1c"} updated to ${state[k]}`, "info"); gate(); });

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const g = tkaReadiness(state);
      const payload = {
        opd: ctx.mod.defaultInput,
        imaging: ctx.patient.documents.kneeXray,
        appChecks: [`Oxford Knee Score ${oks}/48 (${oxfordKneeBand(oks)})`, `Readiness gate: ${g.verdict}`, ...g.items.map((i) => `${i.status === "ok" ? "Clear" : i.status === "defer" ? "Defer" : "Optimise"}: ${i.text}`)],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is pulling the knee, the diabetes and the anaemia together…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Surgical plan drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="or__out">
        <section class="headline-card"><span class="label">Claude's go / no-go</span><h3>${esc(d.summary.verdict)}</h3><p>${esc(d.summary.reason)}</p><p id="agree"></p></section>
        <div class="handover">
          <section><h3 class="section-title">Indication</h3><ul class="facts">${d.indication.map((i) => `<li><span class="dot dot--${i.status === "ok" ? "ok" : "warn"}"></span><span>${esc(i.point)}</span><small class="muted">${i.status === "ok" ? "" : "missing"}</small></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Optimisation checklist</h3><ul class="tasks" id="checklist"></ul></section>
        </div>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Plan options (surgeon's choice)</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="options"></div></section>
        <section><h3 class="section-title">Risk stratification</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Risk factor</th><th>Finding</th><th>Impact</th><th>Mitigation</th></tr></thead><tbody>${d.risks.map((r) => `<tr><td>${esc(r.factor)}</td><td>${esc(r.finding)}</td><td>${esc(r.impact)}</td><td>${esc(r.mitigation)}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="brief"><span class="label">Consent discussion points (plain English)</span><ul class="or__consent">${d.consent.map((c, i) => `<li><label class="check"><input type="checkbox" data-c="${i}"> <span><strong>${esc(c.kind)}.</strong> ${esc(c.text)}</span></label></li>`).join("")}</ul></section>
        <section><h3 class="section-title">Rehabilitation protocol</h3><ol class="or__rehab">${d.rehab.map((r) => `<li><strong>${esc(r.phase)}</strong><span>${esc(r.milestones)}</span></li>`).join("")}</ol></section>
        <div class="actions-row"><button class="btn btn--primary" id="list">List for surgery</button><button class="btn btn--approve" id="file">Approve &amp; file plan</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      options = reviewList(g.querySelector("#options"), d.options.map((o, i) => ({ key: String(i), label: o.topic, text: o.options, meta: esc(o.note) })), { audit, noun: "plan option" });
      g.querySelector("#accept-all").onclick = () => options.acceptAll();
      g.querySelectorAll("[data-c]").forEach((c) => c.addEventListener("change", () => { if (c.checked) audit.add(`Discussed with Thomas: ${d.consent[Number(c.dataset.c)].kind}`, "info"); }));
      g.querySelector("#list").onclick = (e) => { listed = true; audit.add("Listed for right TKA", "accept"); e.target.disabled = true; e.target.textContent = "✓ Listed"; };
      g.querySelector("#file").onclick = () => {
        const gt = tkaReadiness(state);
        ctx.file([
          `## Readiness gate (app)`, `**${gt.verdict}**`, ...gt.items.map((i) => `- ${i.status === "ok" ? "✅" : i.status === "defer" ? "❌" : "⚠️"} ${i.text}`),
          `## Claude's go / no-go`, `${d.summary.verdict}: ${d.summary.reason}`,
          `## Plan options`, ...options.states().map((o) => `- ${o.label}: ${o.text} (${o.status})`),
          `## Optimisation checklist`, ...d.checklist.map((c, i) => `- [${done.has(i) ? "x" : " "}] ${c.item} (${c.owner})`),
          `## Listing`, listed ? "Listed for right TKA." : `Not listed: ${gt.verdict.toLowerCase()}.`,
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      plan();
    }

    function plan() {
      const g = tkaReadiness(state);
      const agree = view.querySelector("#agree");
      if (!agree) return;
      agree.innerHTML = d.summary.verdict === g.verdict ? `<span class="chip">Matches the app's gate</span>` : `<span class="chip">App gate now says: ${esc(g.verdict)}</span>`;
      const list = view.querySelector("#checklist");
      list.innerHTML = d.checklist.map((c, i) => `<li class="${done.has(i) ? "is-done" : ""}"><input type="checkbox" data-t="${i}" ${done.has(i) ? "checked" : ""} aria-label="Done"><span class="time">${esc(c.owner)}</span><span>${esc(c.item)}${c.gate !== "none" ? `<br><small class="muted">clears: ${esc(g.items.find((x) => x.key === c.gate)?.text || c.gate)}</small>` : ""}</span></li>`).join("");
      list.querySelectorAll("[data-t]").forEach((cb) => cb.addEventListener("change", () => {
        const i = Number(cb.dataset.t), c = d.checklist[i];
        cb.checked ? done.add(i) : done.delete(i);
        audit.add(`${cb.checked ? "Done" : "Reopened"}: ${c.item} (${c.owner})`, cb.checked ? "accept" : "info");
        if (["dental", "skin", "mrsa"].includes(c.gate)) state[c.gate] = cb.checked;
        gate();
      }));
      const btn = view.querySelector("#list");
      if (!listed) { btn.disabled = g.verdict !== "Proceed"; btn.title = g.verdict === "Proceed" ? "" : `Locked: ${g.verdict}`; btn.textContent = g.verdict === "Proceed" ? "List for surgery" : "Listing locked by the gate"; }
    }
  },
};
