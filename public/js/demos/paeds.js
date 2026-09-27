// Paediatric prescribing clinician view: every dose is recalculated live from the weight
// (local formulary, app-side), unsafe orders block dispensing, Claude reviews appropriateness,
// and a parent dosing card is built from the corrected orders.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { checkOrder, mgPerDose, PER_DAY } from "../clinical.js";

const WRITTEN = [
  { drug: "paracetamol", label: "Paracetamol suspension 250 mg/5 mL", form: "liquid", strengthMg: 250, strengthMl: 5, volumeMl: 15, frequency: "every 6 hours" },
  { drug: "ibuprofen", label: "Ibuprofen suspension 100 mg/5 mL", form: "liquid", strengthMg: 100, strengthMl: 5, volumeMl: 8, frequency: "every 8 hours" },
  { drug: "amoxicillin", label: "Amoxicillin suspension 250 mg/5 mL", form: "liquid", strengthMg: 250, strengthMl: 5, volumeMl: 10, frequency: "three times daily", durationDays: 10 },
  { drug: "ondansetron", label: "Ondansetron tablet", form: "tablet", doseMg: 8, frequency: "once" },
  { drug: "codeine", label: "Codeine + chlorpheniramine cough syrup", form: "liquid", strengthMg: null, strengthMl: 5, volumeMl: 5, frequency: "at night" },
  { drug: "ors", label: "Oral rehydration solution", form: "ors", totalMl: null, frequency: "once" },
];
const VERDICT = { ok: ["ok", "Safe"], warn: ["warn", "Check"], error: ["danger", "Stop"] };
const WHEN = {
  "every 6 hours": "Every 6 hours if fever or pain. No more than 4 times in a day",
  "every 8 hours": "Every 8 hours if needed. No more than 3 times in a day",
  "twice daily": "Morning and night",
  "three times daily": "Morning, afternoon and night",
  once: "Once",
  "at night": "At night",
};

export default {
  guide: [
    "The prescription is checked as written: each dose is recalculated from Ayaan's weight.",
    "Change the weight or a dose and watch every check update. Apply the suggested corrections.",
    "Ask Claude whether each treatment is appropriate for this presentation.",
    "When nothing blocks, dispense: the parent dosing card is built from the corrected orders.",
  ],
  mount(root, ctx) {
    const orders = WRITTEN.map((o) => ({ ...o, status: "written" }));
    const state = { weightKg: 16, ageYears: ctx.patient.patient.age, dehydrated: true };
    let claude = null;
    let dispensed = false;

    root.innerHTML = "";
    const view = el(`<div class="rx">
      <div class="rx__patient">
        <div><span class="label">Patient</span><div style="font-size:20px;font-weight:300;color:var(--navy)">Ayaan Rasheed · ${state.ageYears} years</div><div class="hint">Acute otitis media (right) with mild dehydration · no known allergies</div></div>
        <label class="field">Weight (kg)<input id="weight" type="number" step="0.1" min="3" max="80" value="${state.weightKg}"></label>
        <label class="check" style="margin:0 0 8px"><input type="checkbox" id="dehyd" checked> Clinically dehydrated</label>
      </div>
      <div class="rx__summary" id="summary" aria-live="polite"></div>
      <div class="rx-table-wrap card-v" style="padding:0;overflow:hidden"><table class="rx-table" id="table"></table></div>
      <div class="actions-row"><button class="btn btn--secondary" id="ask">Ask Claude to review appropriateness</button><button class="btn btn--approve" id="dispense">Send to pharmacy</button><span class="hint" id="block"></span><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="claude"></div>
      <div id="card"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    const fmt = (n, d = 1) => (n == null || Number.isNaN(n) ? "—" : Number(n.toFixed(d)).toLocaleString("en-IN"));
    const written = (o) => {
      if (o.form === "liquid") return `<input type="number" step="0.1" min="0" value="${o.volumeMl}" data-f="volumeMl" aria-label="Volume in mL"> mL`;
      if (o.form === "tablet") return `<input type="number" step="1" min="0" value="${o.doseMg}" data-f="doseMg" aria-label="Dose in mg"> mg`;
      return o.totalMl ? `<input type="number" step="10" min="0" value="${o.totalMl}" data-f="totalMl" aria-label="Total mL"> mL over 4 h` : `<em>"as tolerated"</em>`;
    };

    function render() {
      const results = orders.map((o) => (o.status === "removed" ? null : checkOrder(o, state)));
      const live = results.filter(Boolean);
      const errors = live.filter((r) => r.verdict === "error").length;
      const warns = live.filter((r) => r.verdict === "warn").length;
      $("#summary").innerHTML = errors
        ? `<span class="dot dot--danger"></span><strong>${errors} order${errors === 1 ? "" : "s"} must be fixed before dispensing</strong><span class="muted">${warns} to check · weight ${state.weightKg} kg${state.dehydrated ? " · dehydrated" : ""}</span>`
        : `<span class="dot dot--ok"></span><strong>No order blocks dispensing</strong><span class="muted">${warns ? `${warns} to check` : "All doses within range"} · weight ${state.weightKg} kg</span>`;
      $("#table").innerHTML = `<thead><tr><th>Order</th><th>As written</th><th>Frequency</th><th class="num">mg/dose</th><th class="num">mg/kg/dose</th><th class="num">mg/kg/day</th><th>Recommended</th><th>Check</th></tr></thead>
        <tbody>${orders.map((o, i) => {
          const r = results[i];
          if (!r) return `<tr class="is-removed"><td>${esc(o.label)}</td><td colspan="6">Removed from the prescription</td><td><button class="rbtn" data-undo="${i}">Undo</button></td></tr>`;
          const [dot, word] = VERDICT[r.verdict];
          const comment = claude?.perDrug.find((p) => o.label.toLowerCase().startsWith(p.drug.toLowerCase().split(" ")[0]));
          return `<tr data-i="${i}">
            <td><strong style="font-weight:500">${esc(o.label)}</strong>${o.status === "corrected" ? ' <span class="type-tag">corrected</span>' : ""}${o.durationDays ? `<div class="hint">for <input type="number" min="1" max="21" value="${o.durationDays}" data-f="durationDays" aria-label="Days" style="width:48px"> days</div>` : ""}</td>
            <td>${written(o)}</td>
            <td>${o.form === "ors" ? "—" : `<select data-f="frequency" aria-label="Frequency">${Object.keys(PER_DAY).map((f) => `<option${f === o.frequency ? " selected" : ""}>${f}</option>`).join("")}</select>`}</td>
            <td class="num">${fmt(r.mgDose, 0)}</td><td class="num">${fmt(r.mgKgDose)}</td><td class="num">${fmt(r.mgKgDay)}</td>
            <td class="hint" style="max-width:220px">${esc(r.recommended)}</td>
            <td style="min-width:240px"><span class="verdict t-${dot}"><span class="dot dot--${dot}"></span>${word}</span>
              ${r.findings.length ? `<ul class="findings">${r.findings.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
              ${comment ? `<p class="hint" style="margin:6px 0 0"><strong style="font-weight:500;color:var(--kicker)">Claude:</strong> ${esc(comment.comment)}</p>` : ""}
              ${o.ack && r.verdict === "warn" ? `<p class="hint" style="margin:6px 0 0">✓ Acknowledged: ${esc(r.fix?.note ?? "")}</p>` : r.verdict !== "ok" && r.fix ? `<div class="rx-fix"><button class="rbtn rbtn--accept" data-fix="${i}">${r.fix.remove ? "Remove order" : `Apply: ${esc(r.fix.note)}`}</button></div>` : ""}
            </td></tr>`;
        }).join("")}</tbody>`;
      $("#dispense").disabled = errors > 0 || dispensed;
      $("#block").textContent = dispensed ? "" : errors ? "Dispensing is blocked until every Stop is resolved." : "";
      if (dispensed) renderCard();
    }

    $("#weight").addEventListener("change", (e) => {
      const v = Number(e.target.value);
      if (!(v > 0)) return;
      audit.add(`Weight changed from ${state.weightKg} kg to ${v} kg; all doses recalculated`, "edit");
      state.weightKg = v;
      render();
    });
    $("#dehyd").addEventListener("change", (e) => { state.dehydrated = e.target.checked; audit.add(`Marked as ${state.dehydrated ? "dehydrated" : "not dehydrated"}`, "edit"); render(); });

    $("#table").addEventListener("change", (e) => {
      const f = e.target.dataset.f;
      const i = Number(e.target.closest("tr")?.dataset.i);
      if (!f || Number.isNaN(i)) return;
      const o = orders[i];
      o[f] = f === "frequency" ? e.target.value : Number(e.target.value);
      o.status = "edited";
      o.ack = false;
      audit.add(`Edited ${o.label}: ${f === "frequency" ? o.frequency : `${f} ${o[f]}`}`, "edit");
      render();
    });
    $("#table").addEventListener("click", (e) => {
      const fixI = e.target.closest("[data-fix]")?.dataset.fix;
      const undoI = e.target.closest("[data-undo]")?.dataset.undo;
      if (undoI != null) { orders[undoI].status = "edited"; audit.add(`Restored ${orders[undoI].label}`, "info"); return render(); }
      if (fixI == null) return;
      const o = orders[fixI];
      const r = checkOrder(o, state);
      if (r.fix.remove) { o.status = "removed"; audit.add(`Removed ${o.label}: ${r.findings[0] ?? ""}`, "reject"); return render(); }
      for (const k of ["volumeMl", "doseMg", "frequency", "durationDays", "totalMl"]) if (r.fix[k] != null) o[k] = r.fix[k];
      o.status = "corrected";
      o.ack = checkOrder(o, state).verdict !== "ok";
      audit.add(`Applied correction to ${o.label}: ${r.fix.note}`, "accept");
      render();
    });

    $("#ask").onclick = async () => {
      const box = $("#claude");
      const payload = {
        when: "26 Sep 2026, 21:40", patient: "Ayaan Rasheed", ageYears: state.ageYears, weightKg: state.weightKg, dehydrated: state.dehydrated,
        presentation: "Fever 39.2 °C for 2 days, right ear pain, one vomit today, reduced drinking. Right tympanic membrane red and bulging. Mild dehydration. Alert, no rash, no neck stiffness. HR 132.",
        orders: orders.map((o) => { const r = o.status === "removed" ? null : checkOrder(o, state); return { written: `${o.label}: ${o.form === "liquid" ? `${o.volumeMl} mL` : o.form === "tablet" ? `${o.doseMg} mg` : o.totalMl ? `${o.totalMl} mL` : "as tolerated"} ${o.frequency}${o.durationDays ? ` for ${o.durationDays} days` : ""}${o.status === "removed" ? " (removed)" : ""}`, finding: r ? (r.findings.join("; ") || "within range") : "removed" }; }),
      };
      const result = await withClaude(box, (o) => ctx.ask(payload, o), { label: "Claude is reviewing the treatment…" });
      claude = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      box.innerHTML = "";
      box.append(el(`<div class="rx-claude">
        <section><h3 class="section-title">Is the treatment appropriate?</h3><ul class="plain-list">${claude.appropriateness.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></section>
        <section><h3 class="section-title">Prescribing-safety notes</h3><ul class="plain-list">${claude.safetyNotes.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></section>
      </div>`));
      audit.add("Claude reviewed appropriateness; comments added to each order");
      render();
    };

    $("#dispense").onclick = () => {
      dispensed = true;
      audit.add("Prescription sent to pharmacy", "accept");
      render();
      const lines = orders.filter((o) => o.status !== "removed").map((o) => `- ${o.label}: ${describe(o)}`);
      ctx.file([
        "## Prescription check", `Weight ${state.weightKg} kg (recalculated by the app).`,
        "## Dispensed", ...lines,
        "## Removed", ...orders.filter((o) => o.status === "removed").map((o) => `- ${o.label}`),
        claude ? "## Appropriateness (Claude)" : "", ...(claude?.appropriateness.map((a) => `- ${a}`) ?? []),
        "## Clinician actions", audit.markdown(),
      ].filter(Boolean).join("\n\n"));
    };

    function describe(o) {
      if (o.form === "liquid") return `${o.volumeMl} mL (${Math.round(mgPerDose(o))} mg) ${o.frequency}${o.durationDays ? ` for ${o.durationDays} days` : ""}`;
      if (o.form === "tablet") return `${o.doseMg} mg ${o.frequency}`;
      return o.totalMl ? `${o.totalMl} mL over 4 hours` : "as tolerated";
    }

    function renderCard() {
      const rows = orders.filter((o) => o.status !== "removed").map((o) => {
        if (o.drug === "ondansetron") return [o.label.replace(" tablet", ""), `${o.doseMg} mg`, "Given once in the emergency department"];
        if (o.drug === "ors") return ["Oral rehydration solution (ORS)", o.totalMl ? `${o.totalMl} mL` : "Small sips", "Over the next 4 hours: 1–2 spoons every 1–2 minutes, then after each loose stool or vomit"];
        const when = o.drug === "ibuprofen" && state.dehydrated ? "Only after he is drinking well and passing urine. Every 8 hours if needed" : `${WHEN[o.frequency] ?? o.frequency}${o.durationDays ? ` for ${o.durationDays} days, even when he feels better` : ""}`;
        return [o.label.replace(/ suspension| cough syrup/, ""), `${o.volumeMl} mL`, when];
      });
      const back = claude?.returnIf ?? ["He is very sleepy or hard to wake", "He has not passed urine for 8 hours", "He keeps vomiting", "He has a stiff neck or a rash that does not fade when pressed"];
      $("#card").innerHTML = "";
      $("#card").append(el(`<section class="dose-card">
        <span class="kicker kicker--rule">Dosing card for parents</span>
        <h3>Ayaan weighs ${state.weightKg} kg. Use the syringe we give you, not a kitchen spoon.</h3>
        <table><thead><tr><th>Medicine</th><th>How much</th><th>When</th></tr></thead><tbody>${rows.map(([m, a, w]) => `<tr><td>${esc(m)}</td><td><strong>${esc(a)}</strong></td><td>${esc(w)}</td></tr>`).join("")}</tbody></table>
        <p style="margin:6px 0 0"><strong style="font-weight:500">Come back straight away if:</strong> ${back.map(esc).join("; ")}.</p>
        <p class="hint" style="margin:0">For queries &amp; appointments +91 9961 640 000</p>
      </section>`));
    }

    render();
  },
};
