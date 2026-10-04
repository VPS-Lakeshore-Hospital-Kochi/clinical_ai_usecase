// Pre-op readiness clinician view: the app checks medicine hold times and computes the go/no-go
// gate from open items; Claude compares against earlier plans; the team completes actions and
// then runs the WHO Surgical Safety Checklist phase by phase.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { holdCheck, basalNightBefore } from "../clinical.js";

const SURGERY = "19 Aug 08:00";
const PHASES = [["signIn", "Sign In", "Before induction"], ["timeOut", "Time Out", "Before incision"], ["signOut", "Sign Out", "Before leaving theatre"]];
const DOT = { ok: "ok", warn: "warn", fail: "danger" };

export default {
  notes: [
    "Claude compares the admission against plans made by other teams: the surgical plan mentions a possible ileostomy, but the consent does not cover it and no stoma site was marked.",
    "The app checks the medicine holds (empagliflozin 120 h, telmisartan 25 h) and works out tonight's insulin dose (80% of 12 = 10 units).",
    "The gate is calculated from open items. Tick actions as they are done and the blocking count falls; the WHO checklist stays locked until nothing blocks.",
    "Items that can only be confirmed in theatre are marked, so the pre-filled checklist never replaces the live check.",
  ],
  guide: [
    "Review the medicine holds the app has checked.",
    "Ask Claude for the readiness gate across all earlier plans.",
    "Tick off actions as they are completed; the gate updates.",
    "When nothing blocks, run the WHO checklist: Sign In, Time Out, Sign Out.",
  ],
  mount(root, ctx) {
    const holds = [
      { name: "Empagliflozin", last: "14 Aug 08:00", ...holdCheck("sglt2", "14 Aug 08:00", SURGERY) },
      { name: "Telmisartan", last: "18 Aug 07:00", ...holdCheck("arb", "18 Aug 07:00", SURGERY) },
    ];
    const glargine = basalNightBefore(12);
    let d = null;
    const done = new Set();
    const who = { signIn: new Set(), timeOut: new Set(), signOut: new Set() };
    const whoTime = {};
    let clock = 18 * 60 + 15;
    const hhmm = () => `${String(Math.floor(clock / 60) % 24).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`;

    root.innerHTML = "";
    const view = el(`<div class="po">
      <section class="tiles">
        ${holds.map((h) => `<div class="tile"><span class="label">${esc(h.name)} (app)</span><span class="tile__v">${h.hours} h</span><span class="tile__u">${h.ok ? "✓" : "✕"} ${esc(h.rule.split(":")[0])}: ${esc(h.rule.split(":")[1].trim())}</span></div>`).join("")}
        <div class="tile"><span class="label">Metformin (app)</span><span class="tile__v">Hold</span><span class="tile__u">Last dose tonight; omit on the day of surgery</span></div>
        <div class="tile"><span class="label">Glargine tonight (app)</span><span class="tile__v">${glargine} U</span><span class="tile__u">80% of the usual 12 U</span></div>
      </section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Run the readiness gate with Claude</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="gate"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => hhmm() });
    const tick = (text, kind = "accept") => { audit.add(text, kind); clock += 7; };

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = { admission: ctx.mod.defaultInput, holds: [...holds.map((h) => `${h.name}: last dose ${h.last}, ${h.hours} h before surgery (${h.ok ? "meets" : "does not meet"} ${h.rule})`), `Glargine tonight: ${glargine} U (80% of 12 U)`] };
      const result = await withClaude($("#gate"), (o) => ctx.ask(payload, o), { label: "Claude is checking readiness against every earlier plan…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Readiness gate run", "info");
      render();
    };

    const itemStatus = (c) => (d.actions.some((a, i) => done.has(i) && a.resolves === c.item) ? "ok" : c.status);
    const blocking = () => d.checklist.filter((c) => itemStatus(c) === "fail").length;
    const watching = () => d.checklist.filter((c) => itemStatus(c) === "warn").length;

    function render() {
      const box = $("#gate");
      const b = blocking(), w = watching();
      const verdict = b ? "Go once actions are complete" : "Go";
      box.innerHTML = "";
      const g = el(`<div class="po__gate">
        <section class="headline-card po__verdict" data-block="${b}"><span class="label">Readiness verdict (app, from open items)</span><h3>${verdict}</h3><p>${b ? `${b} blocking item${b === 1 ? "" : "s"}` : "No blocking items"} · ${w} to watch</p></section>
        <div class="handover">
          <section><h3 class="section-title">Readiness checklist</h3><ul class="facts">${d.checklist.map((c) => { const st = itemStatus(c); return `<li><span class="dot dot--${DOT[st]}"></span><span><small class="muted">${esc(c.domain)}</small><br><strong>${esc(c.item)}</strong>${st !== c.status ? ' <span class="type-tag">resolved</span>' : ""}<br><small class="muted">${esc(c.evidence)}</small></span><span></span></li>`; }).join("")}</ul></section>
          <section><h3 class="section-title">Actions before theatre</h3><ul class="tasks">${d.actions.map((a, i) => `<li class="${done.has(i) ? "is-done" : ""}"><input type="checkbox" data-a="${i}" ${done.has(i) ? "checked" : ""} aria-label="Done"><span class="time">${esc(a.deadline)}</span><span>${esc(a.action)}<br><small class="muted">${esc(a.owner)} · resolves: ${esc(a.resolves)}</small></span></li>`).join("")}</ul></section>
        </div>
        <section class="who"><div class="review-tools"><h3 class="section-title" style="margin:0">WHO Surgical Safety Checklist</h3><span class="hint">${b ? "Locked until no item blocks" : "Pre-filled from the chart; confirm live in theatre"}</span></div>
          <div class="who__phases">${PHASES.map(([k, label, when], pi) => {
            const items = d.who[k];
            const complete = items.every((_, i) => who[k].has(i));
            const locked = b > 0 || (pi > 0 && !d.who[PHASES[pi - 1][0]].every((_, i) => who[PHASES[pi - 1][0]].has(i)));
            return `<div class="who__phase" data-locked="${locked}" data-complete="${complete}"><div class="who__head"><strong>${label}</strong><small>${when}${whoTime[k] ? ` · done ${whoTime[k]}` : ""}</small></div>
              <ul>${items.map((it, i) => `<li><label class="check" style="margin:0"><input type="checkbox" data-w="${k}:${i}" ${who[k].has(i) ? "checked" : ""} ${locked ? "disabled" : ""}> <span>${esc(it.item)}${it.prefill ? `<br><small class="muted">${esc(it.prefill)}</small>` : ""}${it.confirmInOT ? ' <span class="type-tag">confirm in OT</span>' : ""}</span></label></li>`).join("")}</ul></div>`;
          }).join("")}</div></section>
        <section class="brief"><span class="label">Night-before instructions for the patient</span><textarea id="night" rows="5" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.nightBefore)}</textarea><button class="rbtn" id="send-night">Send to patient</button></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file readiness record</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      g.querySelectorAll("[data-a]").forEach((c) => c.addEventListener("change", () => {
        const i = Number(c.dataset.a);
        c.checked ? done.add(i) : done.delete(i);
        tick(`${c.checked ? "Completed" : "Reopened"}: ${d.actions[i].action} (${d.actions[i].owner})`, c.checked ? "accept" : "info");
        render();
      }));
      g.querySelectorAll("[data-w]").forEach((c) => c.addEventListener("change", () => {
        const [k, i] = c.dataset.w.split(":");
        c.checked ? who[k].add(Number(i)) : who[k].delete(Number(i));
        if (d.who[k].every((_, j) => who[k].has(j)) && !whoTime[k]) {
          clock = Math.max(clock, { signIn: 31 * 60 + 40, timeOut: 31 * 60 + 58, signOut: 35 * 60 + 40 }[k]);
          whoTime[k] = hhmm();
          tick(`WHO ${PHASES.find((p) => p[0] === k)[1]} complete`);
        }
        render();
      }));
      g.querySelector("#send-night").onclick = (e) => { tick("Night-before instructions sent to the patient", "info"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        ctx.file([
          `## Readiness verdict`, `**${verdict}** (${b} blocking, ${w} to watch)`,
          `## Medicine holds (app)`, ...holds.map((h) => `- ${h.name}: ${h.hours} h before surgery, ${h.ok ? "meets" : "does not meet"} the rule`), `- Glargine tonight ${glargine} U`,
          `## Checklist`, ...d.checklist.map((c) => `- ${{ ok: "✅", warn: "⚠️", fail: "❌" }[itemStatus(c)]} ${c.domain}: ${c.item}. ${c.evidence}`),
          `## Actions`, ...d.actions.map((a, i) => `- [${done.has(i) ? "x" : " "}] ${a.action} (${a.owner}, ${a.deadline})`),
          `## WHO checklist`, ...PHASES.map(([k, label]) => `- ${label}: ${whoTime[k] ? `complete ${whoTime[k]}` : `${who[k].size}/${d.who[k].length}`}`),
          `## Night-before instructions`, g.querySelector("#night").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }
  },
};
