// Triage clinician view: a WhatsApp intake conversation plays out, Claude triages it,
// and the triage nurse confirms urgency, books the slot and sends the reply.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";

const OPENING = "Hello, I am Thomas Varghese. I was seen in your hospital last year for sugar. Now my sugar is always 250 to 300 after food, and some nights I wake up sweating and shaking. My right knee pain is very bad, I cannot walk to church. I feel very tired and my wife says I have become thin. Which doctor should I see?";

const INTAKE = [
  ["Thank you, Mr Thomas. I will ask a few quick safety questions first. Do you have chest pain, or breathlessness while resting?", "No"],
  ["Any confusion, drowsiness, vomiting, or trouble keeping fluids down?", "No"],
  ["What is the lowest sugar reading you have had recently?", "58 at 3 AM last week. I took juice and felt better."],
  ["Have you noticed blood in your stool, or black stools?", "Not noticed"],
  ["How much weight have you lost, and over how long? Were you trying to lose weight?", "About 4 kg in 6 months. Not trying."],
  ["Any fever?", "No"],
  ["Which medicines are you taking now?", "Metformin, glimepiride, night insulin 16 units, BP tablet, cholesterol tablet, and aceclofenac for the knee most days."],
  ["Which language do you prefer, and what time suits you for an appointment?", "English is fine, Malayalam also. Mornings please."],
];

const SLOTS = {
  "Emergency now": [],
  "Same day": ["Today, Thu 2 Jul · 16:30 · Endocrinology same-day clinic"],
  "Within 1 week": ["Sat 4 Jul · 10:00 · Endocrinology OPD", "Mon 6 Jul · 09:30 · Endocrinology OPD", "Tue 7 Jul · 09:00 · Endocrinology OPD"],
  Routine: ["Mon 13 Jul · 09:30 · Endocrinology OPD", "Wed 15 Jul · 11:00 · Endocrinology OPD"],
};

const STATUS = { absent: ["✓", "absent"], present: ["!", "present"], unknown: ["?", "unknown"] };

export default {
  guide: [
    "Press Play to run the WhatsApp intake as the patient would experience it.",
    "Claude triages the conversation and fills in the nurse console.",
    "Confirm or change the urgency, pick a slot and edit the reply.",
    "Approve: the reply goes to the patient and the triage is filed to the record.",
  ],
  mount(root, ctx) {
    root.innerHTML = "";
    const layout = el(`<div class="triage">
      <div class="phone" aria-label="WhatsApp conversation">
        <div class="phone__bar"><span class="phone__avatar">L</span><div><strong>Lakeshore Care</strong><span>Automated intake · a nurse reviews every message</span></div></div>
        <div class="phone__chat" id="chat"><div class="phone__day">Thursday 2 July 2026</div></div>
        <div class="phone__controls">
          <button class="btn btn--primary" id="play">▶ Play conversation</button>
          <button class="btn btn--ghost" id="skip">Skip to end</button>
        </div>
        <details class="phone__edit"><summary>Edit the patient's first message</summary>
          <textarea id="opening" rows="5">${esc(OPENING)}</textarea>
          <p class="hint">${ctx.live ? "Claude will triage whatever the patient writes." : "Offline demo: the sample triage was written for the original message."}</p>
        </details>
      </div>
      <div class="console">
        <div class="console__head"><div><span class="kicker">Triage nurse console</span><h2>Incoming: WhatsApp, 21:14</h2></div><span class="chip chip--muted" id="src">Waiting for intake</span></div>
        <div id="console-body"><div class="empty-note">The triage appears here when the intake finishes.</div></div>
        <div id="audit-slot"></div>
      </div>
    </div>`);
    root.append(layout);
    const $ = (s) => layout.querySelector(s);
    const chat = $("#chat");
    const audit = new AuditLog($("#audit-slot"));
    const conversation = [];
    let run = 0;
    let finished = false;

    const bubble = (from, text, extra = "") => {
      const b = el(`<div class="bubble bubble--${from} ${extra}"><p>${esc(text).replace(/\n/g, "<br>")}</p><span class="bubble__time">21:${String(14 + Math.floor(conversation.length / 2)).padStart(2, "0")}</span></div>`);
      chat.append(b);
      chat.scrollTop = chat.scrollHeight;
      return b;
    };
    const typing = () => { const t = el(`<div class="bubble bubble--bot bubble--typing"><span></span><span></span><span></span></div>`); chat.append(t); chat.scrollTop = chat.scrollHeight; return t; };
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const script = () => [["patient", $("#opening").value.trim() || OPENING], ...INTAKE.flatMap(([q, a]) => [["bot", q], ["patient", a]]), ["bot", "Thank you. A nurse is reviewing your answers now and will reply shortly."]];

    // Each call takes over from any playback already running (Skip interrupts Play).
    async function play(fast) {
      if (finished) return;
      const me = ++run;
      $("#play").disabled = true;
      $("#opening").disabled = true;
      chat.querySelectorAll(".bubble--typing").forEach((t) => t.remove());
      const lines = script();
      while (conversation.length < lines.length) {
        const [from, text] = lines[conversation.length];
        if (!fast) {
          if (from === "bot") { const t = typing(); await wait(900); t.remove(); } else await wait(700);
          if (me !== run) return;
        }
        conversation.push({ from, text });
        bubble(from, text);
      }
      finished = true;
      $("#play").hidden = true;
      $("#skip").hidden = true;
      triage();
    }
    $("#play").onclick = () => play(false);
    $("#skip").onclick = () => play(true);

    async function triage() {
      const body = $("#console-body");
      const result = await withClaude(body, (o) => ctx.ask({ conversation, mrn: ctx.patient.patient.mrn, slotPreference: "Mornings" }, o), { label: "Claude is triaging the conversation…" });
      $("#src").textContent = sourceNote(result).replace(/<[^>]+>/g, "");
      renderConsole(body, result.data);
    }

    function renderConsole(body, d) {
      let urgency = d.urgency;
      body.innerHTML = "";
      const view = el(`<div class="console__grid">
        <section class="urgency" data-urgency="${esc(urgency)}">
          <div><span class="label">Claude's urgency</span><div class="urgency__value" id="u-val">${esc(urgency)}</div><p>${esc(d.urgencyReason)}</p></div>
          <label class="urgency__override"><span class="label">Nurse decision</span>
            <select id="u-sel">${Object.keys(SLOTS).map((u) => `<option${u === urgency ? " selected" : ""}>${u}</option>`).join("")}</select></label>
        </section>
        <section><h3>Emergency screen</h3>
          <table class="flags"><tbody>${d.redFlags.map((f) => `<tr data-status="${f.status}"><td><span class="flag-dot">${STATUS[f.status][0]}</span></td><td>${esc(f.flag)}</td><td>${esc(f.answer)}</td></tr>`).join("")}</tbody></table>
        </section>
        <section><h3>For the receiving doctor</h3><p class="hint">Accepted concerns go into the hand-off note.</p><div id="concerns"></div></section>
        <section class="routing"><h3>Routing</h3>
          <p><strong>${esc(d.routing.department)}</strong> · ${esc(d.routing.appointmentType)}</p><p class="muted">${esc(d.routing.why)}</p>
          ${d.routing.later.length ? `<p class="muted">Later: ${d.routing.later.map(esc).join("; ")}</p>` : ""}
          <div class="slots" id="slots" role="radiogroup" aria-label="Appointment slot"></div>
          ${d.callBack ? `<label class="check"><input type="checkbox" id="callback" checked> ${esc(d.callBack)}</label>` : ""}
          <details><summary>Pre-visit preparation (${d.preVisit.length})</summary><ul>${d.preVisit.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></details>
        </section>
        <section><h3>Reply to the patient</h3><textarea id="reply" rows="8">${esc(d.reply)}</textarea>
          <div class="console__actions"><button class="btn btn--approve" id="send">Approve &amp; send reply</button><span class="filed-note" id="sent-note"></span></div>
        </section>
      </div>`);
      body.append(view);
      const q = (s) => view.querySelector(s);
      const concerns = reviewList(q("#concerns"), d.concerns.map((c, i) => ({ key: `c${i}`, text: c })), { audit, noun: "concern" });

      let slot = null;
      const renderSlots = () => {
        const slots = SLOTS[urgency];
        slot = urgency === "Within 1 week" ? slots[1] : slots[0] ?? null;
        q("#slots").innerHTML = slots.length
          ? slots.map((s) => `<label class="slot"><input type="radio" name="slot" value="${esc(s)}"${s === slot ? " checked" : ""}> ${esc(s)}</label>`).join("")
          : `<div class="error-box">Emergency: call the patient now and direct them to the Emergency Department or 108. Do not book a clinic slot.</div>`;
      };
      renderSlots();
      q("#slots").addEventListener("change", (e) => { slot = e.target.value; audit.add(`Selected slot: ${slot}`); });
      q("#u-sel").addEventListener("change", (e) => {
        const prev = urgency;
        urgency = e.target.value;
        q(".urgency").dataset.urgency = urgency;
        q("#u-val").textContent = urgency;
        audit.add(`Changed urgency from "${prev}" to "${urgency}"`, "edit");
        renderSlots();
      });
      q("#reply").addEventListener("change", () => audit.add("Edited the reply to the patient", "edit"));

      q("#send").onclick = () => {
        const reply = q("#reply").value.trim();
        if (urgency !== "Emergency now" && !slot) return;
        bubble("bot", `${reply}${slot ? `\n\nYour appointment: ${slot}.` : ""}`, "bubble--nurse");
        audit.add(`Approved urgency "${urgency}"${slot ? ` and booked ${slot}` : ""}; reply sent`, "accept");
        if (q("#callback")?.checked) audit.add("Nurse call-back task created for tomorrow", "info");
        q("#send").disabled = true;
        q("#sent-note").textContent = "✓ Sent to the patient and filed to the record";
        ctx.file([
          `## Triage decision`,
          `**${urgency}** (Claude suggested ${d.urgency}). ${d.urgencyReason}`,
          `## Routing`,
          `${d.routing.department}: ${slot ?? "Emergency Department"}`,
          d.callBack && q("#callback")?.checked ? `- ${d.callBack}` : "",
          `## Emergency screen`,
          ...d.redFlags.map((f) => `- ${f.flag}: ${f.answer} (${f.status})`),
          `## Concerns passed to the doctor`,
          ...concerns.accepted().map((c) => `- ${c.text}`),
          `## Reply sent`,
          reply,
          `## Clinician actions`,
          audit.markdown(),
        ].filter(Boolean).join("\n\n"));
      };
    }
  },
};
