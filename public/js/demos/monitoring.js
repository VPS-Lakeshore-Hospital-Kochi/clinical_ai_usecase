// Remote monitoring clinician view: home readings stream in, the app runs single-threshold and
// trend rules, the patient's WhatsApp question arrives, and Claude triages the combination.
import { el, esc, AuditLog, withClaude, sourceNote } from "../kit.js";
import { thresholdAlerts, trendAlerts, stoolTrend, STANDARD_THRESHOLDS, EPISODE_THRESHOLDS } from "../clinical.js";

const MESSAGE = { label: "27 Sep 14:10", text: "Loose motion again, 5 times today, some stomach cramps. Should I take the loperamide the doctor gave?" };
const PRIORITY = { "Act today": "danger", "Review within 48 h": "warn", "No action": "ok" };

export default {
  notes: [
    "Play the 48 hours of home readings. With standard single-reading thresholds, nothing fires: every value on its own looks acceptable.",
    "The app's trend rules fire from the morning of 27 Sep: weight down 1 kg in 24 h, then blood pressure falling and heart rate rising since discharge.",
    "The patient asks about loperamide. Claude connects the pattern to the antibiotics he had in the ICU and tells him not to take it until C. difficile is tested.",
    "Apply the episode thresholds Claude suggests: the app re-runs every reading with the lower limits, and the single-value alerts now fire.",
  ],
  guide: [
    "Play the home readings. The app runs threshold and trend rules as each one arrives.",
    "When the patient's WhatsApp question arrives, ask Claude to triage.",
    "Reply to the patient, escalate, and run the nurse call script.",
    "Apply the new monitoring thresholds and file the episode.",
  ],
  mount(root, ctx) {
    const readings = ctx.patient.homeMonitoring.readings;
    const stools = ctx.patient.homeMonitoring.stoolsPerDay;
    // Timeline: readings plus the patient's message after the 27 Sep 13:00 reading.
    const events = [...readings.map((r, i) => ({ kind: "reading", i })), { kind: "message" }];
    events.splice(6, 0, events.pop());
    let shown = 0;
    let th = STANDARD_THRESHOLDS;
    let timer = null;
    let d = null;
    const redAnswers = new Set();

    root.innerHTML = "";
    const view = el(`<div class="rm">
      <div class="rm__top">
        <section class="card-v rm__feed">
          <div class="rm__feed-head"><span class="kicker">Home readings · discharged 25 Sep after ICU</span><div class="sim"><button class="btn btn--primary" id="play">▶ Play</button><button class="btn btn--ghost" id="next">Next</button></div></div>
          <div class="table-wrap"><table class="obs" id="feed"></table></div>
          <p class="hint" id="stools" style="padding:0 18px 14px;margin:0"></p>
        </section>
        <section class="rm__queue">
          <div class="rm__counts" id="counts"></div>
          <h3 class="section-title" style="margin-top:14px">Alert queue (app rules)</h3>
          <ul class="rm__list" id="queue"><li class="audit__empty">No alerts yet.</li></ul>
          <div id="msg"></div>
        </section>
      </div>
      <div class="actions-row"><button class="btn btn--primary" id="ask" disabled>Triage with Claude</button><span class="hint" id="ask-hint">Available when the patient's message arrives.</span><span class="chip chip--muted" id="src" hidden></span></div>
      <div id="triage"></div>
      <div id="audit-slot"></div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"), { clock: () => (shown ? (events[shown - 1].kind === "message" ? "14:10" : readings[events[shown - 1].i].label.slice(-5)) : "18:00") });

    const visibleReadings = () => events.slice(0, shown).filter((e) => e.kind === "reading").map((e) => readings[e.i]);
    const messageArrived = () => events.slice(0, shown).some((e) => e.kind === "message");

    function allAlerts() {
      const vis = visibleReadings();
      const single = [], trend = [];
      vis.forEach((r, i) => {
        thresholdAlerts(r, th).forEach((a) => single.push(`${r.label}: ${a}`));
        trendAlerts(readings, readings.indexOf(r)).forEach((a) => trend.push(`${r.label}: ${a}`));
      });
      const st = stoolsSoFar();
      if (st.length >= 2 && stoolTrend(st).rising) trend.push(`${st[st.length - 1].date}: loose stools rising ${st.map((x) => x.count).join(" → ")}/day`);
      if (st.length && st[st.length - 1].count >= th.stools) single.push(`${st[st.length - 1].date}: ${st[st.length - 1].count} loose stools ≥ ${th.stools}`);
      return { single, trend };
    }
    const stoolsSoFar = () => {
      const vis = visibleReadings();
      const last = vis[vis.length - 1]?.label ?? "";
      return stools.filter((s, i) => i === 0 ? vis.length > 0 : i === 1 ? /26 Sep 20|27 Sep/.test(last) : messageArrived());
    };

    function render() {
      const vis = visibleReadings();
      $("#feed").innerHTML = `<thead><tr><th>Reading</th><th>Glucose</th><th>BP</th><th>HR</th><th>Temp</th><th>Weight</th></tr></thead><tbody>${vis.map((r) => {
        const hit = thresholdAlerts(r, th).join(" ");
        const cell = (v, key) => `<td data-s="${new RegExp(key).test(hit) ? 2 : 0}">${v ?? "—"}</td>`;
        return `<tr><th>${esc(r.label)}</th>${cell(r.glucose, "Glucose")}${cell(`${r.sbp}/${r.dbp}`, "SBP")}${cell(r.hr, "HR")}${cell(r.temp.toFixed(1), "Temp")}<td>${r.weightKg ?? "—"}</td></tr>`;
      }).join("") || '<tr><td colspan="6" class="muted" style="text-align:left">Press Play to stream the readings.</td></tr>'}</tbody>`;
      const st = stoolsSoFar();
      $("#stools").textContent = st.length ? `Loose stools per day (WhatsApp): ${st.map((s) => `${s.date} ${s.count}`).join(" · ")}` : "";
      const { single, trend } = allAlerts();
      $("#counts").innerHTML = `<div class="tile"><span class="label">Single-reading thresholds</span><span class="tile__v">${single.length}</span><span class="tile__u">${th === STANDARD_THRESHOLDS ? "Standard post-discharge limits" : "Episode limits (lowered)"}</span></div>
        <div class="tile tile--score"><span class="label">Trend rules</span><span class="tile__v">${trend.length}</span><span class="tile__u">Change since discharge, weight in 24 h, stool trend</span></div>`;
      $("#queue").innerHTML = [...trend.map((a) => `<li data-k="trend"><span class="dot dot--danger"></span><span><small class="muted">Trend</small><br>${esc(a)}</span></li>`), ...single.map((a) => `<li><span class="dot dot--warn"></span><span><small class="muted">Threshold</small><br>${esc(a)}</span></li>`)].join("") || '<li class="audit__empty">No alerts yet.</li>';
      if (messageArrived() && !$("#msg").innerHTML) {
        $("#msg").innerHTML = `<div class="bubble bubble--patient" style="max-width:100%;margin-top:12px"><p><strong style="font-weight:500">WhatsApp · Thomas</strong><br>${esc(MESSAGE.text)}</p><span class="bubble__time">${MESSAGE.label}</span></div>`;
        $("#ask").disabled = !!d;
        $("#ask-hint").textContent = "The patient is asking about loperamide.";
      }
      $("#next").disabled = shown >= events.length;
    }

    const step = () => {
      if (shown >= events.length) return stop();
      const before = allAlerts().trend.length;
      shown++;
      const e = events[shown - 1];
      if (e.kind === "message") { audit.add("Patient message received: asking about loperamide", "info"); stop(); }
      else if (allAlerts().trend.length > before) audit.add(`Trend rule fired at ${readings[e.i].label}`, "reject");
      render();
    };
    const stop = () => { clearInterval(timer); timer = null; $("#play").textContent = "▶ Play"; };
    $("#play").onclick = () => { if (timer) return stop(); $("#play").textContent = "❚❚ Pause"; timer = setInterval(step, 900); };
    $("#next").onclick = () => { stop(); step(); };
    render();

    $("#ask").onclick = async () => {
      $("#ask").disabled = true;
      const { single, trend } = allAlerts();
      const result = await withClaude($("#triage"), (o) => ctx.ask({ context: `${ctx.mod.defaultInput}`, appAlerts: [...trend.map((t) => `Trend: ${t}`), ...single.map((s) => `Threshold: ${s}`), `Standard single thresholds fired: ${single.length}`] }, o), { label: "Claude is triaging the episode…" });
      d = result.data;
      $("#src").hidden = false;
      $("#src").textContent = sourceNote(result);
      audit.add("Episode triaged", "info");
      renderTriage();
    };

    function renderTriage() {
      const box = $("#triage");
      box.innerHTML = "";
      const t = el(`<div class="rm__out">
        <section><h3 class="section-title">Alert summary</h3><div class="table-wrap"><table class="lk-table"><thead><tr><th>Priority</th><th>Signal</th><th>Trend</th><th>Action</th></tr></thead><tbody>${d.alerts.map((a) => `<tr><td><span class="status t-${PRIORITY[a.priority]}"><span class="dot dot--${PRIORITY[a.priority]}"></span>${esc(a.priority)}</span></td><td><strong style="font-weight:500">${esc(a.signal)}</strong></td><td>${esc(a.trend)}</td><td>${esc(a.action)}</td></tr>`).join("")}</tbody></table></div></section>
        <section class="headline-card"><span class="label">Most likely</span><h3 style="font-size:22px">${esc(d.interpretation.likely)}</h3><p>Differential: ${d.interpretation.differential.map(esc).join("; ")}</p><p>${esc(d.interpretation.why)}</p></section>
        <div class="handover">
          <section><h3 class="section-title">Reply to the patient</h3><textarea id="reply" rows="8" style="width:100%;font:inherit;font-size:14px;border:1px solid var(--line-strong);border-radius:12px;padding:12px">${esc(d.reply)}</textarea><div class="actions-row"><button class="btn btn--secondary" id="send">Send on WhatsApp</button></div>
            <h3 class="section-title" style="margin-top:14px">Escalation</h3><p style="margin:0 0 6px;font-size:14px"><strong style="font-weight:500">${esc(d.escalation.who)}.</strong> ${esc(d.escalation.where)}.</p><ul class="plain-list">${d.escalation.tests.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
            <div class="actions-row"><button class="rbtn rbtn--accept" id="reg">Page the oncology registrar</button><button class="rbtn" id="book">Book day-care assessment today</button><button class="rbtn" id="labs">Order tests</button></div></section>
          <section><h3 class="section-title">Nurse call script</h3><p class="hint">Tick any answer that meets the red criterion.</p><ul class="tasks">${d.script.map((s, i) => `<li style="grid-template-columns:22px 1fr"><input type="checkbox" data-red="${i}" aria-label="Red answer"><span>${esc(s.question)}<br><small class="t-danger">Emergency if: ${esc(s.upgradeIf)}</small></span></li>`).join("")}</ul><div id="ed"></div></section>
        </div>
        <section><h3 class="section-title">Monitoring plan changes</h3><ul class="plain-list">${d.monitoring.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="actions-row"><button class="btn btn--secondary" id="apply">Apply episode thresholds</button><span class="hint" id="applied"></span></div></section>
        <div class="actions-row"><button class="btn btn--approve" id="file">File the episode</button><span class="filed-note" id="filed"></span></div>
      </div>`);
      box.append(t);
      const q = (s) => t.querySelector(s);
      const once = (id, text) => q(id).addEventListener("click", (e) => { audit.add(text, "accept"); e.target.disabled = true; e.target.textContent = `✓ ${e.target.textContent}`; });
      once("#send", "Reply sent: do not take loperamide; nurse calling; seen today");
      once("#reg", "Oncology registrar paged");
      once("#book", "Day-care assessment booked for today");
      once("#labs", `Tests ordered: ${d.escalation.tests.length}`);
      t.querySelectorAll("[data-red]").forEach((c) => c.addEventListener("change", () => {
        c.checked ? redAnswers.add(c.dataset.red) : redAnswers.delete(c.dataset.red);
        audit.add(`${c.checked ? "Red answer" : "Cleared"}: ${d.script[c.dataset.red].question}`, c.checked ? "reject" : "info");
        q("#ed").innerHTML = redAnswers.size ? '<div class="error-box" style="margin-top:10px">Red answer given: direct the patient to the Emergency Department now (call 108 if faint). Do not wait for day-care.</div>' : "";
      }));
      q("#apply").onclick = (e) => {
        th = EPISODE_THRESHOLDS;
        audit.add("Episode thresholds applied (HR ≥100, SBP <105, temp ≥37.8, stools ≥3, weight ≥1 kg/24 h)", "edit");
        e.target.disabled = true;
        q("#applied").textContent = `Re-run on every reading: ${allAlerts().single.length} single-reading alerts now fire.`;
        render();
      };
      q("#file").onclick = () => {
        const { single, trend } = allAlerts();
        ctx.file([
          "## App rules", `Trend rules fired: ${trend.length}`, ...trend.map((x) => `- ${x}`), `Single-reading thresholds fired (${th === STANDARD_THRESHOLDS ? "standard" : "episode"} limits): ${single.length}`,
          "## Alert summary", ...d.alerts.map((a) => `- **${a.priority}:** ${a.signal}: ${a.trend}. ${a.action}`),
          "## Interpretation", d.interpretation.likely, d.interpretation.why,
          "## Reply sent", q("#reply").value.trim(),
          "## Call script", ...d.script.map((s, i) => `- [${redAnswers.has(String(i)) ? "x" : " "}] ${s.question} (Emergency if ${s.upgradeIf})`),
          "## Monitoring changes", ...d.monitoring.map((x) => `- ${x}`),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        q("#file").disabled = true;
        q("#filed").textContent = "✓ Filed to Thomas's record";
      };
    }

    return () => clearInterval(timer);
  },
};
