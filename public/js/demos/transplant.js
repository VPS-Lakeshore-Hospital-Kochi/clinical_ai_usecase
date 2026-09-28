// Liver transplant work-up clinician view: the app calculates MELD 3.0 and Child-Pugh with the
// arithmetic, checks Milan and the living-donor limits live from editable inputs; Claude drafts
// the candidacy summary and tracker. Scheduling stays locked until the donor checks pass and every
// open item, including independent donor clearance and the Authorisation Committee, is closed.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { meld3, childPugh, milanCriteria, donorChecks } from "../clinical.js";

const STATUS_DOT = { done: "ok", pending: "warn", problem: "danger" };

export default {
  notes: [
    "The app calculates MELD 3.0 term by term (26) and Child-Pugh component by component (13, class C) from the labs, and checks Milan: a single 2.4 cm lesion is within.",
    "For the living donor the app works out the graft-to-recipient weight ratio on dry weight (1.43%) and the remnant left for Kevin (47.5%), plus fat and ABO compatibility.",
    "Claude never says the donor is approved: donor clearance is an independent decision, and it is one of the open items that must be closed before scheduling.",
    "Try it: change the graft volume to 1,150 mL. Kevin's remnant falls to 27% and the app blocks scheduling. Or raise bilirubin to 6 and watch MELD climb.",
  ],
  guide: [
    "Check the scores and donor measurements the app has calculated.",
    "Ask Claude to prepare the evaluation meeting summary.",
    "Work through the open items as they are completed.",
    "Edit any lab or volumetry value to see the scores and donor checks re-run.",
    "Schedule once nothing blocks; share the family explanation and file.",
  ],
  mount(root, ctx) {
    const rec = { female: true, bilirubin: 3.4, sodium: 131, inr: 1.9, creatinine: 1.3, albumin: 2.6, ascites: "moderate", encephalopathy: "1-2" };
    const don = { graftMl: 830, totalMl: 1580, recipientKg: 58, donorAbo: "O", recipientAbo: "B", fatPct: 4 };
    const milan = milanCriteria({ lesions: [2.4], vascularInvasion: false, extrahepatic: false });
    const done = new Set();
    let d = null, scheduled = false;

    root.innerHTML = "";
    const view = el(`<div class="tx">
      <section class="tiles" id="tiles"></section>
      <div class="tx__top">
        <section><h3 class="section-title">Recipient: Anitha, 49 (app scores)</h3>
          <div class="tx__fields">${[["bilirubin", "Bilirubin", "0.1"], ["inr", "INR", "0.1"], ["creatinine", "Creatinine", "0.1"], ["sodium", "Sodium"], ["albumin", "Albumin", "0.1"]].map(([k, l, step]) => `<label class="field">${l}<input type="number" step="${step || 1}" data-r="${k}" value="${rec[k]}"></label>`).join("")}
            <label class="field">Ascites<select data-r="ascites"><option value="none">None</option><option value="mild">Mild</option><option value="moderate" selected>Moderate–severe</option></select></label>
            <label class="field">Encephalopathy<select data-r="encephalopathy"><option value="none">None</option><option value="1-2" selected>Grade 1–2</option><option value="3-4">Grade 3–4</option></select></label></div>
          <div class="tx__calc"><div><span class="label">MELD 3.0 arithmetic</span><table class="tx__terms" id="meld"></table></div><div><span class="label">Child-Pugh</span><table class="tx__terms" id="cp"></table></div></div>
        </section>
        <section class="tx__donor"><h3 class="section-title">Donor candidate: Kevin, 26 (app checks)</h3>
          <div class="tx__fields">${[["graftMl", "Right-lobe graft (mL)"], ["totalMl", "Total liver (mL)"], ["recipientKg", "Recipient dry weight (kg)", "0.5"], ["fatPct", "MRI-PDFF fat (%)"]].map(([k, l, step]) => `<label class="field">${l}<input type="number" step="${step || 1}" data-d="${k}" value="${don[k]}"></label>`).join("")}</div>
          <ul class="facts" id="donor"></ul>
          <p class="hint">These are measurement checks only. Donor approval is a separate, independent decision.</p>
        </section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to prepare the meeting summary</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    function update() {
      const m = meld3(rec), cp = childPugh(rec), dc = donorChecks(don);
      $("#tiles").innerHTML = `
        <div class="tile tile--score"><span class="label">MELD 3.0 (app)</span><span class="tile__v">${m.score}</span><span class="tile__u">raw ${m.raw}</span></div>
        <div class="tile"><span class="label">Child-Pugh (app)</span><span class="tile__v">${cp.score} · ${cp.cls}</span><span class="tile__u">class ${cp.cls}</span></div>
        <div class="tile"><span class="label">Milan (app)</span><span class="tile__v">${milan.within ? "Within" : "Outside"}</span><span class="tile__u">single 2.4 cm · AFP 38</span></div>
        <div class="tile"><span class="label">GRWR · remnant (app)</span><span class="tile__v">${dc.grwr}% · ${dc.remnant}%</span><span class="tile__u">${dc.ok ? "within limits" : "outside limits"}</span></div>`;
      $("#meld").innerHTML = m.terms.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v > 0 && k !== "Constant" && k !== "Female" ? "+" : ""}${v}</td></tr>`).join("") + `<tr class="tx__sum"><td>MELD 3.0</td><td class="num">${m.raw} → ${m.score}</td></tr>`;
      $("#cp").innerHTML = cp.parts.map(([k, v]) => `<tr><td>${k}</td><td class="num">${v}</td></tr>`).join("") + `<tr class="tx__sum"><td>Total</td><td class="num">${cp.score} (${cp.cls})</td></tr>`;
      $("#donor").innerHTML = dc.items.map((i) => `<li><span class="dot dot--${i.ok ? "ok" : "danger"}"></span><span>${esc(i.text)}</span><small class="muted">${i.ok ? "ok" : "blocks"}</small></li>`).join("");
      if (d) gate();
    }
    update();

    view.querySelectorAll("[data-r]").forEach((inp) => inp.addEventListener("change", () => {
      if (inp.value === "") return;
      const before = meld3(rec).score;
      rec[inp.dataset.r] = inp.tagName === "SELECT" ? inp.value : Number(inp.value);
      audit.add(`Recipient ${inp.dataset.r} set to ${inp.value}: MELD ${before} → ${meld3(rec).score}, Child-Pugh ${childPugh(rec).score}`, "edit");
      update();
    }));
    view.querySelectorAll("[data-d]").forEach((inp) => inp.addEventListener("change", () => {
      if (inp.value === "") return;
      don[inp.dataset.d] = Number(inp.value);
      const dc = donorChecks(don);
      audit.add(`Donor ${inp.dataset.d} set to ${inp.value}: GRWR ${dc.grwr}%, remnant ${dc.remnant}%${dc.ok ? "" : " (outside limits)"}`, dc.ok ? "edit" : "reject");
      update();
    }));

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const m = meld3(rec), cp = childPugh(rec), dc = donorChecks(don);
      const payload = {
        meeting: ctx.mod.defaultInput,
        appChecks: [
          `MELD 3.0 ${m.score} (${m.terms.map(([k, v]) => `${k} ${v}`).join("; ")}; raw ${m.raw})`,
          `Child-Pugh ${cp.score}, class ${cp.cls} (${cp.parts.map(([k, v]) => `${k} ${v}`).join(", ")})`,
          `Milan: ${milan.within ? "within" : "outside"} (single 2.4 cm lesion, no vascular invasion or extrahepatic disease)`,
          ...dc.items.map((i) => `${i.ok ? "OK" : "FAIL"}: ${i.text}`),
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is pulling the recipient and donor work-up together…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Evaluation summary drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="tx__out">
        <section class="headline-card"><span class="label">Candidacy</span><h3>${esc(d.candidacy.verdict)}</h3><p>${esc(d.candidacy.indications)}</p><p>${esc(d.candidacy.urgency)}</p></section>
        <div class="handover">
          <section><h3 class="section-title">HCC and transplant criteria</h3><ul class="facts">${d.hcc.map((h) => `<li><span class="dot dot--ok"></span><span>${esc(h)}</span><span></span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Living donor</h3><ul class="facts">${d.donor.map((h) => `<li><span class="dot dot--warn"></span><span>${esc(h)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Recipient work-up tracker</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th></th><th>Domain</th><th>Result</th><th>Action</th></tr></thead><tbody>${d.tracker.map((t) => `<tr><td><span class="dot dot--${STATUS_DOT[t.status]}"></span></td><td>${esc(t.domain)}</td><td>${esc(t.result)}</td><td>${esc(t.action)}</td></tr>`).join("")}</tbody></table></div></section>
        <div class="handover">
          <section><h3 class="section-title">Open items before surgery</h3><ul class="tasks" id="open"></ul></section>
          <section><h3 class="section-title">Legal and ethics</h3><ul class="facts">${d.legal.map((h) => `<li><span class="dot"></span><span>${esc(h)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section class="brief"><span class="label">Explaining it to Anitha and Kevin</span><textarea id="family" rows="6" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.family)}</textarea><button class="rbtn" id="share">Share with the family</button></section>
        <div id="gate"></div>
        <div class="actions-row"><button class="btn btn--primary" id="schedule">Schedule LDLT</button><button class="btn btn--approve" id="file">Approve &amp; file summary</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      const list = g.querySelector("#open");
      list.innerHTML = d.openItems.map((o, i) => `<li><input type="checkbox" data-o="${i}" aria-label="Done"><span class="time">${esc(o.owner)}</span><span>${esc(o.item)}</span></li>`).join("");
      list.querySelectorAll("[data-o]").forEach((c) => c.addEventListener("change", () => {
        const i = Number(c.dataset.o);
        c.checked ? done.add(i) : done.delete(i);
        c.closest("li").classList.toggle("is-done", c.checked);
        audit.add(`${c.checked ? "Closed" : "Reopened"}: ${d.openItems[i].item} (${d.openItems[i].owner})`, c.checked ? "accept" : "info");
        gate();
      }));
      g.querySelector("#share").onclick = (e) => { audit.add("Family explanation shared with Anitha and Kevin", "info"); e.target.disabled = true; e.target.textContent = "✓ Shared"; };
      g.querySelector("#schedule").onclick = (e) => { scheduled = true; audit.add("LDLT scheduling requested", "accept"); e.target.disabled = true; e.target.textContent = "✓ Scheduling requested"; };
      g.querySelector("#file").onclick = () => {
        const m = meld3(rec), cp = childPugh(rec), dc = donorChecks(don);
        ctx.file([
          `## Scores (app)`, `- MELD 3.0 ${m.score} (raw ${m.raw})`, `- Child-Pugh ${cp.score}, class ${cp.cls}`, `- Milan: ${milan.within ? "within" : "outside"}`,
          `## Donor checks (app)`, ...dc.items.map((i) => `- ${i.ok ? "✅" : "❌"} ${i.text}`), "Donor approval is a separate, independent decision.",
          `## Candidacy`, `${d.candidacy.verdict}. ${d.candidacy.urgency}.`,
          `## Open items`, ...d.openItems.map((o, i) => `- [${done.has(i) ? "x" : " "}] ${o.item} (${o.owner})`),
          `## Status`, scheduled ? "LDLT scheduling requested." : "Not yet scheduled.",
          `## Family explanation`, g.querySelector("#family").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Anitha's record";
      };
      gate();
    }

    function gate() {
      const dc = donorChecks(don);
      const open = d.openItems.filter((_, i) => !done.has(i));
      const reasons = [...dc.items.filter((i) => !i.ok).map((i) => i.text), ...open.map((o) => o.item)];
      view.querySelector("#gate").innerHTML = reasons.length
        ? `<div class="tx__gate"><span class="label">Scheduling locked (app): ${reasons.length} item${reasons.length === 1 ? "" : "s"}</span><ul>${reasons.map((r) => `<li><span class="dot dot--${dc.items.some((i) => i.text === r) ? "danger" : "warn"}"></span> ${esc(r)}</li>`).join("")}</ul></div>`
        : `<div class="tx__gate" data-ok="true"><span class="label">Nothing blocks scheduling</span></div>`;
      const btn = view.querySelector("#schedule");
      if (!scheduled) btn.disabled = reasons.length > 0;
    }
  },
};
