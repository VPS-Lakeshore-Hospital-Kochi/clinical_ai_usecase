// Heart failure clinic clinician view: the app works out the four-pillar gaps, the weight trend,
// iron deficiency and CRT eligibility, and checks every titration step against today's values,
// including the 36-hour ACE-inhibitor washout. Steps the app blocks cannot be marked done.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { gdmtGaps, titrationCheck, hfHoldRule, arniEarliest, washoutOk, hfIronDeficient, fcmTotalDose, crtEligibility, weightAlarm } from "../clinical.js";

const WEIGHTS = [["19 Sep", 68.0], ["21 Sep", 68.3], ["23 Sep", 68.9], ["25 Sep", 69.3], ["26 Sep", 69.5]].map(([day, kg]) => ({ day, kg }));
const DRY = 68.0;
const MEDS = [{ name: "Ramipril", mgPerDay: 2.5 }, { name: "Metoprolol succinate", mgPerDay: 25 }];
const CHECK_LABEL = { sglt2: "SGLT2 check", arni: "ARNI check", mra: "MRA check", bb: "Beta-blocker check", none: "" };

export default {
  notes: [
    "The app reads the medicine list against the four pillars: ramipril at 25% of target, metoprolol at 13%, no MRA and no SGLT2 inhibitor.",
    "It also works out that iron is deficient (ferritin 62, TSAT 14%, so 1,000 mg IV iron by the simplified dosing table) and that LBBB with QRS 156 ms and EF 30% meets the class I CRT criterion.",
    "Every titration step Claude drafts is checked live against today's BP, heart rate, potassium, eGFR and congestion. The ARNI start is checked against the 36-hour washout from the last ramipril dose.",
    "Try it: set potassium to 5.6. The spironolactone step is blocked and the hold rule fires. Or set the last ramipril dose to 27 Sep 08:00: the 28 Sep ARNI start is blocked because the washout is only 24 hours.",
  ],
  guide: [
    "Look at the weight trend and the app's medicine gaps.",
    "Ask Claude for the titration plan.",
    "Enter today's values; the app checks each step.",
    "Mark steps done as they are prescribed; blocked steps show why.",
    "Send the advice to Mr Rajan and file the plan.",
  ],
  mount(root, ctx) {
    const v = { sbp: 108, hr: 92, k: 4.8, egfr: 55, creatRisePct: 0, congested: true };
    let lastAce = "26 Sep 08:00";
    const gaps = gdmtGaps(MEDS);
    const wa = weightAlarm(WEIGHTS, DRY);
    const iron = hfIronDeficient(62, 14), fcm = fcmTotalDose(11.8, 69.5);
    const crt = crtEligibility({ lvef: 30, qrs: 156, lbbb: true });
    const done = new Set();
    let d = null;

    root.innerHTML = "";
    const view = el(`<div class="hf">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Weight vs dry (app)</span><span class="tile__v">+${wa.overDry} kg</span><span class="tile__u">${WEIGHTS[WEIGHTS.length - 1].kg} kg · dry ${DRY} kg</span></div>
        <div class="tile"><span class="label">LVEF · QRS</span><span class="tile__v">30% · 156 ms</span><span class="tile__u">LBBB · NYHA III</span></div>
        <div class="tile"><span class="label">CRT (app)</span><span class="tile__v">Class ${crt.cls}</span><span class="tile__u">after ≥3 months of optimised medicines</span></div>
        <div class="tile"><span class="label">Iron (app)</span><span class="tile__v">${iron ? "Deficient" : "Replete"}</span><span class="tile__u">ferritin 62 · TSAT 14% · FCM ${fcm.toLocaleString("en-IN")} mg</span></div>
      </section>
      <div class="hf__top">
        <section><h3 class="section-title">Morning weights since discharge</h3><div id="weights"></div></section>
        <section><h3 class="section-title">Guideline medicine gaps (app)</h3><ul class="hf__gaps">${gaps.map((g) => `<li><span><strong>${esc(g.pillar)}</strong><br><small class="muted">${esc(g.current)}</small></span><span class="hf__bar" role="img" aria-label="${g.pct}% of target"><i style="width:${Math.min(100, g.pct)}%"></i></span><small class="hf__pct" data-gap="${g.gap}">${g.gap === "Missing" ? "missing" : `${g.pct}%`}</small></li>`).join("")}</ul></section>
      </div>
      <section class="hf__vals"><h3 class="section-title">Values for the safety checks</h3>
        <div class="hf__fields">${[["sbp", "Systolic BP"], ["hr", "Heart rate"], ["k", "Potassium", "0.1"], ["egfr", "eGFR"], ["creatRisePct", "Creatinine rise %"]].map(([k, l, step]) => `<label class="field">${l}<input type="number" step="${step || 1}" data-v="${k}" value="${v[k]}"></label>`).join("")}
          <label class="field">Last ramipril dose<input type="text" id="ace" value="${lastAce}"></label></div>
        <label class="check"><input type="checkbox" id="congested" checked> Still congested</label>
        <div id="hold"></div>
      </section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude for the titration plan</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    (function weights() {
      const W = 420, H = 150, m = { l: 34, r: 24, t: 12, b: 24 }, y0 = 67.5, y1 = 70;
      const x = (i) => m.l + (i / (WEIGHTS.length - 1)) * (W - m.l - m.r);
      const y = (kg) => m.t + (1 - (kg - y0) / (y1 - y0)) * (H - m.t - m.b);
      $("#weights").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight rising from 68.0 to 69.5 kg over 7 days">
        <line x1="${m.l}" x2="${W - m.r}" y1="${y(DRY)}" y2="${y(DRY)}" stroke="var(--ok)" stroke-dasharray="4 4"/><text x="${m.l + 4}" y="${y(DRY) + 14}" font-size="11" fill="var(--ok)">dry weight ${DRY}</text>
        ${[68, 69, 70].map((kg) => `<text x="${m.l - 6}" y="${y(kg) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${kg}</text>`).join("")}
        <path d="${WEIGHTS.map((w, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(w.kg).toFixed(1)}`).join("")}" fill="none" stroke="var(--chart-1)" stroke-width="2"/>
        ${WEIGHTS.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.kg)}" r="3.5" fill="var(--chart-1)"/><text x="${x(i)}" y="${y(w.kg) - 8}" text-anchor="middle" font-size="11" fill="var(--ink)">${w.kg.toFixed(1)}</text><text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${w.day}</text>`).join("")}
      </svg><p class="hint">+${wa.weekGain} kg in 7 days · alarm rule: +1 kg in 2 days or +2 kg in a week</p>`;
    })();

    function hold() {
      const h = hfHoldRule(v.k, v.creatRisePct);
      $("#hold").innerHTML = h ? `<p class="hf__warn"><span class="dot dot--danger"></span> Hold rule (app): ${[v.k > 5.5 ? `K ${v.k} >5.5` : "", v.creatRisePct > 50 ? `creatinine up ${v.creatRisePct}%` : ""].filter(Boolean).join(" and ")}. Hold new drugs and call.</p>` : `<p class="hint">Earliest ARNI start (app): ${arniEarliest(validAce() ? lastAce : "26 Sep 08:00")} (36 h after the last ramipril dose)</p>`;
    }
    const validAce = () => /^\d{1,2} [A-Z][a-z]{2} \d{2}:\d{2}$/.test(lastAce);
    hold();

    view.querySelectorAll("[data-v]").forEach((inp) => inp.addEventListener("change", () => {
      if (inp.value === "") return;
      v[inp.dataset.v] = Number(inp.value);
      audit.add(`${inp.closest("label").firstChild.textContent.trim()} set to ${inp.value}`, "edit");
      hold(); if (d) steps();
    }));
    $("#congested").onchange = (e) => { v.congested = e.target.checked; audit.add(e.target.checked ? "Marked still congested" : "Marked euvolaemic", "edit"); if (d) steps(); };
    $("#ace").onchange = (e) => { lastAce = e.target.value.trim(); audit.add(`Last ramipril dose set to ${lastAce}`, "edit"); hold(); if (d) steps(); };

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        clinic: ctx.mod.defaultInput,
        appChecks: [
          ...gaps.map((g) => `${g.pillar}: ${g.current} (${g.gap}${g.pct ? `, ${g.pct}% of target` : ""})`),
          `Weight ${wa.overDry} kg above dry weight (${DRY} kg); +${wa.weekGain} kg in 7 days`,
          `Safety values: SBP ${v.sbp}, HR ${v.hr}, K ${v.k}, eGFR ${v.egfr}, creatinine rise ${v.creatRisePct}%, ${v.congested ? "congested" : "euvolaemic"}`,
          `Last ramipril dose ${lastAce}; earliest ARNI ${arniEarliest(validAce() ? lastAce : "26 Sep 08:00")}`,
          `Iron deficiency: ${iron ? "yes" : "no"}; ferric carboxymaltose total ${fcm} mg (Hb 11.8, weight 69.5 kg)`,
          `CRT: ${crt.text}`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is building a titration plan around today's numbers…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Heart-failure plan drafted", "info");
      render();
    };

    function stepCheck(s) {
      const c = titrationCheck(s.check, v);
      if (!c.ok || s.check !== "arni" || !s.start || !validAce()) return c;
      return washoutOk(lastAce, s.start) ? { ok: true, why: `${c.why}; washout met (earliest ${arniEarliest(lastAce)})` } : { ok: false, why: `Washout not met: earliest ${arniEarliest(lastAce)}, planned ${s.start}` };
    }

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="hf__out">
        <section class="headline-card"><span class="label">Status today</span>${d.status.map((s) => `<p><strong>${esc(s.label)}.</strong> ${esc(s.finding)}</p>`).join("")}</section>
        <section><h3 class="section-title">Titration plan (each step checked by the app)</h3><div id="steps"></div></section>
        <div class="handover">
          <section><h3 class="section-title">Congestion plan</h3><ul class="facts">${d.congestion.map((c) => `<li><span class="dot dot--warn"></span><span>${esc(c)}</span><span></span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Other evidence-based actions</h3><ul class="facts">${d.other.map((c) => `<li><span class="dot"></span><span>${esc(c)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Monitoring</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>When</th><th>Check</th><th>Action threshold</th></tr></thead><tbody>${d.monitoring.map((m) => `<tr><td>${esc(m.when)}</td><td>${esc(m.check)}</td><td>${esc(m.threshold)}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="brief"><span class="label">Advice for Mr Rajan</span><textarea id="advice" rows="6" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.advice)}</textarea><button class="rbtn" id="send">Send to patient</button></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file plan</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      g.querySelector("#send").onclick = (e) => { audit.add("Advice sent to the patient", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        ctx.file([
          `## App checks`, ...gaps.map((x) => `- ${x.pillar}: ${x.current} (${x.gap})`), `- Weight +${wa.overDry} kg over dry weight`, `- Iron deficient: FCM ${fcm} mg`, `- CRT: ${crt.text}`,
          `## Titration steps`, ...d.steps.map((s, i) => { const c = stepCheck(s); return `- [${done.has(i) ? "x" : " "}] ${s.when}: ${s.action}${s.check !== "none" ? ` (${c.ok ? "allowed" : `blocked: ${c.why}`})` : ""}`; }),
          `## Congestion plan`, ...d.congestion.map((c) => `- ${c}`),
          `## Advice`, g.querySelector("#advice").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Rajan's record";
      };
      steps();
    }

    function steps() {
      const list = view.querySelector("#steps");
      let when = "";
      list.innerHTML = `<ol class="hf__steps">${d.steps.map((s, i) => {
        const c = s.check === "none" ? null : stepCheck(s);
        const head = s.when !== when ? `<li class="hf__when">${esc((when = s.when))}</li>` : "";
        const blocked = c && !c.ok;
        return `${head}<li class="hf__step" data-blocked="${blocked}" data-done="${done.has(i)}"><span class="dot dot--${!c ? "" : c.ok ? "ok" : "danger"}"></span>
          <span>${esc(s.action)}${s.start ? ` <small class="muted">· ${esc(s.start)}</small>` : ""}${c ? `<br><small class="${c.ok ? "muted" : "hf__why"}">${esc(CHECK_LABEL[s.check])}: ${esc(c.why)}</small>` : ""}</span>
          <button class="rbtn ${done.has(i) ? "" : "rbtn--accept"}" data-s="${i}" ${blocked && !done.has(i) ? "disabled" : ""}>${done.has(i) ? "✓ Done" : blocked ? "Blocked" : "Mark done"}</button></li>`;
      }).join("")}</ol>`;
      list.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => {
        const i = Number(b.dataset.s);
        done.has(i) ? done.delete(i) : done.add(i);
        audit.add(`${done.has(i) ? "Done" : "Reopened"}: ${d.steps[i].action}`, done.has(i) ? "accept" : "info");
        steps();
      }));
    }
  },
};
