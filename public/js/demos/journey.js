// Journey story clinician view: the app builds the journey map from the timeline (marking steps
// whose output was filed in this browser) and computes the milestone intervals; Claude writes the
// story and finds the open loops, which the care team accepts, reassigns or closes.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { getFiled, compileJourney, formatDate } from "../common.js";
import { journeyIntervals } from "../clinical.js";

const KIND_DOT = { "System gap": "danger", Clinical: "warn", Administrative: "" };
const fmt = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export default {
  notes: [
    "The app lays out every step of Thomas's journey from the record. Steps where an AI prototype was used are marked, and so are any outputs a clinician filed in this browser during the demo.",
    "The app computes the milestone intervals: 27 days from first message to diagnosis, 21 to surgery, 22 to chemotherapy. The DPYD result came back 47 days after it was requested, after cycle 1: that is the gap that mattered.",
    "Click any AI-assisted step on the map to see what it surfaced. Claude never claims credit: clinicians made every decision.",
    "Open loops are a working list, not prose. Accept, reassign or close each one; system gaps can be raised to the Quality committee in one click.",
  ],
  guide: [
    "Look at the journey map and the app's milestone intervals.",
    "Ask Claude for the journey review.",
    "Click AI-assisted steps to see what each surfaced.",
    "Work the open loops: accept, reassign, raise or close.",
    "File the review for the care team and leadership.",
  ],
  mount(root, ctx) {
    const timeline = ctx.patient.timeline;
    const filed = getFiled();
    const intervals = journeyIntervals(timeline);
    const aiSteps = timeline.filter((e) => e.module);
    const filedCount = aiSteps.filter((e) => filed[e.module]).length;
    const loops = new Map();
    let d = null, sel = null;

    root.innerHTML = "";
    const view = el(`<div class="jy">
      <section class="tiles">${intervals.map((r, i) => `<div class="tile ${i === 0 ? "tile--score" : ""}"><span class="label">${esc(r.label)} (app)</span><span class="tile__v">${r.days ?? "—"} days</span><span class="tile__u">${r.from ? `${fmt(r.from)} → ${fmt(r.to)}` : ""}${r.ok === false ? ` · <span class="jy__bad">${esc(r.note)}</span>` : r.ok ? ` · ${esc(r.note)}` : ""}</span></div>`).join("")}</section>
      <div class="jy__top">
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Journey map</h3><span class="hint">${aiSteps.length} AI-assisted steps · ${filedCount} filed in this browser</span></div>
          <ol class="jy__map" id="map">${timeline.map((e, i) => `<li data-ai="${Boolean(e.module)}" data-filed="${Boolean(e.module && filed[e.module])}">${e.module ? `<button class="jy__step" data-i="${i}" aria-pressed="false">` : `<div class="jy__step">`}
            <small class="muted">${esc(formatDate(e.date))} · ${esc(e.specialty)}</small><span>${esc(e.title)}</span>${e.module ? `<span class="jy__tags"><span class="type-tag">AI-assisted</span>${filed[e.module] ? '<span class="type-tag type-tag--new">filed</span>' : ""}</span>` : ""}
            ${e.module ? "</button>" : "</div>"}</li>`).join("")}</ol></section>
        <section class="jy__side"><h3 class="section-title">Selected step</h3><div id="detail"><p class="hint">Click an AI-assisted step on the map.</p></div></section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude for the journey review</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    function detail() {
      const e = sel == null ? null : timeline[sel];
      view.querySelectorAll("[data-i]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === sel)));
      if (!e) return;
      const moment = d?.aiMoments.find((m) => m.module === e.module);
      $("#detail").innerHTML = `<div class="jy__card"><small class="muted">${esc(formatDate(e.date))} · ${esc(e.specialty)}</small><h4>${esc(e.title)}</h4><p>${esc(e.detail)}</p>
        ${moment ? `<p class="jy__caught"><span class="label">What AI surfaced</span>${esc(moment.caught)}</p>` : `<p class="hint">${d ? "Not listed in the review." : "Ask Claude for the review to see what this step surfaced."}</p>`}
        ${filed[e.module] ? `<p class="hint">✓ Output filed ${new Date(filed[e.module].filedAt).toLocaleString("en-IN")}</p>` : ""}
        <a class="chip" href="module.html?id=${e.module}">Open this prototype →</a></div>`;
    }
    $("#map").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-i]");
      if (!b) return;
      sel = Number(b.dataset.i);
      detail();
    });

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        timeline: compileJourney(ctx.patient, filed),
        appChecks: [...intervals.map((r) => `${r.label}: ${r.days} days (${r.from} → ${r.to})${r.ok === false ? `; ${r.note}: not met` : r.ok ? `; ${r.note}` : ""}`), `${filedCount} of ${aiSteps.length} AI-assisted outputs filed by clinicians in this session`],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is reading the whole journey across specialties…" });
      d = result.data;
      d.openLoops.forEach((l, i) => loops.set(i, { owner: l.owner, status: "open" }));
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Journey review drafted", "info");
      if (sel == null) sel = timeline.findIndex((e) => e.module === "icu");
      detail();
      render();
    };

    const owners = () => [...new Set([...d.openLoops.map((l) => l.owner), "Quality committee"])];

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="jy__out">
        <section class="headline-card"><span class="label">The story so far</span><p class="jy__story">${esc(d.story)}</p></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Open loops and hand-off risks</h3><span class="hint" id="loop-count"></span></div><div id="loops"></div></section>
        <div class="handover">
          <section><h3 class="section-title">Next 90 days</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>When</th><th>What</th><th>Owner</th></tr></thead><tbody>${d.next90.map((n) => `<tr><td>${esc(n.when)}</td><td>${esc(n.what)}</td><td>${esc(n.owner)}</td></tr>`).join("")}</tbody></table></div></section>
          <section><h3 class="section-title">Care-team snapshot</h3><ul class="facts">${d.team.map((t) => `<li><span class="dot"></span><span><strong>${esc(t.specialty)}</strong><br><small class="muted">${esc(t.role)}</small></span><span></span></li>`).join("")}</ul></section>
        </div>
        <p class="hint">All decisions were made and signed by the treating clinicians and staff.</p>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file review</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      g.querySelector("#file").onclick = () => {
        ctx.file([
          `## Milestone intervals (app)`, ...intervals.map((r) => `- ${r.label}: ${r.days} days${r.ok === false ? ` (${r.note}: not met)` : ""}`),
          `## The story so far`, d.story,
          `## Where AI assistance changed the course`, ...d.aiMoments.map((m) => `- **${m.date} · ${m.specialty}:** ${m.caught}`),
          `## Open loops`, ...d.openLoops.map((l, i) => { const s = loops.get(i); return `- [${s.status === "closed" ? "x" : " "}] ${l.item} (${s.owner}; ${s.status}) — ${l.kind}`; }),
          `## Next 90 days`, ...d.next90.map((n) => `- ${n.when}: ${n.what} (${n.owner})`),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      renderLoops();
    }

    function renderLoops() {
      const box = view.querySelector("#loops");
      const kinds = ["System gap", "Clinical", "Administrative"];
      box.innerHTML = kinds.map((k) => {
        const rows = d.openLoops.map((l, i) => ({ l, i, s: loops.get(i) })).filter((x) => x.l.kind === k);
        if (!rows.length) return "";
        return `<div class="jy__group"><span class="label"><span class="dot dot--${KIND_DOT[k]}"></span> ${k}</span><ul class="jy__loops">${rows.map(({ l, i, s }) => `<li data-status="${s.status}">
          <span>${esc(l.item)}</span>
          <select data-owner="${i}" aria-label="Owner" ${s.status === "closed" ? "disabled" : ""}>${owners().map((o) => `<option ${o === s.owner ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
          <span class="jy__acts">${s.status === "open" ? `<button class="rbtn rbtn--accept" data-act="accept" data-l="${i}">Accept</button>` : ""}${k === "System gap" && s.owner !== "Quality committee" && s.status !== "closed" ? `<button class="rbtn" data-act="raise" data-l="${i}">Raise to Quality</button>` : ""}${s.status !== "closed" ? `<button class="rbtn" data-act="close" data-l="${i}">Close</button>` : `<button class="rbtn" data-act="reopen" data-l="${i}">Reopen</button>`}</span>
          <small class="muted jy__status">${s.status}</small></li>`).join("")}</ul></div>`;
      }).join("");
      const counts = [...loops.values()].reduce((c, s) => ((c[s.status] = (c[s.status] || 0) + 1), c), {});
      view.querySelector("#loop-count").textContent = `${counts.open || 0} open · ${counts.accepted || 0} accepted · ${counts.closed || 0} closed`;
      box.querySelectorAll("[data-owner]").forEach((s) => s.addEventListener("change", () => {
        const i = Number(s.dataset.owner);
        loops.get(i).owner = s.value;
        audit.add(`Reassigned "${d.openLoops[i].item}" to ${s.value}`, "edit");
        renderLoops();
      }));
      box.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
        const i = Number(b.dataset.l), s = loops.get(i), item = d.openLoops[i].item;
        if (b.dataset.act === "accept") { s.status = "accepted"; audit.add(`Accepted by ${s.owner}: ${item}`, "accept"); }
        if (b.dataset.act === "raise") { s.owner = "Quality committee"; s.status = "accepted"; audit.add(`Raised to the Quality committee: ${item}`, "info"); }
        if (b.dataset.act === "close") { s.status = "closed"; audit.add(`Closed: ${item}`, "accept"); }
        if (b.dataset.act === "reopen") { s.status = "open"; audit.add(`Reopened: ${item}`, "info"); }
        renderLoops();
      }));
    }
  },
};
