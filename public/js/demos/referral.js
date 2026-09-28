// Records digest clinician view: the outside documents in a viewer, every extracted fact linked
// to its source text, app-side unit conversions, and record updates the doctor verifies.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { splitDocuments, hba1cIfccToNgsp, glucoseMmolToMg, creatinineUmolToMg, egfrCkdEpi2021 } from "../clinical.js";

const STATUS = { Matches: "ok", New: "warn", Conflicts: "danger", Discrepancy: "danger", "Needs confirmation": "warn", Stopped: "" };

export default {
  notes: [
    "Six documents arrive by WhatsApp, including phone photos of handwritten prescriptions. Click any source letter to see the exact text a fact came from.",
    "The GP letter says \"no known allergies\", but a 2019 discharge summary records a rash with a sulpha antibiotic. Claude keeps the allergy and flags the conflict.",
    "The app does the unit conversions and eGFR, with the arithmetic shown, and marks the word OCR could not read (glargine 16 or 18?).",
    "Nothing enters the hospital record automatically: each proposed update is accepted or rejected by the doctor.",
  ],
  guide: [
    "Browse the outside documents. Words OCR could not read are marked by the app.",
    "Ask Claude for the digest. Click a source letter to jump to the text behind any fact.",
    "Check the conversions, conflicts and questions for the visit.",
    "Accept or reject each record update, then file the digest.",
  ],
  mount(root, ctx) {
    const docs = splitDocuments(ctx.mod.defaultInput);
    const byLetter = Object.fromEntries(docs.map((d) => [d.letter, d]));
    const conv = {
      hba1c: hba1cIfccToNgsp(70), glucose: glucoseMmolToMg(9.3), creat: creatinineUmolToMg(97),
    };
    conv.egfr = egfrCkdEpi2021(conv.creat, 58, "male");
    let active = "A";
    let mark = null;

    root.innerHTML = "";
    const view = el(`<div class="dig">
      <section class="card-v dig__viewer">
        <div class="dig__tabs" role="tablist">${docs.map((d) => `<button role="tab" data-doc="${d.letter}">${d.letter === "Record" ? "Our record" : d.letter}</button>`).join("")}</div>
        <div class="dig__doc" id="doc"></div>
      </section>
      <div class="dig__side">
        <section class="dig__conv"><span class="label">Unit conversions (app) · outside lab, 18 Apr 2026</span>
          <ul class="plain-list" style="list-style:none;padding:0">
            <li>HbA1c 70 mmol/mol ÷ 10.929 + 2.15 = <strong>${conv.hba1c}%</strong></li>
            <li>Glucose 9.3 mmol/L × 18.0 = <strong>${conv.glucose} mg/dL</strong></li>
            <li>Creatinine 97 µmol/L ÷ 88.4 = <strong>${conv.creat.toFixed(2)} mg/dL</strong></li>
            <li>eGFR (CKD-EPI 2021, 58 M) = <strong>${conv.egfr} mL/min/1.73 m²</strong></li>
          </ul></section>
        <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Build the digest with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      </div>
      <div id="digest" class="dig__digest"></div>
      <div id="audit-slot" class="dig__audit"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: (() => { let m = 0; return () => `08:${String(40 + m++).padStart(2, "0")}`; })() });

    function renderDoc() {
      const d = byLetter[active];
      view.querySelectorAll(".dig__tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.doc === active)));
      let html = esc(d.text);
      if (mark && mark.doc === active && mark.quote) html = html.replace(esc(mark.quote), `<mark class="is-active">${esc(mark.quote)}</mark>`);
      html = html.replace(/\[\?\]/g, '<span class="ocr" title="OCR low confidence">[?]</span>').replace(/\n/g, "<br>");
      $("#doc").innerHTML = `<div class="dig__doc-title"><span class="kicker">${d.letter === "Record" ? "Lakeshore" : `Document ${d.letter}`}</span><strong>${esc(d.title)}</strong></div><div class="dig__text">${html}</div>`;
      $("#doc").querySelector("mark")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    $(".dig__tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-doc]"); if (b) { active = b.dataset.doc; mark = null; renderDoc(); } });
    renderDoc();

    const chips = (sources) => sources.map((s) => `<button class="srcchip" data-sd="${esc(s.doc)}" data-sq="${esc(s.quote)}" title="${esc(s.quote || "Hospital record")}">${s.doc === "Record" ? "Rec" : esc(s.doc)}</button>`).join("");
    view.addEventListener("click", (e) => {
      const c = e.target.closest(".srcchip");
      if (!c) return;
      active = c.dataset.sd;
      mark = { doc: active, quote: c.dataset.sq };
      renderDoc();
      $(".dig__viewer").scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = { documents: ctx.mod.defaultInput, conversions: [`HbA1c 70 mmol/mol = ${conv.hba1c}%`, `Glucose 9.3 mmol/L = ${conv.glucose} mg/dL`, `Creatinine 97 µmol/L = ${conv.creat} mg/dL`, `eGFR ${conv.egfr} mL/min/1.73 m² (CKD-EPI 2021)`] };
      const result = await withClaude($("#digest"), (o) => ctx.ask(payload, o), { label: "Claude is reading the documents…" });
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Digest built", "info");
      render(result.data);
    };

    function render(d) {
      const box = $("#digest");
      box.innerHTML = "";
      const v = el(`<div class="dig__out">
        <section class="headline-card"><span class="label">For the doctor in 30 seconds</span><ul class="glance">${d.summary.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></section>
        <section><h3 class="section-title">Red flags in the old records</h3><div class="review">${d.redFlags.map((f) => `<div class="flag-card"><strong>${esc(f.title)}</strong> ${chips(f.sources)}<p>${esc(f.detail)}</p></div>`).join("")}</div></section>
        <div class="handover">
          <section><h3 class="section-title">Problems</h3><ul class="facts">${d.problems.map((p) => `<li><span class="dot dot--${STATUS[p.status] || ""}"></span><span><strong>${esc(p.problem)}</strong> <small class="muted">${esc(p.since)} · ${esc(p.status)}</small></span><span>${chips(p.sources)}</span></li>`).join("")}</ul>
            <h3 class="section-title" style="margin-top:16px">Allergies</h3><ul class="facts">${d.allergies.map((a) => `<li><span class="dot dot--danger"></span><span><strong>${esc(a.allergy)}</strong>: ${esc(a.reaction)}<br><small class="muted">${esc(a.note)}</small></span><span>${chips(a.sources)}</span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Medicines</h3><ul class="facts">${d.medicines.map((m) => `<li><span class="dot dot--${STATUS[m.status] || ""}"></span><span><strong>${esc(m.medicine)}</strong><br><small class="muted">${esc(m.status)}: ${esc(m.note)}</small></span><span>${chips(m.sources)}</span></li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Conflicts &amp; unclear readings</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Item</th><th>What each source says</th><th>Suggested resolution</th></tr></thead><tbody>${d.conflicts.map((c) => `<tr><td><strong style="font-weight:500">${esc(c.item)}</strong></td><td>${esc(c.what)}</td><td>${esc(c.resolution)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Questions for the visit</h3><ul class="tasks">${d.questions.map((q, i) => `<li style="grid-template-columns:22px 1fr"><input type="checkbox" data-q="${i}" aria-label="Asked"><span>${esc(q)}</span></li>`).join("")}</ul></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Proposed record updates</h3><span class="hint">Nothing changes the record until you accept it.</span></div><div id="updates"></div></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve digest &amp; file</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(v);
      const q = (s) => v.querySelector(s);
      const updates = reviewList(q("#updates"), d.updates.map((u, i) => ({ key: `u${i}`, text: u.update, meta: `Source ${chips(u.sources)}` })), { audit, noun: "record update" });
      v.querySelectorAll("[data-q]").forEach((c) => c.addEventListener("change", () => audit.add(`${c.checked ? "Asked" : "Unticked"}: ${d.questions[c.dataset.q]}`, "info")));
      q("#file").onclick = () => {
        const acc = updates.accepted();
        ctx.file([
          "## For the doctor in 30 seconds", ...d.summary.map((s) => `- ${s}`),
          "## Red flags", ...d.redFlags.map((f) => `- **${f.title}** (${f.sources.map((s) => s.doc).join(", ")}): ${f.detail}`),
          "## Unit conversions (app)", `HbA1c 70 mmol/mol = ${conv.hba1c}%; glucose 9.3 mmol/L = ${conv.glucose} mg/dL; creatinine 97 µmol/L = ${conv.creat} mg/dL; eGFR ${conv.egfr}`,
          "## Medicines", ...d.medicines.map((m) => `- ${m.medicine}: ${m.status}. ${m.note}`),
          "## Conflicts", ...d.conflicts.map((c) => `- **${c.item}:** ${c.what} → ${c.resolution}`),
          "## Record updates accepted (pending verification)", ...(acc.length ? acc.map((u) => `- ${u.text}`) : ["- None"]),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        audit.add(`Digest filed with ${acc.length} record update${acc.length === 1 ? "" : "s"} accepted`, "accept");
        q("#file").disabled = true;
        q("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }
  },
};
