// Insurance desk clinician view: the family's room choice drives a live deduction calculator
// (app-side, clause 5.1 and 7.1), and Claude prepares the pre-authorisation packet.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { preauthEstimate } from "../clinical.js";

const SUM_INSURED = 1000000;
const BONUS = 200000;
const ROOMS = [
  { name: "Twin sharing", rate: 6000 },
  { name: "Single room", rate: 9500 },
  { name: "Deluxe single", rate: 12000 },
  { name: "Suite", rate: 18000 },
];
const HEADS = [
  { key: "room", label: "Room (5 days)", rule: "room" },
  { key: "hdu", label: "HDU (1 day)", amount: 18000, days: 1, rule: "icu" },
  { key: "ot", label: "Surgeon, anaesthetist and OT", amount: 165000, rule: "proportional" },
  { key: "dev", label: "Laparoscopic staplers and energy device", amount: 72000, rule: "exempt" },
  { key: "inv", label: "Investigations", amount: 28000, rule: "proportional" },
  { key: "ph", label: "Pharmacy and IV fluids", amount: 38000, rule: "exempt" },
  { key: "nm", label: "Non-medical consumables (Annexure II)", amount: 9000, rule: "excluded" },
  { key: "nu", label: "Nursing and other charges", amount: 15000, rule: "proportional" },
];
const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const RISK = { ok: ["ok", "Covered"], check: ["warn", "Check"], fail: ["danger", "Not covered"] };

export default {
  notes: [
    "Pick a room and watch the patient share change. Above the ₹10,000/day cap, the insurer pays a smaller share of the surgeon, OT, investigation and nursing bills too, not just the room.",
    "Tick \"cap includes cumulative bonus\" to see what happens if the TPA confirms the bonus counts: the cap rises to ₹12,000 and the deduction disappears.",
    "The arithmetic is done by the app from the policy clauses. Claude checks each clause, drafts the necessity letter and prepares answers to likely TPA queries.",
    "The letter is strictly factual: it states laparoscopic, not robotic, so the 50% modern-treatment sub-limit does not apply.",
  ],
  guide: [
    "Choose the family's room. The app recalculates deductions and the patient share.",
    "Ask Claude to prepare the packet: clause check, letter, documents and query responses.",
    "Tick off each document and edit the letter.",
    "Submit to the TPA; the packet is filed to Thomas's record.",
  ],
  mount(root, ctx) {
    const state = { room: ROOMS[2], includeBonus: false };
    let d = null;
    root.innerHTML = "";
    const view = el(`<div class="pa">
      <section class="pa__calc">
        <div>
          <span class="kicker">Estimate · laparoscopic anterior resection · 6 days</span>
          <div class="rooms" role="radiogroup" aria-label="Room category">${ROOMS.map((r, i) => `<label class="slot"><input type="radio" name="room" value="${i}"${r === state.room ? " checked" : ""}> ${esc(r.name)} · ${inr(r.rate)}/day</label>`).join("")}</div>
          <label class="check"><input type="checkbox" id="bonus"> Room cap includes the ₹2,00,000 cumulative bonus (confirm with the TPA)</label>
        </div>
        <div class="pa__share" id="share"></div>
      </section>
      <div class="table-wrap card-v" style="padding:0;overflow:hidden"><table class="lk-table" id="table"></table></div>
      <div class="actions-row"><button class="btn btn--primary" id="ask">Prepare the packet with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="packet"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = 0; return () => `11:${String(20 + m++).padStart(2, "0")}`; })() });

    const estimate = () => preauthEstimate({ heads: HEADS, roomRate: state.room.rate, roomDays: 5, sumInsured: SUM_INSURED, bonus: BONUS, includeBonus: state.includeBonus });

    function renderCalc() {
      const e = estimate();
      $("#share").innerHTML = `<span class="label">Estimated patient share (app)</span><div class="pa__big">${inr(e.patientShare)}</div>
        <p>Total ${inr(e.total)} · insurer pays ${inr(e.payable)}</p>
        <p>Room cap ${inr(e.roomCap)}/day${e.proportion < 1 ? ` · proportion ${(e.proportion * 100).toFixed(1)}%` : " · no proportionate deduction"}</p>`;
      $("#table").innerHTML = `<thead><tr><th>Head</th><th class="num">Estimate</th><th class="num">Expected payable</th><th>Note</th></tr></thead><tbody>
        ${e.rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="num">${inr(r.amount)}</td><td class="num">${inr(r.payable)}</td><td class="muted">${esc(r.note)}</td></tr>`).join("")}
        <tr class="total-row"><td>Total</td><td class="num">${inr(e.total)}</td><td class="num">${inr(e.payable)}</td><td>Patient share ${inr(e.patientShare)}</td></tr></tbody>`;
      if (d) $("#live-share").textContent = `App figure for the current choice (${state.room.name}): patient share ${inr(e.patientShare)}.`;
    }
    view.querySelectorAll("[name=room]").forEach((r) => r.addEventListener("change", () => {
      state.room = ROOMS[r.value];
      audit.add(`Family chose ${state.room.name} (${inr(state.room.rate)}/day): patient share ${inr(estimate().patientShare)}`, "edit");
      renderCalc();
    }));
    $("#bonus").addEventListener("change", (e) => { state.includeBonus = e.target.checked; audit.add(`Room cap ${state.includeBonus ? "includes" : "excludes"} the cumulative bonus`, "edit"); renderCalc(); });
    renderCalc();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const e = estimate();
      const payload = { request: ctx.mod.defaultInput, room: `${state.room.name} at ${inr(state.room.rate)}/day`, total: e.total.toLocaleString("en-IN"), payable: e.payable.toLocaleString("en-IN"), patientShare: e.patientShare.toLocaleString("en-IN"), capBasis: state.includeBonus ? "sum insured plus cumulative bonus" : "base sum insured" };
      const result = await withClaude($("#packet"), (o) => ctx.ask(payload, o), { label: "Claude is preparing the packet…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Packet prepared", "info");
      renderPacket();
      renderCalc();
    };

    function renderPacket() {
      const box = $("#packet");
      box.innerHTML = "";
      const p = el(`<div class="pa__packet">
        <section class="headline-card"><span class="label">Readiness</span><h3>${esc(d.verdict.status)}</h3><ol class="glance">${d.verdict.risks.map((r) => `<li>${esc(r)}</li>`).join("")}</ol></section>
        <section><h3 class="section-title">Policy coverage check</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Clause</th><th>What it says</th><th>This case</th><th>Risk</th></tr></thead><tbody>
          ${d.coverage.map((c) => `<tr><td><strong style="font-weight:500">${esc(c.clause)}</strong></td><td>${esc(c.says)}</td><td>${esc(c.thisCase)}</td><td><span class="status t-${RISK[c.risk][0]}"><span class="dot dot--${RISK[c.risk][0]}"></span>${RISK[c.risk][1]}</span></td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Medical necessity letter</h3><label class="note-field"><textarea id="letter" style="min-height:320px">${esc(d.letter)}</textarea></label></section>
        <div class="handover">
          <section><h3 class="section-title">Documents</h3><ul class="tasks">${d.documents.map((x, i) => `<li style="grid-template-columns:22px 1fr"><input type="checkbox" data-doc="${i}" aria-label="${esc(x)}"><span>${esc(x)}</span></li>`).join("")}</ul><p class="hint" id="doc-count"></p></section>
          <section><h3 class="section-title">Likely TPA queries</h3><ul class="ddx">${d.queries.map((x) => `<li><strong>${esc(x.query)}</strong><br>${esc(x.response)}</li>`).join("")}</ul></section>
        </div>
        <section class="brief"><span class="label">Explaining it to the family</span><p style="margin:6px 0">${esc(d.family)}</p><p class="hint" id="live-share" style="margin:0"></p></section>
        <div class="actions-row"><button class="btn btn--approve" id="submit">Submit to TPA</button><span class="hint" id="block"></span><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(p);
      const q = (s) => p.querySelector(s);
      const count = () => { const n = p.querySelectorAll("[data-doc]:checked").length; q("#doc-count").textContent = `${n} of ${d.documents.length} attached`; return n; };
      count();
      p.querySelectorAll("[data-doc]").forEach((c) => c.addEventListener("change", () => { count(); audit.add(`${c.checked ? "Attached" : "Removed"}: ${d.documents[c.dataset.doc]}`, c.checked ? "accept" : "info"); }));
      q("#letter").addEventListener("change", () => audit.add("Edited the medical necessity letter", "edit"));
      q("#submit").onclick = () => {
        const missing = d.documents.length - count();
        const e = estimate();
        audit.add(`Submitted to TPA with ${d.documents.length - missing} of ${d.documents.length} documents; room ${state.room.name}`, "accept");
        ctx.file([
          `## Readiness`, `**${d.verdict.status}**`, ...d.verdict.risks.map((r) => `- ${r}`),
          `## Estimate (app)`, `Room: ${state.room.name} at ${inr(state.room.rate)}/day. Total ${inr(e.total)}; expected payable ${inr(e.payable)}; **patient share ${inr(e.patientShare)}**.`,
          `| Head | Estimate | Payable |\n|---|---|---|\n${e.rows.map((r) => `| ${r.label} | ${inr(r.amount)} | ${inr(r.payable)} |`).join("\n")}`,
          `## Medical necessity letter`, q("#letter").value.trim(),
          `## Documents`, ...d.documents.map((x, i) => `- [${p.querySelector(`[data-doc="${i}"]`).checked ? "x" : " "}] ${x}`),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        q("#submit").disabled = true;
        q("#filed").textContent = missing ? `✓ Submitted with ${missing} document${missing === 1 ? "" : "s"} still to follow` : "✓ Submitted and filed";
      };
    }
  },
};
