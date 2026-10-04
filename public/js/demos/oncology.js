// Tumour board clinician view: the board sets T, N and M and the app calculates the AJCC stage
// and adjuvant guide; Claude prepares the pack; the board records decisions and assigns actions.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { colonStage, adjuvantGuide } from "../clinical.js";

const T = ["Tis", "T1", "T2", "T3", "T4a", "T4b"];
const N = ["N0", "N1a", "N1b", "N1c", "N2a", "N2b"];
const M = ["M0", "M1a", "M1b", "M1c"];

export default {
  notes: [
    "Change T or N and the stage group and adjuvant duration update instantly. Staging rules are coded in the app from AJCC 8th edition, not generated.",
    "Claude connects the specialties: oxaliplatin with existing diabetic neuropathy, steroids and glucose, SGLT2 inhibitors during diarrhoea, and when the knee can be replaced.",
    "The board records its own decision on each option and question; the outcome is drafted from what the board chose.",
    "Every action gets an owner. The DPYD result is the one that later goes missing in Thomas's story, so it is flagged to be tracked to completion.",
  ],
  guide: [
    "Confirm T, N and M. The app calculates the AJCC stage and the adjuvant guide.",
    "Ask Claude for the case pack: biology, options, patient-specific points, questions.",
    "Record the board's decision on each option and question, and assign each action.",
    "Approve the MDT outcome to file it to Thomas's record.",
  ],
  mount(root, ctx) {
    const sel = { t: "T3", n: "N1b", m: "M0" };
    let d = null;
    root.innerHTML = "";
    const view = el(`<div class="mdt">
      <section class="mdt__stage">
        <div class="mdt__selects">
          ${[["t", "T (primary tumour)", T], ["n", "N (regional nodes)", N], ["m", "M (distant)", M]].map(([k, l, opts]) => `<label class="field">${l}<select data-s="${k}">${opts.map((o) => `<option${o === sel[k] ? " selected" : ""}>${o}</option>`).join("")}</select><small class="ev" data-ev="${k}"></small></label>`).join("")}
        </div>
        <div class="mdt__result"><span class="label">AJCC 8th edition stage (app)</span><div class="mdt__group" id="group"></div><p id="adjuvant"></p></div>
      </section>
      <div class="actions-row"><button class="btn btn--primary" id="ask">Prepare the case pack with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="pack"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = 0; return () => `16:${String(m++).padStart(2, "0")}`; })() });

    const updateStage = () => {
      $("#group").textContent = `Stage ${colonStage(sel.t, sel.n, sel.m)}`;
      $("#adjuvant").textContent = adjuvantGuide(sel.t, sel.n, sel.m);
      if (d) renderOutcome();
    };
    view.querySelectorAll("[data-s]").forEach((s) => s.addEventListener("change", () => {
      sel[s.dataset.s] = s.value;
      audit.add(`Board set ${s.dataset.s.toUpperCase()} to ${s.value}: stage ${colonStage(sel.t, sel.n, sel.m)}`, "edit");
      updateStage();
    }));
    updateStage();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const result = await withClaude($("#pack"), (o) => ctx.ask({ referral: ctx.mod.defaultInput, t: sel.t, n: sel.n, m: sel.m, stage: colonStage(sel.t, sel.n, sel.m) }, o), { label: "Claude is preparing the case pack…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Case pack prepared");
      ["t", "n", "m"].forEach((k) => { $(`[data-ev="${k}"]`).textContent = d.stagingEvidence[k]; });
      renderPack();
    };

    function renderPack() {
      const box = $("#pack");
      box.innerHTML = "";
      const p = el(`<div class="mdt__pack">
        <section class="headline-card"><span class="label">Case at a glance</span><ul class="glance">${d.glance.map((g) => `<li>${esc(g)}</li>`).join("")}</ul><p class="hint" style="color:var(--on-navy-muted);margin:0">${esc(d.stagingEvidence.wouldChange)}</p></section>
        <section><h3 class="section-title">Key biology</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Marker</th><th>Result</th><th>What it means</th></tr></thead><tbody>${d.biology.map((b) => `<tr><td>${esc(b.marker)}</td><td><strong style="font-weight:500">${esc(b.result)}</strong></td><td>${esc(b.meaning)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Options: board decision</h3><div class="options" role="radiogroup">${d.options.map((o, i) => `<label class="option"><input type="radio" name="opt" value="${i}"><span><strong>${esc(o.name)}</strong>${o.preferred ? ' <span class="type-tag">Claude suggests</span>' : ""}<br>${esc(o.sequence)}<br><small class="muted">${esc(o.evidence)} · ${esc(o.fit)}</small></span></label>`).join("")}</div></section>
        <section><h3 class="section-title">Patient-specific considerations</h3><p class="hint">Ticked points go into the outcome.</p><ul class="cantmiss">${d.considerations.map((c, i) => `<li><label class="check" style="margin:0"><input type="checkbox" data-c="${i}" checked> <span><strong>${esc(c.topic)}</strong><br><span class="muted">${esc(c.detail)}</span></span></label></li>`).join("")}</ul></section>
        <section><h3 class="section-title">Questions for the board</h3><ol class="questions">${d.questions.map((q, i) => `<li><span>${esc(q)}</span><input type="text" data-q="${i}" placeholder="Board decision" aria-label="Board decision for question ${i + 1}"></li>`).join("")}</ol></section>
        <section><h3 class="section-title">Actions after the meeting</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Assigned</th></tr></thead><tbody>${d.actions.map((a, i) => `<tr${/dpyd/i.test(a.action) ? ' class="is-key"' : ""}><td>${esc(a.action)}${/dpyd/i.test(a.action) ? '<br><small class="t-warn">Track to completion: the result must be back before cycle 1</small>' : ""}</td><td>${esc(a.owner)}</td><td>${esc(a.due)}</td><td><label class="check" style="margin:0"><input type="checkbox" data-a="${i}"> Assigned</label></td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Clinical trial searches</h3><ul class="plain-list">${d.trials.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></section>
        <section class="outcome"><span class="kicker kicker--rule">Draft MDT outcome</span><div id="outcome"></div></section>
        <div class="actions-row"><button class="btn btn--approve" id="approve">Approve outcome &amp; file</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(p);
      p.querySelectorAll("[name=opt]").forEach((r) => r.addEventListener("change", () => { audit.add(`Board chose ${d.options[r.value].name}`, "accept"); renderOutcome(); }));
      p.querySelectorAll("[data-c]").forEach((c) => c.addEventListener("change", () => { audit.add(`${c.checked ? "Included" : "Removed"} consideration: ${d.considerations[c.dataset.c].topic}`, "edit"); renderOutcome(); }));
      p.querySelectorAll("[data-q]").forEach((q) => q.addEventListener("change", () => { audit.add(`Recorded decision on question ${Number(q.dataset.q) + 1}: ${q.value}`, "edit"); renderOutcome(); }));
      p.querySelectorAll("[data-a]").forEach((a) => a.addEventListener("change", () => { audit.add(`${a.checked ? "Assigned" : "Unassigned"}: ${d.actions[a.dataset.a].action} → ${d.actions[a.dataset.a].owner}`, a.checked ? "accept" : "info"); renderOutcome(); }));
      p.querySelector("#approve").onclick = () => {
        const opt = p.querySelector("[name=opt]:checked");
        if (!opt) { p.querySelector("#filed").textContent = "Choose the board's option first."; return; }
        ctx.file(outcomeMarkdown() + `\n\n## Clinician actions\n\n${audit.markdown()}`);
        audit.add("MDT outcome approved and filed", "accept");
        p.querySelector("#approve").disabled = true;
        p.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      renderOutcome();
    }

    function outcomeMarkdown() {
      const opt = view.querySelector("[name=opt]:checked");
      const cons = [...view.querySelectorAll("[data-c]:checked")].map((c) => d.considerations[c.dataset.c]);
      const qs = [...view.querySelectorAll("[data-q]")].map((q, i) => ({ q: d.questions[i], a: q.value.trim() }));
      const acts = d.actions.map((a, i) => ({ ...a, done: view.querySelector(`[data-a="${i}"]`).checked }));
      return [
        `## Diagnosis`, `Sigmoid adenocarcinoma, pMMR, KRAS G12D, BRAF wild-type.`,
        `## Stage`, `c${sel.t} c${sel.n} c${sel.m}: AJCC stage ${colonStage(sel.t, sel.n, sel.m)} (calculated). ${adjuvantGuide(sel.t, sel.n, sel.m)}.`,
        `## Recommendation`, opt ? `${d.options[opt.value].name}: ${d.options[opt.value].sequence}` : "_Board to choose an option_",
        `## Patient-specific plan`, ...cons.map((c) => `- **${c.topic}:** ${c.detail}`),
        `## Board decisions`, ...qs.map((x, i) => `${i + 1}. ${x.q} **${x.a || "___"}**`),
        `## Actions`, ...acts.map((a) => `- [${a.done ? "x" : " "}] ${a.action}: ${a.owner}, ${a.due}`),
      ].join("\n\n");
    }

    function renderOutcome() {
      const o = view.querySelector("#outcome");
      if (!o) return;
      o.innerHTML = outcomeMarkdown().split("\n\n").map((line) => line.startsWith("## ") ? `<h4>${esc(line.slice(3))}</h4>` : `<p>${esc(line).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`).join("");
    }
  },
};
