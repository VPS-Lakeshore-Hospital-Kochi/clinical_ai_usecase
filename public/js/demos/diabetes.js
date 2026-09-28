// Diabetes CGM clinician view: the app checks the consensus targets, the GMI–HbA1c gap and the
// hypoglycaemia regimen rule; Claude explains the daily patterns (highlighted on the glucose
// profile) and drafts the regimen change, which the endocrinologist accepts line by line.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { cgmCheck, gmiGap, hypoRegimenRule } from "../clinical.js";

const HBA1C = 9.1;
const PRIORITY = { "Act now": "danger", "This month": "warn", Routine: "ok" };

export default {
  notes: [
    "The app checks the six consensus CGM targets: none is met, and time below range comes first because lows are the immediate danger.",
    "The app's hypoglycaemia rule (sulfonylurea plus basal insulin, time below 70 over 4%) says stop glimepiride and cut glargine by 10–20%: 16 U to 13–14 U.",
    "Click a pattern to see its hours on the glucose profile. Every pattern is tied to the hours it came from.",
    "Try editing glargine to 16 U or rejecting the glimepiride stop: the app warns that the overnight-lows rule is no longer met.",
    "The GMI–HbA1c gap points to the iron-deficiency anaemia, which Claude escalates for GI work-up before any knee surgery.",
  ],
  guide: [
    "Look at the app's target check and the glucose profile.",
    "Ask Claude to explain the patterns and draft the regimen change.",
    "Click each pattern to see it on the profile.",
    "Accept, edit or reject each medicine change; the new regimen builds as you go.",
    "Act on the other findings, send the coaching plan and file.",
  ],
  mount(root, ctx) {
    const cgm = ctx.patient.cgm;
    const check = cgmCheck(cgm);
    const gap = gmiGap(cgm.gmi, HBA1C);
    const below70 = check.rows[1].value, below54 = check.rows[2].value;
    const rule = hypoRegimenRule({ below70, below54, onSulfonylurea: true, basalUnits: 16 });
    let d = null, sel = null, review = null;

    root.innerHTML = "";
    const view = el(`<div class="dm">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Consensus targets (app)</span><span class="tile__v">${check.met} / 6</span><span class="tile__u">met over 14 days</span></div>
        <div class="tile"><span class="label">Below 70 (app)</span><span class="tile__v">${below70}%</span><span class="tile__u">target &lt;4%: treat lows first</span></div>
        <div class="tile"><span class="label">GMI vs HbA1c (app)</span><span class="tile__v">${gap.gap > 0 ? "+" : ""}${gap.gap}</span><span class="tile__u">GMI ${cgm.gmi}% · lab ${HBA1C}%${gap.discordant ? " · discordant" : ""}</span></div>
        <div class="tile"><span class="label">Hypo rule (app)</span><span class="tile__v">${rule.basalRange.join("–")} U</span><span class="tile__u">glargine from 16 U${rule.stopSulfonylurea ? "; stop glimepiride" : ""}</span></div>
      </section>
      <div class="dm__top">
        <section class="dm__agp"><h3 class="section-title">14-day glucose profile</h3><p class="hint">${esc(cgm.period)} · median with interquartile range · band = 70–180 mg/dL</p><div id="agp"></div><div id="pattern-note" class="hint"></div></section>
        <section><h3 class="section-title">Consensus targets (app)</h3>
          <ul class="facts">${check.rows.map((r) => `<li><span class="dot dot--${r.met ? "ok" : "danger"}"></span><span>${esc(r.label)}<br><small class="muted">target ${esc(r.target)}</small></span><strong>${r.value}%</strong></li>`).join("")}</ul>
        </section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to review the CGM</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));
    drawAgp();

    function drawAgp() {
      const W = 560, H = 230, m = { t: 10, r: 10, b: 24, l: 34 }, y0 = 40, y1 = 320;
      const x = (h) => m.l + (h / 23) * (W - m.l - m.r);
      const y = (v) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
      const p = cgm.profile;
      const path = (k) => p.map((q, i) => `${i ? "L" : "M"}${x(q.hour).toFixed(1)},${y(q[k]).toFixed(1)}`).join("");
      const band = path("p75") + [...p].reverse().map((q) => `L${x(q.hour).toFixed(1)},${y(q.p25).toFixed(1)}`).join("") + "Z";
      const hl = sel ? `<rect class="dm__hl" x="${(x(sel.fromHour) - 8).toFixed(1)}" y="${m.t}" width="${(x(sel.toHour) - x(sel.fromHour) + 16).toFixed(1)}" height="${H - m.t - m.b}"/>` : "";
      $("#agp").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Median glucose by hour, lowest 96 at 03:00, highest 262 at 14:00">
        <rect x="${m.l}" y="${y(180)}" width="${W - m.l - m.r}" height="${y(70) - y(180)}" fill="var(--navy-wash)"/>
        ${hl}
        ${[70, 180, 250].map((v) => `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--chart-grid)"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`).join("")}
        <path d="${band}" fill="var(--chart-3)" opacity="0.35"/>
        <path d="${path("median")}" fill="none" stroke="var(--chart-1)" stroke-width="2.2"/>
        ${[0, 3, 6, 9, 12, 15, 18, 21].map((h) => `<text x="${x(h)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="var(--ink-3)">${String(h).padStart(2, "0")}:00</text>`).join("")}
      </svg>`;
      $("#pattern-note").textContent = sel ? `${sel.title}: ${String(sel.fromHour).padStart(2, "0")}:00–${String(sel.toHour).padStart(2, "0")}:59 · ${sel.evidence}` : "";
    }

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        report: ctx.mod.defaultInput,
        profile: cgm.profile.map((q) => `${String(q.hour).padStart(2, "0")}:00 median ${q.median} (IQR ${q.p25}-${q.p75})`).join("\n"),
        appChecks: [
          ...check.rows.map((r) => `${r.label}: ${r.value}% (target ${r.target}) ${r.met ? "met" : "not met"}`),
          `GMI ${cgm.gmi}% vs lab HbA1c ${HBA1C}%: gap ${gap.gap}${gap.discordant ? " (discordant)" : ""}`,
          `Hypoglycaemia rule: ${rule.triggered ? `triggered; stop the sulfonylurea and reduce glargine 16 U to ${rule.basalRange.join("–")} U` : "not triggered"}`,
        ],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading 14 days of glucose data…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("CGM review drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="dm__out">
        <section><h3 class="section-title">Daily patterns</h3><div class="dm__patterns">${d.patterns.map((p, i) => `<button class="dm__pattern" data-p="${i}" aria-pressed="false"><strong>${esc(p.title)}</strong><small>${String(p.fromHour).padStart(2, "0")}:00–${String(p.toHour).padStart(2, "0")}:59</small><span>${esc(p.driver)}</span></button>`).join("")}</div></section>
        <div class="dm__rx">
          <section><div class="review-tools"><h3 class="section-title" style="margin:0">Suggested regimen changes</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="changes"></div></section>
          <section><h3 class="section-title">New regimen</h3><div id="regimen"></div></section>
        </div>
        <div class="handover">
          <section class="headline-card"><span class="label">Pre-operative glycaemic readiness</span><h3>${d.preop.ready ? "Ready for elective arthroplasty" : "Not ready for elective arthroplasty"}</h3><p>Target: ${esc(d.preop.target)}</p><p>${esc(d.preop.timeline)}</p></section>
          <section><h3 class="section-title">HbA1c and GMI</h3><p>${esc(d.hba1cNote)}</p></section>
        </div>
        <section><h3 class="section-title">Other findings</h3><div class="dm__flags">${d.otherFindings.map((f, i) => `<div class="flag-card" data-pri="${esc(f.priority)}"><span class="dot dot--${PRIORITY[f.priority]}"></span> <strong>${esc(f.priority)}</strong><p>${esc(f.finding)}</p><p class="muted">${esc(f.action)}</p><button class="rbtn" data-f="${i}">Order this</button></div>`).join("")}</div></section>
        <section class="brief"><span class="label">Coaching plan for Mr Thomas</span><textarea id="coach" rows="8" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.coaching.map((c) => `• ${c}`).join("\n"))}</textarea><button class="rbtn" id="send">Send to patient</button></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file review</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);

      g.querySelectorAll("[data-p]").forEach((b) => b.addEventListener("click", () => {
        const p = d.patterns[Number(b.dataset.p)];
        sel = sel === p ? null : p;
        g.querySelectorAll("[data-p]").forEach((x) => x.setAttribute("aria-pressed", String(sel === d.patterns[Number(x.dataset.p)])));
        drawAgp();
      }));
      g.querySelector("[data-p]").click();

      review = reviewList(g.querySelector("#changes"), d.changes.map((c, i) => ({
        key: String(i), label: `${c.kind} · ${c.drug}`, text: c.suggested,
        meta: `Current: ${esc(c.current)} · ${esc(c.rationale)}`,
      })), { audit, noun: "regimen change", onChange: regimen });
      g.querySelector("#accept-all").onclick = () => review.acceptAll();
      regimen();

      g.querySelectorAll("[data-f]").forEach((b) => b.addEventListener("click", () => {
        const f = d.otherFindings[Number(b.dataset.f)];
        audit.add(`Ordered: ${f.action}`, "accept");
        b.disabled = true;
        b.textContent = "✓ Ordered";
      }));
      g.querySelector("#send").onclick = (e) => { audit.add("Coaching plan sent to the patient", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        ctx.file([
          `## CGM targets (app)`, ...check.rows.map((r) => `- ${r.met ? "✅" : "❌"} ${r.label}: ${r.value}% (target ${r.target})`),
          `## Patterns`, ...d.patterns.map((p) => `- ${p.title} (${p.fromHour}:00–${p.toHour}:59): ${p.driver}`),
          `## Regimen`, ...currentRegimen().map((r) => `- ${r.drug}: ${r.now}`),
          ...guardWarnings().map((w) => `> ⚠️ ${w}`),
          `## Pre-operative readiness`, `${d.preop.ready ? "Ready" : "Not ready"}. ${d.preop.target}. ${d.preop.timeline}`,
          `## Other findings`, ...d.otherFindings.map((f) => `- ${f.priority}: ${f.finding}. ${f.action}`),
          `## Coaching plan`, g.querySelector("#coach").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }

    function currentRegimen() {
      return review.states().map((s, i) => {
        const c = d.changes[i];
        const decided = s.status === "accepted" || s.status === "edited";
        const now = !decided ? (c.current === "—" ? "not started" : c.current) : c.kind === "Stop" ? "stopped" : s.text;
        return { drug: c.drug, now, status: s.status, changed: decided && c.kind !== "Continue" };
      });
    }

    // The app re-checks the accepted regimen against the hypoglycaemia rule.
    function guardWarnings() {
      if (!rule.triggered) return [];
      const regs = currentRegimen();
      const out = [];
      const su = regs.find((r) => /glimepiride/i.test(r.drug));
      if (su && su.now !== "stopped" && su.status !== "pending") out.push("Overnight-lows rule not met: glimepiride is still prescribed.");
      const basal = regs.find((r) => /glargine/i.test(r.drug));
      const units = basal && basal.status !== "pending" ? Number((basal.now.match(/(\d+)\s*U/) || [])[1]) : NaN;
      if (units > rule.basalRange[1]) out.push(`Overnight-lows rule not met: glargine ${units} U is above ${rule.basalRange[1]} U.`);
      return out;
    }

    function regimen() {
      const regs = currentRegimen();
      const warns = guardWarnings();
      view.querySelector("#regimen").innerHTML = `<ul class="facts">${regs.map((r) => `<li><span class="dot dot--${r.status === "pending" ? "warn" : r.changed ? "ok" : ""}"></span><span><strong>${esc(r.drug)}</strong><br><small class="${r.now === "stopped" ? "dm__stopped" : "muted"}">${esc(r.now)}</small></span><small class="muted">${r.status === "pending" ? "to decide" : r.status}</small></li>`).join("")}</ul>
        ${warns.map((w) => `<p class="dm__guard"><span class="dot dot--danger"></span> ${esc(w)}</p>`).join("")}
        <p class="hint">${review.pending() ? `${review.pending()} change${review.pending() === 1 ? "" : "s"} to decide` : "All changes decided"}</p>`;
    }

    return () => { sel = null; };
  },
};
