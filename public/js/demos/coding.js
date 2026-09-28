// Coding & billing audit clinician view: the app flags duplicate and pre-admission bill lines,
// checks every code's evidence is verbatim in the record, and reconciles the claim against the
// approval live as the coder accepts or rejects each finding. Submission is blocked while a
// finding is undecided or the claim exceeds the approval.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { inr, billChecks, claimReconcile, evidenceFound } from "../clinical.js";

const ADMIT = "2026-08-18", APPROVAL = 385000, PATIENT_PAYABLE = 9000;
const BILL = [
  { id: "room", item: "Room, standard single, 5 days × ₹9,500", amount: 47500, date: "2026-08-18" },
  { id: "hdu", item: "HDU, 1 day", amount: 18000, date: "2026-08-19" },
  { id: "ot", item: "Surgeon, anaesthetist and OT charges", amount: 165000, date: "2026-08-19" },
  { id: "stapler", item: "Laparoscopic stapler and energy device", amount: 72000, date: "2026-08-19" },
  { id: "echo1", item: "Stress echocardiogram", amount: 6500, date: "2026-08-11" },
  { id: "echo2", item: "Stress echocardiogram", amount: 6500, date: "2026-08-11" },
  { id: "inv", item: "Other investigations", amount: 18200, date: "2026-08-18" },
  { id: "fcm", item: "Ferric carboxymaltose 1 g", amount: 9800, date: "2026-08-06" },
  { id: "pharm", item: "Other pharmacy and IV fluids", amount: 35000, date: "2026-08-18" },
  { id: "nmc", item: "Non-medical consumables", amount: 9000, date: "2026-08-18" },
  { id: "nursing", item: "Nursing and other charges", amount: 15000, date: "2026-08-18" },
];
const STATUS = { correct: "Correct", add: "Add", amend: "Amend", remove: "Remove", query: "Coder query" };

export default {
  notes: [
    "The app reads the draft bill first: the stress echo appears twice, and three lines are dated before the 18 Aug admission. Claude explains what to do with each.",
    "Every code comes with a quote from the record, and the app checks the quote is really there. A code without documentation cannot be claimed.",
    "The post-operative ileus is a coder query, not a code: send it to the surgeon rather than coding a complication.",
    "Try it: reject the duplicate-echo removal. The claim goes ₹2,700 over the approval and submission is blocked until an enhancement is raised. Accept it again and the headroom returns to ₹3,800.",
  ],
  guide: [
    "Look at the draft bill and the app's line checks.",
    "Ask Claude to audit the codes and the bill.",
    "Accept, edit or reject each code and each billing finding; the reconciliation updates.",
    "Send the coder query and documentation feedback.",
    "Submit the claim when nothing is undecided and it fits the approval.",
  ],
  mount(root, ctx) {
    const checks = billChecks(BILL, ADMIT);
    const record = ctx.mod.defaultInput;
    let d = null, codes = null, billing = null, procedureOk = false, queried = false, submitted = false;

    root.innerHTML = "";
    const view = el(`<div class="cb">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Draft inpatient bill</span><span class="tile__v">${inr(checks.total)}</span><span class="tile__u">18–24 Aug · ${BILL.length} lines</span></div>
        <div class="tile"><span class="label">Cashless approval</span><span class="tile__v">${inr(APPROVAL)}</span><span class="tile__u">14 Aug · standard single</span></div>
        <div class="tile"><span class="label">Duplicate lines (app)</span><span class="tile__v">${checks.duplicates.length}</span><span class="tile__u">same item billed twice</span></div>
        <div class="tile"><span class="label">Pre-admission lines (app)</span><span class="tile__v">${checks.preAdmission.length}</span><span class="tile__u">dated before 18 Aug</span></div>
      </section>
      <section><h3 class="section-title">Draft bill</h3><div class="table-wrap"><table class="lk-table cb__bill"><thead><tr><th>Line</th><th>Date</th><th class="num">Amount</th><th>App check</th></tr></thead><tbody>
        ${BILL.map((l) => { const flags = [checks.duplicates.includes(l.id) ? "Duplicate" : "", checks.preAdmission.includes(l.id) ? "Before admission" : ""].filter(Boolean); return `<tr data-flag="${flags.length > 0}"><td>${esc(l.item)}</td><td>${new Date(l.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</td><td class="num">${inr(l.amount)}</td><td>${flags.map((f) => `<span class="dot dot--warn"></span> ${f}`).join("<br>")}</td></tr>`; }).join("")}
        <tr class="cb__total"><td>Total</td><td></td><td class="num">${inr(checks.total)}</td><td></td></tr></tbody></table></div>
        <p class="hint">Draft codes: C18.7, E11.9, I10 · Procedure: "Anterior resection of rectum"</p></section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to audit the claim</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        record,
        appChecks: [
          `Draft bill total ${inr(checks.total)}; approval ${inr(APPROVAL)}; non-medical consumables ${inr(PATIENT_PAYABLE)} patient-payable`,
          `Duplicate lines: ${checks.duplicates.map((id) => BILL.find((l) => l.id === id).item).join(", ")}`,
          `Dated before admission (${ADMIT}): ${checks.preAdmission.map((id) => BILL.find((l) => l.id === id).item).join(", ")}`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading the record against the codes and the bill…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Coding and billing audit drafted", "info");
      render();
    };

    const findings = () => billing.states().map((s, i) => ({ ...d.billing.filter((b) => b.kind !== "none")[i], accepted: s.status === "accepted" || s.status === "edited", status: s.status }));
    const reconcile = () => claimReconcile({ draftTotal: checks.total, findings: findings(), patientPayable: PATIENT_PAYABLE, approval: APPROVAL });

    function finalCodes() {
      return codes.states().map((s, i) => ({ ...d.codes[i], status: d.codes[i].status, decision: s.status })).filter((c) => (c.status === "remove" ? c.decision !== "accepted" : c.decision === "accepted" || c.decision === "edited"));
    }

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="cb__out">
        <section class="headline-card"><span class="label">Audit summary</span><ul class="cb__summary">${d.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Diagnosis coding</h3><span class="hint">Accepting a "Remove" takes the code off the claim</span></div><div id="codes"></div><div id="final-codes"></div></section>
        <section class="cb__proc"><h3 class="section-title">Procedure description</h3><p><span class="muted">Draft:</span> ${esc(d.procedure.draft)}</p><p><span class="muted">Suggested:</span> <strong>${esc(d.procedure.suggested)}</strong></p><p class="hint">${esc(d.procedure.why)}</p><button class="rbtn rbtn--accept" id="proc">Use suggested wording</button></section>
        <div class="cb__rec">
          <section><div class="review-tools"><h3 class="section-title" style="margin:0">Billing findings</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="billing"></div>
            ${d.billing.filter((b) => b.kind === "none").map((b) => `<p class="hint">${esc(b.item)}: ${esc(b.action)} (${inr(b.amount)})</p>`).join("")}</section>
          <section><h3 class="section-title">Claim reconciliation (app, live)</h3><div id="recon"></div></section>
        </div>
        <section><h3 class="section-title">Documentation feedback</h3><ul class="facts">${d.feedback.map((f) => `<li><span class="dot"></span><span>${esc(f)}</span><span></span></li>`).join("")}</ul><button class="rbtn" id="send-fb">Send feedback to clinicians</button></section>
        <div class="actions-row"><button class="btn btn--primary" id="submit">Submit claim</button><button class="btn btn--approve" id="file">Approve &amp; file audit</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);

      codes = reviewList(g.querySelector("#codes"), d.codes.map((c, i) => {
        const found = evidenceFound(record, c.evidence);
        return { key: String(i), label: `${c.code} · ${STATUS[c.status]}`, text: c.description, meta: `${found ? "✓ Found in record" : "✕ Not found in record"}: “${esc(c.evidence)}”${c.status === "query" ? `<br><button class="rbtn" data-query="${i}">Send coder query to surgeon</button>` : ""}` };
      }), { audit, noun: "code", onChange: update });
      g.querySelector("#codes").addEventListener("click", (e) => {
        const b = e.target.closest("[data-query]");
        if (!b) return;
        queried = true;
        audit.add(`Coder query sent to the surgeon: ${d.codes[Number(b.dataset.query)].evidence}`, "info");
        b.disabled = true;
        b.textContent = "✓ Query sent";
      });
      billing = reviewList(g.querySelector("#billing"), d.billing.filter((b) => b.kind !== "none").map((b, i) => ({
        key: String(i), label: `${b.finding} · ${inr(b.amount)}`, text: `${b.item}: ${b.action}`, meta: `${evidenceFound(record, b.evidence) ? "✓" : "✕"} “${esc(b.evidence)}”`,
      })), { audit, noun: "billing finding", editable: false, onChange: update });
      g.querySelector("#accept-all").onclick = () => billing.acceptAll();
      g.querySelector("#proc").onclick = (e) => { procedureOk = true; audit.add(`Procedure wording changed to: ${d.procedure.suggested}`, "accept"); e.target.disabled = true; e.target.textContent = "✓ Wording updated"; };
      g.querySelector("#send-fb").onclick = (e) => { audit.add("Documentation feedback sent to the surgical, endocrinology and billing teams", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#submit").onclick = (e) => { submitted = true; audit.add(`Claim submitted: insurer-payable ${inr(reconcile().insurer)}`, "accept"); e.target.disabled = true; e.target.textContent = "✓ Submitted"; };
      g.querySelector("#file").onclick = () => {
        const r = reconcile();
        ctx.file([
          `## Final codes`, ...finalCodes().map((c) => `- ${c.code}: ${c.description}`),
          `## Procedure`, procedureOk ? d.procedure.suggested : `${d.procedure.draft} (not amended)`,
          `## Billing findings`, ...findings().map((f) => `- ${f.item}: ${f.action} (${inr(f.amount)}) — ${f.status}`),
          `## Reconciliation (app)`, `- Corrected inpatient bill ${inr(r.corrected)}`, `- Insurer-payable ${inr(r.insurer)} against approval ${inr(APPROVAL)}${r.enhancement ? ` — **enhancement ${inr(r.enhancement)} needed**` : ` (headroom ${inr(r.headroom)})`}`, `- Pre-hospitalisation claim ${inr(r.preHospitalisation)}`,
          `## Status`, submitted ? "Claim submitted." : "Not yet submitted.", queried ? "Coder query sent to the surgeon (ileus)." : "",
          `## Clinician actions`, audit.markdown(),
        ].filter(Boolean).join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      update();
    }

    function update() {
      const r = reconcile(), f = findings();
      const pending = billing.pending();
      const step = (label, amount, sign = "") => `<tr><td>${label}</td><td class="num">${sign}${inr(amount)}</td></tr>`;
      const sum = (k) => f.filter((x) => x.accepted && x.kind === k).reduce((s, x) => s + x.amount, 0);
      view.querySelector("#recon").innerHTML = `<div class="table-wrap"><table class="lk-table"><tbody>
        ${step("Draft inpatient bill", checks.total)}
        ${step("Removed (duplicates)", sum("remove"), "− ")}
        ${step("Moved to pre-hospitalisation", sum("move"), "− ")}
        ${step("Unbilled services added", sum("add"), "+ ")}
        <tr class="cb__total"><td>Corrected inpatient bill</td><td class="num">${inr(r.corrected)}</td></tr>
        ${step("Non-medical consumables (patient pays)", PATIENT_PAYABLE, "− ")}
        <tr class="cb__total"><td>Insurer-payable</td><td class="num">${inr(r.insurer)}</td></tr>
        ${step("Cashless approval", APPROVAL)}
      </tbody></table></div>
      <p class="cb__head" data-over="${r.enhancement > 0}"><span class="dot dot--${r.enhancement ? "danger" : "ok"}"></span> ${r.enhancement ? `Over the approval by ${inr(r.enhancement)}: raise an enhancement before submitting` : `Headroom ${inr(r.headroom)}: no enhancement needed`}</p>
      <p class="hint">Pre-hospitalisation claim: ${inr(r.preHospitalisation)}${pending ? ` · ${pending} finding${pending === 1 ? "" : "s"} undecided` : ""}</p>`;
      const unsupported = finalCodes().filter((c) => !evidenceFound(record, c.evidence));
      view.querySelector("#final-codes").innerHTML = `<p class="cb__codes"><span class="label">Codes on the claim (app)</span> ${finalCodes().map((c) => `<span class="chip">${esc(c.code)}</span>`).join(" ")}</p>${unsupported.length ? `<p class="cb__head" data-over="true"><span class="dot dot--danger"></span> No supporting text in the record for ${unsupported.map((c) => esc(c.code)).join(", ")}</p>` : ""}`;
      const btn = view.querySelector("#submit");
      if (!submitted) {
        const reason = pending ? "Decide every billing finding first" : r.enhancement ? "Over the approval" : unsupported.length ? "Unsupported code on the claim" : "";
        btn.disabled = Boolean(reason);
        btn.textContent = reason ? `Submit blocked: ${reason.toLowerCase()}` : "Submit claim";
      }
    }
  },
};
