// Scribe clinician view: a recorded consultation plays back, Claude drafts the note,
// and every flag, code and order links back to the transcript lines that support it.
import { el, esc, AuditLog, reviewList, withClaude, sourceNote } from "../kit.js";

const MS_PER_CHAR = 42;

export default {
  notes: [
    "Nothing is typed: the note is drafted from the recording once it ends.",
    "Click any L-number to jump to the exact line of the conversation behind a flag, code or order. This is how a doctor checks the draft quickly.",
    "The dietitian referral is marked \"Suggested, not discussed\": Claude separates what was agreed from what it recommends.",
    "Unreviewed codes and orders are left out of the signed note. Every edit is logged.",
  ],
  guide: [
    "Play the recorded consultation (turn on voice if you like). The transcript fills in as it plays.",
    "When it ends, Claude drafts the note. Click any L-number to see the line it came from.",
    "Edit the SOAP text; accept, edit or reject each code and order.",
    "Sign the note to file it to the patient's record.",
  ],
  mount(root, ctx) {
    const lines = ctx.mod.defaultInput.split("\n").filter((l) => l.trim()).map((l) => {
      const i = l.indexOf(":");
      return { who: l.slice(0, i), text: l.slice(i + 1).trim(), raw: l };
    });
    const totalChars = lines.reduce((a, l) => a + l.text.length, 0);
    const durOf = (l) => Math.max(1400, l.text.length * MS_PER_CHAR);
    const totalMs = lines.reduce((a, l) => a + durOf(l), 0);

    root.innerHTML = "";
    const view = el(`<div class="scribe">
      <div class="card-v player" data-playing="false">
        <div class="player__bar"><span class="player__rec" aria-hidden="true"></span><div><strong>Consultation recording</strong><div class="source-note">Endocrinology OPD · 6 Jul 2026 · ${lines.length} lines · recorded with consent</div></div></div>
        <div class="player__progress"><span id="prog"></span></div>
        <div class="player__controls">
          <button class="btn btn--primary" id="play">▶ Play</button>
          <div class="speed" role="group" aria-label="Playback speed">${[1, 2, 4].map((s) => `<button data-speed="${s}" aria-pressed="${s === 2}">${s}×</button>`).join("")}</div>
          <label class="check" style="margin:0"><input type="checkbox" id="voice"> Voice</label>
          <button class="btn btn--ghost" id="skip">Skip to end</button>
          <span class="player__time" id="time">0:00 / ${fmt(totalMs / 2)}</span>
        </div>
        <ol class="transcript" id="transcript">${lines.map((l, i) => `<li data-line="${i + 1}"><span class="ln">L${i + 1}</span><span><span class="who">${esc(l.who)}:</span> ${esc(l.text)}</span></li>`).join("")}</ol>
      </div>
      <div class="note">
        <div class="note__head"><div><span class="kicker">Draft clinic note</span><h2>Thomas Varghese · Endocrinology</h2></div><span class="chip chip--muted" id="src">Listening…</span></div>
        <div id="note-body"><div class="empty-note">The note is drafted when the recording ends. ${totalChars.toLocaleString("en-IN")} characters of conversation, about ${Math.round(totalMs / 60000)} minutes at normal speed.</div></div>
        <div id="audit-slot"></div>
      </div>
    </div>`);
    root.append(view);
    const $ = (s) => view.querySelector(s);
    const audit = new AuditLog($("#audit-slot"));
    const items = [...view.querySelectorAll("#transcript li")];

    let speed = 2;
    let pos = 0; // next line to play
    let playing = false;
    let token = 0;
    let elapsed = 0;
    let drafted = false;

    $(".speed").addEventListener("click", (e) => {
      const b = e.target.closest("[data-speed]");
      if (!b) return;
      speed = Number(b.dataset.speed);
      view.querySelectorAll("[data-speed]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });

    const voices = () => (window.speechSynthesis?.getVoices() ?? []).filter((v) => v.lang?.startsWith("en"));
    const speak = (line) => new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(line.text);
      const vs = voices();
      const pick = (pref) => vs.find((v) => v.lang === pref) || vs[0];
      u.voice = line.who === "Doctor" ? pick("en-IN") : (vs.filter((v) => v.lang === "en-IN")[1] || vs[1] || pick("en-GB"));
      u.rate = Math.min(1.6, 0.9 + (speed - 1) * 0.25);
      u.pitch = line.who === "Doctor" ? 1 : 0.9;
      u.onend = u.onerror = resolve;
      speechSynthesis.speak(u);
    });
    if (!("speechSynthesis" in window)) $("#voice").closest("label").hidden = true;

    const mark = (i) => {
      items.forEach((li, j) => { li.classList.toggle("is-heard", j < i); li.classList.toggle("is-current", j === i - 1); });
      const cur = items[i - 1];
      if (cur) $("#transcript").scrollTo({ top: cur.offsetTop - 120, behavior: "smooth" });
      $("#prog").style.width = `${(i / lines.length) * 100}%`;
      $("#time").textContent = `${fmt(elapsed / speed)} / ${fmt(totalMs / speed)}`;
    };

    async function play() {
      if (pos >= lines.length) return;
      if (playing) { pause(); return; }
      playing = true;
      const me = ++token;
      view.querySelector(".player").dataset.playing = "true";
      $("#play").textContent = "❚❚ Pause";
      if (pos === 0) audit.add("Started consultation playback");
      while (pos < lines.length) {
        const line = lines[pos];
        items[pos].classList.add("is-current");
        if ($("#voice").checked && "speechSynthesis" in window) await speak(line);
        else await new Promise((r) => setTimeout(r, durOf(line) / speed));
        if (me !== token) return;
        elapsed += durOf(line);
        pos++;
        mark(pos);
      }
      finish();
    }
    function pause() {
      playing = false;
      token++;
      window.speechSynthesis?.cancel();
      view.querySelector(".player").dataset.playing = "false";
      $("#play").textContent = "▶ Play";
    }
    function finish() {
      pause();
      pos = lines.length;
      elapsed = totalMs;
      mark(pos);
      $("#play").disabled = true;
      $("#skip").disabled = true;
      if (!drafted) draft();
    }
    $("#play").onclick = play;
    $("#skip").onclick = finish;

    // Clicking a line number in the note highlights and scrolls to that transcript line.
    view.addEventListener("click", (e) => {
      const c = e.target.closest(".cite");
      if (!c) return;
      const nums = c.dataset.lines.split(",").map(Number);
      items.forEach((li, j) => li.classList.toggle("is-cited", nums.includes(j + 1)));
      const first = items[nums[0] - 1];
      if (first) $("#transcript").scrollTo({ top: first.offsetTop - 60, behavior: "smooth" });
    });
    const cites = (nums) => (nums?.length ? `<button class="cite" data-lines="${nums.join(",")}" title="Show in transcript">L${nums.length > 2 ? `${nums[0]}–${nums[nums.length - 1]}` : nums.join(", L")}</button>` : "");

    async function draft() {
      drafted = true;
      const body = $("#note-body");
      const result = await withClaude(body, (o) => ctx.ask({ lines: lines.map((l) => l.raw) }, o), { label: "Claude is drafting the note from the transcript…" });
      $("#src").textContent = sourceNote(result);
      renderNote(body, result.data);
    }

    function renderNote(body, d) {
      body.innerHTML = "";
      const note = el(`<div class="note">
        <section><h3 class="section-title">Safety flags</h3><div class="review" id="flags">${d.safetyFlags.map((f) => `<div class="flag-card"><strong>${esc(f.title)}</strong> ${cites(f.lines)}<p>${esc(f.detail)}</p></div>`).join("")}</div></section>
        <section><h3 class="section-title">SOAP note</h3><p class="hint">Edit directly. Changes are recorded.</p>
          <div class="soap">${["subjective", "objective", "assessment", "plan"].map((k) => `<label class="note-field"><span class="label">${k}</span><textarea data-soap="${k}">${esc(d.soap[k])}</textarea></label>`).join("")}</div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">ICD-10 codes</h3><button class="rbtn" data-all="codes">Accept remaining</button></div><div id="codes"></div></section>
        <section><div class="review-tools"><h3 class="section-title" style="margin:0">Orders &amp; referrals</h3><button class="rbtn" data-all="orders">Accept remaining</button></div><div id="orders"></div></section>
        <section><h3 class="section-title">Visit summary for the patient</h3><label class="note-field"><textarea id="summary" style="min-height:120px">${esc(d.patientSummary)}</textarea></label></section>
        <div class="actions-row"><button class="btn btn--approve" id="sign">Sign &amp; file note</button><span class="hint" id="pending"></span><span class="filed-note" id="signed"></span></div>
      </div>`);
      body.append(note);
      const q = (s) => note.querySelector(s);
      note.querySelectorAll("[data-soap]").forEach((t) => t.addEventListener("change", () => audit.add(`Edited the ${t.dataset.soap} section`, "edit")));
      q("#summary").addEventListener("change", () => audit.add("Edited the patient summary", "edit"));

      const update = () => {
        const n = codes.pending() + orders.pending();
        q("#pending").textContent = n ? `${n} item${n === 1 ? "" : "s"} still to review; unreviewed items are left out of the filed note.` : "All items reviewed.";
      };
      const codes = reviewList(q("#codes"), d.codes.map((c, i) => ({
        key: `code${i}`, text: `${c.code} ${c.description}`,
        html: `<strong>${esc(c.code)}</strong> ${esc(c.description)}`, meta: `${esc(c.evidence)} ${cites(c.lines)}`,
      })), { audit, noun: "code", onChange: () => update() });
      const orders = reviewList(q("#orders"), d.orders.map((o, i) => ({
        key: `ord${i}`, text: o.text,
        html: `<span class="type-tag">${esc(o.type)}</span>${o.discussed ? "" : '<span class="type-tag type-tag--new">Suggested, not discussed</span>'}${esc(o.text)}`,
        meta: cites(o.lines),
      })), { audit, noun: "order", onChange: () => update() });
      update();
      note.querySelector('[data-all="codes"]').onclick = () => codes.acceptAll();
      note.querySelector('[data-all="orders"]').onclick = () => orders.acceptAll();

      q("#sign").onclick = () => {
        const soap = Object.fromEntries([...note.querySelectorAll("[data-soap]")].map((t) => [t.dataset.soap, t.value.trim()]));
        audit.add(`Signed the note (${codes.accepted().length} codes, ${orders.accepted().length} orders)`, "accept");
        ctx.file([
          "## Safety flags", ...d.safetyFlags.map((f) => `- **${f.title}.** ${f.detail}`),
          "## SOAP note", `**Subjective**\n${soap.subjective}`, `**Objective**\n${soap.objective}`, `**Assessment**\n${soap.assessment}`, `**Plan**\n${soap.plan}`,
          "## ICD-10 codes", ...codes.accepted().map((c) => `- ${c.text}`),
          "## Orders & referrals", ...orders.accepted().map((o) => `- [ ] ${o.text}`),
          "## Visit summary for the patient", q("#summary").value.trim(),
          "## Clinician actions", audit.markdown(),
        ].join("\n\n"));
        q("#sign").disabled = true;
        q("#signed").textContent = "✓ Signed and filed to the patient timeline";
      };
    }
    return () => { token++; window.speechSynthesis?.cancel(); };
  },
};

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
