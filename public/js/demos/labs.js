// Lab & report explainer clinician view: the app flags results and trends, then scores the
// patient copy live as the doctor edits it (reading grade, sentence length, jargon with plain
// alternatives, survival figures). "Give to patient" stays locked until the copy passes and the
// doctor confirms the results were discussed.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { labTrend, readability, jargonCheck, survivalCheck, JARGON } from "../clinical.js";

const TARGET_GRADE = 8;
const LABS = [
  { name: "CEA", today: 2.1, prev: 6.8, unit: "ng/mL", ref: { high: 5 }, refText: "<5.0", history: "6.8 (29 Jul, pre-op)" },
  { name: "Haemoglobin", today: 11.2, prev: 10.9, unit: "g/dL", ref: { low: 13, high: 17 }, refText: "13.0–17.0", history: "10.9 (24 Aug) · 9.8 (4 Aug) · 10.2 (6 Jul)" },
  { name: "Creatinine", today: 1.0, prev: 1.0, unit: "mg/dL", ref: { low: 0.7, high: 1.3 }, refText: "0.7–1.3", history: "1.0 (24 Aug) · 1.23 (6 Jul)" },
  { name: "HbA1c", today: 8.3, prev: 9.1, unit: "%", ref: { high: 7 }, refText: "target <7", history: "9.1 (6 Jul)" },
];
const ARROW = { up: "↑", down: "↓", stable: "→", new: "•", confirmed: "✓" };

export default {
  notes: [
    "The app flags every result against its reference range and works out the trend: CEA back to normal, haemoglobin still low but rising.",
    "Claude writes two versions: a clinician summary and a take-home copy for Mr Thomas, which only covers what the surgeon has already discussed.",
    "The app scores the take-home copy live: reading grade (target 8 or below), sentence length, jargon and any survival figures.",
    "Try it: type 'The adenocarcinoma was R0.' into the copy. The app flags both words and offers plain alternatives with one click. Type '5-year survival is 70%' and 'Give to patient' locks.",
  ],
  guide: [
    "Check the results the app has flagged.",
    "Confirm the surgeon has discussed the results, then ask Claude for the explanation.",
    "Edit the take-home copy; the app scores it as you type.",
    "Replace any jargon it flags.",
    "Give the copy to the patient and file the clinician summary.",
  ],
  mount(root, ctx) {
    let d = null, given = false, discussed = true;
    const trends = LABS.map((l) => ({ ...l, ...labTrend(l.today, l.prev, l.ref) }));

    root.innerHTML = "";
    const view = el(`<div class="lb">
      <section><h3 class="section-title">Today's results (app flags)</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Test</th><th class="num">Today</th><th>Reference</th><th>Trend</th><th>Previous</th></tr></thead><tbody>
        ${trends.map((t) => `<tr><td>${esc(t.name)}</td><td class="num"><strong class="lb__v" data-flag="${t.flag}">${t.today} ${esc(t.unit)}${t.flag ? ` ${t.flag}` : ""}</strong></td><td>${esc(t.refText)}</td><td>${ARROW[t.direction]} ${t.direction}${t.delta ? ` (${t.delta > 0 ? "+" : ""}${t.delta})` : ""}</td><td class="muted">${esc(t.history)}</td></tr>`).join("")}
        <tr><td>Pathology</td><td class="num"><strong class="lb__v">pT3 pN1b M0</strong></td><td>—</td><td>stage IIIB</td><td class="muted">2/18 nodes · R0 · pMMR</td></tr>
      </tbody></table></div></section>
      <section class="lb__gate"><label class="check"><input type="checkbox" id="discussed" checked> The surgeon has discussed the pathology with Mr Thomas and his wife (31 Aug): clear margins, 2 nodes, stage III, chemotherapy recommended</label></section>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude to explain the results</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));

    $("#discussed").onchange = (e) => { discussed = e.target.checked; audit.add(discussed ? "Confirmed the results were discussed" : "Discussion not confirmed", discussed ? "accept" : "reject"); if (d) score(); };

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const payload = {
        visit: ctx.mod.defaultInput,
        pathology: ctx.patient.documents.pathologyResection,
        appChecks: trends.map((t) => `${t.name} ${t.today} ${t.unit} (ref ${t.refText})${t.flag ? ` flag ${t.flag}` : ""}; ${t.direction} from ${t.prev}`),
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is writing a clinician summary and a take-home explanation…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Explanation drafted", "info");
      render();
    };

    const copyText = () => view.querySelector("#copy").value;

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="lb__out">
        <div class="handover">
          <section><h3 class="section-title">Clinician summary</h3><ul class="facts">${d.clinician.map((c) => `<li><span class="dot dot--${c.trend === "confirmed" ? "warn" : "ok"}"></span><span><strong>${esc(c.result)}</strong> ${esc(c.today)} <small class="muted">${ARROW[c.trend]} from ${esc(c.previous)}</small><br><small>${esc(c.significance)}</small></span><span></span></li>`).join("")}</ul></section>
          <section><h3 class="section-title">Needs action</h3><ul class="tasks">${d.actions.map((a, i) => `<li><input type="checkbox" data-a="${i}" aria-label="Done"><span class="time">${esc(a.who)}</span><span>${esc(a.action)}</span></li>`).join("")}</ul></section>
        </div>
        <div class="lb__editor">
          <section class="brief"><span class="label">Take-home copy for Mr Thomas (edit freely)</span><textarea id="copy" rows="22" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical;margin-top:6px">${esc(d.patientCopy.map((s) => `${s.heading}\n${s.text}`).join("\n\n"))}</textarea></section>
          <section class="lb__score"><h3 class="section-title">Patient-copy check (app, live)</h3><div id="score"></div></section>
        </div>
        <div class="handover">
          <section><h3 class="section-title">Words you may hear</h3><dl class="lb__gloss">${d.glossary.map((w) => `<dt>${esc(w.term)}</dt><dd>${esc(w.meaning)}</dd>`).join("")}</dl></section>
          <section><h3 class="section-title">Questions you may want to ask</h3><ol class="lb__q">${d.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol></section>
        </div>
        <div class="actions-row"><button class="btn btn--primary" id="give">Give to patient</button><button class="btn btn--approve" id="file">Approve &amp; file</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      let t = null;
      g.querySelector("#copy").addEventListener("input", () => { clearTimeout(t); t = setTimeout(score, 150); });
      g.querySelector("#copy").addEventListener("change", () => audit.add("Edited the take-home copy", "edit"));
      g.querySelectorAll("[data-a]").forEach((c) => c.addEventListener("change", () => { const a = d.actions[Number(c.dataset.a)]; c.closest("li").classList.toggle("is-done", c.checked); if (c.checked) audit.add(`Done: ${a.action} (${a.who})`, "accept"); }));
      g.querySelector("#score").addEventListener("click", (e) => {
        const b = e.target.closest("[data-replace]");
        if (!b) return;
        const term = b.dataset.replace, ta = g.querySelector("#copy");
        ta.value = ta.value.replace(new RegExp(`\\b${term}\\b`, "gi"), JARGON[term]);
        audit.add(`Replaced "${term}" with "${JARGON[term]}"`, "edit");
        score();
      });
      g.querySelector("#give").onclick = (e) => { given = true; audit.add(`Take-home copy given to the patient (grade ${readability(copyText()).grade})`, "accept"); e.target.disabled = true; e.target.textContent = "✓ Given"; };
      g.querySelector("#file").onclick = () => {
        const r = readability(copyText());
        ctx.file([
          `## Results (app)`, ...trends.map((x) => `- ${x.name} ${x.today} ${x.unit}${x.flag ? ` (${x.flag})` : ""}, ${x.direction} from ${x.prev}`),
          `## Clinician summary`, ...d.clinician.map((c) => `- ${c.result}: ${c.today}. ${c.significance}`),
          `## Actions`, ...d.actions.map((a) => `- ${a.action} (${a.who})`),
          `## Take-home copy${given ? " (given to the patient)" : " (not yet given)"}`, `Reading grade ${r.grade}; ${r.sentences} sentences, average ${r.avgSentence} words.`, copyText().trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      score();
    }

    function score() {
      const text = copyText();
      const r = readability(text), jargon = jargonCheck(text), surv = survivalCheck(text);
      const checks = [
        [r.grade <= TARGET_GRADE, `Reading grade ${r.grade}`, `target ${TARGET_GRADE} or below`],
        [r.longSentences === 0, `${r.longSentences} long sentence${r.longSentences === 1 ? "" : "s"}`, `average ${r.avgSentence} words; over 20 is long`],
        [jargon.length === 0, `${jargon.length} jargon term${jargon.length === 1 ? "" : "s"}`, jargon.length ? "replace with plain words" : "none found"],
        [surv.length === 0, surv.length ? "Survival figures found" : "No survival figures", surv.length ? surv.join(", ") : "the doctor has not discussed any"],
        [discussed, discussed ? "Results discussed" : "Discussion not confirmed", "the copy only follows the doctor's conversation"],
      ];
      view.querySelector("#score").innerHTML = `<ul class="facts">${checks.map(([ok, label, sub]) => `<li><span class="dot dot--${ok ? "ok" : "danger"}"></span><span>${esc(label)}<br><small class="muted">${esc(sub)}</small></span><span></span></li>`).join("")}</ul>
        ${jargon.length ? `<div class="lb__jargon">${jargon.map((j) => `<button class="rbtn" data-replace="${esc(j.term)}">${esc(j.term)} → ${esc(j.plain)}</button>`).join("")}</div>` : ""}`;
      const ok = checks.every((c) => c[0]);
      const btn = view.querySelector("#give");
      if (!given) { btn.disabled = !ok; btn.textContent = ok ? "Give to patient" : "Give to patient (fix the checks first)"; }
    }
  },
};
