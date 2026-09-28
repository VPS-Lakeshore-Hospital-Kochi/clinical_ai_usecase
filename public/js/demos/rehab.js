// Rehab coach clinician view: the app runs the pre-session traffic light on each daily check-in
// and builds the physiotherapist's weekly summary from the logged days; Claude drafts the plan
// and the reply. A red check-in blocks sending a reply that still prescribes exercise.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";
import { rehabTrafficLight } from "../clinical.js";

const LIGHT = { green: "ok", amber: "warn", red: "danger" };
const LABEL = { green: "Go", amber: "Go gently", red: "Skip and call" };
const DAY1 = { temp: 36.8, anc: 1.9, platelets: 142, glucose: 212, looseStools: 1, chest: "none", kneePain: 6, dizzy: "none" };
const PRESETS = {
  day1: { label: "Evening message (day 1)", ...DAY1 },
  fever: { label: "Fever", ...DAY1, temp: 38.2 },
  stools: { label: "3 loose stools", ...DAY1, looseStools: 3 },
  sugar: { label: "Sugar 320", ...DAY1, glucose: 320 },
};
const THRESHOLDS = [
  ["Temperature", "<37.5 °C", "37.5–37.9 °C", "≥38.0 °C"],
  ["Blood counts", "ANC ≥1.5, platelets ≥100", "ANC 1.0–1.5 or platelets 50–100", "ANC <1.0 or platelets <50"],
  ["Glucose", "100–250 mg/dL", "251–300 (walk only)", "<100 or >300"],
  ["Loose stools", "≤2 a day", "3 a day", "≥4 a day"],
  ["Chest", "None", "Breathless, can talk", "Chest pain or pressure"],
  ["Right knee", "Pain ≤6 (his usual)", "7/10: bike instead of walking", "≥8/10, hot or swollen"],
  ["Dizziness / falls", "None", "Light-headed on standing", "Any fall or faint"],
];

export default {
  notes: [
    "The traffic-light rules are in code, tied to measurable triggers: fever after recent neutropenia, blood counts, glucose, stools, chest, knee and falls.",
    "The knee threshold starts from his own baseline of 6/10, so the plan can still ask him to walk tomorrow.",
    "Each check-in is scored by the app and logged; the physiotherapist's weekly summary counts green, amber and red days and says when to escalate.",
    "Try it: choose 'Fever'. Today turns red, the session becomes 'skip and call', and the app blocks sending Claude's reply because it still prescribes walking.",
  ],
  guide: [
    "Look at the starting measures and the app's traffic-light rules.",
    "Ask Claude for the six-week plan and a reply to the first message.",
    "Accept, edit or reject each week of the plan.",
    "Run today's check-in; the app decides the session and logs the day.",
    "Send the reply if today allows it, then file the plan.",
  ],
  mount(root, ctx) {
    const today = { ...DAY1 };
    const log = [];
    let d = null, plan = null, sent = false;

    root.innerHTML = "";
    const view = el(`<div class="rh">
      <section class="tiles">
        <div class="tile tile--score"><span class="label">Today's check-in (app)</span><span class="tile__v" id="t-light"></span><span class="tile__u" id="t-session"></span></div>
        <div class="tile"><span class="label">6-minute walk</span><span class="tile__v">240 m</span><span class="tile__u">1 stop · with stick</span></div>
        <div class="tile"><span class="label">Sit-to-stand, 30 s</span><span class="tile__v">7</span><span class="tile__u">uses arms</span></div>
        <div class="tile"><span class="label">Clinical Frailty Scale</span><span class="tile__v">5</span><span class="tile__u">mildly frail</span></div>
      </section>
      <div class="rh__top">
        <section class="rh__checkin"><h3 class="section-title">Daily check-in (app traffic light)</h3>
          <div class="rh__presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="rbtn" data-preset="${k}">${esc(p.label)}</button>`).join("")}</div>
          <div class="rh__fields">
            ${[["temp", "Temperature °C", "0.1"], ["looseStools", "Loose stools"], ["glucose", "Glucose mg/dL"], ["kneePain", "Knee pain /10"], ["anc", "ANC (24 Sep)", "0.1"], ["platelets", "Platelets"]].map(([k, l, step]) => `<label class="field">${l}<input type="number" step="${step || 1}" data-k="${k}" value="${today[k]}"></label>`).join("")}
            <label class="field">Chest<select data-k="chest"><option value="none">None</option><option value="breathless">Breathless, can talk</option><option value="pain">Chest pain</option></select></label>
            <label class="field">Dizziness / falls<select data-k="dizzy"><option value="none">None</option><option value="lightheaded">Light-headed</option><option value="fall">Fall or faint</option></select></label>
          </div>
          <div id="light"></div>
          <button class="btn btn--ghost" id="log">Log today's check-in</button>
        </section>
        <section><h3 class="section-title">Traffic-light rules (app)</h3><div class="table-wrap"><table class="lk-table rh__rules"><thead><tr><th>Signal</th><th><span class="dot dot--ok"></span> Go</th><th><span class="dot dot--warn"></span> Gently</th><th><span class="dot dot--danger"></span> Skip and call</th></tr></thead><tbody>${THRESHOLDS.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
          <h3 class="section-title" style="margin-top:16px">Week so far (app)</h3><div id="week"></div></section>
      </div>
      <div class="actions-row" style="margin:0"><button class="btn btn--primary" id="ask">Ask Claude for the six-week plan</button><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="out"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));
    let lastOverall = rehabTrafficLight(today).overall;

    function update() {
      const t = rehabTrafficLight(today);
      $("#t-light").textContent = LABEL[t.overall];
      $("#t-session").textContent = t.session;
      $("#light").innerHTML = `<div class="rh__result" data-light="${t.overall}"><strong><span class="dot dot--${LIGHT[t.overall]}"></span> ${LABEL[t.overall]}: ${esc(t.session)}</strong>
        <ul>${t.signals.filter((s) => s.level !== "green").map((s) => `<li><span class="dot dot--${LIGHT[s.level]}"></span> ${esc(s.label)}: ${esc(s.why)}</li>`).join("") || "<li>All signals green</li>"}</ul></div>`;
      if (t.overall !== lastOverall) { audit.add(`Check-in re-scored: ${LABEL[lastOverall]} → ${LABEL[t.overall]}`, t.overall === "red" ? "reject" : "info"); lastOverall = t.overall; }
      week();
      if (d) replyGate();
    }

    function week() {
      const count = (l) => log.filter((x) => x.overall === l).length;
      const escalate = log.some((x) => x.overall === "red");
      $("#week").innerHTML = log.length
        ? `<ol class="rh__log">${log.map((x, i) => `<li><span class="dot dot--${LIGHT[x.overall]}"></span> Day ${i + 1}: ${LABEL[x.overall]} <small class="muted">${esc(x.note)}</small></li>`).join("")}</ol>
           <p class="hint">${count("green")} green · ${count("amber")} amber · ${count("red")} red${escalate ? " · <strong class=\"rh__esc\">Escalate to the physiotherapist within 24 h</strong>" : ""}</p>`
        : `<p class="hint">No check-ins logged yet.</p>`;
    }
    update();

    view.querySelectorAll("[data-k]").forEach((inp) => inp.addEventListener("change", () => {
      if (inp.value === "") return;
      today[inp.dataset.k] = inp.tagName === "SELECT" ? inp.value : Number(inp.value);
      update();
    }));
    view.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const p = PRESETS[b.dataset.preset];
      Object.assign(today, p);
      delete today.label;
      view.querySelectorAll("[data-k]").forEach((inp) => { inp.value = today[inp.dataset.k]; });
      audit.add(`Check-in entered: ${p.label}`, "info");
      update();
    }));
    $("#log").onclick = () => {
      const t = rehabTrafficLight(today);
      log.push({ overall: t.overall, note: t.signals.filter((s) => s.level !== "green").map((s) => s.label).join(", ") || "all green" });
      audit.add(`Logged day ${log.length}: ${LABEL[t.overall]} (${t.session})`, t.overall === "red" ? "reject" : "accept");
      week();
    };

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const t = rehabTrafficLight(today);
      const payload = {
        assessment: ctx.mod.defaultInput,
        appChecks: [...THRESHOLDS.map((r) => `${r[0]}: go ${r[1]}; gently ${r[2]}; skip and call ${r[3]}`), `Today's check-in: ${LABEL[t.overall]} (${t.session})`],
      };
      const result = await withClaude($("#out"), (o) => ctx.ask(payload, o), { label: "Claude is building a six-week plan around his limits…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Six-week plan drafted", "info");
      render();
    };

    function render() {
      const box = $("#out");
      box.innerHTML = "";
      const g = el(`<div class="rh__out">
        <section><h3 class="section-title">Starting point and targets</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Measure</th><th>Today</th><th>6-week target</th></tr></thead><tbody>${d.targets.map((t) => `<tr><td>${esc(t.measure)}</td><td>${esc(t.today)}</td><td>${esc(t.target)}</td></tr>`).join("")}</tbody></table></div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Six-week plan</h3><button class="rbtn" id="accept-all">Accept remaining</button></div><div id="plan"></div></section>
        <div class="handover">
          <section class="brief"><span class="label">Reply to tonight's message</span><p class="rh__msg">“Reached home. Legs feel very weak, knee pain 6. Walked to the gate and back, about 5 minutes. Sugar 212 before dinner. What should I do tomorrow?”</p><textarea id="reply" rows="8" style="width:100%;font:inherit;border:0;background:transparent;resize:vertical">${esc(d.reply)}</textarea><div id="reply-gate"></div><button class="rbtn" id="send">Send on WhatsApp</button></section>
          <section><h3 class="section-title">Daily check-in questions</h3><ol class="rh__q">${d.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ol>
            <h3 class="section-title" style="margin-top:16px">Weekly summary for the physiotherapist</h3><ul class="facts">${d.weekly.map((w) => `<li><span class="dot"></span><span>${esc(w)}</span><span></span></li>`).join("")}</ul></section>
        </div>
        <section><h3 class="section-title">Longer-term goals</h3><ul class="facts">${d.goals.map((w) => `<li><span class="dot dot--ok"></span><span>${esc(w)}</span><span></span></li>`).join("")}</ul></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">Approve &amp; file plan</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(g);
      plan = reviewList(g.querySelector("#plan"), d.plan.map((w) => ({ key: String(w.week), label: `Week ${w.week}`, text: `Aerobic: ${w.aerobic}. Strength: ${w.strength}. Balance: ${w.balance}.`, meta: esc(w.notes) })), { audit, noun: "plan week" });
      g.querySelector("#accept-all").onclick = () => plan.acceptAll();
      g.querySelector("#send").onclick = (e) => { sent = true; audit.add("Reply sent to the patient on WhatsApp", "accept"); e.target.disabled = true; e.target.textContent = "✓ Sent"; };
      g.querySelector("#file").onclick = () => {
        const t = rehabTrafficLight(today);
        ctx.file([
          `## Today's check-in (app)`, `**${LABEL[t.overall]}**: ${t.session}`, ...t.signals.map((s) => `- ${s.label}: ${s.why}`),
          `## Check-in log`, ...(log.length ? log.map((x, i) => `- Day ${i + 1}: ${LABEL[x.overall]} (${x.note})`) : ["- none logged"]),
          `## Six-week plan`, ...plan.states().map((w) => `- ${w.label}: ${w.text} (${w.status})`),
          `## Reply${sent ? " (sent)" : " (not sent)"}`, g.querySelector("#reply").value.trim(),
          `## Clinician actions`, audit.markdown(),
        ].join("\n\n"));
        g.querySelector("#file").disabled = true;
        g.querySelector("#filed").textContent = "✓ Filed to Thomas's record";
      };
      replyGate();
    }

    // A red day must not get a reply that prescribes exercise.
    function replyGate() {
      const t = rehabTrafficLight(today);
      const text = view.querySelector("#reply").value;
      const prescribes = /\b(walk|bike|straighten|exercise|stand)\b/i.test(text) && !/\bskip\b/i.test(text);
      const blocked = t.overall === "red" && prescribes;
      view.querySelector("#reply-gate").innerHTML = blocked ? `<p class="rh__warn"><span class="dot dot--danger"></span> Today is red (${esc(t.signals.filter((s) => s.level === "red").map((s) => s.why).join("; "))}). Edit the reply to say skip today and call the care team.</p>` : "";
      const btn = view.querySelector("#send");
      if (!sent) btn.disabled = blocked;
      view.querySelector("#reply").oninput = replyGate;
    }
  },
};
