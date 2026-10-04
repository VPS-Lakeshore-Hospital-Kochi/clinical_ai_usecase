// Antenatal clinician view: the app works out gestation from the EDD, lays out the pregnancy
// timeline, classifies BP, screens for pre-eclampsia, checks GDM targets and the anti-D schedule.
// Claude ranks the risks and drafts orders; the day-assessment result re-runs the screen live.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { gestation, dateAtGestation, bpClass, preEclampsiaCheck, gdmControl, antiDStatus } from "../clinical.js";

const EDD = "2026-12-01";
const TODAY = "2026-09-24";
const BP = [["20 Apr", "Booking", 118, 74], ["10 Sep", "28 weeks", 132, 84], ["24 Sep", "Today", 142, 92], ["24 Sep", "+15 min", 144, 94]];
const TODAY_LABS = { sbp: 144, dbp: 94, pcr: 0.28, platelets: 182, alt: 28, creatinine: 0.6, ratio: null };
const SYMPTOMS = ["Severe headache", "Visual disturbance", "Right upper quadrant pain"];
const PRESETS = {
  reassuring: { label: "Reassuring result", sbp: 138, dbp: 88, pcr: 0.22, platelets: 176, alt: 26, creatinine: 0.6, ratio: 24, symptoms: [] },
  worse: { label: "Deteriorating result", sbp: 162, dbp: 108, pcr: 0.46, platelets: 118, alt: 52, creatinine: 0.8, ratio: 112, symptoms: ["Visual disturbance"] },
};
const DOT = { ok: "ok", warn: "warn", fail: "danger" };
const CAT_DOT = { "Normal blood pressure": "ok", "Gestational hypertension": "warn", "Pre-eclampsia": "danger", "Pre-eclampsia with severe features": "danger" };
const fmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default {
  notes: [
    "The app works out gestation from the EDD (30+2 today) and places every event on the pregnancy timeline. The missed 28-week anti-D shows up as a gap, not a line buried in the notes.",
    "The app's pre-eclampsia screen says gestational hypertension: BP over 140/90 but PCR 0.28, under the 0.3 threshold. Claude adds the risk context: headache, family history, rising BP.",
    "Claude checks routine care, not only today's problem: anti-D, IV iron, aspirin and fetal growth.",
    "Later in the day, enter the day-assessment result. Try 'Deteriorating result': the app reclassifies to severe features and the plan changes to admission.",
    "Record the partner's blood group or the anti-D dose and the timeline and tile update.",
  ],
  guide: [
    "Look at the pregnancy timeline and the app's checks.",
    "Ask Claude for the antenatal review.",
    "Accept, edit or reject the orders, grouped by problem.",
    "Enter the day-assessment unit result; the screen re-runs live.",
    "Send the warning signs to Fathima and file.",
  ],
  mount(root, ctx) {
    const ga = gestation(EDD, TODAY);
    const gdm = gdmControl({ fasting: [98, 105], oneHour: [150, 165] });
    const antiD = { partner: "unknown", given: false };
    const dau = { ...TODAY_LABS, symptoms: [] };
    let dauDone = false, lastCat = null, d = null, orders = null;

    root.innerHTML = "";
    const view = el(`<div class="an">
      <section class="an__tl" id="timeline"></section>
      <section class="tiles" id="tiles"></section>
      <div class="an__top">
        <section><h3 class="section-title">Blood pressure this pregnancy</h3><div id="bp"></div></section>
        <section><h3 class="section-title">Glucose log, last 7 days</h3>
          <ul class="facts">
            <li><span class="dot dot--${gdm.fastingOk ? "ok" : "danger"}"></span><span>Fasting<br><small class="muted">target &lt;95 mg/dL</small></span><strong>98–105</strong></li>
            <li><span class="dot dot--${gdm.postOk ? "ok" : "danger"}"></span><span>1 hour after meals<br><small class="muted">target &lt;140 mg/dL · worst after lunch</small></span><strong>150–165</strong></li>
            <li><span class="dot dot--warn"></span><span>Growth scan today<br><small class="muted">EFW 1,850 g · AFI 22 cm · Doppler normal</small></span><strong>AC 90th</strong></li>
          </ul>
        </section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude for the antenatal review</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    const antiDNow = () => antiDStatus({ rhNegative: true, partner: antiD.partner, given: antiD.given, gaWeeks: ga.weeks });
    const screen = () => preEclampsiaCheck(dau);

    function timeline() {
      const pct = (w) => `${((w / 42) * 100).toFixed(2)}%`;
      const st = antiDNow();
      const events = [
        { w: 7 + 6 / 7, label: "Booking", sub: "7+6 · O Rh-negative" },
        { w: 26 + 2 / 7, label: "GDM diagnosed", sub: "26+2 · OGTT" },
        { w: 28, label: "Anti-D", sub: `28+0 · ${fmt(dateAtGestation(EDD, 28))} · ${st.status.toLowerCase()}`, kind: st.status === "Overdue" ? "missed" : st.needed ? "done" : "na" },
        { w: ga.totalDays / 7, label: "Today", sub: ga.label, kind: "today" },
        { w: 40, label: "EDD", sub: fmt(EDD) },
      ];
      $("#timeline").innerHTML = `<div class="review-tools"><h3 class="section-title" style="margin:0">Pregnancy timeline (app, from the EDD)</h3><span class="hint">G2P1L1 · ${ga.label} weeks · EDD ${fmt(EDD)}</span></div>
        <div class="an__track" role="img" aria-label="Pregnancy timeline from booking to the due date">
          <span class="an__tri" style="left:0;width:${pct(13)}">T1</span><span class="an__tri" style="left:${pct(13)};width:${pct(15)}">T2</span><span class="an__tri" style="left:${pct(28)};width:${pct(14)}">T3</span>
          <span class="an__elapsed" style="width:${pct(ga.totalDays / 7)}"></span>
          <span class="an__window" style="left:${pct(37)};width:${pct(2)}" title="Planned birth window 37+0 to 38+6"></span>
          ${events.map((e) => `<span class="an__ev" data-kind="${e.kind || ""}" style="left:${pct(e.w)}"></span>`).join("")}
        </div>
        <ol class="an__legend">${events.map((e) => `<li data-kind="${e.kind || ""}"><span class="an__key"></span><span><strong>${esc(e.label)}</strong><br><small class="muted">${esc(e.sub)}</small></span></li>`).join("")}<li><span class="an__key an__key--window"></span><span><strong>Planned birth window</strong><br><small class="muted">37+0 to 38+6 · ${fmt(dateAtGestation(EDD, 37))}–${fmt(dateAtGestation(EDD, 38, 6))}</small></span></li></ol>`;
    }

    function tiles() {
      const s = screen(), st = antiDNow();
      $("#tiles").innerHTML = `
        <div class="tile tile--score"><span class="label">Gestation (app)</span><span class="tile__v">${ga.label}</span><span class="tile__u">weeks, by dating scan</span></div>
        <div class="tile"><span class="label">BP class (app)</span><span class="tile__v">${dau.sbp}/${dau.dbp}</span><span class="tile__u">${{ normal: "normal", hypertension: "hypertension ≥140/90", severe: "severe ≥160/110" }[bpClass(dau.sbp, dau.dbp)]}</span></div>
        <div class="tile"><span class="label">Pre-eclampsia screen (app)</span><span class="tile__v an__cat"><span class="dot dot--${CAT_DOT[s.category]}"></span> ${esc(s.category)}</span><span class="tile__u">PCR ${dau.pcr} ${s.proteinuria ? "≥" : "<"} 0.3${dauDone ? " · DAU result" : ""}</span></div>
        <div class="tile"><span class="label">GDM targets (app)</span><span class="tile__v">${[gdm.fastingOk, gdm.postOk].filter(Boolean).length} / 2</span><span class="tile__u">fasting and 1-hour both above target</span></div>
        <div class="tile"><span class="label">Anti-D (app)</span><span class="tile__v">${esc(st.status)}</span><span class="tile__u">partner's group ${esc(antiD.partner)}</span></div>`;
    }

    function bpChart() {
      const W = 420, H = 150, m = { l: 34, r: 12, t: 10, b: 24 }, y0 = 60, y1 = 170;
      const x = (i) => m.l + (i / (BP.length - 1)) * (W - m.l - m.r);
      const y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
      const line = (k) => BP.map((b, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(b[k]).toFixed(1)}`).join("");
      $("#bp").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Blood pressure rising from 118/74 at booking to 144/94 today">
        ${[[140, "140"], [90, "90"]].map(([v, t]) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--danger)" stroke-dasharray="4 4" opacity=".5"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${t}</text>`).join("")}
        <path d="${line(2)}" fill="none" stroke="var(--chart-1)" stroke-width="2"/><path d="${line(3)}" fill="none" stroke="var(--chart-2)" stroke-width="2"/>
        ${BP.map((b, i) => `<circle cx="${x(i)}" cy="${y(b[2])}" r="3.5" fill="var(--chart-1)"/><circle cx="${x(i)}" cy="${y(b[3])}" r="3.5" fill="var(--chart-2)"/><text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${b[1]}</text>`).join("")}
      </svg><p class="hint">Systolic (navy) and diastolic (slate) · dashed = 140/90 · ${BP.map((b) => `${b[1]} ${b[2]}/${b[3]}`).join(" · ")}</p>`;
    }

    timeline(); tiles(); bpChart();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const s = screen(), st = antiDNow();
      const payload = {
        visit: ctx.mod.defaultInput,
        appChecks: [
          `Gestation ${ga.label} weeks from EDD ${fmt(EDD)}; 28-week date was ${fmt(dateAtGestation(EDD, 28))}`,
          `BP class: ${bpClass(dau.sbp, dau.dbp)} (${dau.sbp}/${dau.dbp})`,
          `Pre-eclampsia screen: ${s.category}; proteinuria ${s.proteinuria ? "yes" : "no"} (PCR ${dau.pcr}); organ dysfunction ${s.organ.join(", ") || "none"}`,
          `GDM targets: fasting ${gdm.fastingOk ? "met" : "not met"}, 1-hour ${gdm.postOk ? "met" : "not met"}`,
          `Anti-D: ${st.status} (partner ${antiD.partner})`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading the whole pregnancy record…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Antenatal review drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="an__out">
        <section><h3 class="section-title">Safety flags</h3><ol class="an__flags">${d.flags.map((f) => `<li><div><strong>${esc(f.title)}</strong><p>${esc(f.action)}</p></div><span class="chip">${esc(f.timeframe)}</span></li>`).join("")}</ol></section>
        <section><h3 class="section-title">Risk assessment</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th></th><th>Condition</th><th>Criteria</th><th>Today's evidence</th></tr></thead><tbody>${d.risks.map((r) => `<tr><td><span class="dot dot--${DOT[r.status]}"></span></td><td>${esc(r.condition)}</td><td>${esc(r.criteria)}</td><td>${esc(r.evidence)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Orders by problem</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="orders"></div></section>
        <section class="an__rh"><h3 class="section-title">Rhesus prophylaxis</h3>
          <div class="an__rh-row"><label class="field">Partner's blood group<select id="partner"><option value="unknown">Not recorded</option><option value="positive">Rh-positive</option><option value="negative">Rh-negative</option></select></label>
          <button class="rbtn" id="antid">Record anti-D 1500 IU given</button><span class="hint" id="antid-note"></span></div></section>
        <section class="an__dau"><h3 class="section-title">Day-assessment unit result</h3><p class="hint">Enter the afternoon's results; the app re-runs the pre-eclampsia screen as you type.</p>
          <div class="an__presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="rbtn" data-preset="${k}">${esc(p.label)}</button>`).join("")}</div>
          <div class="an__fields">
            ${[["sbp", "Systolic"], ["dbp", "Diastolic"], ["pcr", "PCR (mg/mg)", "0.01"], ["platelets", "Platelets"], ["alt", "ALT"], ["creatinine", "Creatinine", "0.1"], ["ratio", "sFlt-1/PlGF"]].map(([k, l, step]) => `<label class="field">${l}<input type="number" data-k="${k}" step="${step || 1}" value="${dau[k] ?? ""}"></label>`).join("")}
          </div>
          <div class="an__symptoms">${SYMPTOMS.map((s) => `<label class="check"><input type="checkbox" data-s="${esc(s)}"> ${esc(s)}</label>`).join("")}</div>
          <div id="dau-result"></div>
        </section>
        <section><h3 class="section-title">Delivery planning</h3><div id="delivery"></div></section>
        <section class="brief"><span class="label">Warning signs for Fathima</span><textarea id="copy" rows="6" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.patientCopy)}</textarea><button class="rbtn" id="send">Send to patient</button></section>
        <section><h3 class="section-title">Follow-up schedule</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>When</th><th>What</th><th>Who</th></tr></thead><tbody>${d.followUp.map((f) => `<tr><td>${esc(f.when)}</td><td>${esc(f.what)}</td><td>${esc(f.who)}</td></tr>`).join("")}</tbody></table></div></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file review</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);

      orders = reviewList(g.querySelector("#orders"), d.orders.map((o, i) => ({ key: String(i), label: o.problem, text: o.order, meta: esc(o.detail) })), { audit, noun: "order" });
      g.querySelector("#accept-all").onclick = () => orders.acceptAll();

      g.querySelector("#partner").onchange = (e) => {
        antiD.partner = e.target.value;
        audit.add(`Partner's blood group recorded: ${e.target.selectedOptions[0].textContent}`, "info");
        rhesus();
      };
      g.querySelector("#antid").onclick = () => {
        antiD.given = true;
        audit.add("Anti-D immunoglobulin 1500 IU given (after repeat antibody screen)", "accept");
        rhesus();
      };

      g.querySelectorAll("[data-k]").forEach((inp) => inp.addEventListener("input", () => {
        if (inp.value === "" && inp.dataset.k !== "ratio") return;
        dau[inp.dataset.k] = inp.value === "" ? null : Number(inp.value);
        dauDone = true;
        dauUpdate();
      }));
      g.querySelectorAll("[data-s]").forEach((c) => c.addEventListener("change", () => {
        dau.symptoms = [...g.querySelectorAll("[data-s]:checked")].map((x) => x.dataset.s);
        dauDone = true;
        dauUpdate();
      }));
      g.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
        const p = PRESETS[b.dataset.preset];
        Object.assign(dau, { ...p, symptoms: [...p.symptoms] });
        delete dau.label;
        g.querySelectorAll("[data-k]").forEach((inp) => { inp.value = dau[inp.dataset.k] ?? ""; });
        g.querySelectorAll("[data-s]").forEach((c) => { c.checked = dau.symptoms.includes(c.dataset.s); });
        dauDone = true;
        audit.add(`Day-assessment result entered: ${p.label.toLowerCase()}`, "info");
        dauUpdate();
      }));

      g.querySelector("#send").onclick = (e) => { audit.add("Warning signs sent to the patient", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        const s = screen(), st = antiDNow();
        ctx.file([
          `## App checks`, `- Gestation ${ga.label} (EDD ${fmt(EDD)})`, `- Pre-eclampsia screen: ${s.category} (BP ${dau.sbp}/${dau.dbp}, PCR ${dau.pcr})${dauDone ? " after the day-assessment result" : ""}`, `- ${s.action}`, ...(s.ratioNote ? [`- ${s.ratioNote}`] : []), `- Anti-D: ${st.status}; partner ${antiD.partner}`,
          `## Safety flags`, ...d.flags.map((f, i) => `${i + 1}. ${f.title} (${f.timeframe}). ${f.action}`),
          `## Orders`, ...orders.states().map((o) => `- ${o.status === "rejected" ? "~~" : ""}${o.label}: ${o.text}${o.status === "rejected" ? "~~ (rejected)" : o.status === "pending" ? " (not yet decided)" : ""}`),
          `## Delivery planning`, severeNow() ? "**Changed by the day-assessment result: admit for senior review; timing of birth to be decided.**" : `${d.delivery.timing}. ${d.delivery.place}.`,
          `## Warning signs (patient copy)`, g.querySelector("#copy").value.trim(),
          `## Follow-up`, ...d.followUp.map((f) => `- ${f.when}: ${f.what} (${f.who})`),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Fathima's record";
      };

      rhesus();
      dauUpdate();
    }

    const severeNow = () => screen().category === "Pre-eclampsia with severe features";

    function rhesus() {
      const st = antiDNow();
      view.querySelector("#antid").disabled = antiD.given || !st.needed;
      view.querySelector("#antid-note").textContent = antiD.given ? "✓ Given · plan cord blood group at birth" : st.needed ? `App: ${st.status.toLowerCase()} (partner ${antiD.partner})` : "App: not needed while the partner is Rh-negative";
      timeline(); tiles();
    }

    function dauUpdate() {
      const s = screen();
      if (lastCat && s.category !== lastCat && dauDone) audit.add(`App re-screen: ${lastCat} → ${s.category}`, s.category.includes("severe") ? "reject" : "info");
      lastCat = s.category;
      view.querySelector("#dau-result").innerHTML = `<div class="an__verdict" data-dot="${CAT_DOT[s.category]}"><span class="label">App screen${dauDone ? "" : " (clinic values)"}</span><h3><span class="dot dot--${CAT_DOT[s.category]}"></span> ${esc(s.category)}</h3>
        <p>${esc(s.action)}</p>
        ${s.severe.length ? `<p><strong>Severe features:</strong> ${esc(s.severe.join(", "))}</p>` : ""}
        ${s.organ.length ? `<p>Organ involvement: ${esc(s.organ.join(", "))}</p>` : ""}
        ${s.ratioNote ? `<p class="muted">${esc(s.ratioNote)}</p>` : ""}</div>`;
      const sev = severeNow();
      view.querySelector("#delivery").innerHTML = sev
        ? `<div class="escalate"><h3>Plan changed: admit now</h3><p>The day-assessment result shows severe features. Senior obstetric review, BP control and magnesium sulfate per protocol; steroids if birth before 34+6 is likely. Claude's routine delivery plan below no longer applies.</p></div><p class="muted" style="text-decoration:line-through">${esc(d.delivery.timing)}</p>`
        : `<ul class="facts"><li><span class="dot dot--ok"></span><span><strong>Timing</strong><br><small class="muted">${esc(d.delivery.timing)}</small></span><span></span></li><li><span class="dot dot--ok"></span><span><strong>Place</strong><br><small class="muted">${esc(d.delivery.place)}</small></span><span></span></li>${d.delivery.changesPlan.map((c) => `<li><span class="dot dot--warn"></span><span>${esc(c)}</span><span></span></li>`).join("")}</ul>`;
      tiles();
    }
  },
};
