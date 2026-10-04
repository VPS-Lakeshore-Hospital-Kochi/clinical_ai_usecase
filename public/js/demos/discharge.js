// Discharge clinician view: the app builds the medication calendar, stop dates and dispense
// quantities from the discharge list; Claude reconciles medicines and writes the pack.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { addDays, daysInclusive } from "../clinical.js";

const DISCHARGE = "24 Aug";
const SURGERY = "19 Aug";
const MEDS = [
  { name: "Metformin 1000 mg", slots: ["m", "n"], note: "after food" },
  { name: "Telmisartan 40 mg", slots: ["m"] },
  { name: "Pantoprazole 40 mg", slots: ["m"], note: "before breakfast", untilDays: [DISCHARGE, 14] },
  { name: "Enoxaparin 40 mg injection", slots: ["n"], note: "same time daily", untilDays: [SURGERY, 28], dispense: true },
  { name: "Insulin glargine 14 units", slots: ["n"], note: "at bedtime" },
  { name: "Atorvastatin 40 mg", slots: ["n"] },
  { name: "Paracetamol 1 g", slots: [], prn: "up to 4 times a day if pain (max 4 g)" },
  { name: "Lactulose 15 mL", slots: [], prn: "at night if no stool for 2 days" },
];
const SLOT = { m: "Morning", a: "Afternoon", n: "Night" };
const CHANGE = { Same: "", Increased: "warn", Decreased: "warn", New: "ok", Stopped: "danger", "On hold": "warn" };

export default {
  notes: [
    "The medication calendar is built by the app from the discharge list. Toggle a time slot and the patient's calendar updates.",
    "The app works out end dates and quantities: enoxaparin until 16 Sep (surgery + 28 days), so 24 syringes to dispense.",
    "Claude's reconciliation catches what a discharge list alone hides: glimepiride and aceclofenac were stopped earlier and must not restart; empagliflozin has no restart date yet.",
    "Every specialty involved gets a follow-up to book, and the patient copy is plain enough for the family to use at home.",
  ],
  guide: [
    "Check the discharge list; adjust time slots. The app builds the calendar and stop dates.",
    "Ask Claude to reconcile the medicines and draft the discharge pack.",
    "Confirm each reconciliation line, address the flags, book follow-ups.",
    "Send the patient copy and file the discharge.",
  ],
  mount(root, ctx) {
    const meds = MEDS.map((m) => ({ ...m, slots: [...m.slots] }));
    let d = null;
    root.innerHTML = "";
    const view = el(`<div class="dc">
      <div class="dc__top">
        <section><h3 class="section-title">Discharge list (app builds the calendar)</h3><div class="table-wrap card-v" style="padding:0;overflow:hidden"><table class="lk-table" id="list"></table></div></section>
        <section class="dose-card" id="calendar"></section>
      </div>
      <div class="actions-row"><button class="btn btn--primary" id="ask">Reconcile and draft with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="pack"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = 0; return () => `10:${String(5 + m++).padStart(2, "0")}`; })() });
    const until = (m) => (m.untilDays ? addDays(...m.untilDays) : null);

    function renderList() {
      $("#list").innerHTML = `<thead><tr><th>Medicine</th>${Object.values(SLOT).map((s) => `<th>${s}</th>`).join("")}<th>Until · quantity</th></tr></thead><tbody>
        ${meds.map((m, i) => `<tr><td><strong style="font-weight:500">${esc(m.name)}</strong>${m.note ? `<br><small class="muted">${esc(m.note)}</small>` : ""}${m.prn ? `<br><small class="muted">When needed: ${esc(m.prn)}</small>` : ""}</td>
          ${Object.keys(SLOT).map((s) => `<td>${m.prn ? "—" : `<input type="checkbox" data-m="${i}" data-s="${s}" ${m.slots.includes(s) ? "checked" : ""} aria-label="${esc(m.name)} ${SLOT[s]}">`}</td>`).join("")}
          <td>${until(m) ? `${until(m)}${m.dispense ? ` · ${daysInclusive(DISCHARGE, until(m)) * m.slots.length} doses` : ""}` : "Ongoing"}</td></tr>`).join("")}</tbody>`;
      const rows = meds.map((m) => `<tr><td>${esc(m.name)}${until(m) ? ` <small class="muted">(until ${until(m)})</small>` : ""}</td>${Object.keys(SLOT).map((s) => `<td>${m.prn ? "if needed" : m.slots.includes(s) ? `<strong>✔</strong>${m.note && s === m.slots[0] ? ` <small class="muted">${esc(m.note)}</small>` : ""}` : ""}</td>`).join("")}</tr>`).join("");
      $("#calendar").innerHTML = `<span class="kicker kicker--rule">Medication calendar · for Mr Thomas</span><div class="table-wrap"><table><thead><tr><th>Medicine</th>${Object.values(SLOT).map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><p class="hint" style="margin:0">Do not restart empagliflozin until we phone you. For queries &amp; appointments +91 9961 640 000</p>`;
    }
    $("#list").addEventListener("change", (e) => {
      const i = e.target.dataset.m, s = e.target.dataset.s;
      if (i == null) return;
      const m = meds[i];
      m.slots = e.target.checked ? [...new Set([...m.slots, s])] : m.slots.filter((x) => x !== s);
      audit.add(`${m.name}: ${e.target.checked ? "added" : "removed"} ${SLOT[s].toLowerCase()} dose`, "edit");
      renderList();
    });
    renderList();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = { admission: ctx.mod.defaultInput, meds: meds.map((m) => `${m.name}: ${m.prn ? `when needed (${m.prn})` : m.slots.map((s) => SLOT[s].toLowerCase()).join(" and ")}${until(m) ? `, until ${until(m)}` : ""}${m.dispense ? `, ${daysInclusive(DISCHARGE, until(m))} doses to dispense` : ""}`) };
      const result = await withClaude($("#pack"), (o) => ctx.ask(payload, o), { label: "Claude is reconciling medicines and drafting the pack…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Discharge pack drafted", "info");
      renderPack();
    };

    function renderPack() {
      const box = $("#pack");
      box.innerHTML = "";
      const p = el(`<div class="dc__pack">
        <section><h3 class="section-title">Medicine reconciliation</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Drug</th><th>Before admission</th><th>At discharge</th><th>Change</th><th>Reason</th><th>Confirmed</th></tr></thead><tbody>
          ${d.reconciliation.map((r, i) => `<tr><td><strong style="font-weight:500">${esc(r.drug)}</strong></td><td>${esc(r.before)}</td><td>${esc(r.atDischarge)}</td><td><span class="status t-${CHANGE[r.change] || ""}">${CHANGE[r.change] ? `<span class="dot dot--${CHANGE[r.change]}"></span>` : ""}${esc(r.change)}</span></td><td>${esc(r.reason)}</td><td><input type="checkbox" data-r="${i}" aria-label="Confirm ${esc(r.drug)}"></td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Flags</h3><ul class="tasks">${d.flags.map((f, i) => `<li style="grid-template-columns:22px 1fr"><input type="checkbox" data-f="${i}" aria-label="Addressed"><span>${esc(f)}</span></li>`).join("")}</ul></section>
        <div class="handover">
          <section><h3 class="section-title">Discharge summary</h3><dl class="sbar"><dt>Diagnoses</dt><dd><ol style="margin:0;padding-left:18px">${d.summary.diagnoses.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></dd>
            <dt>Procedure</dt><dd>${esc(d.summary.procedure)}</dd><dt>Course</dt><dd>${esc(d.summary.course)}</dd><dt>At discharge</dt><dd>${esc(d.summary.atDischarge)}</dd><dt>Pending</dt><dd>${esc(d.summary.pending)}</dd><dt>Plan</dt><dd>${esc(d.summary.plan)}</dd></dl></section>
          <section><h3 class="section-title">Follow-up</h3><ul class="ddx">${d.followUp.map((f, i) => `<li><strong>${esc(f.when)} · ${esc(f.who)}</strong><br>${esc(f.purpose)} <button class="rbtn" data-b="${i}">Book</button></li>`).join("")}</ul></section>
        </div>
        <section class="dc__patient"><span class="kicker kicker--rule">Patient copy</span>${d.patient.map((s, i) => `<label class="note-field"><span class="label">${esc(s.heading)}</span><textarea data-p="${i}" rows="3">${esc(s.text)}</textarea></label>`).join("")}
          <button class="rbtn" id="send">Send patient copy and calendar on WhatsApp</button></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve discharge &amp; file</button><span class="hint" id="pending"></span><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(p);
      const q = (s) => p.querySelector(s);
      const pend = () => { const n = d.reconciliation.length - p.querySelectorAll("[data-r]:checked").length; q("#pending").textContent = n ? `${n} reconciliation line${n === 1 ? "" : "s"} not yet confirmed` : "All lines confirmed"; };
      pend();
      p.querySelectorAll("[data-r]").forEach((c) => c.addEventListener("change", () => { pend(); audit.add(`${c.checked ? "Confirmed" : "Unconfirmed"}: ${d.reconciliation[c.dataset.r].drug} (${d.reconciliation[c.dataset.r].change})`, c.checked ? "accept" : "info"); }));
      p.querySelectorAll("[data-f]").forEach((c) => c.addEventListener("change", () => audit.add(`${c.checked ? "Addressed" : "Reopened"} flag: ${d.flags[c.dataset.f].split(":")[0]}`, c.checked ? "accept" : "info")));
      p.querySelectorAll("[data-b]").forEach((b) => b.addEventListener("click", () => { const f = d.followUp[b.dataset.b]; audit.add(`Booked: ${f.who}, ${f.when}`, "accept"); b.disabled = true; b.textContent = "✓ Booked"; }));
      p.querySelectorAll("[data-p]").forEach((t) => t.addEventListener("change", () => audit.add(`Edited patient copy: ${d.patient[t.dataset.p].heading}`, "edit")));
      q("#send").onclick = (e) => { audit.add("Patient copy and calendar sent on WhatsApp", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      q("#file").onclick = () => {
        ctx.file([
          "## Medication safety check", `| Drug | Before | At discharge | Change | Reason |\n|---|---|---|---|---|\n${d.reconciliation.map((r) => `| ${r.drug} | ${r.before} | ${r.atDischarge} | ${r.change} | ${r.reason} |`).join("\n")}`,
          "## Discharge summary", ...d.summary.diagnoses.map((x, i) => `${i + 1}. ${x}`), `**Procedure:** ${d.summary.procedure}`, `**Course:** ${d.summary.course}`, `**At discharge:** ${d.summary.atDischarge}`, `**Plan:** ${d.summary.plan}`,
          "## Follow-up", ...d.followUp.map((f) => `- ${f.when}: ${f.who}, ${f.purpose}`),
          "## Medication calendar (app)", ...meds.map((m) => `- ${m.name}: ${m.prn ? `when needed (${m.prn})` : m.slots.map((s) => SLOT[s]).join(", ")}${until(m) ? `, until ${until(m)}` : ""}`),
          "## Patient copy", ...d.patient.map((s, i) => `**${s.heading}**\n${p.querySelector(`[data-p="${i}"]`).value.trim()}`),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        audit.add("Discharge approved and filed", "accept");
        q("#file").disabled = true;
        q("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }
  },
};
