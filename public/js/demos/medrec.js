// Med reconciliation clinician view: home, ICU and draft ward orders side by side; the pharmacist
// accepts Claude's recommendation per line and the final ward order is built from those decisions.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { idealBodyWeight, adjustedBodyWeight, cockcroftGault, qtRisk, egfrCkdEpi2021 } from "../clinical.js";

const REC = { Continue: "", Change: "warn", Stop: "danger", Hold: "warn", Restart: "ok", "Do not restart": "danger", "Only if tested": "warn" };
const ICU_QT = ["Ondansetron 4 mg IV PRN", "Domperidone 10 mg TDS", "Enoxaparin 40 mg", "Octreotide 100 µg"];

export default {
  notes: [
    "The junior doctor's draft restarts empagliflozin two days after it caused DKA, plus metformin and telmisartan during a recovering kidney injury. Each is caught and held.",
    "The app calculates creatinine clearance with the working shown (adjusted body weight 72.1 kg → 51 mL/min) and flags QTc 478 ms with two QT-prolonging drugs.",
    "Accept or override each recommendation: the final ward order column is built from the pharmacist's decisions, not from the draft.",
    "The stewardship review recommends stopping the antibiotic on day 3, the step that was later skipped in Thomas's story before C. difficile appeared.",
  ],
  guide: [
    "Compare home, ICU and draft ward orders side by side; check the app's calculations.",
    "Ask Claude to reconcile every line and review the antibiotic.",
    "Accept or override each recommendation; the final ward order builds as you go.",
    "Choose the antibiotic plan and send the reconciled orders to the prescriber.",
  ],
  mount(root, ctx) {
    const ibw = idealBodyWeight(168, "male");
    const abw = adjustedBodyWeight(84, ibw);
    const crcl = cockcroftGault({ age: 58, weightKg: abw, creatinine: 1.6 });
    const egfr = egfrCkdEpi2021(1.6, 58, "male");
    const qt = qtRisk(478, "male", ICU_QT);
    let d = null;
    const decisions = {};

    root.innerHTML = "";
    const view = el(`<div class="mr">
      <section class="tiles">
        <div class="tile"><span class="label">CrCl (Cockcroft-Gault, app)</span><span class="tile__v">${crcl}</span><span class="tile__u">mL/min · ABW ${abw} kg (IBW ${ibw}) · creatinine 1.6</span></div>
        <div class="tile"><span class="label">eGFR (CKD-EPI 2021)</span><span class="tile__v">${egfr}</span><span class="tile__u">mL/min/1.73 m² · admission 2.4 → 1.6</span></div>
        <div class="tile" data-s="${qt.flag ? 3 : 0}"><span class="label">QT check (app)</span><span class="tile__v">478</span><span class="tile__u">QTc ms, limit ${qt.limit} · ${qt.drugs.length} QT drugs: ${qt.drugs.map((x) => x.split(" ")[0]).join(", ")}</span></div>
        <div class="tile"><span class="label">Antibiotic day (app)</span><span class="tile__v">Day 3</span><span class="tile__u">Pip-tazo from 20 Sep 06:40 · afebrile 36 h → 48 h tomorrow</span></div>
      </section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Reconcile with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = 0; return () => `11:${String(10 + m++).padStart(2, "0")}`; })() });

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = { transfer: ctx.mod.defaultInput, calculations: [`CrCl ${crcl} mL/min (Cockcroft-Gault, adjusted body weight ${abw} kg, creatinine 1.6)`, `eGFR ${egfr}`, `QTc 478 ms (limit ${qt.limit}) with ${qt.drugs.join(", ")}`, "Piperacillin-tazobactam day 3; afebrile 36 h"] };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reconciling every list…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Reconciliation drafted", "info");
      render();
    };

    const FINAL = { Stop: "Stopped", Hold: "On hold", "Do not restart": "Not restarted", "Only if tested": "Only after a C. difficile re-test" };
    const finalOrder = (r, i) => {
      if (!decisions[i]) return '<span class="muted">Awaiting decision</span>';
      if (decisions[i] === "override") return `${esc(r.draft)} <small class="muted">(draft kept)</small>`;
      return `<strong>${esc(FINAL[r.recommendation] ?? r.detail)}</strong>`;
    };
    const conflicts = (r) => /restart|continue/i.test(r.draft) && ["Stop", "Hold", "Do not restart"].includes(r.recommendation);

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const decided = Object.keys(decisions).length;
      const v = el(`<div class="mr__out">
        <section><h3 class="section-title">Safety flags</h3><div class="review">${d.flags.map((f, i) => `<div class="flag-card" style="border-left-color:${i < 4 ? "var(--danger)" : "var(--warn)"}"><strong>${i + 1}. ${esc(f.title)}</strong><p>${esc(f.action)}</p></div>`).join("")}</div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Reconciliation</h3><span class="hint">${decided} of ${d.rows.length} decided · <button class="rbtn" id="all">Accept remaining</button></span></div>
          <div class="table-wrap"><table class="lk-table mr__table"><thead><tr><th>Drug</th><th>Home</th><th>ICU</th><th>Draft ward order</th><th>Recommendation</th><th>Final ward order</th><th></th></tr></thead><tbody>
          ${d.rows.map((r, i) => `<tr class="${conflicts(r) ? "is-conflict" : ""}"><td><strong style="font-weight:500">${esc(r.drug)}</strong></td><td>${esc(r.home)}</td><td>${esc(r.icu)}</td><td>${esc(r.draft)}</td>
            <td><span class="status t-${REC[r.recommendation] || ""}">${REC[r.recommendation] ? `<span class="dot dot--${REC[r.recommendation]}"></span>` : ""}${esc(r.recommendation)}</span><br><small class="muted">${esc(r.reason)}</small></td>
            <td>${finalOrder(r, i)}</td>
            <td style="white-space:nowrap"><button class="rbtn rbtn--accept" data-acc="${i}" aria-pressed="${decisions[i] === "accept"}">✓ Accept</button> <button class="rbtn" data-ovr="${i}" aria-pressed="${decisions[i] === "override"}">Keep draft</button></td></tr>`).join("")}</tbody></table></div></section>
        <div class="handover">
          <section><h3 class="section-title">Antibiotic stewardship (day 3)</h3><dl class="sbar"><dt>Indication</dt><dd>${esc(d.stewardship.indication)}</dd><dt>Microbiology</dt><dd>${esc(d.stewardship.micro)}</dd><dt>Trajectory</dt><dd>${esc(d.stewardship.trajectory)}</dd></dl>
            <div class="options" style="margin-top:10px"><label class="option"><input type="radio" name="abx" value="stop"><span><strong>Stop today</strong> <span class="type-tag">Claude suggests</span><br>${esc(d.stewardship.recommendation)}</span></label>
            <label class="option"><input type="radio" name="abx" value="continue"><span><strong>Continue with a stop date</strong><br>${esc(d.stewardship.alternative)}</span></label></div></section>
          <section><h3 class="section-title">C. difficile risk</h3><p class="hint" style="margin:0 0 4px">Present</p><ul class="plain-list">${d.cdiff.present.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><p class="hint" style="margin:10px 0 4px">Reduce it</p><ul class="plain-list">${d.cdiff.reduce.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <h3 class="section-title" style="margin-top:16px">Questions for the teams</h3><ul class="ddx">${d.questions.map((q, i) => `<li><strong>${esc(q.team)}</strong> ${esc(q.question)} <button class="rbtn" data-q="${i}">Send</button></li>`).join("")}</ul></section>
        </div>
        <div class="actions-row"><button class="btn btn--approve" id="send">Send reconciled orders to prescriber</button><span class="hint" id="pending"></span><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(v);
      const q = (s) => v.querySelector(s);
      v.querySelectorAll("[data-acc],[data-ovr]").forEach((b) => b.addEventListener("click", () => {
        const i = b.dataset.acc ?? b.dataset.ovr;
        const kind = b.dataset.acc != null ? "accept" : "override";
        decisions[i] = decisions[i] === kind ? undefined : kind;
        if (!decisions[i]) delete decisions[i];
        const r = d.rows[i];
        audit.add(kind === "accept" ? `Accepted: ${r.drug} → ${r.recommendation}` : `Overrode recommendation for ${r.drug}: kept draft "${r.draft}"`, kind === "accept" ? "accept" : "edit");
        render();
      }));
      q("#all").onclick = () => { let n = 0; d.rows.forEach((_, i) => { if (!decisions[i]) { decisions[i] = "accept"; n++; } }); if (n) audit.add(`Accepted the remaining ${n} recommendations`, "accept"); render(); };
      v.querySelectorAll("[name=abx]").forEach((r) => r.addEventListener("change", () => audit.add(r.value === "stop" ? "Antibiotic plan: stop piperacillin-tazobactam today" : "Antibiotic plan: continue at full dose, stop date 24 Sep", "accept")));
      v.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => { const x = d.questions[b.dataset.q]; audit.add(`Sent to ${x.team}: ${x.question}`, "info"); b.disabled = true; b.textContent = "✓ Sent"; }));
      const left = d.rows.length - Object.keys(decisions).length;
      q("#pending").textContent = left ? `${left} line${left === 1 ? "" : "s"} still to decide` : "Every line decided";
      q("#send").disabled = left > 0;
      q("#send").onclick = () => {
        const abx = v.querySelector("[name=abx]:checked")?.value;
        ctx.file([
          "## Safety flags", ...d.flags.map((f, i) => `${i + 1}. **${f.title}:** ${f.action}`),
          "## Calculations (app)", `CrCl ${crcl} mL/min (ABW ${abw} kg); eGFR ${egfr}; QTc 478 ms with ${qt.drugs.join(", ")}`,
          "## Reconciled ward orders", `| Drug | Draft | Decision | Final |\n|---|---|---|---|\n${d.rows.map((r, i) => `| ${r.drug} | ${r.draft} | ${decisions[i] === "override" ? "Kept draft" : r.recommendation} | ${decisions[i] === "override" ? r.draft : r.detail} |`).join("\n")}`,
          "## Antibiotic stewardship", abx === "stop" ? `**Stop today.** ${d.stewardship.recommendation}` : abx === "continue" ? `**Continue with stop date.** ${d.stewardship.alternative}` : "_Plan not chosen_",
          "## Provisional discharge list", ...d.dischargeList.map((x) => `- ${x}`),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        audit.add("Reconciled orders sent to the prescriber", "accept");
        q("#send").disabled = true;
        q("#filed").textContent = "✓ Sent and filed to Thomas's record";
      };
    }
  },
};
