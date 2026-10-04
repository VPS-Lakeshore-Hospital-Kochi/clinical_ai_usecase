// Stroke code clinician view: a simulated clock replays the code, the app keeps the time
// targets and checks eligibility as each result arrives, and Claude drafts the plan.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { apixabanCriteria, toMin, toHHMM, fmtDur } from "../clinical.js";

const LKW = toMin("09:40");
const DOOR = toMin("10:35");
const START = toMin("10:30");
const END = toMin("12:40");
const GROIN_TARGET = DOOR + 90;

const EVENTS = [
  { t: "09:40", title: "Last known well", detail: "Daughter spoke to her on the phone; speech normal." },
  { t: "10:05", title: "Found unwell", detail: "Unable to speak, right arm weak. Ambulance called." },
  { t: "10:20", title: "Ambulance pre-alert", detail: "Suspected stroke, FAST positive. ETA 10:35." },
  { t: "10:35", title: "Arrived in ED (door)", detail: "BP 186/104, HR 96 irregular (AF), SpO₂ 96% on air, glucose 162 mg/dL, temp 36.8." },
  { t: "10:40", title: "NIHSS 14", detail: "Global aphasia, right facial weakness, right arm 3, right leg 2, gaze preference to the left." },
  { t: "10:44", title: "Medicines confirmed by daughter", detail: "Apixaban 2.5 mg twice daily, last dose 08:00 today; amlodipine 5 mg, metoprolol 25 mg, rosuvastatin 10 mg. Independent before (mRS 0). 62 kg." },
  { t: "10:50", title: "Bloods", detail: "Platelets 210, INR 1.1, creatinine 0.9 mg/dL. Apixaban anti-Xa level not available in this lab." },
  { t: "10:52", title: "Non-contrast CT", detail: "No haemorrhage. ASPECTS 8 (insular ribbon, M5)." },
  { t: "10:58", title: "CT angiography and perfusion", detail: "Left M1 occlusion, good collaterals. Core 18 mL, penumbra 96 mL." },
  { t: "11:05", title: "Team huddle", detail: "Neuro-interventional team on site; angiography suite free." },
].map((e) => ({ ...e, m: toMin(e.t) }));

// Each criterion becomes known when its source event arrives.
const CHECKS = [
  { group: "IV thrombolysis", label: "Within 4.5 h of last known well", at: "09:40", status: (now) => (now - LKW <= 270 ? ["ok", `${fmtDur(now - LKW)} so far`] : ["danger", "Window passed"]) },
  { group: "IV thrombolysis", label: "No haemorrhage on CT", at: "10:52", status: () => ["ok", "None on CT"] },
  { group: "IV thrombolysis", label: "BP ≤185/110 (or treatable)", at: "10:35", status: () => ["warn", "186/104: treat first"] },
  { group: "IV thrombolysis", label: "Glucose above 50 mg/dL", at: "10:35", status: () => ["ok", "162"] },
  { group: "IV thrombolysis", label: "Platelets ≥100, INR ≤1.7", at: "10:50", status: () => ["ok", "210 · 1.1"] },
  { group: "IV thrombolysis", label: "No DOAC within 48 h (unless drug level normal)", at: "10:44", status: (now) => ["danger", now >= toMin("10:50") ? "Apixaban at 08:00; no anti-Xa assay" : "Apixaban at 08:00 today"] },
  { group: "Thrombectomy", label: "ICA or M1 occlusion", at: "10:58", status: () => ["ok", "Left M1"] },
  { group: "Thrombectomy", label: "NIHSS ≥6", at: "10:40", status: () => ["ok", "14"] },
  { group: "Thrombectomy", label: "ASPECTS ≥6", at: "10:52", status: () => ["ok", "8"] },
  { group: "Thrombectomy", label: "Pre-stroke mRS 0–1", at: "10:44", status: () => ["ok", "0"] },
  { group: "Thrombectomy", label: "Groin puncture within 6 h", at: "09:40", status: (now) => (now < LKW + 360 ? ["ok", `Deadline ${toHHMM(LKW + 360)}`] : ["danger", "Passed"]) },
].map((c) => ({ ...c, m: toMin(c.at) }));

export default {
  notes: [
    "The clocks and eligibility checks are run by the app from the timeline, so they update the moment each result arrives.",
    "Thrombolysis turns to No at 10:44, when the daughter confirms apixaban was taken at 08:00. A normal INR does not make it safe.",
    "The app checks the apixaban dose criteria: she meets none, so 2.5 mg was an under-dose, which is a medication-safety event.",
    "Claude drafts the plan, including the hemicraniectomy conversation to have early with the family. The team accepts each action.",
  ],
  guide: [
    "Press Play to replay the stroke code. Results arrive on the timeline as they did in the ED.",
    "The app runs the clocks and ticks off eligibility as each result lands.",
    "Once the CT angiogram is back, ask Claude for the plan and review each action.",
    "Record groin puncture to stop the door-to-groin clock, then file the plan.",
  ],
  mount(root, ctx) {
    let now = START;
    let timer = null;
    let groin = null;
    let planAsked = false;

    root.innerHTML = "";
    const view = el(`<div class="stroke">
      <div class="clocks" id="clocks"></div>
      <div class="sim">
        <button class="btn btn--primary" id="play">▶ Play</button>
        <button class="btn btn--ghost" id="next">Next result</button>
        <input type="range" id="scrub" min="${START}" max="${END}" value="${START}" aria-label="Simulated time">
        <span class="sim__now" id="now"></span>
      </div>
      <div class="stroke__grid">
        <section><h3 class="section-title">Timeline</h3><ul class="feed" id="feed">${EVENTS.map((e, i) => `<li data-i="${i}"><span class="t">${e.t}</span><span><strong>${esc(e.title)}</strong>${esc(e.detail)}</span></li>`).join("")}</ul></section>
        <div style="display:grid;gap:20px">
          <section><h3 class="section-title">Decision</h3><div class="decision" id="decision"></div></section>
          <section><h3 class="section-title">Eligibility, checked by the app</h3><div class="elig" id="elig"></div></section>
          <section id="apix"></section>
        </div>
      </div>
      <section>
        <div class="review-tools"><h3 class="section-title" style="margin:0">Plan</h3><span class="chip chip--muted" id="src">Waiting for imaging</span></div>
        <div id="plan"><div class="actions-row" style="margin:0"><button class="btn btn--secondary" id="ask" disabled>Ask Claude for the plan</button><span class="hint" id="ask-hint">Available once the CT angiogram is back.</span></div></div>
      </section>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => toHHMM(now) });

    const known = () => EVENTS.filter((e) => e.m <= now);

    function render() {
      $("#now").textContent = `Time ${toHHMM(now)}`;
      $("#scrub").value = now;
      const doorIn = now >= DOOR;
      const ct = EVENTS.find((e) => e.t === "10:52");
      const ctDone = now >= ct.m;
      const groinLeft = GROIN_TARGET - now;
      $("#clocks").innerHTML = [
        ["Since last known well", fmtDur(now - LKW), "Thrombolysis window 4.5 h · thrombectomy 6 h", ""],
        ["Door to CT", doorIn ? (ctDone ? `${ct.m - DOOR} min` : fmtDur(now - DOOR)) : "—", ctDone ? `Target ≤20 min · met` : "Target ≤20 min", ctDone ? "met" : ""],
        ["Door to groin", groin != null ? `${groin - DOOR} min` : doorIn ? fmtDur(now - DOOR) : "—", groin != null ? (groin <= GROIN_TARGET ? "Target ≤90 min · met" : "Target ≤90 min · missed") : doorIn ? (groinLeft >= 0 ? `Target ≤90 min · ${groinLeft} min left` : `Target missed by ${-groinLeft} min`) : "Target ≤90 min", groin != null && groin > GROIN_TARGET || (groin == null && doorIn && groinLeft < 0) ? "late" : ""],
        ["Groin puncture target", toHHMM(GROIN_TARGET), groin != null ? `Recorded at ${toHHMM(groin)}` : "Door + 90 min", ""],
      ].map(([l, v, sub, st]) => `<div class="clock" data-state="${st}"><span class="label">${l}</span><span class="clock__value">${v}</span><span class="clock__sub">${sub}</span></div>`).join("");

      const latest = known().at(-1);
      view.querySelectorAll("#feed li").forEach((li) => {
        const e = EVENTS[li.dataset.i];
        li.classList.toggle("is-future", e.m > now);
        li.classList.toggle("is-latest", e === latest);
      });

      const groups = ["IV thrombolysis", "Thrombectomy"];
      $("#elig").innerHTML = groups.map((g) => `<div><h3>${g}</h3><ul>${CHECKS.filter((c) => c.group === g).map((c) => {
        const [st, note] = c.m <= now ? c.status(now) : ["", "Waiting for result"];
        return `<li><span class="dot ${st ? `dot--${st}` : ""}"></span><span>${esc(c.label)}<small class="${st === "danger" ? "t-danger" : ""}">${esc(note)}</small></span></li>`;
      }).join("")}</ul></div>`).join("");

      const doac = now >= toMin("10:44");
      const lysisWindow = now - LKW <= 270;
      const mechAll = CHECKS.filter((c) => c.group === "Thrombectomy").every((c) => c.m <= now && c.status(now)[0] === "ok");
      $("#decision").innerHTML = `
        <div class="decision__item" data-v="${doac ? "no" : ""}"><span class="label">IV thrombolysis</span><span class="v">${doac ? "No" : lysisWindow ? "Pending" : "No"}</span><p>${doac ? "Apixaban taken within 48 h; no drug-specific level available." : "Waiting for medicines, bloods and CT."}</p></div>
        <div class="decision__item"><span class="label">Thrombectomy</span><span class="v">${mechAll ? "Yes" : "Pending"}</span><p>${mechAll ? "Large-vessel occlusion with a small core, within 6 h." : "Waiting for CT angiography."}</p></div>`;

      if (now >= toMin("10:50")) {
        const a = apixabanCriteria({ ageYears: 71, weightKg: 62, creatinine: 0.9 });
        $("#apix").innerHTML = `<h3 class="section-title">Anticoagulant dose check</h3><p style="margin:0;font-size:14px">Reduced-dose criteria met: <strong>${a.met.length} of 3</strong> (age ≥80, weight ≤60 kg, creatinine ≥1.5). Indicated dose: <strong>${a.correctDose}</strong>. Prescribed: <strong class="t-danger">2.5 mg twice daily</strong>, which is under-dosed.</p>`;
      } else $("#apix").innerHTML = "";

      const ready = now >= toMin("10:58");
      if (!planAsked) {
        $("#ask").disabled = !ready;
        $("#ask-hint").textContent = ready ? "The CT angiogram is back." : "Available once the CT angiogram is back.";
      }
      $("#next").disabled = !EVENTS.some((e) => e.m > now);
      $("#groin") && ($("#groin").disabled = groin != null || now < toMin("11:05"));
    }

    const stop = () => { clearInterval(timer); timer = null; $("#play").textContent = "▶ Play"; };
    const tick = () => {
      now = Math.min(END, now + 1);
      const arrived = EVENTS.find((e) => e.m === now);
      if (arrived) audit.add(`Result: ${arrived.title}`);
      render();
      if (now >= END || (now === toMin("10:58") && !planAsked)) stop();
    };
    $("#play").onclick = () => {
      if (timer) return stop();
      $("#play").textContent = "❚❚ Pause";
      timer = setInterval(tick, matchMedia("(prefers-reduced-motion: reduce)").matches ? 250 : 400);
    };
    $("#next").onclick = () => {
      stop();
      const nxt = EVENTS.find((e) => e.m > now);
      if (!nxt) return;
      now = nxt.m;
      audit.add(`Result: ${nxt.title}`);
      render();
    };
    $("#scrub").addEventListener("input", (e) => { stop(); now = Number(e.target.value); render(); });

    $("#ask").onclick = async () => {
      stop();
      planAsked = true;
      const box = $("#plan");
      const payload = {
        now: toHHMM(now),
        events: known().map((e) => ({ time: e.t, title: e.title, detail: e.detail })),
        checks: CHECKS.filter((c) => c.m <= now).map((c) => ({ group: c.group, label: c.label, status: c.status(now)[1] })),
      };
      const result = await withClaude(box, (o) => ctx.ask(payload, o), { label: "Claude is drafting the stroke plan…" });
      $("#src").textContent = sourceNote(result);
      audit.add("Claude drafted the plan");
      renderPlan(box, result.data);
    };

    function renderPlan(box, d) {
      box.innerHTML = "";
      const p = el(`<div style="display:grid;gap:20px">
        <div class="decision">
          <div class="decision__item" data-v="${d.decision.thrombolysis.give ? "" : "no"}"><span class="label">Claude: IV thrombolysis</span><span class="v">${d.decision.thrombolysis.give ? "Yes" : "No"}</span><p>${esc(d.decision.thrombolysis.reason)}</p></div>
          <div class="decision__item" data-v="${d.decision.thrombectomy.go ? "" : "no"}"><span class="label">Claude: thrombectomy</span><span class="v">${d.decision.thrombectomy.go ? "Go now" : "No"}</span><p>${esc(d.decision.thrombectomy.reason)}</p></div>
        </div>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Next 60 minutes</h3><button class="rbtn" id="all">Accept remaining</button></div><div id="next60"></div>
          <div class="actions-row"><button class="btn btn--primary" id="groin" disabled>Record groin puncture</button><span class="hint">Stops the door-to-groin clock at the simulated time.</span></div></section>
        <div class="handover">
          <section><h3 class="section-title">First 24 hours after the procedure</h3><ul class="plain-list">${d.post24.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
          <section><h3 class="section-title">Neurosurgical contingency</h3><ul class="plain-list">${d.neurosurgery.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Medicine safety</h3><div id="meds"></div></section>
        <section><h3 class="section-title">Family briefing</h3><textarea id="brief" class="brief" rows="5" style="width:100%;font:inherit;border:0;resize:vertical">${esc(d.familyBriefing)}</textarea></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve plan &amp; file</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(p);
      const q = (s) => p.querySelector(s);
      const next60 = reviewList(q("#next60"), d.next60.map((x, i) => ({ key: `n${i}`, text: x.action, meta: `Target: ${esc(x.target)}` })), { audit, noun: "action" });
      const meds = reviewList(q("#meds"), d.medicineSafety.map((x, i) => ({ key: `m${i}`, text: `${x.finding}. ${x.action}`, html: `${esc(x.finding)}<br><strong style="font-weight:500">${esc(x.action)}</strong>` })), { audit, noun: "medicine action" });
      q("#all").onclick = () => next60.acceptAll();
      q("#brief").addEventListener("change", () => audit.add("Edited the family briefing", "edit"));
      q("#groin").onclick = () => {
        if (now < toMin("11:05")) return;
        groin = now;
        audit.add(`Groin puncture recorded: door-to-groin ${groin - DOOR} min`, "accept");
        render();
      };
      q("#file").onclick = () => {
        ctx.file([
          "## Decision", `- IV thrombolysis: **${d.decision.thrombolysis.give ? "yes" : "no"}**. ${d.decision.thrombolysis.reason}`, `- Thrombectomy: **${d.decision.thrombectomy.go ? "yes" : "no"}**. ${d.decision.thrombectomy.reason}`,
          "## Clock", `- Last known well 09:40 · door 10:35 · CT 10:52 (door-to-CT 17 min)${groin != null ? ` · groin ${toHHMM(groin)} (door-to-groin ${groin - DOOR} min)` : ""}`,
          "## Next 60 minutes (accepted)", ...next60.accepted().map((x) => `- ${x.text}`),
          "## First 24 hours", ...d.post24.map((x) => `- ${x}`),
          "## Neurosurgical contingency", ...d.neurosurgery.map((x) => `- ${x}`),
          "## Medicine safety (accepted)", ...meds.accepted().map((x) => `- ${x.text}`),
          "## Family briefing", q("#brief").value.trim(),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        audit.add("Plan approved and filed", "accept");
        q("#file").disabled = true;
        q("#filed").textContent = "✓ Filed to the patient timeline";
      };
      render();
    }

    render();
    return () => clearInterval(timer);
  },
};
