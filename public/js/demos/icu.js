// ICU round clinician view: the app runs the sepsis and DKA bundle tracker (with a potassium
// gate on insulin) and the calculations; Claude drafts the problem-based plan and drug review.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { anionGap, kdigoStage, dkaInsulinRate, K_INSULIN_THRESHOLD, toMin, toHHMM, fmtDur } from "../clinical.js";

const WEIGHT = 84;
const TIME_ZERO = toMin("04:55"); // sepsis time zero: ED triage (synthetic)
const FLUID_TARGET = 30 * WEIGHT;

export default {
  notes: [
    "Glucose is only 212, yet this is diabetic ketoacidosis: the SGLT2 inhibitor he kept taking hides it. The app calculates the anion gap of 21.",
    "Try to start insulin: it is blocked until a repeat potassium of at least 3.3 is entered. Insulin with low potassium can cause a dangerous fall.",
    "Antibiotics are overdue against the 1-hour sepsis target; the timer shows by how much.",
    "Claude links the severe early toxicity to the DPYD result that was sent but never came back, and gives the 96-hour window for the antidote.",
  ],
  guide: [
    "Work the bundle: record antibiotics, give fluid boluses, replace potassium.",
    "Enter a repeat potassium; insulin can only start once it is at least 3.3.",
    "Ask Claude for the round plan and review each problem and drug.",
    "Approve the plan to file the ICU admission to Thomas's record.",
  ],
  mount(root, ctx) {
    let now = toMin("06:15");
    const state = { antibiotics: null, fluids: 1000, kcl: null, k: 3.1, insulin: null, noradrenaline: null, basal: null };
    const ag = anionGap({ na: 134, cl: 104, hco3: 9 });
    const aki = kdigoStage(2.4, 1.02);
    const rate = dkaInsulinRate(WEIGHT);
    const uridineClose = toMin("08:00") + 3 * 24 * 60; // 23 Sep 08:00 (19 Sep 08:00 + 96 h), in minutes from 20 Sep 00:00

    root.innerHTML = "";
    const view = el(`<div class="icu">
      <section class="icu__calc tiles">
        <div class="tile"><span class="label">Anion gap (app)</span><span class="tile__v">${ag}</span><span class="tile__u">Na 134 − (Cl 104 + HCO₃ 9) · high</span></div>
        <div class="tile"><span class="label">AKI (KDIGO, app)</span><span class="tile__v">Stage ${aki.stage}</span><span class="tile__u">Creatinine ×${aki.ratio} baseline</span></div>
        <div class="tile"><span class="label">Urine output</span><span class="tile__v">${(15 / WEIGHT).toFixed(2)}</span><span class="tile__u">mL/kg/h (15 mL/h, ${WEIGHT} kg)</span></div>
        <div class="tile"><span class="label">Insulin rate</span><span class="tile__v">${rate}</span><span class="tile__u">U/h (0.1 U/kg/h)</span></div>
        <div class="tile tile--score"><span class="label">Uridine triacetate window</span><span class="tile__v" id="uridine"></span><span class="tile__u">96 h from last capecitabine (19 Sep, morning)</span></div>
      </section>
      <section class="icu__bundle">
        <div class="review-tools"><h3 class="section-title" style="margin:0">Bundle tracker (app)</h3><span class="sim__now" id="now"></span></div>
        <ul class="bundle" id="bundle"></ul>
      </section>
      <div class="actions-row"><button class="btn btn--primary" id="ask">Ask Claude for the round plan</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="plan"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => toHHMM(now) });
    const act = (text, kind = "accept") => { now += 5; audit.add(text, kind); renderBundle(); };

    function bundleItems() {
      const abxLate = (state.antibiotics ?? now) - TIME_ZERO;
      return [
        { item: "Blood cultures before antibiotics", status: "done", note: "Sent 05:40" },
        { item: "Lactate measured", status: "done", note: `3.2 mmol/L; repeat due ${toHHMM(toMin("06:10") + 120)}` },
        { item: "Broad-spectrum antibiotics within 1 h", status: state.antibiotics ? "done" : "late", note: state.antibiotics ? `Given ${toHHMM(state.antibiotics)} (${fmtDur(abxLate)} after time zero)` : `Overdue: ${fmtDur(abxLate)} since time zero (ED triage 04:55)`, button: state.antibiotics ? null : ["abx", "Record: piperacillin-tazobactam given"] },
        { item: `Crystalloid 30 mL/kg (${FLUID_TARGET.toLocaleString("en-IN")} mL)`, status: state.fluids >= FLUID_TARGET ? "done" : "pending", note: `${state.fluids.toLocaleString("en-IN")} mL given`, progress: state.fluids / FLUID_TARGET, button: state.fluids >= FLUID_TARGET ? null : ["bolus", "+500 mL bolus"] },
        { item: "Vasopressor if MAP <65 after fluids", status: state.noradrenaline ? "done" : "pending", note: state.noradrenaline ? `Noradrenaline started ${toHHMM(state.noradrenaline)}` : state.fluids >= FLUID_TARGET ? "Fluid target reached: start if MAP still <65" : "Reassess after boluses", button: !state.noradrenaline && state.fluids >= FLUID_TARGET ? ["norad", "Start noradrenaline"] : null },
        { item: "Potassium replacement", status: state.kcl ? "done" : "pending", note: state.kcl ? `KCl started ${toHHMM(state.kcl)}` : "K 3.1: start IV KCl", button: state.kcl ? null : ["kcl", "Record: KCl started"] },
        { item: `DKA: K ≥${K_INSULIN_THRESHOLD} before insulin`, status: state.k >= K_INSULIN_THRESHOLD ? "done" : "blocked", note: `Latest K ${state.k} mmol/L`, kInput: true },
        { item: `DKA: fixed-rate insulin ${rate} U/h + 10% dextrose`, status: state.insulin ? "done" : state.k >= K_INSULIN_THRESHOLD ? "pending" : "blocked", note: state.insulin ? `Started ${toHHMM(state.insulin)}` : state.k >= K_INSULIN_THRESHOLD ? "Ready to start" : `Blocked until K ≥${K_INSULIN_THRESHOLD}`, button: state.insulin ? null : ["insulin", "Start insulin + dextrose", state.k < K_INSULIN_THRESHOLD] },
        { item: "DKA: continue basal insulin (glargine 10 U)", status: state.basal ? "done" : "pending", note: state.basal ? "Prescribed" : "Reduced from 14 U", button: state.basal ? null : ["basal", "Prescribe"] },
      ];
    }

    function renderBundle() {
      $("#now").textContent = `Time ${toHHMM(now)}`;
      const left = uridineClose - now;
      $("#uridine").textContent = fmtDur(left);
      $("#bundle").innerHTML = bundleItems().map((b) => `<li data-status="${b.status}">
        <span class="dot dot--${{ done: "ok", late: "danger", blocked: "danger", pending: "warn" }[b.status]}"></span>
        <span><strong>${esc(b.item)}</strong><small>${esc(b.note)}</small>${b.progress != null ? `<span class="bar-mini"><span style="width:${Math.min(100, b.progress * 100)}%"></span></span>` : ""}</span>
        <span class="bundle__act">${b.kInput ? `<label class="field" style="flex-direction:row"><input id="k" type="number" step="0.1" min="1.5" max="8" value="${state.k}" aria-label="Repeat potassium"> <button class="rbtn" data-b="k">Record K</button></label>` : ""}${b.button ? `<button class="rbtn ${b.button[2] ? "" : "rbtn--accept"}" data-b="${b.button[0]}" ${b.button[2] ? "disabled" : ""}>${esc(b.button[1])}</button>` : ""}</span>
      </li>`).join("");
    }
    $("#bundle").addEventListener("click", (e) => {
      const b = e.target.closest("[data-b]")?.dataset.b;
      if (!b) return;
      if (b === "abx") { state.antibiotics = now; act(`Piperacillin-tazobactam 4.5 g IV given (${fmtDur(now - TIME_ZERO)} after time zero)`); }
      if (b === "bolus") { state.fluids += 500; act(`500 mL Ringer's lactate bolus (total ${state.fluids} mL)`); }
      if (b === "norad") { state.noradrenaline = now; act("Noradrenaline started via central line"); }
      if (b === "kcl") { state.kcl = now; act("IV potassium chloride started"); }
      if (b === "basal") { state.basal = now; act("Glargine 10 U prescribed"); }
      if (b === "k") { const v = Number($("#k").value); if (v > 0) { state.k = v; act(`Repeat potassium recorded: ${v} mmol/L${v < K_INSULIN_THRESHOLD ? " (insulin still blocked)" : ""}`, v < K_INSULIN_THRESHOLD ? "reject" : "info"); } }
      if (b === "insulin" && state.k >= K_INSULIN_THRESHOLD) { state.insulin = now; act(`Fixed-rate insulin ${rate} U/h with 10% dextrose started (K ${state.k})`); }
    });
    renderBundle();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        admission: ctx.mod.defaultInput,
        now: toHHMM(now),
        calculations: [`Anion gap ${ag}`, `AKI KDIGO stage ${aki.stage} (creatinine ×${aki.ratio})`, `Urine ${(15 / WEIGHT).toFixed(2)} mL/kg/h`, `Fixed-rate insulin ${rate} U/h`, `Uridine triacetate window: ${fmtDur(uridineClose - now)} left`],
        bundle: bundleItems().map((b) => ({ item: b.item, status: `${b.status}: ${b.note}` })),
      };
      const result = await withClaude($("#plan"), (o) => ctx.ask(payload, o), { label: "Claude is preparing the round plan…" });
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Round plan drafted", "info");
      renderPlan(result.data);
    };

    function renderPlan(d) {
      const box = $("#plan");
      box.innerHTML = "";
      const p = el(`<div class="icu__plan">
        <section><h3 class="section-title">Immediate safety flags</h3><div class="review">${d.flags.map((f, i) => `<div class="flag-card" style="border-left-color:${i < 3 ? "var(--danger)" : "var(--warn)"}"><strong>${i + 1}. ${esc(f.title)}</strong><p>${esc(f.action)}</p></div>`).join("")}</div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Problem-based plan</h3><button class="rbtn" id="all-p">Accept remaining</button></div><div id="problems"></div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Drug review</h3><button class="rbtn" id="all-d">Accept remaining</button></div><div id="drugs"></div></section>
        <div class="handover">
          <section><h3 class="section-title">SBAR for the night team</h3><dl class="sbar">${[["situation", "Situation"], ["background", "Background"], ["assessment", "Assessment"], ["recommendation", "Recommendation"]].map(([k, l]) => `<dt>${l}</dt><dd>${esc(d.sbar[k])}</dd>`).join("")}</dl></section>
          <section><h3 class="section-title">Family update</h3><textarea id="family" class="brief" rows="7" style="width:100%;font:inherit;border:0;resize:vertical">${esc(d.family)}</textarea>
            <h3 class="section-title" style="margin-top:16px">Questions for the parent teams</h3><ul class="ddx">${d.questions.map((q, i) => `<li><strong>${esc(q.team)}</strong> ${esc(q.question)} <button class="rbtn" data-q="${i}">Send</button></li>`).join("")}</ul></section>
        </div>
        <div class="actions-row"><button class="btn btn--approve" id="approve">Approve plan &amp; file</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(p);
      const q = (s) => p.querySelector(s);
      const problems = reviewList(q("#problems"), d.problems.map((x, i) => ({ key: `p${i}`, label: x.problem, text: x.plan, meta: `<strong style="font-weight:500">Data:</strong> ${esc(x.data)}<br><strong style="font-weight:500">Targets:</strong> ${esc(x.targets)}` })), { audit, noun: "plan" });
      const drugs = reviewList(q("#drugs"), d.drugs.map((x, i) => ({ key: `d${i}`, text: `${x.action}: ${x.drug}`, html: `<span class="type-tag${x.action === "Stop" ? " type-tag--new" : ""}">${esc(x.action)}</span><strong style="font-weight:500">${esc(x.drug)}</strong>`, meta: esc(x.reason) })), { audit, noun: "drug change", editable: false });
      q("#all-p").onclick = () => problems.acceptAll();
      q("#all-d").onclick = () => drugs.acceptAll();
      q("#family").addEventListener("change", () => audit.add("Edited the family update", "edit"));
      p.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => { const x = d.questions[b.dataset.q]; audit.add(`Sent to ${x.team}: ${x.question}`, "info"); b.disabled = true; b.textContent = "✓ Sent"; }));
      q("#approve").onclick = () => {
        ctx.file([
          "## Immediate safety flags", ...d.flags.map((f, i) => `${i + 1}. **${f.title}:** ${f.action}`),
          "## Calculations (app)", `Anion gap ${ag}; AKI KDIGO stage ${aki.stage} (×${aki.ratio}); insulin ${rate} U/h`,
          "## Bundle status", ...bundleItems().map((b) => `- ${b.status === "done" ? "✅" : b.status === "pending" ? "⏳" : "❌"} ${b.item}: ${b.note}`),
          "## Problem-based plan (accepted)", ...problems.accepted().map((x) => `- **${x.label}:** ${x.text}`),
          "## Drug review (accepted)", ...drugs.accepted().map((x) => `- ${x.text} (${x.meta})`),
          "## SBAR", `- **S:** ${d.sbar.situation}\n- **B:** ${d.sbar.background}\n- **A:** ${d.sbar.assessment}\n- **R:** ${d.sbar.recommendation}`,
          "## Family update", q("#family").value.trim(),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        audit.add("ICU plan approved and filed", "accept");
        q("#approve").disabled = true;
        q("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }
  },
};
