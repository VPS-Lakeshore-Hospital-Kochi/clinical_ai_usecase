// Radiology clinician view: Claude's report-quality issues highlighted in the dictation itself,
// a corrected structured report to edit and sign, and incidental findings routed to teams.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { adrenalRule, locateQuotes } from "../clinical.js";

const SEV = { "Changes staging": "danger", "Correct before sign-off": "warn", "Add for completeness": "" };
const TEAMS = ["Endocrinology", "Cardiology", "Hepatology", "Anaesthesia", "Oncology MDT", "No action"];

export default {
  notes: [
    "The dictation says three suspicious nodes, but the impression says no lymphadenopathy. Left alone, the tumour would be understaged at the MDT.",
    "The kidney cyst is on the left in the findings and on the right in the impression: a laterality error caught before sign-off.",
    "Click an issue to see exactly where it is in the dictation. Claude never adds findings that were not dictated; missing items are flagged for the radiologist.",
    "Incidental findings are routed to the team that should act, with the guideline behind each recommendation.",
  ],
  guide: [
    "Ask Claude to check the staging CT dictation.",
    "Each issue is highlighted in the dictation. Click one to find it; accept or reject the correction.",
    "Edit the structured report and impression, and route each incidental finding.",
    "Sign the report to file it for the tumour board.",
  ],
  mount(root, ctx) {
    const dictation = ctx.mod.defaultInput;
    root.innerHTML = "";
    const view = el(`<div class="rad">
      <div class="rad__top">
        <section class="card-v rad__doc">
          <div class="rad__doc-head"><span class="kicker">Dictation · CECT thorax, abdomen, pelvis · 1 Aug 2026</span><span class="chip chip--muted" id="src">Not checked</span></div>
          <div class="rad__text" id="text">${esc(dictation).replace(/\n/g, "<br>")}</div>
          <div class="actions-row" style="padding:0 20px 18px"><button class="btn btn--primary" id="check">Check dictation with Claude</button></div>
        </section>
        <section class="rad__issues"><h3 class="section-title">Report quality check</h3><div id="issues"><div class="empty-note">Issues appear here, linked to the dictation.</div></div></section>
      </div>
      <div id="report"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => "10:" + String(12 + audit.entries.length).padStart(2, "0") });

    $("#check").onclick = async () => {
      $("#check").disabled = true;
      const result = await withClaude($("#issues"), (o) => ctx.ask({ dictation }, o), { label: "Claude is checking the dictation…" });
      $("#src").textContent = sourceNote(result);
      audit.add("Dictation checked");
      render(result.data);
    };

    const activate = (i) => {
      view.querySelectorAll("mark[data-i]").forEach((m) => m.classList.toggle("is-active", m.dataset.i === String(i)));
      const first = view.querySelector(`mark[data-i="${i}"]`);
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    function render(d) {
      // Highlight each issue's verbatim quotes in the dictation.
      const ranges = locateQuotes(dictation, d.issues.map((x) => x.quotes));
      let html = "", pos = 0;
      for (const [s, e, i] of ranges) {
        html += esc(dictation.slice(pos, s)) + `<mark data-i="${i}" data-sev="${SEV[d.issues[i].severity] || "info"}" title="${esc(d.issues[i].title)}">${esc(dictation.slice(s, e))}<sup>${i + 1}</sup></mark>`;
        pos = e;
      }
      $("#text").innerHTML = (html + esc(dictation.slice(pos))).replace(/\n/g, "<br>");
      $("#text").addEventListener("click", (e) => { const m = e.target.closest("mark"); if (m) activate(m.dataset.i); });

      const issues = reviewList($("#issues"), d.issues.map((x, i) => ({
        key: `i${i}`, label: `${i + 1} · ${x.severity}`, text: x.correction,
        html: `<strong style="font-weight:500;color:var(--navy)">${esc(x.title)}</strong><br>${esc(x.correction)}`,
      })), { audit, noun: "correction", editable: false });
      $("#issues").addEventListener("click", (e) => {
        const card = e.target.closest(".review-card");
        if (card && !e.target.closest("button")) activate([...$("#issues").querySelectorAll(".review-card")].indexOf(card));
      });

      const box = $("#report");
      box.innerHTML = "";
      const r = el(`<div class="rad__report">
        <p class="critical"><span class="label">Critical &amp; time-sensitive</span> ${esc(d.critical)}</p>
        <section><h3 class="section-title">Structured report</h3><div class="soap">
          ${[["indication", "Clinical indication"], ["technique", "Technique"], ["primaryTumour", "Primary tumour"], ["nodes", "Lymph nodes"], ["distant", "Distant disease"], ["other", "Other findings"]]
            .map(([k, l]) => `<label class="note-field"><span class="label">${l}</span><textarea data-k="${k}" style="min-height:${k === "indication" || k === "technique" ? 80 : 130}px">${esc(d.report[k])}</textarea></label>`).join("")}
        </div></section>
        <section><h3 class="section-title">Impression</h3><label class="note-field"><textarea id="impression" style="min-height:150px">${esc(d.impression.map((x, i) => `${i + 1}. ${x}`).join("\n"))}</textarea></label></section>
        <section><h3 class="section-title">Incidental findings &amp; routing</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Finding</th><th>Classification</th><th>Recommendation</th><th>Route to</th></tr></thead><tbody>
          ${d.incidentals.map((x, i) => {
            const rule = /adrenal/i.test(x.finding) ? adrenalRule(Number(x.finding.match(/(\d+)\s*HU/)?.[1] ?? 99)) : null;
            return `<tr><td><strong style="font-weight:500">${esc(x.finding)}</strong></td><td>${esc(x.classification)}${rule ? `<br><small class="muted">App rule: ${esc(rule.label)}. ${esc(rule.followUp)}</small>` : ""}</td><td>${esc(x.recommendation)}<br><small class="muted">${esc(x.guideline)}</small></td>
              <td><select data-route="${i}" class="route">${[...new Set([x.routeTo, ...TEAMS])].map((t) => `<option${t === x.routeTo ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
              ${x.routeTo === "No action" ? "" : `<button class="rbtn" data-send="${i}" style="margin-top:6px">Send referral</button>`}</td></tr>`;
          }).join("")}</tbody></table></div></section>
        <section><h3 class="section-title">Summary for the patient</h3><label class="note-field"><textarea id="summary" style="min-height:110px">${esc(d.patientSummary)}</textarea></label></section>
        <div class="actions-row"><button class="btn btn--approve" id="sign">Sign report</button><span class="hint" id="pending"></span><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(r);
      const q = (s) => r.querySelector(s);
      r.querySelectorAll("textarea").forEach((t) => t.addEventListener("change", () => audit.add(`Edited ${t.dataset.k ?? t.id}`, "edit")));
      r.querySelectorAll("[data-route]").forEach((s) => s.addEventListener("change", () => audit.add(`Routed ${d.incidentals[s.dataset.route].finding} to ${s.value}`, "edit")));
      r.querySelectorAll("[data-send]").forEach((b) => b.addEventListener("click", () => {
        const i = b.dataset.send;
        audit.add(`Referral sent to ${r.querySelector(`[data-route="${i}"]`).value}: ${d.incidentals[i].finding}`, "accept");
        b.disabled = true;
        b.textContent = "✓ Sent";
      }));
      q("#sign").onclick = () => {
        const p = issues.pending();
        const rep = Object.fromEntries([...r.querySelectorAll("[data-k]")].map((t) => [t.dataset.k, t.value.trim()]));
        audit.add(`Report signed (${issues.accepted().length} corrections accepted${p ? `, ${p} not reviewed` : ""})`, "accept");
        ctx.file([
          `## Report quality check`, ...issues.states().map((x) => `- ${x.status === "accepted" ? "✓" : x.status === "rejected" ? "✕" : "·"} ${x.text}`),
          `## Critical & time-sensitive findings`, d.critical,
          `## Structured report`, `**Clinical indication:** ${rep.indication}`, `**Technique:** ${rep.technique}`, `- **Primary tumour:** ${rep.primaryTumour}\n- **Lymph nodes:** ${rep.nodes}\n- **Distant disease:** ${rep.distant}\n- **Other findings:** ${rep.other}`,
          `## Impression`, q("#impression").value.trim(),
          `## Incidental findings`, ...d.incidentals.map((x, i) => `- ${x.finding}: ${x.recommendation} → ${r.querySelector(`[data-route="${i}"]`).value}`),
          `## Summary for the patient`, q("#summary").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        q("#sign").disabled = true;
        q("#filed").textContent = "✓ Signed and filed";
      };
    }
  },
};
